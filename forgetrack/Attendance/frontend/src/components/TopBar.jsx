import { useAuth } from '../contexts/AuthContext'
import { Search } from 'lucide-react'

export default function TopBar() {
  const { userRecord } = useAuth()
  
  if (!userRecord) return null

  const initial = userRecord.display_name ? userRecord.display_name.charAt(0).toUpperCase() : 'U'

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-border-subtle bg-canvas/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="text-body text-secondary">
          Overview / <span className="text-primary font-medium">Dashboard</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="input pl-10 h-10 w-64 text-body-sm"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-body-sm text-secondary hidden sm:block">{userRecord.display_name}</div>
          <div className="w-8 h-8 rounded-full bg-surface-raised border border-border-default flex items-center justify-center text-primary font-medium text-caption">
            {initial}
          </div>
        </div>
      </div>
    </header>
  )
}
