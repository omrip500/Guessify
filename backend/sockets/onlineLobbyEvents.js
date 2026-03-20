import rooms from "./roomStore.js";
import Game from "../models/Game.js";
import Friendship from "../models/Friendship.js";
import { generateRoomCode } from "../utils/generateRoomCode.js";
import { setPresence } from "./presenceEvents.js";
import { processGameResults } from "../services/statsService.js";

const availableEmojis = [
  "🐶", "🦊", "🐼", "🐵", "🐱", "🦁", "🐸", "🐻", "🦄", "🐯",
];

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const AUTO_START_COUNTDOWN = 10; // seconds

export function handleOnlineLobbyEvents(io, socket) {
  // Get list of online games visible to this user (public + friends-only if friends with creator)
  socket.on("getOnlineRooms", async () => {
    const userId = socket.handshake.auth?.userId;
    const visibleRooms = await getVisibleRoomsForUser(userId);
    socket.emit("onlineRoomsList", visibleRooms);
  });

  // Create an online game room from a public game
  socket.on("createOnlineRoom", async ({ gameId, username, visibility }) => {
    try {
      const game = await Game.findById(gameId);
      if (!game) {
        socket.emit("onlineError", "Game not found");
        return;
      }

      if (!game.songs || game.songs.length === 0) {
        socket.emit("onlineError", "Game has no songs");
        return;
      }

      // Validate visibility
      const roomVisibility = ["public", "friends", "private"].includes(visibility)
        ? visibility
        : "public";

      const roomCode = generateRoomCode();
      const assignedEmoji = availableEmojis[0];
      const creatorUserId = socket.handshake.auth?.userId || null;

      const creator = {
        socketId: socket.id,
        username,
        emoji: assignedEmoji,
        status: "connected",
        isCreator: true,
        userId: creatorUserId,
      };

      rooms.set(roomCode, {
        isOnline: true,
        creatorSocketId: socket.id,
        creatorUsername: username,
        creatorUserId,
        hostSocketId: null, // no host in online mode - server controls
        gameId: game._id.toString(),
        game,
        players: [creator],
        currentSongIndex: 0,
        currentRound: 0,
        currentAudioDuration: 1000,
        scores: {},
        playerAnswerTimes: {},
        playerAnswers: {},
        status: "waiting",
        visibility: roomVisibility,
        invitedUserIds: new Set(),
        minPlayers: MIN_PLAYERS,
        maxPlayers: MAX_PLAYERS,
        autoStartTimer: null,
        autoStartCountdown: null,
      });

      socket.join(roomCode);

      socket.emit("onlineRoomCreated", {
        roomCode,
        emoji: assignedEmoji,
        gameTitle: game.title,
        gameDescription: game.description,
        guessTimeLimit: game.guessTimeLimit,
        guessInputMethod: game.guessInputMethod,
        songCount: game.songs.length,
        visibility: roomVisibility,
      });

      // Broadcast updated lobby to all
      broadcastLobbyUpdate(io);

      // Update presence
      const userId = socket.handshake.auth?.userId;
      if (userId) setPresence(io, userId, "in_lobby", roomCode);

      console.log(`🌐 Online room ${roomCode} created by ${username} for game "${game.title}"`);
    } catch (err) {
      console.error("❌ Error creating online room:", err);
      socket.emit("onlineError", "Failed to create room");
    }
  });

  // Join an existing online room
  socket.on("joinOnlineRoom", async ({ roomCode, username }) => {
    const room = rooms.get(roomCode);
    if (!room || !room.isOnline) {
      socket.emit("onlineError", "Online room not found");
      return;
    }

    if (room.status === "playing") {
      socket.emit("onlineError", "Game already in progress");
      return;
    }

    const connectedPlayers = room.players.filter((p) => p.status !== "disconnected");
    if (connectedPlayers.length >= MAX_PLAYERS) {
      socket.emit("onlineError", "Room is full");
      return;
    }

    // --- Access control based on room visibility ---
    const joinerUserId = socket.handshake.auth?.userId;
    const roomVis = room.visibility || "public";

    if (roomVis === "friends" && joinerUserId !== room.creatorUserId) {
      // Check if joiner is friends with creator
      const isFriend = await checkFriendship(joinerUserId, room.creatorUserId);
      if (!isFriend) {
        socket.emit("onlineError", "This room is friends-only. You must be friends with the host to join.");
        return;
      }
    }

    if (roomVis === "private" && joinerUserId !== room.creatorUserId) {
      // Check if joiner was explicitly invited
      if (!room.invitedUserIds || !room.invitedUserIds.has(joinerUserId)) {
        socket.emit("onlineError", "This is a private room. You need an invite to join.");
        return;
      }
    }

    // Check if username already taken
    const existingPlayer = room.players.find((p) => p.username === username);
    if (existingPlayer) {
      if (existingPlayer.status === "disconnected") {
        // Reconnect
        existingPlayer.socketId = socket.id;
        existingPlayer.status = "connected";
        socket.join(roomCode);
        socket.emit("onlineRoomJoined", {
          roomCode,
          emoji: existingPlayer.emoji,
          gameTitle: room.game.title,
          gameDescription: room.game.description,
          guessTimeLimit: room.game.guessTimeLimit,
          guessInputMethod: room.game.guessInputMethod,
          songCount: room.game.songs.length,
          players: getConnectedPlayersList(room),
        });
        io.to(roomCode).emit("onlinePlayerUpdate", {
          players: getConnectedPlayersList(room),
        });
        broadcastLobbyUpdate(io);
        return;
      }
      socket.emit("onlineError", "Username already taken in this room");
      return;
    }

    const assignedEmoji = availableEmojis[room.players.length % availableEmojis.length];
    const newPlayer = {
      socketId: socket.id,
      username,
      emoji: assignedEmoji,
      status: "connected",
      isCreator: false,
      userId: joinerUserId,
    };
    room.players.push(newPlayer);

    socket.join(roomCode);

    socket.emit("onlineRoomJoined", {
      roomCode,
      emoji: assignedEmoji,
      gameTitle: room.game.title,
      gameDescription: room.game.description,
      guessTimeLimit: room.game.guessTimeLimit,
      guessInputMethod: room.game.guessInputMethod,
      songCount: room.game.songs.length,
      players: getConnectedPlayersList(room),
    });

    // Notify all players in the room
    io.to(roomCode).emit("onlinePlayerUpdate", {
      players: getConnectedPlayersList(room),
    });

    // Update presence
    const userId = socket.handshake.auth?.userId;
    if (userId) setPresence(io, userId, "in_lobby", roomCode);

    console.log(`🌐 ${username} joined online room ${roomCode} (${connectedPlayers.length + 1} players)`);

    broadcastLobbyUpdate(io);
  });

  // Player manually starts the online game (creator only)
  socket.on("startOnlineGame", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || !room.isOnline) return;

    if (room.creatorSocketId !== socket.id) {
      socket.emit("onlineError", "Only the room creator can start the game");
      return;
    }

    // Cancel auto-start if running
    cancelAutoStart(room);

    startOnlineGame(io, roomCode);
  });

  // Leave an online room
  socket.on("leaveOnlineRoom", ({ roomCode }) => {
    handleOnlinePlayerLeave(io, socket, roomCode);
  });
}

