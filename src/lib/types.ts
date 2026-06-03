// ── Shared types for all four features ───────────────────────────────

export type Priority = 'low' | 'medium' | 'high'
export type TodoStatus = 'todo' | 'doing' | 'done' | 'hold'

export interface Todo {
  id: string
  title: string
  notes?: string
  status: TodoStatus
  priority: Priority
  dueDate?: string // YYYY-MM-DD
  projectId?: string | null
  sprintId?: string | null
  createdAt: number
  completedAt?: number | null
}

export interface Sprint {
  id: string
  name: string
  goal?: string
  projectId?: string | null
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  status: 'planned' | 'active' | 'done'
  createdAt: number
}

export interface Project {
  id: string
  name: string
  description?: string
  color: string // hex, e.g. #6366f1
  status: 'active' | 'paused' | 'done'
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  createdAt: number
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  dueDate?: string // YYYY-MM-DD
  done: boolean
  createdAt: number
}

export interface DailyReport {
  id: string // = date, YYYY-MM-DD (one report per day)
  date: string
  content: string
  mood?: string // emoji
  updatedAt: number
}

export interface Kpt {
  id: string // = date, YYYY-MM-DD (one KPT per day)
  date: string
  keep: string
  problem: string
  try: string
  updatedAt: number
}

export interface Habit {
  id: string
  name: string
  createdAt: number
  done: string[] // checked dateKeys (YYYY-MM-DD)
}

export interface WeeklyNote {
  id: string // = weekKey, the week's Sunday (YYYY-MM-DD)
  weekKey: string
  content: string
  updatedAt: number
}

export interface TimeBlocks {
  id: string // = date, YYYY-MM-DD
  date: string
  slots: Record<string, string> // slotKey "H:col" -> color hex
  updatedAt: number
}

// User-defined meaning for a time-tracker color (id = color hex).
export interface TimeCategory {
  id: string
  color: string
  label: string
}

// Maps a collection name to its record type.
export interface Schema {
  todos: Todo
  projects: Project
  milestones: Milestone
  sprints: Sprint
  reports: DailyReport
  kpts: Kpt
  habits: Habit
  weeklyNotes: WeeklyNote
  timeblocks: TimeBlocks
  timeCategories: TimeCategory
}

export type CollectionName = keyof Schema

export const COLLECTIONS: CollectionName[] = [
  'todos',
  'projects',
  'milestones',
  'sprints',
  'reports',
  'kpts',
  'habits',
  'weeklyNotes',
  'timeblocks',
  'timeCategories',
]

export const PROJECT_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
]

// Activity colors for the time-block tracker (paint palette).
export const TIMEBLOCK_COLORS = ['#84cc16', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6']

// Default meanings; users can rename these in the time tracker legend.
export const DEFAULT_TIME_LABELS: Record<string, string> = {
  '#84cc16': '집중/업무',
  '#0ea5e9': '학습',
  '#f59e0b': '운동/생활',
  '#ec4899': '휴식',
  '#8b5cf6': '기타',
}
