import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Button, Card, LoadingState } from '../components/ui'
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

function DatasetDetailInner({ datasetId }: { datasetId: number }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [target, setTarget] = useState('')

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
      const resolved = (target.trim() || pickDefaultTarget(ds.columns)).trim()
      if (!resolved) throw new Error('No target column')
      const { data } = await api.post<Analysis>(`/datasets/${datasetId}/analyses`, {
        target: resolved,
        test_size: 0.2,
      })
      return data
    },
    onSuccess: (a) => {
      void qc.invalidateQueries({ queryKey: ['analysis', a.id] })
      navigate(`/analyses/${a.id}`)
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
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{ds.name}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {ds.rows.toLocaleString()} rows · {ds.cols} columns · {ds.file_format.toUpperCase()}
          </p>
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Schema</h2>
        <Card padding="none" className="mt-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preview</h2>
          <Card padding="none" className="mt-3">
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/80">
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

      <Card padding="lg" elevated>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Run analysis</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Select the target variable. We infer classification vs regression from the column.
        </p>
        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="target-col" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Target column
            </label>
            <select
              id="target-col"
              className="mt-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={effectiveTarget}
              onChange={(e) => setTarget(e.target.value)}
            >
              {ds.columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {taskHint && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Inferred: {taskHint}
            </span>
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