function getConnectedPlayersList(room) {
  return room.players
    .filter((p) => p.status !== "disconnected")
    .map((p) => ({
      username: p.username,
      emoji: p.emoji,
      isCreator: p.isCreator || false,
    }));
}

function startAutoStartCountdown(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== "waiting") return;

  let countdown = AUTO_START_COUNTDOWN;

  console.log(`🌐 Auto-start countdown started for room ${roomCode} (${countdown}s)`);

  io.to(roomCode).emit("onlineAutoStartCountdown", { seconds: countdown });

  room.autoStartCountdown = countdown;
  room.autoStartTimer = setInterval(() => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || currentRoom.status !== "waiting") {
      cancelAutoStart(currentRoom);
      return;
    }

    countdown--;
    currentRoom.autoStartCountdown = countdown;
    io.to(roomCode).emit("onlineAutoStartCountdown", { seconds: countdown });

    if (countdown <= 0) {
      cancelAutoStart(currentRoom);
      startOnlineGame(io, roomCode);
    }
  }, 1000);
}

function cancelAutoStart(room) {
  if (room && room.autoStartTimer) {
    clearInterval(room.autoStartTimer);
    room.autoStartTimer = null;
    room.autoStartCountdown = null;
  }
}

export function startOnlineGame(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.status === "playing") return;

  console.log(`🌐 Starting online game in room ${roomCode}`);

  room.status = "playing";
  room.currentSongIndex = 0;
  room.currentRound = 0;
  room.songs = room.game.songs;

  // Initialize scores
  room.scores = {};
  room.originalPlayers = [];
  room.players.forEach((player) => {
    if (player.status !== "disconnected") {
      room.scores[player.username] = 0;
      room.originalPlayers.push(player.username);
    }
  });

  room.currentTimeout = null;
  room.allPlayerAnswers = {}; // Accumulate per-song answers for stats

  // Update presence for all players to in_game
  room.players.forEach((player) => {
    if (player.status !== "disconnected") {
      const pSocket = io.sockets.sockets.get(player.socketId);
      const pUserId = pSocket?.handshake?.auth?.userId;
      if (pUserId) setPresence(io, pUserId, "in_game", roomCode);
    }
  });

  io.to(roomCode).emit("onlineGameStarting", {
    totalSongs: room.songs.length,
    guessTimeLimit: room.game.guessTimeLimit,
    guessInputMethod: room.game.guessInputMethod,
  });

  broadcastLobbyUpdate(io);

  // Start the first round after a short delay
  setTimeout(() => {
    startOnlineRound(io, roomCode);
  }, 2000);
}

