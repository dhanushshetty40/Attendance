import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#07070B', 
      color: '#F5F5F7',
      fontFamily: 'Inter, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#F43F5E', marginBottom: '16px' }}>Configuration Missing</h1>
      <p style={{ color: '#8A8A94', maxWidth: '500px', lineHeight: '1.6' }}>
        The application is missing its environment variables (Supabase URL/Key). 
        Please add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b> to your Vercel project settings and redeploy.
      </p>
      <div style={{ marginTop: '32px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <p style={{ fontSize: '14px' }}>Check the browser console for more details.</p>
      </div>
    </div>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
}
