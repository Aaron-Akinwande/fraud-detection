"""
main.py
-------
FastAPI backend for the Credit Card Fraud Detection dashboard.

Endpoints:
  POST   /predict            → single transaction prediction (with card tracking)
  POST   /predict/batch      → CSV batch prediction (with card tracking)
  GET    /transactions       → all logged transactions
  GET    /stats              → dashboard summary stats
  DELETE /transactions       → clear all transactions + card profiles
  GET    /cards              → all card profiles
  GET    /cards/{cc_num}     → single card profile + transaction history
"""

import io
import os
import json
import uuid
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from collections import Counter
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "model", "fraud_model.pkl")
META_PATH  = os.path.join(BASE_DIR, "model", "model_meta.pkl")
LOG_PATH   = os.path.join(BASE_DIR, "transactions.json")
CARDS_PATH = os.path.join(BASE_DIR, "cards.json")

# ── Load model + encoders ────────────────────────────────────────────────────
if not os.path.exists(MODEL_PATH):
    raise RuntimeError("Model not found. Run  python model/train.py  first.")

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
    cc_num: str       = Field(..., description="Credit card number")
    first: str        = Field(..., description="Cardholder first name")
    last: str         = Field(..., description="Cardholder last name")
    amt: float        = Field(..., gt=0)
    category: str     = Field(...)
    gender: str       = Field(...)
    city_pop: int     = Field(..., gt=0)
    lat: float        = Field(...)
    long: float       = Field(...)
    merch_lat: float  = Field(...)
    merch_long: float = Field(...)
    unix_time: int    = Field(...)

class PredictionResult(BaseModel):
    id: str
    cc_num: str
    cardholder: str
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
    amt_vs_avg: float
    is_new_category: bool
    is_unusual_hour: bool
    distance_from_home: float

class BatchSummary(BaseModel):
    total_rows: int
    fraud_count: int
    legitimate_count: int
    fraud_rate: float
    skipped_rows: int
    cards_seen: int
    results: list[PredictionResult]


# ── Card store helpers ────────────────────────────────────────────────────────
def load_cards() -> dict:
    if not os.path.exists(CARDS_PATH):
        return {}
    with open(CARDS_PATH, "r") as f:
        return json.load(f)

def save_cards(cards: dict):
    with open(CARDS_PATH, "w") as f:
        json.dump(cards, f, indent=2)

def upsert_card(cards: dict, cc_num: str, result: dict,
                first: str, last: str, lat: float, long: float):
    key = str(cc_num)
    if key not in cards:
        cards[key] = {
            "cc_num":            key,
            "first":             first,
            "last":              last,
            "cardholder":        f"{first} {last}",
            "gender":            result["gender"],
            "home_lat":          lat,
            "home_long":         long,
            "city_pop":          result["city_pop"],
            "transaction_count": 0,
            "fraud_count":       0,
            "total_spent":       0.0,
            "avg_amt":           0.0,
            "max_amt":           0.0,
            "min_amt":           float("inf"),
            "categories":        [],
            "hours":             [],
            "transaction_ids":   [],
            "first_seen":        result["timestamp"],
            "last_seen":         result["timestamp"],
        }

    p = cards[key]
    p["transaction_count"] += 1
    if result["is_fraud"]:
        p["fraud_count"] += 1

    p["total_spent"] = round(p["total_spent"] + result["amt"], 2)
    p["avg_amt"]     = round(p["total_spent"] / p["transaction_count"], 2)
    p["max_amt"]     = round(max(p["max_amt"], result["amt"]), 2)
    p["min_amt"]     = round(min(p["min_amt"], result["amt"]), 2)
    p["categories"]  = (p["categories"] + [result["category"]])[-100:]
    p["hours"]       = (p["hours"]      + [result["hour_of_day"]])[-100:]
    p["transaction_ids"] = (p["transaction_ids"] + [result["id"]])[-200:]
    p["last_seen"]   = result["timestamp"]
    cards[key] = p


# ── Transaction store helpers ─────────────────────────────────────────────────
def load_transactions() -> list:
    if not os.path.exists(LOG_PATH):
        return []
    with open(LOG_PATH, "r") as f:
        return json.load(f)

def save_transactions(transactions: list):
    with open(LOG_PATH, "w") as f:
        json.dump(transactions, f, indent=2)


# ── Shared helpers ────────────────────────────────────────────────────────────
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

def compute_card_flags(profile, amt: float, category: str,
                       hour: int, card_lat: float, card_long: float) -> dict:
    if profile is None or profile["transaction_count"] == 0:
        return {"amt_vs_avg": 1.0, "is_new_category": False,
                "is_unusual_hour": False, "distance_from_home": 0.0}

    avg_amt    = profile["avg_amt"] or amt
    amt_vs_avg = round(amt / avg_amt, 3)
    is_new_category = category not in set(profile["categories"])
    is_unusual_hour = hour not in set(profile["hours"])
    dist_from_home  = float(np.sqrt(
        (card_lat  - profile["home_lat"]) ** 2 +
        (card_long - profile["home_long"]) ** 2
    ) * 111)

    return {
        "amt_vs_avg":         amt_vs_avg,
        "is_new_category":    is_new_category,
        "is_unusual_hour":    is_unusual_hour,
        "distance_from_home": round(dist_from_home, 2),
    }


