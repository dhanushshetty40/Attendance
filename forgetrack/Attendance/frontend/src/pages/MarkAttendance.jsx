import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function MarkAttendance() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [session, setSession] = useState(null)
  const [students, setStudents] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [isExisting, setIsExisting] = useState(false)
  
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(2.0)
  const [sessionType, setSessionType] = useState('offline')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  const navigate = useNavigate()
  const { userRecord } = useAuth()

  useEffect(() => {
    fetchDataForDate(date)
  }, [date])

  async function fetchDataForDate(selectedDate) {
    setLoading(true)
    setSession(null)
    setIsExisting(false)
    setTopic('')
    
    const { data: studentsData } = await supabase.from('students').select('*').eq('is_active', true).order('name')
    setStudents(studentsData || [])
    
    const { data: sessionData } = await supabase.from('sessions').select('*').eq('date', selectedDate).single()
    
    const newAttMap = {}
    studentsData?.forEach(s => newAttMap[s.id] = false) 

    if (sessionData) {
      setSession(sessionData)
      const { data: attData } = await supabase.from('attendance').select('*').eq('session_id', sessionData.id)
      if (attData && attData.length > 0) {
        setIsExisting(true)
        attData.forEach(a => {
          newAttMap[a.student_id] = a.present
        })
      }
    }
    
    setAttendanceMap(newAttMap)
    setLoading(false)
  }

  const toggleStudent = (id) => {
    setAttendanceMap(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const markAll = (present) => {
    const newMap = {}
    students.forEach(s => newMap[s.id] = present)
    setAttendanceMap(newMap)
  }

  const handleSaveClick = () => {
    if (isExisting) {
      setShowConfirm(true)
    } else {
      saveData()
    }
  }

  const saveData = async () => {
    setShowConfirm(false)
    setSaving(true)
    
    let currentSessionId = session?.id
    
    if (!currentSessionId) {
      const { data: newSession, error: sessErr } = await supabase.from('sessions').insert({
        date,
        topic,
        month_number: new Date(date).getMonth() + 1,
        duration_hours: duration,
        session_type: sessionType
      }).select().single()
      
      if (sessErr) {
        alert("Failed to create session: " + sessErr.message)
        setSaving(false)
        return
      }
      currentSessionId = newSession.id
    }
    
    const rows = students.map(s => ({
      student_id: s.id,
      session_id: currentSessionId,
      present: attendanceMap[s.id],
      marked_by: userRecord?.display_name || 'system'
    }))
    
    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,session_id' })
    
    setSaving(false)
    if (!error) {
      navigate('/dashboard')
    } else {
      alert("Failed to save attendance: " + error.message)
    }
  }

  const presentCount = Object.values(attendanceMap).filter(Boolean).length
  const absentCount = students.length - presentCount
  
  const maxDate = new Date().toISOString().split('T')[0]
  const minDate = '2025-08-04'

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      <h1 className="text-h1">Mark Attendance</h1>
      
      <div className="card">
        <label className="block text-label text-secondary mb-2">DATE</label>
        <input 
          type="date" 
          className="input w-auto mb-4 bg-surface" 
          value={date} 
          max={maxDate}
          min={minDate}
          onChange={e => setDate(e.target.value)}
        />
        
        {loading ? (
          <div className="animate-pulse h-10 bg-surface-inset rounded"></div>
        ) : session ? (
          <div className="p-4 rounded-lg bg-surface-inset border border-border-default">
            <div className="text-body font-medium">{session.topic}</div>
            <div className="text-caption text-secondary mt-1">{session.duration_hours} HRS • {session.session_type.toUpperCase()}</div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-surface-inset border border-border-default space-y-4">
            <h3 className="text-h3">Create Session</h3>
            <div>
              <label className="block text-label text-secondary mb-1">TOPIC</label>
              <input type="text" className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. React Fundamentals" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-label text-secondary mb-1">DURATION (HRS)</label>
                <input type="number" step="0.5" className="input" value={duration} onChange={e => setDuration(parseFloat(e.target.value))} />
              </div>
              <div className="flex-1">
                <label className="block text-label text-secondary mb-1">TYPE</label>
                <select className="input" value={sessionType} onChange={e => setSessionType(e.target.value)}>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface">
          <div className="text-h3">Students</div>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => markAll(true)}>All Present</button>
            <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => markAll(false)}>All Absent</button>
          </div>
        </div>
        
        <div className="divide-y divide-border-subtle max-h-[60vh] overflow-y-auto">
          {students.map(s => (
            <label key={s.id} className="flex items-center px-6 py-4 hover:bg-surface-raised cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-border-strong bg-surface-inset checked:bg-accent-glow focus:ring-accent-glow mr-4"
                checked={attendanceMap[s.id] || false}
                onChange={() => toggleStudent(s.id)}
              />
              <div className="flex-1">
                <div className="text-body font-medium">{s.name}</div>
                <div className="text-caption text-secondary font-mono mt-0.5">{s.usn}</div>
              </div>
              <span className="pill bg-surface-inset border border-border-default text-tertiary">{s.branch_code}</span>
            </label>
          ))}
          {students.length === 0 && !loading && (
            <div className="p-8 text-center text-secondary">No active students found.</div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 md:left-[260px] right-0 bg-surface/90 backdrop-blur border-t border-border-subtle p-4 flex justify-between items-center z-20">
        <div className="text-body tabular-nums">
          <span className="text-success-fg font-medium">{presentCount} Present</span>
          <span className="text-tertiary mx-2">•</span>
          <span className="text-danger-fg font-medium">{absentCount} Absent</span>
        </div>
        <button 
          className="btn-primary"
          onClick={handleSaveClick}
          disabled={saving || (!session && !topic)}
        >
          {saving ? 'Saving...' : isExisting ? 'Update Attendance' : 'Save Attendance'}
        </button>
      </div>

      {showConfirm && (
        <div className="modal-overlay flex items-center justify-center z-50">
          <div className="modal">
            <h2 className="text-h2 mb-2">Update Existing Attendance?</h2>
            <p className="text-body-lg text-secondary mb-8">
              Attendance has already been marked for this session. Are you sure you want to overwrite it?
            </p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-primary bg-danger-fg text-white hover:bg-red-600 border-none" onClick={saveData}>Overwrite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
