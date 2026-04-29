import type { AnalysisKpis } from '../../types'
import { Card, CardTitle, StatusBadge } from '../ui'
import { formatNumber } from './format'

export function ReliabilityBadge({ kpis }: { kpis: AnalysisKpis }) {
  const r = kpis.reliability
  const tone = r.tier === 'high' ? 'success' : r.tier === 'medium' ? 'warning' : 'risk'

  return (
    <Card padding="lg" tone={tone}>
      <div className="flex flex-wrap items-center gap-5">
        <div>
          <CardTitle className="text-lg">Model reliability</CardTitle>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Confidence tier</p>
          <div className="mt-4">
            <StatusBadge tone={tone}>{r.tier}</StatusBadge>
          </div>
        </div>
        <div className="flex-1 text-sm leading-6 text-slate-800 dark:text-slate-50">
          <p>
            Headline score <strong>{formatNumber(r.headline_value)}</strong> ({r.headline_metric})
            {r.cv_std !== undefined && r.cv_std !== null ? (
              <>
                {' '}
                · CV std <strong>{formatNumber(r.cv_std)}</strong>
              </>
            ) : null}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-200">{r.hint}</p>
        </div>
      </div>
    </Card>
  )
}
