import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { dueState, prettyDateFull, todayKey } from '../lib/date'
import { Card } from '../components/ui'

export function Dashboard() {
  const { data, save, user, mode } = useApp()
  const today = todayKey()

  const openTodos = data.todos.filter((t) => t.status !== 'done')
  const dueTodos = useMemo(
    () =>
      openTodos
        .filter((t) => t.dueDate && t.dueDate <= today)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [openTodos, today],
  )
  const activeProjects = data.projects.filter((p) => p.status === 'active')
  const activeSprints = data.sprints.filter((s) => s.status === 'active')
  const hasReport = data.reports.some((r) => r.id === today)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '오늘 하루 수고했어요'
  const name = mode === 'cloud' ? (user?.displayName?.split(' ')[0] ?? '') : ''

  const stats = [
    { to: '/todos', icon: '✅', label: '할 일', value: openTodos.length, sub: `${dueTodos.length}개 마감` },
    { to: '/projects', icon: '📁', label: '진행 프로젝트', value: activeProjects.length },
    { to: '/sprints', icon: '🏃', label: '진행 스프린트', value: activeSprints.length },
    { to: '/daily', icon: '📝', label: '데일리', value: hasReport ? '작성됨' : '미작성', done: hasReport },
  ]

  return (
    <>
      <div className="mb-6 rise-in">
        <p className="text-sm text-muted tnum">{prettyDateFull(today)}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">
          {greeting}{name && `, ${name}님`} 👋
        </h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Link key={s.to} to={s.to} className="rise-in" style={{ animationDelay: `${i * 70}ms` }}>
            <Card className="h-full transition hover:border-brand-400 hover:shadow-md">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.label}</p>
                <span className="text-base opacity-80">{s.icon}</span>
              </div>
              <p
                className={[
                  'mt-3 text-3xl leading-none',
                  typeof s.value === 'number' ? 'metric font-semibold' : 'font-semibold',
                  typeof s.value === 'string' && 'done' in s && !s.done ? 'text-muted' : 'text-ink',
                ].join(' ')}
              >
                {s.value}
              </p>
              {s.sub && <p className="mt-1.5 text-xs text-muted tnum">{s.sub}</p>}
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-2 px-1 text-sm font-semibold text-muted">오늘 / 마감 임박 할 일</h2>
      {dueTodos.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          마감 임박한 할 일이 없어요. 여유롭네요 ☕️
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {dueTodos.map((t) => {
            const ds = dueState(t.dueDate)
            return (
              <Card key={t.id} className="flex items-center gap-3 !p-3.5">
                <button
                  onClick={() => save('todos', { ...t, status: 'done', completedAt: Date.now() })}
                  className="grid size-5 shrink-0 place-items-center rounded-md border border-line transition hover:border-brand-400"
                  aria-label="완료"
                />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{t.title}</span>
                {t.dueDate && (
                  <span
                    className={[
                      'shrink-0 rounded-full px-2 py-0.5 text-xs',
                      ds === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700',
                    ].join(' ')}
                  >
                    {ds === 'overdue' ? '지남' : '오늘'}
                  </span>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
