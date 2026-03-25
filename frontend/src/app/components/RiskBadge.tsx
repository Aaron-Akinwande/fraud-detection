import clsx from 'clsx'

interface RiskBadgeProps {
  level: 'Low' | 'Medium' | 'High' | 'Critical'
  size?: 'sm' | 'md'
}

const map = {
  Low:      { cls: 'bg-green/10 text-green border-green/30',   dot: 'bg-green',  label: 'LOW' },
  Medium:   { cls: 'bg-yellow/10 text-yellow border-yellow/30', dot: 'bg-yellow', label: 'MEDIUM' },
  High:     { cls: 'bg-red/10 text-red border-red/30',         dot: 'bg-red',    label: 'HIGH' },
  Critical: { cls: 'bg-red/20 text-red border-red/50',         dot: 'bg-red',    label: 'CRITICAL' },
}

export default function RiskBadge({ level, size = 'sm' }: RiskBadgeProps) {
  const m = map[level]
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded border font-mono tracking-widest',
      m.cls,
      size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px]'
    )}>
      <span className={clsx('rounded-full flex-shrink-0', m.dot,
        level === 'Critical' ? 'blink' : '',
        size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'
      )} />
      {m.label}
    </span>
  )
}
