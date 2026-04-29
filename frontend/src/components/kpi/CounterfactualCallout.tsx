import type { AnalysisKpis } from '../../types'
import { Card, StatusBadge } from '../ui'
import { formatCompactMoney, formatPct01, formatNumber } from './format'

export function CounterfactualCallout({
  kpis,
  regression,
}: {
  kpis: AnalysisKpis
  regression: boolean
}) {
  const t2 = kpis.driver_impact.top2
  const apr = kpis.driver_impact.approximation

  const subtitle =
    apr === 'shap_zeroing'
      ? 'SHAP drivers are associative. “Zero‑out” is a scenario estimate, not a guaranteed lift.'
      : 'Uses importance shares when dense SHAP was unavailable.'

  const deltaAbs = Math.abs(t2.delta_target_rate)
  const rev = t2.revenue_recoverable

  const mainLine = regression ? (
    <>
      Fixing the top <span className="font-semibold">2</span> modeled drivers shifts predicted outcome by ~
      <span className="tabular-nums">{formatPct01(deltaAbs)}</span> of scale (scenario).
    </>
  ) : (
    <>
      Fixing the top <span className="font-semibold">2</span> drivers shifts predicted positive rate by ~
      <span className="tabular-nums">{formatPct01(deltaAbs)}</span> points (scenario).
    </>
  )

  const revLine =
    rev != null && Number.isFinite(rev) && Math.abs(rev) > 1e-9 ? (
      <span>
        Revenue lift signal (approx.):{' '}
        <span className="font-semibold tabular-nums text-emerald-800 dark:text-emerald-400">
          {formatCompactMoney(rev)}
        </span>
        {' · '}users crossing high→low thresholds:{' '}
        <span className="font-semibold tabular-nums">{formatNumber(t2.users_savable, 0)}</span>.
      </span>
    ) : (
      <span>Set a numeric value column on the next analysis to quantify revenue-linked lift.</span>
    )

  return (
    <Card padding="lg" tone="info" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="info">Scenario</StatusBadge>
        <span className="text-xs font-semibold text-brand-900/80 dark:text-brand-100/80" title={subtitle}>
          Counterfactual estimate
        </span>
      </div>
      <p className="text-xl font-black leading-relaxed text-slate-950 dark:text-white">{mainLine}</p>
      <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{revLine}</p>
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
    </Card>
  )
}