// Exported for use by gameEvents when online mode detected
export function startOnlineRound(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.isOnline) return;

  const ROUND_DURATIONS = [1000, 2000, 3000, 4000, 5000];

  const currentSong = room.songs[room.currentSongIndex];
  const round = room.currentRound;

  if (round >= ROUND_DURATIONS.length) {
    // All rounds used for this song - emit failure and auto-advance
    io.to(roomCode).emit("roundFailed", {
      songNumber: room.currentSongIndex + 1,
      totalSongs: room.songs.length,
      allRoundsUsed: true,
      songTitle: currentSong.correctAnswer,
      songPreviewUrl: currentSong.previewUrl,
      songArtist: currentSong.artist,
      songArtworkUrl: currentSong.artworkUrl,
    });

    // Auto-advance to next song after showing results
    scheduleNextSong(io, roomCode);
    return;
  }

  const duration = ROUND_DURATIONS[round];

  room.currentRound++;
  room.correctUsers = new Set();
  room.guessedUsers = new Set();
  room.playerAnswerTimes = {};
  room.playerAnswers = {};
  if (room.currentTimeout) clearTimeout(room.currentTimeout);

  const audioUrl = currentSong.previewUrl || currentSong.audioUrl;

  console.log(`🌐 Online round ${round + 1} for song ${room.currentSongIndex + 1} - duration: ${duration}ms`);

  io.to(roomCode).emit("nextRound", {
    audioUrl,
    duration,
    startTime: 0,
    roundNumber: round + 1,
    songNumber: room.currentSongIndex + 1,
    totalSongs: room.songs.length,
    currentSong: {
      title: currentSong.title,
      artist: currentSong.artist,
      correctAnswer: currentSong.correctAnswer,
    },
    isOnline: true, // Signal to client this is server-controlled
  });

  // In online mode, server manages the timer based on audio duration
  // Start the guess timer after audio duration + buffer
  room.currentTimeout = setTimeout(() => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || currentRoom.status !== "playing") return;

    const timerDeadline = Date.now() + currentRoom.game.guessTimeLimit * 1000;
    currentRoom.roundStartTime = Date.now();
    currentRoom.roundDeadline = timerDeadline;

    io.to(roomCode).emit("timerStarted", {
      roundDeadline: timerDeadline,
      guessTimeLimit: currentRoom.game.guessTimeLimit,
    });

    // Set timeout for when timer expires
    currentRoom.currentTimeout = setTimeout(() => {
      onlineFinishRound(io, roomCode);
    }, currentRoom.game.guessTimeLimit * 1000);
  }, duration + 500); // audio duration + 500ms buffer
}

