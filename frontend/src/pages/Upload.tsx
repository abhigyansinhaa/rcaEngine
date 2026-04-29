import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Card, Input, PageHeader, StatusBadge } from '../components/ui'

export function Upload() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [progress, setProgress] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  const uploadFile = useCallback(
    async (file: File) => {
      setErr(null)
      setProgress(true)
      const fd = new FormData()
      fd.append('file', file)
      if (name.trim()) fd.append('name', name.trim())
      try {
        const { data } = await api.post('/datasets', fd)
        await qc.invalidateQueries({ queryKey: ['datasets'] })
        navigate(`/datasets/${data.id}`)
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'response' in e && e.response && typeof e.response === 'object' && 'data' in e.response
        const detail = msg && typeof (e.response as { data?: { detail?: string } }).data?.detail === 'string'
          ? (e.response as { data: { detail: string } }).data.detail
          : 'Upload failed.'
        setErr(detail)
      } finally {
        setProgress(false)
      }
    },
    [name, navigate, qc],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDrag(false)
      const f = e.dataTransfer.files[0]
      if (f) void uploadFile(f)
    },
    [uploadFile],
  )

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Step 1 - Ingest"
        title="Upload dataset"
        description="Start the RCA flow with a CSV or Parquet file. After upload, we will profile columns and guide target selection."
      />

      <Card padding="lg" tone="strong" elevated>
        <div className="mb-6 flex flex-wrap gap-2">
          <StatusBadge tone="info">CSV</StatusBadge>
          <StatusBadge tone="info">Parquet</StatusBadge>
          <StatusBadge tone="success">Schema profiling</StatusBadge>
        </div>
        <Input
          label="Display name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q4 sales"
          disabled={progress}
        />

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-16 transition ${
            drag
              ? 'border-brand-500 bg-brand-50/90 shadow-inner dark:bg-brand-950/40'
              : 'border-slate-300 bg-white/55 dark:border-slate-700 dark:bg-slate-950/35'
          }`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.parquet,.pq"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void uploadFile(f)
            }}
          />
          <div className="rounded-3xl bg-brand-100 p-4 text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="mt-5 text-center text-base font-black text-slate-950 dark:text-slate-100">
            {progress ? 'Uploading…' : 'Drop a file here or click to browse'}
          </p>
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-500">Accepted formats: .csv, .parquet, .pq</p>
        </div>

        {err && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </p>
        )}
      </Card>
    </div>
  )
}
