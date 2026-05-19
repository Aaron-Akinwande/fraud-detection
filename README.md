# 🔍 FraudWatch — Credit Card Fraud Detection System

A full-stack fraud detection web application built with **FastAPI** (backend) and **Next.js** (frontend), powered by a **Random Forest** machine learning model trained on real credit card transaction data.

---

## 📁 Project Structure

```
fraud-detection-app/
├── backend/
│   ├── main.py                  ← FastAPI app (all API endpoints)
│   ├── requirements.txt         ← Python dependencies
│   ├── transactions.json        ← Auto-created when predictions are made
│   ├── data/
│   │   └── card_transdata.csv   ← Place your dataset here
│   └── model/
│       ├── train.py             ← Model training script
│       ├── fraud_model.pkl      ← Auto-created after training
│       └── model_meta.pkl       ← Auto-created after training
│
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.jss
    ├── postcss.config.js
    ├── tsconfig.json
    └── src/app/
        ├── layout.tsx
        ├── page.tsx             ← Overview dashboard
        ├── globals.css
        ├── components/
        │   ├── Sidebar.tsx
        │   ├── StatCard.tsx
        │   └── RiskBadge.tsx
        ├── lib/
        │   └── api.ts           ← API client
        ├── submit/
        │   └── page.tsx         ← Single transaction checker
        ├── batch/
        │   └── page.tsx         ← CSV batch analysis
        └── transactions/
            └── page.tsx         ← Transaction log
```

---

## ✅ Prerequisites

