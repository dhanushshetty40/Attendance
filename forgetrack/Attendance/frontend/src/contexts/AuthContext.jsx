import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [userRecord, setUserRecord] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      // Check for dev bypass first
      const devUser = localStorage.getItem('forgetrack_dev_user')
      if (devUser) {
        try {
          setUserRecord(JSON.parse(devUser))
          setSession({ user: { id: 'dev-id' } })
          setLoading(false)
          return
        } catch (e) {
          localStorage.removeItem('forgetrack_dev_user')
        }
      }

      try {
        if (!supabase) {
          console.warn("Supabase client not initialized. Check environment variables.")
          setLoading(false)
          return
        }
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)

        if (session) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (!error && data) {
            setUserRecord(data)
          } else {
            // Fallback to metadata
            setUserRecord({
              id: session.user.id,
              role: session.user.user_metadata?.role,
              display_name: session.user.user_metadata?.display_name,
              student_id: session.user.user_metadata?.student_id
            })
          }
        } else {
          setUserRecord(null)
        }
      } catch (err) {
        console.error("Error fetching user session:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          const isDev = localStorage.getItem('forgetrack_dev_user')
          if (!isDev) {
            setSession(null)
            setUserRecord(null)
            setLoading(false)
          }
        } else {
          // Re-fetch user on login
          fetchUser()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, userRecord, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
