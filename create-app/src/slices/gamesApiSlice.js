// src/slices/gamesApiSlice.js
import { apiSlice } from "./apiSlice";
import { GAMES_URL } from "../constants";

export const gamesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createGame: builder.mutation({
      query: (data) => ({
        url: `${GAMES_URL}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Game"], // ✅ רק כאן נכון להשתמש בזה
    }),
    myGames: builder.query({
      query: () => ({
        url: `${GAMES_URL}/mine`,
        method: "GET",
      }),
      providesTags: ["Game"], // ✅ מאפשר לזה להתעדכן כשנוצרים משחקים חדשים
    }),
    getGameById: builder.query({
      query: (gameId) => ({
        url: `${GAMES_URL}/${gameId}`,
        method: "GET",
      }),
      providesTags: (result, error, gameId) => [{ type: "Game", id: gameId }],
    }),
    updateGame: builder.mutation({
      query: ({ gameId, ...data }) => ({
        url: `${GAMES_URL}/${gameId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { gameId }) => [
        "Game",
        { type: "Game", id: gameId },
      ],
    }),
    deleteGame: builder.mutation({
      query: (gameId) => ({
        url: `${GAMES_URL}/${gameId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Game"], // ✅ מעדכן את הרשימה אחרי מחיקה
    }),
    searchSongs: builder.query({
      query: (term) => ({
        url: `${GAMES_URL}/search-songs?term=${encodeURIComponent(term)}`,
        method: "GET",
      }),
    }),
    getAnalytics: builder.query({
      query: () => ({
        url: `${GAMES_URL}/analytics`,
        method: "GET",
      }),
      providesTags: ["Game"], // Will refresh when games change
    }),
  }),
});

export const {
  useCreateGameMutation,
  useMyGamesQuery,
  useGetGameByIdQuery,
  useUpdateGameMutation,
  useDeleteGameMutation,
  useLazySearchSongsQuery,
  useGetAnalyticsQuery,
} = gamesApiSlice;
