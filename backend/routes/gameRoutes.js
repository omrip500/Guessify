import express from "express";
import {
  createGame,
  getMyGames,
  deleteGame,
  searchSongs,
  getGameById,
  updateGame,
  getAnalytics,
  getPublicGames,
} from "../controllers/gameController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// @desc    Get public games for online lobby (no auth)
// @route   GET /api/games/public
// @access  Public
router.get("/public", getPublicGames);

// @desc    Create a new game (with song data)
// @route   POST /api/games
// @access  Private
router.post("/", protect, createGame);

// @desc    Get all games created by the logged-in user
// @route   GET /api/games/mine
// @access  Private
router.get("/mine", protect, getMyGames);

// @desc    Search songs using iTunes API
// @route   GET /api/games/search-songs
// @access  Private
router.get("/search-songs", protect, searchSongs);

// @desc    Get analytics data
// @route   GET /api/games/analytics
// @access  Private
router.get("/analytics", protect, getAnalytics);

// @desc    Get a single game by ID
// @route   GET /api/games/:id
// @access  Private
router.get("/:id", protect, getGameById);

// @desc    Update a game
// @route   PUT /api/games/:id
// @access  Private
router.put("/:id", protect, updateGame);

// @desc    Delete a game
// @route   DELETE /api/games/:id
// @access  Private
router.delete("/:id", protect, deleteGame);

// הסרנו את ה-proxy - לא נדרש יותר

export default router;
