import asyncHandler from "../middlewares/asyncHandler.js";
import Game from "../models/Game.js";

// @desc    Create a new game (with song data from iTunes API)
// @route   POST /api/games
// @access  Private
export const createGame = asyncHandler(async (req, res) => {
  console.log("Creating a new game with song data...");
  const {
    title,
    description,
    isPublic,
    songs,
    guessTimeLimit,
    guessInputMethod,
  } = req.body;

  console.log("🎮 Received game data:", {
    title,
    description,
    isPublic,
    guessTimeLimit,
    guessInputMethod,
  });
  console.log(
    "⏱️ Received guess time limit:",
    guessTimeLimit,
    typeof guessTimeLimit
  );

  if (!title || !songs || songs.length === 0) {
    res.status(400).json({
      message: "Please provide a title and at least one song.",
    });
    return;
  }

  // וידוא זמן ניחוש תקין
  const validGuessTimeLimit = [15, 30, 45, 60].includes(guessTimeLimit)
    ? guessTimeLimit
    : 15;

  // וידוא שיטת ניחוש תקינה
  const validGuessInputMethod = ["freeText", "letterClick"].includes(
    guessInputMethod
  )
    ? guessInputMethod
    : "freeText";

  console.log("✅ Valid guess time limit:", validGuessTimeLimit);
  console.log("✅ Valid guess input method:", validGuessInputMethod);

  // וידוא שכל שיר מכיל את הנתונים הנדרשים
  console.log(`🎵 Processing ${songs.length} songs...`);
  const validatedSongs = songs.map((song, index) => {
    console.log(
      `🎵 Processing song ${index + 1}/${songs.length}: "${song.title}" by "${
        song.artist
      }"`
    );

    return {
      title: song.title || "Unknown Title",
      correctAnswer: song.correctAnswer || song.title || "Unknown Title",
      correctAnswers: song.correctAnswers || [
        song.correctAnswer || song.title || "Unknown Title",
      ],
      artist: song.artist || "Unknown Artist",
      previewUrl: song.previewUrl || "",
      artworkUrl: song.artworkUrl || "",
      trackId: song.trackId || "",
    };
  });

  console.log(`✅ Finished processing all ${validatedSongs.length} songs.`);

  const game = new Game({
    title,
    description,
    songs: validatedSongs,
    isPublic,
    guessTimeLimit: validGuessTimeLimit,
    guessInputMethod: validGuessInputMethod,
    createdBy: req.user._id,
  });

  console.log(
    "💾 About to save game with guessTimeLimit:",
    validGuessTimeLimit
  );
  const savedGame = await game.save();
  console.log(
    "✅ Game saved successfully with guessTimeLimit:",
    savedGame.guessTimeLimit
  );
  res.status(201).json(savedGame);
});

export const getMyGames = asyncHandler(async (req, res) => {
  const games = await Game.find({ createdBy: req.user._id });
  console.log(`🎮 Retrieved ${games.length} games for user ${req.user._id}`);
  if (games.length > 0) {
    console.log("🎮 Sample game guessTimeLimit:", games[0].guessTimeLimit);
  }
  res.json(games);
});

// @desc    Get a single game by ID
// @route   GET /api/games/:id
// @access  Private
export const getGameById = asyncHandler(async (req, res) => {
  const game = await Game.findById(req.params.id);

  if (!game) {
    res.status(404);
    throw new Error("Game not found");
  }

  console.log("🎮 Retrieved game from DB:", {
    id: game._id,
    title: game.title,
    guessTimeLimit: game.guessTimeLimit,
    songsCount: game.songs.length,
  });

  // Check if the user is the owner of the game
  if (game.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to view this game");
  }

  res.json(game);
});

