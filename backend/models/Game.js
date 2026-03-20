import mongoose from "mongoose";
import songSchema from "./SongSchema.js";

const gameSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    songs: [songSchema],
    isPublic: { type: Boolean, default: false },
    guessTimeLimit: {
      type: Number,
      default: 15,
      enum: [15, 30, 45, 60],
      required: true,
    }, // זמן ניחוש בשניות
    guessInputMethod: {
      type: String,
      default: "freeText",
      enum: ["freeText", "letterClick"],
      required: true,
    }, // שיטת ניחוש: כתיבה חופשית או לחיצה על אותיות
    source: {
      type: String,
      default: "manual",
      enum: ["manual", "ai"],
    },
  },
  { timestamps: true }
);

const Game = mongoose.model("Game", gameSchema);
export default Game;
