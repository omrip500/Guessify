import asyncHandler from "express-async-handler";
import PlayerStats from "../models/PlayerStats.js";
import Friendship from "../models/Friendship.js";
import User from "../models/userModel.js";
import { calculateLevel, getLevelTitle, xpForLevel } from "../services/statsService.js";

// @desc    Get current user's stats
// @route   GET /api/stats/me
// @access  Private
export const getMyStats = asyncHandler(async (req, res) => {
  let stats = await PlayerStats.findOne({ userId: req.user._id });

  if (!stats) {
    // Return empty stats for users who haven't played online yet
    stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      podiumFinishes: 0,
      totalScore: 0,
      bestScore: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      songTitleGuesses: 0,
      artistGuesses: 0,
      lyricsGuesses: 0,
      currentStreak: 0,
      bestStreak: 0,
      xp: 0,
      level: 1,
      accuracy: 0,
      winRate: 0,
      recentGames: [],
    };
  }

  const level = stats.level || calculateLevel(stats.xp || 0);
  const xpCurrent = xpForLevel(level);
  const xpNext = xpForLevel(level + 1);

  res.json({
    ...stats.toJSON ? stats.toJSON() : stats,
    level,
    levelTitle: getLevelTitle(level),
    xpForCurrentLevel: xpCurrent,
    xpForNextLevel: xpNext,
    xpProgress: stats.xp - xpCurrent,
    xpNeeded: xpNext - xpCurrent,
    user: {
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
    },
  });
});

// @desc    Get global leaderboard
// @route   GET /api/stats/leaderboard
// @access  Private
export const getLeaderboard = asyncHandler(async (req, res) => {
  const stats = await PlayerStats.find({ gamesPlayed: { $gt: 0 } })
    .sort({ totalScore: -1 })
    .limit(50)
    .lean();

  // Fetch user names for leaderboard
  const userIds = stats.map((s) => s.userId);
  const users = await User.find({ _id: { $in: userIds } }).select("firstName lastName").lean();
  const userMap = {};
  users.forEach((u) => {
    userMap[u._id.toString()] = u;
  });

  const leaderboard = stats.map((s, index) => {
    const user = userMap[s.userId.toString()] || {};
    const level = calculateLevel(s.xp);
    return {
      rank: index + 1,
      userId: s.userId,
      firstName: user.firstName || "Unknown",
      lastName: user.lastName || "",
      totalScore: s.totalScore,
      gamesPlayed: s.gamesPlayed,
      gamesWon: s.gamesWon,
      accuracy: s.totalAnswers > 0 ? Math.round((s.correctAnswers / s.totalAnswers) * 100) : 0,
      level,
      levelTitle: getLevelTitle(level),
    };
  });

  res.json(leaderboard);
});

// @desc    Get friends leaderboard
// @route   GET /api/stats/friends-leaderboard
// @access  Private
export const getFriendsLeaderboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get all accepted friendships
  const friendships = await Friendship.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: "accepted",
  }).lean();

  // Collect friend IDs + self
  const friendIds = friendships.map((f) =>
    f.requester.toString() === userId.toString() ? f.recipient : f.requester
  );
  friendIds.push(userId); // Include self

  // Get stats for all friends + self
  const stats = await PlayerStats.find({ userId: { $in: friendIds } }).lean();

  // Also include friends with no stats (they'll show as level 1, 0 games)
  const statsMap = {};
  stats.forEach((s) => {
    statsMap[s.userId.toString()] = s;
  });

  const users = await User.find({ _id: { $in: friendIds } }).select("firstName lastName").lean();

  const leaderboard = users
    .map((u) => {
      const s = statsMap[u._id.toString()] || { xp: 0, totalScore: 0, gamesPlayed: 0, gamesWon: 0, correctAnswers: 0, totalAnswers: 0 };
      const level = calculateLevel(s.xp || 0);
      return {
        userId: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        totalScore: s.totalScore || 0,
        gamesPlayed: s.gamesPlayed || 0,
        gamesWon: s.gamesWon || 0,
        accuracy: s.totalAnswers > 0 ? Math.round((s.correctAnswers / s.totalAnswers) * 100) : 0,
        level,
        levelTitle: getLevelTitle(level),
        isMe: u._id.toString() === userId.toString(),
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  res.json(leaderboard);
});

// @desc    Get stats for a specific user (public profile)
// @route   GET /api/stats/user/:userId
// @access  Private
export const getUserStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const user = await User.findById(userId).select("firstName lastName");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const stats = await PlayerStats.findOne({ userId });

  const s = stats || { xp: 0, totalScore: 0, gamesPlayed: 0, gamesWon: 0, podiumFinishes: 0, correctAnswers: 0, totalAnswers: 0, bestScore: 0, bestStreak: 0, currentStreak: 0, songTitleGuesses: 0, artistGuesses: 0, lyricsGuesses: 0 };
  const level = calculateLevel(s.xp || 0);

  // Check friendship status between current user and viewed user
  let friendship = null;
  if (currentUserId.toString() !== userId) {
    const f = await Friendship.findOne({
      $or: [
        { requester: currentUserId, recipient: userId },
        { requester: userId, recipient: currentUserId },
      ],
    }).lean();
    if (f) {
      friendship = {
        friendshipId: f._id,
        status: f.status,
        isRequester: f.requester.toString() === currentUserId.toString(),
      };
    }
  }

  res.json({
    userId,
    firstName: user.firstName,
    lastName: user.lastName,
    level,
    levelTitle: getLevelTitle(level),
    totalScore: s.totalScore || 0,
    gamesPlayed: s.gamesPlayed || 0,
    gamesWon: s.gamesWon || 0,
    podiumFinishes: s.podiumFinishes || 0,
    accuracy: s.totalAnswers > 0 ? Math.round((s.correctAnswers / s.totalAnswers) * 100) : 0,
    bestScore: s.bestScore || 0,
    bestStreak: s.bestStreak || 0,
    isMe: currentUserId.toString() === userId,
    friendship,
  });
});
