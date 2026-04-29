import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string | null
}

export function Input({ label, hint, error, id, className = '', ...rest }: Props) {
  const inputId = id ?? rest.name
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-bold text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`mt-1.5 w-full rounded-2xl border bg-white/85 px-4 py-3 text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 ${
          error
            ? 'border-red-300 dark:border-red-800'
            : 'border-white/70 dark:border-slate-700'
        } ${label ? '' : 'mt-0'} ${className}`.trim()}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
