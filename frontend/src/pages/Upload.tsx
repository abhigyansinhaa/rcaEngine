import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

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
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Upload dataset</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">CSV or Parquet only.</p>

      <label className="mt-6 block text-sm font-medium">Display name (optional)</label>
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="My sales data"
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
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 transition ${
          drag ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-300 dark:border-slate-600'
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
        <p className="text-center text-slate-600 dark:text-slate-400">
          {progress ? 'Uploading…' : 'Drop a file here or click to browse'}
        </p>
      </div>
      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
    </div>
  )
}
