import { useEffect, useState } from 'react'
import { fetchRegime } from '../api'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

const ASSETS = ['SPY','QQQ','GLD','TLT','BTC-USD','GC=F','ETH-USD','IWM','USO','EEM']

const REGIME_BG = {
  'LOW RISK':    'rgba(0,255,136,0.08)',
  'MEDIUM RISK': 'rgba(255,165,0,0.08)',
  'HIGH RISK':   'rgba(255,68,68,0.08)',
}
const REGIME_BORDER = {
  'LOW RISK':    'rgba(0,255,136,0.4)',
  'MEDIUM RISK': 'rgba(255,165,0,0.4)',
  'HIGH RISK':   'rgba(255,68,68,0.4)',
}
const REGIME_COLOR = {
  'LOW RISK': '#00ff88', 'MEDIUM RISK': '#ffa500', 'HIGH RISK': '#ff4444'
}

const RegimeTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const rv = payload[0]?.value
  const label2 = payload[1]?.value
  return (
    <div className="card" style={{ padding: '10px 14px', minWidth: 160 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber)' }}>
        Vol: {rv != null ? `${(rv * 100).toFixed(1)}%` : '—'}
      </div>
    </div>
  )
}

export default function Regime() {
  const [ticker,  setTicker]  = useState('SPY')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const load = (t) => {
    setLoading(true); setError(null); setData(null)
    fetchRegime(t)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(ticker) }, [ticker])

  const regime = data?.current_regime ?? ''
  const regimeColor  = REGIME_COLOR[regime]  ?? '#8b8d91'
  const regimeBg     = REGIME_BG[regime]     ?? 'transparent'
  const regimeBorder = REGIME_BORDER[regime] ?? 'transparent'

  // Build chart data with colour index for colouring areas
  const chartData = data?.history
    ? data.history.dates.map((d, i) => ({
        date:   d,
        rv_20d: data.history.rv_20d[i],
        regime: data.history.regimes[i],
      })).filter((_, i) => i % 2 === 0)
    : []

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">Market Regime Detection</div>
            <div className="page-subtitle">
              KMeans clustering · 3 regimes · Rolling vol + momentum features · Transition matrix
            </div>
          </div>
          <select value={ticker} onChange={e => setTicker(e.target.value)} style={{ minWidth: 160 }}>
            {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="loading-wrap">
          <div className="spinner" />
          <div className="loading-text">DETECTING MARKET REGIME · {ticker}</div>
        </div>
      )}
      {error && <div className="error-box">{error}</div>}

      {data && !loading && (
        <>
          {/* Current Regime Banner */}
          <div className="card" style={{
            marginBottom: 24,
            background: regimeBg,
            border: `1px solid ${regimeBorder}`,
            display: 'flex', alignItems: 'center', gap: 24, padding: '24px 28px'
          }}>
            <div style={{ fontSize: 56 }}>{data.current_icon}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>
                CURRENT REGIME · {ticker}
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: regimeColor, marginTop: 4 }}>
                {regime}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                20-Day Realised Vol: <span style={{ color: regimeColor, fontWeight: 700 }}>
                  {(data.current_rv * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Regime Stats Cards */}
          <div className="grid-3" style={{ marginBottom: 24 }}>
            {(data.regime_stats ?? []).map(s => (
              <div key={s.regime} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <span style={{ fontWeight: 700, color: s.color, fontSize: 14 }}>{s.regime}</span>
                </div>
                <table style={{ width: '100%', fontSize: 11, fontFamily: 'IBM Plex Mono' }}>
                  <tbody>
                    {[
                      ['% Time',        `${s.pct_time}%`],
                      ['Days in Regime', s.count_days],
                      ['Avg Vol',        `${(s.avg_vol*100).toFixed(1)}%`],
                      ['Annual Return',  `${(s.avg_daily_ret*100).toFixed(1)}%`],
                      ['Sharpe',         s.sharpe],
                    ].map(([k,v]) => (
                      <tr key={k}>
                        <td style={{ color: 'var(--text-secondary)', paddingBottom: 4 }}>{k}</td>
                        <td style={{ color: s.color, fontWeight: 700, textAlign: 'right' }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Regime History Chart */}
          <div className="section-header">Volatility Regime History</div>
          <div className="card" style={{ marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ffa500" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ffa500" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,165,0,0.06)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => d.slice(0, 7)}
                  interval={Math.floor(chartData.length / 8)}
                  tick={{ fill: '#8b8d91', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={v => `${(v*100).toFixed(0)}%`}
                  tick={{ fill: '#8b8d91', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<RegimeTooltip />} />
                <Area
                  type="monotone"
                  dataKey="rv_20d"
                  stroke="#ffa500"
                  strokeWidth={2}
                  fill="url(#volGrad)"
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    const c = payload.regime === 0 ? '#00ff88' : payload.regime === 1 ? '#ffa500' : '#ff4444'
                    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={c} opacity={0.8} />
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
              {[['🟢','LOW RISK','#00ff88'], ['🟡','MEDIUM RISK','#ffa500'], ['🔴','HIGH RISK','#ff4444']].map(([ic,lb,cl]) => (
                <div key={lb} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'IBM Plex Mono', color: cl }}>
                  {ic} {lb}
                </div>
              ))}
            </div>
          </div>

          {/* Transition Matrix */}
          {data.transition_matrix && (
            <>
              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card">
                  <div className="section-header" style={{ margin: '0 0 16px' }}>Transition Probability Matrix</div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>From \ To</th>
                        <th>🟢 Low</th>
                        <th>🟡 Medium</th>
                        <th>🔴 High</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['🟢 Low', '🟡 Medium', '🔴 High'].map((label, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: ['#00ff88','#ffa500','#ff4444'][i] }}>{label}</td>
                          {(data.transition_matrix[i] ?? [0,0,0]).map((p, j) => {
                            const isDiagonal = i === j;
                            const bg = isDiagonal 
                              ? (i === 0 ? 'rgba(0,255,136,0.12)' : i === 1 ? 'rgba(255,165,0,0.12)' : 'rgba(255,68,68,0.12)') 
                              : (p > 0.05 ? 'rgba(255,255,255,0.02)' : 'transparent');
                            return (
                              <td key={j} style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: isDiagonal ? 700 : 400,
                                color: isDiagonal ? ['#00ff88','#ffa500','#ff4444'][i] : 'var(--text-secondary)',
                                backgroundColor: bg,
                                transition: 'all 0.2s ease',
                              }}>
                                {(p * 100).toFixed(0)}%
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Duration Stats */}
                <div className="card">
                  <div className="section-header" style={{ margin: '0 0 16px' }}>Average Regime Duration</div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Regime</th>
                        <th>Avg Days</th>
                        <th>Max Days</th>
                        <th>Occurrences (Visits)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.duration_stats ?? {}).map(([name, d]) => (
                        <tr key={name}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: REGIME_COLOR[name] ?? 'var(--text-primary)', fontWeight: 700 }}>{name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{d.avg_days} days</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{d.max_days} days</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 700 }}>
                            {d.occurrences ?? 0} {d.occurrences === 1 ? 'time' : 'times'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
