import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth'
import { addDays, parseISO } from 'date-fns'
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

export interface CalEvent {
  summary: string
  description?: string
  start: string // YYYY-MM-DD
  end?: string // YYYY-MM-DD (없으면 하루)
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
    ...allDay(ev.start, ev.end),
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
