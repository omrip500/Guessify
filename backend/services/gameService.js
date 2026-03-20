import Game from "../models/Game.js";
import { normalizeArtistName } from "../utils/artistNormalization.js";
import { cleanSongTitle, normalizeSongTitle } from "../utils/songNormalization.js";

/**
 * Reusable game business logic, extracted from gameController.
 * Used by both REST controllers and the AI assistant tools.
 */

// Validate and normalize a song object for storage
function normalizeSong(song) {
  const cleanedTitle = normalizeSongTitle(cleanSongTitle(song.title)) || "Unknown Title";
  return {
    title: cleanedTitle,
    correctAnswer: song.correctAnswer || cleanedTitle,
    correctAnswers: song.correctAnswers || [
      song.correctAnswer || cleanedTitle,
    ],
    artist: normalizeArtistName(song.artist) || "Unknown Artist",
    previewUrl: song.previewUrl || "",
    artworkUrl: song.artworkUrl || "",
    trackId: song.trackId || "",
  };
}

// Process an array of raw songs into validated song objects
export async function processSongs(songs) {
  return songs.map((song) => normalizeSong(song));
}

// Validate guess time limit
export function validateGuessTimeLimit(value, fallback = 15) {
  return [15, 30, 45, 60].includes(value) ? value : fallback;
}

// Validate guess input method
export function validateGuessInputMethod(value, fallback = "freeText") {
  return ["freeText", "letterClick"].includes(value) ? value : fallback;
}

// ─── CRUD Operations ───

export async function listGamesForUser(userId) {
  return Game.find({ createdBy: userId }).select(
    "title description isPublic songs guessTimeLimit guessInputMethod createdAt updatedAt"
  );
}

export async function getGameById(userId, gameId) {
  const game = await Game.findById(gameId);
  if (!game) throw Object.assign(new Error("Game not found"), { status: 404 });
  if (game.createdBy.toString() !== userId.toString()) {
    throw Object.assign(new Error("Not authorized to access this game"), {
      status: 403,
    });
  }
  return game;
}

export async function createGame(userId, { title, description, isPublic, songs, guessTimeLimit, guessInputMethod }) {
  if (!title || !songs || songs.length === 0) {
    throw Object.assign(
      new Error("Please provide a title and at least one song."),
      { status: 400 }
    );
  }

  const validatedSongs = await processSongs(songs);

  const game = new Game({
    title,
    description: description || "",
    songs: validatedSongs,
    isPublic: isPublic ?? false,
    guessTimeLimit: validateGuessTimeLimit(guessTimeLimit),
    guessInputMethod: validateGuessInputMethod(guessInputMethod),
    createdBy: userId,
  });

  return game.save();
}

export async function renameGame(userId, gameId, newTitle) {
  const game = await getGameById(userId, gameId);
  game.title = newTitle;
  return game.save();
}

export async function updateGameSettings(userId, gameId, settings) {
  const game = await getGameById(userId, gameId);

  if (settings.title !== undefined) game.title = settings.title;
  if (settings.description !== undefined) game.description = settings.description;
  if (settings.isPublic !== undefined) game.isPublic = settings.isPublic;
  if (settings.guessTimeLimit !== undefined) {
    game.guessTimeLimit = validateGuessTimeLimit(
      settings.guessTimeLimit,
      game.guessTimeLimit
    );
  }
  if (settings.guessInputMethod !== undefined) {
    game.guessInputMethod = validateGuessInputMethod(
      settings.guessInputMethod,
      game.guessInputMethod
    );
  }

  return game.save();
}

export async function addSongsToGame(userId, gameId, newSongs) {
  const game = await getGameById(userId, gameId);
  const validatedSongs = await processSongs(newSongs);
  game.songs.push(...validatedSongs);
  return game.save();
}

export async function removeSongFromGame(userId, gameId, trackIdOrTitle) {
  const game = await getGameById(userId, gameId);

  const initialLength = game.songs.length;
  game.songs = game.songs.filter((song) => {
    if (song.trackId && song.trackId === trackIdOrTitle) return false;
    if (song.title.toLowerCase() === trackIdOrTitle.toLowerCase()) return false;
    return true;
  });

  if (game.songs.length === initialLength) {
    throw Object.assign(new Error("Song not found in game"), { status: 404 });
  }

  return game.save();
}

export async function deleteGame(userId, gameId) {
  const game = await getGameById(userId, gameId);
  await Game.findByIdAndDelete(game._id);
  return { message: "Game deleted successfully" };
}

// Search songs via iTunes API
export async function searchSongsFromiTunes(term) {
  if (!term) throw Object.assign(new Error("Search term is required"), { status: 400 });

  const iTunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
    term
  )}&entity=song&limit=10&media=music`;

  const response = await fetch(iTunesUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MusicGameApp/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`iTunes API returned ${response.status}`);
  }

  const data = await response.json();
  return data.results.map((r) => ({
    trackId: String(r.trackId),
    title: normalizeSongTitle(cleanSongTitle(r.trackName)),
    artist: normalizeArtistName(r.artistName),
    previewUrl: r.previewUrl || "",
    artworkUrl: r.artworkUrl100 || r.artworkUrl60 || "",
  }));
}
