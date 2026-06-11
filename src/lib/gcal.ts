import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth'
import { addDays, addMinutes, formatISO, parseISO } from 'date-fns'
import { auth } from './firebase'
import { toKey } from './date'

const CAL_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const CAL_LIST_SCOPE = 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
const API_ROOT = 'https://www.googleapis.com/calendar/v3'
const CALENDAR_LIST_API = `${API_ROOT}/users/me/calendarList`

function eventsApi(calendarId = 'primary') {
  return `${API_ROOT}/calendars/${encodeURIComponent(calendarId)}/events`
}

// 세션 동안 캘린더 액세스 토큰 캐시 (Google OAuth 토큰은 ~1시간).
let cached: { token: string; exp: number } | null = null

// 캘린더 권한을 (필요 시) 요청하고 액세스 토큰을 얻는다 — 증분 인증.
export async function getCalendarToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token
  if (!auth) throw new Error('클라우드 모드에서만 사용할 수 있어요.')
  const provider = new GoogleAuthProvider()
  provider.addScope(CAL_EVENTS_SCOPE)
  provider.addScope(CAL_LIST_SCOPE)
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

export interface FlowRef {
  collection: 'todos' | 'milestones' | 'sprints'
  itemId: string
}

export interface CalendarListRecord {
  id: string
  name: string
  color?: string
  primary: boolean
  selected: boolean
}

export interface CalEvent {
  summary: string
  description?: string
  start: string // YYYY-MM-DD 또는 ISO datetime
  end?: string // YYYY-MM-DD 또는 ISO datetime
  allDay?: boolean
  timeZone?: string
  flowRef?: FlowRef
}

export interface CalendarEventRecord {
  id: string
  calendarId: string
  calendarName: string
  calendarColor?: string
  summary: string
  description?: string
  start: string
  end?: string
  allDay: boolean
  timeZone?: string
  flowRef?: FlowRef
}

function eventBody(ev: CalEvent) {
  return {
    summary: ev.summary,
    description: ev.description,
    ...(ev.allDay === false ? timed(ev.start, ev.end, ev.timeZone) : allDay(ev.start, ev.end)),
    ...(ev.flowRef
      ? {
          extendedProperties: {
            private: {
              flowCollection: ev.flowRef.collection,
              flowItemId: ev.flowRef.itemId,
            },
          },
        }
      : {}),
  }
}

function parseCalendarEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
  calendar: CalendarListRecord,
): CalendarEventRecord | null {
  if (!raw?.id || raw?.status === 'cancelled') return null
  const allDay = Boolean(raw.start?.date && !raw.start?.dateTime)
  const flowCollection = raw.extendedProperties?.private?.flowCollection
  const flowItemId = raw.extendedProperties?.private?.flowItemId
  return {
    id: raw.id as string,
    calendarId: calendar.id,
    calendarName: calendar.name,
    calendarColor: calendar.color,
    summary: (raw.summary as string | undefined) ?? '(제목 없음)',
    description: raw.description as string | undefined,
    start: (raw.start?.dateTime as string | undefined) ?? (raw.start?.date as string),
    end: (raw.end?.dateTime as string | undefined) ?? (raw.end?.date as string | undefined),
    allDay,
    timeZone: (raw.start?.timeZone as string | undefined) ?? (raw.end?.timeZone as string | undefined),
    flowRef:
      flowCollection && flowItemId
        ? {
            collection: flowCollection as FlowRef['collection'],
            itemId: flowItemId as string,
          }
        : undefined,
  }
}

// 이벤트 생성/수정. existingId 있으면 PATCH, 없으면 POST. 반환: 이벤트 id.
export async function upsertEvent(
  token: string,
  ev: CalEvent,
  existingId?: string,
): Promise<string> {
  const body = JSON.stringify(eventBody(ev))
  const url = existingId ? `${eventsApi()}/${existingId}` : eventsApi()
  const method = existingId ? 'PATCH' : 'POST'
  let res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
  })
  // 수정 대상이 삭제됐으면(404/410) 새로 생성.
  if (existingId && (res.status === 404 || res.status === 410)) {
    res = await fetch(eventsApi(), {
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

function parseCalendarListEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
): CalendarListRecord | null {
  if (!raw?.id) return null
  return {
    id: raw.id as string,
    name:
      (raw.summaryOverride as string | undefined) ??
      (raw.summary as string | undefined) ??
      'Google Calendar',
    color: raw.backgroundColor as string | undefined,
    primary: Boolean(raw.primary),
    selected: raw.selected !== false,
  }
}

async function listCalendars(token: string): Promise<CalendarListRecord[]> {
  const calendars: CalendarListRecord[] = []
  let pageToken: string | null = null

  do {
    const url = new URL(CALENDAR_LIST_API)
    url.searchParams.set('showHidden', 'false')
    url.searchParams.set('maxResults', '250')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const txt = await res.text()
      const err: Error & { status?: number } = new Error(
        `캘린더 API 오류 (${res.status}): ${txt.slice(0, 200)}`,
      )
      err.status = res.status
      throw err
    }

    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of (json.items as any[] | undefined) ?? []) {
      const calendar = parseCalendarListEntry(item)
      if (calendar) calendars.push(calendar)
    }
    pageToken = (json.nextPageToken as string | undefined) ?? null
  } while (pageToken)

  return calendars
}

export async function getEvent(token: string, id: string): Promise<CalendarEventRecord | null> {
  const primary: CalendarListRecord = {
    id: 'primary',
    name: '내 캘린더',
    primary: true,
    selected: true,
  }
  const res = await fetch(`${eventsApi()}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404 || res.status === 410) return null
  if (!res.ok) {
    const txt = await res.text()
    const err: Error & { status?: number } = new Error(
      `캘린더 API 오류 (${res.status}): ${txt.slice(0, 200)}`,
    )
    err.status = res.status
    throw err
  }
  const json = await res.json()
  return parseCalendarEvent(json, primary)
}

async function listEventsForCalendar(
  token: string,
  calendar: CalendarListRecord,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEventRecord[]> {
  const events: CalendarEventRecord[] = []
  let pageToken: string | null = null

  do {
    const url = new URL(eventsApi(calendar.id))
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '2500')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const txt = await res.text()
      const err: Error & { status?: number } = new Error(
        `캘린더 API 오류 (${res.status}): ${txt.slice(0, 200)}`,
      )
      err.status = res.status
      throw err
    }

    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of (json.items as any[] | undefined) ?? []) {
      const event = parseCalendarEvent(item, calendar)
      if (event) events.push(event)
    }
    pageToken = (json.nextPageToken as string | undefined) ?? null
  } while (pageToken)

  return events
}

export async function listEvents(
  token: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEventRecord[]> {
  const calendars = await listCalendars(token)
  const visibleCalendars = calendars.filter((calendar) => calendar.selected)
  if (visibleCalendars.length === 0) return []

  const settled = await Promise.allSettled(
    visibleCalendars.map((calendar) => listEventsForCalendar(token, calendar, timeMin, timeMax)),
  )

  const successes = settled.filter(
    (result): result is PromiseFulfilledResult<CalendarEventRecord[]> => result.status === 'fulfilled',
  )
  if (successes.length === 0) {
    const firstFailure = settled.find((result) => result.status === 'rejected')
    throw firstFailure?.reason ?? new Error('캘린더 목록을 읽지 못했어요.')
  }

  return successes
    .flatMap((result) => result.value)
    .sort((left, right) => left.start.localeCompare(right.start))
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
