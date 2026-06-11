import {
  DEFAULT_TODO_AREAS,
  type TodoArea,
  type TodoAreaCategory,
} from './types'

const AREA_TONES = [
  {
    chip: 'bg-amber-100 text-amber-700',
    inactive: 'bg-canvas text-muted hover:bg-line',
  },
  {
    chip: 'bg-stone-200 text-stone-700',
    inactive: 'bg-canvas text-muted hover:bg-line',
  },
  {
    chip: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-canvas text-muted hover:bg-line',
  },
  {
    chip: 'bg-indigo-100 text-indigo-700',
    inactive: 'bg-canvas text-muted hover:bg-line',
  },
  {
    chip: 'bg-sky-100 text-sky-700',
    inactive: 'bg-canvas text-muted hover:bg-line',
  },
  {
    chip: 'bg-rose-100 text-rose-700',
    inactive: 'bg-canvas text-muted hover:bg-line',
  },
  {
    chip: 'bg-teal-100 text-teal-700',
    inactive: 'bg-canvas text-muted hover:bg-line',
  },
]

function areaHash(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash
}

export function mergeTodoAreas(saved: TodoAreaCategory[]) {
  const savedById = new Map(saved.map((area) => [area.id, area]))
  const defaults = DEFAULT_TODO_AREAS.map((area) => savedById.get(area.id) ?? area)
  const extras = saved
    .filter((area) => !DEFAULT_TODO_AREAS.some((base) => base.id === area.id))
    .sort((a, b) => a.createdAt - b.createdAt)
  return [...defaults, ...extras]
}

export function findTodoArea(
  areas: TodoAreaCategory[],
  areaId?: TodoArea | null,
) {
  if (!areaId) return undefined
  return areas.find((area) => area.id === areaId)
}

export function todoAreaTone(areaId?: TodoArea | null) {
  if (!areaId) return AREA_TONES[0]
  return AREA_TONES[areaHash(areaId) % AREA_TONES.length]
}

export function isDefaultTodoArea(areaId: string) {
  return DEFAULT_TODO_AREAS.some((area) => area.id === areaId)
}
