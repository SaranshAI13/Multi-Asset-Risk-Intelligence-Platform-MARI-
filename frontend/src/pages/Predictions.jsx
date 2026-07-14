import { useEffect, useState } from 'react'
import { fetchVolatility, fetchAssets } from '../api'
import AnimatedNumber from '../components/AnimatedNumber'

const ASSETS_DEFAULT = ['SPY', 'GLD', 'QQQ', 'BTC-USD', 'GC=F', 'TLT']

export default function Predictions() {
  const [ticker,  setTicker]  = useState('SPY')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [allAssetsMap, setAllAssetsMap] = useState({})
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [timeframe, setTimeframe] = useState('1m') // '1w' | '1m'

  useEffect(() => {
    fetchAssets().then(r => {
      setAllAssetsMap(r.data.assets)
    }).catch(() => {})
  }, [])

  const tickersList = Object.keys(allAssetsMap).length > 0 ? Object.keys(allAssetsMap) : ASSETS_DEFAULT;
  const filteredTickers = tickersList.filter(t => {
    const name = allAssetsMap[t]?.name || '';
    return t.toLowerCase().includes(searchTerm.toLowerCase()) || name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const load = (t) => {
    setLoading(true); setError(null); setData(null)
    fetchVolatility(t)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(ticker) }, [ticker])

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">Risk & Price Predictions</div>
            <div className="page-subtitle">
              Short-term expected moves · Value at Risk (VaR) · Tail Risk Projections
            </div>
          </div>

          {/* Search Dropdown */}
          <div style={{ position: 'relative', width: 240, zIndex: 1000 }}>
            <div 
              onClick={() => setIsOpen(!isOpen)}
              style={{
                background: 'rgba(10, 20, 35, 0.8)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                userSelect: 'none'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                {ticker} - {allAssetsMap[ticker]?.name || 'Loading...'}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>▼</span>
            </div>

            {isOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: '#0a1220',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                maxHeight: 240,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1001,
              }}>
                <input 
                  type="text" 
                  placeholder="Search ticker or name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: 'none',
                    borderBottom: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filteredTickers.length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-secondary)' }}>No results found</div>
                  ) : (
                    filteredTickers.map(t => (
                      <div 
                        key={t}
                        onClick={() => {
                          setTicker(t)
                          setIsOpen(false)
                          setSearchTerm('')
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          color: t === ticker ? 'var(--amber)' : 'var(--text-primary)',
                          background: t === ticker ? 'rgba(255,165,0,0.05)' : 'transparent',
                          display: 'flex',
                          justifyContent: 'space-between',
                          transition: 'background 0.2s',
                          borderBottom: '1px solid rgba(255,255,255,0.02)'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseOut={e => e.currentTarget.style.background = t === ticker ? 'rgba(255,165,0,0.05)' : 'transparent'}
                      >
                        <span style={{ fontWeight: 700 }}>{t}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{allAssetsMap[t]?.name || t}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-wrap">
          <div className="spinner" />
          <div className="loading-text">GENERATING EXPECTED MOVES & TAIL RISK BOUNDARIES · {ticker}</div>
        </div>
      )}
      {error && <div className="error-box">{error}</div>}

      {data && !loading && (
        <>
          {/* Timeframe Selector Tab Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setTimeframe('1w')}
                style={{
                  background: timeframe === '1w' ? 'var(--amber)' : 'rgba(255,255,255,0.04)',
                  color: timeframe === '1w' ? '#060b14' : 'var(--text-primary)',
                  border: '1px solid ' + (timeframe === '1w' ? 'var(--amber)' : 'rgba(255,255,255,0.08)'),
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📅 1 Week Projection (5 Trading Days)
              </button>
              <button 
                onClick={() => setTimeframe('1m')}
                style={{
                  background: timeframe === '1m' ? 'var(--amber)' : 'rgba(255,255,255,0.04)',
                  color: timeframe === '1m' ? '#060b14' : 'var(--text-primary)',
                  border: '1px solid ' + (timeframe === '1m' ? 'var(--amber)' : 'rgba(255,255,255,0.08)'),
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📅 1 Month Projection (21 Trading Days)
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontStyle: 'italic', maxWidth: 450, textAlign: 'right' }}>
              * Long-term predictions are omitted because forecast errors compound and volatility models degrade rapidly over extended horizons.
            </div>
          </div>

          {data.latest_price && (() => {
            const s0 = data.latest_price
            const volDec = data.ml_gbm?.point_forecast ?? data.garch?.point_forecast ?? 0.15
            // Compute days count based on selected tab
            const days = timeframe === '1w' ? 5 : 21
            const t = days / 252
            const volT = volDec * Math.sqrt(t)

            // expected moves in percentage
            const pctMove = volT * 100

            // 1 Std Dev Bounds (68% probability)
            const up1 = s0 * (1 + volT)
            const lo1 = s0 * (1 - volT)

            // 2 Std Dev Bounds (95% probability)
            const up2 = s0 * (1 + 2 * volT)
            const lo2 = s0 * (1 - 2 * volT)

            // Value at Risk (VaR) 95% over timeframe
            const var95 = 1.645 * volT
            // CVaR 95% (expected tail loss if VaR is breached)
            const cvar95 = 2.062 * volT

            const labelTime = timeframe === '1w' ? '1 Week' : '1 Month'

            return (
              <div className="grid-2-1" style={{ gap: 20 }}>
                {/* LEFT COLUMN: Expected price bounds & Final Verdict */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Final Verdict Card */}
                  <div className="card" style={{ borderLeft: '4px solid var(--cyan)', padding: 24 }}>
                    <div className="card-title" style={{ color: 'var(--cyan)', fontSize: 10, letterSpacing: 2 }}>🔮 MARI FORECAST VERDICT (95% PROBABILITY)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, marginTop: 8 }}>
                      Based on current machine learning volatility models, MARI projects with <span style={{ color: 'var(--cyan)' }}>95% extreme confidence</span> that {ticker} will trade between{' '}
                      <span style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>${lo2.toFixed(2)}</span>{' '}
                      and{' '}
                      <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>${up2.toFixed(2)}</span>{' '}
                      over the next {labelTime}.
                    </div>
                    <div style={{ display: 'flex', gap: 24, marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Expected Max Upside (2σ):</span>
                        <span style={{ marginLeft: 6, color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          +{ (2 * pctMove).toFixed(2) }%
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Expected Max Downside (2σ):</span>
                        <span style={{ marginLeft: 6, color: 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          -{ (2 * pctMove).toFixed(2) }%
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: 1.5 }}>MARI Final Price Target</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        ${lo2.toFixed(2)} — ${up2.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                        * This price target represents the extreme boundary. Highly likely to hold unless overridden by sudden geopolitical shocks.
                      </div>
                    </div>
                  </div>

                  {/* 68% Confidence interval card */}
                  <div className="card" style={{ borderLeft: '3px solid var(--amber)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: 1.5 }}>
                        68% CONFIDENCE RANGE (1 Standard Deviation)
                      </span>
                      <span className="badge badge-amber">Normal Bounds</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upper Limit:</span>
                        <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                          ${up1.toFixed(2)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(+{pctMove.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Lower Limit:</span>
                        <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red)' }}>
                          ${lo1.toFixed(2)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(-{pctMove.toFixed(1)}%)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 95% Confidence interval card */}
                  <div className="card" style={{ borderLeft: '3px solid var(--cyan)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', letterSpacing: 1.5 }}>
                        95% CONFIDENCE RANGE (2 Standard Deviations)
                      </span>
                      <span className="badge badge-cyan">Extreme Bounds</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upper Limit:</span>
                        <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                          ${up2.toFixed(2)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(+{ (2 * pctMove).toFixed(1) }%)</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Lower Limit:</span>
                        <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red)' }}>
                          ${lo2.toFixed(2)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(-{ (2 * pctMove).toFixed(1) }%)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Risk Metrics & Explanations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* VaR & CVaR */}
                  <div className="card">
                    <div className="section-header" style={{ margin: '0 0 14px' }}>Tail Risk Metrics ({labelTime})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Value at Risk (95% VaR)</span>
                          <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red)' }}>
                            {(var95 * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                          Meaning: There is a 5% chance that the asset loses more than {(var95 * 100).toFixed(1)}% of its value during this period.
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Conditional VaR (CVaR)</span>
                          <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ff6666' }}>
                            {(cvar95 * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                          Meaning: If the worst 5% case occurs, the expected average loss is {(cvar95 * 100).toFixed(1)}%. This measures extreme tail events.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Noob explanations */}
                  <div className="card" style={{ background: 'rgba(10,20,35,0.3)' }}>
                    <div className="section-header" style={{ margin: '0 0 12px' }}>How it works (for beginners)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 11, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                      <div>
                        <strong style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>68% Probability (1σ)</strong>
                        <p style={{ marginTop: 2 }}>In statistics, 1 standard deviation contains 68% of possible price path outcomes. This represents the typical price boundaries of normal trading activity.</p>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                        <strong style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>95% Probability (2σ)</strong>
                        <p style={{ marginTop: 2 }}>2 standard deviations cover 95% of expected outcomes. Breaking these bounds implies a highly anomalous market event (e.g. panic selloff or hype bubble).</p>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                        <strong style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>GBM & Volatility Inputs</strong>
                        <p style={{ marginTop: 2 }}>We take the ML model's volatility forecast and project the variance over {labelTime} using the square root of time scaling formula: <code style={{ color: 'var(--cyan)' }}>σ * √t</code>.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* CRITICAL RISK WARNING BOX */}
          <div style={{
            marginTop: 24,
            padding: '16px 20px',
            background: 'rgba(255,68,68,0.05)',
            border: '1px solid rgba(255,68,68,0.2)',
            borderRadius: 10,
            color: 'var(--text-primary)',
            fontSize: 12,
            lineHeight: 1.5,
            fontFamily: 'var(--font-mono)'
          }}>
            <span style={{ color: 'var(--red)', fontWeight: 800 }}>⚠️ CRITICAL RISK WARNING (ENGLISH):</span> Geopolitical shocks (such as military actions, strikes, or trade conflicts), major macroeconomic policy updates, central bank rate shifts, or systemic black swan events can override statistical forecasts instantaneously. The calculations presented here are strictly statistical estimates representing normal market conditions. They do NOT guarantee future price limits or absolute capital safety. Invest responsibly and use hedging strategies where possible.
          </div>
        </>
      )}
    </div>
  )
}
