import { apiSlice } from "./apiSlice";
import { STATS_URL } from "../constants";

export const statsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyStats: builder.query({
      query: () => ({
        url: `${STATS_URL}/me`,
        method: "GET",
      }),
    }),
    getLeaderboard: builder.query({
      query: () => ({
        url: `${STATS_URL}/leaderboard`,
        method: "GET",
      }),
    }),
    getFriendsLeaderboard: builder.query({
      query: () => ({
        url: `${STATS_URL}/friends-leaderboard`,
        method: "GET",
      }),
    }),
    getUserStats: builder.query({
      query: (userId) => ({
        url: `${STATS_URL}/user/${userId}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetMyStatsQuery,
  useGetLeaderboardQuery,
  useGetFriendsLeaderboardQuery,
  useGetUserStatsQuery,
} = statsApiSlice;
