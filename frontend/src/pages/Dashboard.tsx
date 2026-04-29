import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ConcentrationCallout,
  CounterfactualCallout,
  DriverImpactCard,
  KpiCard,
  ReliabilityBadge,
  RiskSegmentsChart,
} from '../components/kpi'
import { formatCompactMoney, formatNumber, formatPct01 } from '../components/kpi/format'
import { api } from '../api/client'
import { Button, Card, CardDescription, CardTitle, EmptyState, ErrorState, LoadingState, PageHeader, SectionHeader, StatusBadge } from '../components/ui'
import type { Analysis, AnalysisListItem, Dataset } from '../types'

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

function metricValue(detail: Analysis, kpis: NonNullable<NonNullable<Analysis['report']>['kpis']>) {
  if (detail.task_type === 'regression') {
    return kpis.target_level.target_mean !== undefined
      ? formatNumber(kpis.target_level.target_mean, 4)
      : 'No baseline'
  }
  return kpis.target_level.target_rate !== undefined
    ? formatPct01(kpis.target_level.target_rate)
    : 'No baseline'
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

  const [selectedId, setSelectedId] = useState<number | null>(null)

  const defaultAnalysisId = useMemo(() => {
    if (!analysesQuery.data?.length) return null
    const completed = analysesQuery.data.find((a) => a.status === 'completed')
    return (completed ?? analysesQuery.data[0])?.id ?? null
  }, [analysesQuery.data])

  const activeAnalysisId = selectedId ?? defaultAnalysisId

  const detailQuery = useQuery({
    queryKey: ['analysis', activeAnalysisId],
    queryFn: async () => {
      const { data } = await api.get<Analysis>(`/analyses/${activeAnalysisId}`)
      return data
    },
    enabled: activeAnalysisId != null,
    refetchInterval: (q) => {
      const s = q.state.data?.status
      if (s === 'completed' || s === 'failed') return false
      return 2000
    },
  })

  const datasets = useMemo(() => datasetsQuery.data ?? [], [datasetsQuery.data])
  const analyses = analysesQuery.data ?? []
  const detail = detailQuery.data
  const kpis = detail?.report?.kpis
  const count = datasets.length
  const totalRows = datasets.reduce((s, d) => s + d.rows, 0)
  const completedAnalyses = analyses.filter((a) => a.status === 'completed').length
  const revenueReady = !!(kpis?.impact_revenue && detail?.value_column)

  const recent = useMemo(
    () =>
      [...datasets]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4),
    [datasets],
  )

  const topInsights = detail?.insights?.slice(0, 3) ?? []
  const topRecommendations = detail?.recommendations?.slice(0, 4) ?? []

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
        eyebrow="RCA decision cockpit"
        title="What is happening, why, and what to do next"
        description="A single workspace for business KPIs, model explanations, risk segments, and recommended interventions."
        actions={
          <>
            <Button to="/upload">Upload data</Button>
            <Button to="/datasets" variant="secondary">Manage datasets</Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard tone="brand" label="Datasets indexed" value={count.toLocaleString()} hint={`${totalRows.toLocaleString()} rows available`} />
        <KpiCard tone="default" label="Tracked analyses" value={analyses.length.toLocaleString()} hint={`${completedAnalyses} completed runs`} />
        <KpiCard
          tone="emerald"
          label="Decision-ready reports"
          value={analyses.length ? formatPct01(completedAnalyses / analyses.length) : '0%'}
          hint="Completed analyses divided by all runs"
        />
        <KpiCard
          tone="amber"
          label="Latest focus"
          value={detail ? `#${detail.id}` : 'No run'}
          hint={detail ? `${detail.status} - ${detail.target}` : 'Select or run an analysis'}
        />
      </section>

      {analyses.length > 0 && (
        <Card padding="md" tone="strong" elevated>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="flex flex-col text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="analysis-select">
              Analysis focus
              <select
                id="analysis-select"
                className="mt-2 w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-base text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white"
                value={activeAnalysisId ?? ''}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setSelectedId(Number.isFinite(next) ? next : null)
                }}
              >
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} - {a.dataset_name} ({a.status}) - {formatDate(a.created_at)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {detail && <StatusBadge tone={statusTone(detail.status)}>{detail.status}</StatusBadge>}
              {detail && detail.status === 'completed' && (
                <Button variant="secondary" size="sm" to={`/analyses/${detail.id}`}>
                  Open full report
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {detailQuery.isLoading ? (
        <LoadingState rows={4} />
      ) : detail?.status === 'completed' && kpis ? (
        <>
          <section className="space-y-4">
            <SectionHeader
              eyebrow="1. Business impact"
              title="Top-line signals"
              description="Start with target behavior, high-risk exposure, monetized impact, and confidence before reading model artifacts."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                tone="brand"
                label={detail.task_type === 'regression' ? 'Target baseline' : 'Target/churn rate'}
                value={metricValue(detail, kpis)}
                hint={detail.target}
              />
              <KpiCard
                tone="amber"
                label="High-risk users"
                value={formatPct01(kpis.target_level.high_risk_share)}
                hint={`${kpis.target_level.high_risk_count.toLocaleString()} rows above threshold`}
              />
              <KpiCard
                tone={kpis.impact_revenue ? 'risk' : 'default'}
                label="Revenue at risk"
                value={kpis.impact_revenue ? formatCompactMoney(kpis.impact_revenue.revenue_at_risk) : 'Not linked'}
                hint={kpis.impact_revenue ? `Value column: ${detail.value_column ?? 'configured'}` : 'Add a numeric value column on the next run'}
              />
              <KpiCard
                tone={kpis.reliability.tier === 'high' ? 'emerald' : kpis.reliability.tier === 'low' ? 'risk' : 'amber'}
                label="Model performance"
                value={formatNumber(kpis.reliability.headline_value)}
                hint={`${kpis.reliability.headline_metric} - ${kpis.reliability.tier} confidence`}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ConcentrationCallout kpis={kpis} />
              <CounterfactualCallout kpis={kpis} regression={detail.task_type === 'regression'} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="2. Why it is happening"
              title="Drivers, segments, and reliability"
              description="Use feature importance, scenario lift, and segment concentration to identify where intervention should start."
            />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <RiskSegmentsChart kpis={kpis} hasValue={revenueReady} />
              <ReliabilityBadge kpis={kpis} />
            </div>
            <DriverImpactCard kpis={kpis} />
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="3. What to do next"
              title="Insights and actions"
              description="Convert model evidence into a short operating agenda for product, growth, risk, or retention teams."
            />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
              <Card padding="lg" tone="strong">
                <CardTitle className="text-lg">Root-cause insights</CardTitle>
                {topInsights.length ? (
                  <ul className="mt-5 space-y-4">
                    {topInsights.map((insight) => (
                      <li key={`${insight.feature}-${insight.kind}`} className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/35">
                        <p className="font-mono text-xs font-bold text-brand-700 dark:text-brand-300">{insight.feature}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{insight.summary}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <CardDescription>No narrative insights were returned for this run.</CardDescription>
                )}
              </Card>

              <Card padding="lg" tone="info">
                <CardTitle className="text-lg">Recommended actions</CardTitle>
                {topRecommendations.length ? (
                  <ol className="mt-5 space-y-3 text-sm leading-6 text-brand-950 dark:text-brand-100">
                    {topRecommendations.map((recommendation, index) => (
                      <li key={recommendation} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-white">
                          {index + 1}
                        </span>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <CardDescription>Recommendations will appear when the analysis service returns action text.</CardDescription>
                )}
              </Card>
            </div>
          </section>
        </>
      ) : (
        <Card padding="lg" tone={detail?.status === 'failed' ? 'risk' : 'warning'} elevated>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">
                {detail?.status === 'failed' ? 'Analysis needs attention' : 'Analysis is preparing results'}
              </CardTitle>
              <CardDescription>
                {detail?.error || detail?.report?.user_message || 'KPI, driver, and recommendation panels appear here after the job finishes.'}
              </CardDescription>
            </div>
            {detail && <StatusBadge tone={statusTone(detail.status)}>{detail.status}</StatusBadge>}
          </div>
        </Card>
      )}

      {count > 0 && (
        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <Card padding="lg" tone="strong">
            <CardTitle className="text-lg">RCA flow</CardTitle>
            <div className="mt-5 space-y-4">
              {[
                { step: '01', title: 'Upload', body: 'Bring in CSV or Parquet tables with targets and optional value fields.' },
                { step: '02', title: 'Analyze', body: 'Pick the target and let the model produce drivers, SHAP summaries, and KPI rollups.' },
                { step: '03', title: 'Act', body: 'Prioritize the riskiest and most tractable segments with measurable interventions.' },
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
                <CardTitle className="text-lg">Recent uploads</CardTitle>
                <CardDescription>Fast path back into setup and analysis.</CardDescription>
              </div>
              <Button variant="secondary" size="sm" to="/datasets">View all</Button>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {recent.map((dataset) => (
                <li key={dataset.id}>
                  <Link to={`/datasets/${dataset.id}`} className="block rounded-2xl border border-slate-200/70 bg-white/60 p-4 transition hover:border-brand-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/35 dark:hover:border-brand-800">
                    <span className="font-bold text-slate-950 dark:text-white">{dataset.name}</span>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{dataset.rows.toLocaleString()} rows - {dataset.cols} cols</p>
                    <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-500">{formatDate(dataset.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  )
}