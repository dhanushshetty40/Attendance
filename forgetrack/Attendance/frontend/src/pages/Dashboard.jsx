import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Users, Percent, Clock, Activity, AlertCircle } from 'lucide-react'

const CardSkeleton = () => <div className="animate-pulse bg-surface-inset h-32 rounded-xl"></div>
const TickerSkeleton = () => <div className="animate-pulse bg-surface-inset h-12 w-32 rounded-md"></div>

function TickerStrip() {
  const [stats, setStats] = useState({ totalSessions: 0, overallPct: 0, activeStudents: 0, lastDate: '—' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { count: sessionCount } = await supabase.from('sessions').select('*', { count: 'exact', head: true })
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true)
      const { data: attendanceData } = await supabase.from('attendance').select('present')
      
      let pct = 0
      if (attendanceData && attendanceData.length > 0) {
        const presentCount = attendanceData.filter(a => a.present).length
        pct = Math.round((presentCount / attendanceData.length) * 100)
      }
      
      const { data: lastSession } = await supabase.from('sessions').select('date').order('date', { ascending: false }).limit(1).single()
      
      setStats({
        totalSessions: sessionCount || 0,
        overallPct: pct,
        activeStudents: studentCount || 0,
        lastDate: lastSession ? lastSession.date : '—'
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return <div className="flex gap-4 mb-8 overflow-x-auto pb-2"><TickerSkeleton/><TickerSkeleton/><TickerSkeleton/><TickerSkeleton/></div>

  return (
    <div className="flex items-center gap-6 mb-8 overflow-x-auto pb-2 whitespace-nowrap">
      <div className="flex items-center gap-3">
        <Calendar size={20} className="text-secondary" />
        <div>
          <div className="text-caption text-tertiary">TOTAL SESSIONS</div>
          <div className="text-body-lg font-semibold tabular-nums">{stats.totalSessions}</div>
        </div>
      </div>
      <div className="w-px h-8 bg-border-subtle shrink-0"></div>
      <div className="flex items-center gap-3">
        <Percent size={20} className="text-secondary" />
        <div>
          <div className="text-caption text-tertiary">OVERALL ATTENDANCE</div>
          <div className="text-body-lg font-semibold tabular-nums">{stats.overallPct}%</div>
        </div>
      </div>
      <div className="w-px h-8 bg-border-subtle shrink-0"></div>
      <div className="flex items-center gap-3">
        <Users size={20} className="text-secondary" />
        <div>
          <div className="text-caption text-tertiary">ACTIVE STUDENTS</div>
          <div className="text-body-lg font-semibold tabular-nums">{stats.activeStudents}</div>
        </div>
      </div>
      <div className="w-px h-8 bg-border-subtle shrink-0"></div>
      <div className="flex items-center gap-3">
        <Clock size={20} className="text-secondary" />
        <div>
          <div className="text-caption text-tertiary">LAST SESSION</div>
          <div className="text-body-lg font-semibold tabular-nums">{stats.lastDate}</div>
        </div>
      </div>
    </div>
  )
}

function TodaysSessionCard() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchToday() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('sessions').select('*').eq('date', today).single()
      setSession(data)
      setLoading(false)
    }
    fetchToday()
  }, [])

  if (loading) return <CardSkeleton />

  return (
    <div className="card h-full flex flex-col justify-between">
      <div>
        <div className="text-label text-tertiary mb-2">TODAY'S SESSION</div>
        {session ? (
          <>
            <h3 className="text-display-sm mb-4 truncate">{session.topic}</h3>
            <div className="flex gap-2">
              <span className="pill pill-success">{session.session_type.toUpperCase()}</span>
              <span className="pill bg-surface-raised border border-border-default text-primary">{session.duration_hours} HRS</span>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-h3 text-secondary mb-4">No session scheduled for today</h3>
            <button className="btn-primary" onClick={() => navigate('/attendance')}>Create Session</button>
          </>
        )}
      </div>
    </div>
  )
}

