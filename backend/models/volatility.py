# ============================================================
# models/volatility.py
# REAL ML: GARCH(1,1) baseline + GradientBoosting challenger
# Proper TimeSeriesSplit — zero data leakage
# ============================================================

import numpy as np
import pandas as pd
import warnings
import joblib
import os
from typing import Tuple

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error

warnings.filterwarnings("ignore")

# Optional SHAP
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

# Optional arch (GARCH)
try:
    from arch import arch_model
    ARCH_AVAILABLE = True
except ImportError:
    ARCH_AVAILABLE = False

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# ── In-memory model cache ────────────────────────────────────
_model_cache: dict = {}


def _garch_forecast(returns: pd.Series, horizon: int = 5) -> dict:
    """
    Fit GARCH(1,1) on return series and forecast volatility.
    Returns annualized vol forecast and confidence interval.
    """
    if not ARCH_AVAILABLE:
        return {"error": "arch library not installed"}

    try:
        # GARCH expects percentage returns
        pct_returns = returns * 100
        model  = arch_model(pct_returns, vol="Garch", p=1, q=1, dist="normal")
        result = model.fit(disp="off", show_warning=False)

        forecast    = result.forecast(horizon=horizon, reindex=False)
        var_horizon = forecast.variance.values[-1]        # shape (horizon,)
        vol_daily   = np.sqrt(var_horizon) / 100          # back to decimal
        vol_annual  = vol_daily * np.sqrt(252)

        # Point forecast = mean of horizon annualized vols
        point_forecast = float(np.mean(vol_annual))

        # Confidence interval (±1 std of horizon forecasts)
        ci_lower = float(np.percentile(vol_annual, 10))
        ci_upper = float(np.percentile(vol_annual, 90))

        # In-sample RMSE
        cond_vol    = result.conditional_volatility / 100 * np.sqrt(252)
        rv_20d      = returns.rolling(20).std().dropna() * np.sqrt(252)
        aligned     = pd.concat([cond_vol, rv_20d], axis=1).dropna()
        garch_rmse  = float(np.sqrt(mean_squared_error(aligned.iloc[:, 1], aligned.iloc[:, 0])))

        return {
            "point_forecast": round(point_forecast, 4),
            "ci_lower":       round(ci_lower, 4),
            "ci_upper":       round(ci_upper, 4),
            "rmse":           round(garch_rmse, 4),
            "params": {
                "omega": round(float(result.params["omega"]), 6),
                "alpha": round(float(result.params["alpha[1]"]), 4),
                "beta":  round(float(result.params["beta[1]"]), 4),
            }
        }
    except Exception as e:
        return {"error": str(e)}


