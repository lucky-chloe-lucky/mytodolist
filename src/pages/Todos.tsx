import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { uid } from '../lib/backend'
import { dDayLabel, dueState, prettyDate, todayKey } from '../lib/date'
import { findTodoArea, mergeTodoAreas, todoAreaTone } from '../lib/todoAreas'
import type { Priority, Quadrant, Todo, TodoArea, TodoStatus } from '../lib/types'
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

const PRIORITY_META: Record<Priority, { label: string; dot: string }> = {
  high: { label: '높음', dot: 'bg-red-500' },
  medium: { label: '보통', dot: 'bg-amber-400' },
  low: { label: '낮음', dot: 'bg-slate-300' },
}

const STATUS_TABS: { key: TodoStatus | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'todo', label: '할 일' },
  { key: 'doing', label: '진행 중' },
  { key: 'done', label: '완료' },
  { key: 'hold', label: '보류' },
]

const QUADRANT_META: Record<Quadrant, { label: string; cls: string }> = {
  q1: { label: 'Q1', cls: 'bg-rose-100 text-rose-700' },
  q2: { label: 'Q2', cls: 'bg-emerald-100 text-emerald-700' },
  q3: { label: 'Q3', cls: 'bg-sky-100 text-sky-700' },
  q4: { label: 'Q4', cls: 'bg-stone-200 text-stone-700' },
}

export function Todos() {
  const { data, save, remove } = useApp()
  const [tab, setTab] = useState<TodoStatus | 'all'>('all')
  const [editing, setEditing] = useState<Todo | null>(null)
  const [open, setOpen] = useState(false)
  const todoAreas = useMemo(() => mergeTodoAreas(data.todoAreas), [data.todoAreas])

  const projectById = useMemo(
    () => Object.fromEntries(data.projects.map((p) => [p.id, p])),
    [data.projects],
  )

  const filtered = useMemo(() => {
    const list = tab === 'all' ? data.todos : data.todos.filter((t) => t.status === tab)
    const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
    return [...list].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1
      if (b.status === 'done' && a.status !== 'done') return -1
      if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority]
      return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
    })
  }, [data.todos, tab])

  const toggle = (t: Todo) => {
    const done = t.status === 'done'
    save('todos', {
      ...t,
      status: done ? 'todo' : 'done',
      completedAt: done ? null : Date.now(),
    })
  }

  const openNew = () => {
    setEditing(null)
    setOpen(true)
  }
  const openEdit = (t: Todo) => {
    setEditing(t)
    setOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Todo"
        subtitle={`${data.todos.filter((t) => t.status !== 'done').length}개 남음`}
        action={<Button onClick={openNew}>+ 할 일</Button>}
      />

      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={[
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              tab === s.key ? 'bg-brand-600 text-white' : 'bg-surface text-muted hover:bg-canvas',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🗒️" title="할 일이 없어요" hint="우측 상단 + 버튼으로 추가해보세요" />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => {
            const project = t.projectId ? projectById[t.projectId] : undefined
            const ds = dueState(t.dueDate)
            const area = findTodoArea(todoAreas, t.area)
            const areaTone = todoAreaTone(t.area)
            return (
              <Card key={t.id} className="flex items-start gap-3 !p-3.5">
                <button
                  onClick={() => toggle(t)}
                  className={[
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition',
                    t.status === 'done'
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-line hover:border-brand-400',
                  ].join(' ')}
                  aria-label="완료 토글"
                >
                  {t.status === 'done' && <span className="text-xs">✓</span>}
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p
                    className={[
                      'truncate font-medium',
                      t.status === 'done' ? 'text-muted line-through' : 'text-ink',
                    ].join(' ')}
                  >
                    {t.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 text-muted">
                      <span className={`size-1.5 rounded-full ${PRIORITY_META[t.priority].dot}`} />
                      {PRIORITY_META[t.priority].label}
                    </span>
                    {t.triageStage === 'inbox' && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-700">
                        INBOX
                      </span>
                    )}
                    {t.quadrant && (
                      <span className={`rounded-full px-2 py-0.5 ${QUADRANT_META[t.quadrant].cls}`}>
                        {QUADRANT_META[t.quadrant].label}
                      </span>
                    )}
                    {area && (
                      <span className={`rounded-full px-2 py-0.5 ${areaTone.chip}`}>
                        {area.label}
                      </span>
                    )}
                    {t.status === 'doing' && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                        진행 중
                      </span>
                    )}
                    {t.status === 'hold' && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">
                        보류
                      </span>
                    )}
                    {t.dueDate && (
                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 tnum',
                          ds === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : ds === 'today'
                              ? 'bg-brand-100 text-brand-700'
                              : 'bg-canvas text-muted',
                        ].join(' ')}
                      >
                        📅 {prettyDate(t.dueDate)}
                        {t.status !== 'done' && (
                          <span className="font-semibold">· {dDayLabel(t.dueDate)}</span>
                        )}
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
                </button>
                <button
                  onClick={() => remove('todos', t.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-muted transition hover:bg-red-50 hover:text-red-600"
                  aria-label="삭제"
                >
                  🗑
                </button>
              </Card>
            )
          })}
        </div>
      )}

      {open && (
        <TodoEditor
          todo={editing}
          todoAreas={todoAreas}
          onClose={() => setOpen(false)}
          onSave={(t) => {
            save('todos', t)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function TodoEditor({
  todo,
  todoAreas,
  onClose,
  onSave,
}: {
  todo: Todo | null
  todoAreas: { id: string; label: string }[]
  onClose: () => void
  onSave: (t: Todo) => void
}) {
  const { data } = useApp()
  const [title, setTitle] = useState(todo?.title ?? '')
  const [notes, setNotes] = useState(todo?.notes ?? '')
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? 'medium')
  const [status, setStatus] = useState<TodoStatus>(todo?.status ?? 'todo')
  const [dueDate, setDueDate] = useState(todo ? (todo.dueDate ?? '') : todayKey())
  const [projectId, setProjectId] = useState(todo?.projectId ?? '')
  const [sprintId, setSprintId] = useState(todo?.sprintId ?? '')
  const [area, setArea] = useState<TodoArea>(todo?.area ?? '')

  const submit = () => {
    if (!title.trim()) return
    const next: Todo = {
      ...(todo ?? { id: uid(), createdAt: Date.now() }),
      title: title.trim(),
      priority,
      status,
      projectId: projectId || null,
      sprintId: sprintId || null,
      area: area || null,
      completedAt: status === 'done' ? (todo?.completedAt ?? Date.now()) : null,
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
      title={todo ? '할 일 수정' : '새 할 일'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="무엇을 해야 하나요?"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="우선순위">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </Select>
          </Field>
          <Field label="상태">
            <Select value={status} onChange={(e) => setStatus(e.target.value as TodoStatus)}>
              <option value="todo">할 일</option>
              <option value="doing">진행 중</option>
              <option value="done">완료</option>
              <option value="hold">보류</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="마감일">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
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
        </div>
        <Field label="스프린트">
          <Select value={sprintId ?? ''} onChange={(e) => setSprintId(e.target.value)}>
            <option value="">없음</option>
            {data.sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="영역">
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">없음</option>
            {todoAreas.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="메모">
          <TextArea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="세부 내용 (선택)"
          />
        </Field>
        {todo && (
          <p className="text-xs text-muted">오늘 날짜: {todayKey()}</p>
        )}
      </div>
    </Modal>
  )
}
