// src/constants.js - Create App Constants
// Updated: Fixed backend URL for production deployment
// Trigger deployment with fresh build files.
export const BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://api.guessifyapp.com";

export const USERS_URL = `${BASE_URL}/api/users`;
export const GAMES_URL = `${BASE_URL}/api/games`;
export const LESSONS_URL = `${BASE_URL}/api/lessons`;
export const ASSISTANT_URL = `${BASE_URL}/api/assistant`;
export const FRIENDS_URL = `${BASE_URL}/api/friends`;
export const STATS_URL = `${BASE_URL}/api/stats`;
export const AI_URL = `${BASE_URL}/api/ai`;

export const PLAY_APP_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3002"
    : "https://play.guessifyapp.com";
