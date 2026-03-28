"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCards, CardProfile } from "../lib/api";
import clsx from "clsx";

type Sort = "fraud_desc" | "tx_desc" | "spent_desc" | "recent";

export default function CardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<CardProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("fraud_desc");

  const fetchCards = useCallback(async () => {
    try {
      const data = await getCards();
      setCards(data.cards);
      setError("");
    } catch {
      setError("Cannot connect to API. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const filtered = cards
    .filter(
      (c) =>
        search === "" ||
        c.cardholder.toLowerCase().includes(search.toLowerCase()) ||
        c.cc_num.includes(search),
    )
    .sort((a, b) => {
      if (sort === "fraud_desc") return b.fraud_count - a.fraud_count;
      if (sort === "tx_desc") return b.transaction_count - a.transaction_count;
      if (sort === "spent_desc") return b.total_spent - a.total_spent;
      if (sort === "recent")
        return (
          new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
        );
      return 0;
    });

  // Summary stats
  const totalCards = cards.length;
  const flaggedCards = cards.filter((c) => c.fraud_count > 0).length;
  const totalFraud = cards.reduce((s, c) => s + c.fraud_count, 0);
  const totalSpent = cards.reduce((s, c) => s + c.total_spent, 0);

  const fraudRate = (c: CardProfile) =>
    c.transaction_count > 0 ? (c.fraud_count / c.transaction_count) * 100 : 0;

  const riskColor = (c: CardProfile) => {
    const r = fraudRate(c);
    if (r === 0)
      return { bar: "bg-green", text: "text-green", border: "border-green/20" };
    if (r < 25)
      return {
        bar: "bg-yellow",
        text: "text-yellow",
        border: "border-yellow/20",
      };
    if (r < 60)
      return { bar: "bg-red", text: "text-red", border: "border-red/20" };
    return { bar: "bg-red", text: "text-red", border: "border-red/30" };
  };

  const maskCard = (cc: string) => `•••• •••• •••• ${cc.slice(-4)}`;

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[10px] text-muted tracking-widest">
            DASHBOARD /
          </span>
          <span className="font-mono text-[10px] text-blue tracking-widest">
            CARD PROFILES
          </span>
        </div>
        <h1 className="font-sans font-bold text-2xl text-text tracking-tight">
          Card Profiles
        </h1>
        <p className="font-mono text-[11px] text-muted mt-1">
          PER-CARD SPENDING HISTORY AND FRAUD TRACKING
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "TOTAL CARDS", value: totalCards, accent: "blue" },
          { label: "FLAGGED CARDS", value: flaggedCards, accent: "red" },
          { label: "TOTAL FRAUD TX", value: totalFraud, accent: "red" },
          {
            label: "TOTAL VOLUME",
            value: `$${totalSpent.toFixed(2)}`,
            accent: "green",
          },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className={clsx(
              "bg-surface border rounded-lg p-4",
              accent === "blue" && "border-blue/30",
              accent === "red" && "border-red/30",
              accent === "green" && "border-green/30",
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
              )}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="SEARCH NAME OR CARD NUMBER..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg border border-border rounded px-3 py-2 font-mono text-[10px] text-text placeholder-muted/40 focus:outline-none focus:border-blue/40 w-72 tracking-wider"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="bg-bg border border-border rounded px-3 py-2 font-mono text-[10px] text-muted focus:outline-none focus:border-blue/40 tracking-wider appearance-none cursor-pointer ml-auto"
        >
          <option value="fraud_desc">MOST FRAUD FIRST</option>
          <option value="tx_desc">MOST TRANSACTIONS</option>
          <option value="spent_desc">HIGHEST SPEND</option>
          <option value="recent">MOST RECENT</option>
        </select>
        <span className="font-mono text-[10px] text-muted tracking-widest">
          {filtered.length} CARDS
        </span>
      </div>

      {error && (
        <div className="border border-red/30 bg-red/5 rounded p-4 mb-5">
          <p className="font-mono text-[10px] text-red tracking-widest">
            {error}
          </p>
        </div>
      )}

      {/* Table header */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 gap-3 px-5 py-3 border-b border-border bg-bg/50">
          {[
            "CARDHOLDER",
            "CARD NUMBER",
            "TRANSACTIONS",
            "FRAUD COUNT",
            "FRAUD RATE",
            "AVG AMOUNT",
            "TOTAL SPENT",
            "LAST SEEN",
          ].map((h) => (
            <p
              key={h}
              className="font-mono text-[9px] text-muted tracking-widest"
            >
              {h}
            </p>
          ))}
        </div>

        <div className="divide-y divide-border max-h-[calc(100vh-380px)] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center">
              <p className="font-mono text-[10px] text-muted tracking-widest blink">
                LOADING CARD PROFILES...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-mono text-[10px] text-muted tracking-widest">
                {cards.length === 0
                  ? "NO CARDS YET — SUBMIT TRANSACTIONS TO BUILD PROFILES"
                  : "NO CARDS MATCH YOUR SEARCH"}
              </p>
            </div>
          ) : (
            filtered.map((card) => {
              const rc = riskColor(card);
              const fr = fraudRate(card);
              return (
                <div
                  key={card.cc_num}
                  onClick={() => router.push(`/cards/${card.cc_num}`)}
                  className={clsx(
                    "grid grid-cols-8 gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150 group",
                    card.fraud_count > 0
                      ? "hover:bg-red/5 border-l-2 border-red/20"
                      : "hover:bg-green/5 border-l-2 border-transparent hover:border-green/20",
                  )}
                >
                  {/* Cardholder */}
                  <div>
                    <p className="font-sans text-[11px] text-text font-medium group-hover:text-blue transition-colors">
                      {card.cardholder}
                    </p>
                    <p className="font-mono text-[9px] text-muted">
                      {card.gender}
                    </p>
                  </div>

                  {/* Card number */}
                  <p className="font-mono text-[10px] text-muted self-center">
                    {maskCard(card.cc_num)}
                  </p>

                  {/* Transaction count */}
                  <p className="font-mono text-[10px] text-text self-center">
                    {card.transaction_count}
                  </p>

                  {/* Fraud count */}
                  <p
                    className={clsx(
                      "font-mono text-[10px] font-bold self-center",
                      card.fraud_count > 0 ? "text-red" : "text-green",
                    )}
                  >
                    {card.fraud_count > 0 ? `⚠ ${card.fraud_count}` : "✓ 0"}
                  </p>

                  {/* Fraud rate bar */}
                  <div className="self-center">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all",
                            rc.bar,
                          )}
                          style={{ width: `${Math.min(fr, 100)}%` }}
                        />
                      </div>
                      <span className={clsx("font-mono text-[9px]", rc.text)}>
                        {fr.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Avg amount */}
                  <p className="font-mono text-[10px] text-text self-center">
                    ${card.avg_amt.toFixed(2)}
                  </p>

                  {/* Total spent */}
                  <p className="font-mono text-[10px] text-muted self-center">
                    ${card.total_spent.toFixed(2)}
                  </p>

                  {/* Last seen */}
                  <p className="font-mono text-[10px] text-muted self-center">
                    {new Date(card.last_seen).toLocaleDateString()}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
