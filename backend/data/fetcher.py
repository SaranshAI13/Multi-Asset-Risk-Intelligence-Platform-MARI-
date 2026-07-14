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
import requests

# Create a session with a real browser User-Agent to bypass Yahoo Finance rate-limiting blocks on cloud IPs
_yf_session = requests.Session()
_yf_session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
})

# ── Asset Universe ──────────────────────────────────────────
ASSETS = {
    # ETFs
    "SPY":   {"name": "S&P 500 ETF",          "category": "ETF",       "emoji": "📈", "unit": "share"},
    "QQQ":   {"name": "Nasdaq 100 ETF",        "category": "ETF",       "emoji": "💻", "unit": "share"},
    "IWM":   {"name": "Russell 2000 ETF",      "category": "ETF",       "emoji": "📊", "unit": "share"},
    "EEM":   {"name": "Emerging Markets ETF",  "category": "ETF",       "emoji": "🌏", "unit": "share"},
    "GLD":   {"name": "Gold ETF",              "category": "ETF",       "emoji": "🥇", "unit": "share"},
    "SLV":   {"name": "Silver ETF",            "category": "ETF",       "emoji": "🥈", "unit": "share"},
    "USO":   {"name": "Oil ETF",               "category": "ETF",       "emoji": "🛢️", "unit": "share"},
    "TLT":   {"name": "20yr Treasury ETF",     "category": "ETF",       "emoji": "🏛️", "unit": "share"},
    "HYG":   {"name": "High Yield Bond ETF",   "category": "ETF",       "emoji": "💰", "unit": "share"},
    "VNQ":   {"name": "Real Estate ETF",       "category": "ETF",       "emoji": "🏢", "unit": "share"},
    "XLE":   {"name": "Energy Sector ETF",     "category": "ETF",       "emoji": "⚡", "unit": "share"},
    "XLF":   {"name": "Financials ETF",        "category": "ETF",       "emoji": "🏦", "unit": "share"},
    "XLK":   {"name": "Technology ETF",        "category": "ETF",       "emoji": "🖥️", "unit": "share"},
    "XLV":   {"name": "Healthcare ETF",        "category": "ETF",       "emoji": "🏥", "unit": "share"},
    "DIA":   {"name": "Dow Jones ETF",         "category": "ETF",       "emoji": "🏭", "unit": "share"},
    "IAU":   {"name": "iShares Gold Trust",    "category": "ETF",       "emoji": "🔶", "unit": "share"},
    "INDA":  {"name": "MSCI India ETF",        "category": "ETF",       "emoji": "🇮🇳", "unit": "share"},
    "VIXY":  {"name": "Volatility Index ETF",  "category": "ETF",       "emoji": "🎢", "unit": "share"},
    "ARKK":  {"name": "ARK Innovation ETF",    "category": "ETF",       "emoji": "🚀", "unit": "share"},
    "UUP":   {"name": "US Dollar Index",       "category": "ETF",       "emoji": "💵", "unit": "share"},
    "XLY":   {"name": "Consumer Discretionary ETF", "category": "ETF",       "emoji": "🛍️", "unit": "share"},
    "XLP":   {"name": "Consumer Staples ETF",       "category": "ETF",       "emoji": "🛒", "unit": "share"},
    # Crypto
    "BTC-USD": {"name": "Bitcoin",             "category": "Crypto",    "emoji": "₿", "unit": "coin"},
    "ETH-USD": {"name": "Ethereum",            "category": "Crypto",    "emoji": "Ξ", "unit": "coin"},
    "SOL-USD": {"name": "Solana",              "category": "Crypto",    "emoji": "◎", "unit": "coin"},
    # Commodities (Futures)
    "GC=F":  {"name": "Gold Futures",          "category": "Commodity", "emoji": "🥇", "unit": "troy oz"},
    "SI=F":  {"name": "Silver Futures",        "category": "Commodity", "emoji": "🥈", "unit": "troy oz"},
    "CL=F":  {"name": "Crude Oil Futures",     "category": "Commodity", "emoji": "🛢️", "unit": "barrel"},
    "NG=F":  {"name": "Natural Gas Futures",   "category": "Commodity", "emoji": "🔥", "unit": "MMBtu"},
    "HG=F":  {"name": "Copper Futures",        "category": "Commodity", "emoji": "🟤", "unit": "lb"},
    "PA=F":  {"name": "Palladium Futures",     "category": "Commodity", "emoji": "🏎️", "unit": "troy oz"},
    "ZC=F":  {"name": "Corn Futures",          "category": "Commodity", "emoji": "🌽", "unit": "bushel"},
}

