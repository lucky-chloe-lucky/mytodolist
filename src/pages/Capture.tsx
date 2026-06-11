import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Modal } from '../components/Modal'
import {
  calendarErrorMessage,
  getCalendarToken,
  upsertEvent,
} from '../lib/gcal'
import { todayKey } from '../lib/date'
import { useApp } from '../store/AppStore'
import { uid } from '../lib/backend'
import type { Quadrant, Todo, TodoArea, TodoAreaCategory } from '../lib/types'
import { scheduledDuration, todoScheduleLabel, todoToCalendarEvent } from '../lib/todoCalendar'
import {
  findTodoArea,
  isDefaultTodoArea,
  mergeTodoAreas,
  todoAreaTone,
} from '../lib/todoAreas'
import {
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Select,
  TextArea,
  TextInput,
} from '../components/ui'

const QUADRANTS: {
  key: Quadrant
  title: string
  subtitle: string
  prompt: string
  frame: string
  pill: string
  dot: string
}[] = [
  {
    key: 'q1',
    title: 'Q1 · Do Now',
    subtitle: '긴급 · 중요',
    prompt: '지금 당장 붙잡을 일',
    frame: 'border-rose-200 bg-rose-50/70',
    pill: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-400',
  },
  {
    key: 'q2',
    title: 'Q2 · Schedule',
    subtitle: '안 긴급 · 중요',
    prompt: '미리 잡아두면 편해지는 일',
    frame: 'border-emerald-200 bg-emerald-50/70',
    pill: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-400',
  },
  {
    key: 'q3',
    title: 'Q3 · Quick',
    subtitle: '긴급 · 안 중요',
    prompt: '짧게 처리하거나 위임할 일',
    frame: 'border-sky-200 bg-sky-50/70',
    pill: 'bg-sky-100 text-sky-700',
    dot: 'bg-sky-400',
  },
  {
    key: 'q4',
    title: 'Q4 · Drop',
    subtitle: '안 긴급 · 안 중요',
    prompt: '과감히 줄여도 되는 일',
    frame: 'border-stone-200 bg-stone-50/80',
    pill: 'bg-stone-200 text-stone-700',
    dot: 'bg-stone-400',
  },
]

const QUADRANT_LABEL: Record<Quadrant, string> = Object.fromEntries(
  QUADRANTS.map((quadrant) => [quadrant.key, quadrant.title.split(' · ')[0]]),
) as Record<Quadrant, string>

const DAY_START_HOUR = 6
const DAY_END_HOUR = 23
const SLOT_MINUTES = 30
const SLOT_HEIGHT = 48
const SCHEDULE_SLOTS = Array.from(
  { length: ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES + 1 },
  (_, index) => minutesToTime(DAY_START_HOUR * 60 + index * SLOT_MINUTES),
)

function sortByRecent(items: Todo[]) {
  return [...items].sort((a, b) => b.createdAt - a.createdAt)
}

function splitCaptureLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseTimeToMinutes(value?: string | null) {
  if (!value) return null
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return hour * 60 + minute
}

function minutesToTime(total: number) {
  const hour = String(Math.floor(total / 60)).padStart(2, '0')
  const minute = String(total % 60).padStart(2, '0')
  return `${hour}:${minute}`
}

