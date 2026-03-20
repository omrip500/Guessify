import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getSocket } from "../socket";
import { BASE_URL, AI_URL, PLAY_APP_URL } from "../constants";
import PageLayout from "../components/PageLayout";
import {
  FaArrowLeft,
  FaUserFriends,
  FaGlobe,
  FaUsers,
  FaLock,
  FaMagic,
  FaPlay,
} from "react-icons/fa";

const AI_SUGGESTIONS = [
  "Israeli songs from the 90s",
  "Arik Einstein songs",
  "Sad Hebrew songs",
  "Pop hits 2024",
  "Classic rock legends",
  "Love songs in Hebrew",
];

const PlayOnlinePage = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [onlineRooms, setOnlineRooms] = useState([]);
  const [publicGames, setPublicGames] = useState([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("rooms"); // "rooms" | "create" | "ai"
  const [roomVisibility, setRoomVisibility] = useState("public");

  // AI generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    if (!userInfo) {
      navigate("/login");
    }
  }, [userInfo, navigate]);

  // Set default username from auth
  useEffect(() => {
    if (userInfo && !username) {
      setUsername(userInfo.firstName);
    }
  }, [userInfo, username]);

  // Fetch public games for creating new online rooms
  const fetchPublicGames = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/games/public`);
      const data = await res.json();
      setPublicGames(data);
    } catch (err) {
      console.error("Failed to fetch public games:", err);
    }
  }, []);

  useEffect(() => {
    if (!userInfo) return;

    const socket = getSocket({ userId: userInfo._id });

    // Update presence
    socket.emit("updatePresence", { status: "online" });

    // Request lobby data
    socket.emit("getOnlineRooms");
    fetchPublicGames();

    socket.on("onlineRoomsList", (rooms) => {
      setOnlineRooms(rooms);
      setLoading(false);
    });

    // When any room changes, re-fetch personalized list (includes friends-only rooms)
    socket.on("onlineLobbyChanged", () => {
      socket.emit("getOnlineRooms");
    });

    socket.on("onlineError", (msg) => {
      toast.error(msg);
    });

    // Refresh lobby every 5 seconds
    const interval = setInterval(() => {
      socket.emit("getOnlineRooms");
    }, 5000);

    return () => {
      socket.off("onlineRoomsList");
      socket.off("onlineLobbyChanged");
      socket.off("onlineError");
      clearInterval(interval);
    };
  }, [userInfo, fetchPublicGames]);

  const handleJoinRoom = (roomCode) => {
    if (!username.trim()) {
      toast.error("Please enter a nickname first");
      return;
    }
    window.location.href = `${PLAY_APP_URL}/online/entry?action=join&roomCode=${roomCode}&username=${encodeURIComponent(username.trim())}`;
  };

  const handleCreateRoom = (gameId) => {
    if (!username.trim()) {
      toast.error("Please enter a nickname first");
      return;
    }
    window.location.href = `${PLAY_APP_URL}/online/entry?action=create&gameId=${gameId}&username=${encodeURIComponent(username.trim())}&visibility=${roomVisibility}`;
  };

  // AI game generation
  const handleGenerateGame = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Describe the game you want");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const res = await fetch(`${AI_URL}/generate-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to generate game");
      }

      setAiResult(data);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  if (!userInfo) return null;

  const waitingRooms = onlineRooms.filter((r) => r.status === "waiting");

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 py-8 sm:py-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-3xl mx-auto px-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-purple-100 hover:text-white mb-4 sm:mb-6 transition-colors"
            >
              <FaArrowLeft />
              <span>Back to Dashboard</span>
            </button>
            <div className="text-center">
              <div className="mb-3">
                <span className="text-4xl sm:text-5xl">🌐</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                Play Online
              </h1>
              <p className="text-sm sm:text-lg text-purple-100 max-w-xl mx-auto">
                Join live games, play with friends, or start a new session
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Friends Quick Access */}
          <button
            onClick={() => navigate("/friends")}
            className="w-full bg-white rounded-2xl p-4 shadow-lg border border-gray-100 mb-6 hover:shadow-xl transition-all group text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2.5 rounded-xl">
                  <FaUserFriends className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-gray-800 font-semibold text-sm">Friends</p>
                  <p className="text-gray-500 text-xs">
                    See who's online, send invites, join games
                  </p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all text-lg">
                →
              </span>
            </div>
          </button>

          {/* User Info + Nickname */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-500 text-sm">
                Signed in as{" "}
                <span className="text-gray-800 font-semibold">
                  {userInfo.firstName} {userInfo.lastName}
                </span>
              </p>
            </div>
            <label className="text-gray-600 text-sm font-medium mb-1.5 block">
              Display Name (in game)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.slice(0, 20))}
              placeholder="Enter your display name..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              maxLength={20}
            />
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("rooms")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm ${
                tab === "rooms"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              Join a Game ({waitingRooms.length})
            </button>
            <button
              onClick={() => {
                setTab("create");
                fetchPublicGames();
              }}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm ${
                tab === "create"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              Start a Game
            </button>
            <button
              onClick={() => setTab("ai")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-1.5 ${
                tab === "ai"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              <FaMagic className="text-xs" />
              AI Game
            </button>
          </div>

          {/* ========== JOIN TAB ========== */}
          {tab === "rooms" && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading games...</p>
                </div>
              ) : waitingRooms.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                  <div className="text-4xl mb-4">🎵</div>
                  <p className="text-gray-800 text-lg font-semibold mb-2">
                    No live games right now
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Be the first to start one!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setTab("create")}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-2.5 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg"
                    >
                      Start a Game
                    </button>
                    <button
                      onClick={() => setTab("ai")}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-6 py-2.5 rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <FaMagic className="text-sm" />
                      Create with AI
                    </button>
                  </div>
                </div>
              ) : (
                waitingRooms.map((room) => (
                  <div
                    key={room.roomCode}
                    className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-gray-800 font-bold text-lg">
                            {room.title}
                          </h3>
                          {room.visibility === "friends" && (
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              Friends
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>
                            👥 {room.playerCount}/{room.maxPlayers} players
                          </span>
                          <span>🎵 {room.songCount} songs</span>
                          <span>⏱️ {room.guessTimeLimit}s</span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          Started by {room.creatorUsername}
                        </p>
                      </div>
                      <button
                        onClick={() => handleJoinRoom(room.roomCode)}
                        disabled={!username.trim()}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2.5 rounded-xl hover:from-purple-500 hover:to-pink-500 disabled:from-gray-400 disabled:to-gray-500 transition-all transform hover:scale-105 shadow-lg"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ========== START A GAME TAB ========== */}
          {tab === "create" && (
            <div className="space-y-3">
              {/* Room Visibility Selector */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                <label className="text-gray-700 text-sm font-semibold mb-3 block">
                  Who can join?
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "public", label: "Everyone", icon: <FaGlobe className="text-purple-600" />, desc: "Visible to all players" },
                    { value: "friends", label: "Friends", icon: <FaUsers className="text-purple-600" />, desc: "Only your friends" },
                    { value: "private", label: "Invite Only", icon: <FaLock className="text-gray-500" />, desc: "Share the code" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRoomVisibility(opt.value)}
                      className={`flex-1 py-3 px-2 rounded-xl text-center transition-all ${
                        roomVisibility === opt.value
                          ? "bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-400 shadow-md"
                          : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                      }`}
                    >
                      <div className="text-lg flex justify-center mb-1">{opt.icon}</div>
                      <div className={`text-xs font-semibold mt-0.5 ${roomVisibility === opt.value ? "text-purple-700" : "text-gray-700"}`}>{opt.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {publicGames.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                  <div className="text-4xl mb-4">📝</div>
                  <p className="text-gray-800 text-lg font-semibold mb-2">
                    No public games available
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Game creators need to mark their games as public, or you can
                    let AI create one for you.
                  </p>
                  <button
                    onClick={() => setTab("ai")}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-6 py-2.5 rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    <FaMagic className="text-sm" />
                    Create with AI
                  </button>
                </div>
              ) : (
                publicGames.map((game) => (
                  <div
                    key={game._id}
                    className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-gray-800 font-bold text-lg">
                            {game.title}
                          </h3>
                          {game.source === "ai" && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              AI
                            </span>
                          )}
                        </div>
                        {game.description && (
                          <p className="text-gray-500 text-sm mt-1 line-clamp-1">
                            {game.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                          <span>🎵 {game.songCount} songs</span>
                          <span>⏱️ {game.guessTimeLimit}s</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCreateRoom(game._id)}
                        disabled={!username.trim()}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2.5 rounded-xl hover:from-purple-500 hover:to-pink-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
                      >
                        Start Game
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ========== AI GAME TAB ========== */}
          {tab === "ai" && (
            <div className="space-y-4">
              {/* AI Result — show at top when ready */}
              {aiResult && (
                <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <FaMagic />
                      <span className="font-bold">AI Generated</span>
                    </div>
                    <span className="text-amber-100 text-sm">
                      {aiResult.songCount} songs
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-gray-800 font-bold text-xl mb-1">
                      {aiResult.title}
                    </h3>
                    {aiResult.description && (
                      <p className="text-gray-500 text-sm mb-3">
                        {aiResult.description}
                      </p>
                    )}

                    {/* Song preview grid */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {aiResult.songs.slice(0, 6).map((song, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5"
                        >
                          {song.artworkUrl && (
                            <img
                              src={song.artworkUrl}
                              alt=""
                              className="w-6 h-6 rounded"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-gray-700 text-xs font-medium truncate max-w-[120px]">
                              {song.title}
                            </p>
                            <p className="text-gray-400 text-[10px] truncate max-w-[120px]">
                              {song.artist}
                            </p>
                          </div>
                        </div>
                      ))}
                      {aiResult.songCount > 6 && (
                        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5">
                          <span className="text-gray-400 text-xs">
                            +{aiResult.songCount - 6} more
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleCreateRoom(aiResult._id)}
                        disabled={!username.trim()}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-xl hover:from-green-400 hover:to-emerald-400 disabled:from-gray-400 disabled:to-gray-500 transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 text-lg"
                      >
                        <FaPlay className="text-sm" />
                        Start Game
                      </button>
                      <button
                        onClick={() => {
                          setAiResult(null);
                          setAiPrompt("");
                        }}
                        className="bg-gray-100 text-gray-600 font-semibold px-5 py-3 rounded-xl hover:bg-gray-200 transition-all"
                      >
                        New
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Input — hide when result is showing */}
              {!aiResult && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-xl">
                      <FaMagic className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-gray-800 font-bold text-lg">
                        Create with AI
                      </h3>
                      <p className="text-gray-500 text-xs">
                        Describe the game you want and AI will create it
                        instantly
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value.slice(0, 500))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !aiLoading) handleGenerateGame();
                    }}
                    placeholder="e.g. Israeli songs from the 90s..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-base"
                    maxLength={500}
                    disabled={aiLoading}
                  />

                  {/* Suggestion chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {AI_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setAiPrompt(suggestion)}
                        disabled={aiLoading}
                        className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors border border-amber-200 disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  {/* Error */}
                  {aiError && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-red-600 text-sm">{aiError}</p>
                    </div>
                  )}

                  {/* Generate button */}
                  <button
                    onClick={handleGenerateGame}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {aiLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Creating your game...
                      </>
                    ) : (
                      <>
                        <FaMagic />
                        Generate Game
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default PlayOnlinePage;
