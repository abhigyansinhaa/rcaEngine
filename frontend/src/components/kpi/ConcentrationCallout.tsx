import {
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalysisKpis } from '../../types'
import { Card, StatusBadge } from '../ui'
import { formatPct01 } from './format'

export function ConcentrationCallout({ kpis }: { kpis: AnalysisKpis }) {
  const h = kpis.concentration.headline
  const pts = kpis.concentration.lorenz_points ?? []

  return (
    <Card padding="lg" tone="strong" className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-xl space-y-2">
        <StatusBadge tone="info">Pareto risk</StatusBadge>
        <p className="text-xl font-semibold text-slate-900 dark:text-white">
          Top{' '}
          <span className="tabular-nums text-brand-700 dark:text-brand-400">
            {(h.top_pct_users * 100).toFixed(0)}%
          </span>{' '}
          of users hold{' '}
          <span className="tabular-nums text-brand-700 dark:text-brand-400">{formatPct01(h.share_of_risk)}</span>{' '}
          of expected loss risk
        </p>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Gini (inequality){' '}
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {(kpis.concentration.gini).toFixed(2)}
          </span>{' '}
          — closer to <span className="font-medium">1</span> means a small tail carries most modeled risk exposure.
        </p>
      </div>
      <div className="h-44 w-full min-w-[220px] max-w-md">
        {pts.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pts} margin={{ left: -8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" className="opacity-50" />
              <XAxis
                dataKey="x"
                tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                tick={{ fontSize: 10 }}
                className="text-slate-500"
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                tick={{ fontSize: 10 }}
                className="text-slate-500"
              />
              <Tooltip formatter={(value) => [formatPct01(Number(value)), 'Share of risk']} />
              <Area type="monotone" dataKey="y" stroke="var(--chart-primary)" fill="var(--chart-primary)" fillOpacity={0.16} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-500">Not enough variance to plot.</p>
        )}
      </div>
    </Card>
  )
}
