import OpenAI from "openai";
import {
  toolDefinitions,
  executeTool,
  isDestructive,
} from "./assistantTools.js";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is missing");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─── System Prompt ───

function buildSystemPrompt(context) {
  let prompt = `You are the Guessify AI Assistant — a helpful, friendly assistant built into the Guessify game creation platform.

Your job is to help game hosts create, manage, and improve their music guessing games.

You can:
- Answer questions about the user's games (titles, songs, settings, etc.)
- Create new games with real songs
- Add or remove songs from existing games
- Rename games and update settings (guess time, input method, visibility)
- Search for real songs to add to games

CRITICAL RULES:
1. NEVER invent or hallucinate song data. Always use the searchSongs tool first to find real songs, then use those exact results (with trackId, previewUrl, etc.) when creating games or adding songs.
2. When the user asks to create a game with songs, ALWAYS search for songs first, then create the game with the real search results.
3. For destructive actions (removing songs, deleting games), clearly describe what you're about to do and ask for confirmation.
4. Be concise but helpful. Use short responses unless the user asks for detail.
5. If the user references "this game" or "the current game", use the page context provided below.
6. You can respond in the same language the user writes in (Hebrew or English).

RESPONSE FORMATTING RULES (VERY IMPORTANT):
- You are talking to a normal product user, NOT a developer. Keep responses clean and friendly.
- NEVER show URLs (previewUrl, artworkUrl, or any link) in your responses unless the user explicitly asks for them.
- NEVER show trackId, internal IDs, or any technical metadata in your responses.
- NEVER use markdown image syntax like ![](url) in your messages.
- When listing songs, show ONLY the song title and artist. Use a simple numbered list. Example:
  1. Song Title - Artist Name
  2. Another Song - Another Artist
- Keep song lists short. If there are more than 8 songs, show the first 6-8 and say "and X more".
- Do NOT use excessive markdown formatting. Avoid bolding every song title. Use plain text with minimal formatting.
- After searching for songs, briefly summarize what you found and ask if the user wants to proceed. Do not dump all raw search data.
- After creating a game or adding songs, give a short confirmation with the game name and song count. Do not repeat the full song list.

GAME CREATION BEHAVIOR (VERY IMPORTANT):
When the user asks to create a game, DO NOT ask follow-up questions about settings. Act immediately using these defaults:
- title: Infer a short, natural title from the request. IMPORTANT: If the request is about Hebrew/Israeli artists or songs, ALWAYS use a Hebrew title. Examples: Kaveret songs → "כוורת". Shlomo Artzi songs → "שלמה ארצי". Children's songs → "שירי ילדים". Nostalgic Hebrew songs → "שירים נוסטלגיים". Use the Hebrew artist name, Hebrew theme, or Hebrew language keyword. Only use English titles for clearly English/international content (e.g., "Pop Hits", "Beatles").
- description: Omit — the system auto-generates a relevant description from the title and songs. Only provide if the user explicitly specifies a custom description.
- isPublic: true
- guessTimeLimit: 30
- guessInputMethod: "freeText"
Only override a default if the user EXPLICITLY asked for a different value. Never ask "what title?", "what time limit?", "what visibility?" etc. Just proceed.
After searching for songs, immediately call createGame — do NOT ask "should I proceed?" or "would you like me to create it?". Just create it and report the result.

Game settings reference:
- Guess time limit options: 15, 30, 45, or 60 seconds
- Guess input methods: "freeText" (players type freely) or "letterClick" (players click letters to fill in blanks)
- Visibility: public (anyone can join) or private (invite only)`;

  if (context) {
    if (context.currentGameId) {
      prompt += `\n\nPage Context: The user is currently viewing game ID "${context.currentGameId}".`;
      if (context.currentGameTitle) {
        prompt += ` Game title: "${context.currentGameTitle}".`;
      }
    }
    if (context.page) {
      prompt += `\nCurrent page: ${context.page}`;
    }
  }

  return prompt;
}

// ─── Main Chat Handler ───

/**
 * Process a user message through the AI assistant.
 * Handles the full tool-calling loop:
 *   user message → LLM → tool calls → execute → feed results back → final response
 *
 * Returns:
 * {
 *   reply: string,              // The assistant's text response
 *   toolResults: Array,         // Results from executed tools (for frontend cache invalidation)
 *   pendingConfirmation: object | null  // If a destructive action needs confirmation
 * }
 */
