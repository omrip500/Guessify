import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import PageLayout from "../components/PageLayout";
import { useGetUserStatsQuery } from "../slices/statsApiSlice";
import { BASE_URL } from "../constants";
import {
  FaArrowLeft,
  FaTrophy,
  FaGamepad,
  FaBullseye,
  FaFire,
  FaStar,
  FaMedal,
  FaUserPlus,
  FaUserCheck,
  FaClock,
} from "react-icons/fa";

const LEVEL_TITLES = {
  Newbie: "🌱",
  "Rising Star": "⭐",
  "Music Fan": "🎵",
  Maestro: "🎼",
  Legend: "👑",
};

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { data: profile, isLoading, error, refetch } = useGetUserStatsQuery(userId);
  const [actionLoading, setActionLoading] = useState(false);

  if (!userInfo) {
    navigate("/login");
    return null;
  }

  // If viewing own profile, redirect to /profile
  if (userId === userInfo._id) {
    navigate("/profile", { replace: true });
    return null;
  }

  const handleSendRequest = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send request");
      toast.success(data.message || "Friend request sent!");
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/friends/accept/${friendshipId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to accept");
      toast.success("Friend request accepted!");
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/friends/${friendshipId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove");
      toast.success("Friend removed");
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading profile...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !profile) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
            <p className="text-red-600 text-lg font-semibold mb-4">User not found</p>
            <button onClick={() => navigate(-1)} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all">
              Go Back
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const s = profile;
  const levelEmoji = LEVEL_TITLES[s.levelTitle] || "🌱";
  const friendship = s.friendship;

  const renderFriendshipButton = () => {
    if (!friendship) {
      return (
        <button
          onClick={handleSendRequest}
          disabled={actionLoading}
          className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          <FaUserPlus /> Add Friend
        </button>
      );
    }

    if (friendship.status === "accepted") {
      return (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 bg-green-500/20 backdrop-blur-sm text-green-200 font-semibold px-4 py-2 rounded-xl">
            <FaUserCheck /> Friends
          </span>
          <button
            onClick={() => handleRemoveFriend(friendship.friendshipId)}
            disabled={actionLoading}
            className="text-red-300 hover:text-red-200 text-xs transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      );
    }

    if (friendship.status === "pending") {
      if (friendship.isRequester) {
        return (
          <span className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm text-yellow-200 font-semibold px-4 py-2 rounded-xl">
            <FaClock /> Request Sent
          </span>
        );
      }
      return (
        <button
          onClick={() => handleAcceptRequest(friendship.friendshipId)}
          disabled={actionLoading}
          className="flex items-center gap-2 bg-green-500/20 backdrop-blur-sm hover:bg-green-500/30 text-green-200 font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          <FaUserCheck /> Accept Request
        </button>
      );
    }

    return null;
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 py-8 sm:py-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-4xl mx-auto px-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-purple-100 hover:text-white mb-4 sm:mb-6 transition-colors">
              <FaArrowLeft />
              <span>Back</span>
            </button>

            {/* Profile Card */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl sm:text-5xl border-2 border-white/30">
                {levelEmoji}
              </div>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl sm:text-4xl font-bold mb-1">
                  {s.firstName} {s.lastName}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                    Level {s.level || 1}
                  </span>
                  <span className="text-purple-100 text-sm">{s.levelTitle || "Newbie"}</span>
                </div>
                {renderFriendshipButton()}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 text-center">
              <FaGamepad className="text-purple-600 text-xl mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{s.gamesPlayed || 0}</p>
              <p className="text-gray-500 text-xs">Games Played</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 text-center">
              <FaTrophy className="text-yellow-500 text-xl mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{s.gamesWon || 0}</p>
              <p className="text-gray-500 text-xs">Wins</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 text-center">
              <FaBullseye className="text-pink-500 text-xl mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{s.accuracy || 0}%</p>
              <p className="text-gray-500 text-xs">Accuracy</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 text-center">
              <FaFire className="text-orange-500 text-xl mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{s.bestStreak || 0}</p>
              <p className="text-gray-500 text-xs">Best Streak</p>
            </div>
          </div>

          {/* Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaStar className="text-purple-600" /> Performance
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600 text-sm">Total Score</span>
                <span className="text-gray-800 font-bold">{(s.totalScore || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600 text-sm">Best Game Score</span>
                <span className="text-gray-800 font-bold">{(s.bestScore || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600 text-sm">Win Rate</span>
                <span className="text-gray-800 font-bold">
                  {s.gamesPlayed > 0 ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600 text-sm">Podium Finishes</span>
                <span className="text-gray-800 font-bold">{s.podiumFinishes || 0}</span>
              </div>
            </div>
          </div>

          {/* Leaderboard CTA */}
          <button
            onClick={() => navigate("/leaderboard")}
            className="w-full bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all group text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-2.5 rounded-xl">
                  <FaMedal className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-gray-800 font-semibold text-sm">Leaderboard</p>
                  <p className="text-gray-500 text-xs">See how players rank globally</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all text-lg">&rarr;</span>
            </div>
          </button>
        </div>
      </div>
    </PageLayout>
  );
};

export default UserProfilePage;
