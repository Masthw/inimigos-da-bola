import { Routes, Route } from 'react-router-dom'
import NotFound from '../pages/NotFound'
import { publicRoutes } from './public'
import { protectedRoutes } from './protected'

export function AppRoutes() {
  return (
    <Routes>
      {publicRoutes}
      {protectedRoutes}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
