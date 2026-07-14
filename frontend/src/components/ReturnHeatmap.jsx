import { useState, useEffect, useRef } from 'react'
import { fetchPrices } from '../api'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Mon','','Wed','','Fri','','']

// Color scale: large-loss → neutral → large-gain
function retColor(ret) {
  if (ret === null) return 'rgba(255,255,255,0.03)' // weekend / no data
  if (ret >  0.04)  return '#00cc66'
  if (ret >  0.02)  return '#00aa55'
  if (ret >  0.005) return '#007a3d'
  if (ret > -0.005) return 'rgba(255,255,255,0.08)'
  if (ret > -0.02)  return '#cc4400'
  if (ret > -0.04)  return '#ee2200'
  return '#ff0000'
}

function retLabel(ret) {
  if (ret === null) return 'No data'
  const sign = ret >= 0 ? '+' : ''
  return `${sign}${(ret * 100).toFixed(2)}%`
}

export default function ReturnHeatmap({ ticker = 'SPY' }) {
  const [cells, setCells]     = useState([])
  const [tooltip, setTooltip] = useState(null)
  const [loading, setLoading] = useState(false)
  const tooltipRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    fetchPrices(ticker, '1y')
      .then(r => {
        const dates  = r.data.data.dates
        const closes = r.data.data.close

        // Compute daily % returns
        const retMap = {}
        for (let i = 1; i < dates.length; i++) {
          const ret = (closes[i] - closes[i - 1]) / closes[i - 1]
          retMap[dates[i]] = ret
        }

        // Build calendar grid: last 52 weeks x 7 days
        const today  = new Date()
        const endDate = new Date(today)
        // Go back to nearest Sunday
        endDate.setDate(endDate.getDate() - endDate.getDay())

        const weeks = []
        for (let w = 51; w >= 0; w--) {
          const week = []
          for (let d = 0; d < 7; d++) {
            const date = new Date(endDate)
            date.setDate(endDate.getDate() - w * 7 + d)
            if (date > today) { week.push(null); continue }
            const key = date.toISOString().slice(0, 10)
            week.push({ date: key, ret: retMap[key] ?? null })
          }
          weeks.push(week)
        }

        setCells(weeks)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [ticker])

  // Month labels
  const monthLabels = []
  if (cells.length > 0) {
    let lastMonth = -1
    cells.forEach((week, wi) => {
      const firstValidDay = week.find(d => d && d.date)
      if (!firstValidDay) return
      const m = new Date(firstValidDay.date).getMonth()
      if (m !== lastMonth) {
        monthLabels.push({ wi, label: MONTHS[m] })
        lastMonth = m
      }
    })
  }

  if (loading) return (
    <div style={{ display: 'flex', gap: 4, padding: '20px 0' }}>
      {Array.from({ length: 52 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Array.from({ length: 7 }).map((_, j) => (
            <div key={j} className="skeleton" style={{ width: 14, height: 14, borderRadius: 3 }} />
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      {/* Month labels */}
      <div style={{ display: 'flex', paddingLeft: 28, marginBottom: 4, position: 'relative' }}>
        {cells.map((_, wi) => {
          const ml = monthLabels.find(m => m.wi === wi)
          return (
            <div key={wi} style={{ width: 18, flexShrink: 0, fontSize: 9, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)', textAlign: 'left' }}>
              {ml ? ml.label : ''}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 0 }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4, paddingTop: 0 }}>
          {DAYS.map((d, i) => (
            <div key={i} style={{ height: 14, fontSize: 8, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)', lineHeight: '14px', textAlign: 'right', paddingRight: 2 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {cells.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 3 }}>
            {week.map((day, di) => (
              <div
                key={di}
                style={{
                  width: 14, height: 14,
                  borderRadius: 3,
                  background: day ? retColor(day.ret) : 'transparent',
                  cursor: day ? 'pointer' : 'default',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  boxSizing: 'border-box',
                  border: day && day.ret !== null ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!day || day.ret === null) return
                  e.currentTarget.style.transform = 'scale(1.4)'
                  e.currentTarget.style.boxShadow = `0 0 8px ${retColor(day.ret)}`
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    date: day.date,
                    ret:  day.ret,
                  })
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                  setTooltip(null)
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--text-muted)' }}>Less</span>
        {['#ff0000','#ee2200','#cc4400','rgba(255,255,255,0.08)','#007a3d','#00aa55','#00cc66'].map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c, border: '1px solid rgba(255,255,255,0.06)' }} />
        ))}
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--text-muted)' }}>More</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--text-muted)' }}>
          Each cell = 1 trading day · hover for exact return
        </span>
      </div>

      {/* Floating Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 40,
          zIndex: 9999,
          background: 'rgba(8,14,26,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '8px 12px',
          pointerEvents: 'none',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text-secondary)' }}>{tooltip.date}</div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, fontWeight: 700, color: tooltip.ret >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
            {retLabel(tooltip.ret)}
          </div>
        </div>
      )}
    </div>
  )
}
