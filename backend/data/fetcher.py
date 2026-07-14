# ============================================================
# data/fetcher.py
# Live data fetcher using yfinance with in-memory caching
# ============================================================

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from functools import lru_cache
import time

# ── Asset Universe ──────────────────────────────────────────
ASSETS = {
    # ETFs
    "SPY":   {"name": "S&P 500 ETF",          "category": "ETF",       "emoji": "📈"},
    "QQQ":   {"name": "Nasdaq 100 ETF",        "category": "ETF",       "emoji": "💻"},
    "IWM":   {"name": "Russell 2000 ETF",      "category": "ETF",       "emoji": "📊"},
    "EEM":   {"name": "Emerging Markets ETF",  "category": "ETF",       "emoji": "🌏"},
    "GLD":   {"name": "Gold ETF",              "category": "ETF",       "emoji": "🥇"},
    "SLV":   {"name": "Silver ETF",            "category": "ETF",       "emoji": "🥈"},
    "USO":   {"name": "Oil ETF",               "category": "ETF",       "emoji": "🛢️"},
    "TLT":   {"name": "20yr Treasury ETF",     "category": "ETF",       "emoji": "🏛️"},
    "HYG":   {"name": "High Yield Bond ETF",   "category": "ETF",       "emoji": "💰"},
    "VNQ":   {"name": "Real Estate ETF",       "category": "ETF",       "emoji": "🏢"},
    "XLE":   {"name": "Energy Sector ETF",     "category": "ETF",       "emoji": "⚡"},
    "XLF":   {"name": "Financials ETF",        "category": "ETF",       "emoji": "🏦"},
    "XLK":   {"name": "Technology ETF",        "category": "ETF",       "emoji": "🖥️"},
    "XLV":   {"name": "Healthcare ETF",        "category": "ETF",       "emoji": "🏥"},
    "DIA":   {"name": "Dow Jones ETF",         "category": "ETF",       "emoji": "🏭"},
    "IAU":   {"name": "iShares Gold Trust",    "category": "ETF",       "emoji": "🔶"},
    "INDA":  {"name": "MSCI India ETF",        "category": "ETF",       "emoji": "🇮🇳"},
    "VIXY":  {"name": "Volatility Index ETF",  "category": "ETF",       "emoji": "🎢"},
    "ARKK":  {"name": "ARK Innovation ETF",    "category": "ETF",       "emoji": "🚀"},
    "UUP":   {"name": "US Dollar Index",       "category": "ETF",       "emoji": "💵"},
    "XLY":   {"name": "Consumer Discretionary ETF", "category": "ETF",       "emoji": "🛍️"},
    "XLP":   {"name": "Consumer Staples ETF",       "category": "ETF",       "emoji": "🛒"},
    # Crypto
    "BTC-USD": {"name": "Bitcoin",             "category": "Crypto",    "emoji": "₿"},
    "ETH-USD": {"name": "Ethereum",            "category": "Crypto",    "emoji": "Ξ"},
    "SOL-USD": {"name": "Solana",              "category": "Crypto",    "emoji": "◎"},
    # Commodities (Futures)
    "GC=F":  {"name": "Gold Futures",          "category": "Commodity", "emoji": "🥇"},
    "SI=F":  {"name": "Silver Futures",        "category": "Commodity", "emoji": "🥈"},
    "CL=F":  {"name": "Crude Oil Futures",     "category": "Commodity", "emoji": "🛢️"},
    "NG=F":  {"name": "Natural Gas Futures",   "category": "Commodity", "emoji": "🔥"},
    "HG=F":  {"name": "Copper Futures",        "category": "Commodity", "emoji": "🟤"},
    "PA=F":  {"name": "Palladium Futures",     "category": "Commodity", "emoji": "🏎️"},
    "ZC=F":  {"name": "Corn Futures",          "category": "Commodity", "emoji": "🌽"},
}

# ── In-memory cache (avoids hammering yfinance API) ─────────
_price_cache: dict = {}
CACHE_TTL_SECONDS = 300  # 5 minutes

def get_cached_prices(ticker: str, period: str = "2y") -> pd.DataFrame:
    """Fetch OHLCV data with 5-minute cache."""
    cache_key = f"{ticker}_{period}"
    now = time.time()

    if cache_key in _price_cache:
        cached_time, cached_df = _price_cache[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_df

    try:
        df = yf.download(ticker, period=period, auto_adjust=True, progress=False)
        if df.empty:
            raise ValueError(f"No data returned for {ticker}")

        # Flatten MultiIndex columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df.index = pd.to_datetime(df.index)
        df = df.dropna()
        _price_cache[cache_key] = (now, df)
        return df
    except Exception as e:
        raise RuntimeError(f"Failed to fetch data for {ticker}: {e}")


def compute_returns(df: pd.DataFrame) -> pd.Series:
    """Log returns from Close prices."""
    return np.log(df["Close"] / df["Close"].shift(1)).dropna()


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Feature engineering for ML volatility model.
    All features are computed from OHLCV — no leakage.
    """
    close = df["Close"]
    high  = df["High"]
    low   = df["Low"]
    vol   = df["Volume"] if "Volume" in df.columns else pd.Series(1, index=df.index)

    ret = np.log(close / close.shift(1))

    features = pd.DataFrame(index=df.index)

    # Lagged returns
    for lag in [1, 2, 3, 5, 10, 20]:
        features[f"ret_lag_{lag}"] = ret.shift(lag)

    # Rolling realized volatility (annualized)
    for window in [5, 10, 20]:
        features[f"rv_{window}d"] = ret.rolling(window).std() * np.sqrt(252)

    # RSI
    delta = close.diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    rs    = gain / (loss + 1e-8)
    features["rsi_14"] = 100 - (100 / (1 + rs))

    # ATR (Average True Range) — normalized
    tr = pd.concat([
        high - low,
        (high - close.shift(1)).abs(),
        (low  - close.shift(1)).abs()
    ], axis=1).max(axis=1)
    features["atr_14"] = tr.rolling(14).mean() / close

    # MACD signal
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd  = ema12 - ema26
    features["macd_signal"] = macd.ewm(span=9, adjust=False).mean() / close

    # Bollinger Band width
    sma20   = close.rolling(20).mean()
    std20   = close.rolling(20).std()
    features["bb_width"] = (2 * std20) / (sma20 + 1e-8)

    # Volume ratio
    features["vol_ratio"] = vol / (vol.rolling(20).mean() + 1e-8)

    # Target: 5-day forward realized volatility
    features["target_vol_5d"] = (
        ret.shift(-1).rolling(5).std() * np.sqrt(252)
    )

    return features.dropna()


def get_asset_quote(ticker: str) -> dict:
    """Get latest price info for a ticker."""
    try:
        df = get_cached_prices(ticker, period="5d")
        latest = df.iloc[-1]
        prev   = df.iloc[-2]
        change = float(latest["Close"] - prev["Close"])
        pct    = float(change / prev["Close"] * 100)
        return {
            "ticker":  ticker,
            "name":    ASSETS.get(ticker, {}).get("name", ticker),
            "price":   float(latest["Close"]),
            "change":  round(change, 4),
            "pct":     round(pct, 2),
            "volume":  int(latest.get("Volume", 0)),
            "category": ASSETS.get(ticker, {}).get("category", "Unknown"),
        }
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}
