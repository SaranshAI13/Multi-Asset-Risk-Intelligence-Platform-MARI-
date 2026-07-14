import { useEffect, useState } from 'react'
import { fetchVolatility, fetchAssets } from '../api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine, BarChart, Bar, Cell
} from 'recharts'

const ASSETS_DEFAULT = ['SPY', 'GLD', 'QQQ', 'BTC-USD', 'GC=F', 'TLT']

function ModelBadge({ type }) {
  if (type === 'ml')          return <span className="badge badge-green">ML · GBM</span>
  if (type === 'statistical') return <span className="badge badge-blue">GARCH(1,1)</span>
  return <span className="badge badge-amber">Baseline</span>
}

function ShapExplainability({ shap }) {
  if (!shap || shap.error) {
    return (
      <div className="card" style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        {shap?.error || 'SHAP explainability not available.'}
      </div>
    )
  }

  const sortedSHAP = Object.entries(shap.values)
    .map(([k, v]) => ({ feature: k, value: v }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  const maxVal = Math.max(...sortedSHAP.map(x => Math.abs(x.value)), 0.001)

  // Calculate the predicted value from the sum of base value + shap values
  const totalAttribution = Object.values(shap.values).reduce((a, b) => a + b, 0)
  const finalPrediction = shap.base_value + totalAttribution

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
        <div>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>BASE VALUE (AVERAGE EXPECTED):</span>
          <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {(shap.base_value * 100).toFixed(2)}%
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>THIS FORECAST:</span>
          <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#00ff88' }}>
            {(finalPrediction * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sortedSHAP.map(x => {
          const isPositive = x.value >= 0
          const pctWidth = (Math.abs(x.value) / maxVal) * 45 // max 45% width from center
          return (
            <div key={x.feature} style={{ display: 'flex', alignItems: 'center', height: 24 }}>
              <div style={{ width: '120px', fontSize: 11, color: '#c9d1d9', fontFamily: 'var(--font-mono)' }}>
                {x.feature}
              </div>

              <div style={{ flex: 1, display: 'flex', position: 'relative', height: '100%', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                
                {isPositive ? (
                  <div style={{ 
                    position: 'absolute', 
                    left: '50%', 
                    width: `${pctWidth}%`, 
                    height: '60%', 
                    backgroundColor: 'rgba(0, 255, 136, 0.15)', 
                    borderLeft: '2px solid #00ff88',
                    borderRadius: '0 2px 2px 0'
                  }} />
                ) : (
                  <div style={{ 
                    position: 'absolute', 
                    right: '50%', 
                    width: `${pctWidth}%`, 
                    height: '60%', 
                    backgroundColor: 'rgba(255, 69, 58, 0.15)', 
                    borderRight: '2px solid #ff453a',
                    borderRadius: '2px 0 0 2px'
                  }} />
                )}
              </div>

              <div style={{ 
                width: '80px', 
                textAlign: 'right', 
                fontSize: 11, 
                fontWeight: 600,
                fontFamily: 'var(--font-mono)', 
                color: isPositive ? '#00ff88' : '#ff453a' 
              }}>
                {isPositive ? '+' : ''}{(x.value * 100).toFixed(3)}%
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 14, fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>
        * SHAP values explain how much each feature pushed today's prediction away from the historical base average.
      </div>
    </div>
  )
}

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card" style={{ padding: '10px 14px', minWidth: 180 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: p.color }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: p.color, fontWeight: 700 }}>
            {(p.value * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

const FEATURE_EXPLANATIONS = {
  "rv_5d": { title: "5-Day Realized Volatility", desc: "Short-term annualized historical volatility calculated from the standard deviation of daily log returns over the last 5 trading days. It measures rapid volatility spikes or immediate market shocks." },
  "rv_10d": { title: "10-Day Realized Volatility", desc: "Medium-term annualized historical volatility based on log returns of the last 10 trading days. Indicates the intensity of volatility over a bi-weekly window." },
  "rv_20d": { title: "20-Day Realized Volatility", desc: "Standard 1-month annualized historical volatility based on daily log returns of the last 20 trading days. Used as the default baseline in asset pricing and volatility models." },
  "ret_lag_1": { title: "1-Day Lag Return", desc: "The log return of the asset from yesterday. Captures the immediate day-to-day market momentum and reaction to news." },
  "ret_lag_2": { title: "2-Day Lag Return", desc: "The log return of the asset from 2 sessions ago. Models short-term return autocorrelation." },
  "ret_lag_3": { title: "3-Day Lag Return", desc: "The log return of the asset from 3 sessions ago. Captures rolling short-term momentum." },
  "ret_lag_5": { title: "5-Day Lag Return", desc: "The log return from 5 sessions ago (exactly 1 calendar week ago). Helps capture weekly cyclical trends." },
  "ret_lag_10": { title: "10-Day Lag Return", desc: "The log return from 10 sessions ago (2 weeks ago). Models bi-weekly momentum." },
  "ret_lag_20": { title: "20-Day Lag Return", desc: "The log return from 20 sessions ago (1 calendar month ago). Captures monthly macro trends and price reversals." },
  "rsi_14": { title: "Relative Strength Index (RSI 14)", desc: "A momentum oscillator that ranges from 0 to 100. RSI > 70 indicates an overbought condition (which can lead to a volatility drop or trend reversal), and RSI < 30 indicates an oversold condition." },
  "atr_14": { title: "Average True Range (ATR 14)", desc: "Tracks daily price dispersion based on the average true range of intraday price movements normalized by current price. High ATR values mean wide daily trading bands, signaling high uncertainty." },
  "macd_signal": { title: "MACD Signal Line", desc: "Moving Average Convergence Divergence signal line normalized by price. Captures trend direction; positive values indicate bullish momentum while negative values represent bearish momentum." },
  "bb_width": { title: "Bollinger Band Width", desc: "Calculates the distance between the upper and lower Bollinger Bands normalized by the rolling moving average. A narrow width indicates low volatility ('squeeze'), which often precedes a major volatility breakout." },
  "vol_ratio": { title: "Volume Ratio", desc: "Compares today's trading volume to its 20-day rolling average. Spike in volume ratio (vol_ratio > 1.0) indicates high trading activity, which heavily correlates with institutional participation and volatility expansion." }
};

function FeatureInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 600, maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto', padding: 24, position: 'relative', border: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24 }}>&times;</button>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>ML Model Feature Explanations</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.4 }}>
          Our Gradient Boosting Machine (ML) models use these 14 engineered technical indicators to predict future realized volatility. Here is what they mean in simple terms:
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(FEATURE_EXPLANATIONS).map(([key, f]) => (
            <div key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>{key}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>— {f.title}</span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Volatility() {
  const [ticker,  setTicker]  = useState('SPY')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [allAssetsMap, setAllAssetsMap] = useState({})
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFeatureInfoModal, setShowFeatureInfoModal] = useState(false)

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

  let histChart = []
  if (data?.ml_gbm?.history) {
    histChart = data.ml_gbm.history.dates.map((d, i) => ({
      date:      d,
      actual:    data.ml_gbm.history.actual[i],
      predicted: data.ml_gbm.history.predicted[i],
    })).filter((_, i) => i % 2 === 0)    // thin out for performance
    
    // Add the future projection point (No actual data, only predicted)
    histChart.push({
      date: 'Next 5D',
      actual: null,
      predicted: data.ml_gbm.point_forecast
    })
  }

  const featImp = data?.ml_gbm?.feature_importance ?? []

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">ML Volatility Forecasting</div>
            <div className="page-subtitle">
              GARCH(1,1) Baseline vs GradientBoosting Challenger · TimeSeriesSplit validated · 5-day forward forecast
            </div>
          </div>
          
          {/* Custom Searchable Dropdown */}
          <div style={{ position: 'relative', width: 240, zIndex: 1000 }}>
            <div 
              onClick={() => setIsOpen(!isOpen)}
              style={{
                background: 'var(--surface-light)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
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
                background: '#0d1117',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
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
                    borderBottom: '1px solid var(--border)',
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
          <div className="loading-text">TRAINING MODELS ON LIVE DATA · {ticker}</div>
        </div>
      )}
      {error && <div className="error-box">{error}</div>}

      {data && !loading && (
        <>
          {/* Model Comparison KPIs */}
          <div className="grid-3" style={{ marginBottom: 24 }}>
            {(data.model_comparison ?? []).map(m => (
              <div key={m.model} className="card">
                <div className="card-title">{m.model}</div>
                <div className="card-value" style={{
                  color: m.type === 'ml' ? 'var(--green)' : m.type === 'statistical' ? 'var(--blue)' : 'var(--amber)'
                }}>
                  {(m.forecast * 100).toFixed(1)}%
                </div>
                <div className="card-sub">
                  {m.rmse !== '—' ? `CV RMSE: ${(m.rmse * 100).toFixed(2)}%` : '20-day rolling baseline'}
                </div>
                <div style={{ marginTop: 8 }}><ModelBadge type={m.type} /></div>
              </div>
            ))}
          </div>

          {/* 1-Month Expected Move Bounds & VaR Projection */}
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

          {/* GARCH Params */}
          {data.garch?.params && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="section-header" style={{ margin: '0 0 12px' }}>GARCH(1,1) Parameters</div>
              <div style={{ display: 'flex', gap: 32 }}>
                {Object.entries(data.garch.params).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>{k.toUpperCase()}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>{v}</div>
                  </div>
                ))}
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>RMSE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>{(data.garch.rmse * 100).toFixed(2)}%</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                * GARCH(1,1) is a classical statistical model that estimates volatility persistence (Beta) and reaction to news (Alpha) based on historical returns.
              </div>
            </div>
          )}

          {/* ML Predicted vs Actual Chart */}
          {histChart.length > 0 && (
            <>
              <div className="section-header">GBM Forecast vs Realised Volatility (Last 50 Sessions)</div>
              <div className="card" style={{ marginBottom: 24 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={histChart} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,165,0,0.06)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#8b8d91', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      tickFormatter={d => d.slice(5)}
                      interval={9}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tickFormatter={v => `${(v*100).toFixed(0)}%`}
                      tick={{ fill: '#8b8d91', fontSize: 10 }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<LineTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8b8d91' }}
                    />
                    <Line type="monotone" dataKey="actual"    stroke="#ffa500" strokeWidth={2} dot={false} name="Actual RV" />
                    <Line type="monotone" dataKey="predicted" stroke="#00ff88" strokeWidth={2} dot={false} name="GBM Predicted" strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                  * This chart tracks our Gradient Boosting Machine (ML model) forecasts against the actual realized volatility. The 'Next 5D' point represents the future forecast.
                </div>
              </div>
            </>
          )}

          {/* Feature Importance */}
          {featImp.length > 0 && (
            <>
              <div className="grid-2" style={{ marginBottom: 24 }}>
              <div>
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>Feature Importance (Top 10)</div>
                  <button 
                    onClick={() => setShowFeatureInfoModal(true)} 
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: 'var(--amber)', 
                      fontSize: 11, 
                      cursor: 'pointer', 
                      fontFamily: 'var(--font-mono)', 
                      textDecoration: 'underline' 
                    }}
                  >
                    Explain Features
                  </button>
                </div>
                <div className="card">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={featImp.map(([f,v]) => ({ feature: f, importance: v }))}
                      layout="vertical" margin={{ left: 20, right: 16 }}>
                      <XAxis type="number" tick={{ fill: '#8b8d91', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="feature" width={110}
                        tick={{ fill: '#c9d1d9', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                        axisLine={false} tickLine={false}
                      />
                      <Tooltip formatter={v => (v * 100).toFixed(2) + '%'} />
                      <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                        {featImp.map((_, i) => <Cell key={i} fill={i === 0 ? '#ffa500' : i < 3 ? '#ffb733' : '#4a4d52'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                    * Feature Importance shows which mathematical technical indicators have the highest weight in training the Machine Learning model. Click 'Explain Features' above for details.
                  </div>
                </div>
              </div>

              {/* Model Report Card */}
              <div>
                <div className="section-header">ML Model Report Card</div>
                <div className="card">
                  <table className="data-table">
                    <tbody>
                      {[
                        ['Model',       'GradientBoostingRegressor'],
                        ['Validation',  'TimeSeriesSplit (5 folds)'],
                        ['CV RMSE',     `${(data.ml_gbm.cv_rmse_mean * 100).toFixed(3)}% ± ${(data.ml_gbm.cv_rmse_std * 100).toFixed(3)}%`],
                        ['CV MAE',      `${(data.ml_gbm.cv_mae_mean * 100).toFixed(3)}%`],
                        ['Forecast',    `${(data.ml_gbm.point_forecast * 100).toFixed(2)}%`],
                        ['90% CI',      `[${(data.ml_gbm.ci_lower * 100).toFixed(1)}%, ${(data.ml_gbm.ci_upper * 100).toFixed(1)}%]`],
                        ['Features',    `${data.ml_gbm.feature_importance.length} engineered`],
                        ['Target',      '5-day forward RV (annualised)'],
                      ].map(([k,v]) => (
                        <tr key={k}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', width: '40%' }}>{k}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="section-header" style={{ marginTop: 24 }}>Prediction Attribution (SHAP Local Explainer)</div>
            <div style={{ marginBottom: 24 }}>
              <ShapExplainability shap={data.ml_gbm.shap} />
            </div>
          </>
          )}
        </>
      )}
      <FeatureInfoModal isOpen={showFeatureInfoModal} onClose={() => setShowFeatureInfoModal(false)} />
    </div>
  )
}
