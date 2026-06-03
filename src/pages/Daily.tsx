import { useEffect, useMemo, useState } from 'react'
import { addDays, parseISO } from 'date-fns'
import { useApp } from '../store/AppStore'
import { prettyDateFull, toKey, todayKey } from '../lib/date'
import type { DailyReport, Kpt } from '../lib/types'
import { Button, Card, PageHeader, TextArea } from '../components/ui'
import { TimeBlockGrid } from '../components/TimeBlockGrid'

const MOODS = ['😄', '🙂', '😐', '😫', '🔥', '😴']
type View = 'log' | 'kpt' | 'time'
const TABS: { key: View; label: string }[] = [
  { key: 'log', label: '오늘 기록 📝' },
  { key: 'kpt', label: 'KPT 성찰 ✨' },
  { key: 'time', label: '타임 트래커 ⏱' },
]

export function Daily() {
  const [date, setDate] = useState(todayKey())
  const [view, setView] = useState<View>('log')

  const shift = (days: number) => setDate(toKey(addDays(parseISO(date), days)))

  return (
    <>
      <PageHeader title="데일리 리포트" subtitle="하루를 기록하고 돌아보기" />

      <Card className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={() => shift(-1)}
          className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted hover:bg-canvas"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-ink tnum sm:text-base">{prettyDateFull(date)}</p>
          {date !== todayKey() && (
            <button onClick={() => setDate(todayKey())} className="text-xs text-brand-600">
              오늘로 이동
            </button>
          )}
        </div>
        <button
          onClick={() => shift(1)}
          className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted hover:bg-canvas"
        >
          ›
        </button>
      </Card>

      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={[
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              view === t.key ? 'bg-ink text-white' : 'bg-surface text-muted hover:bg-canvas',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'log' && <LogView date={date} onPickDate={setDate} />}
      {view === 'kpt' && <KptView date={date} />}
      {view === 'time' && (
        <Card>
          <TimeBlockGrid date={date} />
        </Card>
      )}
    </>
  )
}

// ── 오늘 기록 (free-form report + mood + completed todos) ─────────────
function LogView({ date, onPickDate }: { date: string; onPickDate: (d: string) => void }) {
  const { data, save, remove } = useApp()
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<string | undefined>()
  const [dirty, setDirty] = useState(false)

  const current = useMemo(() => data.reports.find((r) => r.id === date), [data.reports, date])

  useEffect(() => {
    setContent(current?.content ?? '')
    setMood(current?.mood)
    setDirty(false)
  }, [date, current?.content, current?.mood])

  const completedToday = data.todos.filter(
    (t) => t.status === 'done' && t.completedAt && toKey(new Date(t.completedAt)) === date,
  )

  const persist = () => {
    if (!content.trim() && !mood) {
      if (current) remove('reports', date)
      setDirty(false)
      return
    }
    const report: DailyReport = { id: date, date, content: content.trim(), mood, updatedAt: Date.now() }
    save('reports', report)
    setDirty(false)
  }

  const recent = useMemo(
    () => [...data.reports].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14),
    [data.reports],
  )

  const insertTemplate = () => {
    const done = completedToday.map((t) => `- ${t.title}`).join('\n')
    const tmpl = `## ✅ 오늘 한 일\n${done || '- '}\n\n## 💡 배운 점 / 메모\n- \n\n## 🔜 내일 할 일\n- `
    setContent((c) => (c.trim() ? c : tmpl))
    setDirty(true)
  }

  return (
    <>
      <Card className="mb-4 flex flex-col gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted">기분</span>
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => {
                setMood(mood === m ? undefined : m)
                setDirty(true)
              }}
              className={[
                'grid size-9 place-items-center rounded-lg text-lg transition',
                mood === m ? 'bg-brand-100 ring-2 ring-brand-300' : 'hover:bg-canvas',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>

        {completedToday.length > 0 && (
          <div className="rounded-lg bg-canvas px-3 py-2 text-sm">
            <p className="mb-1 text-xs font-medium text-muted">이 날 완료한 할 일 {completedToday.length}개</p>
            <ul className="flex flex-col gap-0.5">
              {completedToday.map((t) => (
                <li key={t.id} className="text-ink">✓ {t.title}</li>
              ))}
            </ul>
          </div>
        )}

        <TextArea
          rows={10}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            setDirty(true)
          }}
          onBlur={persist}
          placeholder="오늘 있었던 일, 배운 점, 회고를 자유롭게 적어보세요…"
          className="leading-relaxed"
        />

        <div className="flex items-center justify-between">
          {!content.trim() ? (
            <Button variant="subtle" onClick={insertTemplate}>
              📋 템플릿 넣기
            </Button>
          ) : (
            <span className="text-xs text-muted tnum">{content.length}자</span>
          )}
          <Button onClick={persist} disabled={!dirty}>
            {dirty ? '저장' : '저장됨 ✓'}
          </Button>
        </div>
      </Card>

      {recent.length > 0 && (
        <>
          <h2 className="mb-2 px-1 text-sm font-semibold text-muted">최근 기록</h2>
          <div className="flex flex-col gap-2">
            {recent.map((r) => (
              <button
                key={r.id}
                onClick={() => onPickDate(r.id)}
                className={[
                  'rounded-xl border px-4 py-3 text-left transition',
                  r.id === date ? 'border-brand-300 bg-brand-50' : 'border-line bg-surface hover:bg-canvas',
                ].join(' ')}
              >
                <span className="text-sm font-medium text-ink tnum">
                  {r.mood ?? '📝'} {prettyDateFull(r.id)}
                </span>
                <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-muted">
                  {r.content || '(내용 없음)'}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ── KPT 성찰 (Keep / Problem / Try) ──────────────────────────────────
const KPT_FIELDS = [
  { key: 'keep', icon: '💚', label: 'Keep — 잘한 것 / 계속할 것', ph: '유지하고 싶은 점' },
  { key: 'problem', icon: '🔴', label: 'Problem — 문제 / 아쉬운 것', ph: '겪은 문제나 아쉬웠던 점' },
  { key: 'try', icon: '💡', label: 'Try — 다음에 시도할 것', ph: '개선을 위해 시도할 것' },
] as const

function KptView({ date }: { date: string }) {
  const { data, save, remove } = useApp()
  const current = useMemo(() => data.kpts.find((k) => k.id === date), [data.kpts, date])
  const [form, setForm] = useState({ keep: '', problem: '', try: '' })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setForm({ keep: current?.keep ?? '', problem: current?.problem ?? '', try: current?.try ?? '' })
    setDirty(false)
  }, [date, current?.keep, current?.problem, current?.try])

  const persist = () => {
    const empty = !form.keep.trim() && !form.problem.trim() && !form.try.trim()
    if (empty) {
      if (current) remove('kpts', date)
      setDirty(false)
      return
    }
    const entry: Kpt = {
      id: date,
      date,
      keep: form.keep.trim(),
      problem: form.problem.trim(),
      try: form.try.trim(),
      updatedAt: Date.now(),
    }
    save('kpts', entry)
    setDirty(false)
  }

  return (
    <Card className="flex flex-col gap-4">
      {KPT_FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
            <span>{f.icon}</span>
            {f.label}
          </span>
          <TextArea
            rows={3}
            value={form[f.key]}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
              setDirty(true)
            }}
            onBlur={persist}
            placeholder={f.ph}
          />
        </label>
      ))}
      <div className="flex justify-end">
        <Button onClick={persist} disabled={!dirty}>
          {dirty ? '저장' : '저장됨 ✓'}
        </Button>
      </div>
    </Card>
  )
}
