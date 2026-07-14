import { useEffect, useState } from 'react'
import { fetchDashboard, fetchQuotes } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const CATEGORY_COLOR = { ETF: '#ffa500', Crypto: '#4da6ff', Commodity: '#00ff88' }

const ASSET_INFO = {
  "SPY": { desc: "S&P 500 ETF. The benchmark for the overall US economy.", drivers: "Interest rates, corporate earnings, GDP growth." },
  "QQQ": { desc: "Nasdaq 100 ETF. High concentration in Big Tech (Apple, Microsoft, Nvidia).", drivers: "Tech earnings, AI trends, treasury yields." },
  "IWM": { desc: "Russell 2000 ETF. Tracks small-cap US companies.", drivers: "Domestic economy strength, bank lending rates." },
  "EEM": { desc: "Emerging Markets ETF. Tracks China, India, Taiwan, etc.", drivers: "US Dollar strength, global trade, China policy." },
  "GLD": { desc: "Gold ETF. Safe haven asset.", drivers: "Inflation fears, geopolitical tension, dropping real yields." },
  "SLV": { desc: "Silver ETF. Both a precious metal and industrial metal.", drivers: "Manufacturing demand (solar/electronics), inflation." },
  "USO": { desc: "Oil ETF. Tracks crude oil futures.", drivers: "OPEC supply, global travel, recession fears." },
  "TLT": { desc: "20yr Treasury ETF. Extremely sensitive to interest rates.", drivers: "Federal Reserve policy, inflation data." },
  "HYG": { desc: "High Yield Corporate Bond ETF. 'Junk' bonds.", drivers: "Corporate default risk, stock market health." },
  "VNQ": { desc: "Real Estate ETF. Tracks REITs.", drivers: "Mortgage rates, commercial real estate occupancy." },
  "XLE": { desc: "Energy Sector ETF. Big oil companies like Exxon.", drivers: "Oil prices, regulatory environment." },
  "XLF": { desc: "Financials ETF. Big banks like JPMorgan.", drivers: "Yield curve steepness, loan default rates." },
  "XLK": { desc: "Technology ETF. Software and hardware.", drivers: "Innovation cycles, capital expenditure." },
  "XLV": { desc: "Healthcare ETF. Pharma and managed care.", drivers: "Drug approvals, government policy." },
  "DIA": { desc: "Dow Jones ETF. Top 30 blue-chip US companies.", drivers: "Industrial output, consumer spending." },
  "IAU": { desc: "iShares Gold Trust. Alternative to GLD.", drivers: "Same as GLD." },
  "BTC-USD": { desc: "Bitcoin. The largest cryptocurrency.", drivers: "Adoption, liquidity, halving cycles, regulation." },
  "ETH-USD": { desc: "Ethereum. Smart contract platform.", drivers: "DeFi usage, gas fees, staking yields." },
  "SOL-USD": { desc: "Solana. High-speed layer-1 blockchain.", drivers: "Network activity, meme coin volume." },
  "GC=F": { desc: "Gold Futures.", drivers: "Same as GLD but highly leveraged." },
  "SI=F": { desc: "Silver Futures.", drivers: "Industrial demand." },
  "CL=F": { desc: "Crude Oil Futures.", drivers: "OPEC, strategic reserves." },
  "NG=F": { desc: "Natural Gas Futures.", drivers: "Weather forecasts, European energy supply." },
  "HG=F": { desc: "Copper Futures. 'Dr. Copper'.", drivers: "Housing starts, EV production, Chinese infrastructure." },
  "INDA": { desc: "MSCI India ETF. Tracks top Indian companies.", drivers: "RBI policy, monsoon, foreign institutional investment." },
  "VIXY": { desc: "Volatility Index ETF. 'The Fear Gauge'.", drivers: "Market crashes, uncertainty, sudden news." },
  "ARKK": { desc: "ARK Innovation ETF. Hyper-growth tech.", drivers: "Very sensitive to interest rates. Speculative." },
  "UUP": { desc: "US Dollar Index. Tracks USD against a basket of currencies.", drivers: "Fed rate hikes, global crises." },
  "PA=F": { desc: "Palladium Futures.", drivers: "Auto industry (catalytic converters), supply from Russia/South Africa." },
  "ZC=F": { desc: "Corn Futures.", drivers: "Weather in the Midwest, ethanol demand, fertilizer prices." },
}

function AssetModal({ asset, onClose }) {
  if (!asset) return null;
  const info = ASSET_INFO[asset.ticker] || { desc: 'No additional info available.', drivers: 'Market dynamics.' };
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 450, maxWidth: '90%', padding: 24, position: 'relative', border: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24 }}>&times;</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{asset.ticker}</div>
          <span className={`badge badge-${asset.category==='ETF'?'amber':asset.category==='Crypto'?'blue':'green'}`}>{asset.category}</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>{asset.name}</div>
        
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>What is it?</div>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text)' }}>{info.desc}</div>
        </div>
        
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Key Drivers (What moves it)</div>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--amber)', fontWeight: 500 }}>{info.drivers}</div>
        </div>
      </div>
    </div>
  )
}

