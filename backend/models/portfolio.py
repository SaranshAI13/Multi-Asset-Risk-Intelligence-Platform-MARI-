# ============================================================
# models/portfolio.py
# Markowitz Mean-Variance + Risk Parity optimization
# Uses scipy.optimize — real numerical optimization
# ============================================================

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.covariance import ledoit_wolf
from typing import List, Tuple


def _annualized_stats(weights: np.ndarray, mu: np.ndarray, cov: np.ndarray) -> Tuple[float, float, float]:
    """Return (expected_return, volatility, sharpe_ratio) for a weight vector."""
    ret = float(weights @ mu)
    vol = float(np.sqrt(weights @ cov @ weights))
    shr = ret / (vol + 1e-8)
    return ret, vol, shr


def _min_variance_weights(mu: np.ndarray, cov: np.ndarray, n: int) -> np.ndarray:
    """Minimize portfolio variance (no short-selling)."""
    init   = np.ones(n) / n
    bounds = [(0.0, 1.0)] * n
    constr = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}

    result = minimize(
        fun=lambda w: w @ cov @ w,
        x0=init,
        method="SLSQP",
        bounds=bounds,
        constraints=constr,
        options={"ftol": 1e-12, "maxiter": 1000}
    )
    return result.x if result.success else init


def _max_sharpe_weights(mu: np.ndarray, cov: np.ndarray, n: int, rf: float = 0.05) -> np.ndarray:
    """Maximize Sharpe ratio (no short-selling)."""
    init   = np.ones(n) / n
    bounds = [(0.0, 1.0)] * n
    constr = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}

    def neg_sharpe(w):
        ret = w @ mu
        vol = np.sqrt(w @ cov @ w + 1e-10)
        return -(ret - rf) / vol

    result = minimize(
        fun=neg_sharpe,
        x0=init,
        method="SLSQP",
        bounds=bounds,
        constraints=constr,
        options={"ftol": 1e-12, "maxiter": 1000}
    )
    return result.x if result.success else init


def _risk_parity_weights(cov: np.ndarray, n: int) -> np.ndarray:
    """
    Risk Parity: each asset contributes equally to portfolio risk.
    Solved via iterative optimization.
    """
    init   = np.ones(n) / n
    bounds = [(1e-4, 1.0)] * n
    constr = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}

    def risk_parity_objective(w):
        port_vol = np.sqrt(w @ cov @ w)
        mrc      = cov @ w / (port_vol + 1e-10)   # Marginal Risk Contribution
        rc       = w * mrc                          # Risk Contribution
        # Minimize sum of squared deviations from equal risk
        target = port_vol / n
        return np.sum((rc - target) ** 2)

    result = minimize(
        fun=risk_parity_objective,
        x0=init,
        method="SLSQP",
        bounds=bounds,
        constraints=constr,
        options={"ftol": 1e-12, "maxiter": 2000}
    )
    w = result.x if result.success else init
    return w / w.sum()


def _efficient_frontier(mu: np.ndarray, cov: np.ndarray, n: int, n_points: int = 50) -> list:
    """Generate efficient frontier points."""
    min_ret = float(np.min(mu))
    max_ret = float(np.max(mu))
    targets = np.linspace(min_ret, max_ret, n_points)

    frontier = []
    for target_ret in targets:
        bounds = [(0.0, 1.0)] * n
        constr = [
            {"type": "eq", "fun": lambda w: np.sum(w) - 1.0},
            {"type": "eq", "fun": lambda w, r=target_ret: w @ mu - r},
        ]
        res = minimize(
            fun=lambda w: w @ cov @ w,
            x0=np.ones(n) / n,
            method="SLSQP",
            bounds=bounds,
            constraints=constr,
            options={"ftol": 1e-10, "maxiter": 500}
        )
        if res.success:
            vol = float(np.sqrt(res.x @ cov @ res.x))
            frontier.append({
                "vol": round(vol, 4),
                "ret": round(float(target_ret), 4),
                "sharpe": round(float(target_ret) / (vol + 1e-8), 3)
            })
    return frontier


def _risk_contribution(weights: np.ndarray, cov: np.ndarray, tickers: List[str]) -> list:
    """Compute Marginal Contribution to Risk (MCTR) for each asset."""
    port_vol = float(np.sqrt(weights @ cov @ weights))
    mrc      = cov @ weights / (port_vol + 1e-10)
    rc       = weights * mrc

    return [
        {
            "ticker": t,
            "weight": round(float(w), 4),
            "risk_contribution": round(float(r), 4),
            "pct_risk": round(float(r / (port_vol + 1e-10) * 100), 2),
        }
        for t, w, r in zip(tickers, weights, rc)
    ]


def optimize_portfolio(tickers: List[str], price_data: dict, rf_rate: float = 0.05) -> dict:
    """
    Master portfolio optimizer.
    price_data: {ticker: pd.Series of Close prices}
    Returns min-variance, max-sharpe, risk-parity portfolios + efficient frontier.
    """
    # Align price series
    prices_df = pd.DataFrame({t: price_data[t] for t in tickers}).dropna()

    if len(prices_df) < 60:
        return {"error": "Need at least 60 days of aligned data"}
    if len(tickers) < 2:
        return {"error": "Need at least 2 assets"}

    # Annualized returns and covariance
    log_ret  = np.log(prices_df / prices_df.shift(1)).dropna()
    mu       = log_ret.mean().values * 252          # annualized
    
    # Ledoit-Wolf Shrinkage
    shrunk_cov, shrinkage_intensity = ledoit_wolf(log_ret.values)
    cov      = shrunk_cov * 252                    # annualized
    n        = len(tickers)

    # ── Solve three portfolios ──────────────────────────────
    w_minvar  = _min_variance_weights(mu, cov, n)
    w_maxshr  = _max_sharpe_weights(mu, cov, n, rf=rf_rate)
    w_rp      = _risk_parity_weights(cov, n)
    w_eq      = np.ones(n) / n                      # Equal weight baseline

    def fmt_port(w, label):
        ret, vol, shr = _annualized_stats(w, mu, cov)
        return {
            "label":    label,
            "weights":  [{"ticker": t, "weight": round(float(wt), 4)} for t, wt in zip(tickers, w)],
            "expected_return": round(ret, 4),
            "volatility":      round(vol, 4),
            "sharpe_ratio":    round(shr, 3),
            "risk_contributions": _risk_contribution(w, cov, tickers),
        }

    return {
        "tickers":          tickers,
        "n_assets":         n,
        "data_points":      len(prices_df),
        "shrinkage_intensity": round(float(shrinkage_intensity * 100), 2),
        "min_variance":     fmt_port(w_minvar, "Min Variance"),
        "max_sharpe":       fmt_port(w_maxshr, "Max Sharpe"),
        "risk_parity":      fmt_port(w_rp,     "Risk Parity"),
        "equal_weight":     fmt_port(w_eq,     "Equal Weight"),
        "efficient_frontier": _efficient_frontier(mu, cov, n),
        "correlation_matrix": {
            "tickers": tickers,
            "matrix":  log_ret.corr().round(3).values.tolist(),
        }
    }
