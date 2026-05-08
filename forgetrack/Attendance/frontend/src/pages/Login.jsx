import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [isMentor, setIsMentor] = useState(true)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    
    const email = isMentor ? identifier : `${identifier}@forge.local`
    
    // Dev bypass for specific mentor credentials
    if (isMentor && identifier === 'nischay@theboringpeople.in' && password === 'password123') {
      localStorage.setItem('forgetrack_dev_user', JSON.stringify({
        id: 'dev-mentor-id',
        email: 'nischay@theboringpeople.in',
        role: 'mentor',
        display_name: 'Nischay B K (Dev)'
      }))
      setLoading(false)
      window.location.href = '/' // Force reload to pick up dev session
      return
    }

    // Dev bypass for specific student credentials
    if (!isMentor && identifier === '4SH24CS001' && password === '4SH24CS001') {
      localStorage.setItem('forgetrack_dev_user', JSON.stringify({
        id: 'dev-student-id',
        email: '4sh24cs001@forge.local',
        role: 'student',
        student_id: 1,
        display_name: 'Abhishek Sharma (Dev)'
      }))
      setLoading(false)
      window.location.href = '/'
      return
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        setError(signInError.message)
      } else {
        navigate('/')
      }
    } catch (err) {
      setError("Database error querying schema")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-void app-main px-4">
      <div className="card w-full max-w-[440px] p-12">
        <div className="flex flex-col items-center mb-10">
          <div className="w-8 h-8 rounded-md bg-accent-glow flex items-center justify-center mb-4">
            <span className="text-inverse text-body font-bold">F</span>
          </div>
          <h1 className="text-h2">ForgeTrack</h1>
          <p className="text-body-sm text-secondary mt-1">Sign in to your account</p>
        </div>

        <div className="flex p-1 bg-surface-inset rounded-lg mb-8">
          <button 
            className={`flex-1 py-2 text-body-sm rounded-md transition-colors ${isMentor ? 'bg-surface-raised text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
            onClick={() => setIsMentor(true)}
          >
            Mentor Login
          </button>
          <button 
            className={`flex-1 py-2 text-body-sm rounded-md transition-colors ${!isMentor ? 'bg-surface-raised text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
            onClick={() => setIsMentor(false)}
          >
            Student Login
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-label text-secondary mb-2">{isMentor ? 'EMAIL' : 'USN'}</label>
            <input 
              type={isMentor ? 'email' : 'text'}
              className="input"
              placeholder={isMentor ? 'name@example.com' : '4SH24CS001'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-label text-secondary mb-2">PASSWORD</label>
            <input 
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-caption text-danger-fg text-center">
            {error}
          </div>
        )}

        <button 
          className="btn-primary w-full flex justify-center items-center"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}
