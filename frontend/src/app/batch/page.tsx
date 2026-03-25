"use client";
import { useState, useRef, useCallback } from "react";
import { predictBatch, BatchSummary, Transaction } from "../lib/api";
import RiskBadge from "../components/RiskBadge";
import clsx from "clsx";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const REQUIRED_COLS = [
  "trans_date_trans_time",
  "cc_num",
  "merchant",
  "category",
  "amt",
  "first",
  "last",
  "gender",
  "street",
  "city",
  "state",
  "zip",
  "lat",
  "long",
  "city_pop",
  "job",
  "dob",
  "trans_num",
  "unix_time",
  "merch_lat",
  "merch_long",
  "is_fraud",
];

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

type Stage = "idle" | "dragging" | "loading" | "done" | "error";

export default function BatchPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [filter, setFilter] = useState<"all" | "fraud" | "legitimate">("all");
  const [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 50;

  const runAnalysis = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrMsg("Only .csv files are accepted.");
      setStage("error");
      return;
    }
    setFileName(file.name);
    setStage("loading");
    setErrMsg("");
    setSummary(null);
    setPage(0);
    try {
      const data = await predictBatch(file);
      setSummary(data);
      setStage("done");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setErrMsg(
        typeof detail === "string"
          ? detail
          : "Analysis failed. Check your CSV format and that the backend is running.",
      );
      setStage("error");
    }
  }, []);

  // Drag & drop handlers
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setStage("idle");
      const file = e.dataTransfer.files[0];
      if (file) runAnalysis(file);
    },
    [runAnalysis],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runAnalysis(file);
  };

  const reset = () => {
    setStage("idle");
    setSummary(null);
    setErrMsg("");
    setFileName("");
    setFilter("all");
    setPage(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Derived data for charts
  const categoryData = (() => {
    if (!summary) return [];
    const counts: Record<string, number> = {};
    summary.results
      .filter((r) => r.is_fraud)
      .forEach((r) => {
        counts[r.category] = (counts[r.category] || 0) + 1;
      });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  })();

  const riskData = (() => {
    if (!summary) return [];
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    summary.results.forEach((r) => {
      counts[r.risk_level as keyof typeof counts]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const pieData = summary
    ? [
        { name: "Legitimate", value: summary.legitimate_count },
        { name: "Fraud", value: summary.fraud_count },
      ]
    : [];

  const filtered =
    summary?.results.filter((r) => {
      if (filter === "fraud") return r.is_fraud;
      if (filter === "legitimate") return !r.is_fraud;
      return true;
    }) ?? [];
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Download results as CSV ──────────────────────────────────────────────
  const downloadCSV = () => {
    if (!summary) return;
    const headers = [
      "id",
      "timestamp",
      "is_fraud",
      "risk_level",
      "confidence",
      "amt",
      "category",
      "gender",
      "city_pop",
      "distance_to_merchant",
      "hour_of_day",
    ];
    const rows = summary.results.map((r) =>
      headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fraud_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-[10px] text-muted tracking-widest">
              DASHBOARD /
            </span>
            <span className="font-mono text-[10px] text-blue tracking-widest">
              BATCH ANALYSIS
            </span>
          </div>
          <h1 className="font-sans font-bold text-2xl text-text tracking-tight">
            CSV Batch Analysis
          </h1>
          <p className="font-mono text-[11px] text-muted mt-1">
            UPLOAD A CSV FILE TO ANALYSE MULTIPLE TRANSACTIONS AT ONCE
          </p>
        </div>
        {stage === "done" && (
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="font-mono text-[10px] text-green border border-green/30 bg-green/5 px-3 py-2 rounded hover:bg-green/10 transition-all tracking-widest"
            >
              ↓ DOWNLOAD RESULTS
            </button>
            <button
              onClick={reset}
              className="font-mono text-[10px] text-muted border border-border px-3 py-2 rounded hover:border-blue/30 hover:text-blue transition-all tracking-widest"
            >
              ↺ NEW FILE
            </button>
          </div>
        )}
      </div>

      {/* ── Upload zone ───────────────────────────────────────────────── */}
      {(stage === "idle" || stage === "dragging" || stage === "error") && (
        <div className="max-w-2xl mx-auto">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setStage("dragging");
            }}
            onDragLeave={() => setStage("idle")}
            onClick={() => inputRef.current?.click()}
            className={clsx(
              "border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all duration-200",
              stage === "dragging"
                ? "border-blue/60 bg-blue/5 scale-[1.01]"
                : "border-border hover:border-blue/30 hover:bg-blue/5",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="hidden"
            />
            <div className="text-5xl mb-4 text-muted/30">
              {stage === "dragging" ? "📂" : "⬡"}
            </div>
            <p className="font-sans font-semibold text-text mb-2">
              {stage === "dragging"
                ? "Drop to analyse"
                : "Drop your CSV file here"}
            </p>
            <p className="font-mono text-[10px] text-muted tracking-widest mb-6">
              OR CLICK TO BROWSE
            </p>
            <div className="inline-block border border-blue/30 bg-blue/10 text-blue font-mono text-[10px] px-4 py-2 rounded tracking-widest">
              SELECT FILE
            </div>
          </div>

          {/* Error */}
          {stage === "error" && (
            <div className="mt-4 border border-red/30 bg-red/5 rounded-lg p-4 glow-red">
              <p className="font-mono text-[10px] text-red tracking-widest mb-1">
                ⚠ ERROR
              </p>
              <p className="font-sans text-sm text-text">{errMsg}</p>
            </div>
          )}

          {/* Expected columns */}
          <div className="mt-6 bg-surface border border-border rounded-lg p-5">
            <p className="font-mono text-[10px] text-muted tracking-widest mb-3">
              EXPECTED CSV HEADERS
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REQUIRED_COLS.map((col) => (
                <span
                  key={col}
                  className="font-mono text-[9px] bg-border/50 text-muted px-2 py-1 rounded tracking-wider"
                >
                  {col}
                </span>
              ))}
            </div>
            <p className="font-mono text-[9px] text-muted/50 mt-3 tracking-wider">
              MAX 5,000 ROWS PER UPLOAD · UTF-8 ENCODING
            </p>
          </div>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {stage === "loading" && (
        <div className="max-w-md mx-auto mt-16 text-center">
          <div className="border border-blue/20 bg-blue/5 rounded-xl p-12 glow-blue">
            <div className="font-mono text-blue text-sm tracking-widest blink mb-4">
              ANALYSING
            </div>
            <p className="font-mono text-[11px] text-text mb-1">{fileName}</p>
            <div className="space-y-1 mt-4">
              {[
                "PARSING CSV...",
                "ENCODING FEATURES...",
                "RUNNING MODEL...",
                "COMPUTING RISK LEVELS...",
              ].map((s, i) => (
                <p
                  key={i}
                  className="font-mono text-[9px] text-muted tracking-widest"
                >
                  {s}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────── */}
      {stage === "done" && summary && (
        <div className="animate-slide-up">
          {/* Summary bar */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[
              {
                label: "TOTAL ROWS",
                value: summary.total_rows,
                accent: "blue",
              },
              { label: "FRAUD", value: summary.fraud_count, accent: "red" },
              {
                label: "LEGITIMATE",
                value: summary.legitimate_count,
                accent: "green",
              },
              {
                label: "FRAUD RATE",
                value: `${summary.fraud_rate}%`,
                accent: "yellow",
              },
              {
                label: "SKIPPED ROWS",
                value: summary.skipped_rows,
                accent: "yellow",
              },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                className={clsx(
                  "bg-surface border rounded-lg p-4",
                  accent === "blue" && "border-blue/30",
                  accent === "red" && "border-red/30",
                  accent === "green" && "border-green/30",
                  accent === "yellow" && "border-yellow/30",
                )}
              >
                <p className="font-mono text-[9px] text-muted tracking-widest mb-2">
                  {label}
                </p>
                <p
                  className={clsx(
                    "font-sans font-bold text-2xl",
                    accent === "blue" && "text-blue",
                    accent === "red" && "text-red",
                    accent === "green" && "text-green",
                    accent === "yellow" && "text-yellow",
                  )}
                >
                  {value}
                </p>
                <p className="font-mono text-[9px] text-muted/50 mt-1 tracking-wider">
                  {fileName}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Split pie */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <p className="font-mono text-[10px] text-muted tracking-widest mb-1">
                SPLIT
              </p>
              <p className="font-sans text-text font-semibold mb-3">
                Fraud vs Legitimate
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#3FB950" />
                    <Cell fill="#F85149" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-1">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex justify-between">
                    <span className="flex items-center gap-2 font-mono text-[10px] text-muted">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: i === 0 ? "#3FB950" : "#F85149" }}
                      />
                      {d.name.toUpperCase()}
                    </span>
                    <span className="font-mono text-[10px] text-text">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk breakdown */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <p className="font-mono text-[10px] text-muted tracking-widest mb-1">
                RISK LEVELS
              </p>
              <p className="font-sans text-text font-semibold mb-4">
                Distribution
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={riskData}>
                  <XAxis
                    dataKey="name"
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
                  <Bar
                    dataKey="value"
                    name="Count"
                    radius={[2, 2, 0, 0]}
                    fill="#388BFD"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top fraud categories */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <p className="font-mono text-[10px] text-muted tracking-widest mb-1">
                FRAUD BY CATEGORY
              </p>
              <p className="font-sans text-text font-semibold mb-4">
                Top Categories
              </p>
              {categoryData.length === 0 ? (
                <div className="h-32 flex items-center justify-center">
                  <p className="font-mono text-[10px] text-green tracking-widest">
                    ✓ NO FRAUD FOUND
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={categoryData} layout="vertical">
                    <XAxis
                      type="number"
                      tick={{
                        fill: "#8B949E",
                        fontSize: 9,
                        fontFamily: "Space Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{
                        fill: "#8B949E",
                        fontSize: 8,
                        fontFamily: "Space Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="value"
                      fill="#F85149"
                      radius={[0, 2, 2, 0]}
                      name="Fraud Cases"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Results table */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {/* Table controls */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-bg/50 flex-wrap">
              <p className="font-mono text-[10px] text-muted tracking-widest">
                RESULTS — {filtered.length} ROWS
              </p>
              <div className="flex gap-2 ml-auto">
                {(["all", "fraud", "legitimate"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setPage(0);
                    }}
                    className={clsx(
                      "font-mono text-[9px] px-3 py-1.5 rounded border tracking-widest transition-all",
                      filter === f
                        ? "bg-blue/10 text-blue border-blue/30"
                        : "text-muted border-border hover:text-text",
                    )}
                  >
                    {f.toUpperCase()}
                    <span className="ml-1.5 opacity-60">
                      {f === "all"
                        ? summary.total_rows
                        : f === "fraud"
                          ? summary.fraud_count
                          : summary.legitimate_count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-7 gap-3 px-5 py-3 border-b border-border">
              {[
                "#",
                "AMOUNT",
                "CATEGORY",
                "RISK",
                "VERDICT",
                "CONFIDENCE",
                "DIST (KM)",
              ].map((h) => (
                <p
                  key={h}
                  className="font-mono text-[9px] text-muted tracking-widest"
                >
                  {h}
                </p>
              ))}
            </div>

            {/* Data rows */}
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {paginated.map((r, i) => (
                <div
                  key={r.id}
                  className={clsx(
                    "grid grid-cols-7 gap-3 px-5 py-2.5 transition-colors",
                    r.is_fraud
                      ? "hover:bg-red/5 border-l-2 border-red/20"
                      : "hover:bg-green/5 border-l-2 border-transparent",
                  )}
                >
                  <p className="font-mono text-[10px] text-muted">
                    {page * PAGE_SIZE + i + 1}
                  </p>
                  <p
                    className={clsx(
                      "font-mono text-[10px] font-bold",
                      r.is_fraud ? "text-red" : "text-text",
                    )}
                  >
                    ${r.amt.toFixed(2)}
                  </p>
                  <p className="font-mono text-[10px] text-muted truncate">
                    {r.category}
                  </p>
                  <div>
                    <RiskBadge level={r.risk_level} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        r.is_fraud ? "bg-red" : "bg-green",
                      )}
                    />
                    <p
                      className={clsx(
                        "font-mono text-[10px]",
                        r.is_fraud ? "text-red" : "text-green",
                      )}
                    >
                      {r.is_fraud ? "FRAUD" : "LEGIT"}
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-muted">
                    {(r.confidence * 100).toFixed(1)}%
                  </p>
                  <p className="font-mono text-[10px] text-muted">
                    {r.distance_to_merchant}
                  </p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-bg/30">
                <p className="font-mono text-[9px] text-muted tracking-widest">
                  PAGE {page + 1} OF {totalPages} · {filtered.length} ROWS
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="font-mono text-[10px] text-muted border border-border px-3 py-1.5 rounded hover:text-text hover:border-blue/30 disabled:opacity-30 transition-all tracking-widest"
                  >
                    ← PREV
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page === totalPages - 1}
                    className="font-mono text-[10px] text-muted border border-border px-3 py-1.5 rounded hover:text-text hover:border-blue/30 disabled:opacity-30 transition-all tracking-widest"
                  >
                    NEXT →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
