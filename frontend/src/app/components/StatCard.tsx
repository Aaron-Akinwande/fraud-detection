import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'red' | 'green' | 'blue' | 'yellow'
  icon?: string
  mono?: boolean
}

const accentMap = {
  red:    { border: 'border-red/30',    text: 'text-red',    glow: 'glow-red',    bg: 'bg-red/5' },
  green:  { border: 'border-green/30',  text: 'text-green',  glow: 'glow-green',  bg: 'bg-green/5' },
  blue:   { border: 'border-blue/30',   text: 'text-blue',   glow: 'glow-blue',   bg: 'bg-blue/5' },
  yellow: { border: 'border-yellow/30', text: 'text-yellow', glow: 'glow-yellow', bg: 'bg-yellow/5' },
}

export default function StatCard({ label, value, sub, accent = 'blue', icon, mono }: StatCardProps) {
  const a = accentMap[accent]
  return (
    <div className={clsx(
      'relative rounded-lg border p-5 bg-surface transition-all duration-300 hover:border-opacity-60',
      a.border, a.glow
    )}>
      {/* Corner accent */}
      <div className={clsx('absolute top-0 left-0 w-8 h-0.5 rounded-tl-lg', {
        'bg-red': accent === 'red',
        'bg-green': accent === 'green',
        'bg-blue': accent === 'blue',
        'bg-yellow': accent === 'yellow',
      })} />

      <div className="flex items-start justify-between mb-3">
        <p className="font-mono text-[10px] text-muted tracking-widest uppercase">{label}</p>
        {icon && <span className={clsx('text-lg', a.text)}>{icon}</span>}
      </div>

      <p className={clsx(
        'text-3xl font-sans font-bold tracking-tight',
        mono ? 'font-mono' : '',
        a.text
      )}>
        {value}
      </p>

      {sub && (
        <p className="mt-1.5 font-mono text-[10px] text-muted tracking-wider">{sub}</p>
      )}
    </div>
  )
}
