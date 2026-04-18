import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api/client'
import { Button, Card, ErrorState, LoadingState, PageHeader } from '../components/ui'
import type { Analysis } from '../types'

export function AnalysisResult() {
  const { id } = useParams<{ id: string }>()
  const analysisId = Number(id)

  const { data, error, refetch, isLoading } = useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: async () => {
      const { data } = await api.get<Analysis>(`/analyses/${analysisId}`)
      return data
    },
    enabled: Number.isFinite(analysisId),
    refetchInterval: (q) => {
      const s = q.state.data?.status
      if (s === 'completed' || s === 'failed') return false
      return 2000
    },
  })

  const chartData = useMemo(() => {
    const fi = data?.feature_importance
    if (!fi?.length) return []
    return [...fi]
      .sort((a, b) => b.mean_abs_shap - a.mean_abs_shap)
      .slice(0, 15)
      .map((r) => ({
        name: r.feature.length > 28 ? `${r.feature.slice(0, 26)}…` : r.feature,
        full: r.feature,
        importance: r.mean_abs_shap,
      }))
  }, [data?.feature_importance])

  const downloadJson = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis-${data.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!Number.isFinite(analysisId)) {
    return (
      <Card padding="lg" className="border-red-200 dark:border-red-900/50">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">Invalid analysis id.</p>
      </Card>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load analysis"
        message="The report may not exist or the server returned an error."
        onRetry={() => void refetch()}
      />
    )
  }

  if (isLoading || !data) {
    return <LoadingState rows={2} message="Loading analysis…" />
  }

  const running = data.status === 'queued' || data.status === 'running'

  return (
    <div className="space-y-8">
      <div>
        <Link
          className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          to={`/datasets/${data.dataset_id}`}
        >
          ← Dataset
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title={`Analysis #${data.id}`}
            description={
              <>
                Target: <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-sm dark:bg-slate-800">{data.target}</code>
                {data.task_type && (
                  <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {data.task_type}
                  </span>
                )}
              </>
            }
          />
          <div className="flex flex-wrap gap-2">
            {running && (
              <span className="inline-flex items-center rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                {data.status}…
              </span>
            )}
            <Button variant="secondary" size="sm" type="button" onClick={downloadJson} disabled={data.status !== 'completed'}>
              Download JSON
            </Button>
          </div>
        </div>
      </div>

      {data.error && (
        <Card padding="md" className="border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="text-sm text-amber-950 dark:text-amber-100">{data.error}</p>
        </Card>
      )}

      {data.status === 'failed' && (
        <ErrorState
          title="We couldn’t finish this analysis"
          message={
            data.error ||
            data.report?.user_message ||
            'Something went wrong on our side. Please try again in a moment or pick a different target column.'
          }
          onRetry={() => void refetch()}
          retryLabel="Refresh status"
        />
      )}

      {data.status === 'completed' && data.report?.user_message && (
        <Card padding="md" className="border-brand-200 bg-brand-50/60 dark:border-brand-900/40 dark:bg-brand-950/25">
          <p className="text-sm font-medium text-brand-950 dark:text-brand-100">{data.report.user_message}</p>
          {data.report.fallbacks && data.report.fallbacks.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-brand-900/90 dark:text-brand-200/90">
              {data.report.fallbacks.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {data.status === 'completed' && data.metrics && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Metrics</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data.metrics).map(([k, v]) => (
              <Card key={k} padding="md" elevated>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</dt>
                <dd className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {typeof v === 'number' ? v.toFixed(4) : String(v)}
                </dd>
              </Card>
            ))}
          </dl>
        </section>
      )}

      {data.status === 'completed' && chartData.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Feature importance (mean |SHAP|)</h2>
          <Card padding="md" className="mt-4">
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" className="opacity-60" />
                  <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 11 }} className="text-slate-500" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-600" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgb(226 232 240)',
                      boxShadow: 'var(--shadow-soft)',
                    }}
                    formatter={(value) => [
                      typeof value === 'number' ? value.toFixed(4) : String(value ?? ''),
                      '|SHAP|',
                    ]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.full ? String(payload[0].payload.full) : ''
                    }
                  />
                  <Bar dataKey="importance" fill="var(--chart-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {data.status === 'completed' && data.shap_summary_image_url && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">SHAP summary plot</h2>
          <Card padding="md" className="mt-4">
            <img
              src={data.shap_summary_image_url}
              alt="SHAP summary"
              className="max-w-full rounded-xl border border-slate-200 dark:border-slate-800"
            />
          </Card>
        </section>
      )}

      {data.status === 'completed' && data.insights && data.insights.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Root-cause insights</h2>
          <ul className="mt-4 space-y-3">
            {data.insights.map((ins, i) => (
              <li key={i}>
                <Card padding="md">
                  <span className="font-mono text-sm font-medium text-brand-800 dark:text-brand-400">{ins.feature}</span>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {ins.summary}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.status === 'completed' && data.recommendations && data.recommendations.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recommendations</h2>
          <Card padding="md" className="mt-4">
            <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-700 dark:text-slate-300">
              {data.recommendations.map((r, i) => (
                <li key={i} className="leading-relaxed">
                  {r}
                </li>
              ))}
            </ol>
          </Card>
        </section>
      )}
    </div>
  )
}
