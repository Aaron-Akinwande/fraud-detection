# 🔍 Fraud Detection Backend

FastAPI backend with a scikit-learn Random Forest model trained on the
Kaggle Credit Card Fraud dataset.

---

## 📁 Project Structure

```
fraud-backend/
├── main.py                  # FastAPI app (all endpoints)
├── requirements.txt         # Python dependencies
├── transactions.json        # Auto-created when predictions are made
├── data/
│   └── card_transdata.csv   # ← Place Kaggle dataset here
└── model/
    ├── train.py             # Training script
    └── fraud_model.pkl      # ← Auto-created after training
```

---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Add the dataset
Download from Kaggle and place in `/data`:
```
https://www.kaggle.com/datasets/dhanushnarayananr/credit-card-fraud
```
Rename the file to `card_transdata.csv` if needed.

### 3. Train the model
```bash
python model/train.py
```
This creates `model/fraud_model.pkl`. Takes ~30–60 seconds.

### 4. Start the API server
```bash
uvicorn main:app --reload --port 8000
```

API is now live at: http://localhost:8000  
Swagger docs at:   http://localhost:8000/docs

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/predict` | Submit a transaction for fraud detection |
| GET | `/transactions` | Get all logged transactions |
| GET | `/stats` | Get dashboard summary stats |
| DELETE | `/transactions` | Clear all transactions (demo reset) |

---

## 🧪 Example Request

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "distance_from_home": 57.87,
    "distance_from_last_transaction": 0.31,
    "ratio_to_median_purchase_price": 1.94,
    "repeat_retailer": 1,
    "used_chip": 1,
    "used_pin_number": 0,
    "online_order": 0
  }'
```

### Example Response
```json
{
  "id": "a1b2c3d4-...",
  "timestamp": "2024-01-15T10:30:00Z",
  "is_fraud": false,
  "confidence": 0.92,
  "risk_level": "Low",
  "distance_from_home": 57.87,
  ...
}
```

---

## 🤖 Model Details

- **Algorithm:** Random Forest Classifier
- **Trees:** 50 (lightweight)
- **Max depth:** 10
- **Balancing:** RandomUnderSampler (handles fraud/legitimate imbalance)
- **Features:** 7 (all from the Kaggle dataset)
