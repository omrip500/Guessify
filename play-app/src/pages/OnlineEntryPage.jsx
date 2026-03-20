import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../socket";

/**
 * OnlineEntryPage - Thin entry point for cross-app game join/create.
 *
 * The authenticated hub (create-app) redirects here when a user wants to
 * join or create an online game room. This page handles the socket
 * operations and then navigates to the actual game page.
 *
 * URL params:
 *   action=join&roomCode=X&username=Y
 *   action=create&gameId=X&username=Y&visibility=public|friends|private
 */
const OnlineEntryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const hasActed = useRef(false);

  const action = searchParams.get("action"); // "join" or "create"
  const roomCode = searchParams.get("roomCode");
  const gameId = searchParams.get("gameId");
  const username = searchParams.get("username") || user?.firstName || "Player";
  const visibility = searchParams.get("visibility") || "public";

  // Always register socket listeners (survives React strict mode re-mounts)
  useEffect(() => {
    if (authLoading || !user) return;

    const socket = getSocket({ userId: user._id });

    const handleError = (msg) => {
      setError(msg);
      setStatus("error");
    };

    const handleRoomJoined = (data) => {
      navigate(`/online/game/${data.roomCode}`, {
        replace: true,
        state: {
          username,
          roomCode: data.roomCode,
          emoji: data.emoji,
          gameTitle: data.gameTitle,
          guessTimeLimit: data.guessTimeLimit,
          guessInputMethod: data.guessInputMethod,
          songCount: data.songCount,
          players: data.players,
          isCreator: false,
        },
      });
    };

    const handleRoomCreated = (data) => {
      navigate(`/online/game/${data.roomCode}`, {
        replace: true,
        state: {
          username,
          roomCode: data.roomCode,
          emoji: data.emoji,
          gameTitle: data.gameTitle,
          guessTimeLimit: data.guessTimeLimit,
          guessInputMethod: data.guessInputMethod,
          songCount: data.songCount,
          isCreator: true,
          visibility: data.visibility || "public",
        },
      });
    };

    socket.on("onlineRoomJoined", handleRoomJoined);
    socket.on("onlineRoomCreated", handleRoomCreated);
    socket.on("onlineError", handleError);

    return () => {
      socket.off("onlineRoomJoined", handleRoomJoined);
      socket.off("onlineRoomCreated", handleRoomCreated);
      socket.off("onlineError", handleError);
    };
  }, [user, authLoading, username, navigate]);

  // Emit the socket event exactly once
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("You must be logged in to play online.");
      return;
    }
    if (!action || (action === "join" && !roomCode) || (action === "create" && !gameId)) {
      setError("Invalid entry parameters.");
      return;
    }
    if (hasActed.current) return;
    hasActed.current = true;

    const socket = getSocket({ userId: user._id });

    setStatus("joining");

    if (action === "join") {
      socket.emit("joinOnlineRoom", { roomCode, username });
    } else if (action === "create") {
      socket.emit("createOnlineRoom", { gameId, username, visibility });
    }
  }, [user, authLoading, action, roomCode, gameId, username, visibility]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center px-4">
      <div className="text-center">
        {error ? (
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20 max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white text-lg font-semibold mb-2">
              Could not {action === "create" ? "start game" : "join game"}
            </p>
            <p className="text-purple-200 text-sm mb-6">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-2 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg font-semibold">
              {status === "connecting" ? "Connecting..." : action === "create" ? "Starting game..." : "Joining game..."}
            </p>
            <p className="text-purple-200 text-sm mt-2">
              Please wait a moment
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default OnlineEntryPage;