function QuoteCard({ q }) {
  const up = q.pct >= 0
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>
            {q.ticker}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
            ${q.price?.toFixed(2) ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: up ? 'var(--green)' : 'var(--red)', marginTop: 3, fontWeight: 600 }}>
            {up ? '▲' : '▼'} {Math.abs(q.pct).toFixed(2)}%
          </div>
        </div>
        <div>
          <span className={`badge badge-${
            q.category === 'ETF' ? 'amber' : q.category === 'Crypto' ? 'blue' : 'green'
          }`}>
            {q.category}
          </span>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {q.name?.substring(0, 22)}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card" style={{ padding: '10px 14px', minWidth: 140 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--amber)', marginTop: 4 }}>
        {(payload[0].value * 100).toFixed(1)}% vol
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [dash,   setDash]   = useState(null)
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [showAllChart, setShowAllChart] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchQuotes()])
      .then(([d, q]) => {
        setDash(d.data)
        setQuotes(q.data.quotes)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading-wrap">
      <div className="spinner" />
      <div className="loading-text">FETCHING LIVE MARKET DATA...</div>
    </div>
  )
  if (error) return <div className="error-box">Failed to load: {error}</div>

  const dashItems = dash?.dashboard ?? []
  const validQuotes = quotes.filter(q => !q.error && q.price)

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">Market Overview</div>
            <div className="page-subtitle">
              Real-time risk analytics · {validQuotes.length} assets · Live via yfinance
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
              {new Date().toLocaleString('en-US', { hour12: false })}
            </div>
            <span className="badge badge-green" style={{ marginTop: 6 }}>● LIVE</span>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Assets Tracked',  value: validQuotes.length,    sub: 'ETFs · Crypto · Commodities' },
          { label: 'Avg Volatility',  value: dashItems.length ? `${(dashItems.reduce((a,x) => a + x.rv_20d, 0) / dashItems.length * 100).toFixed(1)}%` : '—', sub: '20-day annualised' },
          { label: 'Highest Vol',     value: dashItems[0]?.ticker ?? '—',  sub: `${((dashItems[0]?.rv_20d??0)*100).toFixed(1)}% annualised` },
          { label: 'Lowest Vol',      value: dashItems.at(-1)?.ticker ?? '—', sub: `${((dashItems.at(-1)?.rv_20d??0)*100).toFixed(1)}% annualised` },
        ].map(kpi => (
          <div key={kpi.label} className="card">
            <div className="card-title">{kpi.label}</div>
            <div className="card-value">{kpi.value}</div>
            <div className="card-sub">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Volatility Heatmap Bar Chart */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Volatility Ranking (20-Day Annualised)</div>
        <button 
          onClick={() => setShowAllChart(!showAllChart)}
          style={{
            background: 'var(--surface-light)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {showAllChart ? 'SHOW TOP 10' : 'EXPAND TO ALL 30'}
        </button>
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={showAllChart ? dashItems : dashItems.slice(0, 10)} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <XAxis
              dataKey="ticker"
              tick={{ fill: '#8b8d91', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={v => `${(v*100).toFixed(0)}%`}
              tick={{ fill: '#8b8d91', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,165,0,0.05)' }} />
            <Bar dataKey="rv_20d" radius={[4, 4, 0, 0]}>
              {(showAllChart ? dashItems : dashItems.slice(0, 10)).map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.rv_20d > 0.4 ? '#ff4444' :
                    entry.rv_20d > 0.25 ? '#ffa500' : '#00ff88'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Live Quote Cards */}
      <div className="section-header">Live Quotes</div>
      <div className="grid-4">
        {validQuotes.map(q => <QuoteCard key={q.ticker} q={q} />)}
      </div>

      {/* Risk Table */}
      <div className="section-header">Risk Summary Table</div>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>1-Month Return</th>
              <th>5-Day RV</th>
              <th>20-Day RV</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {dashItems.map(d => (
              <tr 
                key={d.ticker} 
                onClick={() => setSelectedAsset(d)} 
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-light)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 700 }}>{d.ticker}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{d.name}</td>
                <td><span className={`badge badge-${d.category==='ETF'?'amber':d.category==='Crypto'?'blue':'green'}`}>{d.category}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>${d.price?.toFixed(2)}</td>
                <td className={d.ret_1m >= 0 ? 'positive' : 'negative'}>
                  {d.ret_1m >= 0 ? '▲' : '▼'} {Math.abs(d.ret_1m * 100).toFixed(1)}%
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(d.rv_5d  * 100).toFixed(1)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(d.rv_20d * 100).toFixed(1)}%</td>
                <td>
                  <span className={`badge badge-${d.rv_20d > 0.4 ? 'red' : d.rv_20d > 0.25 ? 'amber' : 'green'}`}>
                    {d.rv_20d > 0.4 ? '🔴 HIGH' : d.rv_20d > 0.25 ? '🟡 MED' : '🟢 LOW'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  )
}
