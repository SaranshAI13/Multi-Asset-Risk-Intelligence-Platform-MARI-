export default function PageLoader({ text = 'LOADING MARKET DATA' }) {
  return (
    <div className="loading-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
      
      {/* Branded loading graphic */}
      <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        
        {/* Rotating Outer Glow Arc */}
        <div style={{
          position: 'absolute',
          inset: 0,
          border: '2px solid rgba(255,165,0,0.04)',
          borderTopColor: 'var(--amber)',
          borderRightColor: 'var(--cyan)',
          borderRadius: '50%',
          animation: 'spin 1s cubic-bezier(0.4, 0.1, 0.3, 0.9) infinite',
          boxShadow: '0 0 16px rgba(255,165,0,0.1)'
        }} />

        {/* Pulse glowing inner MARI initials */}
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '1px',
          background: 'linear-gradient(135deg, #ffa500, #ffcc44, #00d4ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'mariPulse 1.5s ease-in-out infinite'
        }}>
          MARI
        </div>

      </div>

      {/* Branded Text */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--text-secondary)',
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        textAlign: 'center',
        maxWidth: '85%'
      }}>
        {text}...
      </div>

      <style>{`
        @keyframes mariPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
