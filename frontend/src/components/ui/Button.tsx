import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary:
    'bg-brand-500 text-white shadow-lg shadow-brand-700/20 hover:bg-brand-400 dark:shadow-brand-950/30 dark:hover:bg-brand-400',
  secondary:
    'border border-white/70 bg-white/80 text-slate-800 shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800',
  danger:
    'border border-red-200 bg-red-50/80 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60',
  ghost: 'text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/80',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm font-medium rounded-xl',
  lg: 'px-5 py-3 text-base font-medium rounded-xl',
} as const

type Variant = keyof typeof variants
type Size = keyof typeof sizes

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
  /** When set, renders a React Router link styled as a button */
  to?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  type = 'button',
  to,
  children,
  ...rest
}: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60'
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()

  if (to) {
    return (
      <Link to={to} className={cls} aria-disabled={disabled ?? undefined}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} disabled={disabled} className={cls} {...rest}>
      {children}
    </button>
  )
}
