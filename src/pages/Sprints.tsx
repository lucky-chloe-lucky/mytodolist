import { useMemo, useRef, useState } from 'react'
import { useApp } from '../store/AppStore'
import { uid } from '../lib/backend'
import { dDayLabel, dueState, prettyDate, todayKey } from '../lib/date'
import type { Priority, Sprint, Todo, TodoStatus } from '../lib/types'
import { Modal } from '../components/Modal'
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

const STATUS_META: Record<Sprint['status'], { label: string; cls: string }> = {
  active: { label: '진행 중', cls: 'bg-brand-100 text-brand-700' },
  planned: { label: '예정', cls: 'bg-sky-100 text-sky-700' },
  done: { label: '완료', cls: 'bg-slate-200 text-slate-600' },
}
const STATUS_RANK: Record<Sprint['status'], number> = { active: 0, planned: 1, done: 2 }

// Kanban columns, left → right.
const COLUMNS: { key: TodoStatus; label: string; head: string; dot: string }[] = [
  { key: 'todo', label: '할 일', head: 'text-slate-500', dot: 'bg-slate-300' },
  { key: 'doing', label: '진행 중', head: 'text-amber-600', dot: 'bg-amber-400' },
  { key: 'done', label: '완료', head: 'text-brand-700', dot: 'bg-brand-500' },
  { key: 'hold', label: '보류', head: 'text-sky-600', dot: 'bg-sky-400' },
]
const COLUMN_ORDER: TodoStatus[] = ['todo', 'doing', 'done', 'hold']

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-300',
}

