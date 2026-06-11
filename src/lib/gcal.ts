import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth'
import { addDays, addMinutes, formatISO, parseISO } from 'date-fns'
import { auth } from './firebase'
import { toKey } from './date'

const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

// 세션 동안 캘린더 액세스 토큰 캐시 (Google OAuth 토큰은 ~1시간).
let cached: { token: string; exp: number } | null = null

// 캘린더 권한을 (필요 시) 요청하고 액세스 토큰을 얻는다 — 증분 인증.
export async function getCalendarToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token
  if (!auth) throw new Error('클라우드 모드에서만 사용할 수 있어요.')
  const provider = new GoogleAuthProvider()
  provider.addScope(CAL_SCOPE)
  const user = auth.currentUser
  const result = user
    ? await reauthenticateWithPopup(user, provider)
    : await signInWithPopup(auth, provider)
  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken
  if (!token) throw new Error('캘린더 권한 토큰을 받지 못했어요.')
  cached = { token, exp: Date.now() + 55 * 60 * 1000 }
  return token
}

export function resetCalendarToken() {
  cached = null
}

// 종일 이벤트(날짜만). 구글 캘린더는 end.date가 '제외'라서 +1일.
function allDay(start: string, end?: string) {
  const s = parseISO(start)
  const e = end ? parseISO(end) : s
  return {
    start: { date: toKey(s) },
    end: { date: toKey(addDays(e, 1)) },
  }
}

function timed(start: string, end?: string, timeZone?: string) {
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const startAt = parseISO(start)
  const endAt = end ? parseISO(end) : addMinutes(startAt, 30)
  return {
    start: { dateTime: formatISO(startAt), timeZone: zone },
    end: { dateTime: formatISO(endAt), timeZone: zone },
  }
}

export interface CalEvent {
  summary: string
  description?: string
  start: string // YYYY-MM-DD 또는 ISO datetime
  end?: string // YYYY-MM-DD 또는 ISO datetime
  allDay?: boolean
  timeZone?: string
}

// 이벤트 생성/수정. existingId 있으면 PATCH, 없으면 POST. 반환: 이벤트 id.
export async function upsertEvent(
  token: string,
  ev: CalEvent,
  existingId?: string,
): Promise<string> {
  const body = JSON.stringify({
    summary: ev.summary,
    description: ev.description,
    ...(ev.allDay === false ? timed(ev.start, ev.end, ev.timeZone) : allDay(ev.start, ev.end)),
  })
  const url = existingId ? `${API}/${existingId}` : API
  const method = existingId ? 'PATCH' : 'POST'
  let res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
  })
  // 수정 대상이 삭제됐으면(404/410) 새로 생성.
  if (existingId && (res.status === 404 || res.status === 410)) {
    res = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
    })
  }
  if (!res.ok) {
    const txt = await res.text()
    const err: Error & { status?: number } = new Error(
      `캘린더 API 오류 (${res.status}): ${txt.slice(0, 200)}`,
    )
    err.status = res.status
    throw err
  }
  const json = await res.json()
  return json.id as string
}

export function calendarErrorMessage(error: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = error as any
  const message = any?.message ?? String(error)
  if (any?.code === 'auth/popup-closed-by-user' || /popup-closed|cancel/i.test(message)) {
    return '로그인 창이 닫혔어요. 다시 시도해주세요.'
  }
  if (
    any?.status === 403 ||
    any?.status === 401 ||
    /access|permission|forbidden|insufficient|disabled/i.test(message)
  ) {
    return '권한/설정 문제예요. 구글 클라우드 콘솔에서 ① Calendar API 사용 설정 ② OAuth 동의화면에 캘린더 권한 추가 ③ 본인을 테스트 사용자로 등록 했는지 확인해주세요.'
  }
  return message
}
