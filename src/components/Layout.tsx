import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { BrandMark } from './BrandMark'

export const NAV = [
  { to: '/', icon: '🏠', label: '홈', end: true },
  { to: '/todos', icon: '✅', label: 'Todo' },
  { to: '/projects', icon: '📁', label: '프로젝트' },
  { to: '/daily', icon: '📝', label: '데일리' },
  { to: '/weekly', icon: '🗓️', label: '주간' },
  { to: '/sprints', icon: '🏃', label: '스프린트' },
  { to: '/learn', icon: '📚', label: '배움' },
  { to: '/settings', icon: '⚙️', label: '설정' },
]

export function Layout() {
  const { user, mode } = useApp()

  return (
    <div className="mx-auto flex min-h-full max-w-6xl">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-lg bg-ink text-brand-400">
            <BrandMark className="w-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight text-ink">Flow</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-muted hover:bg-canvas hover:text-ink',
                ].join(' ')
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 pt-4 text-xs text-muted">
          {mode === 'cloud' ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              {user?.displayName ?? user?.email ?? '클라우드 동기화'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400" />
              로컬 모드
            </span>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-ink text-brand-400">
              <BrandMark className="w-4" />
            </span>
            <span className="font-semibold tracking-tight text-ink">Flow</span>
          </div>
          <span className="text-xs text-muted">
            {mode === 'cloud' ? '☁️ 동기화' : '📱 로컬'}
          </span>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium whitespace-nowrap transition',
                isActive ? 'text-brand-600' : 'text-muted',
              ].join(' ')
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
