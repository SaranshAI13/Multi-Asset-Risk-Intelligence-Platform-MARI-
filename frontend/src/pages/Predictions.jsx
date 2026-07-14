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
            const expectedReturn = data.expected_return ?? 0.08
            // Compute days count based on selected tab
            const days = timeframe === '1w' ? 5 : 21
            const t = days / 252
            
            // Expected Single Price forecast (drift-adjusted)
            const mu_T = expectedReturn * t
            const s_exp = s0 * (1 + mu_T)
            const expectedChangePct = ((s_exp - s0) / s0) * 100

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
                  <div className="card" style={{ borderLeft: '4px solid var(--amber)', padding: 24 }}>
                    <div className="card-title" style={{ color: 'var(--amber)', fontSize: 10, letterSpacing: 2 }}>🔮 MARI FORECAST VERDICT (68% PROBABILITY)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, marginTop: 8 }}>
                      Based on current machine learning volatility models, MARI projects with <span style={{ color: 'var(--amber)' }}>68% standard confidence</span> that {ticker} will trade between{' '}
                      <span style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>${lo1.toFixed(2)}</span>{' '}
                      and{' '}
                      <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>${up1.toFixed(2)}</span>{' '}
                      over the next {labelTime}.
                    </div>
                    <div style={{ display: 'flex', gap: 24, marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Expected Upside (1σ):</span>
                        <span style={{ marginLeft: 6, color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          +{pctMove.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Expected Downside (1σ):</span>
                        <span style={{ marginLeft: 6, color: 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          -{pctMove.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Final Expected Price Verdict Section */}
                    <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(255, 165, 0, 0.03)', border: '1px solid rgba(255, 165, 0, 0.15)', borderRadius: 8 }}>
                      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                        MARI Expected Price Verdict ({labelTime})
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>CURRENT PRICE</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                            ${s0.toFixed(2)}
                          </div>
                        </div>

                        <div style={{ fontSize: 20, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>→</div>

                        <div>
                          <div style={{ fontSize: 9, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>MARI FINAL PREDICTED PRICE</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                            <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                              ${s_exp.toFixed(2)}
                            </span>
                            <span style={{
                              fontSize: 14,
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: expectedChangePct > 0 ? 'var(--green)' : expectedChangePct < 0 ? 'var(--red)' : 'var(--text-secondary)'
                            }}>
                              ({expectedChangePct > 0 ? '+' : ''}{expectedChangePct.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8, lineHeight: 1.3 }}>
                        * Expected final price represents MARI's point forecast after {labelTime}. The green/red percentage value in brackets shows the exact projected change from the current price.
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

                  {/* 68% vs 95% Reliability Explanation */}
                  <div className="card" style={{ borderLeft: '3px solid var(--amber)' }}>
                    <div className="section-header" style={{ margin: '0 0 12px', color: 'var(--amber)' }}>
                      68% vs 95% Confidence: Which is more Reliable?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 11, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                      <div>
                        <strong style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>📈 68% Confidence (1σ) — Highly Reliable & Recommended</strong>
                        <p style={{ marginTop: 3 }}>
                          This represents the <strong>standard Expected Move</strong> (1 standard deviation). Option market makers and institutional desks focus primarily on 68% bounds. It is the most reliable guide for typical daily/weekly trading because it is mathematically optimized for standard variance.
                        </p>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                        <strong style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>🛡️ 95% Confidence (2σ) — Worst-Case Stress Boundary</strong>
                        <p style={{ marginTop: 3 }}>
                          This represents extreme "tail risks" (2 standard deviations). While it covers 95% of outcomes, standard prediction models are less reliable at these boundaries because once price breaches a 2σ level, it is usually driven by unexpected geopolitical conflicts, rate hikes, or panic selloffs which math models cannot calculate.
                        </p>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10, background: 'rgba(255,165,0,0.02)', padding: 8, borderRadius: 6, border: '1px dashed rgba(255,165,0,0.1)' }}>
                        <strong style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>💡 MARI's Choice:</strong>
                        <span style={{ marginLeft: 4 }}>
                          For active risk management and pricing forecasts, **68% (1σ) is much more reliable and practical**. Use 95% solely for stress testing absolute worst-case downside limits.
                        </span>
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
