// src/api.js — Centralised API layer
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api  = axios.create({ baseURL: BASE, timeout: 90000 })

export const fetchHealth     = ()           => api.get('/api/health')
export const fetchAssets     = ()           => api.get('/api/assets')
export const fetchQuotes     = (tickers)    => api.get('/api/quotes', { params: tickers ? { tickers } : {} })
export const fetchPrices     = (ticker, period='1y') => api.get(`/api/prices/${ticker}`, { params: { period } })
export const fetchVolatility = (ticker)     => api.get(`/api/volatility/${ticker}`)
export const fetchRegime     = (ticker)     => api.get(`/api/regime/${ticker}`)
export const fetchDashboard  = ()           => api.get('/api/dashboard')
export const optimizePortfolio = (tickers, rfRate=0.05) =>
  api.post('/api/portfolio/optimize', { tickers, rf_rate: rfRate })
