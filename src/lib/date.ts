import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isPast,
  parseISO,
  startOfWeek,
} from 'date-fns'

// Local-timezone YYYY-MM-DD for "today".
export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

// Pretty Korean-ish label, e.g. "6월 2일 (월)".
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
export function prettyDate(key: string): string {
  const d = parseISO(key)
  return `${format(d, 'M월 d일')} (${WEEKDAYS[d.getDay()]})`
}

export function prettyDateFull(key: string): string {
  const d = parseISO(key)
  return `${format(d, 'yyyy년 M월 d일')} (${WEEKDAYS[d.getDay()]})`
}

export function prettyDateTime(key: string): string {
  const d = parseISO(key)
  return `${format(d, 'M월 d일')} (${WEEKDAYS[d.getDay()]}) ${format(d, 'HH:mm')}`
}

// ── Week helpers (week starts Sunday, like the reference) ────────────

// The key of the week that contains `key`: that week's Sunday, YYYY-MM-DD.
export function weekKeyOf(key: string): string {
  return toKey(startOfWeek(parseISO(key), { weekStartsOn: 0 }))
}

// 7 date keys (Sun..Sat) for the week starting at `weekKey`.
export function weekDays(weekKey: string): string[] {
  const start = parseISO(weekKey)
  return Array.from({ length: 7 }, (_, i) => toKey(addDays(start, i)))
}

// "26.05.31(일) - 26.06.06(토)"
export function prettyWeekRange(weekKey: string): string {
  const start = parseISO(weekKey)
  const end = addDays(start, 6)
  const fmt = (d: Date) => `${format(d, 'yy.MM.dd')}(${WEEKDAYS[d.getDay()]})`
  return `${fmt(start)} - ${fmt(end)}`
}

// Due-date status for coloring chips.
export function dueState(key?: string): 'none' | 'today' | 'overdue' | 'future' {
  if (!key) return 'none'
  const d = parseISO(key)
  if (isToday(d)) return 'today'
  if (isPast(d)) return 'overdue'
  return 'future'
}

// How far away the date is, as a short Korean label: "오늘", "D-3", "3일 지남".
export function dDayLabel(key: string): string {
  const diff = differenceInCalendarDays(parseISO(key), parseISO(todayKey()))
  if (diff === 0) return '오늘'
  if (diff > 0) return `D-${diff}`
  return `${-diff}일 지남`
}
