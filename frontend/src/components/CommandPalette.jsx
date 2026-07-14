import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const PAGES = [
  { label: 'Overview Dashboard',     path: '/',           icon: '⬡', desc: 'Live quotes, KPIs, volatility bar chart' },
  { label: 'ML Volatility Forecast', path: '/volatility', icon: '📈', desc: 'GARCH vs GBM, feature importance' },
  { label: 'Risk & Price Predictions', path: '/predictions', icon: '🔮', desc: 'Expected move boundaries, VaR, CVaR projections' },
  { label: 'Portfolio Optimizer',    path: '/portfolio',  icon: '⚖️', desc: 'Markowitz, efficient frontier, risk parity' },
  { label: 'Market Regime',          path: '/regime',     icon: '🎯', desc: 'KMeans clustering, transition matrix' },
]

const ASSETS = [
  { ticker: 'SPY',     name: 'S&P 500 ETF',                  cat: 'ETF' },
  { ticker: 'QQQ',     name: 'Nasdaq-100 ETF',                cat: 'ETF' },
  { ticker: 'IWM',     name: 'Russell 2000 ETF',              cat: 'ETF' },
  { ticker: 'EEM',     name: 'Emerging Markets ETF',          cat: 'ETF' },
  { ticker: 'GLD',     name: 'Gold ETF (SPDR)',                cat: 'ETF' },
  { ticker: 'SLV',     name: 'Silver Trust ETF',              cat: 'ETF' },
  { ticker: 'USO',     name: 'US Oil Fund',                   cat: 'ETF' },
  { ticker: 'TLT',     name: '20+ Year Treasury Bond ETF',    cat: 'ETF' },
  { ticker: 'HYG',     name: 'High Yield Corporate Bond ETF', cat: 'ETF' },
  { ticker: 'VNQ',     name: 'Real Estate ETF (REITs)',       cat: 'ETF' },
  { ticker: 'XLE',     name: 'Energy Sector ETF',             cat: 'ETF' },
  { ticker: 'XLF',     name: 'Financials Sector ETF',         cat: 'ETF' },
  { ticker: 'XLK',     name: 'Technology Sector ETF',         cat: 'ETF' },
  { ticker: 'XLV',     name: 'Healthcare Sector ETF',         cat: 'ETF' },
  { ticker: 'DIA',     name: 'Dow Jones Industrial ETF',      cat: 'ETF' },
  { ticker: 'IAU',     name: 'Gold Trust (iShares)',          cat: 'ETF' },
  { ticker: 'INDA',    name: 'India Equity ETF',              cat: 'ETF' },
  { ticker: 'VIXY',    name: 'VIX Short-Term Futures ETF',    cat: 'ETF' },
  { ticker: 'ARKK',    name: 'ARK Innovation ETF',            cat: 'ETF' },
  { ticker: 'UUP',     name: 'US Dollar Index ETF',           cat: 'ETF' },
  { ticker: 'XLY',     name: 'Consumer Discretionary ETF',    cat: 'ETF' },
  { ticker: 'XLP',     name: 'Consumer Staples ETF',          cat: 'ETF' },
  { ticker: 'BTC-USD', name: 'Bitcoin',                       cat: 'Crypto' },
  { ticker: 'ETH-USD', name: 'Ethereum',                      cat: 'Crypto' },
  { ticker: 'SOL-USD', name: 'Solana',                        cat: 'Crypto' },
  { ticker: 'GC=F',    name: 'Gold Futures',                  cat: 'Commodity' },
  { ticker: 'SI=F',    name: 'Silver Futures',                cat: 'Commodity' },
  { ticker: 'CL=F',    name: 'WTI Crude Oil Futures',         cat: 'Commodity' },
  { ticker: 'NG=F',    name: 'Natural Gas Futures',           cat: 'Commodity' },
  { ticker: 'HG=F',    name: 'Copper Futures',                cat: 'Commodity' },
  { ticker: 'PA=F',    name: 'Palladium Futures',             cat: 'Commodity' },
  { ticker: 'ZC=F',    name: 'Corn Futures',                  cat: 'Commodity' },
]

const CAT_COLOR = { ETF: '#ffa500', Crypto: '#4da6ff', Commodity: '#00ff88' }

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const q = query.toLowerCase()
  const matchedPages = q
    ? PAGES.filter(p => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
    : PAGES
  const matchedAssets = ASSETS.filter(a =>
    a.ticker.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
  ).slice(0, 7)

  const handlePageSelect = (path) => { navigate(path); onClose() }
  const handleAssetSelect = (ticker) => { navigate(`/volatility?asset=${ticker}`); onClose() }

  if (!isOpen) return null

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-box" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <span className="cmd-search-icon">⌕</span>
          <input
            ref={inputRef}
            className="cmd-input"
            type="text"
            placeholder="Search pages, assets, tickers..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="cmd-esc-key">Esc</kbd>
        </div>

        <div className="cmd-results">
          {matchedPages.length > 0 && (
            <div className="cmd-group">
              <div className="cmd-group-label">Pages</div>
              {matchedPages.map(p => (
                <div key={p.path} className="cmd-item" onClick={() => handlePageSelect(p.path)}>
                  <span className="cmd-item-icon">{p.icon}</span>
                  <div className="cmd-item-content">
                    <div className="cmd-item-title">{p.label}</div>
                    <div className="cmd-item-desc">{p.desc}</div>
                  </div>
                  <span className="cmd-item-enter">↵</span>
                </div>
              ))}
            </div>
          )}

          {matchedAssets.length > 0 && (
            <div className="cmd-group">
              <div className="cmd-group-label">Assets → Volatility Forecast</div>
              {matchedAssets.map(a => (
                <div key={a.ticker} className="cmd-item" onClick={() => handleAssetSelect(a.ticker)}>
                  <span className="cmd-item-icon" style={{ fontSize: 14 }}>📊</span>
                  <div className="cmd-item-content">
                    <div className="cmd-item-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 700 }}>{a.ticker}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>{a.name}</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, color: CAT_COLOR[a.cat],
                    border: `1px solid ${CAT_COLOR[a.cat]}33`,
                    borderRadius: 4, padding: '2px 6px',
                    fontFamily: 'var(--font-mono)', fontWeight: 700
                  }}>{a.cat}</span>
                </div>
              ))}
            </div>
          )}

          {matchedPages.length === 0 && matchedAssets.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              No results for "{query}"
            </div>
          )}
        </div>

        <div className="cmd-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
          <span style={{ marginLeft: 'auto', color: 'var(--amber)', fontWeight: 800, letterSpacing: 1 }}>MARI™</span>
        </div>
      </div>
    </div>
  )
}