export function Sprints() {
  const { data, save, remove } = useApp()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Sprint | null>(null)

  const sprints = useMemo(
    () =>
      [...data.sprints].sort((a, b) => {
        if (STATUS_RANK[a.status] !== STATUS_RANK[b.status])
          return STATUS_RANK[a.status] - STATUS_RANK[b.status]
        return (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999')
      }),
    [data.sprints],
  )

  return (
    <>
      <PageHeader
        title="스프린트"
        subtitle="목표 기간 단위로 할 일을 묶어 관리해요"
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            + 스프린트
          </Button>
        }
      />

      {sprints.length === 0 ? (
        <EmptyState
          icon="🏃"
          title="스프린트가 없어요"
          hint="기간과 목표를 정하고 할 일을 묶어 진행 상황을 추적해보세요"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sprints.map((s) => (
            <SprintCard
              key={s.id}
              sprint={s}
              onEdit={() => {
                setEditing(s)
                setOpen(true)
              }}
              onDelete={() => remove('sprints', s.id)}
            />
          ))}
        </div>
      )}

      {open && (
        <SprintEditor
          sprint={editing}
          onClose={() => setOpen(false)}
          onSave={(s) => {
            save('sprints', s)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function SprintCard({
  sprint,
  onEdit,
  onDelete,
}: {
  sprint: Sprint
  onEdit: () => void
  onDelete: () => void
}) {
  const { data, save, remove } = useApp()
  const [expanded, setExpanded] = useState(sprint.status === 'active')
  const [title, setTitle] = useState('')
  const [dropCol, setDropCol] = useState<TodoStatus | null>(null)
  const dragId = useRef<string | null>(null)

  const project = sprint.projectId ? data.projects.find((p) => p.id === sprint.projectId) : undefined
  const projectById = useMemo(
    () => Object.fromEntries(data.projects.map((p) => [p.id, p])),
    [data.projects],
  )
  const todos = useMemo(
    () => data.todos.filter((t) => t.sprintId === sprint.id),
    [data.todos, sprint.id],
  )
  const done = todos.filter((t) => t.status === 'done').length
  // Progress excludes held items from the denominator.
  const activeTotal = todos.filter((t) => t.status !== 'hold').length
  const progress = activeTotal ? Math.round((done / activeTotal) * 100) : 0

  const setStatus = (t: Todo, status: TodoStatus) => {
    if (t.status === status) return
    save('todos', { ...t, status, completedAt: status === 'done' ? Date.now() : null })
  }

  // Move a card one column left/right (for touch / no-drag).
  const move = (t: Todo, dir: -1 | 1) => {
    const idx = COLUMN_ORDER.indexOf(t.status)
    const next = COLUMN_ORDER[idx + dir]
    if (next) setStatus(t, next)
  }

  const addTodo = () => {
    if (!title.trim()) return
    save('todos', {
      id: uid(),
      title: title.trim(),
      status: 'todo',
      priority: 'medium',
      projectId: sprint.projectId ?? null,
      sprintId: sprint.id,
      createdAt: Date.now(),
      completedAt: null,
    })
    setTitle('')
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setExpanded((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-muted">{expanded ? '▾' : '▸'}</span>
            <span className="truncate font-semibold text-ink">{sprint.name}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[sprint.status].cls}`}>
              {STATUS_META[sprint.status].label}
            </span>
          </div>
          {sprint.goal && <p className="mt-1 truncate pl-6 text-sm text-muted">🎯 {sprint.goal}</p>}
        </button>
        <div className="flex shrink-0 gap-1 text-xs">
          <button onClick={onEdit} className="rounded-lg px-2 py-1 text-muted hover:bg-canvas">
            수정
          </button>
          <button onClick={onDelete} className="rounded-lg px-2 py-1 text-muted hover:bg-red-50 hover:text-red-600">
            삭제
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-muted">
        {(sprint.startDate || sprint.endDate) && (
          <span className="tnum">
            🗓 {sprint.startDate ? prettyDate(sprint.startDate) : '…'} ~{' '}
            {sprint.endDate ? prettyDate(sprint.endDate) : '…'}
          </span>
        )}
        {project && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ background: `${project.color}1a`, color: project.color }}
          >
            <span className="size-1.5 rounded-full" style={{ background: project.color }} />
            {project.name}
          </span>
        )}
      </div>

      <div className="pl-6">
        <div className="mb-1 flex items-center justify-between text-xs text-muted tnum">
          <span>완료 {done}/{activeTotal}{todos.length > activeTotal ? ` · 보류 ${todos.length - activeTotal}` : ''}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {expanded && (
        <div className="pl-6">
          {/* Kanban board: drag on desktop, ‹ › buttons on touch */}
          <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible">
            {COLUMNS.map((col) => {
              const items = todos.filter((t) => t.status === col.key)
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDropCol(col.key)
                  }}
                  onDragLeave={() => setDropCol((c) => (c === col.key ? null : c))}
                  onDrop={() => {
                    const t = todos.find((x) => x.id === dragId.current)
                    if (t) setStatus(t, col.key)
                    dragId.current = null
                    setDropCol(null)
                  }}
                  className={[
                    'flex min-w-[150px] flex-1 flex-col gap-1.5 rounded-lg border p-2 transition',
                    dropCol === col.key ? 'border-brand-400 bg-brand-50/60' : 'border-line bg-canvas/40',
                  ].join(' ')}
                >
                  <div className={`flex items-center gap-1.5 px-1 text-xs font-semibold ${col.head}`}>
                    <span className={`size-1.5 rounded-full ${col.dot}`} />
                    {col.label}
                    <span className="text-muted tnum">{items.length}</span>
                  </div>

                  {items.map((t) => {
                    const idx = COLUMN_ORDER.indexOf(t.status)
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => (dragId.current = t.id)}
                        className="group rounded-md border border-line bg-surface px-2 py-1.5 shadow-[0_1px_1px_rgba(28,25,23,0.04)]"
                      >
                        <p
                          className={[
                            'text-sm',
                            t.status === 'done' ? 'text-muted line-through' : 'text-ink',
                          ].join(' ')}
                        >
                          {t.title}
                        </p>
                        {(() => {
                          const tProject = t.projectId ? projectById[t.projectId] : undefined
                          const ds = dueState(t.dueDate)
                          if (!t.dueDate && !tProject && t.priority === 'medium') return null
                          return (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                              {t.priority !== 'medium' && (
                                <span className={`size-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                              )}
                              {t.dueDate && t.status !== 'done' && (
                                <span
                                  className={[
                                    'rounded px-1 py-0.5 font-medium tnum',
                                    ds === 'overdue'
                                      ? 'bg-red-100 text-red-700'
                                      : ds === 'today'
                                        ? 'bg-brand-100 text-brand-700'
                                        : 'bg-canvas text-muted',
                                  ].join(' ')}
                                >
                                  {dDayLabel(t.dueDate)}
                                </span>
                              )}
                              {tProject && (
                                <span
                                  className="inline-flex items-center gap-1 truncate"
                                  style={{ color: tProject.color }}
                                >
                                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: tProject.color }} />
                                  {tProject.name}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                        <div className="mt-1 flex items-center gap-1 text-muted">
                          <button
                            onClick={() => move(t, -1)}
                            disabled={idx === 0}
                            className="rounded px-1 text-xs hover:bg-canvas disabled:opacity-30"
                            aria-label="왼쪽 칼럼으로"
                          >
                            ‹
                          </button>
                          <button
                            onClick={() => move(t, 1)}
                            disabled={idx === COLUMN_ORDER.length - 1}
                            className="rounded px-1 text-xs hover:bg-canvas disabled:opacity-30"
                            aria-label="오른쪽 칼럼으로"
                          >
                            ›
                          </button>
                          <button
                            onClick={() => remove('todos', t.id)}
                            className="ml-auto rounded px-1 text-xs opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                            aria-label="할 일 삭제"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div className="mt-2 flex gap-1.5">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="이 스프린트에 할 일 추가 (할 일 칼럼)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) addTodo()
              }}
              className="!py-2 text-sm"
            />
            <Button variant="subtle" onClick={addTodo} className="shrink-0 !px-3">
              +
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function SprintEditor({
  sprint,
  onClose,
  onSave,
}: {
  sprint: Sprint | null
  onClose: () => void
  onSave: (s: Sprint) => void
}) {
  const { data } = useApp()
  const [name, setName] = useState(sprint?.name ?? '')
  const [goal, setGoal] = useState(sprint?.goal ?? '')
  const [projectId, setProjectId] = useState(sprint?.projectId ?? '')
  const [status, setStatus] = useState<Sprint['status']>(sprint?.status ?? 'active')
  const [startDate, setStartDate] = useState(sprint?.startDate ?? todayKey())
  const [endDate, setEndDate] = useState(sprint?.endDate ?? '')

  const submit = () => {
    if (!name.trim()) return
    onSave({
      id: sprint?.id ?? uid(),
      name: name.trim(),
      goal: goal.trim() || undefined,
      projectId: projectId || null,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      createdAt: sprint?.createdAt ?? Date.now(),
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={sprint ? '스프린트 수정' : '새 스프린트'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="이름">
          <TextInput
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 6월 1차 스프린트"
          />
        </Field>
        <Field label="목표">
          <TextArea
            rows={2}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="이 스프린트에서 이루려는 것 (선택)"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="프로젝트">
            <Select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">없음</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="상태">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Sprint['status'])}>
              <option value="active">진행 중</option>
              <option value="planned">예정</option>
              <option value="done">완료</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작일">
            <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="종료일">
            <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
