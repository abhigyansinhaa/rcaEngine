import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Dataset } from '../types'

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const { data } = await api.get<Dataset[]>('/datasets')
      return data
    },
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your datasets</h1>
          <p className="text-slate-600 dark:text-slate-400">Upload CSV or Parquet, then pick a target to analyze.</p>
        </div>
        <Link
          to="/upload"
          className="rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700"
        >
          Upload dataset
        </Link>
      </div>

      {isLoading && <p className="mt-8 text-slate-500">Loading…</p>}
      {error && <p className="mt-8 text-red-600">Failed to load datasets.</p>}

      {data && data.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">No datasets yet.</p>
          <Link className="mt-2 inline-block text-emerald-700 hover:underline dark:text-emerald-400" to="/upload">
            Upload your first file
          </Link>
        </div>
      )}

      {data && data.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {data.map((d) => (
            <li key={d.id}>
              <Link
                to={`/datasets/${d.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
              >
                <h2 className="font-semibold">{d.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {d.rows.toLocaleString()} rows · {d.cols} columns · {d.file_format.toUpperCase()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
