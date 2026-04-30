import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { KpiCard } from '../components/kpi'
import { formatPct01 } from '../components/kpi/format'
import { api } from '../api/client'
import {
  Button,
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../components/ui'
import type { AnalysisListItem, Dataset } from '../types'

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

function statusTone(status: string): 'default' | 'info' | 'success' | 'warning' | 'risk' {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'risk'
  if (status === 'queued' || status === 'running') return 'warning'
  return 'default'
}

export function Dashboard() {
  const datasetsQuery = useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const { data } = await api.get<Dataset[]>('/datasets')
      return data
    },
  })

  const analysesQuery = useQuery({
    queryKey: ['analyses'],
    queryFn: async () => {
      const { data } = await api.get<AnalysisListItem[]>('/analyses')
      return data
    },
  })

  const datasets = useMemo(() => datasetsQuery.data ?? [], [datasetsQuery.data])
  const analyses = analysesQuery.data ?? []
  const count = datasets.length
  const totalRows = datasets.reduce((s, d) => s + d.rows, 0)
  const completedAnalyses = analyses.filter((a) => a.status === 'completed').length

  const recent = useMemo(
    () =>
      [...datasets]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6),
    [datasets],
  )

  const latestByDataset = useMemo(() => {
    const map = new Map<number, AnalysisListItem>()
    for (const a of analyses) {
      const existing = map.get(a.dataset_id)
      if (!existing || new Date(a.created_at).getTime() > new Date(existing.created_at).getTime()) {
        map.set(a.dataset_id, a)
      }
    }
    return map
  }, [analyses])

  const listError =
    datasetsQuery.error || analysesQuery.error
      ? "We couldn't load workspace metadata. Retry after confirming login and API uptime."
      : null

  if (datasetsQuery.isLoading || analysesQuery.isLoading) {
    return <LoadingState rows={4} />
  }

  if (listError) {
    return (
      <ErrorState
        message={listError}
        onRetry={() => {
          void datasetsQuery.refetch()
          void analysesQuery.refetch()
        }}
      />
    )
  }

  if (!count && !analyses.length) {
    return (
      <EmptyState
        title="Start your RCA workspace"
        description="Upload a CSV or Parquet dataset, select a target, and turn model output into business decisions."
        action={<Button to="/upload">Upload dataset</Button>}
      />
    )
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="RCA workspace"
        title="Pick a dataset to see its business KPIs"
        description="Workspace overview only. Open a dataset for target rates, risk segments, drivers, and revenue impact tied to that data."
        actions={
          <>
            <Button to="/upload">Upload data</Button>
            <Button to="/datasets" variant="secondary">Manage datasets</Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          tone="brand"
          label="Datasets indexed"
          value={count.toLocaleString()}
          hint={`${totalRows.toLocaleString()} rows available`}
        />
        <KpiCard
          tone="default"
          label="Tracked analyses"
          value={analyses.length.toLocaleString()}
          hint={`${completedAnalyses} completed runs`}
        />
        <KpiCard
          tone="emerald"
          label="Decision-ready reports"
          value={analyses.length ? formatPct01(completedAnalyses / analyses.length) : '0%'}
          hint="Completed analyses divided by all runs"
        />
        <KpiCard
          tone="amber"
          label="Datasets with KPIs"
          value={latestByDataset.size.toLocaleString()}
          hint="Open one to see its dashboard"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card padding="lg" tone="strong">
          <CardTitle className="text-lg">RCA flow</CardTitle>
          <div className="mt-5 space-y-4">
            {[
              { step: '01', title: 'Upload', body: 'Bring in CSV or Parquet tables with targets and optional value fields.' },
              { step: '02', title: 'Analyze', body: 'Pick the target on a dataset and let the model produce drivers, SHAP summaries, and KPI rollups.' },
              { step: '03', title: 'Act', body: 'Open the dataset to review business KPIs and prioritize the riskiest, most tractable segments.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <span className="font-mono text-sm font-black text-brand-700 dark:text-brand-300">{item.step}</span>
                <div>
                  <h3 className="font-bold text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-end justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Datasets</CardTitle>
              <CardDescription>Open one to see its KPI dashboard.</CardDescription>
            </div>
            <Button variant="secondary" size="sm" to="/datasets">View all</Button>
          </div>
          {recent.length ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {recent.map((dataset) => {
                const latest = latestByDataset.get(dataset.id)
                return (
                  <li key={dataset.id}>
                    <Link
                      to={`/datasets/${dataset.id}#dataset-kpi-dashboard`}
                      className="block rounded-2xl border border-slate-200/70 bg-white/60 p-4 transition hover:border-brand-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/35 dark:hover:border-brand-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-slate-950 dark:text-white">{dataset.name}</span>
                        {latest && <StatusBadge tone={statusTone(latest.status)}>{latest.status}</StatusBadge>}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {dataset.rows.toLocaleString()} rows - {dataset.cols} cols
                      </p>
                      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-500">
                        {latest
                          ? `Latest analysis #${latest.id} on ${formatDate(latest.created_at)}`
                          : `Uploaded ${formatDate(dataset.created_at)} - no analyses yet`}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <CardDescription className="mt-5">No datasets yet. Upload one to get started.</CardDescription>
          )}
        </Card>
      </section>
    </div>
  )
}
