import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            RCA Platform
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <span className="text-slate-600 dark:text-slate-400">{user.email}</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link className="text-emerald-700 hover:underline dark:text-emerald-400" to="/login">
                  Log in
                </Link>
                <Link
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                  to="/register"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
