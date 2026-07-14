import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Dashboard   from './pages/Dashboard'
import Volatility  from './pages/Volatility'
import Portfolio   from './pages/Portfolio'
import Regime      from './pages/Regime'
import CommandPalette from './components/CommandPalette'
import ToastManager   from './components/ToastManager'
import './index.css'

const NAV = [
  { to: '/',           icon: '⬡', label: 'Overview'   },
  { to: '/volatility', icon: '📈', label: 'Volatility'  },
  { to: '/portfolio',  icon: '⚖️', label: 'Portfolio'   },
  { to: '/regime',     icon: '🎯', label: 'Regime'      },
]

function Sidebar({ onOpenCmd, theme, toggleTheme }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ paddingBottom: '12px' }}>
        <div className="logo-title">
          Multi-Asset Risk<br />Intelligence
        </div>
        <div className="logo-subtitle">[MARI™]</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Analytics</div>
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 20 }}>System</div>
        <a className="nav-link" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
          <span className="nav-icon">⚡</span>
          <span>API Docs</span>
        </a>

        {/* Command Palette trigger */}
        <div
          className="nav-link"
          onClick={onOpenCmd}
          style={{ marginTop: 8, cursor: 'pointer' }}
        >
          <span className="nav-icon" style={{ fontSize: 13 }}>⌕</span>
          <span style={{ flex: 1 }}>Search</span>
          <kbd style={{
            fontSize: 9, color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, padding: '2px 5px',
            fontFamily: 'var(--font-mono)',
          }}>Ctrl K</kbd>
        </div>
      </nav>

      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '1px' }}>
          © MARI · QUANT RISK LAB
        </div>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            color: theme === 'dark' ? '#ffd700' : '#4da6ff',
            cursor: 'pointer',
            fontSize: 14,
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </aside>
  )
}

function AppInner() {
  const [cmdOpen, setCmdOpen] = useState(false)
  const [theme,   setTheme]   = useState('dark')

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(v => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Theme application
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.style.setProperty('--bg-primary',    '#eef2f8')
      root.style.setProperty('--bg-secondary',  '#e4eaf4')
      root.style.setProperty('--bg-card',       'rgba(255,255,255,0.75)')
      root.style.setProperty('--bg-card-hover', 'rgba(255,255,255,0.95)')
      root.style.setProperty('--glass-border',  'rgba(0,0,0,0.08)')
      root.style.setProperty('--text-primary',  '#1a1e2e')
      root.style.setProperty('--text-secondary','#4a5270')
      root.style.setProperty('--text-muted',    '#9099b0')
      root.style.setProperty('--shadow-card',   '0 4px 20px rgba(0,0,0,0.1)')
      root.style.setProperty('--shadow-glass',  '0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)')
    } else {
      root.style.setProperty('--bg-primary',    '#060b14')
      root.style.setProperty('--bg-secondary',  '#0a1220')
      root.style.setProperty('--bg-card',       'rgba(10, 20, 35, 0.75)')
      root.style.setProperty('--bg-card-hover', 'rgba(15, 28, 48, 0.9)')
      root.style.setProperty('--glass-border',  'rgba(255, 255, 255, 0.06)')
      root.style.setProperty('--text-primary',  '#e8eaed')
      root.style.setProperty('--text-secondary','#7a8090')
      root.style.setProperty('--text-muted',    '#3d4351')
      root.style.setProperty('--shadow-card',   '0 8px 32px rgba(0,0,0,0.7)')
      root.style.setProperty('--shadow-glass',  '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)')
    }
  }, [theme])

  return (
    <div className="app-layout">
      <Sidebar
        onOpenCmd={() => setCmdOpen(true)}
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      />
      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Dashboard  />} />
          <Route path="/volatility" element={<Volatility />} />
          <Route path="/portfolio"  element={<Portfolio  />} />
          <Route path="/regime"     element={<Regime     />} />
        </Routes>
      </main>
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastManager>
        <AppInner />
      </ToastManager>
    </BrowserRouter>
  )
}
