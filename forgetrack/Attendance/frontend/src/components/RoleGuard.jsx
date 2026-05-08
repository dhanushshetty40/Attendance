import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RoleGuard({ allowedRoles, children }) {
  const { userRecord, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-secondary text-body">Loading...</div>
      </div>
    )
  }

  if (!userRecord) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(userRecord.role)) {
    return <Navigate to="/403" replace />
  }

  return children
}
