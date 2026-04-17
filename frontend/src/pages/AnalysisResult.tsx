import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
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
import type { Analysis } from '../types'

export function AnalysisResult() {
  const { id } = useParams<{ id: string }>()
  const analysisId = Number(id)

  const [poll, setPoll] = useState(true)

  const { data, error, refetch } = useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: async () => {
      const { data } = await api.get<Analysis>(`/analyses/${analysisId}`)
      return data
    },
    enabled: Number.isFinite(analysisId),
    refetchInterval: poll ? 2000 : false,
  })

  useEffect(() => {
    if (data?.status === 'completed' || data?.status === 'failed') {
      setPoll(false)
    }
  }, [data?.status])

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
    return <p className="text-red-600">Invalid analysis id.</p>
  }

  if (error) {
    return <p className="text-red-600">Could not load analysis.</p>
  }

  if (!data) {
    return <p className="text-slate-500">Loading…</p>
  }

  const running = data.status === 'queued' || data.status === 'running'

  return (
    <div>
      <Link className="text-sm text-emerald-700 hover:underline dark:text-emerald-400" to={`/datasets/${data.dataset_id}`}>
        ← Dataset
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analysis #{data.id}</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Target: <code className="font-mono">{data.target}</code>
            {data.task_type && (
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-800">
                {data.task_type}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {running && (
            <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {data.status}…
            </span>
          )}
          <button
            type="button"
            onClick={downloadJson}
            disabled={data.status !== 'completed'}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Download report (JSON)
          </button>
        </div>
      </div>

      {data.error && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {data.error}
        </div>
      )}

      {data.status === 'failed' && (
        <p className="mt-6 text-red-600">
          Analysis failed.{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry check
          </button>
        </p>
      )}

      {data.status === 'completed' && data.metrics && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Metrics</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data.metrics).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
                <dd className="text-xl font-semibold">
                  {typeof v === 'number' && (k.includes('auc') || k.includes('accuracy') || k.includes('r2'))
                    ? `${(v * (k.includes('r2') && v <= 1 ? 100 : 1)).toFixed(k.includes('r2') ? 1 : 3)}${k.includes('r2') ? '%' : k.includes('accuracy') || k.includes('auc') ? '' : ''}`
                    : typeof v === 'number'
                      ? v.toFixed(4)
                      : String(v)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            Accuracy/F1/AUC shown as decimals; R² as percentage of variance explained.
          </p>
        </section>
      )}

      {data.status === 'completed' && chartData.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Feature importance (mean |SHAP|)</h2>
          <div className="mt-4 h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [value.toFixed(4), '|SHAP|']}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.full ? String(payload[0].payload.full) : ''
                  }
                />
                <Bar dataKey="importance" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {data.status === 'completed' && data.shap_summary_image_url && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">SHAP summary plot</h2>
          <img
            src={data.shap_summary_image_url}
            alt="SHAP summary"
            className="mt-4 max-w-full rounded-xl border border-slate-200 dark:border-slate-800"
          />
        </section>
      )}

      {data.status === 'completed' && data.insights && data.insights.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Root-cause insights</h2>
          <ul className="mt-4 list-decimal space-y-3 pl-5">
            {data.insights.map((ins, i) => (
              <li key={i} className="text-slate-700 dark:text-slate-300">
                <span className="font-mono text-sm text-emerald-800 dark:text-emerald-400">{ins.feature}</span>
                <p className="mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: ins.summary.replace(/`([^`]+)`/g, '<code>$1</code>') }} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.status === 'completed' && data.recommendations && data.recommendations.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recommendations</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            {data.recommendations.map((r, i) => (
              <li key={i} className="text-slate-700 dark:text-slate-300">
                {r}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
