import { Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import Home from '../pages/Home'
import Profile from '../pages/Profile'
import NewMatch from '../pages/NewMatch'
import Matches from '../pages/Matches'
import MatchLive from '../pages/MatchLive'
import MockLiveMatchPage from '../pages/MockLiveMatchPage'

export const protectedRoutes = (
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<Home />} />
    <Route path="/profile/:userId" element={<Profile />} />
    <Route path="/matches/new" element={<NewMatch />} />
    <Route path="/matches/test-live" element={<MockLiveMatchPage />} />
    <Route path="/matches/:matchId" element={<MatchLive />} />
    <Route path="/matches" element={<Matches />} />
    <Route path="/tactics" element={<div className="p-8 text-on-surface">Tactical Board — Em construção</div>} />
    <Route path="/rankings" element={<div className="p-8 text-on-surface">League Table — Em construção</div>} />
    <Route path="/history" element={<div className="p-8 text-on-surface">History — Em construção</div>} />
    <Route path="/stats" element={<div className="p-8 text-on-surface">Player Stats — Em construção</div>} />
  </Route>
)
