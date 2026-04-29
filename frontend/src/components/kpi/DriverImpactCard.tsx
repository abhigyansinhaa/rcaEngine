import { useMemo, useState } from 'react'
import type { AnalysisKpis } from '../../types'
import { Card, CardTitle } from '../ui'
import { formatPct01, formatNumber } from './format'

type Row = AnalysisKpis['driver_impact']['per_driver'][0] & {
  importance_share?: number | null
}

export function DriverImpactCard({ kpis }: { kpis: AnalysisKpis }) {
  const rows: Row[] = useMemo(() => {
    const byFeat = Object.fromEntries((kpis.drivers ?? []).map((d) => [d.feature, d.share]))
    return (kpis.driver_impact.per_driver ?? []).map((p) => ({
      ...p,
      importance_share: byFeat[p.feature] ?? null,
    }))
  }, [kpis])

  const [sortBy, setSortBy] = useState<'revenue' | 'delta'>('revenue')

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      if (sortBy === 'revenue') {
        return (b.revenue_recoverable ?? 0) - (a.revenue_recoverable ?? 0)
      }
      return Math.abs(b.delta_target_rate) - Math.abs(a.delta_target_rate)
    })
    return copy
  }, [rows, sortBy])

  if (!sorted.length) {
    return null
  }

  return (
    <Card padding="lg" tone="strong">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Driver impact scenario</CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Order by projected lift or revenue signal. Rollups show combined effect of neutralizing top drivers.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSortBy('revenue')}
            className={`rounded-full px-3 py-1 font-semibold ${
              sortBy === 'revenue'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white/70 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
            }`}
          >
            Sort · revenue
          </button>
          <button
            type="button"
            onClick={() => setSortBy('delta')}
            className={`rounded-full px-3 py-1 font-semibold ${
              sortBy === 'delta'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white/70 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
            }`}
          >
            Sort · Δ rate
          </button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800">
              <th className="py-2 pr-4 font-semibold">Driver</th>
              <th className="py-2 pr-4 font-semibold">Driver share</th>
              <th className="py-2 pr-4 font-semibold">Δ target (scenario)</th>
              <th className="py-2 pr-4 font-semibold">Rows crossing band</th>
              <th className="py-2 font-semibold">Revenue shift</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.feature} className="border-b border-slate-100/80 dark:border-slate-800/80">
                <td className="py-3 pr-4 font-mono text-xs text-slate-900 dark:text-slate-50">{r.feature}</td>
                <td className="py-3 pr-4">{r.importance_share != null ? formatPct01(r.importance_share, 2) : '–'}</td>
                <td className="py-3 pr-4">{formatPct01(Math.abs(r.delta_target_rate))}</td>
                <td className="py-3 pr-4 tabular-nums">{formatNumber(r.users_savable, 0)}</td>
                <td className="py-3">
                  {r.revenue_recoverable != null && Number.isFinite(r.revenue_recoverable)
                    ? `$${Math.abs(r.revenue_recoverable).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[11px] text-slate-500">
        Scenario mode:{' '}
        <span className="font-semibold">{kpis.driver_impact.approximation.replace('_', ' ')}</span>.
      </p>
    </Card>
  )
}
