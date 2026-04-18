import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  ].join(' ')

export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/75 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/75">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <Link
              to={user ? '/' : '/login'}
              className="group flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-md shadow-brand-600/25">
                R
              </span>
              <span className="hidden sm:inline">
                RCA<span className="font-medium text-slate-500 dark:text-slate-400"> Platform</span>
              </span>
            </Link>

            {user && (
              <nav className="hidden items-center gap-0.5 sm:flex" aria-label="Main">
                <NavLink to="/" end className={navLinkClass}>
                  Overview
                </NavLink>
                <NavLink to="/datasets" className={navLinkClass}>
                  Datasets
                </NavLink>
                <NavLink to="/upload" className={navLinkClass}>
                  Upload
                </NavLink>
              </nav>
            )}
          </div>

          <nav className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <span className="hidden max-w-[200px] truncate text-sm text-slate-600 dark:text-slate-400 md:inline">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  to="/login"
                >
                  Log in
                </Link>
                <Link
                  className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                  to="/register"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>

        {user && (
          <div className="flex gap-1 border-t border-slate-100 px-4 py-2 sm:hidden dark:border-slate-800/80">
            <NavLink to="/" end className={navLinkClass}>
              Overview
            </NavLink>
            <NavLink to="/datasets" className={navLinkClass}>
              Datasets
            </NavLink>
            <NavLink to="/upload" className={navLinkClass}>
              Upload
            </NavLink>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
        Root-cause analysis with interpretable ML — CSV & Parquet
      </footer>
    </div>
  )
}
