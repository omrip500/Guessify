import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PageLayout from "../components/PageLayout";
import {
  useGetLeaderboardQuery,
  useGetFriendsLeaderboardQuery,
} from "../slices/statsApiSlice";
import {
  FaArrowLeft,
  FaGlobe,
  FaUserFriends,
  FaTrophy,
  FaBullseye,
  FaGamepad,
} from "react-icons/fa";

const LEVEL_EMOJIS = {
  Newbie: "🌱",
  "Rising Star": "⭐",
  "Music Fan": "🎵",
  Maestro: "🎼",
  Legend: "👑",
};

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [tab, setTab] = useState("global");

  const { data: globalData, isLoading: globalLoading } = useGetLeaderboardQuery();
  const { data: friendsData, isLoading: friendsLoading } = useGetFriendsLeaderboardQuery();

  if (!userInfo) {
    navigate("/login");
    return null;
  }

  const isLoading = tab === "global" ? globalLoading : friendsLoading;
  const leaderboard = tab === "global" ? globalData : friendsData;

  const getMedalDisplay = (rank) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-gray-500 font-bold text-sm">#{rank}</span>;
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 py-8 sm:py-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-3xl mx-auto px-4">
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-purple-100 hover:text-white mb-4 sm:mb-6 transition-colors">
              <FaArrowLeft />
              <span>Back to Dashboard</span>
            </button>
            <div className="text-center">
              <div className="mb-3">
                <span className="text-4xl sm:text-5xl">🏆</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                Leaderboard
              </h1>
              <p className="text-sm sm:text-lg text-purple-100 max-w-xl mx-auto">
                See who's on top. Compete to climb the ranks.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("global")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2 ${
                tab === "global"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              <FaGlobe className="text-xs" />
              Global
            </button>
            <button
              onClick={() => setTab("friends")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2 ${
                tab === "friends"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              <FaUserFriends className="text-xs" />
              Friends
            </button>
          </div>

          {/* Leaderboard Content */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading leaderboard...</p>
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
              <div className="text-4xl mb-4">🏆</div>
              <p className="text-gray-800 text-lg font-semibold mb-2">
                {tab === "friends" ? "No friends with stats yet" : "No players on the leaderboard yet"}
              </p>
              <p className="text-gray-500 text-sm mb-4">
                {tab === "friends"
                  ? "Invite friends and play online games to compete!"
                  : "Play online games to appear on the leaderboard!"}
              </p>
              <button onClick={() => navigate("/play-online")} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-2.5 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg">
                Play Online
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-3 mb-6 px-4">
                  {/* 2nd Place */}
                  <div className="flex-1 max-w-[130px]">
                    <div className="bg-white rounded-2xl p-3 shadow-lg border border-gray-100 text-center">
                      <div className="text-2xl mb-1">🥈</div>
                      <div className="text-sm font-bold text-gray-800 truncate">{leaderboard[1].firstName}</div>
                      <div className="text-xs text-gray-400">Lv.{leaderboard[1].level}</div>
                      <div className="text-sm font-bold text-purple-600 mt-1">{leaderboard[1].totalScore.toLocaleString()}</div>
                    </div>
                  </div>
                  {/* 1st Place */}
                  <div className="flex-1 max-w-[140px]">
                    <div className="bg-gradient-to-b from-yellow-50 to-white rounded-2xl p-4 shadow-xl border-2 border-yellow-200 text-center">
                      <div className="text-3xl mb-1">🥇</div>
                      <div className="text-sm font-bold text-gray-800 truncate">{leaderboard[0].firstName}</div>
                      <div className="text-xs text-gray-400">Lv.{leaderboard[0].level}</div>
                      <div className="text-lg font-bold text-purple-600 mt-1">{leaderboard[0].totalScore.toLocaleString()}</div>
                    </div>
                  </div>
                  {/* 3rd Place */}
                  <div className="flex-1 max-w-[130px]">
                    <div className="bg-white rounded-2xl p-3 shadow-lg border border-gray-100 text-center">
                      <div className="text-2xl mb-1">🥉</div>
                      <div className="text-sm font-bold text-gray-800 truncate">{leaderboard[2].firstName}</div>
                      <div className="text-xs text-gray-400">Lv.{leaderboard[2].level}</div>
                      <div className="text-sm font-bold text-purple-600 mt-1">{leaderboard[2].totalScore.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Full List */}
              {leaderboard.map((entry) => {
                const isMe = tab === "friends" ? entry.isMe : entry.userId === userInfo._id;
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl shadow-lg border transition-all cursor-pointer hover:shadow-xl ${
                      isMe
                        ? "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
                        : "bg-white border-gray-100"
                    }`}
                    onClick={() => isMe ? navigate("/profile") : navigate(`/profile/${entry.userId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center">
                        {getMedalDisplay(entry.rank)}
                      </div>
                      <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {entry.firstName[0]}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${isMe ? "text-purple-800" : "text-gray-800"}`}>
                          {entry.firstName} {entry.lastName?.[0]}.
                          {isMe && <span className="text-purple-500 text-xs ml-1">(You)</span>}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{LEVEL_EMOJIS[entry.levelTitle] || "🌱"} Lv.{entry.level}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5"><FaGamepad className="text-[10px]" /> {entry.gamesPlayed}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5"><FaBullseye className="text-[10px]" /> {entry.accuracy}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-600 font-bold text-sm">{entry.totalScore.toLocaleString()}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-0.5 justify-end"><FaTrophy className="text-yellow-500 text-[10px]" /> {entry.gamesWon} wins</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default LeaderboardPage;
