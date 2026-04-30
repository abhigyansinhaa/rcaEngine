import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { DatasetKpiDashboard } from '../components/dataset/DatasetKpiDashboard'
import { Button, Card, LoadingState, SectionHeader, StatusBadge } from '../components/ui'
import type { Analysis, ColumnSchema, Dataset } from '../types'

/** Same fallback as the target dropdown: first column with a non-empty name, then first column. */
function fallbackColumnName(columns: ColumnSchema[]): string {
  const named = columns.find((c) => c.name?.trim())?.name
  return named ?? columns[0]?.name ?? ''
}

/** Prefer obvious label columns so churn-style CSVs default to the outcome, not `customer_id`. */
function pickDefaultTarget(columns: ColumnSchema[]): string {
  if (!columns.length) return ''
  const names = columns.map((c) => c.name)
  const preferred = ['churned', 'churn', 'target', 'label', 'outcome', 'y']
  for (const p of preferred) {
    const hit = names.find((n) => n.toLowerCase() === p)
    if (hit) return hit
  }
  const fb = fallbackColumnName(columns)
  if (fb.toLowerCase() === 'customer_id' || fb.toLowerCase().endsWith('_id')) {
    const last = names[names.length - 1]
    if (last && last !== fb) return last
  }
  return fb
}

function formatStartError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (isAxiosError(err)) {
    const d = err.response?.data as { detail?: string | { msg: string }[] } | undefined
    if (typeof d?.detail === 'string') return d.detail
    if (Array.isArray(d?.detail)) return d.detail.map((x) => x.msg).join('; ')
    if (err.response?.status === 401) return 'Not authenticated. Log in and try again.'
    if (err.response?.status === 503 || err.response?.status === 500) {
      return 'Server error while starting analysis. If you use Docker, ensure Redis and DB migrations are applied.'
    }
  }
  return 'Could not start analysis. Check the target column or try again.'
}

function inferTaskHint(col: { dtype: string; n_unique: number }) {
  if (col.dtype === 'object' || col.dtype === 'bool' || col.dtype === 'category') return 'classification'
  if (col.n_unique <= 20) return 'classification'
  return 'regression'
}

function isNumericColumn(c: ColumnSchema) {
  const dt = String(c.dtype).toLowerCase()
  return (
    dt.includes('float') || dt.includes('int') || dt.includes('uint') || dt.includes('decimal') || dt.includes('numeric')
  )
}

/** Auto-pick monetization-ish column excluding target. */
function pickDefaultValueColumn(columns: ColumnSchema[], target: string): string {
  const candidates = columns.filter((c) => isNumericColumn(c) && c.name !== target)
  if (!candidates.length) return ''

  const lower = candidates.map((c) => ({ name: c.name, lc: c.name.toLowerCase().replace(/\s+/g, '') }))
  const preferred = ['monthly_charges', 'monthlycharges', 'arpu', 'revenue', 'mrr', 'value', 'ltv', 'lifetime_value']

  for (const p of preferred) {
    const hit = lower.find((x) => x.lc.includes(p.replace(/_/g, '')) || x.lc.endsWith(p.replace(/_/g, '')))
    if (hit) return hit.name
  }

  return candidates[0]?.name ?? ''
}

