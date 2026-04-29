import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalysisKpis } from '../../types'
import { Card, CardTitle, StatusBadge } from '../ui'
import { formatPct01 } from './format'

export function RiskSegmentsChart({ kpis, hasValue }: { kpis: AnalysisKpis; hasValue: boolean }) {
  const chart = kpis.risk_segments.map((s) => ({
    bucket: s.bucket.toUpperCase(),
    users_share: s.share,
    value_share: hasValue ? (s.value_share ?? 0) : 0,
    count: s.count,
    easiest: s.easiest_to_fix ?? false,
  }))

  return (
    <Card padding="lg" tone="strong">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Risk segments</CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Compare where users sit versus where modeled monetary exposure concentrates.
          </p>
        </div>
        <StatusBadge tone={hasValue ? 'warning' : 'default'}>{hasValue ? 'Value linked' : 'Users only'}</StatusBadge>
      </div>
      <div className="mt-6 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" className="opacity-50" />
            <Legend />
            <XAxis dataKey="bucket" />
            <YAxis domain={[0, 1]} tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} />
            <Tooltip
              formatter={(value, key) =>
                `${(Number(value) * 100).toFixed(1)}% ${String(key ?? '') === 'users_share' ? 'of rows' : 'of value'}`
              }
            />
            <Bar dataKey="users_share" name="Users" fill="var(--chart-neutral)" radius={[6, 6, 0, 0]} />
            {hasValue ? <Bar dataKey="value_share" name="Value" fill="var(--chart-warning)" radius={[6, 6, 0, 0]} /> : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {kpis.risk_segments.map((segment) => (
          <SegmentTile key={segment.bucket} segment={segment} hasValue={hasValue} />
        ))}
      </div>
    </Card>
  )
}

function SegmentTile({
  segment,
  hasValue,
}: {
  segment: AnalysisKpis['risk_segments'][0]
  hasValue: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 dark:border-slate-800 dark:bg-slate-950/35">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={segment.bucket === 'high' ? 'risk' : segment.bucket === 'medium' ? 'warning' : 'success'}>
          {segment.bucket}
        </StatusBadge>
        {segment.easiest_to_fix ? (
          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200">
            Highest tractability score
          </span>
        ) : null}
      </div>
      <dl className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex justify-between gap-2">
          <dt>Rows</dt>
          <dd className="font-semibold text-slate-900 dark:text-white">{segment.count.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Population share</dt>
          <dd className="font-semibold text-slate-900 dark:text-white">{formatPct01(segment.share)}</dd>
        </div>
        {hasValue ? (
          <div className="flex justify-between gap-2">
            <dt>Value share</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">{formatPct01(segment.value_share ?? 0)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          <dt>Avg model score</dt>
          <dd className="font-semibold text-slate-900 dark:text-white">{segment.avg_proba?.toFixed(3) ?? '–'}</dd>
        </div>
      </dl>
      {segment.easiest_to_fix ? (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Balances sizable population and strong driver sensitivity—prioritize experiments touching this wedge first.
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-slate-500">
          Drill into SHAP narratives for hypotheses on how to intervene.
        </p>
      )}
    </div>
  )
}
