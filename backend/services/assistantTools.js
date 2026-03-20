import * as gameService from "./gameService.js";
import { normalizeArtistName } from "../utils/artistNormalization.js";
import {
  isHebrewContent,
  containsHebrew,
  deriveGameDescription,
} from "../utils/songNormalization.js";

/**
 * Tool definitions for OpenAI function calling.
 * Each tool maps to a safe, validated backend operation.
 */

// ─── Tool Schemas (OpenAI function calling format) ───

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "listMyGames",
      description:
        "List all games created by the current user. Returns game titles, song counts, settings, and IDs.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "getGameDetails",
      description:
        "Get full details of a specific game including all songs, settings, and metadata.",
      parameters: {
        type: "object",
        properties: {
          gameId: {
            type: "string",
            description: "The MongoDB ID of the game to retrieve",
          },
        },
        required: ["gameId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchSongs",
      description:
        "Search for real songs using iTunes API. Returns song title, artist, preview URL, artwork, and trackId. Use this to find real songs before adding them to a game.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query - can be song name, artist name, or keywords like 'hebrew pop' or 'Israeli songs'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createGame",
      description:
        "Create a new music guessing game. Songs MUST come from searchSongs results. All settings have sensible defaults — only provide values the user explicitly requested. If title is omitted, the system auto-generates one from the songs.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              "Game title. Infer from the request context (artist name, theme, etc.). If unsure, omit and the system will auto-generate.",
          },
          description: { type: "string", description: "Game description. If omitted, auto-generated from the title and songs." },
          isPublic: {
            type: "boolean",
            description: "Whether the game is public (default: true)",
          },
          guessTimeLimit: {
            type: "number",
            enum: [15, 30, 45, 60],
            description: "Seconds allowed per guess (default: 30)",
          },
          guessInputMethod: {
            type: "string",
            enum: ["freeText", "letterClick"],
            description: "How players input guesses (default: freeText)",
          },
          songs: {
            type: "array",
            description:
              "Array of songs from searchSongs results. Each must have title and artist.",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                artist: { type: "string" },
                trackId: { type: "string" },
                previewUrl: { type: "string" },
                artworkUrl: { type: "string" },
              },
              required: ["title", "artist"],
            },
          },
        },
        required: ["songs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "renameGame",
      description: "Rename an existing game.",
      parameters: {
        type: "object",
        properties: {
          gameId: { type: "string", description: "The game ID to rename" },
          newTitle: { type: "string", description: "The new title for the game" },
        },
        required: ["gameId", "newTitle"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateGameSettings",
      description:
        "Update game settings like visibility, guess time limit, guess input method, or description.",
      parameters: {
        type: "object",
        properties: {
          gameId: { type: "string", description: "The game ID to update" },
          isPublic: { type: "boolean", description: "Whether the game is public" },
          guessTimeLimit: {
            type: "number",
            enum: [15, 30, 45, 60],
            description: "Seconds allowed per guess",
          },
          guessInputMethod: {
            type: "string",
            enum: ["freeText", "letterClick"],
            description: "How players input guesses",
          },
          description: { type: "string", description: "Game description" },
        },
        required: ["gameId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addSongsToGame",
      description:
        "Add songs to an existing game. Songs MUST come from searchSongs results with real data.",
      parameters: {
        type: "object",
        properties: {
          gameId: { type: "string", description: "The game ID to add songs to" },
          songs: {
            type: "array",
            description: "Array of songs from searchSongs results",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                artist: { type: "string" },
                trackId: { type: "string" },
                previewUrl: { type: "string" },
                artworkUrl: { type: "string" },
              },
              required: ["title", "artist", "trackId", "previewUrl"],
            },
          },
        },
        required: ["gameId", "songs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "removeSongFromGame",
      description:
        "Remove a song from a game by its trackId or title. This is a destructive action that requires user confirmation.",
      parameters: {
        type: "object",
        properties: {
          gameId: {
            type: "string",
            description: "The game ID to remove a song from",
          },
          songIdentifier: {
            type: "string",
            description: "The trackId or exact title of the song to remove",
          },
        },
        required: ["gameId", "songIdentifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteGame",
      description:
        "Delete a game entirely. This is a destructive action that requires user confirmation.",
      parameters: {
        type: "object",
        properties: {
          gameId: {
            type: "string",
            description: "The game ID to delete",
          },
        },
        required: ["gameId"],
      },
    },
  },
];

// ─── Actions that require user confirmation before execution ───

const DESTRUCTIVE_TOOLS = new Set(["removeSongFromGame", "deleteGame"]);

export function isDestructive(toolName) {
  return DESTRUCTIVE_TOOLS.has(toolName);
}

// ─── Tool Executor ───

/**
 * Execute a tool call with the authenticated user's ID.
 * All operations go through gameService which enforces ownership checks.
 */
/**
 * @param {string} userId
 * @param {string} toolName
 * @param {object} args
 * @param {Array} searchCache - cached search results from prior searchSongs calls in this conversation turn
 */
export async function executeTool(userId, toolName, args, searchCache = []) {
  switch (toolName) {
    case "listMyGames": {
      const games = await gameService.listGamesForUser(userId);
      return games.map((g) => ({
        id: g._id,
        title: g.title,
        description: g.description,
        isPublic: g.isPublic,
        songCount: g.songs.length,
        guessTimeLimit: g.guessTimeLimit,
        guessInputMethod: g.guessInputMethod,
        createdAt: g.createdAt,
      }));
    }

    case "getGameDetails": {
      const game = await gameService.getGameById(userId, args.gameId);
      return {
        id: game._id,
        title: game.title,
        description: game.description,
        isPublic: game.isPublic,
        guessTimeLimit: game.guessTimeLimit,
        guessInputMethod: game.guessInputMethod,
        songs: game.songs.map((s) => ({
          title: s.title,
          artist: s.artist,
          trackId: s.trackId,
        })),
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
      };
    }

    case "searchSongs": {
      return gameService.searchSongsFromiTunes(args.query);
    }

    case "createGame": {
      // Auto-enrich songs from search cache if LLM only provided title/artist
      args.songs = enrichSongsFromCache(args.songs, searchCache);
      validateSongsHaveRealData(args.songs);

      // Auto-generate title if not provided; normalize LLM-provided titles for Hebrew content
      let title = args.title || deriveTitleFromSongs(args.songs);
      title = localizeGameTitle(title, args.songs);

      // Auto-generate description if not provided
      const description = args.description || deriveGameDescription(title, args.songs);

      const game = await gameService.createGame(userId, {
        title,
        description,
        isPublic: args.isPublic ?? true,
        guessTimeLimit: args.guessTimeLimit || 30,
        guessInputMethod: args.guessInputMethod || "freeText",
        songs: args.songs,
      });
      return {
        id: game._id,
        title: game.title,
        songCount: game.songs.length,
        message: `Game "${game.title}" created successfully with ${game.songs.length} songs!`,
      };
    }

    case "renameGame": {
      const game = await gameService.renameGame(userId, args.gameId, args.newTitle);
      return {
        id: game._id,
        title: game.title,
        message: `Game renamed to "${game.title}"`,
      };
    }

    case "updateGameSettings": {
      const { gameId, ...settings } = args;
      const game = await gameService.updateGameSettings(userId, gameId, settings);
      return {
        id: game._id,
        title: game.title,
        isPublic: game.isPublic,
        guessTimeLimit: game.guessTimeLimit,
        guessInputMethod: game.guessInputMethod,
        message: `Game settings updated for "${game.title}"`,
      };
    }

    case "addSongsToGame": {
      args.songs = enrichSongsFromCache(args.songs, searchCache);
      validateSongsHaveRealData(args.songs);
      const game = await gameService.addSongsToGame(userId, args.gameId, args.songs);
      return {
        id: game._id,
        title: game.title,
        songCount: game.songs.length,
        addedCount: args.songs.length,
        message: `Added ${args.songs.length} song(s) to "${game.title}". Total songs: ${game.songs.length}`,
      };
    }

    case "removeSongFromGame": {
      const game = await gameService.removeSongFromGame(
        userId,
        args.gameId,
        args.songIdentifier
      );
      return {
        id: game._id,
        title: game.title,
        songCount: game.songs.length,
        message: `Song removed from "${game.title}". Remaining songs: ${game.songs.length}`,
      };
    }

    case "deleteGame": {
      // Get game title before deleting for the confirmation message
      const game = await gameService.getGameById(userId, args.gameId);
      await gameService.deleteGame(userId, args.gameId);
      return {
        deletedGameTitle: game.title,
        message: `Game "${game.title}" has been deleted.`,
      };
    }

    default:
      throw Object.assign(new Error(`Unknown tool: ${toolName}`), {
        status: 400,
      });
  }
}

// ─── Validation Helpers ───

/**
 * Derive a game title from the songs list when no title was provided.
 * Strategy: if most songs share the same artist, use the artist name.
 * Falls back to a Hebrew or English generic title based on content.
 */
function deriveTitleFromSongs(songs) {
  if (!songs || songs.length === 0) return "Music Quiz";

  const hebrew = isHebrewContent(songs);

  // Count artist frequency
  const artistCounts = {};
  for (const song of songs) {
    const artist = (song.artist || "").trim();
    if (artist && artist !== "Unknown Artist") {
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    }
  }

  // Find the most common artist
  let topArtist = null;
  let topCount = 0;
  for (const [artist, count] of Object.entries(artistCounts)) {
    if (count > topCount) {
      topArtist = artist;
      topCount = count;
    }
  }

  // If a single artist covers majority of songs, use their name
  if (topArtist && topCount >= songs.length * 0.5) {
    return topArtist;
  }

  // If there are a few artists, create a "Mix" title
  const uniqueArtists = Object.keys(artistCounts);
  if (uniqueArtists.length <= 3 && uniqueArtists.length > 0) {
    return uniqueArtists.join(" & ");
  }

  return hebrew ? "מיקס שירים" : "Music Quiz";
}

/**
 * If the LLM provided an English title but the songs are Hebrew-oriented,
 * try to localize it. Also normalizes known English artist names used as titles.
 */
export function localizeGameTitle(title, songs) {
  if (!title) return title;

  // If title is already in Hebrew, keep it
  if (containsHebrew(title)) return title;

  // Try to normalize as an artist name (e.g., "Kaveret" → "כוורת")
  const normalized = normalizeArtistName(title);
  if (normalized !== title) return normalized;

  // If content is Hebrew but title is English, check for common theme words
  if (isHebrewContent(songs)) {
    const lower = title.toLowerCase().trim();
    // Common English theme titles → Hebrew equivalents
    const themeMap = {
      "music quiz": "מיקס שירים",
      "pop hits": "להיטי פופ",
      "rock hits": "להיטי רוק",
      "80s hits": "להיטי שנות ה-80",
      "90s hits": "להיטי שנות ה-90",
      "2000s hits": "להיטי שנות ה-2000",
      "children's songs": "שירי ילדים",
      "kids songs": "שירי ילדים",
      "love songs": "שירי אהבה",
      "nostalgic songs": "שירים נוסטלגיים",
      "israeli songs": "שירים ישראליים",
      "hebrew songs": "שירים בעברית",
      "classic israeli": "קלאסיקות ישראליות",
      "israeli classics": "קלאסיקות ישראליות",
      "wedding songs": "שירי חתונה",
      "party songs": "שירי מסיבה",
      "summer hits": "להיטי קיץ",
    };
    if (themeMap[lower]) return themeMap[lower];
  }

  return title;
}

/**
 * If the LLM only provided title/artist (because we summarized searchSongs results),
 * look up the full song data (trackId, previewUrl, artworkUrl) from the cached search results.
 */
function enrichSongsFromCache(songs, searchCache) {
  if (!songs || !Array.isArray(songs) || searchCache.length === 0) return songs;

  return songs.map((song) => {
    // Already has full data — no enrichment needed
    if (song.trackId && song.previewUrl) return song;

    // Try to find a match in the search cache by title (case-insensitive)
    const normalizedTitle = (song.title || "").toLowerCase().trim();
    const normalizedArtist = (song.artist || "").toLowerCase().trim();

    const match = searchCache.find((cached) => {
      const ct = (cached.title || "").toLowerCase().trim();
      const ca = (cached.artist || "").toLowerCase().trim();
      // Match by title, or title+artist
      return ct === normalizedTitle || (ct.includes(normalizedTitle) && ca.includes(normalizedArtist));
    });

    if (match) {
      return {
        ...song,
        trackId: song.trackId || match.trackId,
        previewUrl: song.previewUrl || match.previewUrl,
        artworkUrl: song.artworkUrl || match.artworkUrl || "",
      };
    }

    return song;
  });
}

function validateSongsHaveRealData(songs) {
  if (!songs || !Array.isArray(songs) || songs.length === 0) {
    throw Object.assign(new Error("At least one song is required"), {
      status: 400,
    });
  }
  for (const song of songs) {
    if (!song.title || !song.artist) {
      throw Object.assign(
        new Error(`Song missing required fields: title="${song.title}", artist="${song.artist}"`),
        { status: 400 }
      );
    }
    if (!song.trackId || !song.previewUrl) {
      throw Object.assign(
        new Error(
          `Song "${song.title}" is missing trackId or previewUrl. Songs must come from real search results.`
        ),
        { status: 400 }
      );
    }
  }
}
