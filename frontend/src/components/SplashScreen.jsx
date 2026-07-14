import { useEffect, useState } from 'react'

const TAGLINE_CHARS = 'Multi-Asset Risk Intelligence Platform'

export default function SplashScreen({ onDone }) {
  const [typed,    setTyped]    = useState('')
  const [phase,    setPhase]    = useState('typing')   // typing | ready | fade
  const [progress, setProgress] = useState(0)

  // Typewriter effect for tagline
  useEffect(() => {
    if (phase !== 'typing') return
    let i = 0
    const iv = setInterval(() => {
      i++
      setTyped(TAGLINE_CHARS.slice(0, i))
      setProgress(Math.round((i / TAGLINE_CHARS.length) * 70))
      if (i >= TAGLINE_CHARS.length) {
        clearInterval(iv)
        setPhase('ready')
      }
    }, 38)
    return () => clearInterval(iv)
  }, [phase])

  // After typing done, fill progress bar to 100% then fade out
  useEffect(() => {
    if (phase !== 'ready') return
    let p = 70
    const iv = setInterval(() => {
      p += 3
      setProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(iv)
        setTimeout(() => setPhase('fade'), 300)
      }
    }, 18)
    return () => clearInterval(iv)
  }, [phase])

  // Once faded, tell parent we're done
  useEffect(() => {
    if (phase !== 'fade') return
    const t = setTimeout(onDone, 500)
    return () => clearTimeout(t)
  }, [phase, onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#060b14',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 0,
      opacity: phase === 'fade' ? 0 : 1,
      transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1)',
      pointerEvents: phase === 'fade' ? 'none' : 'all',
    }}>

      {/* Ambient mesh */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 40% at 20% 30%, rgba(255,165,0,0.06), transparent 60%),
          radial-gradient(ellipse 50% 35% at 80% 70%, rgba(0,212,255,0.05), transparent 60%)
        `,
      }} />

      {/* Logo block */}
      <div style={{ textAlign: 'center', position: 'relative' }}>

        {/* MARI acronym */}
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 'clamp(64px, 12vw, 120px)',
          fontWeight: 800,
          letterSpacing: '0.15em',
          background: 'linear-gradient(135deg, #ffa500 0%, #ffcc44 50%, #00d4ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
          marginBottom: 16,
          animation: 'splashGlow 3s ease-in-out infinite alternate',
        }}>
          MARI
        </div>

        {/* Full form — typewriter */}
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 'clamp(11px, 1.6vw, 15px)',
          color: '#7a8090',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          minHeight: 22,
          marginBottom: 48,
        }}>
          {typed}
          <span style={{
            display: 'inline-block', width: 2, height: '1em',
            background: '#ffa500', marginLeft: 2,
            verticalAlign: 'middle',
            animation: typed.length < TAGLINE_CHARS.length ? 'blink 0.6s step-end infinite' : 'none',
            opacity: phase === 'ready' ? 0 : 1,
          }} />
        </div>

        {/* Progress bar */}
        <div style={{
          width: 'clamp(240px, 40vw, 400px)',
          height: 2,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          overflow: 'hidden',
          margin: '0 auto 20px',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #ffa500, #00d4ff)',
            borderRadius: 2,
            transition: 'width 0.08s linear',
            boxShadow: '0 0 8px rgba(255,165,0,0.4)',
          }} />
        </div>

        {/* Status label */}
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          color: '#3d4351',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          animation: 'blink 1.4s step-end infinite',
        }}>
          {progress < 100 ? 'Initialising Market Data...' : 'Ready'}
        </div>

        {/* Decorative corner lines */}
        {[
          { top: -24, left: -24, borderTop: '2px solid', borderLeft: '2px solid' },
          { top: -24, right: -24, borderTop: '2px solid', borderRight: '2px solid' },
          { bottom: -24, left: -24, borderBottom: '2px solid', borderLeft: '2px solid' },
          { bottom: -24, right: -24, borderBottom: '2px solid', borderRight: '2px solid' },
        ].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', width: 18, height: 18,
            borderColor: 'rgba(255,165,0,0.3)', ...s,
          }} />
        ))}
      </div>

      {/* Bottom dev credit */}
      <div style={{
        position: 'absolute', bottom: 24,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 10, color: '#3d4351', letterSpacing: '1px',
        textAlign: 'center',
      }}>
        QUANT RISK LAB · v1.0.0
      </div>

      <style>{`
        @keyframes splashGlow {
          0%   { filter: drop-shadow(0 0 24px rgba(255,165,0,0.3)); }
          100% { filter: drop-shadow(0 0 48px rgba(0,212,255,0.25)); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
