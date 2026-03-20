import mongoose from "mongoose";

const playerStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Core stats
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    podiumFinishes: { type: Number, default: 0 },

    // Score stats
    totalScore: { type: Number, default: 0, index: true },
    bestScore: { type: Number, default: 0 },

    // Answer stats
    correctAnswers: { type: Number, default: 0 },
    totalAnswers: { type: Number, default: 0 },
    songTitleGuesses: { type: Number, default: 0 },
    artistGuesses: { type: Number, default: 0 },
    lyricsGuesses: { type: Number, default: 0 },

    // Streaks
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },

    // Progression
    xp: { type: Number, default: 0 },

    // Game history (last 50 games)
    recentGames: [
      {
        gameTitle: String,
        score: Number,
        placement: Number,
        totalPlayers: Number,
        xpEarned: Number,
        correctCount: Number,
        totalSongs: Number,
        playedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Virtual: level derived from XP
playerStatsSchema.virtual("level").get(function () {
  return Math.floor(Math.sqrt(this.xp / 50)) + 1;
});

// Virtual: accuracy percentage
playerStatsSchema.virtual("accuracy").get(function () {
  if (this.totalAnswers === 0) return 0;
  return Math.round((this.correctAnswers / this.totalAnswers) * 100);
});

// Virtual: win rate
playerStatsSchema.virtual("winRate").get(function () {
  if (this.gamesPlayed === 0) return 0;
  return Math.round((this.gamesWon / this.gamesPlayed) * 100);
});

// Ensure virtuals are included in JSON
playerStatsSchema.set("toJSON", { virtuals: true });
playerStatsSchema.set("toObject", { virtuals: true });

const PlayerStats = mongoose.model("PlayerStats", playerStatsSchema);
export default PlayerStats;
