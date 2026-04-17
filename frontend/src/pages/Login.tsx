import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

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
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Access your datasets and analyses.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
        No account?{' '}
        <Link className="text-emerald-700 hover:underline dark:text-emerald-400" to="/register">
          Register
        </Link>
      </p>
    </div>
  )
}
