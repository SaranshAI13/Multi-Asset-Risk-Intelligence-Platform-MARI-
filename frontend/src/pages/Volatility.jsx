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

export default function Volatility() {
  const [ticker,  setTicker]  = useState('SPY')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [assets,  setAssets]  = useState(ASSETS_DEFAULT)

  useEffect(() => {
    fetchAssets().then(r => {
      setAssets(Object.keys(r.data.assets).slice(0, 20))
    }).catch(() => {})
  }, [])

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
          <select value={ticker} onChange={e => setTicker(e.target.value)} style={{ minWidth: 160 }}>
            {assets.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
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
              </div>
            </>
          )}

          {/* Feature Importance */}
          {featImp.length > 0 && (
            <>
              <div className="grid-2" style={{ marginBottom: 24 }}>
              <div>
                <div className="section-header">Feature Importance (Top 10)</div>
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
    </div>
  )
}
