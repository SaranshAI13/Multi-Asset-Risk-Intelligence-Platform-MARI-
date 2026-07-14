# ============================================================
# models/regime.py
# Market Regime Detection using KMeans + Hidden Markov Model
# ============================================================

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from typing import List


REGIME_LABELS = {0: "LOW RISK", 1: "MEDIUM RISK", 2: "HIGH RISK"}
REGIME_COLORS = {0: "#00ff88",  1: "#ffa500",      2: "#ff4444"}
REGIME_ICONS  = {0: "🟢",       1: "🟡",            2: "🔴"}


def _build_regime_features(returns: pd.Series) -> pd.DataFrame:
    """
    Build feature matrix for regime detection.
    Uses rolling volatility + momentum — no look-ahead bias.
    """
    feats = pd.DataFrame(index=returns.index)

    # Realized volatility at multiple horizons
    feats["rv_5d"]  = returns.rolling(5).std()  * np.sqrt(252)
    feats["rv_20d"] = returns.rolling(20).std() * np.sqrt(252)
    feats["rv_60d"] = returns.rolling(60).std() * np.sqrt(252)

    # Momentum
    feats["mom_20d"] = returns.rolling(20).sum()
    feats["mom_60d"] = returns.rolling(60).sum()

    # Volatility ratio (short/long) — detects vol regime shifts
    feats["vol_ratio"] = feats["rv_5d"] / (feats["rv_60d"] + 1e-8)

    # Skewness of recent returns
    feats["skew_20d"] = returns.rolling(20).skew()

    return feats.dropna()


def detect_regime(returns: pd.Series, n_regimes: int = 3) -> dict:
    """
    KMeans-based market regime detection.
    Regimes are ordered by volatility level (0=low, 1=medium, 2=high).
    """
    feats_df = _build_regime_features(returns)

    if len(feats_df) < 30:
        return {"error": "Not enough data for regime detection"}

    scaler  = StandardScaler()
    X       = scaler.fit_transform(feats_df.values)

    # KMeans with multiple restarts for stability
    km = KMeans(n_clusters=n_regimes, n_init=20, random_state=42)
    raw_labels = km.fit_predict(X)

    # Order clusters by average volatility (low → high)
    cluster_vols = {}
    for c in range(n_regimes):
        mask = raw_labels == c
        cluster_vols[c] = float(feats_df["rv_20d"].values[mask].mean())

    sorted_clusters = sorted(cluster_vols.items(), key=lambda x: x[1])
    remap = {old: new for new, (old, _) in enumerate(sorted_clusters)}
    labels = np.array([remap[l] for l in raw_labels])

    # ── Current regime ────────────────────────────────────────
    current_label = int(labels[-1])
    current_regime = REGIME_LABELS[current_label]

    # ── Regime history ────────────────────────────────────────
    history_dates  = feats_df.index.strftime("%Y-%m-%d").tolist()
    history_labels = labels.tolist()
    history_rv     = feats_df["rv_20d"].round(4).tolist()

    # ── Regime statistics ─────────────────────────────────────
    stats = []
    for r in range(n_regimes):
        mask = labels == r
        if mask.sum() == 0:
            continue
        ret_in_regime = returns.loc[feats_df.index[mask]]
        stats.append({
            "regime":        REGIME_LABELS[r],
            "color":         REGIME_COLORS[r],
            "icon":          REGIME_ICONS[r],
            "count_days":    int(mask.sum()),
            "pct_time":      round(float(mask.sum() / len(labels) * 100), 1),
            "avg_vol":       round(float(feats_df["rv_20d"].values[mask].mean()), 4),
            "avg_daily_ret": round(float(ret_in_regime.mean() * 252), 4),
            "sharpe":        round(
                float(ret_in_regime.mean() / (ret_in_regime.std() + 1e-8) * np.sqrt(252)), 2
            ),
        })

    # ── Transition matrix ─────────────────────────────────────
    trans = np.zeros((n_regimes, n_regimes))
    for i in range(len(labels) - 1):
        trans[labels[i], labels[i + 1]] += 1
    row_sums = trans.sum(axis=1, keepdims=True)
    trans_prob = (trans / (row_sums + 1e-8)).round(3).tolist()

    # ── Regime duration stats ─────────────────────────────────
    durations = {r: [] for r in range(n_regimes)}
    cur, cnt  = labels[0], 1
    for l in labels[1:]:
        if l == cur:
            cnt += 1
        else:
            durations[cur].append(cnt)
            cur, cnt = l, 1
    durations[cur].append(cnt)

    duration_stats = {
        REGIME_LABELS[r]: {
            "avg_days": round(float(np.mean(d)), 1) if d else 0,
            "max_days": int(np.max(d)) if d else 0,
            "occurrences": len(d) if d else 0,
        }
        for r, d in durations.items()
    }

    return {
        "current_regime":   current_regime,
        "current_label":    current_label,
        "current_color":    REGIME_COLORS[current_label],
        "current_icon":     REGIME_ICONS[current_label],
        "current_rv":       round(float(feats_df["rv_20d"].iloc[-1]), 4),
        "history": {
            "dates":    history_dates,
            "regimes":  history_labels,
            "rv_20d":   history_rv,
        },
        "regime_stats":      stats,
        "transition_matrix": trans_prob,
        "duration_stats":    duration_stats,
        "n_regimes":         n_regimes,
    }