def _gbm_forecast(features_df: pd.DataFrame) -> dict:
    """
    Train GradientBoostingRegressor on feature-engineered data.
    Uses TimeSeriesSplit (no data leakage).
    Returns: forecast, confidence interval, RMSE, MAE, feature importances.
    """
    feat_cols = [c for c in features_df.columns if c != "target_vol_5d"]
    X = features_df[feat_cols].values
    y = features_df["target_vol_5d"].values

    if len(X) < 60:
        return {"error": "Not enough data to train (need >= 60 rows)"}

    # ── TimeSeriesSplit cross-validation ────────────────────
    tscv   = TimeSeriesSplit(n_splits=5)
    scaler = StandardScaler()

    cv_rmses = []
    cv_maes  = []

    for train_idx, val_idx in tscv.split(X):
        X_tr, X_val = X[train_idx], X[val_idx]
        y_tr, y_val = y[train_idx], y[val_idx]

        X_tr_sc  = scaler.fit_transform(X_tr)
        X_val_sc = scaler.transform(X_val)

        m = GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=4,
            subsample=0.8,
            random_state=42
        )
        m.fit(X_tr_sc, y_tr)
        preds = m.predict(X_val_sc)

        cv_rmses.append(np.sqrt(mean_squared_error(y_val, preds)))
        cv_maes.append(mean_absolute_error(y_val, preds))

    # ── Final model on all data ──────────────────────────────
    X_scaled = scaler.fit_transform(X)
    final_model = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.8,
        random_state=42
    )
    final_model.fit(X_scaled, y)

    # Forecast on latest row
    X_latest = X_scaled[-1].reshape(1, -1)
    point_pred = float(final_model.predict(X_latest)[0])

    # ── SHAP local explainability ────────────────────────────
    shap_data = {}
    if SHAP_AVAILABLE:
        try:
            explainer = shap.TreeExplainer(final_model)
            s_vals = explainer.shap_values(X_latest)
            base_value = float(explainer.expected_value[0]) if isinstance(explainer.expected_value, np.ndarray) else float(explainer.expected_value)
            
            shap_dict = {}
            for col, val in zip(feat_cols, s_vals[0].tolist()):
                shap_dict[col] = round(float(val), 6)
                
            shap_data = {
                "base_value": round(base_value, 6),
                "values": shap_dict
            }
        except Exception as e:
            shap_data = {"error": f"SHAP error: {str(e)}"}
    else:
        shap_data = {"error": "SHAP library not available"}

    # Confidence interval via quantile estimation from last 30 residuals
    recent_preds = final_model.predict(X_scaled[-30:])
    recent_true  = y[-30:]
    residuals    = recent_true - recent_preds
    ci_lower     = point_pred + float(np.percentile(residuals, 10))
    ci_upper     = point_pred + float(np.percentile(residuals, 90))

    # Feature importances
    importances = final_model.feature_importances_
    feat_imp    = sorted(
        zip(feat_cols, importances.tolist()),
        key=lambda x: x[1], reverse=True
    )

    # Historical predictions for chart (last 100 points)
    hist_preds   = final_model.predict(X_scaled[-100:]).tolist()
    hist_actuals = y[-100:].tolist()
    hist_dates   = features_df.index[-100:].strftime("%Y-%m-%d").tolist()

    return {
        "point_forecast":    round(max(point_pred, 0.001), 4),
        "ci_lower":          round(max(ci_lower,  0.001), 4),
        "ci_upper":          round(max(ci_upper,  0.001), 4),
        "cv_rmse_mean":      round(float(np.mean(cv_rmses)), 4),
        "cv_rmse_std":       round(float(np.std(cv_rmses)),  4),
        "cv_mae_mean":       round(float(np.mean(cv_maes)),  4),
        "feature_importance": feat_imp[:10],
        "shap":              shap_data,
        "history": {
            "dates":      hist_dates,
            "predicted":  [round(v, 4) for v in hist_preds],
            "actual":     [round(v, 4) for v in hist_actuals],
        }
    }


def get_volatility_forecast(ticker: str, returns: pd.Series, features_df: pd.DataFrame) -> dict:
    """
    Master function: runs both GARCH and GBM, returns combined result.
    Results are cached in memory for 10 minutes.
    """
    import time
    cache_key = ticker
    now       = time.time()

    if cache_key in _model_cache:
        ts, result = _model_cache[cache_key]
        if now - ts < 600:  # 10-minute cache
            return result

    garch_result = _garch_forecast(returns)
    gbm_result   = _gbm_forecast(features_df)

    # Naive baseline: last 20-day realized vol
    naive_forecast = float(returns.rolling(20).std().dropna().iloc[-1] * np.sqrt(252))

    # Current realized vol
    current_rv = float(returns.rolling(5).std().dropna().iloc[-1] * np.sqrt(252))

    result = {
        "ticker":           ticker,
        "current_rv_5d":    round(current_rv,    4),
        "naive_baseline":   round(naive_forecast, 4),
        "garch":            garch_result,
        "ml_gbm":           gbm_result,
        "model_comparison": _build_comparison(naive_forecast, garch_result, gbm_result),
    }

    _model_cache[cache_key] = (now, result)
    return result


def _build_comparison(naive: float, garch: dict, gbm: dict) -> list:
    """Build a comparison table row for all three models."""
    rows = [{"model": "Naive (20d RV)", "rmse": "—", "forecast": round(naive, 4), "type": "baseline"}]

    if "rmse" in garch:
        rows.append({
            "model":    "GARCH(1,1)",
            "rmse":     garch["rmse"],
            "forecast": garch["point_forecast"],
            "type":     "statistical"
        })
    if "cv_rmse_mean" in gbm:
        rows.append({
            "model":    "GBM (ML)",
            "rmse":     gbm["cv_rmse_mean"],
            "forecast": gbm["point_forecast"],
            "type":     "ml"
        })
    return rows
