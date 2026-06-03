import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { uid } from '../lib/backend'
import { dueState, prettyDate, todayKey } from '../lib/date'
import { PROJECT_COLORS, type Milestone, type Project } from '../lib/types'
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

const STATUS_META: Record<Project['status'], { label: string; cls: string }> = {
  active: { label: '진행 중', cls: 'bg-emerald-100 text-emerald-700' },
  paused: { label: '보류', cls: 'bg-amber-100 text-amber-700' },
  done: { label: '완료', cls: 'bg-slate-200 text-slate-600' },
}

export function Projects() {
  const { data, save, remove } = useApp()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  return (
    <>
      <PageHeader
        title="프로젝트"
        subtitle={`${data.projects.length}개 프로젝트`}
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            + 프로젝트
          </Button>
        }
      />

      {data.projects.length === 0 ? (
        <EmptyState
          icon="📁"
          title="아직 프로젝트가 없어요"
          hint="업무 단위로 프로젝트를 만들고 할 일과 마일스톤을 연결해보세요"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={() => {
                setEditing(p)
                setOpen(true)
              }}
              onDelete={() => remove('projects', p.id)}
            />
          ))}
        </div>
      )}

      {open && (
        <ProjectEditor
          project={editing}
          onClose={() => setOpen(false)}
          onSave={(p) => {
            save('projects', p)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project
  onEdit: () => void
  onDelete: () => void
}) {
  const { data, save, remove } = useApp()
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDue, setMilestoneDue] = useState(todayKey())

  const milestones = useMemo(
    () =>
      data.milestones
        .filter((m) => m.projectId === project.id)
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')),
    [data.milestones, project.id],
  )
  const todos = data.todos.filter((t) => t.projectId === project.id)
  const doneMs = milestones.filter((m) => m.done).length
  const progress = milestones.length ? Math.round((doneMs / milestones.length) * 100) : 0

  const addMilestone = () => {
    if (!milestoneTitle.trim()) return
    save('milestones', {
      id: uid(),
      projectId: project.id,
      title: milestoneTitle.trim(),
      dueDate: milestoneDue || undefined,
      done: false,
      createdAt: Date.now(),
    })
    setMilestoneTitle('')
    setMilestoneDue(todayKey())
  }

  const toggleMilestone = (m: Milestone) => save('milestones', { ...m, done: !m.done })

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="size-3 shrink-0 rounded-full" style={{ background: project.color }} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{project.name}</p>
            {project.description && (
              <p className="truncate text-sm text-muted">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[project.status].cls}`}>
            {STATUS_META[project.status].label}
          </span>
        </div>
      </div>

      {(project.startDate || project.endDate) && (
        <p className="text-xs text-muted">
          🗓 {project.startDate ? prettyDate(project.startDate) : '…'} ~{' '}
          {project.endDate ? prettyDate(project.endDate) : '…'}
        </p>
      )}

      {milestones.length > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>마일스톤 {doneMs}/{milestones.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: project.color }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {milestones.map((m) => {
          const ds = dueState(m.dueDate)
          return (
            <div key={m.id} className="flex items-center gap-2 text-sm">
              <button
                onClick={() => toggleMilestone(m)}
                className={[
                  'grid size-4 shrink-0 place-items-center rounded border text-[10px] transition',
                  m.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-line',
                ].join(' ')}
              >
                {m.done && '✓'}
              </button>
              <span className={m.done ? 'text-muted line-through' : 'text-ink'}>{m.title}</span>
              {m.dueDate && (
                <span
                  className={[
                    'ml-auto rounded-full px-1.5 py-0.5 text-[11px]',
                    ds === 'overdue' && !m.done
                      ? 'bg-red-100 text-red-700'
                      : 'bg-canvas text-muted',
                  ].join(' ')}
                >
                  {prettyDate(m.dueDate)}
                </span>
              )}
              <button
                onClick={() => remove('milestones', m.id)}
                className="rounded px-1 text-muted hover:text-red-600"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex gap-1.5">
        <TextInput
          value={milestoneTitle}
          onChange={(e) => setMilestoneTitle(e.target.value)}
          placeholder="마일스톤 추가"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) addMilestone()
          }}
          className="!py-2 text-sm"
        />
        <TextInput
          type="date"
          value={milestoneDue}
          onChange={(e) => setMilestoneDue(e.target.value)}
          className="!w-36 !py-2 text-sm"
        />
        <Button variant="subtle" onClick={addMilestone} className="shrink-0 !px-3">
          +
        </Button>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-2 text-xs text-muted">
        <span>연결된 할 일 {todos.length}개</span>
        <div className="flex gap-1">
          <button onClick={onEdit} className="rounded-lg px-2 py-1 hover:bg-canvas">
            수정
          </button>
          <button onClick={onDelete} className="rounded-lg px-2 py-1 hover:bg-red-50 hover:text-red-600">
            삭제
          </button>
        </div>
      </div>
    </Card>
  )
}

function ProjectEditor({
  project,
  onClose,
  onSave,
}: {
  project: Project | null
  onClose: () => void
  onSave: (p: Project) => void
}) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0])
  const [status, setStatus] = useState<Project['status']>(project?.status ?? 'active')
  const [startDate, setStartDate] = useState(project?.startDate ?? todayKey())
  const [endDate, setEndDate] = useState(project?.endDate ?? '')

  const submit = () => {
    if (!name.trim()) return
    onSave({
      id: project?.id ?? uid(),
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      createdAt: project?.createdAt ?? Date.now(),
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? '프로젝트 수정' : '새 프로젝트'}
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
            placeholder="프로젝트 이름"
          />
        </Field>
        <Field label="설명">
          <TextArea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="간단한 설명 (선택)"
          />
        </Field>
        <Field label="색상">
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={[
                  'size-8 rounded-full transition',
                  color === c ? 'ring-2 ring-offset-2 ring-brand-400' : '',
                ].join(' ')}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>
        <Field label="상태">
          <Select value={status} onChange={(e) => setStatus(e.target.value as Project['status'])}>
            <option value="active">진행 중</option>
            <option value="paused">보류</option>
            <option value="done">완료</option>
          </Select>
        </Field>
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
