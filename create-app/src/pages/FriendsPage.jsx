import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getSocket } from "../socket";
import { BASE_URL, PLAY_APP_URL } from "../constants";
import PageLayout from "../components/PageLayout";
import {
  FaArrowLeft,
  FaUserFriends,
  FaSearch,
  FaEnvelope,
} from "react-icons/fa";

const PRESENCE_LABELS = {
  online: { text: "Online", color: "bg-green-400" },
  in_lobby: { text: "In Lobby", color: "bg-yellow-400" },
  in_game: { text: "In Game", color: "bg-indigo-400" },
  offline: { text: "Offline", color: "bg-gray-400" },
};

const FriendsPage = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [tab, setTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendsPresence, setFriendsPresence] = useState({});

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/friends`, {
        credentials: "include",
      });
      const data = await res.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/friends/requests`, {
        credentials: "include",
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    }
  }, []);

  useEffect(() => {
    if (!userInfo) {
      navigate("/login");
      return;
    }

    const load = async () => {
      await Promise.all([fetchFriends(), fetchRequests()]);
      setLoading(false);
    };
    load();

    const socket = getSocket({ userId: userInfo._id });
    socket.emit("getFriendsPresence");

    socket.on("friendsPresence", (data) => {
      setFriendsPresence(data);
    });

    socket.on("friendPresenceUpdate", ({ userId: uid, status, roomCode, roomVisibility }) => {
      setFriendsPresence((prev) => ({
        ...prev,
        [uid]: { status, roomCode, roomVisibility },
      }));
    });

    return () => {
      socket.off("friendsPresence");
      socket.off("friendPresenceUpdate");
    };
  }, [userInfo, navigate, fetchFriends, fetchRequests]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`,
        { credentials: "include" }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (recipientId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send request");
      toast.success(data.message || "Friend request sent!");
      handleSearch();
      fetchFriends();
      fetchRequests();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/friends/accept/${friendshipId}`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to accept");
      toast.success("Friend request accepted!");
      fetchFriends();
      fetchRequests();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReject = async (friendshipId) => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/friends/reject/${friendshipId}`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to reject");
      toast.success("Request rejected");
      fetchRequests();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveFriend = async (friendshipId, name) => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/friends/${friendshipId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to remove");
      toast.success(`Removed ${name} from friends`);
      fetchFriends();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleJoinFriendGame = (roomCode) => {
    const username = userInfo.firstName;
    window.location.href = `${PLAY_APP_URL}/online/entry?action=join&roomCode=${roomCode}&username=${encodeURIComponent(username)}`;
  };

  if (!userInfo) return null;

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 py-8 sm:py-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-3xl mx-auto px-4">
            <button
              onClick={() => navigate("/play-online")}
              className="flex items-center gap-2 text-purple-100 hover:text-white mb-4 sm:mb-6 transition-colors"
            >
              <FaArrowLeft />
              <span>Back to Lobby</span>
            </button>
            <div className="text-center">
              <div className="mb-3">
                <span className="text-4xl sm:text-5xl">👥</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                Friends
              </h1>
              <p className="text-sm sm:text-lg text-purple-100 max-w-xl mx-auto">
                Connect with players, see who's online, and join their games
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("friends")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2 ${
                tab === "friends"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              <FaUserFriends className="text-xs" />
              Friends ({friends.length})
            </button>
            <button
              onClick={() => {
                setTab("requests");
                fetchRequests();
              }}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm relative flex items-center justify-center gap-2 ${
                tab === "requests"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              <FaEnvelope className="text-xs" />
              Requests
              {requests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {requests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("search")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2 ${
                tab === "search"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              <FaSearch className="text-xs" />
              Search
            </button>
          </div>

          {/* Friends List */}
          {tab === "friends" && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading friends...</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                  <div className="text-4xl mb-4">👋</div>
                  <p className="text-gray-800 text-lg font-semibold mb-2">
                    No friends yet
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Search for players to add them as friends!
                  </p>
                  <button
                    onClick={() => setTab("search")}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-2.5 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg"
                  >
                    Find Friends
                  </button>
                </div>
              ) : (
                friends.map((friend) => {
                  const p = friendsPresence[friend._id] || {
                    status: "offline",
                    roomCode: null,
                    roomVisibility: null,
                  };
                  const presenceInfo = PRESENCE_LABELS[p.status] || PRESENCE_LABELS.offline;
                  const canShowJoin =
                    p.status === "in_lobby" &&
                    p.roomCode &&
                    (p.roomVisibility || "public") !== "private";
                  return (
                    <div
                      key={friend.friendshipId}
                      className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => navigate(`/profile/${friend._id}`)}
                        >
                          <div className="relative">
                            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold group-hover:ring-2 group-hover:ring-purple-300 transition-all">
                              {friend.firstName[0]}
                            </div>
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${presenceInfo.color} rounded-full border-2 border-white`}
                            ></div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-800 font-semibold group-hover:text-purple-600 transition-colors">
                                {friend.firstName} {friend.lastName}
                              </p>
                              {friend.level && (
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                  Lv.{friend.level}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs">
                              {presenceInfo.text}
                              {p.status === "in_lobby" && p.roomVisibility === "private" && (
                                <span className="ml-1 text-red-400">🔒</span>
                              )}
                              {p.status === "in_lobby" && p.roomVisibility === "friends" && (
                                <span className="ml-1 text-yellow-500">👥</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canShowJoin && (
                            <button
                              onClick={() => handleJoinFriendGame(p.roomCode)}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-md"
                            >
                              Join Game
                            </button>
                          )}
                          {p.status === "in_lobby" && p.roomVisibility === "private" && (
                            <span className="text-gray-400 text-xs">Invite only</span>
                          )}
                          <button
                            onClick={() =>
                              handleRemoveFriend(
                                friend.friendshipId,
                                friend.firstName
                              )
                            }
                            className="text-red-400 hover:text-red-500 text-xs transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Friend Requests */}
          {tab === "requests" && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-gray-800 text-lg font-semibold">
                    No pending requests
                  </p>
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req._id}
                    className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => navigate(`/profile/${req.requester._id}`)}
                      >
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold group-hover:ring-2 group-hover:ring-purple-300 transition-all">
                          {req.requester.firstName[0]}
                        </div>
                        <div>
                          <p className="text-gray-800 font-semibold group-hover:text-purple-600 transition-colors">
                            {req.requester.firstName} {req.requester.lastName}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {req.requester.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(req._id)}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-md"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(req._id)}
                          className="bg-white text-red-500 text-sm font-bold px-4 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Search */}
          {tab === "search" && (
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name or email..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || searchQuery.trim().length < 2}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2.5 rounded-xl hover:from-purple-500 hover:to-pink-500 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg"
                >
                  {searching ? "..." : "Search"}
                </button>
              </div>

              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div
                    key={result._id}
                    className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => navigate(`/profile/${result._id}`)}
                      >
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold group-hover:ring-2 group-hover:ring-purple-300 transition-all">
                          {result.firstName[0]}
                        </div>
                        <div>
                          <p className="text-gray-800 font-semibold group-hover:text-purple-600 transition-colors">
                            {result.firstName} {result.lastName}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {result.email}
                          </p>
                        </div>
                      </div>
                      {result.friendship ? (
                        result.friendship.status === "accepted" ? (
                          <span className="text-purple-600 text-sm font-semibold">
                            Friends ✓
                          </span>
                        ) : result.friendship.status === "pending" ? (
                          result.friendship.isRequester ? (
                            <span className="text-gray-400 text-sm">
                              Request Sent
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(result._id)}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-md"
                            >
                              Accept
                            </button>
                          )
                        ) : null
                      ) : (
                        <button
                          onClick={() => handleSendRequest(result._id)}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-md"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default FriendsPage;
