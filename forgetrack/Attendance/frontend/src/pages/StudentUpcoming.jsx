import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar } from 'lucide-react'

export default function StudentUpcoming() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUpcoming() {
      const todayDate = new Date()
      const futureDate = new Date()
      futureDate.setDate(todayDate.getDate() + 14)
      
      const todayStr = todayDate.toISOString().split('T')[0]
      const futureStr = futureDate.toISOString().split('T')[0]

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', todayStr)
        .lte('date', futureStr)
        .order('date', { ascending: true })

      setSessions(data || [])
      setLoading(false)
    }
    loadUpcoming()
  }, [])

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-h1 mb-6">Upcoming Sessions</h1>
      
      <p className="text-body text-secondary mb-8">
        Showing scheduled sessions for the next 14 days.
      </p>

      {loading ? (
        <div className="space-y-4">
          <div className="animate-pulse bg-surface-inset h-24 rounded-xl"></div>
          <div className="animate-pulse bg-surface-inset h-24 rounded-xl"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="mx-auto text-tertiary mb-4" size={32} />
          <h3 className="text-h3 text-secondary">No upcoming sessions</h3>
          <p className="text-body text-tertiary mt-2">There are no sessions scheduled for the next 14 days.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(s => {
            const dateObj = new Date(s.date)
            const day = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
            const dayNum = dateObj.toLocaleDateString('en-US', { day: 'numeric' })
            const month = dateObj.toLocaleDateString('en-US', { month: 'short' })
            
            return (
              <div key={s.id} className="card flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-surface-inset border border-border-default flex flex-col items-center justify-center">
                  <div className="text-caption text-danger-fg font-bold uppercase">{month}</div>
                  <div className="text-h3 tabular-nums">{dayNum}</div>
                </div>
                
                <div className="flex-1">
                  <div className="text-caption text-tertiary mb-1 font-mono uppercase">{day}</div>
                  <h3 className="text-h3 mb-2">{s.topic}</h3>
                  <div className="flex gap-2">
                    <span className="pill bg-surface-inset text-secondary border-border-subtle">{s.session_type.toUpperCase()}</span>
                    <span className="pill bg-surface-inset text-secondary border-border-subtle">{s.duration_hours} HRS</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
