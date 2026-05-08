import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BookOpen, Video, FileText, Link as LinkIcon } from 'lucide-react'

export default function StudentMaterials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaterials()
  }, [])

  async function fetchMaterials() {
    setLoading(true)
    const { data: sessData } = await supabase.from('sessions').select('*').order('date', { ascending: false })
    const { data: matData } = await supabase.from('materials').select('*')
    
    const grouped = []
    if (sessData && matData) {
      for (const session of sessData) {
        const sessionMats = matData.filter(m => m.session_id === session.id)
        if (sessionMats.length > 0) {
          grouped.push({
            session,
            items: sessionMats
          })
        }
      }
    }
    setMaterials(grouped)
    setLoading(false)
  }

  const getIcon = (t) => {
    switch(t) {
      case 'slides': return <BookOpen size={16} />
      case 'recording': return <Video size={16} />
      case 'document': return <FileText size={16} />
      default: return <LinkIcon size={16} />
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-h1 border-b border-border-subtle pb-6">Course Materials</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="animate-pulse bg-surface-inset h-40 rounded-xl"></div>
          <div className="animate-pulse bg-surface-inset h-40 rounded-xl"></div>
        </div>
      ) : materials.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="mx-auto text-tertiary mb-4" size={32} />
          <h3 className="text-h3 text-secondary">No materials found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((group, i) => (
            <div key={i} className="card">
              <div className="text-caption font-mono text-tertiary mb-2">{group.session.date}</div>
              <h3 className="text-h3 mb-6">{group.session.topic}</h3>
              <div className="space-y-3 border-t border-border-subtle pt-4">
                {group.items.map(m => (
                  <a 
                    key={m.id} 
                    href={m.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-3 text-body-sm text-secondary hover:text-primary transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-inset flex items-center justify-center group-hover:bg-accent-glow/20 group-hover:text-accent-glow transition-colors">
                      {getIcon(m.type)}
                    </div>
                    {m.title}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
