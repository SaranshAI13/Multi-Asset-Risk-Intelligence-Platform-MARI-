import { useState } from 'react'
import { optimizePortfolio } from '../api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ScatterChart, Scatter, PieChart, Pie, Cell, Legend
} from 'recharts'

const ALL_ASSETS = [
  'SPY','QQQ','GLD','TLT','IWM','EEM','HYG','VNQ',
  'XLE','XLK','XLF','XLV','BTC-USD','ETH-USD','GC=F','CL=F','SLV','USO'
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
                  <div key={k.label} className="card">
                    <div className="card-title">{k.label}</div>
                    <div className="card-value" style={{ color: k.color, fontSize: 32 }}>{k.value}</div>
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
            {/* Weight Pie */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="section-header" style={{ margin: '0 0 16px', alignSelf: 'flex-start' }}>Optimal Weights</div>
              {current && <WeightPie weights={current.weights} />}
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
    </div>
  )
}
