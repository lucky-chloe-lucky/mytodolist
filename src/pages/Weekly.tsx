import { useMemo, useState } from 'react'
import { addDays, parseISO } from 'date-fns'
import { useApp } from '../store/AppStore'
import { uid } from '../lib/backend'
import { prettyWeekRange, toKey, todayKey, weekDays, weekKeyOf } from '../lib/date'
import type { Habit, WeeklyNote } from '../lib/types'
import { Button, Card, EmptyState, PageHeader, TextArea, TextInput } from '../components/ui'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Weekly() {
  const [weekKey, setWeekKey] = useState(weekKeyOf(todayKey()))
  const days = useMemo(() => weekDays(weekKey), [weekKey])
  const today = todayKey()

  const shiftWeek = (weeks: number) =>
    setWeekKey(weekKeyOf(toKey(addDays(parseISO(weekKey), weeks * 7))))

  return (
    <>
      <PageHeader title="주간" subtitle="이번 주 메모와 습관을 관리해요" />

      <Card className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={() => shiftWeek(-1)}
          className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted hover:bg-canvas"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-ink tnum sm:text-base">{prettyWeekRange(weekKey)}</p>
          {weekKey !== weekKeyOf(today) && (
            <button onClick={() => setWeekKey(weekKeyOf(today))} className="text-xs text-brand-600">
              이번 주로 이동
            </button>
          )}
        </div>
        <button
          onClick={() => shiftWeek(1)}
          className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted hover:bg-canvas"
        >
          ›
        </button>
      </Card>

      <WeekMemo weekKey={weekKey} />
      <HabitTracker days={days} today={today} />
    </>
  )
}

// ── 이번 주 메모 ─────────────────────────────────────────────────────
function WeekMemo({ weekKey }: { weekKey: string }) {
  const { data, save, remove } = useApp()
  const current = useMemo(() => data.weeklyNotes.find((n) => n.id === weekKey), [data.weeklyNotes, weekKey])
  const [content, setContent] = useState(current?.content ?? '')
  const [editingKey, setEditingKey] = useState(weekKey)

  // Sync editor when the week changes.
  if (editingKey !== weekKey) {
    setEditingKey(weekKey)
    setContent(current?.content ?? '')
  }

  const persist = () => {
    if (!content.trim()) {
      if (current) remove('weeklyNotes', weekKey)
      return
    }
    const note: WeeklyNote = { id: weekKey, weekKey, content: content.trim(), updatedAt: Date.now() }
    save('weeklyNotes', note)
  }

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50/50">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-amber-400" />
        <h2 className="font-semibold text-ink">이번 주 메모</h2>
      </div>
      <TextArea
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={persist}
        placeholder="주간 목표를 적어보세요…"
        className="!bg-white/70"
      />
    </Card>
  )
}

// ── 해빗 트래커 ──────────────────────────────────────────────────────
function HabitTracker({ days, today }: { days: string[]; today: string }) {
  const { data, save, remove } = useApp()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const habits = useMemo(
    () => [...data.habits].sort((a, b) => a.createdAt - b.createdAt),
    [data.habits],
  )

  const toggle = (habit: Habit, day: string) => {
    const done = habit.done.includes(day)
      ? habit.done.filter((d) => d !== day)
      : [...habit.done, day]
    save('habits', { ...habit, done })
  }

  const addHabit = () => {
    if (!name.trim()) return
    save('habits', { id: uid(), name: name.trim(), createdAt: Date.now(), done: [] })
    setName('')
    setAdding(false)
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-brand-500" />
        <h2 className="font-semibold text-ink">해빗 트래커</h2>
        <Button variant="subtle" className="ml-auto !px-3 !py-1.5 text-xs" onClick={() => setAdding((v) => !v)}>
          + 추가
        </Button>
      </div>

      {/* Header row */}
      <div className="flex items-center border-b border-line pb-2 text-xs font-medium text-muted">
        <span className="flex-1">습관</span>
        {days.map((d, i) => (
          <span
            key={d}
            className={[
              'w-8 text-center tnum',
              d === today ? 'font-bold text-brand-700' : i === 0 || i === 6 ? 'text-red-400' : '',
            ].join(' ')}
          >
            {DAY_LABELS[i]}
          </span>
        ))}
        <span className="w-6" />
      </div>

      {habits.length === 0 && !adding ? (
        <div className="py-6">
          <EmptyState icon="🔥" title="습관이 없어요" hint="+ 추가로 매일 체크할 습관을 만들어보세요" />
        </div>
      ) : (
        <div className="flex flex-col">
          {habits.map((h) => {
            const count = days.filter((d) => h.done.includes(d)).length
            return (
              <div key={h.id} className="group flex items-center border-b border-line/60 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{h.name}</p>
                  <p className="text-[11px] text-muted tnum">{count}/7</p>
                </div>
                {days.map((d) => {
                  const on = h.done.includes(d)
                  return (
                    <div key={d} className="flex w-8 justify-center">
                      <button
                        onClick={() => toggle(h, d)}
                        className={[
                          'size-6 rounded-md border transition',
                          on
                            ? 'border-brand-600 bg-brand-500'
                            : 'border-line hover:border-brand-400',
                          d === today && !on ? 'ring-1 ring-brand-200' : '',
                        ].join(' ')}
                        aria-label={`${h.name} ${d}`}
                      >
                        {on && <span className="text-xs text-white">✓</span>}
                      </button>
                    </div>
                  )
                })}
                <div className="flex w-6 justify-center">
                  <button
                    onClick={() => remove('habits', h.id)}
                    className="text-muted opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                    aria-label="습관 삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <div className="mt-3 flex gap-1.5">
          <TextInput
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="습관 이름 (예: 운동, 독서)"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) addHabit()
              if (e.key === 'Escape') setAdding(false)
            }}
            className="!py-2 text-sm"
          />
          <Button onClick={addHabit} className="shrink-0">
            추가
          </Button>
        </div>
      )}
    </Card>
  )
}
