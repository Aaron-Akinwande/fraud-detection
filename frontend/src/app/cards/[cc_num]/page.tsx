"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCard, CardDetail } from "../../lib/api";
import RiskBadge from "../../components/RiskBadge";
import clsx from "clsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded px-3 py-2 shadow-xl">
      <p className="font-mono text-[10px] text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p
          key={p.name}
          className="font-mono text-xs"
          style={{ color: p.color }}
        >
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cc_num = params.cc_num as string;

  const [data, setData] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCard(cc_num)
      .then(setData)
      .catch(() => setError("Card not found or API is unreachable."))
      .finally(() => setLoading(false));
  }, [cc_num]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="font-mono text-blue text-sm tracking-widest blink">
          LOADING CARD PROFILE...
        </p>
      </div>
    );

  if (error || !data)
    return (
      <div className="p-8">
        <div className="border border-red/30 bg-red/5 rounded-lg p-6 max-w-md">
          <p className="font-mono text-[10px] text-red tracking-widest mb-2">
            ⚠ ERROR
          </p>
          <p className="font-sans text-text text-sm">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 font-mono text-[10px] text-blue border border-blue/30 px-3 py-2 rounded hover:bg-blue/10 transition-all tracking-widest"
          >
            ← BACK
          </button>
        </div>
      </div>
    );

  const { profile, transactions, top_categories, hour_distribution } = data;

  const fraudRate =
    profile.transaction_count > 0
      ? ((profile.fraud_count / profile.transaction_count) * 100).toFixed(1)
      : "0.0";

  const maskCard = (cc: string) => `•••• •••• •••• ${cc.slice(-4)}`;

  // Hour distribution chart data
  const hourData = Object.entries(hour_distribution).map(([h, count]) => ({
    hour: `${h}h`,
    count,
  }));

  // Transaction amount over time (last 30)
  const amtTimeline = transactions
    .slice(0, 30)
    .reverse()
    .map((t, i) => ({
      n: i + 1,
      amt: t.amt,
      is_fraud: t.is_fraud ? t.amt : null,
    }));

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.back()}
              className="font-mono text-[10px] text-muted tracking-widest hover:text-blue transition-colors"
            >
              ← CARDS /
            </button>
            <span className="font-mono text-[10px] text-blue tracking-widest">
              {maskCard(cc_num)}
            </span>
          </div>
          <h1 className="font-sans font-bold text-2xl text-text tracking-tight">
            {profile.cardholder}
          </h1>
          <p className="font-mono text-[11px] text-muted mt-1">
            CARD: {maskCard(cc_num)} · GENDER: {profile.gender} · CITY POP:{" "}
            {profile.city_pop.toLocaleString()}
          </p>
        </div>

        {/* Risk indicator */}
        <div
          className={clsx(
            "border rounded-lg px-5 py-3 text-center",
            profile.fraud_count > 0
              ? "border-red/30 bg-red/5"
              : "border-green/30 bg-green/5",
          )}
        >
          <p
            className={clsx(
              "font-sans font-bold text-3xl",
              profile.fraud_count > 0 ? "text-red" : "text-green",
            )}
          >
            {fraudRate}%
          </p>
          <p className="font-mono text-[9px] text-muted tracking-widest mt-1">
            FRAUD RATE
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {[
          {
            label: "TOTAL TX",
            value: profile.transaction_count,
            accent: "blue",
          },
          {
            label: "FRAUD TX",
            value: profile.fraud_count,
            accent: profile.fraud_count > 0 ? "red" : "green",
          },
          {
            label: "AVG AMOUNT",
            value: `$${profile.avg_amt.toFixed(2)}`,
            accent: "blue",
          },
          {
            label: "MAX AMOUNT",
            value: `$${profile.max_amt.toFixed(2)}`,
            accent: "yellow",
          },
          {
            label: "MIN AMOUNT",
            value: `$${profile.min_amt.toFixed(2)}`,
            accent: "blue",
          },
          {
            label: "TOTAL SPENT",
            value: `$${profile.total_spent.toFixed(2)}`,
            accent: "green",
          },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className={clsx(
              "bg-surface border rounded-lg p-3",
              accent === "blue" && "border-blue/30",
              accent === "red" && "border-red/30",
              accent === "green" && "border-green/30",
              accent === "yellow" && "border-yellow/30",
            )}
          >
            <p className="font-mono text-[9px] text-muted tracking-widest mb-1.5">
              {label}
            </p>
            <p
              className={clsx(
                "font-sans font-bold text-lg",
                accent === "blue" && "text-blue",
                accent === "red" && "text-red",
                accent === "green" && "text-green",
                accent === "yellow" && "text-yellow",
              )}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Amount timeline */}
        <div className="col-span-2 bg-surface border border-border rounded-lg p-5">
          <p className="font-mono text-[10px] text-muted tracking-widest mb-1">
            AMOUNT TIMELINE
          </p>
          <p className="font-sans text-text font-semibold mb-4">
            Last 30 Transactions
          </p>
          {amtTimeline.length === 0 ? (
            <div className="h-36 flex items-center justify-center">
              <p className="font-mono text-[10px] text-muted tracking-widest">
                NO DATA
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={amtTimeline}>
                <CartesianGrid stroke="#1C2333" strokeDasharray="3 3" />
                <XAxis
                  dataKey="n"
                  tick={{
                    fill: "#8B949E",
                    fontSize: 9,
                    fontFamily: "Space Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: "#8B949E",
                    fontSize: 9,
                    fontFamily: "Space Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="amt"
                  stroke="#388BFD"
                  strokeWidth={1.5}
                  dot={false}
                  name="Amount ($)"
                />
                <Line
                  type="monotone"
                  dataKey="is_fraud"
                  stroke="#F85149"
                  strokeWidth={0}
                  dot={{ fill: "#F85149", r: 4 }}
                  name="Fraud"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          <p className="font-mono text-[9px] text-muted/50 mt-2 tracking-wider">
            RED DOTS = FRAUD TRANSACTIONS
          </p>
        </div>

        {/* Top categories */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <p className="font-mono text-[10px] text-muted tracking-widest mb-1">
            TOP CATEGORIES
          </p>
          <p className="font-sans text-text font-semibold mb-4">
            Spending Breakdown
          </p>
          {top_categories.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <p className="font-mono text-[10px] text-muted tracking-widest">
                NO DATA
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {top_categories.map((c, i) => {
                const max = top_categories[0].count;
                const pct = (c.count / max) * 100;
                return (
                  <div key={c.category}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[9px] text-muted tracking-wider truncate">
                        {c.category}
                      </span>
                      <span className="font-mono text-[9px] text-text ml-2">
                        {c.count}
                      </span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hour distribution */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-6">
        <p className="font-mono text-[10px] text-muted tracking-widest mb-1">
          TRANSACTION HOURS
        </p>
        <p className="font-sans text-text font-semibold mb-4">
          When Does This Card Transact?
        </p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={hourData}>
            <XAxis
              dataKey="hour"
              tick={{ fill: "#8B949E", fontSize: 8, fontFamily: "Space Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill="#388BFD"
              radius={[2, 2, 0, 0]}
              name="Transactions"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transaction history table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg/50">
          <p className="font-mono text-[10px] text-muted tracking-widest">
            TRANSACTION HISTORY
          </p>
          <p className="font-mono text-[10px] text-muted tracking-widest">
            {transactions.length} RECORDS
          </p>
        </div>

        <div className="grid grid-cols-8 gap-3 px-5 py-3 border-b border-border">
          {[
            "TIME",
            "AMOUNT",
            "CATEGORY",
            "RISK",
            "VERDICT",
            "CONF",
            "AMT/AVG",
            "DIST HOME",
          ].map((h) => (
            <p
              key={h}
              className="font-mono text-[9px] text-muted tracking-widest"
            >
              {h}
            </p>
          ))}
        </div>

        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-mono text-[10px] text-muted tracking-widest">
                NO TRANSACTIONS
              </p>
            </div>
          ) : (
            transactions.map((t) => (
              <div
                key={t.id}
                className={clsx(
                  "grid grid-cols-8 gap-3 px-5 py-2.5 transition-colors",
                  t.is_fraud
                    ? "hover:bg-red/5 border-l-2 border-red/20"
                    : "hover:bg-green/5 border-l-2 border-transparent",
                )}
              >
                <p className="font-mono text-[10px] text-muted">
                  {new Date(t.timestamp).toLocaleTimeString()}
                </p>
                <p
                  className={clsx(
                    "font-mono text-[10px] font-bold",
                    t.is_fraud ? "text-red" : "text-text",
                  )}
                >
                  ${t.amt.toFixed(2)}
                </p>
                <p className="font-mono text-[10px] text-muted truncate">
                  {t.category}
                </p>
                <div>
                  <RiskBadge level={t.risk_level} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={clsx(
                      "w-1.5 h-1.5 rounded-full",
                      t.is_fraud ? "bg-red" : "bg-green",
                    )}
                  />
                  <p
                    className={clsx(
                      "font-mono text-[10px]",
                      t.is_fraud ? "text-red" : "text-green",
                    )}
                  >
                    {t.is_fraud ? "FRAUD" : "LEGIT"}
                  </p>
                </div>
                <p className="font-mono text-[10px] text-muted">
                  {(t.confidence * 100).toFixed(1)}%
                </p>
                <p
                  className={clsx(
                    "font-mono text-[10px]",
                    t.amt_vs_avg > 3
                      ? "text-red"
                      : t.amt_vs_avg > 1.5
                        ? "text-yellow"
                        : "text-muted",
                  )}
                >
                  {t.amt_vs_avg.toFixed(2)}x
                </p>
                <p className="font-mono text-[10px] text-muted">
                  {t.distance_from_home} km
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
