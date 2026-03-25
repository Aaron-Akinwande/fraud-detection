'use client'
import { useEffect, useState, useCallback } from 'react'
import { getStats, getTransactions, clearTransactions, Stats, Transaction } from './lib/api'
import StatCard from './components/StatCard'
import RiskBadge from './components/RiskBadge'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

const COLORS = { Low: '#3FB950', Medium: '#D29922', High: '#F85149', Critical: '#F85149' }

function PageHeader({ onClear }: { onClear: () => void }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[10px] text-muted tracking-widest">DASHBOARD /</span>
          <span className="font-mono text-[10px] text-blue tracking-widest">OVERVIEW</span>
        </div>
        <h1 className="font-sans font-bold text-2xl text-text tracking-tight">Fraud Overview</h1>
        <p className="font-mono text-[11px] text-muted mt-1">{time}</p>
      </div>
      <button
        onClick={onClear}
        className="font-mono text-[10px] text-muted border border-border px-3 py-2 rounded hover:border-red/40 hover:text-red transition-all tracking-widest"
      >
        CLEAR LOG
      </button>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded px-3 py-2 shadow-xl">
      <p className="font-mono text-[10px] text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-mono text-xs" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]               = useState<Stats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([getStats(), getTransactions()])
      setStats(s)
      setTransactions(t.transactions)
      setError('')
    } catch {
      setError('Cannot connect to API. Make sure the backend is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 10000)
    return () => clearInterval(id)
  }, [fetchData])

  const handleClear = async () => {
    await clearTransactions()
    fetchData()
  }

  // Build timeline data from transactions (group by hour)
  const timelineData = (() => {
    const buckets: Record<string, { hour: string; fraud: number; legitimate: number }> = {}
    transactions.slice().reverse().forEach(t => {
      const hour = new Date(t.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
      if (!buckets[hour]) buckets[hour] = { hour, fraud: 0, legitimate: 0 }
      if (t.is_fraud) buckets[hour].fraud++
      else buckets[hour].legitimate++
    })
    return Object.values(buckets).slice(-12)
  })()

  const categoryData = (() => {
    const counts: Record<string, number> = {}
    transactions.filter(t => t.is_fraud).forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  })()

  const pieData = stats ? [
    { name: 'Legitimate', value: stats.legitimate_count },
    { name: 'Fraud',      value: stats.fraud_count },
  ] : []

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="font-mono text-blue text-sm tracking-widest blink mb-2">INITIALIZING...</div>
        <div className="font-mono text-muted text-[10px] tracking-widest">CONNECTING TO FRAUD ENGINE</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="border border-red/30 bg-red/5 rounded-lg p-6 glow-red max-w-lg">
        <p className="font-mono text-[10px] text-red tracking-widest mb-2">⚠ CONNECTION ERROR</p>
        <p className="font-sans text-text text-sm">{error}</p>
        <p className="font-mono text-muted text-[10px] mt-3">RUN: uvicorn main:app --reload --port 8000</p>
      </div>
    </div>
  )

  return (
    <div className="p-8 animate-fade-in">
      <PageHeader onClear={handleClear} />

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Transactions" value={stats?.total ?? 0}         icon="◈" accent="blue"   sub="ALL TIME" />
        <StatCard label="Fraud Detected"     value={stats?.fraud_count ?? 0}   icon="⚠" accent="red"    sub="FLAGGED CASES" />
        <StatCard label="Legitimate"         value={stats?.legitimate_count ?? 0} icon="✓" accent="green" sub="CLEARED" />
        <StatCard label="Fraud Rate"         value={`${stats?.fraud_rate ?? 0}%`} icon="%" accent="yellow" sub="OF TOTAL" mono />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-8">

        {/* Timeline chart */}
        <div className="col-span-2 bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-mono text-[10px] text-muted tracking-widest">TRANSACTION TIMELINE</p>
              <p className="font-sans text-text font-semibold mt-0.5">Fraud vs Legitimate</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-green"><span className="w-2 h-0.5 bg-green inline-block" /> LEGIT</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-red"><span className="w-2 h-0.5 bg-red inline-block" /> FRAUD</span>
            </div>
          </div>
          {timelineData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-[10px] text-muted tracking-widest">NO DATA — SUBMIT TRANSACTIONS TO BEGIN</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="gLegit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3FB950" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3FB950" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F85149" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F85149" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fill: '#8B949E', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8B949E', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="legitimate" stroke="#3FB950" strokeWidth={1.5} fill="url(#gLegit)" name="Legitimate" />
                <Area type="monotone" dataKey="fraud"      stroke="#F85149" strokeWidth={1.5} fill="url(#gFraud)" name="Fraud" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <p className="font-mono text-[10px] text-muted tracking-widest mb-1">DISTRIBUTION</p>
          <p className="font-sans text-text font-semibold mb-5">Transaction Split</p>
          {stats?.total === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-[10px] text-muted text-center tracking-widest">NO DATA</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    <Cell fill="#3FB950" />
                    <Cell fill="#F85149" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono text-[10px] text-muted">
                      <span className="w-2 h-2 rounded-full" style={{ background: i === 0 ? '#3FB950' : '#F85149' }} />
                      {d.name.toUpperCase()}
                    </span>
                    <span className="font-mono text-[10px] text-text">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Risk breakdown */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <p className="font-mono text-[10px] text-muted tracking-widest mb-1">RISK LEVELS</p>
          <p className="font-sans text-text font-semibold mb-5">Breakdown</p>
          {stats && (
            <div className="space-y-3">
              {Object.entries(stats.risk_breakdown).map(([level, count]) => {
                const total = stats.total || 1
                const pct = Math.round((count / total) * 100)
                const color = COLORS[level as keyof typeof COLORS]
                return (
                  <div key={level}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-muted tracking-wider">{level.toUpperCase()}</span>
                      <span className="font-mono text-[10px] text-text">{count}</span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Category bar chart */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <p className="font-mono text-[10px] text-muted tracking-widest mb-1">FRAUD BY CATEGORY</p>
          <p className="font-sans text-text font-semibold mb-4">Top Categories</p>
          {categoryData.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <p className="font-mono text-[10px] text-muted tracking-widest">NO FRAUD DATA</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#8B949E', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#8B949E', fontSize: 8, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#F85149" radius={[0, 2, 2, 0]} name="Fraud Cases" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent fraud */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <p className="font-mono text-[10px] text-muted tracking-widest mb-1">RECENT ALERTS</p>
          <p className="font-sans text-text font-semibold mb-4">Latest Fraud Cases</p>
          {!stats?.recent_fraud?.length ? (
            <div className="h-32 flex items-center justify-center">
              <p className="font-mono text-[10px] text-green tracking-widest">✓ NO FRAUD DETECTED</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent_fraud.map(t => (
                <div key={t.id} className="border border-red/20 bg-red/5 rounded p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <RiskBadge level={t.risk_level} />
                    <span className="font-mono text-[9px] text-muted">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="font-mono text-[10px] text-muted">{t.category}</span>
                    <span className="font-mono text-[10px] text-red font-bold">${t.amt.toFixed(2)}</span>
                  </div>
                  <div className="mt-1">
                    <span className="font-mono text-[9px] text-muted">
                      CONF: {(t.confidence * 100).toFixed(1)}% · DIST: {t.distance_to_merchant}km
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
