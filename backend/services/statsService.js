import PlayerStats from "../models/PlayerStats.js";

/**
 * Level title based on level number
 */
export function getLevelTitle(level) {
  if (level >= 20) return "Legend";
  if (level >= 15) return "Maestro";
  if (level >= 10) return "Music Fan";
  if (level >= 5) return "Rising Star";
  return "Newbie";
}

/**
 * Calculate level from XP: level = floor(sqrt(xp / 50)) + 1
 */
export function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

/**
 * Calculate XP needed for next level
 */
export function xpForLevel(level) {
  return (level - 1) * (level - 1) * 50;
}

/**
 * Calculate XP earned from a completed online game.
 *
 * @param {Object} params
 * @param {number} params.score - Player's total score in this game
 * @param {number} params.placement - 1-based placement (1 = winner)
 * @param {number} params.correctCount - Number of correct answers
 * @param {number} params.totalPlayers - Number of players who finished
 * @returns {number} XP earned
 */
export function calculateXP({ score, placement, correctCount, totalPlayers }) {
  let xp = 10; // Base XP for completing a game

  // Score bonus: 1 XP per 100 points
  xp += Math.floor(score / 100);

  // Win bonus
  if (placement === 1 && totalPlayers >= 2) {
    xp += 20;
  } else if (placement <= 3 && totalPlayers >= 3) {
    xp += 10;
  }

  // Correct answer bonus: 2 XP per correct
  xp += correctCount * 2;

  return xp;
}

/**
 * Process game results for all authenticated players after an online game ends.
 *
 * @param {Object} params
 * @param {Array} params.leaderboard - Sorted leaderboard [{place, username, score, emoji, userId}]
 * @param {Object} params.allPlayerAnswers - Per-song answer data accumulated during the game
 * @param {number} params.totalSongs - Total songs in the game
 * @param {string} params.gameTitle - Game title for history
 * @returns {Object} Map of userId -> { xpEarned, levelBefore, levelAfter, newLevel, stats }
 */
export async function processGameResults({
  leaderboard,
  allPlayerAnswers,
  totalSongs,
  gameTitle,
}) {
  const results = {};
  const totalPlayers = leaderboard.length;

  for (const entry of leaderboard) {
    if (!entry.userId) continue; // Skip non-authenticated players

    const userId = entry.userId;
    const placement = entry.place;
    const score = entry.score;

    // Count correct answers and answer types for this player
    const playerAnswerData = allPlayerAnswers[entry.username] || {};
    let correctCount = 0;
    let totalAnswerCount = 0;
    let songTitleCount = 0;
    let artistCount = 0;

    // allPlayerAnswers[username] is accumulated across songs
    // Each entry: { answer, result: { type, isCorrect, score, matchedText } }
    for (const songAnswers of Object.values(playerAnswerData)) {
      totalAnswerCount++;
      if (songAnswers.isCorrect) {
        correctCount++;
        if (songAnswers.answerType === "songTitle") songTitleCount++;
        else if (songAnswers.answerType === "artist") artistCount++;
      }
    }

    const xpEarned = calculateXP({
      score,
      placement,
      correctCount,
      totalPlayers,
    });

    // Upsert player stats
    let stats = await PlayerStats.findOne({ userId });
    if (!stats) {
      stats = new PlayerStats({ userId });
    }

    const levelBefore = calculateLevel(stats.xp);

    // Update core stats
    stats.gamesPlayed += 1;
    if (placement === 1 && totalPlayers >= 2) stats.gamesWon += 1;
    if (placement <= 3 && totalPlayers >= 3) stats.podiumFinishes += 1;

    // Score stats
    stats.totalScore += score;
    if (score > stats.bestScore) stats.bestScore = score;

    // Answer stats
    stats.correctAnswers += correctCount;
    stats.totalAnswers += totalAnswerCount;
    stats.songTitleGuesses += songTitleCount;
    stats.artistGuesses += artistCount;

    // Streaks (got at least 1 correct = streak continues)
    if (correctCount > 0) {
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
    } else {
      stats.currentStreak = 0;
    }

    // XP
    stats.xp += xpEarned;

    const levelAfter = calculateLevel(stats.xp);

    // Add to recent games (keep last 50)
    stats.recentGames.unshift({
      gameTitle,
      score,
      placement,
      totalPlayers,
      xpEarned,
      correctCount,
      totalSongs,
      playedAt: new Date(),
    });
    if (stats.recentGames.length > 50) {
      stats.recentGames = stats.recentGames.slice(0, 50);
    }

    await stats.save();

    results[userId] = {
      xpEarned,
      levelBefore,
      levelAfter,
      leveledUp: levelAfter > levelBefore,
      newLevel: levelAfter,
      levelTitle: getLevelTitle(levelAfter),
      totalXP: stats.xp,
      xpForCurrentLevel: xpForLevel(levelAfter),
      xpForNextLevel: xpForLevel(levelAfter + 1),
      placement,
      score,
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
    };
  }

  return results;
}