export function onlineFinishRound(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.isOnline) return;

  // Import and reuse the same finishRound logic
  const currentSong = room.songs[room.currentSongIndex];

  const playerEmojiMap = {};
  room.players.forEach((player) => {
    playerEmojiMap[player.username] = player.emoji;
  });

  const playerAnswersSummary = {};
  if (room.playerAnswers) {
    const { getAnswerTypeMessage } = await_import_answer_matching();
    Object.entries(room.playerAnswers).forEach(([username, answerData]) => {
      playerAnswersSummary[username] = {
        answer: answerData.answer,
        answerType: answerData.result.type,
        answerTypeMessage: answerData.result.type,
        score: answerData.result.score,
        isCorrect: answerData.result.isCorrect,
        matchedText: answerData.result.matchedText,
      };
    });
  }

  // Accumulate answers for end-of-game stats (per song, best attempt per player)
  if (room.allPlayerAnswers) {
    const songKey = `song_${room.currentSongIndex}`;
    Object.entries(playerAnswersSummary).forEach(([username, data]) => {
      if (!room.allPlayerAnswers[username]) room.allPlayerAnswers[username] = {};
      // Keep the best answer per song (correct > incorrect, higher score wins)
      const existing = room.allPlayerAnswers[username][songKey];
      if (!existing || (!existing.isCorrect && data.isCorrect) || (data.score > (existing.score || 0))) {
        room.allPlayerAnswers[username][songKey] = data;
      }
    });
  }

  if (room.correctUsers.size === 0) {
    // Nobody got it right - in online mode, auto-replay with longer snippet
    if (room.currentRound < 5) {
      io.to(roomCode).emit("roundFailed", {
        songNumber: room.currentSongIndex + 1,
        totalSongs: room.songs.length,
        allRoundsUsed: false,
        songTitle: currentSong.correctAnswer,
        songPreviewUrl: currentSong.previewUrl,
        songArtist: currentSong.artist,
        songArtworkUrl: currentSong.artworkUrl,
        playerAnswers: playerAnswersSummary,
      });

      // Auto-replay with longer snippet after brief delay
      room.currentTimeout = setTimeout(() => {
        startOnlineRound(io, roomCode);
      }, 4000);
    } else {
      io.to(roomCode).emit("roundFailed", {
        songNumber: room.currentSongIndex + 1,
        totalSongs: room.songs.length,
        allRoundsUsed: true,
        songTitle: currentSong.correctAnswer,
        songPreviewUrl: currentSong.previewUrl,
        songArtist: currentSong.artist,
        songArtworkUrl: currentSong.artworkUrl,
        playerAnswers: playerAnswersSummary,
      });

      scheduleNextSong(io, roomCode);
    }
  } else {
    io.to(roomCode).emit("roundSucceeded", {
      scores: room.scores,
      playerEmojis: playerEmojiMap,
      songTitle: currentSong.correctAnswer,
      songPreviewUrl: currentSong.previewUrl,
      songArtist: currentSong.artist,
      songArtworkUrl: currentSong.artworkUrl,
      playerAnswers: playerAnswersSummary,
    });

    scheduleNextSong(io, roomCode);
  }
}

// Helper to lazily reference getAnswerTypeMessage without circular import issues
function await_import_answer_matching() {
  try {
    // We only use the type string directly, avoiding circular deps
    return {
      getAnswerTypeMessage: (result) => result.type,
    };
  } catch {
    return { getAnswerTypeMessage: (result) => result.type };
  }
}

function scheduleNextSong(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Clear any existing timeout
  if (room.currentTimeout) clearTimeout(room.currentTimeout);

  room.currentTimeout = setTimeout(async () => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom) return;

    currentRoom.currentSongIndex++;
    currentRoom.currentRound = 0;

    if (currentRoom.currentSongIndex < currentRoom.songs.length) {
      startOnlineRound(io, roomCode);
    } else {
      // Game over
      const playerEmojiMap = {};
      const playerUserIdMap = {};
      currentRoom.players.forEach((player) => {
        playerEmojiMap[player.username] = player.emoji;
        if (player.userId) playerUserIdMap[player.username] = player.userId;
      });

      const topScores = Object.entries(currentRoom.scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([username, score], index) => ({
          place: index + 1,
          username,
          score,
          emoji: playerEmojiMap[username] || "🎮",
          userId: playerUserIdMap[username] || null,
        }));

      // Persist stats for authenticated players
      let statsResults = {};
      try {
        statsResults = await processGameResults({
          leaderboard: topScores,
          allPlayerAnswers: currentRoom.allPlayerAnswers || {},
          totalSongs: currentRoom.songs.length,
          gameTitle: currentRoom.game?.title || "Untitled Game",
        });
      } catch (err) {
        console.error("❌ Error processing game stats:", err);
      }

      io.to(roomCode).emit("gameOver", {
        leaderboard: topScores,
        statsResults, // Per-userId XP/level data for post-game screen
      });

      console.log(`🌐 Online game over in room ${roomCode}`);
      rooms.delete(roomCode);
      broadcastLobbyUpdate(io);
    }
  }, 6000); // 6 seconds to show results before next song
}

