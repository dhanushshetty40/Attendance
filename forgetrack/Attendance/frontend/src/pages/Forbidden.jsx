import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Forbidden() {
  const navigate = useNavigate()
  const { userRecord } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-void app-main px-4">
      <div className="card max-w-md text-center p-12">
        <h1 className="text-display-sm text-danger-fg mb-4">403</h1>
        <h2 className="text-h2 mb-2">Access Denied</h2>
        <p className="text-body text-secondary mb-8">
          You don't have permission to view this page.
        </p>
        <button 
          className="btn-secondary"
          onClick={() => {
            if (userRecord?.role === 'mentor') navigate('/dashboard')
            else if (userRecord?.role === 'student') navigate('/me/attendance')
            else navigate('/login')
          }}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}
