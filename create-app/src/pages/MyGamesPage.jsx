// src/pages/MyGames.jsx
import React, { useState } from "react";
import { useGamesWithState, useDeleteGameWithState } from "../hooks/useGames";
import PageLayout from "../components/PageLayout";
import {
  FaHeadphones,
  FaTrashAlt,
  FaEdit,
  FaPlay,
  FaTimes,
  FaCheck,
  FaGlobe,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAssistantContext } from "../context/AssistantContext";

const MyGames = () => {
  const { games, isLoading, error } = useGamesWithState();
  const { deleteGame } = useDeleteGameWithState();
  const navigate = useNavigate();
  const { updatePageContext } = useAssistantContext();

  // Set page context for assistant
  React.useEffect(() => {
    updatePageContext({ page: "MyGamesPage", currentGameId: null, currentGameTitle: null });
    return () => updatePageContext({ page: null });
  }, [updatePageContext]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gameToDelete, setGameToDelete] = useState(null);

  const handleDeleteClick = (game) => {
    setGameToDelete(game);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteGame(gameToDelete._id);
      toast.success("Game deleted successfully!");
      setShowDeleteModal(false);
      setGameToDelete(null);
    } catch (error) {
      toast.error("Failed to delete game");
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setGameToDelete(null);
  };

  const handleEditClick = (gameId) => {
    navigate(`/edit-game/${gameId}`);
  };

  return (
    <PageLayout>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-red-200">
            <div className="text-center">
              <div className="text-6xl mb-4">🗑️</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Delete Game?
              </h3>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete
              </p>
              <p className="text-lg font-semibold text-red-600 mb-6">
                "{gameToDelete?.title}"?
              </p>
              <p className="text-sm text-gray-500 mb-8">
                This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FaTimes />
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FaCheck />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              🎵 My Music Games
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Manage your music games, edit details, and launch exciting
              sessions
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600 text-lg">Loading your games...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4">❌</div>
              <p className="text-red-600 text-lg font-semibold">
                {error?.data?.message || "Failed to load games."}
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && games?.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center shadow-lg border border-gray-100">
              <div className="text-8xl mb-6">🎵</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                No Games Yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                You haven't created any music games yet. Start creating your
                first game to get the party started!
              </p>
              <button
                onClick={() => navigate("/create")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Create Your First Game
              </button>
            </div>
          )}

          {/* Games Grid */}
          {!isLoading && games && games.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {games.map((game) => (
                <div
                  key={game._id}
                  className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {/* Game Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold text-gray-800 leading-tight">
                        {game.title}
                      </h3>
                      {game.source === "ai" && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          AI
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        game.isPublic
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {game.isPublic ? "🌍 Public" : "🔒 Private"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {game.description || "No description provided."}
                  </p>

                  {/* Song Count */}
                  <div className="flex items-center gap-2 mb-8 text-purple-600">
                    <FaHeadphones className="text-lg" />
                    <span className="font-semibold">
                      {game.songs.length} song{game.songs.length !== 1 && "s"}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEditClick(game._id)}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                    >
                      <FaEdit />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(game)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                    >
                      <FaTrashAlt />
                      Delete
                    </button>
                    <button
                      onClick={() => navigate(`/launch/${game._id}`)}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                    >
                      <FaPlay />
                      Play
                    </button>
                  </div>

                  {/* Online Availability Toggle */}
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
                        game.isPublic
                          ? "bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30"
                          : "bg-gray-500 bg-opacity-20 text-gray-400 border border-gray-500 border-opacity-30"
                      }`}
                    >
                      <FaGlobe />
                      {game.isPublic
                        ? "Available in Online Lobby"
                        : "Not available online (set Public to enable)"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default MyGames;