function DatasetDetailInner({ datasetId }: { datasetId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [target, setTarget] = useState('')
  const [valuePick, setValuePick] = useState<string>('__auto__')

  const { data: ds, isLoading } = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: async () => {
      const { data } = await api.get<Dataset>(`/datasets/${datasetId}`)
      return data
    },
    enabled: Number.isFinite(datasetId),
  })

  const { data: preview } = useQuery({
    queryKey: ['preview', datasetId],
    queryFn: async () => {
      const { data } = await api.get<{ rows: Record<string, string>[]; columns: string[] }>(
        `/datasets/${datasetId}/preview`,
      )
      return data
    },
    enabled: Number.isFinite(datasetId),
  })

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!ds?.columns?.length) throw new Error('Dataset not loaded')
      const resolvedTarget = (target.trim() || pickDefaultTarget(ds.columns)).trim()
      if (!resolvedTarget) throw new Error('No target column')

      let vc: string | undefined
      const autoVc = pickDefaultValueColumn(ds.columns, resolvedTarget)

      if (!valuePick || valuePick === '__auto__') {
        vc = autoVc || undefined
      } else if (valuePick === '__none__') {
        vc = undefined
      } else {
        vc = valuePick
      }

      if (vc === resolvedTarget) {
        vc = undefined
      }

      const { data } = await api.post<Analysis>(`/datasets/${datasetId}/analyses`, {
        target: resolvedTarget,
        test_size: 0.2,
        ...(vc ? { value_column: vc } : {}),
      })
      return data
    },
    onSuccess: (a) => {
      void qc.invalidateQueries({ queryKey: ['analysis', a.id] })
      void qc.invalidateQueries({ queryKey: ['analyses'] })
      void qc.invalidateQueries({ queryKey: ['datasetAnalyses', datasetId] })
      navigate(`/datasets/${datasetId}#dataset-kpi-dashboard`)
    },
  })

  const delMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/datasets/${datasetId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['datasets'] })
      navigate('/datasets')
    },
  })

  const defaultTarget = useMemo(
    () => (ds?.columns?.length ? pickDefaultTarget(ds.columns) : ''),
    [ds],
  )

  if (isLoading || !ds) {
    return <LoadingState rows={2} message="Loading dataset…" />
  }

  const effectiveTarget = target.trim() || defaultTarget
  const hint = ds.columns.find((c) => c.name === effectiveTarget)
  const taskHint = hint ? inferTaskHint(hint) : ''

  const numericSelectable = ds.columns.filter((c) => isNumericColumn(c) && c.name !== effectiveTarget)
  const suggestedValue = pickDefaultValueColumn(ds.columns, effectiveTarget)

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
            to="/datasets"
          >
            ← Datasets
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{ds.name}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {ds.rows.toLocaleString()} rows - {ds.cols} columns - {ds.file_format.toUpperCase()}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge tone="info">Step 2 - Analyze</StatusBadge>
            {taskHint && <StatusBadge tone="success">{taskHint}</StatusBadge>}
          </div>
        </div>
        <Button
          variant="danger"
          size="sm"
          type="button"
          onClick={() => {
            if (confirm('Delete this dataset and all analyses?')) delMutation.mutate()
          }}
        >
          Delete
        </Button>
      </div>

      <section>
        <SectionHeader title="Schema readiness" description="Review column types, null rates, and cardinality before choosing the target." />
        <Card padding="none" tone="strong" className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/70">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Column</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Null %</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Unique</th>
                </tr>
              </thead>
              <tbody>
                {ds.columns.map((c) => (
                  <tr
                    key={c.name}
                    className="border-t border-slate-100 dark:border-slate-800/80"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-slate-100">{c.name}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{c.dtype}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-400">
                      {(c.null_ratio * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-400">{c.n_unique}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {preview && preview.rows.length > 0 && (
        <section>
          <SectionHeader title="Data preview" description="Spot check the first rows before running the RCA model." />
          <Card padding="none" tone="strong" className="mt-4">
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 dark:border-slate-800 dark:bg-slate-900/90">
                  <tr>
                    {preview.columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800/80">
                      {preview.columns.map((col) => (
                        <td key={col} className="max-w-xs truncate px-3 py-1.5 text-slate-600 dark:text-slate-400">
                          {row[col] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      <Card padding="lg" tone="info" elevated>
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Run root-cause analysis</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Select the target variable. We infer classification vs regression from the column.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="target-col" className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Target column
            </label>
            <select
              id="target-col"
              className="mt-1.5 w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              value={effectiveTarget}
              onChange={(e) => {
                setTarget(e.target.value)
                setValuePick('__auto__')
              }}
            >
              {ds.columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="value-col" className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Value column (optional)
            </label>
            <select
              id="value-col"
              className="mt-1.5 w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm text-slate-900 shadow-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              disabled={numericSelectable.length === 0}
              value={valuePick}
              onChange={(e) => setValuePick(e.target.value)}
            >
              <option value="__auto__">
                Auto ({suggestedValue || 'detect numeric column'})
              </option>
              <option value="__none__">Skip revenue/value KPI overlay</option>
              {numericSelectable.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {taskHint && (
            <StatusBadge tone="success">Inferred: {taskHint}</StatusBadge>
          )}
          {numericSelectable.length === 0 && (
            <StatusBadge tone="warning">No value overlay</StatusBadge>
          )}
        </div>
        {runMutation.isError && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {formatStartError(runMutation.error)}
          </p>
        )}
        <Button
          type="button"
          className="mt-6"
          disabled={runMutation.isPending || !effectiveTarget}
          onClick={() => runMutation.mutate()}
        >
          {runMutation.isPending ? 'Starting…' : 'Run root-cause analysis'}
        </Button>
      </Card>

      <DatasetKpiDashboard datasetId={datasetId} datasetName={ds.name} />
    </div>
  )
}

export function DatasetDetail() {
  const { id } = useParams<{ id: string }>()
  const datasetId = Number(id)

  if (!Number.isFinite(datasetId)) {
    return (
      <Card padding="lg" className="border-red-200 dark:border-red-900/50">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">Invalid dataset id.</p>
        <Button variant="secondary" className="mt-4" to="/datasets">
          Back to datasets
        </Button>
      </Card>
    )
  }

  return <DatasetDetailInner key={id} datasetId={datasetId} />
}
