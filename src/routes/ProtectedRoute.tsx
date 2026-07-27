import { Navigate, Outlet } from 'react-router-dom'

function useAuth() {
  return localStorage.getItem('token') !== null
}

export function ProtectedRoute() {
  const isAuth = useAuth()

  if (!isAuth) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