export function handleOnlinePlayerLeave(io, socket, roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.isOnline) return;

  const player = room.players.find((p) => p.socketId === socket.id);
  if (!player) return;

  // Update presence back to online
  const leaveUserId = socket.handshake.auth?.userId;
  if (leaveUserId) setPresence(io, leaveUserId, "online", null);

  console.log(`🌐 Player ${player.username} leaving online room ${roomCode}`);

  if (room.status === "waiting") {
    // Remove player from waiting room
    room.players = room.players.filter((p) => p.socketId !== socket.id);
    socket.leave(roomCode);

    // If no players left, delete room
    if (room.players.length === 0) {
      cancelAutoStart(room);
      rooms.delete(roomCode);
    } else {
      // If creator left, assign new creator
      if (player.isCreator && room.players.length > 0) {
        room.players[0].isCreator = true;
        room.creatorSocketId = room.players[0].socketId;
        room.creatorUsername = room.players[0].username;
      }

      // Cancel auto-start if below minimum
      const connectedCount = room.players.filter((p) => p.status !== "disconnected").length;
      if (connectedCount < MIN_PLAYERS) {
        cancelAutoStart(room);
        io.to(roomCode).emit("onlineAutoStartCancelled");
      }

      io.to(roomCode).emit("onlinePlayerUpdate", {
        players: getConnectedPlayersList(room),
      });
    }
  } else if (room.status === "playing") {
    // Mark as disconnected during game (don't pause in online mode)
    player.status = "disconnected";
    socket.leave(roomCode);

    // Mark them as guessed so they don't block the round
    if (room.guessedUsers) {
      room.guessedUsers.add(player.username);
    }

    io.to(roomCode).emit("onlinePlayerUpdate", {
      players: getConnectedPlayersList(room),
    });

    // Check if all remaining players answered
    const connectedPlayers = room.players.filter((p) => p.status !== "disconnected");
    if (connectedPlayers.length === 0) {
      // Everyone left - clean up
      if (room.currentTimeout) clearTimeout(room.currentTimeout);
      rooms.delete(roomCode);
      broadcastLobbyUpdate(io);
      return;
    }

    if (room.guessedUsers && room.guessedUsers.size >= connectedPlayers.length) {
      // All remaining players have answered, finish round
      if (room.currentTimeout) clearTimeout(room.currentTimeout);
      onlineFinishRound(io, roomCode);
    }
  }

  broadcastLobbyUpdate(io);
}

/**
 * Signal all connected clients to re-fetch their personalized room list.
 * We can't broadcast a single list because each user sees different rooms
 * based on friendship (friends-only rooms are only visible to friends).
 */
export function broadcastLobbyUpdate(io) {
  io.emit("onlineLobbyChanged");
}

// Build the personalized room list for a specific user
async function getVisibleRoomsForUser(userId) {
  // Load this user's friend IDs once for the whole listing
  let friendIds = new Set();
  if (userId) {
    try {
      const friendships = await Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: "accepted",
      }).select("requester recipient");
      for (const f of friendships) {
        const friendId =
          f.requester.toString() === userId.toString()
            ? f.recipient.toString()
            : f.requester.toString();
        friendIds.add(friendId);
      }
    } catch (err) {
      console.error("Error loading friends for lobby:", err);
    }
  }

  const visibleRooms = [];
  for (const [code, room] of rooms.entries()) {
    if (!room.isOnline) continue;
    const vis = room.visibility || "public";

    let visible = false;
    if (vis === "public") {
      visible = true;
    } else if (vis === "friends" && userId) {
      // Visible if user is the creator or friends with the creator
      visible =
        room.creatorUserId === userId.toString() ||
        friendIds.has(room.creatorUserId);
    }
    // Private rooms are never listed (join by code/invite only)

    if (visible) {
      visibleRooms.push({
        roomCode: code,
        title: room.game?.title || "Untitled Game",
        playerCount: room.players.filter((p) => p.status !== "disconnected")
          .length,
        maxPlayers: MAX_PLAYERS,
        status: room.status,
        songCount: room.game?.songs?.length || 0,
        guessTimeLimit: room.game?.guessTimeLimit || 15,
        creatorUsername: room.creatorUsername || "Anonymous",
        visibility: vis,
      });
    }
  }
  return visibleRooms;
}

// Helper to check if two users are friends
async function checkFriendship(userId1, userId2) {
  if (!userId1 || !userId2) return false;
  try {
    const friendship = await Friendship.findOne({
      $or: [
        { requester: userId1, recipient: userId2 },
        { requester: userId2, recipient: userId1 },
      ],
      status: "accepted",
    });
    return !!friendship;
  } catch (err) {
    console.error("Error checking friendship:", err);
    return false;
  }
}

// Helper to get room visibility info for a specific room
export function getRoomVisibility(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.isOnline) return null;
  return {
    visibility: room.visibility || "public",
    creatorUserId: room.creatorUserId,
    invitedUserIds: room.invitedUserIds ? [...room.invitedUserIds] : [],
  };
}
