import { addMinutes, formatISO, parseISO } from 'date-fns'
import { prettyDate } from './date'
import type { CalEvent } from './gcal'
import type { Todo } from './types'

const DEFAULT_DURATION_MIN = 30

export function scheduledDuration(durationMin?: number | null) {
  if (!durationMin || Number.isNaN(durationMin) || durationMin <= 0) return DEFAULT_DURATION_MIN
  return durationMin
}

export function todoToCalendarEvent(todo: Todo): CalEvent | null {
  const description = todo.notes?.trim() || undefined

  if (todo.scheduledDate && todo.scheduledStart) {
    const startAt = parseISO(`${todo.scheduledDate}T${todo.scheduledStart}`)
    const endAt = addMinutes(startAt, scheduledDuration(todo.durationMin))
    return {
      summary: `✅ ${todo.title}`,
      description,
      start: formatISO(startAt),
      end: formatISO(endAt),
      allDay: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  }

  if (todo.dueDate) {
    return {
      summary: `✅ ${todo.title}`,
      description,
      start: todo.dueDate,
    }
  }

  return null
}

export function todoScheduleLabel(todo: Todo) {
  if (!todo.scheduledDate || !todo.scheduledStart) return null
  return `${prettyDate(todo.scheduledDate)} · ${todo.scheduledStart} · ${scheduledDuration(
    todo.durationMin,
  )}분`
}
