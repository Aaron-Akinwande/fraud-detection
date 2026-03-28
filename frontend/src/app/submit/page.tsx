"use client";
import { useEffect, useState } from "react";
import { predict, getMeta, Transaction, TransactionInput } from "../lib/api";
import RiskBadge from "../components/RiskBadge";
import clsx from "clsx";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] text-muted tracking-widest mb-1.5 uppercase">
        {label}
      </label>
      {children}
      {hint && (
        <p className="font-mono text-[9px] text-muted/60 mt-1 tracking-wide">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "w-full bg-bg border border-border rounded px-3 py-2.5 font-mono text-xs text-text placeholder-muted/40 focus:outline-none focus:border-blue/50 focus:bg-blue/5 transition-all";
const selectCls = inputCls + " appearance-none cursor-pointer";

const DEMO_LEGIT: TransactionInput = {
  cc_num: "4532015112830366",
  first: "Mary",
  last: "Johnson",
  amt: 42.5,
  category: "grocery_pos",
  gender: "F",
  city_pop: 45000,
  lat: 36.88,
  long: -88.31,
  merch_lat: 36.9,
  merch_long: -88.29,
  unix_time: 1371816865,
};
const DEMO_FRAUD: TransactionInput = {
  cc_num: "4532015112830366",
  first: "Mary",
  last: "Johnson",
  amt: 1289.99,
  category: "shopping_net",
  gender: "F",
  city_pop: 300,
  lat: 33.98,
  long: -80.97,
  merch_lat: 40.73,
  merch_long: -74.01,
  unix_time: 1371816865,
};

export default function SubmitPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [form, setForm] = useState<Partial<TransactionInput>>({});
  const [result, setResult] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMeta()
      .then((m) => {
        setCategories(m.categories);
        setGenders(m.genders);
      })
      .catch(() => setError("Cannot reach API. Is the backend running?"));
  }, []);

  const set = (k: keyof TransactionInput, v: string) =>
    setForm((f) => ({
      ...f,
      [k]: ["category", "gender", "cc_num", "first", "last"].includes(k)
        ? v
        : Number(v),
    }));

  const handleSubmit = async () => {
    const required: (keyof TransactionInput)[] = [
      "cc_num",
      "first",
      "last",
      "amt",
      "category",
      "gender",
      "city_pop",
      "lat",
      "long",
      "merch_lat",
      "merch_long",
      "unix_time",
    ];
    const missing = required.filter(
      (k) => form[k] === undefined || form[k] === "",
    );
    if (missing.length) {
      setError(`Missing fields: ${missing.join(", ")}`);
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      setResult(await predict(form as TransactionInput));
    } catch {
      setError("Prediction failed. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[10px] text-muted tracking-widest">
            DASHBOARD /
          </span>
          <span className="font-mono text-[10px] text-blue tracking-widest">
            CHECK TRANSACTION
          </span>
        </div>
        <h1 className="font-sans font-bold text-2xl text-text tracking-tight">
          Transaction Checker
        </h1>
        <p className="font-mono text-[11px] text-muted mt-1">
          SUBMIT TRANSACTION DETAILS TO RUN FRAUD ANALYSIS
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <span className="font-mono text-[10px] text-muted tracking-widest self-center">
          LOAD DEMO:
        </span>
        <button
          onClick={() => {
            setForm(DEMO_LEGIT);
            setResult(null);
          }}
          className="font-mono text-[10px] text-green border border-green/30 bg-green/5 px-3 py-1.5 rounded hover:bg-green/10 transition-all tracking-widest"
        >
          ✓ LEGITIMATE SAMPLE
        </button>
        <button
          onClick={() => {
            setForm(DEMO_FRAUD);
            setResult(null);
          }}
          className="font-mono text-[10px] text-red border border-red/30 bg-red/5 px-3 py-1.5 rounded hover:bg-red/10 transition-all tracking-widest"
        >
          ⚠ FRAUD SAMPLE
        </button>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Form */}
        <div className="col-span-3 bg-surface border border-border rounded-lg p-6 space-y-5">
          {/* Card identity */}
          <div>
            <p className="font-mono text-[10px] text-muted tracking-widest border-b border-border pb-3 mb-4">
              CARDHOLDER DETAILS
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name">
                <input
                  type="text"
                  placeholder="e.g. Mary"
                  value={form.first ?? ""}
                  onChange={(e) => set("first", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Last Name">
                <input
                  type="text"
                  placeholder="e.g. Johnson"
                  value={form.last ?? ""}
                  onChange={(e) => set("last", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Credit Card Number" hint="16-digit card number">
                <input
                  type="text"
                  placeholder="e.g. 4532015112830366"
                  value={form.cc_num ?? ""}
                  onChange={(e) => set("cc_num", e.target.value)}
                  className={inputCls}
                  maxLength={19}
                />
              </Field>
            </div>
          </div>

          {/* Transaction details */}
          <div>
            <p className="font-mono text-[10px] text-muted tracking-widest border-b border-border pb-3 mb-4">
              TRANSACTION DETAILS
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount (USD)">
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 149.99"
                  value={form.amt ?? ""}
                  onChange={(e) => set("amt", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Category">
                <select
                  value={form.category ?? ""}
                  onChange={(e) => set("category", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Gender">
                <select
                  value={form.gender ?? ""}
                  onChange={(e) => set("gender", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select...</option>
                  {genders.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="City Population">
                <input
                  type="number"
                  placeholder="e.g. 45000"
                  value={form.city_pop ?? ""}
                  onChange={(e) => set("city_pop", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="font-mono text-[10px] text-muted tracking-widest border-b border-border pb-3 mb-4">
              LOCATION COORDINATES
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cardholder Latitude">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 36.8800"
                  value={form.lat ?? ""}
                  onChange={(e) => set("lat", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Cardholder Longitude">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. -88.3100"
                  value={form.long ?? ""}
                  onChange={(e) => set("long", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Merchant Latitude">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 36.9000"
                  value={form.merch_lat ?? ""}
                  onChange={(e) => set("merch_lat", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Merchant Longitude">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. -88.2900"
                  value={form.merch_long ?? ""}
                  onChange={(e) => set("merch_long", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          <Field label="Unix Timestamp" hint="Transaction time as unix epoch">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="e.g. 1371816865"
                value={form.unix_time ?? ""}
                onChange={(e) => set("unix_time", e.target.value)}
                className={inputCls}
              />
              <button
                onClick={() =>
                  set("unix_time", String(Math.floor(Date.now() / 1000)))
                }
                className="font-mono text-[9px] text-blue border border-blue/30 px-3 rounded hover:bg-blue/10 transition-all whitespace-nowrap tracking-wider"
              >
                NOW
              </button>
            </div>
          </Field>

          {error && (
            <div className="border border-red/30 bg-red/5 rounded p-3">
              <p className="font-mono text-[10px] text-red tracking-wider">
                ⚠ {error}
              </p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={clsx(
              "w-full py-3 rounded font-mono text-[11px] tracking-widest transition-all duration-200 border",
              loading
                ? "bg-blue/5 text-muted border-border cursor-not-allowed"
                : "bg-blue/10 text-blue border-blue/30 hover:bg-blue/20 hover:border-blue/50",
            )}
          >
            {loading ? "⟳ ANALYZING..." : "▶ RUN FRAUD ANALYSIS"}
          </button>
        </div>

        {/* Result panel */}
        <div className="col-span-2 space-y-4">
          {!result && !loading && (
            <div className="bg-surface border border-border rounded-lg p-6 h-full flex flex-col items-center justify-center text-center">
              <span className="text-4xl mb-4 text-muted/30">⬡</span>
              <p className="font-mono text-[10px] text-muted tracking-widest">
                AWAITING TRANSACTION
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-surface border border-blue/20 rounded-lg p-6 h-64 flex flex-col items-center justify-center glow-blue">
              <div className="font-mono text-blue text-sm tracking-widest blink mb-3">
                ANALYZING
              </div>
            </div>
          )}

          {result && (
            <div
              className={clsx(
                "bg-surface border rounded-lg p-6 animate-slide-up",
                result.is_fraud
                  ? "border-red/40 glow-red"
                  : "border-green/40 glow-green",
              )}
            >
              <div
                className={clsx(
                  "text-center py-5 mb-5 rounded border",
                  result.is_fraud
                    ? "border-red/20 bg-red/5"
                    : "border-green/20 bg-green/5",
                )}
              >
                <div
                  className={clsx(
                    "text-5xl mb-3",
                    result.is_fraud
                      ? "text-red text-glow-red"
                      : "text-green text-glow-green",
                  )}
                >
                  {result.is_fraud ? "⚠" : "✓"}
                </div>
                <p
                  className={clsx(
                    "font-sans font-bold text-xl",
                    result.is_fraud ? "text-red" : "text-green",
                  )}
                >
                  {result.is_fraud ? "FRAUD DETECTED" : "LEGITIMATE"}
                </p>
                <p className="font-mono text-[10px] text-muted mt-1 tracking-widest">
                  {result.cardholder}
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    label: "RISK LEVEL",
                    value: <RiskBadge level={result.risk_level} size="md" />,
                  },
                  {
                    label: "CONFIDENCE",
                    value: `${(result.confidence * 100).toFixed(2)}%`,
                  },
                  { label: "AMOUNT", value: `$${result.amt.toFixed(2)}` },
                  {
                    label: "AMT vs CARD AVG",
                    value: `${result.amt_vs_avg.toFixed(2)}x`,
                    highlight: result.amt_vs_avg > 3,
                  },
                  { label: "CATEGORY", value: result.category },
                  {
                    label: "NEW CATEGORY",
                    value: result.is_new_category ? "⚠ YES" : "✓ NO",
                    highlight: result.is_new_category,
                  },
                  {
                    label: "UNUSUAL HOUR",
                    value: result.is_unusual_hour ? "⚠ YES" : "✓ NO",
                    highlight: result.is_unusual_hour,
                  },
                  {
                    label: "DIST TO MERCHANT",
                    value: `${result.distance_to_merchant} km`,
                  },
                  {
                    label: "DIST FROM HOME",
                    value: `${result.distance_from_home} km`,
                    highlight: result.distance_from_home > 200,
                  },
                  { label: "HOUR OF DAY", value: `${result.hour_of_day}:00` },
                ].map(({ label, value, highlight }) => (
                  <div
                    key={label}
                    className="flex justify-between border-b border-border pb-2"
                  >
                    <span className="font-mono text-[9px] text-muted tracking-widest">
                      {label}
                    </span>
                    {typeof value === "string" ? (
                      <span
                        className={clsx(
                          "font-mono text-[10px]",
                          highlight ? "text-red" : "text-text",
                        )}
                      >
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
