import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function StudentAttendance() {
  const { userRecord } = useAuth()
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userRecord?.student_id) {
      loadData(userRecord.student_id)
    }
  }, [userRecord])

  async function loadData(studentId) {
    setLoading(true)
    
    const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single()
    if (student) setProfile(student)

    const { data: attData } = await supabase
      .from('attendance')
      .select('present, sessions(date, topic, duration_hours)')
      .eq('student_id', studentId)
      .order('sessions(date)', { ascending: false })

    if (attData) {
      const total = attData.length
      const presentCount = attData.filter(a => a.present).length
      const pct = total > 0 ? (presentCount / total) * 100 : 0
      
      let currentStreak = 0
      for (const a of attData) {
        if (a.present) currentStreak++
        else break
      }

      setHistory({
        records: attData,
        total,
        presentCount,
        pct,
        currentStreak
      })
    }
    setLoading(false)
  }

  if (loading) return <div className="animate-pulse bg-surface-inset h-64 rounded-xl"></div>

  return (
    <div className="space-y-6">
      <h1 className="text-h1">My Attendance</h1>

      {profile && history ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card col-span-1">
              <div className="text-label text-tertiary mb-4">PROFILE</div>
              <h2 className="text-display-sm mb-1">{profile.name}</h2>
              <div className="font-mono text-secondary text-body mb-6">{profile.usn}</div>
              <div className="flex gap-2 mb-8">
                <span className="pill bg-surface-inset border-border-subtle text-secondary">{profile.branch_code}</span>
                <span className="pill bg-surface-inset border-border-subtle text-secondary">{profile.batch}</span>
              </div>
              <div className="text-label text-tertiary mb-2">OVERALL ATTENDANCE</div>
              <div className={`text-display-md tabular-nums ${history.pct >= 75 ? 'text-success-fg' : history.pct >= 60 ? 'text-warning-fg' : 'text-danger-fg'}`}>
                {Math.round(history.pct)}%
              </div>
              <div className="text-body-sm text-secondary mt-1">{history.presentCount} of {history.total} sessions</div>
            </div>

            <div className="card col-span-1 md:col-span-2">
              <div className="text-label text-tertiary mb-4">HEATMAP</div>
              <div className="flex flex-wrap gap-2 mb-8">
                {[...history.records].reverse().map((r, i) => (
                  <div 
                    key={i} 
                    title={`${r.sessions.date} - ${r.present ? 'Present' : 'Absent'}`}
                    className={`w-8 h-8 rounded-md border ${r.present ? 'bg-success-bg border-success-border' : 'bg-danger-bg border-danger-border'}`}
                  ></div>
                ))}
              </div>
              
              <div className="flex gap-8 border-t border-border-subtle pt-6">
                <div>
                  <div className="text-label text-tertiary mb-1">CURRENT STREAK</div>
                  <div className="text-h2 tabular-nums">{history.currentStreak}</div>
                </div>
                <div>
                  <div className="text-label text-tertiary mb-1">TOTAL SESSIONS</div>
                  <div className="text-h2 tabular-nums">{history.total}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="text-left p-4 text-tertiary text-label">Date</th>
                  <th className="text-left p-4 text-tertiary text-label">Topic</th>
                  <th className="text-left p-4 text-tertiary text-label">Duration</th>
                  <th className="text-left p-4 text-tertiary text-label">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {history.records.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-raised">
                    <td className="p-4 font-mono text-secondary text-body-sm">{r.sessions.date}</td>
                    <td className="p-4 font-medium text-body">{r.sessions.topic}</td>
                    <td className="p-4 text-secondary text-body-sm">{r.sessions.duration_hours} hrs</td>
                    <td className="p-4">
                      {r.present ? (
                        <span className="pill pill-success">Present</span>
                      ) : (
                        <span className="pill pill-danger">Absent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card text-center py-16 text-secondary">
          Could not load attendance data.
        </div>
      )}
    </div>
  )
}
