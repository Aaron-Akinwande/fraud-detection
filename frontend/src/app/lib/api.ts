import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

export interface Transaction {
  id: string;
  timestamp: string;
  is_fraud: boolean;
  confidence: number;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  amt: number;
  category: string;
  gender: string;
  city_pop: number;
  distance_to_merchant: number;
  hour_of_day: number;
}

export interface Stats {
  total: number;
  fraud_count: number;
  legitimate_count: number;
  fraud_rate: number;
  recent_fraud: Transaction[];
  risk_breakdown: {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  };
}

export interface TransactionInput {
  amt: number;
  category: string;
  gender: string;
  city_pop: number;
  lat: number;
  long: number;
  merch_lat: number;
  merch_long: number;
  unix_time: number;
}

export const getStats = () => api.get<Stats>("/stats").then((r) => r.data);
export const getTransactions = () =>
  api.get<{ transactions: Transaction[] }>("/transactions").then((r) => r.data);
export const predict = (t: TransactionInput) =>
  api.post<Transaction>("/predict", t).then((r) => r.data);
export const getMeta = () =>
  api
    .get<{ categories: string[]; genders: string[] }>("/meta")
    .then((r) => r.data);
export const clearTransactions = () =>
  api.delete("/transactions").then((r) => r.data);

export interface BatchSummary {
  total_rows: number;
  fraud_count: number;
  legitimate_count: number;
  fraud_rate: number;
  skipped_rows: number;
  results: Transaction[];
}

export const predictBatch = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post<BatchSummary>("/predict/batch", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
