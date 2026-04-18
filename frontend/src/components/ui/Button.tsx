import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 dark:shadow-none dark:hover:bg-brand-600',
  secondary:
    'border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  danger:
    'border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/50',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
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
    'inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none'
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
