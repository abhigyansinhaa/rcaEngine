import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: string
}

export function PageHeader({ title, description, actions, eyebrow }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700 dark:text-brand-300">
            {eyebrow}
          </p>
        )}
        <h1 className={`text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white ${eyebrow ? 'mt-2' : ''}`}>
          {title}
        </h1>
        {description != null && description !== '' && (
          <div className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
