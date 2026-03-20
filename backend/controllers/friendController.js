import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import Friendship from "../models/Friendship.js";
import PlayerStats from "../models/PlayerStats.js";
import { calculateLevel, getLevelTitle } from "../services/statsService.js";

// @desc    Search users by name or email
// @route   GET /api/friends/search?q=...
// @access  Protected
export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    res.json([]);
    return;
  }

  const regex = new RegExp(q.trim(), "i");
  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
  })
    .select("_id firstName lastName email")
    .limit(20);

  // Get existing friendships with these users
  const userIds = users.map((u) => u._id);
  const friendships = await Friendship.find({
    $or: [
      { requester: req.user._id, recipient: { $in: userIds } },
      { recipient: req.user._id, requester: { $in: userIds } },
    ],
    status: { $ne: "rejected" },
  });

  const friendshipMap = {};
  friendships.forEach((f) => {
    const otherId =
      f.requester.toString() === req.user._id.toString()
        ? f.recipient.toString()
        : f.requester.toString();
    friendshipMap[otherId] = {
      friendshipId: f._id,
      status: f.status,
      isRequester: f.requester.toString() === req.user._id.toString(),
    };
  });

  const results = users.map((u) => ({
    _id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    friendship: friendshipMap[u._id.toString()] || null,
  }));

  res.json(results);
});

// @desc    Send friend request
// @route   POST /api/friends/request
// @access  Protected
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;

  if (!recipientId) {
    res.status(400);
    throw new Error("Recipient ID required");
  }

  if (recipientId === req.user._id.toString()) {
    res.status(400);
    throw new Error("Cannot send friend request to yourself");
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check for existing friendship in either direction
  const existing = await Friendship.findOne({
    $or: [
      { requester: req.user._id, recipient: recipientId },
      { requester: recipientId, recipient: req.user._id },
    ],
  });

  if (existing) {
    if (existing.status === "accepted") {
      res.status(400);
      throw new Error("Already friends");
    }
    if (existing.status === "pending") {
      // If they sent us a request, auto-accept
      if (existing.requester.toString() === recipientId) {
        existing.status = "accepted";
        await existing.save();
        res.json({ message: "Friend request accepted", friendship: existing });
        return;
      }
      res.status(400);
      throw new Error("Friend request already sent");
    }
    if (existing.status === "rejected") {
      // Allow re-requesting after rejection
      existing.status = "pending";
      existing.requester = req.user._id;
      existing.recipient = recipientId;
      await existing.save();
      res.status(201).json(existing);
      return;
    }
  }

  const friendship = await Friendship.create({
    requester: req.user._id,
    recipient: recipientId,
  });

  res.status(201).json(friendship);
});

// @desc    Get pending friend requests (received)
// @route   GET /api/friends/requests
// @access  Protected
export const getFriendRequests = asyncHandler(async (req, res) => {
  const requests = await Friendship.find({
    recipient: req.user._id,
    status: "pending",
  })
    .populate("requester", "firstName lastName email")
    .sort({ createdAt: -1 });

  res.json(requests);
});

// @desc    Accept friend request
// @route   POST /api/friends/accept/:friendshipId
// @access  Protected
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const friendship = await Friendship.findById(req.params.friendshipId);

  if (!friendship) {
    res.status(404);
    throw new Error("Friend request not found");
  }

  if (friendship.recipient.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  if (friendship.status !== "pending") {
    res.status(400);
    throw new Error("Request already handled");
  }

  friendship.status = "accepted";
  await friendship.save();

  res.json({ message: "Friend request accepted", friendship });
});

// @desc    Reject friend request
// @route   POST /api/friends/reject/:friendshipId
// @access  Protected
export const rejectFriendRequest = asyncHandler(async (req, res) => {
  const friendship = await Friendship.findById(req.params.friendshipId);

  if (!friendship) {
    res.status(404);
    throw new Error("Friend request not found");
  }

  if (friendship.recipient.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  friendship.status = "rejected";
  await friendship.save();

  res.json({ message: "Friend request rejected" });
});

// @desc    Get friends list
// @route   GET /api/friends
// @access  Protected
export const getFriends = asyncHandler(async (req, res) => {
  const friendships = await Friendship.find({
    $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    status: "accepted",
  })
    .populate("requester", "firstName lastName email")
    .populate("recipient", "firstName lastName email");

  const friendsList = friendships.map((f) => {
    const friend =
      f.requester._id.toString() === req.user._id.toString()
        ? f.recipient
        : f.requester;
    return {
      friendshipId: f._id,
      _id: friend._id,
      firstName: friend.firstName,
      lastName: friend.lastName,
      email: friend.email,
    };
  });

  // Enrich with level data from PlayerStats
  const friendIds = friendsList.map((f) => f._id);
  const statsArr = await PlayerStats.find({ userId: { $in: friendIds } }).select("userId xp").lean();
  const statsMap = {};
  statsArr.forEach((s) => {
    statsMap[s.userId.toString()] = s;
  });

  const friends = friendsList.map((f) => {
    const s = statsMap[f._id.toString()];
    const level = s ? calculateLevel(s.xp) : 1;
    return {
      ...f,
      level,
      levelTitle: getLevelTitle(level),
    };
  });

  res.json(friends);
});

// @desc    Remove friend
// @route   DELETE /api/friends/:friendshipId
// @access  Protected
export const removeFriend = asyncHandler(async (req, res) => {
  const friendship = await Friendship.findById(req.params.friendshipId);

  if (!friendship) {
    res.status(404);
    throw new Error("Friendship not found");
  }

  const isParty =
    friendship.requester.toString() === req.user._id.toString() ||
    friendship.recipient.toString() === req.user._id.toString();

  if (!isParty) {
    res.status(403);
    throw new Error("Not authorized");
  }

  await friendship.deleteOne();

  res.json({ message: "Friend removed" });
});
