import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getMyStats,
  getLeaderboard,
  getFriendsLeaderboard,
  getUserStats,
} from "../controllers/statsController.js";

const router = express.Router();

router.get("/me", protect, getMyStats);
router.get("/leaderboard", protect, getLeaderboard);
router.get("/friends-leaderboard", protect, getFriendsLeaderboard);
router.get("/user/:userId", protect, getUserStats);

export default router;
