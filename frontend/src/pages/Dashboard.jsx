import { useEffect, useState } from 'react'
import { fetchDashboard, fetchQuotes } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const CATEGORY_COLOR = { ETF: '#ffa500', Crypto: '#4da6ff', Commodity: '#00ff88' }

const ASSET_INFO = {
  "SPY": {
    desc: "SPDR S&P 500 ETF Trust. Listed on NYSE Arca, it is the oldest and largest ETF in the world, tracking the 500 largest US large-cap equities. It represents the primary benchmark for the health of the United States corporate sector and the global stock market.",
    drivers: "Federal Reserve interest rate decisions, corporate quarterly earnings reports (EPS growth), US GDP growth rates, global trade sentiment, and headline macroeconomic indicators like inflation (CPI) and employment data."
  },
  "QQQ": {
    desc: "Invesco QQQ Trust. Tracks the Nasdaq-100 Index, comprising the 100 largest non-financial corporations listed on the Nasdaq stock market. It is heavily weighted toward high-growth technology, hardware, and digital communication sectors.",
    drivers: "Earnings reports of mega-cap tech giants (Apple, Microsoft, Nvidia), AI infrastructure spending cycles, 10-year US Treasury yields (tech stock valuations decrease when bond yields rise), and global semiconductor supply chains."
  },
  "IWM": {
    desc: "iShares Russell 2000 ETF. Tracks the performance of 2,000 small-cap US public corporations. Small-cap stocks are highly sensitive to domestic economic health and have higher borrowing costs, making them leverage-sensitive.",
    drivers: "Domestic economic expansion, regional banking credit availability, local consumption rates, and domestic credit spreads. Small-caps benefit during early economic cycles but suffer under high borrowing rates."
  },
  "EEM": {
    desc: "iShares MSCI Emerging Markets ETF. Tracks large and mid-sized equities in emerging market economies like China, India, Taiwan, Brazil, and South Korea. It is listed on NYSE Arca and exposes investors to high-growth developing economies.",
    drivers: "Strength of the US Dollar (a stronger dollar depresses emerging market asset prices due to dollar-denominated debt), Chinese industrial policy, global commodity price trends, and foreign capital flows."
  },
  "GLD": {
    desc: "SPDR Gold Shares. The largest physically backed gold ETF in the world. It holds 100% physical gold bullion stored in secure London vaults, offering liquid exposure to spot gold prices without needing physical storage.",
    drivers: "Geopolitical instability, real interest rates (gold has no yield, so when real yields drop, gold becomes highly attractive), global central bank gold purchasing trends, inflation expectations, and US Dollar movements."
  },
  "SLV": {
    desc: "iShares Silver Trust. A physically backed silver ETF that tracks the spot price of silver bullion. Unlike gold, silver serves both as a monetary safe haven and a crucial industrial metal used in manufacturing and solar cells.",
    drivers: "Industrial manufacturing demand (solar panels, electronics, EV components), precious metal safe-haven flows, inflation hedging, and global industrial manufacturing output index (PMI)."
  },
  "USO": {
    desc: "United States Oil Fund. Designed to track the daily changes of West Texas Intermediate (WTI) light, sweet crude oil spot prices. It achieves this by holding and rolling near-month WTI crude oil futures contracts on the NYMEX.",
    drivers: "OPEC+ oil production quotas, geopolitical supply shocks (Middle East, Russia), global industrial and travel demand, US shale oil production levels, and the value of the US Dollar."
  },
  "TLT": {
    desc: "iShares 20+ Year Treasury Bond ETF. Tracks long-term US government bonds. Known as a primary safe-haven asset, it appreciates when stocks crash because investors flee to the absolute safety of US government debt.",
    drivers: "Long-term inflation expectations, Federal Reserve monetary policy (rate cuts increase TLT price), term premium, and global risk-off sentiment during recessions or banking panics."
  },
  "HYG": {
    desc: "iShares iBoxx $ High Yield Corporate Bond ETF. Tracks the liquid US high-yield (junk) corporate bond market. These bonds have lower credit ratings, offering high yields but carrying significant default risks.",
    drivers: "Corporate default rate expectations, stock market volatility (high equity volatility triggers credit spread widening, dropping HYG), regional credit liquidity, and Fed rate cycles."
  },
  "VNQ": {
    desc: "Vanguard Real Estate ETF. Tracks US Real Estate Investment Trusts (REITs) across residential, commercial, industrial, and healthcare real estate. REITs pay high dividends but are highly leverage-dependent.",
    drivers: "Commercial and residential mortgage rates, physical occupancy levels, rent growth trends, and long-term interest rate yields (higher yields decrease REIT pricing relative to bonds)."
  },
  "XLE": {
    desc: "Energy Select Sector SPDR Fund. Tracks major US oil, gas, and energy infrastructure firms, heavily dominated by oil giants like ExxonMobil and Chevron. Highly sensitive to global energy demand.",
    drivers: "WTI and Brent crude oil spot prices, OPEC supply updates, global transport and airline traffic, refinery capacity bottlenecks, and clean energy transition policies."
  },
  "XLF": {
    desc: "Financial Select Sector SPDR Fund. Tracks major US banks, insurance providers, investment funds, and credit card firms, dominated by JPMorgan Chase, Berkshire Hathaway, and Goldman Sachs.",
    drivers: "Treasury yield curve steepness (banks borrow short-term and lend long-term; a steeper curve boosts profit margins), loan default rates, investment banking activity, and Fed capital requirements."
  },
  "XLK": {
    desc: "Technology Select Sector SPDR Fund. Tracks large US technology companies across software, hardware, and semiconductor manufacturing, dominated by Microsoft, Apple, and Nvidia.",
    drivers: "Enterprise IT spending, global semiconductor demand, AI software monetization cycles, and long-term bond yields (impacting growth stock valuations)."
  },
  "XLV": {
    desc: "Healthcare Select Sector SPDR Fund. Tracks US pharmaceutical, biotech, and medical device corporations. It acts as a defensive sector, performing stably during recessions.",
    drivers: "Demographic aging trends, FDA drug approval cycles, government healthcare spending policies (Medicare/Medicaid), and merger & acquisition (M&A) activity in biotech."
  },
  "DIA": {
    desc: "SPDR Dow Jones Industrial Average ETF Trust. Tracks the 30 blue-chip, historically stable US industrial and consumer giants, providing a measure of large-scale US economic output.",
    drivers: "Industrial manufacturing volumes, heavy capital expenditure cycles, global infrastructure demand, and consumer spending indices."
  },
  "IAU": {
    desc: "iShares Gold Trust. A physically backed gold ETF that holds gold bullion in secure vaults globally, offering a low-cost, liquid alternative to GLD for long-term safe-haven asset allocation.",
    drivers: "Real yields, inflation rates, central bank gold accumulation, geopolitical conflict levels, and US Dollar index strength."
  },
  "INDA": {
    desc: "iShares MSCI India ETF. Tracks large and mid-sized Indian equities listed on the National Stock Exchange (NSE), exposing investors to India's high-growth consumer, technology, and financial sectors.",
    drivers: "Reserve Bank of India (RBI) interest rate policy, global capital allocations to emerging markets, monsoon season performance (affecting rural GDP), and local corporate earnings trends."
  },
  "VIXY": {
    desc: "ProShares VIX Short-Term Futures ETF. Tracks the S&P 500 VIX Short-Term Futures Index, providing exposure to market volatility. Known as 'The Fear Gauge', it spikes violently during stock crashes.",
    drivers: "Sudden systemic market shocks, geopolitical crises, unexpected CPI inflation reports, and options market hedging volumes on the S&P 500."
  },
  "ARKK": {
    desc: "ARK Innovation ETF. An actively managed fund that targets disruptive innovations, including genomics, autonomous vehicles, fintech, and web3. Highly speculative and volatile.",
    drivers: "Growth stock liquidity, Federal Reserve rate cut cycles (low interest rates fuel speculative tech capital), venture capital flows, and retail trading enthusiasm."
  },
  "UUP": {
    desc: "Invesco DB US Dollar Index Bullish Fund. Tracks the value of the US Dollar against a basket of six major global currencies (Euro, Yen, Pound, CAD, Krona, Franc).",
    drivers: "Relative interest rate differentials (if the Fed raises rates faster than Europe, the USD strengthens), global risk-off flights to liquidity, and US balance of trade."
  },
  "XLY": {
    desc: "Consumer Discretionary Select Sector SPDR Fund. Tracks US companies that sell non-essential goods and services (automobiles, retail, hotels, and travel), dominated by Amazon, Tesla, and Home Depot.",
    drivers: "US consumer confidence indexes, household disposable income growth, credit card delinquency rates, and employment strength. Highly sensitive to economic recessions."
  },
  "XLP": {
    desc: "Consumer Staples Select Sector SPDR Fund. Tracks US firms producing essential household goods (food, beverages, hygiene products, and tobacco), dominated by Procter & Gamble, Costco, and Walmart. A primary defensive equity sector.",
    drivers: "Defensive asset flows during economic slowdowns, agricultural commodity input costs, household necessity demand, and dividend payout sustainability."
  },
  "BTC-USD": {
    desc: "Bitcoin. The largest decentralized digital asset. It operates on a global proof-of-work blockchain network. Often referred to as 'digital gold', it acts as a decentralized store of value.",
    drivers: "M2 global money supply expansions (liquidity injections), regulatory approvals of spot ETFs, institutional custody solutions, mining halving cycles (every 4 years), and risk-on market sentiment."
  },
  "ETH-USD": {
    desc: "Ethereum. The leading decentralized smart contract platform. It hosts the majority of decentralized finance (DeFi), non-fungible tokens (NFTs), and Web3 applications using its native currency, Ether.",
    drivers: "Network transaction fee levels (gas fees), smart contract developer activity, total value locked (TVL) in DeFi protocols, layer-2 scaling adoption, and staking yield rates."
  },
  "SOL-USD": {
    desc: "Solana. A high-performance, low-latency Layer-1 blockchain network designed for decentralized apps, decentralized finance, and payment systems, utilizing proof-of-history consensus.",
    drivers: "Dapp transaction volume, meme coin trading activity, active wallet growth, network uptime stability, developer capital inflows, and crypto asset liquidity cycles."
  },
  "GC=F": {
    desc: "Gold Futures (COMEX). Leveraged futures contracts trading on the COMEX division of the NYMEX, representing the global benchmark price for gold transaction clearing.",
    drivers: "Federal Reserve real interest rate curves, geopolitical tail-events, global central bank bullion reserves demand, and institutional speculative futures positioning."
  },
  "SI=F": {
    desc: "Silver Futures (COMEX). Leveraged futures contracts representing the pricing of industrial and precious silver, serving as a primary speculative trading asset for commodity hedge funds.",
    drivers: "Industrial manufacturing consumption trends, green technology adoption curves (PV cells), precious metal investment flows, and US Dollar volatility."
  },
  "CL=F": {
    desc: "Light Sweet Crude Oil Futures (NYMEX). The world's most liquid energy futures contract, tracking West Texas Intermediate (WTI) crude oil, the global pricing benchmark for light oil.",
    drivers: "OPEC+ supply coordination, US Strategic Petroleum Reserve (SPR) actions, global refining capacity levels, and global macroeconomic growth expectations."
  },
  "NG=F": {
    desc: "Natural Gas Futures (NYMEX). Futures contracts tracking US natural gas prices at the Henry Hub in Louisiana, serving as the benchmark for domestic heating and electricity energy pricing.",
    drivers: "Midwest and East Coast winter weather forecasts, European LNG import demand, domestic drilling rig counts, and natural gas storage inventory reports."
  },
  "HG=F": {
    desc: "Copper Futures (COMEX). Futures contracts tracking industrial copper, widely known as 'Dr. Copper' because its price performance acts as a diagnostic tool for global economic expansion.",
    drivers: "Chinese real estate and infrastructure spending, EV battery and wiring manufacturing indices, global grid electrification investments, and copper mining output disruptions."
  },
  "PA=F": {
    desc: "Palladium Futures (NYMEX). Futures contracts tracking palladium, a rare industrial precious metal primarily utilized in automobile catalytic converters to reduce emissions.",
    drivers: "Global auto industry production volumes, hybrid vehicle emission regulations, South African and Russian mining output stability, and platinum-to-palladium substitution rates."
  },
  "ZC=F": {
    desc: "Corn Futures (CBOT). The benchmark agricultural futures contract tracking US corn pricing on the Chicago Board of Trade, representing the global agricultural supply benchmark.",
    drivers: "US Midwest planting weather, fertilizer and natural gas input costs, global ethanol fuel mandates, Chinese livestock feed imports, and global grain shipping lane logistics."
  }
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

function QuoteCard({ q, onSelect }) {
  const up = q.pct >= 0
  return (
    <div 
      className="card" 
      onClick={onSelect}
      style={{ 
        padding: '16px 20px', 
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out' 
      }}
      onMouseOver={e => {
        e.currentTarget.style.backgroundColor = 'var(--surface-light)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--amber)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>
            {q.ticker}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
            ${q.price?.toFixed(2) ?? '—'}
            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4, fontWeight: 400 }}>
              /{q.unit}
            </span>
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
          { label: 'Highest Vol',     value: dashItems[0]?.name ?? '—',  sub: `${dashItems[0]?.ticker ?? '—'} · ${((dashItems[0]?.rv_20d??0)*100).toFixed(1)}% annualised` },
          { label: 'Lowest Vol',      value: dashItems.at(-1)?.name ?? '—', sub: `${dashItems.at(-1)?.ticker ?? '—'} · ${((dashItems.at(-1)?.rv_20d??0)*100).toFixed(1)}% annualised` },
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
          {showAllChart ? 'SHOW TOP 10' : 'EXPAND TO ALL 32'}
        </button>
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={showAllChart ? dashItems : dashItems.slice(0, 10)} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <XAxis
              dataKey="ticker"
              tick={{ fill: '#8b8d91', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
              axisLine={false} tickLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
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
        {validQuotes.map(q => <QuoteCard key={q.ticker} q={q} onSelect={() => setSelectedAsset(q)} />)}
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
              <th>Price (1M Ago)</th>
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
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  ${d.price?.toFixed(2)}
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>
                    /{d.unit}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  ${d.price_1m_ago?.toFixed(2)}
                </td>
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