// @desc    Update a game
// @route   PUT /api/games/:id
// @access  Private
export const updateGame = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    isPublic,
    songs,
    guessTimeLimit,
    guessInputMethod,
  } = req.body;

  console.log("🎮 Updating game with data:", {
    title,
    description,
    isPublic,
    guessTimeLimit,
    guessInputMethod,
  });
  console.log(
    "⏱️ Received guess time limit:",
    guessTimeLimit,
    typeof guessTimeLimit
  );

  const game = await Game.findById(req.params.id);

  if (!game) {
    res.status(404);
    throw new Error("Game not found");
  }

  // Check if the user is the owner of the game
  if (game.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this game");
  }

  // Validate songs if provided
  let validatedSongs = game.songs;
  if (songs !== undefined) {
    if (songs.length === 0) {
      // Allow empty songs array (user removed all songs)
      validatedSongs = [];
    } else {
      console.log(`🎵 Processing ${songs.length} songs for update...`);
      validatedSongs = songs.map((song, index) => {
        console.log(
          `🎵 Processing song ${index + 1}/${songs.length}: "${
            song.title
          }" by "${song.artist}"`
        );

        return {
          title: song.title || "Unknown Title",
          correctAnswer: song.correctAnswer || song.title || "Unknown Title",
          correctAnswers: song.correctAnswers || [
            song.correctAnswer || song.title || "Unknown Title",
          ],
          artist: song.artist || "Unknown Artist",
          previewUrl: song.previewUrl || "",
          artworkUrl: song.artworkUrl || "",
          trackId: song.trackId || "",
        };
      });

      console.log(
        `✅ Finished processing ${validatedSongs.length} songs for update.`
      );
    }
  }

  // Validate guess time limit if provided
  const validGuessTimeLimit =
    guessTimeLimit !== undefined && [15, 30, 45, 60].includes(guessTimeLimit)
      ? guessTimeLimit
      : game.guessTimeLimit;

  // Validate guess input method if provided
  const validGuessInputMethod =
    guessInputMethod !== undefined &&
    ["freeText", "letterClick"].includes(guessInputMethod)
      ? guessInputMethod
      : game.guessInputMethod;

  console.log("✅ Valid guess time limit:", validGuessTimeLimit);
  console.log("✅ Valid guess input method:", validGuessInputMethod);
  console.log("🔄 Current game guess time limit:", game.guessTimeLimit);

  // Update game fields
  game.title = title || game.title;
  game.description = description !== undefined ? description : game.description;
  game.isPublic = isPublic !== undefined ? isPublic : game.isPublic;
  game.guessTimeLimit = validGuessTimeLimit;
  game.guessInputMethod = validGuessInputMethod;
  game.songs = validatedSongs;

  const updatedGame = await game.save();
  console.log(
    "💾 Game saved with guess time limit:",
    updatedGame.guessTimeLimit
  );

  res.json(updatedGame);
});

// @desc    Delete a game
// @route   DELETE /api/games/:id
// @access  Private
export const deleteGame = asyncHandler(async (req, res) => {
  const game = await Game.findById(req.params.id);

  if (!game) {
    res.status(404);
    throw new Error("Game not found");
  }

  // Check if the user is the owner of the game
  if (game.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this game");
  }

  await Game.findByIdAndDelete(req.params.id);
  res.json({ message: "Game deleted successfully" });
});

// @desc    Search songs using iTunes API
// @route   GET /api/games/search-songs
// @access  Private
export const searchSongs = asyncHandler(async (req, res) => {
  const { term } = req.query;

  console.log("🔍 Search songs endpoint hit!");
  console.log("🔍 Searching for songs with term:", term);
  console.log("🔍 Full query params:", req.query);

  if (!term) {
    res.status(400).json({ message: "Search term is required" });
    return;
  }

  try {
    const iTunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term
    )}&entity=song&limit=10&media=music`;

    console.log("📡 Fetching from iTunes API:", iTunesUrl);

    const response = await fetch(iTunesUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MusicGameApp/1.0)",
      },
    });

    console.log("📡 iTunes API response status:", response.status);

    if (!response.ok) {
      console.error(
        "❌ iTunes API error:",
        response.status,
        response.statusText
      );
      throw new Error(
        `iTunes API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ iTunes API success, found", data.resultCount, "results");

    res.json(data);
  } catch (error) {
    console.error("❌ Error searching songs:", error.message);

    // Fallback: return mock data for testing
    console.log("🔄 Returning mock data as fallback");
    const mockData = {
      resultCount: 2,
      results: [
        {
          trackId: 1001,
          trackName: `Mock Song - ${term}`,
          artistName: "Mock Artist",
          previewUrl:
            "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
          artworkUrl60:
            "https://via.placeholder.com/60x60/purple/white?text=🎵",
          artworkUrl100:
            "https://via.placeholder.com/100x100/purple/white?text=🎵",
        },
        {
          trackId: 1002,
          trackName: `Another Mock Song - ${term}`,
          artistName: "Another Mock Artist",
          previewUrl:
            "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
          artworkUrl60: "https://via.placeholder.com/60x60/blue/white?text=🎶",
          artworkUrl100:
            "https://via.placeholder.com/100x100/blue/white?text=🎶",
        },
      ],
    };

    res.json(mockData);
  }
});

