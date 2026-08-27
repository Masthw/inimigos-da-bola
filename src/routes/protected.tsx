import { Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { GroupGuard } from "./GroupGuard";
import { GroupContextProvider } from "../contexts/GroupContextProvider";
import Home from "../pages/Home";
import Profile from "../pages/Profile";
import Tactics from "../pages/Tactics";
import NewMatch from "../pages/NewMatch";
import Matches from "../pages/Matches";
import MatchLive from "../pages/MatchLive";
import MatchReview from "../pages/MatchReview";
import VoteMatch from "../pages/VoteMatch";
import Rankings from "../pages/Rankings";
import GroupOnboarding from "../pages/GroupOnboarding";
import GroupManagement from "../pages/GroupManagement";
import MatchPlayersManagement from "../pages/MatchPlayersManagement";

export const protectedRoutes = (
  <Route element={<ProtectedRoute />}>
    <Route element={<GroupContextProvider />}>
      <Route path="/group" element={<GroupOnboarding />} />
      <Route path="/group/management" element={<GroupManagement />} />
      <Route element={<GroupGuard />}>
        <Route path="/" element={<Home />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/matches/new" element={<NewMatch />} />
        <Route path="/matches/:matchId/review" element={<MatchReview />} />
        <Route path="/matches/:matchId/vote" element={<VoteMatch />} />
        <Route path="/matches/:matchId/players" element={<MatchPlayersManagement />} />
        <Route path="/matches/:matchId" element={<MatchLive />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/tactics" element={<Tactics />} />
        <Route path="/rankings" element={<Rankings />} />
      </Route>
    </Route>
  </Route>
);
