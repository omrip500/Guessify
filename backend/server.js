// Load environment variables FIRST before importing anything else
import dotenv from "dotenv";
dotenv.config();

// Fallback environment variables if .env doesn't load
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI =
    "mongodb+srv://omripeer12:kpM6eqJ5CkDqxozB@musicapp.0gesll7.mongodb.net/musicapp?retryWrites=true&w=majority";
}
if (!process.env.PORT) {
  process.env.PORT = "8000";
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "my_secret_key";
}
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY not found in environment variables");
}

// Debug: Check if environment variables are loaded correct
console.log("🔍 Environment check:");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI:", process.env.MONGO_URI ? "Found" : "Not found");
console.log("NODE_ENV:", process.env.NODE_ENV);

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import lyricsRoutes from "./routes/lyricsRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import aiGameRoutes from "./routes/aiGameRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import socketManager from "./sockets/index.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// 🛠 הגדרת __dirname ל-ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database after environment variables are loaded
connectDB();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 80;

// 🌐 CORS לפי סביבה
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        "https://www.guessifyapp.com",
        "https://create.guessifyapp.com",
        "https://play.guessifyapp.com",
      ]
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
      ];

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

// 🧩 Middlewares
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());

// 🟢 Static route for /uploads
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// 🧭 Routes
app.use("/api/users", userRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/lyrics", lyricsRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/ai", aiGameRoutes);

// 🧱 API-only server - Frontend apps are served separately from S3
// No longer serving static files - apps are deployed to:
// - create.guessifyapp.com (S3)
// - play.guessifyapp.com (S3)
// - guessifyapp.com (S3)
app.get("/", (_req, res) => {
  res.json({
    message: "🎵 Guessify API Backend Server take 6",
    status: "running",
    version: "2.0.0",
    apps: {
      create: "https://create.guessifyapp.com",
      play: "https://play.guessifyapp.com",
      marketing: "https://guessifyapp.com",
    },
  });
});

// ❗ Error handlers
app.use(notFound);
app.use(errorHandler);

// 📡 Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

socketManager(io);

// 🚀 Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
