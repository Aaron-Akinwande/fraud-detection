"""
train.py
--------
Trains a lightweight fraud detection model.

Dataset columns used:
  amt, category, gender, city_pop, lat, long,
  merch_lat, merch_long, unix_time  →  features
  is_fraud                          →  target

Run:
  python model/train.py
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder
from imblearn.under_sampling import RandomUnderSampler

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "data", "card_transdata.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model", "fraud_model.pkl")
META_PATH  = os.path.join(BASE_DIR, "model", "model_meta.pkl")

TARGET = "is_fraud"


def engineer_features(df: pd.DataFrame):
    """
    Converts raw columns into model-ready numeric features.
    Returns the transformed df and fitted encoders.
    """
    df = df.copy()

    le_cat    = LabelEncoder()
    le_gender = LabelEncoder()
    df["category_enc"] = le_cat.fit_transform(df["category"].astype(str))
    df["gender_enc"]   = le_gender.fit_transform(df["gender"].astype(str))

    # Approx distance (degrees → km) between cardholder and merchant
    df["distance_to_merchant"] = np.sqrt(
        (df["lat"] - df["merch_lat"]) ** 2 +
        (df["long"] - df["merch_long"]) ** 2
    ) * 111

    # Hour of day from unix timestamp
    df["hour_of_day"] = (df["unix_time"] // 3600) % 24

    return df, le_cat, le_gender


FEATURES = [
    "amt",
    "category_enc",
    "gender_enc",
    "city_pop",
    "distance_to_merchant",
    "hour_of_day",
]


def train():
    print("📂 Loading dataset...")
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"\n❌ Dataset not found at: {DATA_PATH}"
            "\n   Place your CSV inside the /data folder named card_transdata.csv"
        )

    df = pd.read_csv(DATA_PATH)
    df.columns = df.columns.str.strip().str.lower()
    print(f"   Rows: {len(df):,}  |  Fraud rate: {df[TARGET].mean():.2%}")

    print("🔧 Engineering features...")
    df, le_cat, le_gender = engineer_features(df)

    X = df[FEATURES]
    y = df[TARGET]

    print("⚖️  Balancing classes with undersampling...")
    rus = RandomUnderSampler(sampling_strategy=0.5, random_state=42)
    X_res, y_res = rus.fit_resample(X, y)
    print(f"   After resampling → {len(X_res):,} rows  |  Fraud rate: {y_res.mean():.2%}")

    X_train, X_test, y_train, y_test = train_test_split(
        X_res, y_res, test_size=0.2, random_state=42
    )

    print("🌲 Training Random Forest...")
    model = RandomForestClassifier(
        n_estimators=50,
        max_depth=10,
        n_jobs=-1,
        random_state=42,
    )
    model.fit(X_train, y_train)

    print("\n📊 Evaluation on test set:")
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=["Legitimate", "Fraud"]))

    joblib.dump(model, MODEL_PATH)
    joblib.dump({"le_cat": le_cat, "le_gender": le_gender, "features": FEATURES}, META_PATH)

    print(f"✅ Model saved     →  {MODEL_PATH}")
    print(f"✅ Metadata saved  →  {META_PATH}")


if __name__ == "__main__":
    train()