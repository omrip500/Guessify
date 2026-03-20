import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CreateGamePage from "./pages/CreateGamePage";
import EditGamePage from "./pages/EditGamePage";
import MyGamesPage from "./pages/MyGamesPage";
import LaunchGamePage from "./pages/LaunchGamePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import FinalLeaderboardPage from "./pages/FinalLeaderboardPage";
import PlayOnlinePage from "./pages/PlayOnlinePage";
import FriendsPage from "./pages/FriendsPage";
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";

import PrivateRoute from "./components/PrivateRoute";
import RedirectIfLoggedIn from "./components/RedirectIfLoggedIn";
import ScrollToTop from "./components/ScrollToTop";
import AssistantChat from "./components/AssistantChat";
import GameInviteNotification from "./components/GameInviteNotification";
import NotFoundPage from "./pages/NotFoundPage";
import { AssistantProvider } from "./context/AssistantContext";

// Guessify - Authenticated product hub
function App() {
  return (
    <AssistantProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Authentication Routes - Redirect to dashboard if already logged in */}
          <Route element={<RedirectIfLoggedIn redirectTo="/dashboard" />}>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected Routes - All require authentication */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/play-online" element={<PlayOnlinePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/create" element={<CreateGamePage />} />
            <Route path="/edit-game/:gameId" element={<EditGamePage />} />
            <Route path="/mygames" element={<MyGamesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/launch/:gameId" element={<LaunchGamePage />} />
            <Route path="/final-leaderboard" element={<FinalLeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<UserProfilePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <AssistantChat />
        <GameInviteNotification />
      </Router>
    </AssistantProvider>
  );
}

export default App;
