import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

export interface Transaction {
  id: string;
  cc_num: string;
  cardholder: string;
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
  amt_vs_avg: number;
  is_new_category: boolean;
  is_unusual_hour: boolean;
  distance_from_home: number;
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
  cc_num: string;
  first: string;
  last: string;
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

export interface CardProfile {
  cc_num: string;
  first: string;
  last: string;
  cardholder: string;
  gender: string;
  home_lat: number;
  home_long: number;
  city_pop: number;
  transaction_count: number;
  fraud_count: number;
  total_spent: number;
  avg_amt: number;
  max_amt: number;
  min_amt: number;
  categories: string[];
  hours: number[];
  transaction_ids: string[];
  first_seen: string;
  last_seen: string;
}

export interface CardDetail {
  profile: CardProfile;
  transactions: Transaction[];
  top_categories: { category: string; count: number }[];
  hour_distribution: Record<string, number>;
}

export interface BatchSummary {
  total_rows: number;
  fraud_count: number;
  legitimate_count: number;
  fraud_rate: number;
  skipped_rows: number;
  cards_seen: number;
  results: Transaction[];
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
export const getCards = () =>
  api
    .get<{ cards: CardProfile[]; total: number }>("/cards")
    .then((r) => r.data);
export const getCard = (cc: string) =>
  api.get<CardDetail>(`/cards/${cc}`).then((r) => r.data);
export const predictBatch = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post<BatchSummary>("/predict/batch", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
