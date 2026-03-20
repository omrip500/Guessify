import {
  analyzeAnswer,
  getAnswerTypeMessage,
} from "../../utils/answerMatching.js";

describe("answerMatching", () => {
  const mockSong = {
    title: "שיר המכולת",
    artist: "דני סנדרסון",
    correctAnswer: "שיר המכולת",
    correctAnswers: ["שיר המכולת", "שיר הכולת"],
    previewUrl: "https://example.com/preview.mp3",
    artworkUrl: "https://example.com/artwork.jpg",
  };

  describe("analyzeAnswer", () => {
    test("should correctly identify exact song title match", async () => {
      const result = await analyzeAnswer("שיר המכולת", mockSong, 5000, 15000);

      expect(result.type).toBe("songTitle");
      expect(result.isCorrect).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.matchedText).toBe("שיר המכולת");
      expect(result.similarity).toBeGreaterThan(0.9);
    });

    test("should correctly identify alternative song title match", async () => {
      const result = await analyzeAnswer("שיר הכולת", mockSong, 5000, 15000);

      expect(result.type).toBe("songTitle");
      expect(result.isCorrect).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.similarity).toBeGreaterThan(0.8);
    });

    test("should correctly identify exact artist match", async () => {
      const result = await analyzeAnswer("דני סנדרסון", mockSong, 5000, 15000);

      expect(result.type).toBe("artist");
      expect(result.isCorrect).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.matchedText).toBe("דני סנדרסון");
    });

    test("should handle case insensitive matching", async () => {
      const result = await analyzeAnswer("שיר המכולת", mockSong, 5000, 15000);

      expect(result.type).toBe("songTitle");
      expect(result.isCorrect).toBe(true);
    });

    test("should handle typos in song title", async () => {
      const result = await analyzeAnswer("שיר המכלת", mockSong, 5000, 15000);

      expect(result.type).toBe("songTitle");
      expect(result.isCorrect).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.7);
    });

    test("should return no match for completely wrong answer", async () => {
      const result = await analyzeAnswer(
        "תשובה לא נכונה בכלל",
        mockSong,
        5000,
        15000
      );

      expect(result.type).toBe("none");
      expect(result.isCorrect).toBe(false);
      expect(result.score).toBe(0);
      expect(result.similarity).toBe(0);
    });

    test("should calculate score based on time taken", async () => {
      const fastResult = await analyzeAnswer(
        "שיר המכולת",
        mockSong,
        2000,
        15000
      );
      const slowResult = await analyzeAnswer(
        "שיר המכולת",
        mockSong,
        12000,
        15000
      );

      expect(fastResult.score).toBeGreaterThan(slowResult.score);
    });

    test("should handle empty user answer", async () => {
      const result = await analyzeAnswer("", mockSong, 5000, 15000);

      expect(result.type).toBe("none");
      expect(result.isCorrect).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe("getAnswerTypeMessage", () => {
    test("should return correct message for song type", () => {
      const answerResult = { type: "songTitle" };
      const message = getAnswerTypeMessage(answerResult, "he");
      expect(message).toContain("שם השיר");
    });

    test("should return correct message for artist type", () => {
      const answerResult = { type: "artist" };
      const message = getAnswerTypeMessage(answerResult, "he");
      expect(message).toContain("שם הזמר");
    });

    test("should return correct message for none type", () => {
      const answerResult = { type: "none" };
      const message = getAnswerTypeMessage(answerResult, "he");
      expect(message).toContain("לא זיהה");
    });

    test("should handle English language", () => {
      const answerResult = { type: "songTitle" };
      const message = getAnswerTypeMessage(answerResult, "en");
      expect(message).toContain("song title");
    });

    test("should default to Hebrew for unknown language", () => {
      const answerResult = { type: "songTitle" };
      const message = getAnswerTypeMessage(answerResult, "unknown");
      expect(message).toContain("שם השיר");
    });
  });
});
