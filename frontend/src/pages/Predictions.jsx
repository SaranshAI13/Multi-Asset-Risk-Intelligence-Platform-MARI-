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
      {/* Page Header with Search */}
      <div className="page-header" style={{ zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">Risk & Price Predictions</div>
            <div className="page-subtitle">
              1-Month expected move bounds · Value at Risk (VaR) · Geopolitical Risk Modeling
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
          {data.latest_price && (
            <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid var(--cyan)' }}>
              <div className="section-header" style={{ margin: '0 0 16px', color: 'var(--cyan)' }}>
                1-Month Expected Price Bounds & Risk Projections
              </div>
              
              {(() => {
                const s0 = data.latest_price
                const volDec = data.ml_gbm?.point_forecast ?? data.garch?.point_forecast ?? 0.15
                // 1 Month trading days = 21, annual trading days = 252
                const t = 21 / 252
                const vol1m = volDec * Math.sqrt(t)
                
                // 1 Std Dev Bounds (68% probability)
                const up1 = s0 * (1 + vol1m)
                const lo1 = s0 * (1 - vol1m)
                
                // 2 Std Dev Bounds (95% probability)
                const up2 = s0 * (1 + 2 * vol1m)
                const lo2 = s0 * (1 - 2 * vol1m)
                
                // Value at Risk (VaR) 95% over 1 month
                const var95 = 1.645 * vol1m
                // CVaR 95% (expected loss if VaR is breached)
                const cvar95 = 2.062 * vol1m

                return (
                  <div>
                    {/* Top Row: Current Asset Info */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Current Price</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                          ${s0.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>ML Vol Forecast (Annualised)</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', marginTop: 2 }}>
                          {(volDec * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Projected 1-Month Move (1σ)</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', marginTop: 2 }}>
                          ±{(vol1m * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Price Bounds Grid */}
                    <div className="grid-2" style={{ marginBottom: 20 }}>
                      {/* 68% Confidence (1 Std Dev) */}
                      <div style={{ padding: 14, background: 'rgba(255,165,0,0.02)', border: '1px solid rgba(255,165,0,0.1)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>68% EXPECTED RANGE (1σ)</span>
                          <span className="badge badge-amber" style={{ fontSize: 9 }}>Normal Move</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Upper Boundary:</span>
                          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                            ${up1.toFixed(2)} <span style={{ fontSize: 10, fontWeight: 400 }}>(+{(vol1m * 100).toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Lower Boundary:</span>
                          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red)' }}>
                            ${lo1.toFixed(2)} <span style={{ fontSize: 10, fontWeight: 400 }}>(-{(vol1m * 100).toFixed(1)}%)</span>
                          </span>
                        </div>
                      </div>

                      {/* 95% Confidence (2 Std Dev) */}
                      <div style={{ padding: 14, background: 'rgba(0,212,255,0.02)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>95% EXPECTED RANGE (2σ)</span>
                          <span className="badge badge-cyan" style={{ fontSize: 9 }}>Extreme Move</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Upper Boundary:</span>
                          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                            ${up2.toFixed(2)} <span style={{ fontSize: 10, fontWeight: 400 }}>(+{((2 * vol1m) * 100).toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Lower Boundary:</span>
                          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red)' }}>
                            ${lo2.toFixed(2)} <span style={{ fontSize: 10, fontWeight: 400 }}>(-{((2 * vol1m) * 100).toFixed(1)}%)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* VaR & CVaR Grid */}
                    <div className="grid-2" style={{ marginBottom: 20 }}>
                      <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>Value at Risk (VaR) 95%</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>
                          {(var95 * 100).toFixed(2)}%
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                          Maximum expected loss of capital over 30 days with 95% confidence under normal market conditions.
                        </div>
                      </div>
                      <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>Conditional VaR (CVaR) 95%</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#ff6666' }}>
                          {(cvar95 * 100).toFixed(2)}%
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                          Expected average loss in the worst 5% of outcomes (tail risk) if the 95% threshold is breached.
                        </div>
                      </div>
                    </div>

                    {/* Warning Alerts / Disclaimers in Mixed English/Hindi */}
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(255,68,68,0.05)',
                      border: '1px solid rgba(255,68,68,0.2)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 11,
                      lineHeight: 1.5,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      <strong style={{ color: 'var(--red)' }}>⚠️ IMPORTANT RISK WARNING:</strong> Geopolitical events (jaise US strikes, trade wars, military conflicts), extreme macroeconomic data updates, central bank rate decisions, ya black swan triggers market me instantaneous and unpredictable volatility spikes generate kar sakte hain. Boundaries values purely statistical patterns aur historical volatility inputs pe base hain - real market moves isse exact reverse ya drastically higher/lower ranges breach kar sakte hain. Invest carefully!
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  )
}
