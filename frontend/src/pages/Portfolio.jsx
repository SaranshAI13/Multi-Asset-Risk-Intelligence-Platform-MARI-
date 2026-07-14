import { useState, useEffect } from 'react'
import { optimizePortfolio } from '../api'
import AnimatedNumber from '../components/AnimatedNumber'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ScatterChart, Scatter, PieChart, Pie, Cell, Legend
} from 'recharts'

const ALL_ASSETS = [
  'SPY', 'QQQ', 'IWM', 'EEM', 'GLD', 'SLV', 'USO', 'TLT', 'HYG', 'VNQ',
  'XLE', 'XLF', 'XLK', 'XLV', 'DIA', 'IAU', 'INDA', 'VIXY', 'ARKK', 'UUP',
  'XLY', 'XLP', 'BTC-USD', 'ETH-USD', 'SOL-USD', 'GC=F', 'SI=F', 'CL=F',
  'NG=F', 'HG=F', 'PA=F', 'ZC=F'
]
const COLORS = ['#ffa500','#00ff88','#4da6ff','#ff4444','#cc44ff','#ffcc44','#44ffcc','#ff8844']

const FrontierTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="card" style={{ padding: '10px 14px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        <div>Vol: <span style={{ color: 'var(--amber)' }}>{(d.vol*100).toFixed(1)}%</span></div>
        <div>Ret: <span style={{ color: 'var(--green)' }}>{(d.ret*100).toFixed(1)}%</span></div>
        <div>Sharpe: <span style={{ color: 'var(--blue)' }}>{d.sharpe?.toFixed(2)}</span></div>
      </div>
    </div>
  )
}