function TodaysAttendanceCard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      const today = new Date().toISOString().split('T')[0]
      const { data: session } = await supabase.from('sessions').select('id').eq('date', today).single()
      if (!session) {
        setData(null)
        setLoading(false)
        return
      }

      const { data: attendance, error } = await supabase
        .from('attendance')
        .select('present, students(name)')
        .eq('session_id', session.id)

      if (error || !attendance || attendance.length === 0) {
        setData({ marked: false })
      } else {
        const present = attendance.filter(a => a.present).length
        const total = attendance.length
        const absentList = attendance.filter(a => !a.present).map(a => a.students.name)
        setData({ marked: true, present, total, absentList })
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <CardSkeleton />

  if (!data) {
    return (
      <div className="card h-full flex flex-col justify-center items-center text-center">
        <AlertCircle size={32} className="text-tertiary mb-4" />
        <p className="text-body text-secondary">No session today to mark attendance for.</p>
      </div>
    )
  }

  if (!data.marked) {
    return (
      <div className="card h-full flex flex-col justify-center items-center text-center">
        <div className="text-body text-secondary mb-4">Attendance not yet marked for today.</div>
        <button className="btn-primary" onClick={() => navigate('/attendance')}>Mark Attendance</button>
      </div>
    )
  }

  const pct = Math.round((data.present / data.total) * 100)

  return (
    <div className="card h-full">
      <div className="text-label text-tertiary mb-2">TODAY'S ATTENDANCE</div>
      <div className="flex items-end gap-4 mb-4">
        <div className="text-display-md tabular-nums">{data.present} <span className="text-h3 text-secondary font-normal">/ {data.total}</span></div>
        <div className={`text-h3 pb-1 tabular-nums ${pct >= 75 ? 'text-success-fg' : pct >= 60 ? 'text-warning-fg' : 'text-danger-fg'}`}>{pct}%</div>
      </div>
      <div className="h-2 w-full bg-surface-inset rounded-full overflow-hidden mb-4 border border-border-subtle">
        <div className={`h-full transition-all duration-1000 ${pct >= 75 ? 'bg-success-fg' : pct >= 60 ? 'bg-warning-fg' : 'bg-danger-fg'}`} style={{ width: `${pct}%` }}></div>
      </div>
      {data.absentList.length > 0 && (
        <div>
          <div className="text-caption text-tertiary mb-1">ABSENT TODAY</div>
          <div className="text-body-sm text-secondary truncate">
            {data.absentList.slice(0, 5).join(', ')}
            {data.absentList.length > 5 && ` and ${data.absentList.length - 5} more`}
          </div>
        </div>
      )}
    </div>
  )
}

function ProgramOverviewCard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data: students } = await supabase.from('students').select('id, name').eq('is_active', true)
      const { count: totalSessions } = await supabase.from('sessions').select('*', { count: 'exact', head: true })
      const { data: attendance } = await supabase.from('attendance').select('student_id, present')

      if (!students || !attendance) {
        setLoading(false)
        return
      }

      const studentStats = students.map(s => {
        const studentAtt = attendance.filter(a => a.student_id === s.id)
        const pres = studentAtt.filter(a => a.present).length
        const total = studentAtt.length
        return { name: s.name, pct: total > 0 ? (pres / total) * 100 : 0 }
      })

      if (studentStats.length > 0) {
        studentStats.sort((a, b) => b.pct - a.pct)
        const highest = studentStats[0]
        const lowest = studentStats[studentStats.length - 1]
        
        setStats({
          totalSessions,
          highest,
          lowest
        })
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return <CardSkeleton />

  if (!stats) return <div className="card"><p>No data</p></div>

  return (
    <div className="card">
      <div className="text-label text-tertiary mb-4">PROGRAM OVERVIEW</div>
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-border-subtle pb-2">
          <span className="text-body text-secondary">Total Sessions</span>
          <span className="text-body font-medium tabular-nums">{stats.totalSessions}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border-subtle pb-2">
          <span className="text-body text-secondary">Highest Attendance</span>
          <div className="text-right">
            <div className="text-body font-medium">{stats.highest.name}</div>
            <div className="text-caption text-success-fg tabular-nums">{Math.round(stats.highest.pct)}%</div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-body text-secondary">Lowest Attendance</span>
          <div className="text-right">
            <div className="text-body font-medium">{stats.lowest.name}</div>
            <div className="text-caption text-danger-fg tabular-nums">{Math.round(stats.lowest.pct)}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecentActivityCard() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivity() {
      const { data } = await supabase
        .from('attendance')
        .select('marked_at, marked_by, sessions(date, topic)')
        .order('marked_at', { ascending: false })
        .limit(20)

      if (data) {
        const unique = []
        const seen = new Set()
        for (const row of data) {
          const key = row.sessions?.date
          if (!seen.has(key)) {
            seen.add(key)
            unique.push({
              action: `Attendance marked for ${row.sessions?.topic}`,
              time: new Date(row.marked_at).toLocaleString(),
              by: row.marked_by
            })
          }
        }
        setActivity(unique.slice(0, 5))
      }
      setLoading(false)
    }
    fetchActivity()
  }, [])

  if (loading) return <CardSkeleton />

  return (
    <div className="card">
      <div className="text-label text-tertiary mb-4">RECENT ACTIVITY</div>
      {activity.length === 0 ? (
        <p className="text-body text-secondary">No recent activity.</p>
      ) : (
        <div className="space-y-4">
          {activity.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1"><Activity size={16} className="text-accent-glow" /></div>
              <div>
                <div className="text-body-sm text-primary">{item.action}</div>
                <div className="text-caption text-tertiary">{item.time} • by {item.by}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { userRecord } = useAuth()

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-display-hero mb-2">Welcome Back, {userRecord?.display_name?.split(' ')[0]}</h1>
        <TickerStrip />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TodaysSessionCard />
        <TodaysAttendanceCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgramOverviewCard />
        <RecentActivityCard />
      </div>
    </div>
  )
}
