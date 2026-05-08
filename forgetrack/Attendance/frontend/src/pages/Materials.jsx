import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BookOpen, Video, FileText, Link as LinkIcon, Plus } from 'lucide-react'

export default function Materials() {
  const [materials, setMaterials] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  const [sessionId, setSessionId] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('slides')
  const [url, setUrl] = useState('')

  useEffect(() => {
    fetchMaterials()
  }, [])

  async function fetchMaterials() {
    setLoading(true)
    const { data: sessData } = await supabase.from('sessions').select('*').order('date', { ascending: false })
    const { data: matData } = await supabase.from('materials').select('*')
    
    setSessions(sessData || [])
    
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

  const handleAdd = async () => {
    if (!sessionId || !title || !url) return
    
    const { error } = await supabase.from('materials').insert({
      session_id: parseInt(sessionId),
      title,
      type,
      url
    })
    
    if (!error) {
      setShowModal(false)
      setTitle('')
      setUrl('')
      fetchMaterials()
    } else {
      alert("Failed to add material: " + error.message)
    }
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
      <div className="flex justify-between items-end border-b border-border-subtle pb-6">
        <h1 className="text-h1">Materials</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Material
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="animate-pulse bg-surface-inset h-40 rounded-xl"></div>
          <div className="animate-pulse bg-surface-inset h-40 rounded-xl"></div>
        </div>
      ) : materials.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="mx-auto text-tertiary mb-4" size={32} />
          <h3 className="text-h3 text-secondary mb-4">No materials found</h3>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Add Material</button>
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

      {showModal && (
        <div className="modal-overlay flex items-center justify-center z-50">
          <div className="modal">
            <h2 className="text-h2 mb-6">Add Material</h2>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-label text-secondary mb-1">SESSION</label>
                <select className="input" value={sessionId} onChange={e => setSessionId(e.target.value)}>
                  <option value="">Select a session...</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.date} - {s.topic}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-label text-secondary mb-1">TITLE</label>
                <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Slide Deck" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-label text-secondary mb-1">TYPE</label>
                  <select className="input" value={type} onChange={e => setType(e.target.value)}>
                    <option value="slides">Slides</option>
                    <option value="recording">Recording</option>
                    <option value="document">Document</option>
                    <option value="link">Link</option>
                  </select>
                </div>
                <div className="flex-[2]">
                  <label className="block text-label text-secondary mb-1">URL</label>
                  <input type="url" className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAdd}>Add Material</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
