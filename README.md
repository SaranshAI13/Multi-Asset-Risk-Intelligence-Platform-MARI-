# MARI™ — Multi-Asset Risk Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-orange?style=for-the-badge)](https://multi-asset-risk-intelligence-platf.vercel.app)
[![API Docs](https://img.shields.io/badge/API%20Docs-FastAPI-emerald?style=for-the-badge)](https://mari-rust.onrender.com/docs)
[![Python Version](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)](https://www.python.org/downloads/release/python-3119/)
[![React Version](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-cyan?style=for-the-badge&logo=react)](https://react.dev/)

MARI™ is an enterprise-grade, real-time quantitative risk analytics and asset allocation dashboard. It is designed to analyze market regimes, forecast volatility using hybrid statistical-ML pipelines, and solve optimal portfolio allocations across 32 global assets (ETFs, cryptos, and commodities).

---

## 🔗 Live Deployments
* **Interactive Frontend (Vercel)**: [https://multi-asset-risk-intelligence-platf.vercel.app](https://multi-asset-risk-intelligence-platf.vercel.app)
* **REST API & Swagger Docs (Render)**: [https://mari-rust.onrender.com/docs](https://mari-rust.onrender.com/docs)

---

## 🚀 Core Features

### 1. Hybrid Volatility Forecasting Pipeline (`GARCH(1,1)` vs. `ML GBM`)
* Forecasts 5-day forward realized volatility by matching standard econometric tools with modern machine learning.
* **Classical econometric model**: Fits a GARCH(1,1) volatility model on historical log returns using maximum likelihood estimation.
* **Machine Learning Challenger**: Trains a Gradient Boosting Regressor utilizing 14 engineered technical and structural features (RSI, ATR, MACD, Bollinger Bands, Volume ratios, and lags) validated via `TimeSeriesSplit`.
* **Explainable AI (XAI)**: Calculates real-time **SHAP values** to display feature contributions, making the ML model's decisions transparent.

### 2. Quantitative Portfolio Optimizer & Risk Parity
* Solves optimal asset weight distributions for **Max Sharpe**, **Min Variance**, and **Risk Parity** portfolios.
* **Denoised Covariance Matrix**: Implements **Ledoit-Wolf Covariance Shrinkage** (shrinkage target: constant correlation) to reduce noise in sample covariance matrices and prevent portfolio weight instability.
* **Dynamic Risk Hurdle**: Includes an interactive Risk-Free Rate slider (0.0% to 15.0%) to recalculate optimal Sharpe-maximizing weights in real-time.
* **Risk Attribution (MCTR)**: Computes Marginal Contribution to Total Risk (MCTR) and visualizes the exact percentage of total portfolio risk driven by each asset.

### 3. Unsupervised Market Regime Clustering
* Detects market risk regimes (**Low, Medium, High Risk**) using unsupervised **K-Means clustering** on asset volatility and return vectors.
* Computes and renders a glowing **Regime Transition Probability Heatmap** representing state-switching likelihoods.
* Generates historical stats showing total visits (occurrences) and average days spent in each regime.

### 4. Resilient Real-Time Data Pipeline
* Features a custom fallback downloader to bypass Yahoo Finance cloud IP-range blocking. If standard downloads fail, the backend queries Yahoo's raw `v8/finance/chart` JSON API.
* Normalizes timestamps with `.tz_localize(None).normalize()` to ensure seamless alignment of global stock market ETFs (trading days) and cryptocurrencies (24/7 trading days).

---

## 🛠️ Technology Stack
* **Backend**: Python 3.11, FastAPI, Uvicorn, Pandas, NumPy, Scikit-Learn, SciPy, Statsmodels, Arch, Requests.
* **Frontend**: React.js, Vite, Recharts, Axios, CSS Variables, Bloomberg-inspired Premium Dark Theme.
* **Infrastructure**: Git, GitHub, Render (Backend API), Vercel (Frontend Client).

---

## 📂 Project Structure
```
├── backend/
│   ├── data/
│   │   └── fetcher.py         # Data download + Feature engineering + Fallback API
│   ├── models/
│   │   ├── portfolio.py       # Ledoit-Wolf, Max Sharpe, Min Var, Risk Parity, Frontier
│   │   ├── regime.py          # K-Means clustering + Transition Matrix
│   │   └── volatility.py      # GARCH(1,1) + GBM ML model + SHAP calculations
│   ├── main.py                # FastAPI endpoints configuration
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # Branded PageLoader, ToastManager, Modals
│   │   ├── pages/             # Dashboard, Volatility, Predictions, Portfolio, Regime
│   │   ├── App.jsx            # Core layout, sidebar, developer attribution
│   │   └── index.css          # Bloomberg dark theme styles
│   └── package.json           # Node.js dependencies
└── README.md
```

---

## 💻 Local Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/SaranshAI13/Multi-Asset-Risk-Intelligence-Platform-MARI-.git
cd Multi-Asset-Risk-Intelligence-Platform-MARI-
```

### 2. Spin up the FastAPI Backend
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate      # For Windows

# Install backend packages
pip install -r backend/requirements.txt

# Start backend server
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Spin up the Vite Frontend
```bash
# Open a new terminal tab in the root folder
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser to view the local instance.
