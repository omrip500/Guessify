import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PageLayout from "../components/PageLayout";
import { useGetMyStatsQuery } from "../slices/statsApiSlice";
import {
  FaArrowLeft,
  FaTrophy,
  FaGamepad,
  FaMusic,
  FaBullseye,
  FaFire,
  FaStar,
  FaMedal,
  FaClock,
} from "react-icons/fa";

const LEVEL_TITLES = {
  Newbie: "🌱",
  "Rising Star": "⭐",
  "Music Fan": "🎵",
  Maestro: "🎼",
  Legend: "👑",
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const { data: stats, isLoading, error } = useGetMyStatsQuery();

  if (!userInfo) {
    navigate("/login");
    return null;
  }

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

  if (error) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
            <p className="text-red-600 text-lg font-semibold mb-4">Failed to load profile</p>
            <button onClick={() => navigate("/dashboard")} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all">
              Back to Dashboard
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const s = stats || {};
  const xpProgress = s.xpProgress || 0;
  const xpNeeded = s.xpNeeded || 1;
  const xpPercent = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));
  const levelEmoji = LEVEL_TITLES[s.levelTitle] || "🌱";

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 py-8 sm:py-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-4xl mx-auto px-4">
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-purple-100 hover:text-white mb-4 sm:mb-6 transition-colors">
              <FaArrowLeft />
              <span>Back to Dashboard</span>
            </button>

            {/* Profile Card */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl sm:text-5xl border-2 border-white/30">
                {levelEmoji}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-4xl font-bold mb-1">
                  {s.user?.firstName} {s.user?.lastName}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                    Level {s.level || 1}
                  </span>
                  <span className="text-purple-100 text-sm">{s.levelTitle || "Newbie"}</span>
                </div>
                {/* XP Bar */}
                <div className="mt-3 w-64 sm:w-80">
                  <div className="flex justify-between text-xs text-purple-200 mb-1">
                    <span>{s.xp || 0} XP</span>
                    <span>{s.xpForNextLevel || 50} XP for Level {(s.level || 1) + 1}</span>
                  </div>
                  <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${xpPercent}%` }}
                    ></div>
                  </div>
                </div>
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
              <p className="text-2xl font-bold text-gray-800">{s.currentStreak || 0}</p>
              <p className="text-gray-500 text-xs">Current Streak</p>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Performance */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
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
                  <span className="text-gray-800 font-bold">{s.winRate || 0}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 text-sm">Podium Finishes</span>
                  <span className="text-gray-800 font-bold">{s.podiumFinishes || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 text-sm">Best Streak</span>
                  <span className="text-gray-800 font-bold">{s.bestStreak || 0}</span>
                </div>
              </div>
            </div>

            {/* Answer Breakdown */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaMusic className="text-pink-600" /> Answer Breakdown
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 text-sm">Correct Answers</span>
                  <span className="text-gray-800 font-bold">{s.correctAnswers || 0} / {s.totalAnswers || 0}</span>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-purple-700 text-sm font-medium">Song Titles</span>
                    <span className="text-purple-800 font-bold">{s.songTitleGuesses || 0}</span>
                  </div>
                  <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${s.correctAnswers ? Math.round(((s.songTitleGuesses || 0) / s.correctAnswers) * 100) : 0}%` }}></div>
                  </div>
                </div>
                <div className="p-3 bg-pink-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-pink-700 text-sm font-medium">Artists</span>
                    <span className="text-pink-800 font-bold">{s.artistGuesses || 0}</span>
                  </div>
                  <div className="h-2 bg-pink-200 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500 rounded-full" style={{ width: `${s.correctAnswers ? Math.round(((s.artistGuesses || 0) / s.correctAnswers) * 100) : 0}%` }}></div>
                  </div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-indigo-700 text-sm font-medium">Lyrics</span>
                    <span className="text-indigo-800 font-bold">{s.lyricsGuesses || 0}</span>
                  </div>
                  <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.correctAnswers ? Math.round(((s.lyricsGuesses || 0) / s.correctAnswers) * 100) : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Games */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaClock className="text-purple-600" /> Recent Games
            </h2>
            {(!s.recentGames || s.recentGames.length === 0) ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎮</div>
                <p className="text-gray-600 font-medium mb-1">No games played yet</p>
                <p className="text-gray-400 text-sm mb-4">Play online games to start tracking your stats!</p>
                <button onClick={() => navigate("/play-online")} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-2.5 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg">
                  Play Online
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {s.recentGames.slice(0, 10).map((game, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-100 text-purple-600 font-bold text-sm">
                        {game.placement <= 3 ? ["🥇", "🥈", "🥉"][game.placement - 1] : `#${game.placement}`}
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium text-sm">{game.gameTitle}</p>
                        <p className="text-gray-400 text-xs">
                          {game.correctCount}/{game.totalSongs} correct · {game.totalPlayers} players
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800 font-bold text-sm">{game.score.toLocaleString()} pts</p>
                      <p className="text-purple-600 text-xs font-medium">+{game.xpEarned} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard CTA */}
          <div className="mt-6">
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
                    <p className="text-gray-500 text-xs">See how you rank globally and among friends</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all text-lg">→</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ProfilePage;
