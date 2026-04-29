import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  elevated?: boolean
  tone?: 'default' | 'strong' | 'risk' | 'warning' | 'success' | 'info'
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

export function Card({
  children,
  className = '',
  padding = 'md',
  elevated = false,
  tone = 'default',
  ...rest
}: Props) {
  const shadow = elevated ? 'shadow-[var(--shadow-elevated)]' : 'shadow-[var(--shadow-soft)]'
  const tones = {
    default:
      'border-white/70 bg-[var(--surface-card)] dark:border-slate-800/80',
    strong:
      'border-white/80 bg-[var(--surface-card-strong)] dark:border-slate-700/80',
    risk:
      'border-red-200/80 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/25',
    warning:
      'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/25',
    success:
      'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/25',
    info:
      'border-brand-200/80 bg-brand-50/80 dark:border-brand-900/50 dark:bg-brand-950/25',
  }
  return (
    <div
      className={`rounded-3xl border backdrop-blur-xl ${tones[tone]} ${shadow} ${paddingMap[padding]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-sm font-bold tracking-tight text-slate-950 dark:text-slate-50 ${className}`.trim()}>{children}</h3>
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400 ${className}`.trim()}>{children}</p>
  )
}
