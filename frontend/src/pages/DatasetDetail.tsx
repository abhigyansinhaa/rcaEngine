import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Analysis, Dataset } from '../types'

function inferTaskHint(col: { dtype: string; n_unique: number }) {
  if (col.dtype === 'object' || col.dtype === 'bool' || col.dtype === 'category') return 'classification'
  if (col.n_unique <= 20) return 'classification'
  return 'regression'
}

export function DatasetDetail() {
  const { id } = useParams<{ id: string }>()
  const datasetId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [target, setTarget] = useState<string>('')

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

  useEffect(() => {
    if (ds?.columns?.length && !target) {
      const first = ds.columns.find((c) => c.name) ?? ds.columns[0]
      if (first) setTarget(first.name)
    }
  }, [ds, target])

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Analysis>(`/datasets/${datasetId}/analyses`, {
        target,
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
      navigate('/')
    },
  })

  if (!Number.isFinite(datasetId)) {
    return <p className="text-red-600">Invalid dataset id.</p>
  }

  if (isLoading || !ds) {
    return <p className="text-slate-500">Loading…</p>
  }

  const hint = ds.columns.find((c) => c.name === target)
  const taskHint = hint ? inferTaskHint(hint) : ''

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm text-emerald-700 hover:underline dark:text-emerald-400" to="/">
            ← Back
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{ds.name}</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {ds.rows.toLocaleString()} rows · {ds.cols} columns
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
          onClick={() => {
            if (confirm('Delete this dataset and all analyses?')) delMutation.mutate()
          }}
        >
          Delete
        </button>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Schema</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-900">
              <tr>
                <th className="px-3 py-2">Column</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Null %</th>
                <th className="px-3 py-2">Unique</th>
              </tr>
            </thead>
            <tbody>
              {ds.columns.map((c) => (
                <tr key={c.name} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2 font-mono">{c.name}</td>
                  <td className="px-3 py-2">{c.dtype}</td>
                  <td className="px-3 py-2">{(c.null_ratio * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">{c.n_unique}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {preview && preview.rows.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Preview</h2>
          <div className="mt-2 max-h-80 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900">
                <tr>
                  {preview.columns.map((col) => (
                    <th key={col} className="whitespace-nowrap px-2 py-2">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                    {preview.columns.map((col) => (
                      <td key={col} className="max-w-xs truncate px-2 py-1">
                        {row[col] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Run analysis</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Select the target variable. We auto-detect classification vs regression from the column.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium">Target column</label>
            <select
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              value={target}
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
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs dark:bg-slate-800">
              Inferred: {taskHint}
            </span>
          )}
        </div>
        {runMutation.isError && (
          <p className="mt-2 text-sm text-red-600">Could not start analysis. Check the target column.</p>
        )}
        <button
          type="button"
          disabled={runMutation.isPending || !target}
          onClick={() => runMutation.mutate()}
          className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {runMutation.isPending ? 'Starting…' : 'Run root-cause analysis'}
        </button>
      </section>
    </div>
  )
}
