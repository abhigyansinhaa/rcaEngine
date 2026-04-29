import type { ReactNode } from 'react'
import { Card, CardDescription } from '../ui'

type Props = {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'amber' | 'emerald' | 'brand' | 'risk'
}

const toneRing: Record<NonNullable<Props['tone']>, string> = {
  default: 'from-slate-500/10 to-slate-500/0 ring-slate-200/90 dark:ring-slate-800/80',
  amber: 'from-amber-500/18 to-amber-500/0 ring-amber-300/80 dark:ring-amber-900/60',
  emerald: 'from-emerald-500/18 to-emerald-500/0 ring-emerald-300/80 dark:ring-emerald-900/60',
  brand: 'from-brand-500/18 to-brand-500/0 ring-brand-300/80 dark:ring-brand-900/60',
  risk: 'from-red-500/18 to-red-500/0 ring-red-300/80 dark:ring-red-900/60',
}

export function KpiCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <Card padding="md" elevated className={`bg-gradient-to-br ring-1 ${toneRing[tone]}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-black tracking-tight tabular-nums text-slate-950 dark:text-white">{value}</p>
      {hint && (
        <CardDescription className="mt-2 text-xs">{hint}</CardDescription>
      )}
    </Card>
  )
}
