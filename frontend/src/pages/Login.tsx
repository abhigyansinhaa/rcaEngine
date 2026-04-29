import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, Input, PageHeader } from '../components/ui'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setErr('Invalid email or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
      <PageHeader
        eyebrow="RCA Command"
        title="Welcome back"
        description="Sign in to upload datasets, monitor model runs, and review decision-ready root-cause insights."
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
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          No account?{' '}
          <Link className="font-medium text-brand-700 hover:underline dark:text-brand-400" to="/register">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  )
}
