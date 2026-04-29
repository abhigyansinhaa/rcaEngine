import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, Input, PageHeader } from '../components/ui'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (password.length < 8) {
      setErr('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      await register(email, password)
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof AxiosError) {
        const detail = error.response?.data?.detail
        if (typeof detail === 'string' && detail.length > 0) {
          setErr(detail)
        } else if (!error.response) {
          setErr('Cannot reach backend. Make sure the API server is running.')
        } else {
          setErr('Could not register. Please try again.')
        }
      } else {
        setErr('Could not register. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
      <PageHeader
        eyebrow="RCA Command"
        title="Create your account"
        description="Create a workspace for uploads, model explainability, KPI rollups, and recommended interventions."
      />
      <Card padding="lg" tone="strong" elevated>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            hint="At least 8 characters"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Creating…' : 'Register'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link className="font-medium text-brand-700 hover:underline dark:text-brand-400" to="/login">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  )
}
