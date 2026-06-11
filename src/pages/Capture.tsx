import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useApp } from '../store/AppStore'
import { uid } from '../lib/backend'
import type { Quadrant, Todo, TodoArea, TodoAreaCategory } from '../lib/types'
import {
  findTodoArea,
  isDefaultTodoArea,
  mergeTodoAreas,
  todoAreaTone,
} from '../lib/todoAreas'
import { Button, Card, EmptyState, PageHeader, Select, TextArea, TextInput } from '../components/ui'

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

function sortByRecent(items: Todo[]) {
  return [...items].sort((a, b) => b.createdAt - a.createdAt)
}

function splitCaptureLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function Capture() {
  const { data, save, remove } = useApp()
  const [draft, setDraft] = useState('')
  const [area, setArea] = useState<TodoArea>('work')
  const [newAreaLabel, setNewAreaLabel] = useState('')
  const [editingAreas, setEditingAreas] = useState(false)
  const [areaDrafts, setAreaDrafts] = useState<Record<string, string>>({})
  const [dropQuadrant, setDropQuadrant] = useState<Quadrant | 'inbox' | null>(null)
  const dragId = useRef<string | null>(null)
  const areas = useMemo(() => mergeTodoAreas(data.todoAreas), [data.todoAreas])

  const captured = useMemo(
    () =>
      sortByRecent(
        data.todos.filter(
          (todo) =>
            todo.status !== 'done' &&
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
      triageStage: 'triaged',
      quadrant,
    })
  }

  const moveToInbox = (todo: Todo) => {
    save('todos', {
      ...todo,
      triageStage: 'inbox',
      quadrant: null,
    })
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
    const todo = captured.find((item) => item.id === dragId.current)
    if (!todo) return
    if (target === 'inbox') moveToInbox(todo)
    else triageTodo(todo, target)
    dragId.current = null
    setDropQuadrant(null)
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
    </>
  )
}

function CaptureTodoCard({
  todo,
  areas,
  footer,
  onDragStart,
  onAreaChange,
}: {
  todo: Todo
  areas: TodoAreaCategory[]
  footer: ReactNode
  onDragStart: () => void
  onAreaChange: (nextArea: TodoArea | null) => void
}) {
  const meta = findTodoArea(areas, todo.area)
  const tone = todoAreaTone(todo.area)

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

      <div className="mt-3 flex flex-col gap-2">
        {footer}
        <div className="flex items-center gap-2">
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
  )
}
