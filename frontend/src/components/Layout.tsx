import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
    isActive
      ? 'bg-white text-brand-800 shadow-sm ring-1 ring-brand-200/80 dark:bg-slate-800/90 dark:text-brand-200 dark:ring-brand-800/70'
      : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
  ].join(' ')

export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <Link
              to={user ? '/' : '/login'}
              className="group flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-600 to-slate-900 text-sm font-black text-white shadow-lg shadow-brand-600/25 ring-1 ring-white/30">
                R
              </span>
              <span className="hidden sm:inline">
                RCA<span className="font-medium text-slate-500 dark:text-slate-400"> Command</span>
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
                <span className="hidden max-w-[220px] truncate rounded-full border border-slate-200/70 bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 md:inline">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800"
                  to="/login"
                >
                  Log in
                </Link>
                <Link
                  className="rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-700/20 hover:bg-brand-400"
                  to="/register"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>

        {user && (
          <div className="flex gap-1 border-t border-slate-200/70 px-4 py-2 sm:hidden dark:border-slate-800/80">
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:py-10 lg:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-white/50 py-6 text-center text-xs font-medium text-slate-500 dark:border-slate-800/80 dark:text-slate-500">
        Root-cause analysis with interpretable ML - CSV and Parquet
      </footer>
    </div>
  )
}
