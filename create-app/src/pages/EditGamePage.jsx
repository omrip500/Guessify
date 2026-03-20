// src/pages/EditGamePage.jsx
import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout";
import { useNavigate, useParams } from "react-router-dom";
import { useGameWithState, useUpdateGameWithState } from "../hooks/useGames";
import SongSearchInput from "../components/SongSearchInput";
import { toast } from "react-toastify";
import {
  FaMusic,
  FaUsers,
  FaLock,
  FaGlobe,
  FaArrowLeft,
  FaSave,
  FaStar,
  FaHeadphones,
} from "react-icons/fa";
import { useAssistantContext } from "../context/AssistantContext";

const EditGamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { updatePageContext } = useAssistantContext();

  const {
    game,
    isLoading: gameLoading,
    error: gameError,
  } = useGameWithState(gameId);
  const { updateGame, isLoading: updateLoading } = useUpdateGameWithState();

  // Update assistant context when game loads
  useEffect(() => {
    if (game) {
      updatePageContext({
        page: "EditGamePage",
        currentGameId: game._id,
        currentGameTitle: game.title,
      });
    }
    return () => {
      updatePageContext({ page: null, currentGameId: null, currentGameTitle: null });
    };
  }, [game, updatePageContext]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [guessTimeLimit, setGuessTimeLimit] = useState(15);
  const [guessInputMethod, setGuessInputMethod] = useState("freeText");
  const [error, setError] = useState("");
  // Populate form when game data is loaded
  useEffect(() => {
    if (game) {
      setTitle(game.title || "");
      setDescription(game.description || "");
      setIsPublic(game.isPublic || false);
      setGuessTimeLimit(game.guessTimeLimit || 15);
      setGuessInputMethod(game.guessInputMethod || "freeText");

      // Convert game songs to the format expected by SongSearchInput
      const formattedSongs =
        game.songs?.map((song) => ({
          title: song.title,
          artist: song.artist,
          correctAnswer: song.correctAnswer || song.title,
          correctAnswers: song.correctAnswers || [
            song.correctAnswer || song.title,
          ],
          previewUrl: song.previewUrl,
          artworkUrl: song.artworkUrl,
          trackId: song.trackId,
        })) || [];

      setSelectedSongs(formattedSongs);
    }
  }, [game]);

  // Handle song selection
  const handleSongSelect = (songData, isRemoval = false) => {
    if (isRemoval) {
      // If it's removal, songData is the new array
      setSelectedSongs(songData);
    } else {
      // If it's addition, songData is the new song
      setSelectedSongs((prev) => [...prev, songData]);
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");

    if (!title || selectedSongs.length === 0) {
      setError("Please provide a title and select at least one song.");
      return;
    }

    const gameData = {
      gameId,
      title,
      description,
      isPublic,
      guessTimeLimit,
      guessInputMethod,
      songs: selectedSongs.map((song) => ({
        title: song.title,
        artist: song.artist,
        correctAnswer: song.correctAnswer || song.title,
        correctAnswers: song.correctAnswers || [
          song.correctAnswer || song.title,
        ],
        previewUrl: song.previewUrl,
        artworkUrl: song.artworkUrl,
        trackId: song.trackId,
      })),
    };

    try {
      await updateGame(gameData);
      toast.success("Game updated successfully!");
      navigate("/mygames");
    } catch (err) {
      setError(err?.message || "Failed to update game.");
      toast.error("Failed to update game.");
    }
  };

  // Loading state
  if (gameLoading) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading game...</p>
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (gameError) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto py-10 px-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-600 text-lg font-semibold mb-4">
              {gameError?.data?.message || "Failed to load game."}
            </p>
            <button
              onClick={() => navigate("/mygames")}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300"
            >
              Back to My Games
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 py-8 sm:py-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4">
            <button
              onClick={() => navigate("/mygames")}
              className="flex items-center gap-2 text-purple-100 hover:text-white mb-4 sm:mb-6 transition-colors"
            >
              <FaArrowLeft />
              <span>Back to My Games</span>
            </button>
            <div className="text-center">
              <div className="mb-3 sm:mb-4">
                <span className="text-4xl sm:text-5xl">✏️</span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                Edit Your Music Game
              </h1>
              <p className="text-sm sm:text-xl text-purple-100 max-w-2xl mx-auto">
                Update your game details, modify songs, and perfect your music
                quiz experience
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-12">
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-center">
              <div className="flex items-center">
                <div className="bg-purple-600 text-white rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
                  1
                </div>
                <span className="hidden sm:inline ml-3 text-purple-600 font-semibold">
                  Game Details
                </span>
              </div>
              <div className="w-8 sm:w-16 h-1 bg-purple-200 rounded mx-2 sm:mx-3"></div>
              <div className="flex items-center">
                <div className="bg-purple-600 text-white rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
                  2
                </div>
                <span className="hidden sm:inline ml-3 text-purple-600 font-semibold">
                  Update Songs
                </span>
              </div>
              <div className="w-8 sm:w-16 h-1 bg-purple-200 rounded mx-2 sm:mx-3"></div>
              <div className="flex items-center">
                <div className="bg-purple-600 text-white rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
                  3
                </div>
                <span className="hidden sm:inline ml-3 text-purple-600 font-semibold">
                  Save Changes
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8 text-center">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={submitHandler} className="space-y-8">
            {/* Game Details Card */}
            <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-3 rounded-2xl">
                  <FaMusic className="text-purple-600 text-xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Game Details
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <label className="block text-gray-700 font-semibold mb-3">
                    Game Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter an exciting game title..."
                    className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-lg"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Choose a catchy title that will attract players
                  </p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-3">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Describe your game theme, difficulty, or special features..."
                    className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none text-lg"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  ></textarea>
                  <p className="text-sm text-gray-500 mt-2">
                    Help players understand what to expect
                  </p>
                </div>
              </div>

              {/* Game Settings */}
              <div className="mt-8 space-y-6">
                {/* Visibility Settings */}
                <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaUsers className="text-purple-600" />
                    Game Visibility
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={isPublic}
                        onChange={() => setIsPublic(true)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <div className="flex items-center gap-2">
                        <FaGlobe className="text-purple-600" />
                        <span className="font-medium text-gray-700">
                          Public
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Anyone can join
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={!isPublic}
                        onChange={() => setIsPublic(false)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <div className="flex items-center gap-2">
                        <FaLock className="text-gray-500" />
                        <span className="font-medium text-gray-700">
                          Private
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">Invite only</span>
                    </label>
                  </div>
                </div>

                {/* Guess Time Limit */}
                <div className="p-4 sm:p-6 bg-purple-50 rounded-2xl">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    ⏱️ Guess Time Limit
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="guessTime"
                        checked={guessTimeLimit === 15}
                        onChange={() => setGuessTimeLimit(15)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <span className="font-medium text-gray-700">
                        15 seconds
                      </span>
                      <span className="text-sm text-gray-500">
                        Quick & exciting
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="guessTime"
                        checked={guessTimeLimit === 30}
                        onChange={() => setGuessTimeLimit(30)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <span className="font-medium text-gray-700">
                        30 seconds
                      </span>
                      <span className="text-sm text-gray-500">Balanced</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="guessTime"
                        checked={guessTimeLimit === 45}
                        onChange={() => setGuessTimeLimit(45)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <span className="font-medium text-gray-700">
                        45 seconds
                      </span>
                      <span className="text-sm text-gray-500">Extended</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="guessTime"
                        checked={guessTimeLimit === 60}
                        onChange={() => setGuessTimeLimit(60)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <span className="font-medium text-gray-700">
                        60 seconds
                      </span>
                      <span className="text-sm text-gray-500">Relaxed</span>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    How long should players have to guess each song?
                  </p>
                </div>

                {/* Guess Input Method */}
                <div className="p-4 sm:p-6 bg-pink-50 rounded-2xl">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    ✏️ Guess Input Method
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="guessInputMethod"
                        checked={guessInputMethod === "freeText"}
                        onChange={() => setGuessInputMethod("freeText")}
                        className="w-5 h-5 text-purple-600 mt-1"
                      />
                      <div>
                        <span className="font-medium text-gray-700 block">
                          Free Text Input
                        </span>
                        <span className="text-sm text-gray-500">
                          Players can type their guess freely in a text field
                        </span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="guessInputMethod"
                        checked={guessInputMethod === "letterClick"}
                        onChange={() => setGuessInputMethod("letterClick")}
                        className="w-5 h-5 text-purple-600 mt-1"
                      />
                      <div>
                        <span className="font-medium text-gray-700 block">
                          Letter Clicking
                        </span>
                        <span className="text-sm text-gray-500">
                          Players click on letters to fill in dashes
                          representing the song name
                        </span>
                      </div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    Choose how players will input their guesses.
                  </p>
                </div>
              </div>
            </div>

            {/* Songs Card */}
            <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-pink-100 p-3 rounded-2xl">
                  <FaHeadphones className="text-pink-600 text-xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Update Songs
                </h2>
                {selectedSongs.length > 0 && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    {selectedSongs.length} song
                    {selectedSongs.length !== 1 ? "s" : ""} selected
                  </span>
                )}
              </div>

              <SongSearchInput
                onSongSelect={handleSongSelect}
                selectedSongs={selectedSongs}
              />

              {selectedSongs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FaMusic className="text-4xl mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No songs selected</p>
                  <p className="text-sm">Add songs to update your game</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate("/mygames")}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-8 rounded-2xl transition-all duration-300 text-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateLoading || !title || selectedSongs.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 text-lg flex items-center justify-center gap-3 disabled:cursor-not-allowed"
              >
                {updateLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Update Game
                  </>
                )}
              </button>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 sm:p-6 border border-purple-200">
              <div className="flex items-start gap-3">
                <FaStar className="text-purple-600 text-xl mt-1" />
                <div>
                  <h3 className="font-semibold text-purple-800 mb-2">
                    Pro Tips for Great Games
                  </h3>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Mix popular and lesser-known songs for variety</li>
                    <li>• Choose songs from different genres and eras</li>
                    <li>• Drag songs to reorder them as you like</li>
                    <li>• Aim for 5-10 songs for optimal game length</li>
                    <li>• Test your game with friends before sharing</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

    </PageLayout>
  );
};

export default EditGamePage;
