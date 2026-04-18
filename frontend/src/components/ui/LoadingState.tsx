import { Card } from './Card'

type Props = {
  message?: string
  rows?: number
}

export function LoadingState({ message = 'Loading…', rows = 3 }: Props) {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label={message}>
      <p className="sr-only">{message}</p>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} padding="md" className="animate-pulse">
          <div className="h-4 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
        </Card>
      ))}
    </div>
  )
}

export function Spinner({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-slate-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400 ${className}`}
      role="presentation"
    />
  )
}
