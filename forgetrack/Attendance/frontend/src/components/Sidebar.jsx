import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  BookOpen,
  Upload,
  UserCheck,
  Calendar,
  Settings,
  LogOut
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Sidebar() {
  const { userRecord } = useAuth()
  
  if (!userRecord) return null

  const handleLogout = async () => {
    localStorage.removeItem('forgetrack_dev_user')
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const role = userRecord.role

  const mentorLinks = [
    { label: 'Overview', items: [{ path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard }] },
    { label: 'Activity', items: [
      { path: '/attendance', name: 'Mark Attendance', icon: CheckSquare },
      { path: '/history', name: 'Student History', icon: Users },
      { path: '/materials', name: 'Materials', icon: BookOpen }
    ]},
    { label: 'Data', items: [{ path: '/upload', name: 'Upload CSV', icon: Upload }] }
  ]

  const studentLinks = [
    { label: 'Overview', items: [
      { path: '/me/attendance', name: 'My Attendance', icon: UserCheck },
      { path: '/me/upcoming', name: 'Upcoming', icon: Calendar },
      { path: '/me/materials', name: 'Materials', icon: BookOpen }
    ]}
  ]

  const navSections = role === 'mentor' ? mentorLinks : studentLinks

  return (
    <aside className="w-[260px] hidden md:flex flex-col bg-canvas border-r border-border-subtle h-screen overflow-y-auto">
      {/* Brand Header */}
      <div className="p-6 pb-2">
        <div className="text-h2 font-display text-primary flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent-glow flex items-center justify-center">
            <span className="text-inverse text-xs font-bold">F</span>
          </div>
          ForgeTrack
        </div>
      </div>

      {/* Welcome Block */}
      <div className="px-6 py-4 border-b border-border-subtle mb-6 mx-2">
        <div className="text-body-sm text-secondary">Welcome Back,</div>
        <div className="text-body font-medium text-primary truncate">{userRecord.display_name}</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="text-label text-tertiary mb-2 px-2">{section.label}</div>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 h-11 rounded-lg text-body transition-colors
                      ${isActive 
                        ? 'bg-surface-raised text-primary border-l-2 border-accent-glow' 
                        : 'text-secondary hover:bg-surface hover:text-primary border-l-2 border-transparent'}
                    `}
                  >
                    <item.icon size={20} strokeWidth={1.75} />
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <div className="text-label text-tertiary mb-2 px-2">Account</div>
          <ul className="space-y-1">
            <li>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 h-11 rounded-lg text-body text-secondary hover:bg-surface hover:text-primary border-l-2 border-transparent transition-colors"
              >
                <LogOut size={20} strokeWidth={1.75} />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  )
}
