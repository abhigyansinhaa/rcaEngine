import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth()
  const loc = useLocation()

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-slate-500" role="status">
        Loading…
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: loc }} replace />
  }

  return <>{children}</>
}