Make sure you have the following installed before starting:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.11+ | [python.org](https://python.org/downloads) |
| Node.js | 18+ (LTS) | [nodejs.org](https://nodejs.org) |
| Git (optional) | Any | [git-scm.com](https://git-scm.com) |

> **Windows users:** When installing Python, make sure to check **"Add Python to PATH"** during installation.

Verify your installations by opening a terminal and running:

```bash
python --version    # Should print Python 3.11.x or higher
node --version      # Should print v18.x or higher
npm --version       # Should print 9.x or higher
```

---

## 🗄️ Dataset

Download the dataset from Kaggle and place it in the `backend/data/` folder:

1. Go to the dataset URL and sign in with a free Kaggle account: https://www.kaggle.com/datasets/kartik2112/fraud-detection?select=fraudTest.csv
2. Click **Download**
3. Unzip the file
4. Rename the CSV to `card_transdata.csv` if needed
5. Place it at: `backend/data/card_transdata.csv`

**Required CSV columns:**

```
trans_date_trans_time, cc_num, merchant, category, amt, first, last,
gender, street, city, state, zip, lat, long, city_pop, job, dob,
trans_num, unix_time, merch_lat, merch_long, is_fraud
```

---

## 🐍 Backend Setup

### Step 1 — Navigate to the backend folder

```bash
cd fraud-detection-app/backend
```

### Step 2 — Create a virtual environment

A virtual environment keeps your Python packages isolated to this project.

```bash
python -m venv venv
```

### Step 3 — Activate the virtual environment

**Windows (PowerShell):**
```bash
venv\Scripts\activate
```

**Mac / Linux:**
```bash
source venv/bin/activate
```

You will know it is active when you see `(venv)` at the start of your terminal line.

### Step 4 — Install dependencies

```bash
pip install -r requirements.txt
```

This will take 2–3 minutes to download all packages.

### Step 5 — Train the model

```bash
python model/train.py
```

**Expected output:**

```
📂 Loading dataset...
   Rows: 1,000,000  |  Fraud rate: 8.74%
🔧 Engineering features...
⚖️  Balancing classes with undersampling...
   After resampling → 261,720 rows  |  Fraud rate: 33.33%
🌲 Training Random Forest...

📊 Evaluation on test set:
              precision    recall  f1-score
  Legitimate     0.95       0.96      0.95
       Fraud     0.93       0.91      0.92

✅ Model saved     →  model/fraud_model.pkl
✅ Metadata saved  →  model/model_meta.pkl
```

Training takes approximately **30–60 seconds**.

### Step 6 — Start the backend server

```bash
uvicorn main:app --reload --port 8000
```

**Expected output:**

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
✅ Fraud model loaded.
INFO:     Application startup complete.
```

The backend is now running at **http://localhost:8000**

> **Tip:** Visit **http://localhost:8000/docs** in your browser to see the interactive API documentation where you can test all endpoints directly.

---

## 🖥️ Frontend Setup

> **Important:** Open a **new terminal window** for the frontend. Keep the backend terminal open and running.

### Step 1 — Navigate to the frontend folder

```bash
cd fraud-detection-app/frontend
```

### Step 2 — Create the folder structure

If you are placing files manually (not cloning from git), create these folders first:

```bash
mkdir -p src/app/components
mkdir -p src/app/lib
mkdir -p src/app/submit
mkdir -p src/app/batch
mkdir -p src/app/transactions
mkdir -p public
```

### Step 3 — Place all frontend files

Copy all downloaded frontend files into the correct locations matching the project structure shown at the top of this README.

### Step 4 — Install dependencies

```bash
npm install
```

This creates a `node_modules` folder. It takes 1–2 minutes.

### Step 5 — Start the development server

```bash
npm run dev
```

**Expected output:**

```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in Xs
```

The frontend is now running at **http://localhost:3000**

---

## 🚀 Using the Application

Open **http://localhost:3000** in your browser. You will see the FraudWatch dashboard with four sections accessible from the sidebar:

### ◈ Overview
The main dashboard showing live statistics and charts. Displays:
- Total transactions, fraud count, legitimate count, and fraud rate
- Fraud vs legitimate timeline chart
- Transaction split pie chart
- Risk level breakdown
- Top fraud categories
- Recent fraud alerts

The dashboard auto-refreshes every 10 seconds.

### ⬡ Check Transaction
Submit a single transaction for instant fraud analysis. Features:
- Form with all required transaction fields
- **FRAUD SAMPLE** and **LEGITIMATE SAMPLE** demo buttons to test instantly
- A **NOW** button to auto-fill the current unix timestamp
- Instant verdict with confidence score, risk level, and feature breakdown

### ⊞ Batch Analysis
Upload a CSV file to analyse hundreds or thousands of transactions at once. Features:
- Drag and drop or click to upload
- Summary statistics cards
- Three charts: split, risk distribution, top fraud categories
- Paginated results table (50 rows per page)
- Filter by All / Fraud / Legitimate
- **Download Results** button exports predictions as a CSV

> Maximum 5,000 rows per upload.

### ≡ Transaction Log
Full history of every transaction that has been analysed. Features:
- Filter by All / Fraud / Legitimate
- Sort by newest, oldest, amount ascending, amount descending
- Search by category, ID, or amount
- Click any row to open a detail side panel
- Clear all transactions button

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/meta` | Returns valid categories and genders for the form |
| POST | `/predict` | Analyse a single transaction |
| POST | `/predict/batch` | Upload a CSV for batch analysis |
| GET | `/transactions` | Get all logged transactions |
| GET | `/stats` | Get dashboard summary statistics |
| DELETE | `/transactions` | Clear all logged transactions |

### Example single prediction request

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "amt": 1289.99,
    "category": "shopping_net",
    "gender": "M",
    "city_pop": 300,
    "lat": 33.98,
    "long": -80.97,
    "merch_lat": 40.73,
    "merch_long": -74.01,
    "unix_time": 1371816865
  }'
```

### Example response

```json
{
  "id": "a1b2c3d4-e5f6-...",
  "timestamp": "2024-01-15T10:30:00Z",
  "is_fraud": true,
  "confidence": 0.91,
  "risk_level": "Critical",
  "amt": 1289.99,
  "category": "shopping_net",
  "gender": "M",
  "city_pop": 300,
  "distance_to_merchant": 847.32,
  "hour_of_day": 10
}
```

---

## 🤖 Model Details

| Property | Value |
|----------|-------|
| Algorithm | Random Forest Classifier |
| Number of trees | 50 |
| Max tree depth | 10 |
| Class balancing | RandomUnderSampler (ratio 0.5) |
| Train/test split | 80% / 20% |

**Features used for prediction:**

| Feature | Source | Description |
|---------|--------|-------------|
| `amt` | Raw | Transaction amount in USD |
| `category_enc` | Encoded | Merchant category as integer |
| `gender_enc` | Encoded | Cardholder gender as integer |
| `city_pop` | Raw | Population of cardholder's city |
| `distance_to_merchant` | Computed | Approximate km between cardholder and merchant |
| `hour_of_day` | Computed | Hour extracted from unix timestamp |

---

## 🔧 Troubleshooting

### Backend issues

**`python model/train.py` — FileNotFoundError**
> The dataset is missing. Make sure `card_transdata.csv` is inside the `backend/data/` folder.

**`RuntimeError: Model not found`**
> You have not trained the model yet. Run `python model/train.py` before starting the server.

**`(venv)` not showing in terminal**
> The virtual environment is not activated. Run the activation command for your OS (Step 3 above).

**`pip install` fails with permission error**
> Make sure the virtual environment is activated first before running pip.

---

### Frontend issues

**Red error box on dashboard: "Cannot connect to API"**
> The backend is not running. Open a second terminal, navigate to `backend/`, activate the venv, and run `uvicorn main:app --reload --port 8000`.

**`'next' is not recognized`**
> You are running `npm run dev` from the wrong folder. Make sure you are inside the `frontend/` folder.

**`Cannot find module 'clsx'` or similar**
> Dependencies are not installed. Run `npm install` from inside the `frontend/` folder.

**Port 3000 already in use**
> Next.js will automatically try port 3001. Check your terminal output for the actual URL.

**Batch upload returns "Missing required columns" error**
> Your CSV does not have the expected headers. Check the **Required CSV columns** section above and make sure all column names match exactly (lowercase, underscores).

---

## ⚡ Quick Start Checklist

```
□ Python 3.11+ installed
□ Node.js 18+ installed
□ Dataset placed at backend/data/card_transdata.csv
□ Virtual environment created and activated
□ pip install -r requirements.txt  completed
□ python model/train.py  completed  (fraud_model.pkl exists)
□ uvicorn main:app --reload --port 8000  running in Terminal 1
□ npm install  completed
□ npm run dev  running in Terminal 2
□ http://localhost:3000  opens in browser
□ http://localhost:8000/docs  opens in browser
```

All boxes checked → your application is fully running. 🎉