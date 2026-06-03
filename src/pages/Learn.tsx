import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { uid } from '../lib/backend'
import type { ChineseWord, ReadingNote } from '../lib/types'
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

// ── 중국어 단어/표현 노트 ────────────────────────────────────────────
type WordFilter = 'all' | 'unlearned' | 'learned'

function ChineseDeck() {
  const { data, save, remove } = useApp()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ChineseWord | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<WordFilter>('all')

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
            <Card key={w.id} className="flex items-start gap-3">
              <button
                onClick={() => save('chineseWords', { ...w, learned: !w.learned })}
                className={[
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs transition',
                  w.learned ? 'border-brand-600 bg-brand-500 text-white' : 'border-line text-transparent hover:border-brand-400',
                ].join(' ')}
                aria-label="외움 토글"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setEditing(w)
                  setOpen(true)
                }}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-baseline gap-2">
                  <span className={['text-xl font-semibold', w.learned ? 'text-muted' : 'text-ink'].join(' ')}>
                    {w.hanzi}
                  </span>
                  {w.pinyin && <span className="text-sm text-brand-600">{w.pinyin}</span>}
                </div>
                <p className="text-sm text-ink">{w.meaning}</p>
                {w.example && <p className="mt-0.5 text-xs text-muted">📝 {w.example}</p>}
              </button>
              <button
                onClick={() => remove('chineseWords', w.id)}
                className="shrink-0 text-muted hover:text-red-600"
                aria-label="삭제"
              >
                🗑
              </button>
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
    </>
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
  const [hanzi, setHanzi] = useState(word?.hanzi ?? '')
  const [pinyin, setPinyin] = useState(word?.pinyin ?? '')
  const [meaning, setMeaning] = useState(word?.meaning ?? '')
  const [example, setExample] = useState(word?.example ?? '')

  const submit = () => {
    if (!hanzi.trim() || !meaning.trim()) return
    onSave({
      id: word?.id ?? uid(),
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim() || undefined,
      meaning: meaning.trim(),
      example: example.trim() || undefined,
      learned: word?.learned ?? false,
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
            <TextInput autoFocus value={hanzi} onChange={(e) => setHanzi(e.target.value)} placeholder="你好" />
          </Field>
          <Field label="병음">
            <TextInput value={pinyin} onChange={(e) => setPinyin(e.target.value)} placeholder="nǐ hǎo" />
          </Field>
        </div>
        <Field label="뜻">
          <TextInput value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="안녕하세요" />
        </Field>
        <Field label="예문 (선택)">
          <TextArea rows={2} value={example} onChange={(e) => setExample(e.target.value)} placeholder="你好，我叫…" />
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
