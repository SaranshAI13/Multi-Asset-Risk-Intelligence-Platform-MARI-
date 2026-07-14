import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard   from './pages/Dashboard'
import Volatility  from './pages/Volatility'
import Portfolio   from './pages/Portfolio'
import Regime      from './pages/Regime'
import './index.css'

const NAV = [
  { to: '/',           icon: '⬡', label: 'Overview'   },
  { to: '/volatility', icon: '📈', label: 'Volatility'  },
  { to: '/portfolio',  icon: '⚖️', label: 'Portfolio'   },
  { to: '/regime',     icon: '🎯', label: 'Regime'      },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ paddingBottom: '12px' }}>
        <div className="logo-title" style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', lineHeight: '1.3', letterSpacing: '0.5px' }}>
          Multi-Asset Risk
          <br />
          Intelligence
        </div>
        <div className="logo-subtitle" style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 700, marginTop: '4px', letterSpacing: '1px' }}>
          [MARI]
        </div>
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
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--bg-border)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
          © MARI • QUANT RISK LAB
        </div>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/"           element={<Dashboard  />} />
            <Route path="/volatility" element={<Volatility />} />
            <Route path="/portfolio"  element={<Portfolio  />} />
            <Route path="/regime"     element={<Regime     />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
