import OpenAI from "openai";
import { searchSongsFromiTunes, processSongs } from "./gameService.js";
import { localizeGameTitle } from "./assistantTools.js";
import { deriveGameDescription } from "../utils/songNormalization.js";
import Game from "../models/Game.js";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is missing");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Generate a playable game from a free-text prompt.
 *
 * Flow:
 * 1. AI interprets the prompt → generates iTunes search queries + game metadata
 * 2. Search iTunes in parallel for all queries
 * 3. AI selects the best songs from all results
 * 4. Create game in DB with lyrics enrichment
 */
export async function generateGameFromPrompt(userId, prompt) {
  const openai = getOpenAIClient();

  // Step 1: Generate search plan
  const plan = await generateSearchPlan(openai, prompt);

  // Step 2: Search iTunes for all queries in parallel
  const searchPromises = plan.queries.map((q) =>
    searchSongsFromiTunes(q).catch(() => [])
  );
  const searchResults = await Promise.all(searchPromises);
  const allSongs = searchResults.flat();

  // Step 3: Deduplicate by trackId, filter out songs without previews
  const seen = new Set();
  const uniqueSongs = allSongs.filter((song) => {
    if (!song.trackId || seen.has(song.trackId)) return false;
    if (!song.previewUrl) return false;
    seen.add(song.trackId);
    return true;
  });

  if (uniqueSongs.length < 3) {
    throw Object.assign(
      new Error(
        "לא הצלחנו למצוא מספיק שירים. נסה תיאור אחר או יותר ספציפי."
      ),
      { status: 400 }
    );
  }

  // Step 4: AI selects best songs from the pool
  const selectedSongs = await selectBestSongs(
    openai,
    uniqueSongs,
    prompt,
    plan
  );

  if (selectedSongs.length < 3) {
    throw Object.assign(
      new Error("לא הצלחנו לבחור מספיק שירים מתאימים. נסה תיאור אחר."),
      { status: 400 }
    );
  }

  // Step 5: Process songs (normalize artist names, song titles, fetch lyrics)
  const processedSongs = await processSongs(selectedSongs);

  // Step 6: Localize game title & description (same logic as regular assistant)
  // This translates English titles to Hebrew when songs are Hebrew-oriented,
  // and normalizes known English artist names used as titles (e.g., "Kaveret" → "כוורת")
  const localizedTitle = localizeGameTitle(plan.gameTitle, processedSongs);
  const description =
    plan.gameDescription || deriveGameDescription(localizedTitle, processedSongs);

  // Step 7: Create and save game
  const game = new Game({
    title: localizedTitle,
    description,
    songs: processedSongs,
    isPublic: true,
    guessTimeLimit: 30,
    guessInputMethod: "freeText",
    createdBy: userId,
    source: "ai",
  });

  return game.save();
}

// ─── Step 1: Generate search plan from prompt ───

async function generateSearchPlan(openai, prompt) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `You are a music expert helping create a music guessing game.
Given a user's description of what kind of game they want, generate:
1. 4-6 iTunes search queries that will find relevant songs. Mix artist names and song titles. Use the language that matches the content (Hebrew for Israeli music, English for English music, etc.).
2. A game title (in Hebrew if the content is Israeli/Hebrew, otherwise English). Keep it short and catchy.
3. A one-line game description (same language as title).

IMPORTANT:
- For Israeli/Hebrew music, use Hebrew search terms (e.g., "אריק איינשטיין", "שלמה ארצי")
- For English music, use English terms
- Mix specific artist queries with theme/genre queries for variety
- Each query should be different to maximize unique results

Respond with ONLY valid JSON, no markdown:
{"queries": ["query1", "query2", ...], "gameTitle": "...", "gameDescription": "..."}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  try {
    const parsed = JSON.parse(text);
    if (
      !parsed.queries ||
      !Array.isArray(parsed.queries) ||
      parsed.queries.length === 0
    ) {
      throw new Error("No queries generated");
    }
    return {
      queries: parsed.queries.slice(0, 6),
      gameTitle: parsed.gameTitle || "AI Music Quiz",
      gameDescription: parsed.gameDescription || "",
    };
  } catch {
    // Fallback: use the prompt itself as a search query
    return {
      queries: [prompt],
      gameTitle: "AI Music Quiz",
      gameDescription: prompt,
    };
  }
}

// ─── Step 4: AI selects best songs from search results ───

async function selectBestSongs(openai, songs, prompt, plan) {
  // If we have 10 or fewer songs, just use them all
  if (songs.length <= 10) {
    return songs;
  }

  // Ask AI to pick the best 8-10 songs
  const songList = songs
    .map(
      (s, i) =>
        `${i}: "${s.title}" - ${s.artist} [trackId: ${s.trackId}]`
    )
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: `You are selecting songs for a music guessing game called "${plan.gameTitle}".
The user requested: "${prompt}"

From the search results below, pick 8-10 songs that best match the request. Prefer variety (different artists when possible). Avoid duplicates or very similar songs.

Respond with ONLY a JSON array of the selected song indices (numbers), e.g.: [0, 2, 5, 7, 9, 11, 14, 16]`,
      },
      {
        role: "user",
        content: songList,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  try {
    const indices = JSON.parse(text);
    if (!Array.isArray(indices)) throw new Error("Not an array");

    const selected = indices
      .filter((i) => typeof i === "number" && i >= 0 && i < songs.length)
      .map((i) => songs[i]);

    return selected.length >= 3 ? selected : songs.slice(0, 10);
  } catch {
    // Fallback: take first 10
    return songs.slice(0, 10);
  }
}
