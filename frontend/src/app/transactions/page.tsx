'use client'
import { useEffect, useState, useCallback } from 'react'
import { getTransactions, clearTransactions, Transaction } from '../lib/api'
import RiskBadge from '../components/RiskBadge'
import clsx from 'clsx'

type Filter = 'all' | 'fraud' | 'legitimate'
type Sort   = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState<Filter>('all')
  const [sort,         setSort]         = useState<Sort>('newest')
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState<Transaction | null>(null)
  const [error,        setError]        = useState('')

  const fetchData = useCallback(async () => {
    try {
      const data = await getTransactions()
      setTransactions(data.transactions)
      setError('')
    } catch {
      setError('Cannot connect to API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 10000); return () => clearInterval(id) }, [fetchData])

  const handleClear = async () => { await clearTransactions(); setSelected(null); fetchData() }

  const filtered = transactions
    .filter(t => {
      if (filter === 'fraud')      return t.is_fraud
      if (filter === 'legitimate') return !t.is_fraud
      return true
    })
    .filter(t =>
      search === '' ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.id.includes(search) ||
      t.amt.toString().includes(search)
    )
    .sort((a, b) => {
      if (sort === 'newest')      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      if (sort === 'oldest')      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      if (sort === 'amount_desc') return b.amt - a.amt
      if (sort === 'amount_asc')  return a.amt - b.amt
      return 0
    })

  const filterBtn = (f: Filter, label: string, count: number) => (
    <button onClick={() => setFilter(f)} className={clsx(
      'flex items-center gap-2 px-4 py-2 rounded font-mono text-[10px] tracking-widest border transition-all',
      filter === f
        ? 'bg-blue/10 text-blue border-blue/30'
        : 'text-muted border-border hover:border-blue/20 hover:text-text'
    )}>
      {label}
      <span className={clsx(
        'text-[9px] rounded px-1.5 py-0.5',
        filter === f ? 'bg-blue/20 text-blue' : 'bg-border text-muted'
      )}>{count}</span>
    </button>
  )

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-[10px] text-muted tracking-widest">DASHBOARD /</span>
            <span className="font-mono text-[10px] text-blue tracking-widest">TRANSACTION LOG</span>
          </div>
          <h1 className="font-sans font-bold text-2xl text-text tracking-tight">Transaction Log</h1>
          <p className="font-mono text-[11px] text-muted mt-1">{transactions.length} TOTAL RECORDS</p>
        </div>
        <button onClick={handleClear}
          className="font-mono text-[10px] text-muted border border-border px-3 py-2 rounded hover:border-red/40 hover:text-red transition-all tracking-widest">
          CLEAR ALL
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        {filterBtn('all',         'ALL',        transactions.length)}
        {filterBtn('fraud',       'FRAUD',       transactions.filter(t => t.is_fraud).length)}
        {filterBtn('legitimate',  'LEGITIMATE',  transactions.filter(t => !t.is_fraud).length)}

        <div className="ml-auto flex items-center gap-3">
          <input
            type="text" placeholder="SEARCH ID / CATEGORY / AMOUNT..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="bg-bg border border-border rounded px-3 py-2 font-mono text-[10px] text-text placeholder-muted/40 focus:outline-none focus:border-blue/40 w-64 tracking-wider"
          />
          <select value={sort} onChange={e => setSort(e.target.value as Sort)}
            className="bg-bg border border-border rounded px-3 py-2 font-mono text-[10px] text-muted focus:outline-none focus:border-blue/40 tracking-wider appearance-none cursor-pointer">
            <option value="newest">NEWEST FIRST</option>
            <option value="oldest">OLDEST FIRST</option>
            <option value="amount_desc">AMOUNT ↓</option>
            <option value="amount_asc">AMOUNT ↑</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="border border-red/30 bg-red/5 rounded p-4 mb-5">
          <p className="font-mono text-[10px] text-red tracking-widest">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        {/* Table */}
        <div className={clsx('flex-1 bg-surface border border-border rounded-lg overflow-hidden', selected ? 'w-3/5' : 'w-full')}>
          {/* Table header */}
          <div className="grid grid-cols-7 gap-3 px-4 py-3 border-b border-border bg-bg/50">
            {['TIMESTAMP','AMOUNT','CATEGORY','RISK','VERDICT','CONFIDENCE','DIST (KM)'].map(h => (
              <p key={h} className="font-mono text-[9px] text-muted tracking-widest">{h}</p>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border max-h-[calc(100vh-320px)] overflow-y-auto">
            {loading ? (
              <div className="py-20 text-center">
                <p className="font-mono text-[10px] text-muted tracking-widest blink">LOADING...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-mono text-[10px] text-muted tracking-widest">NO TRANSACTIONS FOUND</p>
              </div>
            ) : filtered.map(t => (
              <div
                key={t.id}
                onClick={() => setSelected(s => s?.id === t.id ? null : t)}
                className={clsx(
                  'grid grid-cols-7 gap-3 px-4 py-3 cursor-pointer transition-all duration-150 group',
                  selected?.id === t.id
                    ? 'bg-blue/10 border-l-2 border-blue'
                    : t.is_fraud
                    ? 'hover:bg-red/5 border-l-2 border-red/30'
                    : 'hover:bg-green/5 border-l-2 border-transparent hover:border-green/30'
                )}
              >
                <p className="font-mono text-[10px] text-muted">
                  {new Date(t.timestamp).toLocaleTimeString()}
                </p>
                <p className={clsx('font-mono text-[10px] font-bold', t.is_fraud ? 'text-red' : 'text-text')}>
                  ${t.amt.toFixed(2)}
                </p>
                <p className="font-mono text-[10px] text-muted truncate">{t.category}</p>
                <div><RiskBadge level={t.risk_level} /></div>
                <div className="flex items-center gap-1.5">
                  <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', t.is_fraud ? 'bg-red' : 'bg-green')} />
                  <p className={clsx('font-mono text-[10px]', t.is_fraud ? 'text-red' : 'text-green')}>
                    {t.is_fraud ? 'FRAUD' : 'LEGIT'}
                  </p>
                </div>
                <p className="font-mono text-[10px] text-muted">{(t.confidence * 100).toFixed(1)}%</p>
                <p className="font-mono text-[10px] text-muted">{t.distance_to_merchant}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 flex-shrink-0 bg-surface border border-border rounded-lg p-5 animate-slide-up self-start">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] text-muted tracking-widest">TRANSACTION DETAIL</p>
              <button onClick={() => setSelected(null)} className="font-mono text-[10px] text-muted hover:text-text">✕</button>
            </div>

            <div className={clsx(
              'text-center py-4 mb-4 rounded border',
              selected.is_fraud ? 'border-red/20 bg-red/5' : 'border-green/20 bg-green/5'
            )}>
              <div className={clsx('text-3xl mb-2', selected.is_fraud ? 'text-red' : 'text-green')}>
                {selected.is_fraud ? '⚠' : '✓'}
              </div>
              <p className={clsx('font-sans font-bold', selected.is_fraud ? 'text-red' : 'text-green')}>
                {selected.is_fraud ? 'FRAUD' : 'LEGITIMATE'}
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: 'AMOUNT',    value: `$${selected.amt.toFixed(2)}` },
                { label: 'CATEGORY',  value: selected.category },
                { label: 'GENDER',    value: selected.gender },
                { label: 'CITY POP',  value: selected.city_pop.toLocaleString() },
                { label: 'DIST (KM)', value: `${selected.distance_to_merchant} km` },
                { label: 'HOUR',      value: `${selected.hour_of_day}:00` },
                { label: 'CONFIDENCE',value: `${(selected.confidence * 100).toFixed(2)}%` },
                { label: 'TIMESTAMP', value: new Date(selected.timestamp).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-border pb-2">
                  <span className="font-mono text-[9px] text-muted tracking-widest">{label}</span>
                  <span className="font-mono text-[10px] text-text">{value}</span>
                </div>
              ))}
              <div>
                <p className="font-mono text-[9px] text-muted tracking-widest mb-1">RISK LEVEL</p>
                <RiskBadge level={selected.risk_level} size="md" />
              </div>
              <div className="pt-2">
                <p className="font-mono text-[9px] text-muted/40 break-all tracking-wider">ID: {selected.id}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