export function Capture() {
  const { data, save, remove } = useApp()
  const [draft, setDraft] = useState('')
  const [area, setArea] = useState<TodoArea>('work')
  const [scheduleDate, setScheduleDate] = useState(todayKey())
  const [newAreaLabel, setNewAreaLabel] = useState('')
  const [editingAreas, setEditingAreas] = useState(false)
  const [areaDrafts, setAreaDrafts] = useState<Record<string, string>>({})
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [schedulingTodo, setSchedulingTodo] = useState<Todo | null>(null)
  const [dropSlot, setDropSlot] = useState<string | null>(null)
  const [dropQuadrant, setDropQuadrant] = useState<Quadrant | 'inbox' | null>(null)
  const dragId = useRef<string | null>(null)
  const areas = useMemo(() => mergeTodoAreas(data.todoAreas), [data.todoAreas])

  const captured = useMemo(
    () =>
      sortByRecent(
        data.todos.filter(
          (todo) =>
            todo.status !== 'done' &&
            todo.triageStage !== 'scheduled' &&
            (todo.triageStage === 'inbox' ||
              todo.triageStage === 'triaged' ||
              todo.quadrant != null),
        ),
      ),
    [data.todos],
  )

  const inbox = useMemo(
    () => captured.filter((todo) => todo.triageStage === 'inbox' || todo.quadrant == null),
    [captured],
  )

  const scheduledForDay = useMemo(
    () =>
      [...data.todos]
        .filter(
          (todo) =>
            todo.status !== 'done' &&
            todo.scheduledDate === scheduleDate &&
            Boolean(todo.scheduledStart),
        )
        .sort((left, right) => {
          const leftTime = parseTimeToMinutes(left.scheduledStart) ?? 0
          const rightTime = parseTimeToMinutes(right.scheduledStart) ?? 0
          if (leftTime !== rightTime) return leftTime - rightTime
          return left.createdAt - right.createdAt
        }),
    [data.todos, scheduleDate],
  )

  const quadrantItems = useMemo(
    () =>
      Object.fromEntries(
        QUADRANTS.map((quadrant) => [
          quadrant.key,
          captured.filter((todo) => todo.quadrant === quadrant.key),
        ]),
      ) as Record<Quadrant, Todo[]>,
    [captured],
  )

  const triageTodo = (todo: Todo, quadrant: Quadrant) => {
    save('todos', {
      ...todo,
      scheduledDate: null,
      scheduledStart: null,
      durationMin: null,
      triageStage: 'triaged',
      quadrant,
    })
  }

  const moveToInbox = (todo: Todo) => {
    save('todos', {
      ...todo,
      scheduledDate: null,
      scheduledStart: null,
      durationMin: null,
      triageStage: 'inbox',
      quadrant: null,
    })
  }

  const scheduleTodoAt = (todo: Todo, start: string) => {
    save('todos', {
      ...todo,
      triageStage: 'scheduled',
      scheduledDate: scheduleDate,
      scheduledStart: start,
      durationMin: scheduledDuration(todo.durationMin),
      dueDate: todo.dueDate ?? scheduleDate,
    })
  }

  const saveTodoDraft = (todo: Todo) => {
    save('todos', todo)
  }

  const setTodoArea = (todo: Todo, nextArea: TodoArea | null) => {
    save('todos', {
      ...todo,
      area: nextArea,
    })
  }

  const renameArea = (base: TodoAreaCategory, nextLabel: string) => {
    const label = nextLabel.trim()
    setAreaDrafts((current) => ({ ...current, [base.id]: label || base.label }))
    if (!label || label === base.label) return
    save('todoAreas', { ...base, label })
  }

  const addArea = () => {
    const label = newAreaLabel.trim()
    if (!label) return
    save('todoAreas', { id: uid(), label, createdAt: Date.now() })
    setNewAreaLabel('')
  }

  const deleteArea = async (target: TodoAreaCategory) => {
    if (isDefaultTodoArea(target.id)) return
    const impacted = data.todos.filter((todo) => todo.area === target.id)
    await Promise.all(
      impacted.map((todo) =>
        save('todos', {
          ...todo,
          area: 'other',
        }),
      ),
    )
    await remove('todoAreas', target.id)
    if (area === target.id) setArea('other')
  }

  const submitCapture = () => {
    const lines = splitCaptureLines(draft)
    if (lines.length === 0) return

    lines.forEach((title) => {
      save('todos', {
        id: uid(),
        title,
        status: 'todo',
        priority: 'medium',
        triageStage: 'inbox',
        quadrant: null,
        area,
        projectId: null,
        sprintId: null,
        createdAt: Date.now(),
        completedAt: null,
      })
    })

    setDraft('')
  }

  const onDropTo = (target: Quadrant | 'inbox') => {
    const todo = data.todos.find((item) => item.id === dragId.current)
    if (!todo) return
    if (target === 'inbox') moveToInbox(todo)
    else triageTodo(todo, target)
    dragId.current = null
    setDropQuadrant(null)
    setDropSlot(null)
  }

  const onDropToSchedule = (start: string) => {
    const todo = data.todos.find((item) => item.id === dragId.current)
    if (!todo) return
    scheduleTodoAt(todo, start)
    dragId.current = null
    setDropSlot(null)
  }

  const triagedCount = QUADRANTS.reduce(
    (sum, quadrant) => sum + quadrantItems[quadrant.key].length,
    0,
  )

  return (
    <>
      <PageHeader
        title="Capture"
        subtitle="브레인 덤프를 inbox에 모으고 Q1~Q4로 빠르게 분류해요"
        action={
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">
            미분류 {inbox.length} · 분류됨 {triagedCount}
          </span>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="border-dashed">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Inbox</p>
          <p className="mt-2 text-3xl font-semibold text-ink metric">{inbox.length}</p>
          <p className="mt-1 text-sm text-muted">떠오른 일을 일단 모아두는 칸</p>
        </Card>
        <Card className="border-dashed">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Focus</p>
          <p className="mt-2 text-3xl font-semibold text-ink metric">
            {quadrantItems.q1.length + quadrantItems.q2.length}
          </p>
          <p className="mt-1 text-sm text-muted">지금 하거나 일정으로 잡을 핵심 일</p>
        </Card>
        <Card className="border-dashed">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Later</p>
          <p className="mt-2 text-3xl font-semibold text-ink metric">
            {quadrantItems.q3.length + quadrantItems.q4.length}
          </p>
          <p className="mt-1 text-sm text-muted">빠르게 처리하거나 줄여도 되는 일</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card
          onDragOver={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            setDropQuadrant('inbox')
          }}
          onDragLeave={() => setDropQuadrant((current) => (current === 'inbox' ? null : current))}
          onDrop={() => onDropTo('inbox')}
          className={[
            'flex h-fit flex-col gap-3 xl:sticky xl:top-8',
            dropQuadrant === 'inbox' ? 'border-brand-400 bg-brand-50/80' : '',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Brain Dump</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">Inbox</h2>
            </div>
            <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
              {inbox.length} items
            </span>
          </div>

          {inbox.length === 0 ? (
            <EmptyState
              icon="📥"
              title="비어 있어요"
              hint="아래 quick capture bar에 떠오른 일을 붙여 넣어보세요"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {inbox.map((todo) => (
                <CaptureTodoCard
                  key={todo.id}
                  todo={todo}
                  areas={areas}
                  onDelete={() => remove('todos', todo.id)}
                  onEdit={() => setEditingTodo(todo)}
                  onSchedule={() => setSchedulingTodo(todo)}
                  onDragStart={() => {
                    dragId.current = todo.id
                  }}
                  onAreaChange={(nextArea) => setTodoArea(todo, nextArea)}
                  footer={
                    <div className="flex flex-wrap gap-1">
                      {QUADRANTS.map((quadrant) => (
                        <button
                          key={quadrant.key}
                          onClick={() => triageTodo(todo, quadrant.key)}
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${quadrant.pill}`}
                        >
                          {QUADRANT_LABEL[quadrant.key]}
                        </button>
                      ))}
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {QUADRANTS.map((quadrant) => (
            <Card
              key={quadrant.key}
              onDragOver={(event: DragEvent<HTMLDivElement>) => {
                event.preventDefault()
                setDropQuadrant(quadrant.key)
              }}
              onDragLeave={() =>
                setDropQuadrant((current) => (current === quadrant.key ? null : current))
              }
              onDrop={() => onDropTo(quadrant.key)}
              className={[
                'flex min-h-[280px] flex-col gap-3 border-2 transition',
                quadrant.frame,
                dropQuadrant === quadrant.key ? 'scale-[1.01] shadow-lg' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${quadrant.dot}`} />
                    <h2 className="text-lg font-semibold text-ink">{quadrant.title}</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted">{quadrant.subtitle}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quadrant.pill}`}>
                  {quadrantItems[quadrant.key].length}
                </span>
              </div>

              {quadrantItems[quadrant.key].length === 0 ? (
                <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-line/70 bg-white/40 p-4 text-center">
                  <p className="text-sm text-muted">{quadrant.prompt}</p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-2">
                  {quadrantItems[quadrant.key].map((todo) => (
                    <CaptureTodoCard
                      key={todo.id}
                      todo={todo}
                      areas={areas}
                      onDelete={() => remove('todos', todo.id)}
                      onEdit={() => setEditingTodo(todo)}
                      onSchedule={() => setSchedulingTodo(todo)}
                      onDragStart={() => {
                        dragId.current = todo.id
                      }}
                      onAreaChange={(nextArea) => setTodoArea(todo, nextArea)}
                      footer={
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            onClick={() => moveToInbox(todo)}
                            className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted"
                          >
                            Inbox
                          </button>
                          {QUADRANTS.map((option) => (
                            <button
                              key={option.key}
                              onClick={() => triageTodo(todo, option.key)}
                              className={[
                                'rounded-full px-2 py-1 text-[11px] font-semibold transition',
                                todo.quadrant === option.key
                                  ? option.pill
                                  : 'bg-white/80 text-muted hover:bg-white',
                              ].join(' ')}
                            >
                              {QUADRANT_LABEL[option.key]}
                            </button>
                          ))}
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Schedule Board</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">캘린더처럼 바로 놓기</h2>
            <p className="mt-1 text-sm text-muted">
              인박스나 분류 카드에서 바로 드래그해서 시간대에 놓아보세요. 놓는 순간 일정이 저장돼요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TextInput
              type="date"
              value={scheduleDate}
              onChange={(event) => setScheduleDate(event.target.value)}
              className="w-[168px]"
            />
            {scheduleDate !== todayKey() && (
              <Button variant="subtle" onClick={() => setScheduleDate(todayKey())}>
                오늘
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[88px_minmax(0,1fr)_280px]">
          <div className="hidden xl:flex xl:flex-col xl:gap-2">
            <div className="rounded-xl bg-canvas px-3 py-2 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Date</p>
              <p className="mt-1 text-sm font-semibold text-ink">{scheduleDate}</p>
            </div>
            <div className="rounded-xl bg-canvas px-3 py-2 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Items</p>
              <p className="mt-1 text-lg font-semibold text-ink metric">{scheduledForDay.length}</p>
            </div>
          </div>

          <div className="h-[640px] overflow-y-auto rounded-2xl border border-line bg-white">
            <div className="relative" style={{ height: SCHEDULE_SLOTS.length * SLOT_HEIGHT }}>
              {SCHEDULE_SLOTS.map((slot, index) => (
                <div key={slot} className="flex">
                  <div className="w-16 shrink-0 border-r border-line/70 bg-canvas px-2 pt-1 text-right text-xs font-medium text-muted">
                    {slot}
                  </div>
                  <div
                    onDragOver={(event: DragEvent<HTMLDivElement>) => {
                      event.preventDefault()
                      setDropSlot(slot)
                    }}
                    onDragLeave={() => setDropSlot((current) => (current === slot ? null : current))}
                    onDrop={() => onDropToSchedule(slot)}
                    className={[
                      'relative flex-1 border-b border-line/70 transition',
                      index % 2 === 0 ? 'bg-white' : 'bg-canvas/20',
                      dropSlot === slot ? 'bg-brand-50' : '',
                    ].join(' ')}
                    style={{ height: SLOT_HEIGHT }}
                  />
                </div>
              ))}

              <div className="pointer-events-none absolute inset-y-0 left-16 right-0">
              {scheduledForDay.length === 0 && (
                <div className="grid h-full place-items-center p-6 text-center">
                  <p className="max-w-sm text-sm text-muted">
                    아직 이 날의 일정이 없어요. 인박스 카드를 드래그해서 시간대에 놓거나 카드의
                    `캘린더 붙이기`로 바로 잡아보세요.
                  </p>
                </div>
              )}

              {scheduledForDay.map((todo, index) => {
                const startMinutes = parseTimeToMinutes(todo.scheduledStart) ?? DAY_START_HOUR * 60
                const top = ((startMinutes - DAY_START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT
                const height = (scheduledDuration(todo.durationMin) / SLOT_MINUTES) * SLOT_HEIGHT
                const laneOffset = (index % 3) * 10
                const areaMeta = findTodoArea(areas, todo.area)
                const areaTone = todoAreaTone(todo.area)

                return (
                  <button
                    key={todo.id}
                    type="button"
                    draggable
                    onDragStart={() => {
                      dragId.current = todo.id
                    }}
                    onClick={() => setSchedulingTodo(todo)}
                    className="pointer-events-auto absolute rounded-xl border border-emerald-200 bg-emerald-50/95 px-3 py-2 text-left shadow-[0_8px_20px_rgba(16,185,129,0.12)] transition hover:border-emerald-300"
                    style={{
                      top: top + 2,
                      left: 8 + laneOffset,
                      right: 8 + laneOffset,
                      height: Math.max(height - 4, 40),
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{todo.title}</p>
                        <p className="mt-0.5 text-xs font-medium text-emerald-700">
                          {todo.scheduledStart} · {scheduledDuration(todo.durationMin)}분
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        시간 수정
                      </span>
                    </div>
                    {todo.notes && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{todo.notes}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingTodo(todo)
                        }}
                        className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-muted hover:bg-canvas"
                      >
                        내용
                      </button>
                      {areaMeta && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${areaTone.chip}`}>
                          {areaMeta.label}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          moveToInbox(todo)
                        }}
                        className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-muted hover:bg-canvas"
                      >
                        Inbox로
                      </button>
                    </div>
                  </button>
                )
              })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-canvas/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Scheduled</p>
                <h3 className="mt-1 text-base font-semibold text-ink">이 날에 올라간 일</h3>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-muted">
                {scheduledForDay.length} items
              </span>
            </div>

            <div className="mt-3 flex max-h-[520px] flex-col gap-2 overflow-y-auto">
              {scheduledForDay.length === 0 ? (
                <EmptyState
                  icon="🗓️"
                  title="비어 있어요"
                  hint="왼쪽/위 카드에서 드래그해서 시간대를 채워보세요"
                />
              ) : (
                scheduledForDay.map((todo) => (
                  <button
                    key={todo.id}
                    type="button"
                    onClick={() => setSchedulingTodo(todo)}
                    className="rounded-xl border border-line bg-white px-3 py-3 text-left shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition hover:bg-canvas"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{todo.title}</p>
                        <p className="mt-1 text-xs text-emerald-700">
                          {todo.scheduledStart} · {scheduledDuration(todo.durationMin)}분
                        </p>
                      </div>
                      {todo.gcalEventId && (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                          Google
                        </span>
                      )}
                    </div>
                    {todo.notes && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{todo.notes}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingTodo(todo)
                        }}
                        className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted hover:bg-line"
                      >
                        내용 수정
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 lg:sticky lg:bottom-3">
        <Card className="border-ink bg-surface/95 shadow-[0_12px_30px_rgba(28,25,23,0.14)] backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted">Quick Capture</p>
              <TextArea
                rows={2}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    submitCapture()
                  }
                }}
                placeholder="떠오른 일을 한 줄씩 적어보세요. Enter로 바로 inbox에 붙습니다."
                className="min-h-[76px] !bg-white"
              />
            </div>

            <div className="flex flex-col gap-2 md:w-[250px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted">영역 선택</span>
                <button
                  onClick={() => setEditingAreas((current) => !current)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-50"
                >
                  {editingAreas ? '편집 닫기' : '영역 편집'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((option) => {
                  const tone = todoAreaTone(option.id)
                  return (
                  <button
                    key={option.id}
                    onClick={() => setArea(option.id)}
                    className={[
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      area === option.id ? tone.chip : tone.inactive,
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                  )
                })}
              </div>
              {editingAreas && (
                <div className="rounded-xl border border-line bg-canvas/60 p-3">
                  <div className="flex flex-col gap-2">
                    {areas.map((option) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <TextInput
                          value={areaDrafts[option.id] ?? option.label}
                          onChange={(event) =>
                            setAreaDrafts((current) => ({
                              ...current,
                              [option.id]: event.target.value,
                            }))
                          }
                          onBlur={() =>
                            renameArea(option, areaDrafts[option.id] ?? option.label)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                              event.preventDefault()
                              renameArea(option, areaDrafts[option.id] ?? option.label)
                            }
                          }}
                          className="!py-2 !text-xs"
                        />
                        {!isDefaultTodoArea(option.id) && (
                          <button
                            onClick={() => deleteArea(option)}
                            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <TextInput
                        value={newAreaLabel}
                        onChange={(event) => setNewAreaLabel(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            addArea()
                          }
                        }}
                        placeholder="새 영역 이름"
                        className="!py-2 !text-xs"
                      />
                      <Button
                        variant="subtle"
                        onClick={addArea}
                        disabled={!newAreaLabel.trim()}
                        className="shrink-0 !px-3 !py-2 text-xs"
                      >
                        추가
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <Button onClick={submitCapture} disabled={splitCaptureLines(draft).length === 0}>
                Inbox에 붙이기
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {schedulingTodo && (
        <ScheduleTodoModal todo={schedulingTodo} onClose={() => setSchedulingTodo(null)} />
      )}
      {editingTodo && (
        <EditCaptureTodoModal
          todo={editingTodo}
          areas={areas}
          onClose={() => setEditingTodo(null)}
          onDelete={() => {
            remove('todos', editingTodo.id)
            setEditingTodo(null)
          }}
          onSave={(todo) => {
            saveTodoDraft(todo)
            setEditingTodo(null)
          }}
        />
      )}
    </>
  )
}

function CaptureTodoCard({
  todo,
  areas,
  footer,
  onDelete,
  onEdit,
  onSchedule,
  onDragStart,
  onAreaChange,
}: {
  todo: Todo
  areas: TodoAreaCategory[]
  footer: ReactNode
  onDelete: () => void
  onEdit: () => void
  onSchedule: () => void
  onDragStart: () => void
  onAreaChange: (nextArea: TodoArea | null) => void
}) {
  const meta = findTodoArea(areas, todo.area)
  const tone = todoAreaTone(todo.area)
  const scheduleLabel = todoScheduleLabel(todo)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(28,25,23,0.06)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{todo.title}</p>
          {todo.notes && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{todo.notes}</p>
          )}
        </div>
        {meta && (
          <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${tone.chip}`}>
            {meta.label}
          </span>
        )}
      </div>

      {(scheduleLabel || todo.gcalEventId) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          {scheduleLabel && (
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
              📅 {scheduleLabel}
            </span>
          )}
          {todo.gcalEventId && (
            <span className="rounded-full bg-sky-50 px-2 py-1 font-medium text-sky-700">
              Google 연결됨
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {footer}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={onEdit} className="!px-2.5 !py-1.5 text-xs">
            내용 수정
          </Button>
          <Button variant="subtle" onClick={onSchedule} className="!px-3 !py-1.5 text-xs">
            {todo.gcalEventId ? '캘린더 수정' : '캘린더 붙이기'}
          </Button>
          <Button variant="danger" onClick={onDelete} className="!px-2.5 !py-1.5 text-xs">
            삭제
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Area
            </span>
            <Select
              value={todo.area ?? ''}
              onChange={(event) => onAreaChange(event.target.value || null)}
              className="!py-1.5 !text-xs"
            >
              <option value="">없음</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditCaptureTodoModal({
  todo,
  areas,
  onClose,
  onDelete,
  onSave,
}: {
  todo: Todo
  areas: TodoAreaCategory[]
  onClose: () => void
  onDelete: () => void
  onSave: (todo: Todo) => void
}) {
  const [title, setTitle] = useState(todo.title)
  const [notes, setNotes] = useState(todo.notes ?? '')
  const [area, setArea] = useState(todo.area ?? '')
  const [dueDate, setDueDate] = useState(todo.dueDate ?? '')

  const submit = () => {
    if (!title.trim()) return
    const next: Todo = {
      ...todo,
      title: title.trim(),
      area: area || null,
    }
    if (notes.trim()) next.notes = notes.trim()
    else delete next.notes

    if (dueDate) next.dueDate = dueDate
    else delete next.dueDate

    onSave(next)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="인박스 내용 수정"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button variant="danger" onClick={onDelete}>
            삭제
          </Button>
          <Button onClick={submit} disabled={!title.trim()}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="제목">
          <TextInput
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="무엇을 해야 하나요?"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) submit()
            }}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="영역">
            <Select value={area} onChange={(event) => setArea(event.target.value)}>
              <option value="">없음</option>
              {areas.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="마감일">
            <TextInput
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
        </div>
        <Field label="메모">
          <TextArea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="세부 내용이나 떠오른 맥락을 적어두세요"
          />
        </Field>
      </div>
    </Modal>
  )
}

function ScheduleTodoModal({
  todo,
  onClose,
}: {
  todo: Todo
  onClose: () => void
}) {
  const { cloudConfigured, save } = useApp()
  const [scheduledDate, setScheduledDate] = useState(todo.scheduledDate ?? todo.dueDate ?? todayKey())
  const [scheduledStart, setScheduledStart] = useState(todo.scheduledStart ?? '09:00')
  const [durationMin, setDurationMin] = useState(String(scheduledDuration(todo.durationMin)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setScheduledDate(todo.scheduledDate ?? todo.dueDate ?? todayKey())
    setScheduledStart(todo.scheduledStart ?? '09:00')
    setDurationMin(String(scheduledDuration(todo.durationMin)))
    setSaving(false)
    setError(null)
  }, [todo])

  const buildNextTodo = () => {
    const minutes = scheduledDuration(Number(durationMin))
    const next: Todo = {
      ...todo,
      triageStage: 'scheduled',
      scheduledDate,
      scheduledStart,
      durationMin: minutes,
    }
    if (!next.dueDate) next.dueDate = scheduledDate
    return next
  }

  const persist = async (syncToCalendar: boolean) => {
    if (!scheduledDate || !scheduledStart) return
    setSaving(true)
    setError(null)
    try {
      let next = buildNextTodo()
      await save('todos', next)

      if (syncToCalendar) {
        const token = await getCalendarToken()
        const event = todoToCalendarEvent(next)
        if (!event) throw new Error('캘린더로 보낼 일정 정보가 부족해요.')
        const id = await upsertEvent(token, event, next.gcalEventId)
        if (id !== next.gcalEventId) {
          next = { ...next, gcalEventId: id }
          await save('todos', next)
        }
      }

      onClose()
    } catch (eventError) {
      setError(calendarErrorMessage(eventError))
      setSaving(false)
      return
    }
    setSaving(false)
  }

  const clearScheduledTime = async () => {
    setSaving(true)
    setError(null)
    try {
      await save('todos', {
        ...todo,
        triageStage: 'inbox',
        scheduledDate: null,
        scheduledStart: null,
        durationMin: null,
      })
      onClose()
    } catch (eventError) {
      setError(calendarErrorMessage(eventError))
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="인박스 일정을 캘린더로 보내기"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          {(todo.scheduledDate || todo.scheduledStart) && (
            <Button variant="danger" onClick={clearScheduledTime} disabled={saving}>
              시간 제거
            </Button>
          )}
          <Button variant="subtle" onClick={() => persist(false)} disabled={saving}>
            일정만 저장
          </Button>
          <Button onClick={() => persist(true)} disabled={saving || !cloudConfigured}>
            {saving ? '처리 중…' : todo.gcalEventId ? '캘린더 업데이트' : '구글 캘린더에 붙이기'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-canvas px-3 py-2">
          <p className="text-sm font-medium text-ink">{todo.title}</p>
          <p className="mt-1 text-xs text-muted">
            시간을 저장해두면 설정 화면의 전체 구글 캘린더 동기화에도 함께 포함돼요.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="날짜">
            <TextInput
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
            />
          </Field>
          <Field label="시작 시간">
            <TextInput
              type="time"
              value={scheduledStart}
              onChange={(event) => setScheduledStart(event.target.value)}
            />
          </Field>
          <Field label="길이 (분)">
            <TextInput
              type="number"
              min={5}
              step={5}
              value={durationMin}
              onChange={(event) => setDurationMin(event.target.value)}
              placeholder="30"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          {[30, 60, 90, 120].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setDurationMin(String(minutes))}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                Number(durationMin) === minutes
                  ? 'bg-ink text-white'
                  : 'bg-canvas text-muted hover:bg-line',
              ].join(' ')}
            >
              {minutes}분
            </button>
          ))}
        </div>

        {!todo.dueDate && scheduledDate && (
          <p className="text-xs text-muted">
            마감일이 비어 있으면 이 날짜를 마감일로도 같이 저장해둘게요.
          </p>
        )}
        {!cloudConfigured && (
          <p className="text-sm text-amber-600">
            현재는 로컬 모드라서 구글 캘린더 전송은 꺼져 있어요. 일정만 저장할 수 있습니다.
          </p>
        )}
        {error && <p className="text-sm text-red-600">⚠️ {error}</p>}
      </div>
    </Modal>
  )
}
