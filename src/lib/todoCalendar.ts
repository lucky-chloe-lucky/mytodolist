import { addDays, addMinutes, differenceInMinutes, formatISO, parseISO } from 'date-fns'
import { prettyDate } from './date'
import type { CalEvent, CalendarEventRecord } from './gcal'
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
      flowRef: {
        collection: 'todos',
        itemId: todo.id,
      },
    }
  }

  if (todo.dueDate) {
    return {
      summary: `✅ ${todo.title}`,
      description,
      start: todo.dueDate,
      flowRef: {
        collection: 'todos',
        itemId: todo.id,
      },
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

function cleanSummary(summary: string) {
  return summary.replace(/^✅\s*/, '').trim() || summary.trim()
}

export function applyCalendarEventToTodo(todo: Todo, event: CalendarEventRecord): Todo {
  const next: Todo = {
    ...todo,
    title: cleanSummary(event.summary),
    gcalEventId: event.id,
  }

  if (event.description?.trim()) next.notes = event.description.trim()
  else delete next.notes

  if (event.allDay) {
    next.dueDate = event.start
    next.scheduledDate = null
    next.scheduledStart = null
    next.durationMin = null
    next.triageStage = 'triaged'
    return next
  }

  const startAt = parseISO(event.start)
  const endAt = event.end ? parseISO(event.end) : addMinutes(startAt, 30)
  next.scheduledDate = event.start.slice(0, 10)
  next.scheduledStart = event.start.slice(11, 16)
  next.durationMin = Math.max(5, differenceInMinutes(endAt, startAt))
  next.dueDate = next.dueDate ?? next.scheduledDate
  next.triageStage = 'scheduled'
  return next
}

export function allDayEndToInclusiveDate(end?: string) {
  if (!end) return undefined
  return formatISO(addDays(parseISO(end), -1), { representation: 'date' })
}
