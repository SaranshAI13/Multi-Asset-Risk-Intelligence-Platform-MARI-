# ============================================================
# main.py  — FastAPI Application
# Multi-Asset Risk Intelligence Platform
# ============================================================

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd

from data.fetcher import (
    ASSETS,
    get_cached_prices,
    compute_returns,
    compute_features,
    get_asset_quote,
)
from models.volatility import get_volatility_forecast
from models.portfolio  import optimize_portfolio
from models.regime     import detect_regime

# ── App setup ────────────────────────────────────────────────
app = FastAPI(
    title="Multi-Asset Risk Intelligence Platform",
    description="Real ML: GARCH + GBM volatility forecasting, Markowitz + Risk Parity optimization, KMeans regime detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic models ───────────────────────────────────────────
class PortfolioRequest(BaseModel):
    tickers:  List[str]
    rf_rate:  Optional[float] = 0.05


# ── Health ────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


# ── Asset Universe ────────────────────────────────────────────
@app.get("/api/assets")
def get_assets():
    """Return full asset universe grouped by category."""
    grouped: dict = {}
    for ticker, info in ASSETS.items():
        cat = info["category"]
        grouped.setdefault(cat, []).append({
            "ticker":   ticker,
            "name":     info["name"],
            "emoji":    info["emoji"],
            "category": cat,
        })
    return {"assets": ASSETS, "grouped": grouped, "total": len(ASSETS)}


# ── Live Prices ───────────────────────────────────────────────
@app.get("/api/prices/{ticker}")
def get_prices(ticker: str, period: str = Query("1y", enum=["1mo","3mo","6mo","1y","2y"])):
    """Fetch OHLCV price data for a given ticker."""
    ticker = ticker.upper()
    if ticker not in ASSETS:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not in asset universe")
    try:
        df = get_cached_prices(ticker, period=period)
        return {
            "ticker": ticker,
            "name":   ASSETS[ticker]["name"],
            "period": period,
            "data": {
                "dates":  df.index.strftime("%Y-%m-%d").tolist(),
                "open":   df["Open"].round(4).tolist(),
                "high":   df["High"].round(4).tolist(),
                "low":    df["Low"].round(4).tolist(),
                "close":  df["Close"].round(4).tolist(),
                "volume": df["Volume"].fillna(0).astype(int).tolist() if "Volume" in df else [],
            },
            "latest_close": float(df["Close"].iloc[-1]),
            "rows":   len(df),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Quotes (All Assets) ───────────────────────────────────────
@app.get("/api/quotes")
def get_quotes(tickers: Optional[str] = Query(None)):
    """Batch quote fetch. Pass ?tickers=SPY,GLD,BTC-USD or empty for all."""
    if tickers:
        ticker_list = [t.strip().upper() for t in tickers.split(",")]
    else:
        ticker_list = list(ASSETS.keys())

    quotes = [get_asset_quote(t) for t in ticker_list]
    return {"quotes": quotes}


# ── Volatility Forecast ───────────────────────────────────────
@app.get("/api/volatility/{ticker}")
def get_volatility(ticker: str):
    """
    Full volatility analysis:
    - GARCH(1,1) baseline
    - GradientBoosting ML model (TimeSeriesSplit validated)
    - Naive baseline
    - Feature importance
    - Model comparison table
    """
    ticker = ticker.upper()
    if ticker not in ASSETS:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")

    try:
        df          = get_cached_prices(ticker, period="2y")
        returns     = compute_returns(df)
        features_df = compute_features(df)

        result = get_volatility_forecast(ticker, returns, features_df)
        result["name"]         = ASSETS[ticker]["name"]
        result["category"]     = ASSETS[ticker]["category"]
        result["latest_price"] = float(df["Close"].iloc[-1])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Portfolio Optimizer ───────────────────────────────────────
@app.post("/api/portfolio/optimize")
def optimize(req: PortfolioRequest):
    """
    Portfolio optimization:
    - Min-Variance (Markowitz)
    - Max-Sharpe
    - Risk Parity
    - Equal Weight baseline
    - Efficient frontier
    - Correlation matrix
    """
    tickers = [t.upper() for t in req.tickers]
    invalid = [t for t in tickers if t not in ASSETS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown tickers: {invalid}")
    if len(tickers) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 assets")
    if len(tickers) > 15:
        raise HTTPException(status_code=400, detail="Max 15 assets supported")

    try:
        price_data = {}
        for t in tickers:
            df = get_cached_prices(t, period="2y")
            price_data[t] = df["Close"]

        result = optimize_portfolio(tickers, price_data, rf_rate=req.rf_rate)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Regime Detection ──────────────────────────────────────────
@app.get("/api/regime/{ticker}")
def get_regime(ticker: str):
    """
    KMeans market regime detection:
    - Current regime (Low/Medium/High Risk)
    - Regime history chart data
    - Regime statistics (avg vol, Sharpe, time %)
    - Transition probability matrix
    - Average duration per regime
    """
    ticker = ticker.upper()
    if ticker not in ASSETS:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")

    try:
        df      = get_cached_prices(ticker, period="2y")
        returns = compute_returns(df)
        result  = detect_regime(returns)
        result["ticker"] = ticker
        result["name"]   = ASSETS[ticker]["name"]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Risk Summary (Dashboard) ──────────────────────────────────
@app.get("/api/dashboard")
def get_dashboard():
    """
    Lightweight dashboard endpoint:
    - Current regime for all assets
    - 20d realized vol ranking
    """
    results = []
    for ticker in list(ASSETS.keys()):   # fetch all assets
        try:
            df      = get_cached_prices(ticker, period="6mo")
            returns = compute_returns(df)

            rv_20d   = float(returns.rolling(20).std().iloc[-1] * 252 ** 0.5)
            rv_5d    = float(returns.rolling(5).std().iloc[-1]  * 252 ** 0.5)
            ret_1m   = float(returns.tail(20).sum())

            price_today = float(df["Close"].iloc[-1])
            price_1m = float(df["Close"].iloc[-21]) if len(df) >= 21 else float(df["Close"].iloc[0])
            results.append({
                "ticker":   ticker,
                "name":     ASSETS[ticker]["name"],
                "category": ASSETS[ticker]["category"],
                "emoji":    ASSETS[ticker]["emoji"],
                "unit":     ASSETS[ticker].get("unit", "share"),
                "rv_20d":   round(rv_20d, 4),
                "rv_5d":    round(rv_5d,  4),
                "ret_1m":   round(ret_1m, 4),
                "price":    round(price_today, 4),
                "price_1m_ago": round(price_1m, 4),
            })
        except Exception:
            continue

    results.sort(key=lambda x: x["rv_20d"], reverse=True)
    return {"dashboard": results, "count": len(results)}
