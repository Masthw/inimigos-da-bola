import { Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import Home from '../pages/Home'
import Profile from '../pages/Profile'

export const protectedRoutes = (
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<Home />} />
    <Route path="/profile/:userId" element={<Profile />} />
    <Route path="/matches" element={<div className="p-8 text-on-surface">My Matches — Em construção</div>} />
    <Route path="/tactics" element={<div className="p-8 text-on-surface">Tactical Board — Em construção</div>} />
    <Route path="/rankings" element={<div className="p-8 text-on-surface">League Table — Em construção</div>} />
    <Route path="/history" element={<div className="p-8 text-on-surface">History — Em construção</div>} />
    <Route path="/stats" element={<div className="p-8 text-on-surface">Player Stats — Em construção</div>} />
  </Route>
)
