import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { getCalendarToken, upsertEvent, type CalEvent } from '../lib/gcal'
import { prettyDate } from '../lib/date'
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
    for (const t of data.todos)
      if (t.dueDate && t.status !== 'done')
        list.push({ coll: 'todos', item: t, ev: { summary: `✅ ${t.title}`, start: t.dueDate } })
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const any = e as any
      const m = any?.message ?? String(e)
      if (any?.code === 'auth/popup-closed-by-user' || /popup-closed|cancel/i.test(m))
        setErr('로그인 창이 닫혔어요. 다시 시도해주세요.')
      else if (any?.status === 403 || any?.status === 401 || /access|permission|forbidden|insufficient|disabled/i.test(m))
        setErr(
          '권한/설정 문제예요. 구글 클라우드 콘솔에서 ① Calendar API 사용 설정 ② OAuth 동의화면에 캘린더 권한 추가 ③ 본인을 테스트 사용자로 등록 했는지 확인해주세요.',
        )
      else setErr(m)
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
        마감일 있는 <b className="text-ink">할 일·마일스톤·스프린트</b>를 구글 캘린더에 이벤트로 내보내요. (한 방향)
        버튼을 누르면 캘린더 권한을 한 번 요청해요.
      </p>

      {targets.length > 0 && (
        <ul className="mb-3 flex flex-col gap-0.5 text-xs text-muted">
          {preview.map((t) => (
            <li key={t.item.id} className="tnum">
              {prettyDate(t.ev.start)} · {t.ev.summary}
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
