import { Routes, Route } from 'react-router-dom'
import { publicRoutes } from './public'
import { protectedRoutes } from './protected'

export function AppRoutes() {
  return (
    <Routes>
      {publicRoutes}
      {protectedRoutes}
      <Route path="*" element={<div className="p-8 text-on-surface">404 — Página não encontrada</div>} />
    </Routes>
  )
}
