# ============================================================
# test_backend.py — Quick sanity check for all endpoints
# Run: python test_backend.py
# ============================================================

import requests
import json
import sys

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

BASE = "http://localhost:8000"

def test(name, url, method="GET", data=None):
    try:
        if method == "POST":
            r = requests.post(url, json=data, timeout=60)
        else:
            r = requests.get(url, timeout=60)

        if r.status_code == 200:
            print(f"[PASS] {name}")
            return r.json()
        else:
            print(f"[FAIL] {name} -- {r.status_code}: {r.text[:100]}")
    except Exception as e:
        print(f"[ERR ] {name} -- {e}")
    return None

print("\n[TEST] Testing Risk Intelligence Platform API\n" + "="*50)

# 1. Health
test("Health Check",     f"{BASE}/api/health")

# 2. Assets
res = test("Asset Universe", f"{BASE}/api/assets")
if res:
    print(f"   → {res['total']} assets loaded")

# 3. Prices
res = test("Price Data (GLD)", f"{BASE}/api/prices/GLD?period=1y")
if res:
    print(f"   → {res['rows']} rows, latest close: {res['latest_close']}")

# 4. Volatility (ML!)
print("\n[WAIT] Testing ML Volatility Forecast (takes 5-10s first time)...")
res = test("Volatility Forecast (SPY)", f"{BASE}/api/volatility/SPY")
if res:
    print(f"   → Naive:  {res.get('naive_baseline', '?'):.2%}")
    if "garch" in res and "point_forecast" in res["garch"]:
        print(f"   → GARCH:  {res['garch']['point_forecast']:.2%}")
    if "ml_gbm" in res and "point_forecast" in res["ml_gbm"]:
        print(f"   → ML GBM: {res['ml_gbm']['point_forecast']:.2%}")
        print(f"   → CV RMSE: {res['ml_gbm'].get('cv_rmse_mean', '?')}")

# 5. Portfolio
print("\n[WAIT] Testing Portfolio Optimizer...")
res = test(
    "Portfolio Optimize",
    f"{BASE}/api/portfolio/optimize",
    method="POST",
    data={"tickers": ["SPY", "GLD", "TLT", "BTC-USD"], "rf_rate": 0.05}
)
if res:
    ms = res.get("max_sharpe", {})
    print(f"   → Max Sharpe: ret={ms.get('expected_return','?'):.2%}, vol={ms.get('volatility','?'):.2%}, sharpe={ms.get('sharpe_ratio','?'):.2f}")

# 6. Regime
res = test("Regime Detection (GLD)", f"{BASE}/api/regime/GLD")
if res:
    print(f"   → Current Regime: {res.get('current_icon','')} {res.get('current_regime','?')}")

print("\n[DONE] All tests complete!\n")
