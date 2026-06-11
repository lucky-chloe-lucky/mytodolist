import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import {
  calendarErrorMessage,
  getCalendarToken,
  upsertEvent,
  type CalEvent,
} from '../lib/gcal'
import { prettyDate, prettyDateTime } from '../lib/date'
import { todoToCalendarEvent } from '../lib/todoCalendar'
import { Button, Card } from './ui'

type Target = {
  coll: 'todos' | 'milestones' | 'sprints'
  item: { id: string; gcalEventId?: string }
  ev: CalEvent
}

export function GcalSync() {
  const { data, save } = useApp()
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const targets = useMemo<Target[]>(() => {
    const list: Target[] = []
    for (const t of data.todos) {
      if (t.status === 'done') continue
      const ev = todoToCalendarEvent(t)
      if (ev) list.push({ coll: 'todos', item: t, ev })
    }
    for (const m of data.milestones)
      if (m.dueDate && !m.done)
        list.push({ coll: 'milestones', item: m, ev: { summary: `🎯 ${m.title}`, start: m.dueDate } })
    for (const s of data.sprints)
      if (s.startDate && s.status !== 'done')
        list.push({
          coll: 'sprints',
          item: s,
          ev: { summary: `🏃 ${s.name}`, start: s.startDate, end: s.endDate, description: s.goal },
        })
    return list
  }, [data.todos, data.milestones, data.sprints])

  const sync = async () => {
    setErr(null)
    setMsg(null)
    if (targets.length === 0) {
      setMsg('동기화할 일정(마감일/기간)이 없어요.')
      return
    }
    setSyncing(true)
    try {
      const token = await getCalendarToken()
      let n = 0
      for (const t of targets) {
        const id = await upsertEvent(token, t.ev, t.item.gcalEventId)
        if (id !== t.item.gcalEventId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await save(t.coll, { ...(t.item as any), gcalEventId: id })
        }
        n++
      }
      setMsg(`${n}개 일정을 구글 캘린더에 동기화했어요. 🎉`)
    } catch (e) {
      setErr(calendarErrorMessage(e))
    } finally {
      setSyncing(false)
    }
  }

  // 가까운 일정 미리보기 (최대 3개)
  const preview = [...targets]
    .sort((a, b) => a.ev.start.localeCompare(b.ev.start))
    .slice(0, 3)

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-ink">📅 구글 캘린더</h2>
      <p className="mb-3 text-sm text-muted">
        마감일 있는 <b className="text-ink">할 일·마일스톤·스프린트</b>와 Capture에서 시간까지 잡아둔
        <b className="text-ink"> 인박스 일정</b>을 구글 캘린더에 내보내요. 버튼을 누르면 캘린더 권한을 한 번
        요청해요.
      </p>

      {targets.length > 0 && (
        <ul className="mb-3 flex flex-col gap-0.5 text-xs text-muted">
          {preview.map((t) => (
            <li key={t.item.id} className="tnum">
              {t.ev.allDay === false ? prettyDateTime(t.ev.start) : prettyDate(t.ev.start)} ·{' '}
              {t.ev.summary}
            </li>
          ))}
          {targets.length > preview.length && <li>… 외 {targets.length - preview.length}개</li>}
        </ul>
      )}

      <Button onClick={sync} disabled={syncing}>
        {syncing ? '동기화 중…' : `구글 캘린더에 동기화 (${targets.length})`}
      </Button>

      {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-600">⚠️ {err}</p>}
    </Card>
  )
}
