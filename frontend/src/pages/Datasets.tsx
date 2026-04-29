import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, StatusBadge } from '../components/ui'
import type { Dataset } from '../types'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function Datasets() {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'name' | 'rows'>('recent')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const { data } = await api.get<Dataset[]>('/datasets')
      return data
    },
  })

  const filtered = useMemo(() => {
    if (!data?.length) return []
    const q = query.trim().toLowerCase()
    const list = q
      ? data.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.filename.toLowerCase().includes(q) ||
            d.file_format.toLowerCase().includes(q),
        )
      : [...data]

    const sorted = [...list]
    if (sort === 'recent') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      sorted.sort((a, b) => b.rows - a.rows)
    }
    return sorted
  }, [data, query, sort])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Data"
        title="Dataset inventory"
        description="Find uploaded tables, check freshness, and open a dataset to configure the next root-cause run."
        actions={<Button to="/upload">Upload dataset</Button>}
      />

      {isLoading && <LoadingState rows={4} />}

      {error && (
        <ErrorState message="We couldn’t load your datasets. Check your connection and try again." onRetry={() => void refetch()} />
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="No datasets yet"
          description="Upload a CSV or Parquet file to create your first dataset and start an analysis."
          icon={
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          }
          action={<Button to="/upload">Upload dataset</Button>}
        />
      )}

      {data && data.length > 0 && (
        <>
          <Card padding="md" tone="strong">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="max-w-md flex-1">
              <Input
                label="Search"
                placeholder="Name, filename, or format…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="sort-datasets" className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Sort by
              </label>
              <select
                id="sort-datasets"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="mt-1.5 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              >
                <option value="recent">Recently added</option>
                <option value="name">Name (A–Z)</option>
                <option value="rows">Row count</option>
              </select>
            </div>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card padding="lg" className="text-center text-sm text-slate-600 dark:text-slate-400">
              No datasets match “{query}”. Try a different search.
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((d) => (
                <li key={d.id}>
                  <Link to={`/datasets/${d.id}`} className="block h-full">
                    <Card
                      padding="md"
                      elevated
                      tone="strong"
                      className="h-full transition hover:-translate-y-0.5 hover:border-brand-300/80 dark:hover:border-brand-700/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-black tracking-tight text-slate-950 dark:text-white">{d.name}</h2>
                        <StatusBadge>{d.file_format}</StatusBadge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {d.rows.toLocaleString()} rows - {d.cols} columns
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-500" title={d.filename}>
                        {d.filename}
                      </p>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">Added {formatDate(d.created_at)}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