// @desc    Get analytics data for the logged-in user
// @route   GET /api/games/analytics
// @access  Private
export const getAnalytics = asyncHandler(async (req, res) => {
  console.log("📊 Getting analytics for user:", req.user._id);

  try {
    // Get all games created by the user
    const userGames = await Game.find({ createdBy: req.user._id });

    // Calculate basic stats
    const totalGames = userGames.length;
    const totalSongs = userGames.reduce(
      (sum, game) => sum + game.songs.length,
      0
    );
    const publicGames = userGames.filter((game) => game.isPublic).length;
    const privateGames = totalGames - publicGames;

    // Calculate average songs per game
    const avgSongsPerGame =
      totalGames > 0 ? (totalSongs / totalGames).toFixed(1) : 0;

    // Get games by creation date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentGames = userGames.filter(
      (game) => new Date(game.createdAt) >= thirtyDaysAgo
    );

    // Group games by date for chart data
    const gamesByDate = {};
    recentGames.forEach((game) => {
      const date = new Date(game.createdAt).toISOString().split("T")[0];
      gamesByDate[date] = (gamesByDate[date] || 0) + 1;
    });

    // Convert to array format for charts
    const chartData = Object.entries(gamesByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get most popular game (by song count as proxy)
    const mostPopularGame = userGames.reduce(
      (prev, current) =>
        prev.songs.length > current.songs.length ? prev : current,
      userGames[0] || null
    );

    // Calculate genre distribution (mock data for now)
    const genreDistribution = [
      { genre: "Pop", count: Math.floor(totalSongs * 0.4) },
      { genre: "Rock", count: Math.floor(totalSongs * 0.3) },
      { genre: "Hip Hop", count: Math.floor(totalSongs * 0.15) },
      { genre: "Electronic", count: Math.floor(totalSongs * 0.1) },
      { genre: "Other", count: Math.floor(totalSongs * 0.05) },
    ].filter((item) => item.count > 0);

    const analytics = {
      overview: {
        totalGames,
        totalSongs,
        publicGames,
        privateGames,
        avgSongsPerGame: parseFloat(avgSongsPerGame),
        recentGamesCount: recentGames.length,
      },
      chartData,
      mostPopularGame: mostPopularGame
        ? {
            title: mostPopularGame.title,
            songCount: mostPopularGame.songs.length,
            isPublic: mostPopularGame.isPublic,
            createdAt: mostPopularGame.createdAt,
          }
        : null,
      genreDistribution,
      recentActivity: recentGames.slice(0, 5).map((game) => ({
        title: game.title,
        songCount: game.songs.length,
        isPublic: game.isPublic,
        createdAt: game.createdAt,
      })),
    };

    console.log("✅ Analytics calculated successfully");
    res.json(analytics);
  } catch (error) {
    console.error("❌ Error calculating analytics:", error);
    res.status(500).json({
      message: "Failed to calculate analytics",
      error: error.message,
    });
  }
});

// @desc    Get all public games (for online lobby)
// @route   GET /api/games/public
// @access  Public (no auth required)
export const getPublicGames = asyncHandler(async (req, res) => {
  const games = await Game.find({ isPublic: true })
    .select("title description songs guessTimeLimit guessInputMethod source createdAt")
    .sort({ createdAt: -1 })
    .limit(50);

  const gamesWithInfo = games
    .filter((game) => game.songs && game.songs.length > 0)
    .map((game) => ({
      _id: game._id,
      title: game.title,
      description: game.description,
      songCount: game.songs.length,
      guessTimeLimit: game.guessTimeLimit,
      guessInputMethod: game.guessInputMethod,
      source: game.source || "manual",
      createdAt: game.createdAt,
    }));

  res.json(gamesWithInfo);
});