function WeightPie({ weights }) {
  const data = weights.filter(w => w.weight > 0.005)
  return (
    <PieChart width={280} height={280}>
      <Pie data={data} dataKey="weight" nameKey="ticker"
        cx="50%" cy="50%" outerRadius={110} innerRadius={55}
        paddingAngle={2}
      >
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip formatter={v => `${(v*100).toFixed(1)}%`} />
      <Legend
        formatter={(v) => <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#c9d1d9' }}>{v}</span>}
      />
    </PieChart>
  )
}

export default function Portfolio() {
  const [selected, setSelected] = useState(['SPY', 'GLD', 'TLT', 'BTC-USD'])
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [activePort, setActivePort] = useState('max_sharpe')
  const [rfRate,     setRfRate]     = useState(0.05)
  const [showSharpeModal, setShowSharpeModal] = useState(false)

  const toggle = (a) => setSelected(s =>
    s.includes(a) ? s.filter(x => x !== a) : s.length < 10 ? [...s, a] : s
  )

  const run = (currentRf = rfRate) => {
    if (selected.length < 2) return
    setLoading(true); setError(null); setResult(null)
    optimizePortfolio(selected, currentRf)
      .then(r => setResult(r.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }

  const PORT_TABS = [
    { key: 'max_sharpe',   label: 'Max Sharpe'    },
    { key: 'min_variance', label: 'Min Variance'  },
    { key: 'risk_parity',  label: 'Risk Parity'   },
    { key: 'equal_weight', label: 'Equal Weight'  },
  ]

  const current = result?.[activePort]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Portfolio Optimizer</div>
        <div className="page-subtitle">
          Markowitz Mean-Variance · Risk Parity · Efficient Frontier · scipy.optimize
        </div>
      </div>

      {/* Asset Selector */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header" style={{ margin: '0 0 12px' }}>Select Assets (2–10)</div>
        <div className="asset-chip-grid">
          {ALL_ASSETS.map(a => (
            <div
              key={a}
              className={`asset-chip${selected.includes(a) ? ' selected' : ''}`}
              onClick={() => toggle(a)}
            >
              {a}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
          <button className="btn btn-primary" onClick={() => run(rfRate)} disabled={loading || selected.length < 2}>
            {loading ? 'Optimizing...' : `Optimize ${selected.length} Assets`}
          </button>

          {/* Risk-Free Hurdle Rate Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              RISK-FREE RATE:
            </span>
            <input 
              type="range" min="0.0" max="0.15" step="0.005" 
              value={rfRate} 
              onChange={e => {
                const val = parseFloat(e.target.value)
                setRfRate(val)
                if (result) {
                  run(val) // Re-run optimization instantly!
                }
              }}
              style={{ width: 120, accentColor: 'var(--blue)' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--blue)', minWidth: 40 }}>
              {(rfRate * 100).toFixed(1)}%
            </span>
          </div>

          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
            Selected: {selected.join(', ')}
          </span>
        </div>

        {/* Opportunity Cost Explanation */}
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>
          * **Hurdle Rate / Opportunity Cost**: The baseline yield you earn risk-free (e.g. in Government Bonds or Bank FDs) without investing here. The Sharpe Ratio measures the portfolio's return exceeding this hurdle.
        </div>
      </div>

      {loading && (
        <div className="loading-wrap">
          <div className="spinner" />
          <div className="loading-text">SOLVING EFFICIENT FRONTIER · {selected.length} ASSETS</div>
        </div>
      )}
      {error && <div className="error-box">{error}</div>}

      {result && !loading && (
        <>
          {/* Portfolio Tab Switch */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {PORT_TABS.map(t => (
              <button
                key={t.key}
                className={`btn btn-${activePort === t.key ? 'primary' : 'secondary'}`}
                onClick={() => setActivePort(t.key)}
                style={{ fontSize: 12 }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* KPIs */}
          {current && (
            <div>
              <div className="grid-3" style={{ marginBottom: 10 }}>
                {[
                  { label: 'Expected Return*', value: `${(current.expected_return*100).toFixed(1)}%`, color: 'var(--green)'  },
                  { label: 'Volatility*',      value: `${(current.volatility*100).toFixed(1)}%`,      color: 'var(--amber)'  },
                  { label: 'Sharpe Ratio',    value: current.sharpe_ratio?.toFixed(2),               color: 'var(--blue)'   },
                ].map(k => (
                  <div 
                    key={k.label} 
                    className="card"
                    onClick={k.label === 'Sharpe Ratio' ? () => setShowSharpeModal(true) : undefined}
                    style={k.label === 'Sharpe Ratio' ? { cursor: 'pointer', transition: 'all 0.2s ease-in-out' } : undefined}
                    onMouseOver={k.label === 'Sharpe Ratio' ? e => {
                      e.currentTarget.style.borderColor = 'var(--blue)';
                      e.currentTarget.style.boxShadow = '0 0 12px rgba(77, 166, 255, 0.15)';
                    } : undefined}
                    onMouseOut={k.label === 'Sharpe Ratio' ? e => {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    } : undefined}
                  >
                    <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{k.label}</span>
                      {k.label === 'Sharpe Ratio' && (
                        <span style={{ fontSize: 9, color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: '50%', width: 12, height: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>?</span>
                      )}
                    </div>
                    <div className="card-value" style={{ color: k.color, fontSize: 32 }}>
                      {k.label === 'Expected Return*'
                        ? <AnimatedNumber value={current.expected_return * 100} decimals={1} suffix="%" duration={900} />
                        : k.label === 'Volatility*'
                        ? <AnimatedNumber value={current.volatility * 100} decimals={1} suffix="%" duration={900} />
                        : <AnimatedNumber value={current.sharpe_ratio ?? 0} decimals={2} duration={900} />}
                    </div>
                    <div className="card-sub">{current.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 20, textAlign: 'right' }}>
                * Expected Return and Volatility are annualized based on historical 2-year daily prices.
              </div>
            </div>
          )}

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Interactive Weight Adjuster */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="section-header" style={{ margin: '0 0 14px', alignSelf: 'flex-start' }}>Optimal Weights</div>
              {current && <InteractiveWeights weights={current.weights} colors={COLORS} />}
              <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                * Optimal weights show the percentage of capital allocated to each selected asset under the selected strategy.
              </div>
            </div>

            {/* Efficient Frontier */}
            <div className="card">
              <div className="section-header" style={{ margin: '0 0 16px' }}>Efficient Frontier</div>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,165,0,0.06)" />
                  <XAxis dataKey="vol" name="Volatility" tickFormatter={v=>`${(v*100).toFixed(0)}%`}
                    tick={{ fill: '#8b8d91', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Vol', position: 'insideBottom', fill:'#8b8d91', fontSize:10 }} />
                  <YAxis dataKey="ret" name="Return" tickFormatter={v=>`${(v*100).toFixed(0)}%`}
                    tick={{ fill: '#8b8d91', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<FrontierTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter
                    data={result.efficient_frontier}
                    fill="transparent"
                    line={{ stroke: '#ffa500', strokeWidth: 2 }}
                    lineType="joint"
                    shape={({ cx, cy }) => <circle cx={cx} cy={cy} r={2} fill="#ffa500" opacity={0.6} />}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                * The Frontier curve maps the highest expected returns for given volatility risk. Higher-left portfolios are superior.
              </div>
            </div>
          </div>

          {/* Risk Contributions */}
          {current?.risk_contributions && (
            <>
              <div className="section-header">Risk Contribution (MCTR)</div>
              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr><th>Asset</th><th>Weight</th><th>Risk Contribution</th><th>% of Portfolio Risk</th></tr>
                  </thead>
                  <tbody>
                    {current.risk_contributions
                      .filter(r => r.weight > 0.001)
                      .sort((a,b) => b.pct_risk - a.pct_risk)
                      .map(r => (
                        <tr key={r.ticker}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 700 }}>{r.ticker}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{(r.weight*100).toFixed(1)}%</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{(r.risk_contribution*100).toFixed(2)}%</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: `${Math.min(r.pct_risk, 100)}%`, maxWidth: 120, height: 6,
                                background: 'var(--amber)', borderRadius: 3, opacity: 0.7, minWidth: 4
                              }} />
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.pct_risk.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                  * Risk Contribution measures how much of the portfolio's total volatility is driven by each asset, combining its weight, individual volatility, and covariance.
                </div>
              </div>
            </>
          )}

          {/* Correlation Matrix */}
          {result.correlation_matrix && (
            <>
              <div className="section-header">Correlation Matrix</div>
              <div className="card">
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th></th>
                        {result.correlation_matrix.tickers.map(t => <th key={t}>{t}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.correlation_matrix.matrix.map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 700 }}>
                            {result.correlation_matrix.tickers[i]}
                          </td>
                          {row.map((val, j) => (
                            <td key={j} style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              background: i === j ? 'rgba(255,165,0,0.1)' :
                                val >  0.7 ? 'rgba(255,68,68,0.15)' :
                                val < -0.3 ? 'rgba(0,255,136,0.1)' : 'transparent',
                              color: i === j ? 'var(--amber)' :
                                val >  0.7 ? 'var(--red)' :
                                val < -0.3 ? 'var(--green)' : 'var(--text-primary)'
                            }}>
                              {val.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                  * Correlation measures price co-movement from -1.0 (opposite) to +1.0 (lockstep). Low/negative correlation increases diversification.
                </div>
              </div>
            </>
          )}

          {/* Ledoit-Wolf Diagnostic Card */}
          {result.shrinkage_intensity != null && (
            <>
              <div className="section-header" style={{ marginTop: 24 }}>Ledoit-Wolf Covariance Shrinkage Diagnostic</div>
              <div className="card" style={{ padding: '20px', borderLeft: '3px solid var(--blue)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>
                    Ledoit-Wolf Shrinkage Intensity: {result.shrinkage_intensity}%
                  </div>
                  <span className="badge badge-blue">Optimal Noise Reduction Active</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  This panel displays the optimal shrinkage intensity (δ) calculated via the Ledoit-Wolf (2004) shrinkage estimator. 
                  Historical sample covariance matrices are prone to estimation error and noise, which causes severe weight instability. 
                  To protect the portfolio from overfitting, the system mathematically "shrinks" the empirical covariance by <strong>{result.shrinkage_intensity}%</strong> towards a stable, Constant Correlation target, retaining <strong>{(100 - result.shrinkage_intensity).toFixed(2)}%</strong> of the raw empirical data. 
                  This stabilizes optimizer outputs and results in robust, realistic asset allocations.
                </p>
              </div>
            </>
          )}
        </>
      )}
      <SharpeRatioModal isOpen={showSharpeModal} onClose={() => setShowSharpeModal(false)} rfRate={rfRate} />
    </div>
  )
}

function SharpeRatioModal({ isOpen, onClose, rfRate }) {
  if (!isOpen) return null;
  
  // Dynamic example calculations based on current slider rfRate
  const fundASharpe = ((15 - rfRate * 100) / 10).toFixed(2);
  const fundBSharpe = ((20 - rfRate * 100) / 20).toFixed(2);

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 550, maxWidth: '90%', padding: 24, position: 'relative', border: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24 }}>&times;</button>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>What is the Sharpe Ratio?</div>
        
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          The <strong>Sharpe Ratio</strong> (developed by Nobel laureate William F. Sharpe) measures the <strong>excess return</strong> you get for every unit of volatility (risk) you take. 
          It answers the basic question: <em>"Is it worth taking this investment risk, or should I have just kept my money in a risk-free savings bank FD?"</em>
        </p>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--amber)', marginBottom: 16, textAlign: 'center', border: '1px solid rgba(255,165,0,0.1)' }}>
          Sharpe Ratio = (Expected Return - Risk-Free Rate) / Volatility
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 8, letterSpacing: 0.5 }}>
          💡 Real-World Example (Risk-Free Hurdle Rate = {(rfRate * 100).toFixed(1)}%):
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          Imagine you are comparing two mutual funds:
          <br />• <strong>Fund A (Low Risk)</strong>: Annual return is <strong>15%</strong> with <strong>10% Volatility</strong>.
          <br />• <strong>Fund B (High Risk)</strong>: Annual return is <strong>20%</strong> with <strong>20% Volatility</strong>.
          <br /><br />
          Calculating their Sharpe Ratios:
          <br />• <strong>Fund A Sharpe</strong>: (15% - {(rfRate*100).toFixed(0)}%) / 10% = <strong>{fundASharpe}</strong> {parseFloat(fundASharpe) > parseFloat(fundBSharpe) ? '(Superior risk-adjusted return!)' : ''}
          <br />• <strong>Fund B Sharpe</strong>: (20% - {(rfRate*100).toFixed(0)}%) / 20% = <strong>{fundBSharpe}</strong> {parseFloat(fundBSharpe) > parseFloat(fundASharpe) ? '(Superior risk-adjusted return!)' : ''}
          <br /><br />
          {parseFloat(fundASharpe) > parseFloat(fundBSharpe) ? (
            <span>Even though Fund B has a higher absolute return (20% vs 15%), <strong>Fund A is mathematically superior</strong> because it gives you more profit per unit of risk. Fund B is taking double the risk for only 5% extra return.</span>
          ) : (
            <span>Since the risk-free rate is very high, Fund B's higher absolute return is mathematically superior as it justifies the volatility relative to the cash benchmark.</span>
          )}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: 8, letterSpacing: 0.5 }}>
          📊 Sharpe Ratio Benchmarks:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          <div>• <strong>&lt; 1.0</strong>: Sub-optimal / Bad</div>
          <div>• <strong>1.0 - 1.9</strong>: Good / Standard</div>
          <div>• <strong>2.0 - 2.9</strong>: Very Good / Active</div>
          <div>• <strong>&gt; 3.0</strong>: Outstanding / Rare</div>
        </div>
      </div>
    </div>
  );
}

// ── InteractiveWeights component ───────────────────────────────
function InteractiveWeights({ weights, colors }) {
  // Only show non-trivial weights
  const active = weights.filter(w => w.weight > 0.001)
  const [customWeights, setCustomWeights] = useState(() => {
    const obj = {}
    active.forEach(w => { obj[w.ticker] = Math.round(w.weight * 100) })
    return obj
  })

  useEffect(() => {
    const obj = {}
    active.forEach(w => { obj[w.ticker] = Math.round(w.weight * 100) })
    setCustomWeights(obj)
  }, [weights])

  const total = Object.values(customWeights).reduce((a, b) => a + b, 0)
  const isCustomized = active.some(w => Math.abs((customWeights[w.ticker] ?? 0) - Math.round(w.weight * 100)) > 1)

  const handleSlider = (ticker, val) => {
    setCustomWeights(prev => ({ ...prev, [ticker]: Number(val) }))
  }

  const reset = () => {
    const obj = {}
    active.forEach(w => { obj[w.ticker] = Math.round(w.weight * 100) })
    setCustomWeights(obj)
  }

  // Build donut arcs via SVG
  const size = 160; const cx = size / 2; const cy = size / 2
  const r = 60; const innerR = 38
  const totalW = active.reduce((a, w) => a + (customWeights[w.ticker] ?? 0), 0) || 1

  let angle = -90
  const arcs = active.map((w, i) => {
    const pct = (customWeights[w.ticker] ?? 0) / totalW
    const sweep = pct * 360
    const startAngle = angle
    angle += sweep
    const toRad = (deg) => (deg * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startAngle))
    const y1 = cy + r * Math.sin(toRad(startAngle))
    const x2 = cx + r * Math.cos(toRad(angle - 0.5))
    const y2 = cy + r * Math.sin(toRad(angle - 0.5))
    const ix1 = cx + innerR * Math.cos(toRad(startAngle))
    const iy1 = cy + innerR * Math.sin(toRad(startAngle))
    const ix2 = cx + innerR * Math.cos(toRad(angle - 0.5))
    const iy2 = cy + innerR * Math.sin(toRad(angle - 0.5))
    const large = sweep > 180 ? 1 : 0
    return {
      d: `M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`,
      color: colors[i % colors.length],
      ticker: w.ticker,
      pct: (customWeights[w.ticker] ?? 0),
    }
  })

  return (
    <div style={{ width: '100%' }}>
      {/* Live donut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
        <svg width={size} height={size} style={{ flexShrink: 0 }}>
          {arcs.map((arc, i) => (
            <path key={i} d={arc.d} fill={arc.color} opacity={0.9} />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#e8eaed" fontSize={11} fontFamily="IBM Plex Mono" fontWeight={700}>{total}%</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#7a8090" fontSize={8} fontFamily="IBM Plex Mono">ALLOCATED</text>
        </svg>

        {/* Legend */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {arcs.map((arc, i) => (
            <div key={arc.ticker} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: arc.color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: arc.color, fontWeight: 700, minWidth: 60 }}>{arc.ticker}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>{arc.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {active.map((w, i) => (
          <div key={w.ticker}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: colors[i % colors.length], fontWeight: 700 }}>{w.ticker}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>{customWeights[w.ticker] ?? 0}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={1}
              value={customWeights[w.ticker] ?? 0}
              onChange={e => handleSlider(w.ticker, e.target.value)}
              style={{ width: '100%', accentColor: colors[i % colors.length], cursor: 'pointer', height: 3 }}
            />
          </div>
        ))}
      </div>

      {/* Total + Reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: total === 100 ? 'var(--green)' : total > 100 ? 'var(--red)' : 'var(--amber)', fontWeight: 700 }}>
          Total: {total}% {total === 100 ? '✓' : total > 100 ? '↑ Over' : '↓ Under'}
        </span>
        {isCustomized && (
          <button onClick={reset} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '3px 10px', cursor: 'pointer' }}>
            Reset to Optimal
          </button>
        )}
      </div>
    </div>
  )
}
