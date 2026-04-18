import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Button, Card, CardDescription, CardTitle, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
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

export function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const { data } = await api.get<Dataset[]>('/datasets')
      return data
    },
  })

  const count = data?.length ?? 0
  const totalRows = data?.reduce((s, d) => s + d.rows, 0) ?? 0
  const recent = data
    ? [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
    : []

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Root-cause analysis"
        title="Overview"
        description="See how your data and analyses are organized. Upload a dataset, choose a target column, and get SHAP-based drivers and recommendations."
        actions={
          <>
            <Button variant="secondary" to="/datasets">
              Browse datasets
            </Button>
            <Button to="/upload">Upload dataset</Button>
          </>
        }
      />

      {isLoading && <LoadingState rows={2} />}

      {error && (
        <ErrorState
          message="We couldn’t load your workspace. Check that the API is running and try again."
          onRetry={() => void refetch()}
        />
      )}

      {data && count === 0 && (
        <div className="space-y-8">
          <Card
            padding="lg"
            className="relative overflow-hidden border-brand-200/60 bg-gradient-to-br from-brand-50/90 via-white to-white dark:border-brand-900/40 dark:from-brand-950/40 dark:via-slate-900/90 dark:to-slate-900/90"
          >
            <div className="relative max-w-2xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Get started in minutes</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Upload a CSV or Parquet file, inspect the schema, select the outcome you care about, and run an
                interpretable model. You’ll get feature importance, SHAP summaries, and actionable recommendations.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button to="/upload">Upload your first dataset</Button>
                <Button variant="secondary" to="/datasets">
                  Learn more in Datasets
                </Button>
              </div>
            </div>
          </Card>

          <EmptyState
            title="No datasets yet"
            description="Your overview will show stats and recent activity once you add data."
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
            action={<Button to="/upload">Upload dataset</Button>}
          />
        </div>
      )}

      {data && count > 0 && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Card padding="md" elevated>
              <CardTitle>Datasets</CardTitle>
              <CardDescription>Tables available for analysis</CardDescription>
              <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{count}</p>
            </Card>
            <Card padding="md" elevated>
              <CardTitle>Rows indexed</CardTitle>
              <CardDescription>Total rows across all datasets</CardDescription>
              <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {totalRows.toLocaleString()}
              </p>
            </Card>
            <Card padding="md" elevated>
              <CardTitle>Latest upload</CardTitle>
              <CardDescription>Most recently added dataset</CardDescription>
              <p className="mt-4 truncate text-lg font-semibold text-slate-900 dark:text-white">
                {recent[0]?.name ?? '—'}
              </p>
              {recent[0] && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{formatDate(recent[0].created_at)}</p>
              )}
            </Card>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              How it works
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[
                {
                  step: '1',
                  title: 'Upload',
                  body: 'Bring CSV or Parquet into the platform with optional display names.',
                },
                {
                  step: '2',
                  title: 'Configure',
                  body: 'Review schema and choose the target column for classification or regression.',
                },
                {
                  step: '3',
                  title: 'Interpret',
                  body: 'Review SHAP importance, plots, and root-cause insights for stakeholders.',
                },
              ].map((item) => (
                <Card key={item.step} padding="md">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-950/80 dark:text-brand-300">
                    {item.step}
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.body}</p>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent datasets</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Jump back into your latest work</p>
              </div>
              <Button variant="secondary" size="sm" to="/datasets">
                View all
              </Button>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {recent.map((d) => (
                <li key={d.id}>
                  <Link to={`/datasets/${d.id}`} className="block">
                    <Card
                      padding="md"
                      className="transition-colors hover:border-brand-300/80 dark:hover:border-brand-700/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">{d.name}</span>
                        <span className="shrink-0 text-xs font-medium uppercase text-slate-500">{d.file_format}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {d.rows.toLocaleString()} rows · {d.cols} columns
                      </p>
                      <p className="mt-2 text-xs text-slate-500">{formatDate(d.created_at)}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