export async function chat(userId, message, conversationHistory, context) {
  const openai = getOpenAIClient();

  // Build messages array
  const messages = [
    { role: "system", content: buildSystemPrompt(context) },
  ];

  // Add conversation history (keep last 20 messages to stay within limits)
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-20);
    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // Add current user message
  messages.push({ role: "user", content: message });

  const toolResults = [];
  let pendingConfirmation = null;
  // Cache search results so songs can be auto-enriched when LLM calls createGame/addSongsToGame
  let searchCache = [];

  // Tool-calling loop (max 5 iterations to prevent infinite loops)
  const MAX_ITERATIONS = 5;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 1500,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // If no tool calls, we have the final text response
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return {
        reply: assistantMessage.content || "I'm not sure how to help with that.",
        toolResults,
        pendingConfirmation,
      };
    }

    // Process tool calls
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      let args;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: "Invalid tool arguments" }),
        });
        continue;
      }

      // Check if this is a destructive action that needs confirmation
      if (isDestructive(toolName)) {
        pendingConfirmation = {
          toolName,
          args,
          toolCallId: toolCall.id,
          description: buildDestructiveDescription(toolName, args),
        };

        // Tell the LLM the action is pending confirmation
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            status: "pending_confirmation",
            message: "This action requires user confirmation before execution.",
            description: pendingConfirmation.description,
          }),
        });
        continue;
      }

      // Execute non-destructive tool
      try {
        const result = await executeTool(userId, toolName, args, searchCache);
        toolResults.push({ tool: toolName, result });

        // Cache search results so createGame/addSongsToGame can auto-enrich songs
        if (toolName === "searchSongs" && Array.isArray(result)) {
          searchCache = result;
        }

        // Summarize tool results for the LLM to prevent raw data leaking into responses
        const llmContent = summarizeToolResult(toolName, result);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: llmContent,
        });
      } catch (error) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            error: error.message || "Tool execution failed",
          }),
        });
      }
    }
  }

  // If we hit the iteration limit, return what we have
  return {
    reply: "I completed the available operations. Let me know if you need anything else!",
    toolResults,
    pendingConfirmation,
  };
}

// ─── Confirm & Execute a Destructive Action ───

export async function confirmAndExecute(userId, pendingAction) {
  const { toolName, args } = pendingAction;

  if (!isDestructive(toolName)) {
    throw Object.assign(
      new Error("This action does not require confirmation"),
      { status: 400 }
    );
  }

  const result = await executeTool(userId, toolName, args);
  return result;
}

// ─── Helpers ───

/**
 * Summarize tool results before feeding them to the LLM.
 * This prevents raw technical data (URLs, trackIds) from leaking into user-facing responses.
 * The full data is preserved in toolResults for frontend cache invalidation.
 */
function summarizeToolResult(toolName, result) {
  switch (toolName) {
    case "searchSongs": {
      // Only send title + artist to the LLM — it doesn't need URLs to compose a response.
      // The full data (trackId, previewUrl) is still available in toolResults for subsequent
      // tool calls like createGame/addSongsToGame since the LLM passes those through tool args.
      if (Array.isArray(result)) {
        const songs = result.map((s, i) => `${i + 1}. ${s.title} - ${s.artist}`);
        return JSON.stringify({
          songCount: result.length,
          songs,
          _note: "Use these exact song titles and artists when calling createGame or addSongsToGame. The system will match them to the full search results automatically.",
        });
      }
      return JSON.stringify(result);
    }

    case "listMyGames": {
      // Strip dates and internal IDs from the summary shown to the LLM
      if (Array.isArray(result)) {
        const games = result.map((g) => ({
          id: g.id,
          title: g.title,
          songCount: g.songCount,
          isPublic: g.isPublic,
          guessTimeLimit: g.guessTimeLimit,
          guessInputMethod: g.guessInputMethod,
        }));
        return JSON.stringify(games);
      }
      return JSON.stringify(result);
    }

    case "getGameDetails": {
      // Strip trackIds from song list
      if (result && result.songs) {
        return JSON.stringify({
          id: result.id,
          title: result.title,
          description: result.description,
          isPublic: result.isPublic,
          guessTimeLimit: result.guessTimeLimit,
          guessInputMethod: result.guessInputMethod,
          songs: result.songs.map((s) => ({
            title: s.title,
            artist: s.artist,
          })),
        });
      }
      return JSON.stringify(result);
    }

    default:
      return JSON.stringify(result);
  }
}

function buildDestructiveDescription(toolName, args) {
  switch (toolName) {
    case "removeSongFromGame":
      return `Remove song "${args.songIdentifier}" from the game`;
    case "deleteGame":
      return `Delete the entire game (ID: ${args.gameId}). This cannot be undone.`;
    default:
      return `Execute destructive action: ${toolName}`;
  }
}
