import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import DevTokens from './pages/DevTokens'
import Login from './pages/Login'
import Forbidden from './pages/Forbidden'
import AppShell from './components/AppShell'
import RoleGuard from './components/RoleGuard'

// Mentor Pages
import Dashboard from './pages/Dashboard'
import MarkAttendance from './pages/MarkAttendance'
import StudentHistory from './pages/StudentHistory'
import Materials from './pages/Materials'
import UploadCSV from './pages/UploadCSV'

// Student Pages
import StudentAttendance from './pages/StudentAttendance'
import StudentUpcoming from './pages/StudentUpcoming'
import StudentMaterials from './pages/StudentMaterials'



function RootRedirect() {
  const { userRecord, loading } = useAuth()
  if (loading) return null
  if (!userRecord) return <Navigate to="/login" replace />
  if (userRecord.role === 'mentor') return <Navigate to="/dashboard" replace />
  if (userRecord.role === 'student') return <Navigate to="/me/attendance" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="/dev-tokens" element={<DevTokens />} />
        
        <Route path="/" element={<RootRedirect />} />
        
        <Route element={<AppShell />}>
          {/* Mentor Routes */}
          <Route path="/dashboard" element={<RoleGuard allowedRoles={['mentor']}><Dashboard /></RoleGuard>} />
          <Route path="/attendance" element={<RoleGuard allowedRoles={['mentor']}><MarkAttendance /></RoleGuard>} />
          <Route path="/history" element={<RoleGuard allowedRoles={['mentor']}><StudentHistory /></RoleGuard>} />
          <Route path="/materials" element={<RoleGuard allowedRoles={['mentor']}><Materials /></RoleGuard>} />
          <Route path="/upload" element={<RoleGuard allowedRoles={['mentor']}><UploadCSV /></RoleGuard>} />

          {/* Student Routes */}
          <Route path="/me/attendance" element={<RoleGuard allowedRoles={['student']}><StudentAttendance /></RoleGuard>} />
          <Route path="/me/upcoming" element={<RoleGuard allowedRoles={['student']}><StudentUpcoming /></RoleGuard>} />
          <Route path="/me/materials" element={<RoleGuard allowedRoles={['student']}><StudentMaterials /></RoleGuard>} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
