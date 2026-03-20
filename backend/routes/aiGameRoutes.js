import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { generateGameFromPrompt } from "../services/aiGameGenerator.js";

const router = express.Router();

// @desc    Generate a game using AI from a free-text prompt
// @route   POST /api/ai/generate-game
// @access  Private
router.post("/generate-game", protect, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ message: "Please describe the game you want." });
    }

    if (prompt.length > 500) {
      return res.status(400).json({ message: "Prompt is too long (max 500 characters)." });
    }

    const game = await generateGameFromPrompt(req.user._id, prompt.trim());

    res.status(201).json({
      _id: game._id,
      title: game.title,
      description: game.description,
      songCount: game.songs.length,
      songs: game.songs.map((s) => ({
        title: s.title,
        artist: s.artist,
        artworkUrl: s.artworkUrl,
      })),
      source: game.source,
    });
  } catch (err) {
    console.error("AI game generation error:", err);
    const status = err.status || 500;
    res.status(status).json({
      message: err.message || "Failed to generate game. Please try again.",
    });
  }
});

export default router;
