import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { uid } from '../lib/backend'
import { nextDue, speak, toPinyin, ttsSupported } from '../lib/chinese'
import { prettyDate, todayKey } from '../lib/date'
import type { ChineseWord, ReadingNote, StudySession } from '../lib/types'
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

type View = 'chinese' | 'reading'
const TABS: { key: View; label: string }[] = [
  { key: 'chinese', label: '중국어 🇨🇳' },
  { key: 'reading', label: '독서 📖' },
]

export function Learn() {
  const [view, setView] = useState<View>('chinese')

  return (
    <>
      <PageHeader title="배움" subtitle="중국어 단어와 독서 기록을 모아요" />

      <div className="mb-4 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={[
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              view === t.key ? 'bg-ink text-white' : 'bg-surface text-muted hover:bg-canvas',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'chinese' ? <ChineseDeck /> : <ReadingLog />}
    </>
  )
}

// ── 중국어 (단어 / 세션 전환) ────────────────────────────────────────
function ChineseDeck() {
  const [sub, setSub] = useState<'words' | 'sessions'>('words')
  return (
    <>
      <div className="mb-3 inline-flex rounded-lg bg-canvas p-0.5 text-sm">
        {([['words', '단어'], ['sessions', '공부 세션']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={[
              'rounded-md px-3 py-1 font-medium transition',
              sub === k ? 'bg-surface text-ink shadow-sm' : 'text-muted',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
      {sub === 'words' ? <WordDeck /> : <StudySessions />}
    </>
  )
}

type WordFilter = 'all' | 'unlearned' | 'learned'

function WordDeck() {
  const { data, save, remove } = useApp()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ChineseWord | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<WordFilter>('all')
  const [reviewing, setReviewing] = useState(false)

  const words = useMemo(() => {
    const term = q.trim().toLowerCase()
    return [...data.chineseWords]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((w) => (filter === 'all' ? true : filter === 'learned' ? w.learned : !w.learned))
      .filter(
        (w) =>
          !term ||
          w.hanzi.toLowerCase().includes(term) ||
          (w.pinyin ?? '').toLowerCase().includes(term) ||
          w.meaning.toLowerCase().includes(term),
      )
  }, [data.chineseWords, q, filter])

  const learnedCount = data.chineseWords.filter((w) => w.learned).length
  const now = Date.now()
  const dueWords = useMemo(
    () => data.chineseWords.filter((w) => !w.dueAt || w.dueAt <= now),
    [data.chineseWords, now],
  )

  const FILTERS: { key: WordFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'unlearned', label: '안 외움' },
    { key: 'learned', label: '외움' },
  ]

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="中文·병음·뜻 검색"
          className="!py-2 text-sm"
        />
        {dueWords.length > 0 && (
          <Button variant="subtle" onClick={() => setReviewing(true)} className="shrink-0">
            🃏 복습 {dueWords.length}
          </Button>
        )}
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
          className="shrink-0"
        >
          + 단어
        </Button>
      </div>

      <div className="mb-3 flex items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium transition',
              filter === f.key ? 'bg-brand-100 text-brand-700' : 'bg-canvas text-muted hover:bg-line',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted tnum">
          외움 {learnedCount}/{data.chineseWords.length}
        </span>
      </div>

      {words.length === 0 ? (
        <EmptyState icon="🇨🇳" title="단어가 없어요" hint="+ 단어로 새 중국어 표현을 기록해보세요" />
      ) : (
        <div className="flex flex-col gap-2">
          {words.map((w) => (
            <Card key={w.id} className="flex items-start gap-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setEditing(w)
                  setOpen(true)
                }}
                className="min-w-0 flex-1 cursor-pointer"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className={['text-xl font-semibold', w.learned ? 'text-muted' : 'text-ink'].join(' ')}>
                    {w.hanzi}
                  </span>
                  {w.pinyin && <span className="text-sm text-brand-600">{w.pinyin}</span>}
                  {w.pos && <span className="rounded bg-canvas px-1.5 py-0.5 text-[11px] text-muted">{w.pos}</span>}
                </div>
                <p className="text-sm text-ink">{w.meaning}</p>
                {w.example && (
                  <div className="mt-1 rounded-lg bg-canvas/60 px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-ink">{w.example}</span>
                      {ttsSupported && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            speak(w.example!)
                          }}
                          className="text-xs text-muted hover:text-brand-600"
                          aria-label="예문 듣기"
                        >
                          🔊
                        </button>
                      )}
                    </div>
                    {w.examplePinyin && <p className="text-xs text-brand-600">{w.examplePinyin}</p>}
                    {w.exampleKo && <p className="text-xs text-muted">{w.exampleKo}</p>}
                  </div>
                )}
                {(w.source || (w.tags && w.tags.length > 0)) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                    {w.source && <span>📖 {w.source}</span>}
                    {w.tags?.map((t) => (
                      <span key={t} className="rounded-full bg-canvas px-1.5 py-0.5">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                {ttsSupported && (
                  <button
                    onClick={() => speak(w.hanzi)}
                    className="text-base text-muted hover:text-brand-600"
                    aria-label="발음 듣기"
                  >
                    🔊
                  </button>
                )}
                <button
                  onClick={() => save('chineseWords', { ...w, learned: !w.learned })}
                  className={[
                    'grid size-6 place-items-center rounded-full border text-xs transition',
                    w.learned ? 'border-brand-600 bg-brand-500 text-white' : 'border-line text-transparent hover:border-brand-400',
                  ].join(' ')}
                  aria-label="외움 토글"
                >
                  ✓
                </button>
                <button
                  onClick={() => remove('chineseWords', w.id)}
                  className="text-sm text-muted hover:text-red-600"
                  aria-label="삭제"
                >
                  🗑
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <ChineseEditor
          word={editing}
          onClose={() => setOpen(false)}
          onSave={(w) => {
            save('chineseWords', w)
            setOpen(false)
          }}
        />
      )}

      {reviewing && (
        <Flashcards words={dueWords} onClose={() => setReviewing(false)} />
      )}
    </>
  )
}

// ── 플래시카드 복습 (간단 SRS) ───────────────────────────────────────
function Flashcards({ words, onClose }: { words: ChineseWord[]; onClose: () => void }) {
  const { save } = useApp()
  const [queue] = useState(words)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [correct, setCorrect] = useState(0)

  const w = queue[idx]
  const done = idx >= queue.length

  const answer = (ok: boolean) => {
    const now = Date.now()
    save('chineseWords', { ...w, ...nextDue(w.reviewCount ?? 0, ok, now) })
    if (ok) setCorrect((c) => c + 1)
    setFlipped(false)
    setIdx((i) => i + 1)
  }

  return (
    <Modal open onClose={onClose} title={done ? '복습 완료' : `복습 ${idx + 1}/${queue.length}`}>
      {done ? (
        <div className="py-8 text-center">
          <div className="mb-2 text-4xl">🎉</div>
          <p className="font-semibold text-ink tnum">
            {queue.length}개 중 {correct}개 맞혔어요
          </p>
          <p className="mt-1 text-sm text-muted">맞힌 단어는 다음 복습일이 미뤄졌어요.</p>
          <Button onClick={onClose} className="mt-5">
            닫기
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center py-6">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-5xl font-semibold text-ink">{w.hanzi}</span>
            {ttsSupported && (
              <button onClick={() => speak(w.hanzi)} className="text-xl text-muted hover:text-brand-600" aria-label="발음">
                🔊
              </button>
            )}
          </div>

          {flipped ? (
            <div className="mt-3 w-full text-center">
              {w.pinyin && <p className="text-brand-600">{w.pinyin}</p>}
              <p className="mt-1 text-lg text-ink">{w.meaning}</p>
              {w.example && <p className="mt-2 text-sm text-muted">{w.example}</p>}
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="subtle" onClick={() => answer(false)} className="!px-6">
                  ❌ 다시
                </Button>
                <Button onClick={() => answer(true)} className="!px-6">
                  ✅ 알아
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="subtle" onClick={() => setFlipped(true)} className="mt-6">
              뜻 보기
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}

function ChineseEditor({
  word,
  onClose,
  onSave,
}: {
  word: ChineseWord | null
  onClose: () => void
  onSave: (w: ChineseWord) => void
}) {
  const { data } = useApp()
  const [hanzi, setHanzi] = useState(word?.hanzi ?? '')
  const [pinyin, setPinyin] = useState(word?.pinyin ?? '')
  const [pinyinTouched, setPinyinTouched] = useState(!!word?.pinyin)
  const [pos, setPos] = useState(word?.pos ?? '')
  const [meaning, setMeaning] = useState(word?.meaning ?? '')
  const [example, setExample] = useState(word?.example ?? '')
  const [examplePinyin, setExamplePinyin] = useState(word?.examplePinyin ?? '')
  const [examplePyTouched, setExamplePyTouched] = useState(!!word?.examplePinyin)
  const [exampleKo, setExampleKo] = useState(word?.exampleKo ?? '')
  const [source, setSource] = useState(word?.source ?? '')
  const [tags, setTags] = useState((word?.tags ?? []).join(', '))

  // 한자 입력 → 병음 자동 (사용자가 병음을 직접 고치기 전까지)
  const onHanziChange = (v: string) => {
    setHanzi(v)
    if (!pinyinTouched) setPinyin(toPinyin(v))
  }
  const onExampleChange = (v: string) => {
    setExample(v)
    if (!examplePyTouched) setExamplePinyin(toPinyin(v))
  }

  // 같은 hanzi+pinyin 중복 경고
  const dup = data.chineseWords.find(
    (x) => x.id !== word?.id && x.hanzi === hanzi.trim() && (x.pinyin ?? '') === pinyin.trim(),
  )

  const submit = () => {
    if (!hanzi.trim() || !meaning.trim()) return
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
    onSave({
      id: word?.id ?? uid(),
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim() || undefined,
      pos: pos.trim() || undefined,
      meaning: meaning.trim(),
      example: example.trim() || undefined,
      examplePinyin: examplePinyin.trim() || undefined,
      exampleKo: exampleKo.trim() || undefined,
      source: source.trim() || undefined,
      tags: tagList.length ? tagList : undefined,
      hsk: word?.hsk,
      radical: word?.radical,
      learned: word?.learned ?? false,
      reviewCount: word?.reviewCount,
      lastReviewedAt: word?.lastReviewedAt,
      dueAt: word?.dueAt,
      createdAt: word?.createdAt ?? Date.now(),
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={word ? '단어 수정' : '새 단어'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit} disabled={!hanzi.trim() || !meaning.trim()}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="中文">
            <div className="flex gap-1">
              <TextInput autoFocus value={hanzi} onChange={(e) => onHanziChange(e.target.value)} placeholder="你好" />
              {ttsSupported && (
                <button
                  type="button"
                  onClick={() => speak(hanzi)}
                  className="shrink-0 rounded-lg px-2 text-muted hover:bg-canvas"
                  aria-label="발음"
                >
                  🔊
                </button>
              )}
            </div>
          </Field>
          <Field label="병음 (자동)">
            <TextInput
              value={pinyin}
              onChange={(e) => {
                setPinyin(e.target.value)
                setPinyinTouched(true)
              }}
              placeholder="자동 입력됨"
            />
          </Field>
        </div>

        {dup && (
          <p className="-mt-2 text-xs text-amber-600">
            ⚠️ 이미 같은 단어가 있어요: {dup.hanzi} {dup.pinyin} — {dup.meaning}
          </p>
        )}

        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <Field label="품사">
            <TextInput value={pos} onChange={(e) => setPos(e.target.value)} placeholder="동사" />
          </Field>
          <Field label="뜻">
            <TextInput value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="안녕하세요" />
          </Field>
        </div>

        <Field label="중국어 예문 (선택)">
          <div className="flex gap-1">
            <TextInput value={example} onChange={(e) => onExampleChange(e.target.value)} placeholder="你好，我叫…" />
            {ttsSupported && (
              <button
                type="button"
                onClick={() => speak(example)}
                className="shrink-0 rounded-lg px-2 text-muted hover:bg-canvas"
                aria-label="예문 발음"
              >
                🔊
              </button>
            )}
          </div>
        </Field>
        {example.trim() && (
          <>
            <Field label="예문 병음 (자동)">
              <TextInput
                value={examplePinyin}
                onChange={(e) => {
                  setExamplePinyin(e.target.value)
                  setExamplePyTouched(true)
                }}
                placeholder="자동 입력됨"
              />
            </Field>
            <Field label="예문 뜻 (선택)">
              <TextInput value={exampleKo} onChange={(e) => setExampleKo(e.target.value)} placeholder="안녕, 내 이름은…" />
            </Field>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="출처 (선택)">
            <TextInput value={source} onChange={(e) => setSource(e.target.value)} placeholder="新HSK 2급 p.30" />
          </Field>
          <Field label="태그 (쉼표로 구분)">
            <TextInput value={tags} onChange={(e) => setTags(e.target.value)} placeholder="인사, 회화" />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

// ── 공부 세션 ("이 날 이 단어들을 배웠음") ──────────────────────────
function StudySessions() {
  const { data, save, remove } = useApp()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StudySession | null>(null)

  const sessions = useMemo(
    () => [...data.studySessions].sort((a, b) => b.date.localeCompare(a.date)),
    [data.studySessions],
  )
  const wordById = useMemo(
    () => Object.fromEntries(data.chineseWords.map((w) => [w.id, w])),
    [data.chineseWords],
  )

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          + 세션
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon="📅" title="공부 세션이 없어요" hint="공부한 날짜·교재와 배운 단어를 묶어 기록해보세요" />
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <Card key={s.id} className="group">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => {
                    setEditing(s)
                    setOpen(true)
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-semibold text-ink tnum">{prettyDate(s.date)}</span>
                    {s.source && <span className="text-muted">· {s.source}</span>}
                    {s.durationMin ? <span className="text-muted tnum">· {s.durationMin}분</span> : null}
                    <span className="text-muted tnum">· 단어 {s.wordIds.length}</span>
                  </div>
                  {s.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{s.notes}</p>}
                  {s.wordIds.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.wordIds.map((id) =>
                        wordById[id] ? (
                          <span key={id} className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink">
                            {wordById[id].hanzi}
                          </span>
                        ) : null,
                      )}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => remove('studySessions', s.id)}
                  className="shrink-0 text-muted opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                  aria-label="삭제"
                >
                  🗑
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <SessionEditor
          session={editing}
          onClose={() => setOpen(false)}
          onSave={(s) => {
            save('studySessions', s)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function SessionEditor({
  session,
  onClose,
  onSave,
}: {
  session: StudySession | null
  onClose: () => void
  onSave: (s: StudySession) => void
}) {
  const { data } = useApp()
  const [date, setDate] = useState(session?.date ?? todayKey())
  const [source, setSource] = useState(session?.source ?? '')
  const [duration, setDuration] = useState(session?.durationMin ? String(session.durationMin) : '')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [wordIds, setWordIds] = useState<string[]>(session?.wordIds ?? [])
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return [...data.chineseWords]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((w) => !term || w.hanzi.includes(term) || (w.pinyin ?? '').toLowerCase().includes(term) || w.meaning.includes(term))
      .slice(0, 60)
  }, [data.chineseWords, q])

  const toggle = (id: string) =>
    setWordIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const submit = () => {
    if (!date) return
    onSave({
      id: session?.id ?? uid(),
      date,
      source: source.trim() || undefined,
      durationMin: duration ? Number(duration) : undefined,
      notes: notes.trim() || undefined,
      wordIds,
      createdAt: session?.createdAt ?? Date.now(),
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={session ? '세션 수정' : '새 공부 세션'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit} disabled={!date}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="날짜">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="교재/챕터">
            <TextInput value={source} onChange={(e) => setSource(e.target.value)} placeholder="新HSK 2급" />
          </Field>
          <Field label="시간(분)">
            <TextInput type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="30" />
          </Field>
        </div>
        <Field label="메모 (선택)">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="오늘 공부 회고" />
        </Field>
        <Field label={`배운 단어 (${wordIds.length}개 선택)`}>
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="단어 검색" className="mb-2 !py-2 text-sm" />
          {data.chineseWords.length === 0 ? (
            <p className="text-sm text-muted">먼저 '단어' 탭에서 단어를 추가하세요.</p>
          ) : (
            <div className="max-h-52 overflow-y-auto rounded-lg border border-line">
              {filtered.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggle(w.id)}
                  className={[
                    'flex w-full items-center gap-2 border-b border-line/60 px-3 py-2 text-left text-sm last:border-0',
                    wordIds.includes(w.id) ? 'bg-brand-50' : 'hover:bg-canvas',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'grid size-5 shrink-0 place-items-center rounded border text-xs',
                      wordIds.includes(w.id) ? 'border-brand-600 bg-brand-500 text-white' : 'border-line text-transparent',
                    ].join(' ')}
                  >
                    ✓
                  </span>
                  <span className="font-medium text-ink">{w.hanzi}</span>
                  {w.pinyin && <span className="text-xs text-brand-600">{w.pinyin}</span>}
                  <span className="truncate text-muted">{w.meaning}</span>
                </button>
              ))}
            </div>
          )}
        </Field>
      </div>
    </Modal>
  )
}

// ── 독서 기록 (문장 / 독서록) ────────────────────────────────────────
type ReadFilter = 'all' | 'quote' | 'review'

function ReadingLog() {
  const { data, save, remove } = useApp()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ReadingNote | null>(null)
  const [filter, setFilter] = useState<ReadFilter>('all')

  const notes = useMemo(
    () =>
      [...data.readingNotes]
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((n) => (filter === 'all' ? true : n.type === filter)),
    [data.readingNotes, filter],
  )

  const FILTERS: { key: ReadFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'quote', label: '💬 문장' },
    { key: 'review', label: '📝 독서록' },
  ]

  return (
    <>
      <div className="mb-3 flex items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium transition',
              filter === f.key ? 'bg-brand-100 text-brand-700' : 'bg-canvas text-muted hover:bg-line',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
          className="ml-auto shrink-0 !px-3 !py-1.5 text-xs"
        >
          + 기록
        </Button>
      </div>

      {notes.length === 0 ? (
        <EmptyState icon="📖" title="독서 기록이 없어요" hint="기억에 남는 문장이나 독서록을 남겨보세요" />
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <Card key={n.id} className="group">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => {
                    setEditing(n)
                    setOpen(true)
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  {n.type === 'quote' ? (
                    <p className="border-l-2 border-brand-400 pl-3 text-ink">“{n.content}”</p>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-ink">{n.content}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                    <span className="font-medium text-ink">📚 {n.book}</span>
                    {n.author && <span>· {n.author}</span>}
                    {n.type === 'quote' && n.page && <span className="tnum">· p.{n.page}</span>}
                    {n.type === 'review' && n.rating ? <span>· {'⭐'.repeat(n.rating)}</span> : null}
                  </div>
                </button>
                <button
                  onClick={() => remove('readingNotes', n.id)}
                  className="shrink-0 text-muted opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                  aria-label="삭제"
                >
                  🗑
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <ReadingEditor
          note={editing}
          onClose={() => setOpen(false)}
          onSave={(n) => {
            save('readingNotes', n)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function ReadingEditor({
  note,
  onClose,
  onSave,
}: {
  note: ReadingNote | null
  onClose: () => void
  onSave: (n: ReadingNote) => void
}) {
  const [book, setBook] = useState(note?.book ?? '')
  const [author, setAuthor] = useState(note?.author ?? '')
  const [type, setType] = useState<ReadingNote['type']>(note?.type ?? 'quote')
  const [content, setContent] = useState(note?.content ?? '')
  const [page, setPage] = useState(note?.page ?? '')
  const [rating, setRating] = useState(note?.rating ?? 0)

  const submit = () => {
    if (!book.trim() || !content.trim()) return
    onSave({
      id: note?.id ?? uid(),
      book: book.trim(),
      author: author.trim() || undefined,
      type,
      content: content.trim(),
      page: type === 'quote' ? page.trim() || undefined : undefined,
      rating: type === 'review' && rating ? rating : undefined,
      createdAt: note?.createdAt ?? Date.now(),
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={note ? '독서 기록 수정' : '새 독서 기록'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit} disabled={!book.trim() || !content.trim()}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="책 제목">
            <TextInput autoFocus value={book} onChange={(e) => setBook(e.target.value)} placeholder="제목" />
          </Field>
          <Field label="저자 (선택)">
            <TextInput value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="저자" />
          </Field>
        </div>
        <Field label="유형">
          <Select value={type} onChange={(e) => setType(e.target.value as ReadingNote['type'])}>
            <option value="quote">💬 기억에 남는 문장</option>
            <option value="review">📝 독서록</option>
          </Select>
        </Field>
        <Field label={type === 'quote' ? '문장' : '감상'}>
          <TextArea
            rows={type === 'quote' ? 3 : 5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === 'quote' ? '기억에 남는 문장을 적어보세요' : '책에 대한 생각을 자유롭게'}
          />
        </Field>
        {type === 'quote' ? (
          <Field label="페이지 (선택)">
            <TextInput value={page} onChange={(e) => setPage(e.target.value)} placeholder="123" className="w-28" />
          </Field>
        ) : (
          <Field label="별점 (선택)">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? 0 : n)}
                  className="text-2xl transition"
                  aria-label={`${n}점`}
                >
                  {n <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>
    </Modal>
  )
}
