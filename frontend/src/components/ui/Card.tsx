import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  elevated?: boolean
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
  ...rest
}: Props) {
  const shadow = elevated ? 'shadow-[var(--shadow-elevated)]' : 'shadow-[var(--shadow-soft)]'
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-sm dark:border-slate-800/90 dark:bg-slate-900/90 ${shadow} ${paddingMap[padding]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-sm font-semibold text-slate-900 dark:text-slate-100 ${className}`.trim()}>{children}</h3>
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`mt-1 text-sm text-slate-600 dark:text-slate-400 ${className}`.trim()}>{children}</p>
  )
}
