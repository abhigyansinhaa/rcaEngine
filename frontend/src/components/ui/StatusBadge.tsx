import type { ReactNode } from 'react'

type Tone = 'default' | 'info' | 'success' | 'warning' | 'risk'

type Props = {
  children: ReactNode
  tone?: Tone
  className?: string
}

const tones: Record<Tone, string> = {
  default: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  info: 'bg-brand-100 text-brand-800 ring-brand-200 dark:bg-brand-950/70 dark:text-brand-200 dark:ring-brand-900',
  success:
    'bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:ring-emerald-900',
  warning:
    'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-100 dark:ring-amber-900',
  risk: 'bg-red-100 text-red-900 ring-red-200 dark:bg-red-950/70 dark:text-red-200 dark:ring-red-900',
}

export function StatusBadge({ children, tone = 'default', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ring-1 ${tones[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  )
}
