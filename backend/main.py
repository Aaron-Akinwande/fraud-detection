"""
main.py
-------
FastAPI backend for the Credit Card Fraud Detection dashboard.

Endpoints:
  POST   /predict            → run fraud prediction on a single transaction
  POST   /predict/batch      → upload a CSV and get batch predictions
  GET    /transactions       → return all logged transactions
  GET    /stats              → return summary stats for the dashboard
  DELETE /transactions       → clear all logged transactions
"""

import io
import os
import json
import uuid
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "model", "fraud_model.pkl")
META_PATH  = os.path.join(BASE_DIR, "model", "model_meta.pkl")
LOG_PATH   = os.path.join(BASE_DIR, "transactions.json")

# ── Load model + encoders ────────────────────────────────────────────────────
if not os.path.exists(MODEL_PATH):
    raise RuntimeError("❌ Model not found. Run  python model/train.py  first.")

model     = joblib.load(MODEL_PATH)
meta      = joblib.load(META_PATH)
le_cat    = meta["le_cat"]
le_gender = meta["le_gender"]
print("✅ Fraud model loaded.")

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Fraud Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ──────────────────────────────────────────────────────────────────
class Transaction(BaseModel):
    amt: float      = Field(..., gt=0)
    category: str   = Field(...)
    gender: str     = Field(...)
    city_pop: int   = Field(..., gt=0)
    lat: float      = Field(...)
    long: float     = Field(...)
    merch_lat: float  = Field(...)
    merch_long: float = Field(...)
    unix_time: int  = Field(...)

class PredictionResult(BaseModel):
    id: str
    timestamp: str
    is_fraud: bool
    confidence: float
    risk_level: str
    amt: float
    category: str
    gender: str
    city_pop: int
    distance_to_merchant: float
    hour_of_day: int

class BatchSummary(BaseModel):
    total_rows: int
    fraud_count: int
    legitimate_count: int
    fraud_rate: float
    skipped_rows: int
    results: list[PredictionResult]


# ── Helpers ──────────────────────────────────────────────────────────────────
def load_transactions() -> list:
    if not os.path.exists(LOG_PATH):
        return []
    with open(LOG_PATH, "r") as f:
        return json.load(f)

def save_transactions(transactions: list):
    with open(LOG_PATH, "w") as f:
        json.dump(transactions, f, indent=2)

def get_risk_level(confidence: float, is_fraud: bool) -> str:
    if not is_fraud:
        return "Low" if confidence >= 0.75 else "Medium"
    return "Critical" if confidence >= 0.85 else "High"

def encode_category(value: str) -> int:
    try:    return int(le_cat.transform([value])[0])
    except: return 0

def encode_gender(value: str) -> int:
    try:    return int(le_gender.transform([value])[0])
    except: return 0

def build_result(row_amt, row_category, row_gender, row_city_pop,
                 row_lat, row_long, row_merch_lat, row_merch_long,
                 row_unix_time) -> dict:
    """Core prediction logic shared by single and batch endpoints."""
    distance_to_merchant = float(np.sqrt(
        (row_lat - row_merch_lat) ** 2 +
        (row_long - row_merch_long) ** 2
    ) * 111)
    hour_of_day = int((int(row_unix_time) // 3600) % 24)

    features = np.array([[
        row_amt,
        encode_category(str(row_category)),
        encode_gender(str(row_gender)),
        row_city_pop,
        distance_to_merchant,
        hour_of_day,
    ]])

    prediction    = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]
    is_fraud      = bool(prediction == 1)
    confidence    = float(probabilities[int(prediction)])

    return {
        "id":                    str(uuid.uuid4()),
        "timestamp":             datetime.utcnow().isoformat() + "Z",
        "is_fraud":              is_fraud,
        "confidence":            round(confidence, 4),
        "risk_level":            get_risk_level(confidence, is_fraud),
        "amt":                   float(row_amt),
        "category":              str(row_category),
        "gender":                str(row_gender),
        "city_pop":              int(row_city_pop),
        "distance_to_merchant":  round(distance_to_merchant, 2),
        "hour_of_day":           hour_of_day,
    }


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Fraud Detection API is running 🚀"}


@app.get("/meta")
def get_meta():
    return {
        "categories": list(le_cat.classes_),
        "genders":    list(le_gender.classes_),
    }


@app.post("/predict", response_model=PredictionResult)
def predict(transaction: Transaction):
    result = build_result(
        transaction.amt, transaction.category, transaction.gender,
        transaction.city_pop, transaction.lat, transaction.long,
        transaction.merch_lat, transaction.merch_long, transaction.unix_time,
    )
    transactions = load_transactions()
    transactions.append(result)
    save_transactions(transactions)
    return result


@app.post("/predict/batch", response_model=BatchSummary)
async def predict_batch(file: UploadFile = File(...)):
    """
    Upload a CSV with the original dataset headers.
    Required columns: amt, category, gender, city_pop,
                      lat, long, merch_lat, merch_long, unix_time
    Optional (ignored): all other columns including is_fraud
    """
    # ── Validate file type ───────────────────────────────────────────────────
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")

    # ── Normalise column names ───────────────────────────────────────────────
    df.columns = df.columns.str.strip().str.lower()

    REQUIRED = ["amt", "category", "gender", "city_pop",
                "lat", "long", "merch_lat", "merch_long", "unix_time"]
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required columns: {missing}. Found: {list(df.columns)}"
        )

    # ── Limit batch size to 5 000 rows for performance ───────────────────────
    MAX_ROWS = 5000
    if len(df) > MAX_ROWS:
        df = df.head(MAX_ROWS)

    results     = []
    skipped     = 0
    logged      = load_transactions()

    for _, row in df.iterrows():
        try:
            result = build_result(
                float(row["amt"]),
                row["category"],
                row["gender"],
                int(row["city_pop"]),
                float(row["lat"]),
                float(row["long"]),
                float(row["merch_lat"]),
                float(row["merch_long"]),
                int(row["unix_time"]),
            )
            results.append(result)
            logged.append(result)
        except Exception:
            skipped += 1
            continue

    save_transactions(logged)

    fraud_count = sum(1 for r in results if r["is_fraud"])
    total       = len(results)

    return {
        "total_rows":        total,
        "fraud_count":       fraud_count,
        "legitimate_count":  total - fraud_count,
        "fraud_rate":        round(fraud_count / total * 100, 2) if total else 0.0,
        "skipped_rows":      skipped,
        "results":           results,
    }


@app.get("/transactions")
def get_transactions():
    transactions = load_transactions()
    return {"transactions": list(reversed(transactions))}


@app.get("/stats")
def get_stats():
    transactions = load_transactions()
    if not transactions:
        return {
            "total": 0, "fraud_count": 0, "legitimate_count": 0,
            "fraud_rate": 0.0, "recent_fraud": [],
            "risk_breakdown": {"Low": 0, "Medium": 0, "High": 0, "Critical": 0},
        }
    total       = len(transactions)
    fraud       = [t for t in transactions if t["is_fraud"]]
    fraud_count = len(fraud)
    risk_breakdown = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for t in transactions:
        risk_breakdown[t["risk_level"]] += 1
    return {
        "total":             total,
        "fraud_count":       fraud_count,
        "legitimate_count":  total - fraud_count,
        "fraud_rate":        round(fraud_count / total * 100, 2),
        "recent_fraud":      list(reversed(fraud))[:5],
        "risk_breakdown":    risk_breakdown,
    }


@app.delete("/transactions")
def clear_transactions():
    save_transactions([])
    return {"message": "All transactions cleared."}