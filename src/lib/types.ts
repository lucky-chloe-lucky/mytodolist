// ── Shared types for all four features ───────────────────────────────

export type Priority = 'low' | 'medium' | 'high'
export type TodoStatus = 'todo' | 'doing' | 'done' | 'hold'
export type TriageStage = 'inbox' | 'triaged' | 'scheduled'
export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4'
export type TodoArea = string

export interface Todo {
  id: string
  title: string
  notes?: string
  status: TodoStatus
  priority: Priority
  dueDate?: string // YYYY-MM-DD
  projectId?: string | null
  sprintId?: string | null
  triageStage?: TriageStage
  quadrant?: Quadrant | null
  area?: TodoArea | null
  focusDate?: string | null
  scheduledDate?: string | null
  scheduledStart?: string | null
  durationMin?: number | null
  gcalEventId?: string // 구글 캘린더 이벤트 id (동기화용)
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
  gcalEventId?: string
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
  gcalEventId?: string
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

export interface TodoAreaCategory {
  id: string
  label: string
  createdAt: number
}

// Chinese vocabulary / phrase note. (example = 중국어 예문 exampleZh)
export interface ChineseWord {
  id: string
  hanzi: string // 中文
  pinyin?: string // 병음 (한자 입력 시 자동)
  pos?: string // 품사 (명사/동사/형용사…)
  meaning: string // 뜻 (한국어)
  example?: string // 중국어 예문
  examplePinyin?: string // 예문 병음 (자동)
  exampleKo?: string // 예문 뜻
  source?: string // 출처 (교재/페이지)
  tags?: string[] // 태그
  learned: boolean // 외움 여부
  // 간단 SRS (플래시카드 복습용)
  reviewCount?: number
  lastReviewedAt?: number
  dueAt?: number // 다음 복습 예정 (ms)
  createdAt: number
}

// Chinese study session — "이 날 이 단어들을 배웠음" (N:M via wordIds 배열).
export interface StudySession {
  id: string
  date: string // YYYY-MM-DD
  source?: string // 교재/챕터
  durationMin?: number // 공부 시간(분)
  notes?: string
  wordIds: string[]
  createdAt: number
}

// Reading log: a memorable quote or a book review.
export interface ReadingNote {
  id: string
  book: string // 책 제목
  author?: string
  type: 'quote' | 'review' // 💬 문장 / 📝 독서록
  content: string
  page?: string // 문장 페이지(선택)
  rating?: number // 독서록 별점 1~5(선택)
  createdAt: number
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
  todoAreas: TodoAreaCategory
  chineseWords: ChineseWord
  studySessions: StudySession
  readingNotes: ReadingNote
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
  'todoAreas',
  'chineseWords',
  'studySessions',
  'readingNotes',
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

export const DEFAULT_TODO_AREAS: TodoAreaCategory[] = [
  { id: 'work', label: '업무', createdAt: 0 },
  { id: 'personal', label: '개인', createdAt: 1 },
  { id: 'health', label: '건강', createdAt: 2 },
  { id: 'learning', label: '학습', createdAt: 3 },
  { id: 'other', label: '기타', createdAt: 4 },
]