def build_result(cc_num: str, first: str, last: str,
                 row_amt, row_category, row_gender, row_city_pop,
                 row_lat, row_long, row_merch_lat, row_merch_long,
                 row_unix_time, cards: dict) -> dict:

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

    flags = compute_card_flags(
        cards.get(str(cc_num)), float(row_amt), str(row_category),
        hour_of_day, float(row_lat), float(row_long)
    )

    return {
        "id":                    str(uuid.uuid4()),
        "cc_num":                str(cc_num),
        "cardholder":            f"{first} {last}",
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
        "amt_vs_avg":            flags["amt_vs_avg"],
        "is_new_category":       flags["is_new_category"],
        "is_unusual_hour":       flags["is_unusual_hour"],
        "distance_from_home":    flags["distance_from_home"],
    }


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Fraud Detection API is running 🚀"}

@app.get("/meta")
def get_meta():
    return {"categories": list(le_cat.classes_), "genders": list(le_gender.classes_)}


# ── Single prediction ─────────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictionResult)
def predict(transaction: Transaction):
    cards  = load_cards()
    result = build_result(
        transaction.cc_num, transaction.first, transaction.last,
        transaction.amt, transaction.category, transaction.gender,
        transaction.city_pop, transaction.lat, transaction.long,
        transaction.merch_lat, transaction.merch_long, transaction.unix_time,
        cards,
    )
    upsert_card(cards, transaction.cc_num, result,
                transaction.first, transaction.last,
                transaction.lat, transaction.long)
    save_cards(cards)

    transactions = load_transactions()
    transactions.append(result)
    save_transactions(transactions)
    return result


# ── Batch CSV prediction ──────────────────────────────────────────────────────
@app.post("/predict/batch", response_model=BatchSummary)
async def predict_batch(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")

    df.columns = df.columns.str.strip().str.lower()

    REQUIRED = ["cc_num", "first", "last", "amt", "category", "gender",
                "city_pop", "lat", "long", "merch_lat", "merch_long", "unix_time"]
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise HTTPException(status_code=422,
            detail=f"Missing required columns: {missing}. Found: {list(df.columns)}")

    if len(df) > 5000:
        df = df.head(5000)

    cards   = load_cards()
    logged  = load_transactions()
    results = []
    skipped = 0

    for _, row in df.iterrows():
        try:
            result = build_result(
                str(row["cc_num"]), str(row["first"]), str(row["last"]),
                float(row["amt"]), row["category"], row["gender"],
                int(row["city_pop"]), float(row["lat"]), float(row["long"]),
                float(row["merch_lat"]), float(row["merch_long"]),
                int(row["unix_time"]), cards,
            )
            upsert_card(cards, str(row["cc_num"]), result,
                        str(row["first"]), str(row["last"]),
                        float(row["lat"]), float(row["long"]))
            results.append(result)
            logged.append(result)
        except Exception:
            skipped += 1
            continue

    save_cards(cards)
    save_transactions(logged)

    fraud_count = sum(1 for r in results if r["is_fraud"])
    total       = len(results)
    return {
        "total_rows":        total,
        "fraud_count":       fraud_count,
        "legitimate_count":  total - fraud_count,
        "fraud_rate":        round(fraud_count / total * 100, 2) if total else 0.0,
        "skipped_rows":      skipped,
        "cards_seen":        len(set(r["cc_num"] for r in results)),
        "results":           results,
    }


# ── Transactions ──────────────────────────────────────────────────────────────
@app.get("/transactions")
def get_transactions():
    return {"transactions": list(reversed(load_transactions()))}

@app.get("/stats")
def get_stats():
    transactions = load_transactions()
    if not transactions:
        return {"total": 0, "fraud_count": 0, "legitimate_count": 0,
                "fraud_rate": 0.0, "recent_fraud": [],
                "risk_breakdown": {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}}
    total          = len(transactions)
    fraud          = [t for t in transactions if t["is_fraud"]]
    risk_breakdown = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for t in transactions:
        risk_breakdown[t["risk_level"]] += 1
    return {
        "total":            total,
        "fraud_count":      len(fraud),
        "legitimate_count": total - len(fraud),
        "fraud_rate":       round(len(fraud) / total * 100, 2),
        "recent_fraud":     list(reversed(fraud))[:5],
        "risk_breakdown":   risk_breakdown,
    }

@app.delete("/transactions")
def clear_all():
    save_transactions([])
    save_cards({})
    return {"message": "All transactions and card profiles cleared."}


# ── Cards ─────────────────────────────────────────────────────────────────────
@app.get("/cards")
def get_cards():
    cards    = load_cards()
    profiles = list(cards.values())
    for p in profiles:
        if p.get("min_amt") == float("inf"):
            p["min_amt"] = 0.0
    profiles.sort(key=lambda p: p["fraud_count"], reverse=True)
    return {"cards": profiles, "total": len(profiles)}

@app.get("/cards/{cc_num}")
def get_card(cc_num: str):
    cards = load_cards()
    if cc_num not in cards:
        raise HTTPException(status_code=404, detail=f"Card {cc_num} not found.")
    profile = cards[cc_num]
    if profile.get("min_amt") == float("inf"):
        profile["min_amt"] = 0.0

    all_tx   = load_transactions()
    card_tx  = [t for t in reversed(all_tx) if t.get("cc_num") == cc_num]
    cat_counts = Counter(profile["categories"])
    top_categories = [{"category": k, "count": v}
                      for k, v in cat_counts.most_common(5)]
    hour_counts = Counter(profile["hours"])
    hour_distribution = {str(h): hour_counts.get(h, 0) for h in range(24)}

    return {
        "profile":           profile,
        "transactions":      card_tx,
        "top_categories":    top_categories,
        "hour_distribution": hour_distribution,
    }