# ── In-memory cache (avoids hammering yfinance API) ─────────
_price_cache: dict = {}
CACHE_TTL_SECONDS = 300  # 5 minutes

def _fetch_from_chart_api(ticker: str, period: str) -> pd.DataFrame:
    """Fallback to direct Yahoo chart API when yfinance is blocked on cloud IPs."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
    # Map periods to API chart standards if needed
    api_period = "2y" if period == "2y" else "1y" if period == "1y" else "5d" if period == "5d" else period
    r = requests.get(url, params={"range": api_period, "interval": "1d"}, headers=headers, timeout=20)
    if r.status_code != 200:
        raise RuntimeError(f"Yahoo Chart API returned status {r.status_code}")
    
    data = r.json()
    result = data.get("chart", {}).get("result", [])
    if not result:
        raise ValueError(f"No result found in chart response for {ticker}")
    
    res = result[0]
    timestamps = res.get("timestamp", [])
    if not timestamps:
        raise ValueError(f"No timestamps found in chart response for {ticker}")
        
    quotes = res.get("indicators", {}).get("quote", [{}])[0]
    
    opens = quotes.get("open", [])
    highs = quotes.get("high", [])
    lows = quotes.get("low", [])
    closes = quotes.get("close", [])
    volumes = quotes.get("volume", [])
    
    # Ensure lists are of equal length by filling or trimming to timestamp length
    length = len(timestamps)
    def align_list(lst, fill_val=None):
        if len(lst) < length:
            return lst + [fill_val] * (length - len(lst))
        return lst[:length]

    opens = align_list(opens, None)
    highs = align_list(highs, None)
    lows = align_list(lows, None)
    closes = align_list(closes, None)
    volumes = align_list(volumes, 0)
    
    # Build DataFrame
    df = pd.DataFrame({
        "Open": opens,
        "High": highs,
        "Low": lows,
        "Close": closes,
        "Volume": volumes
    }, index=pd.to_datetime(np.array(timestamps) * 1000, unit='ms').tz_localize(None).normalize())
    
    df.index.name = "Date"
    df = df.dropna(subset=["Close"])
    return df

def get_cached_prices(ticker: str, period: str = "2y") -> pd.DataFrame:
    """Fetch OHLCV data with 5-minute cache and direct API fallback."""
    cache_key = f"{ticker}_{period}"
    now = time.time()

    if cache_key in _price_cache:
        cached_time, cached_df = _price_cache[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_df

    df = None
    # Try standard yfinance first
    try:
        df = yf.download(ticker, period=period, auto_adjust=True, progress=False, session=_yf_session)
        if df.empty:
            raise ValueError("yfinance returned empty DataFrame")
        
        # Flatten MultiIndex columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
        df = df.dropna()
    except Exception as e:
        print(f"[WARN] yfinance failed for {ticker}, trying chart API fallback... Error: {e}")
        try:
            df = _fetch_from_chart_api(ticker, period)
        except Exception as fallback_err:
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Failed to fetch data for {ticker}: {fallback_err}")

    if df is not None and not df.empty:
        _price_cache[cache_key] = (now, df)
        return df
    else:
        raise RuntimeError(f"No data returned for {ticker} from both yfinance and fallback Chart API")


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
            "unit":     ASSETS.get(ticker, {}).get("unit", "share"),
        }
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}
