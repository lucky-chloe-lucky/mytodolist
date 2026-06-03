import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppStore'
import { DEFAULT_TIME_LABELS, TIMEBLOCK_COLORS } from '../lib/types'

// 5am → 4am next day, matching the reference's wrap-around day.
const HOURS = [...Array.from({ length: 19 }, (_, i) => i + 5), 0, 1, 2, 3, 4]
const COLS = [0, 1, 2, 3, 4, 5] // 10-minute columns

export function TimeBlockGrid({ date }: { date: string }) {
  const { data, save } = useApp()
  const stored = data.timeblocks.find((t) => t.id === date)

  const [slots, setSlots] = useState<Record<string, string>>(stored?.slots ?? {})
  const [color, setColor] = useState<string>(TIMEBLOCK_COLORS[0])
  const [erase, setErase] = useState(false)
  const [editLegend, setEditLegend] = useState(false)
  const [labelDraft, setLabelDraft] = useState<Record<string, string>>({})

  const labelFor = (c: string) =>
    labelDraft[c] ?? data.timeCategories.find((t) => t.id === c)?.label ?? DEFAULT_TIME_LABELS[c] ?? ''

  const saveLabel = (c: string) => {
    const label = (labelFor(c) || '').trim() || DEFAULT_TIME_LABELS[c] || c
    save('timeCategories', { id: c, color: c, label })
  }
  const painting = useRef(false)
  const dirty = useRef(false)
  const slotsRef = useRef(slots) // latest slots, safe to read in handlers

  // Reload when the day changes or the stored doc updates externally.
  useEffect(() => {
    const fresh = stored?.slots ?? {}
    slotsRef.current = fresh
    setSlots(fresh)
    dirty.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, stored?.updatedAt])

  const apply = (key: string) => {
    const next = { ...slotsRef.current }
    if (erase) delete next[key]
    else next[key] = color
    slotsRef.current = next
    dirty.current = true
    setSlots(next)
  }

  // Commit to storage when a drag/click ends.
  useEffect(() => {
    const up = () => {
      if (!painting.current) return
      painting.current = false
      if (dirty.current) {
        dirty.current = false
        save('timeblocks', {
          id: date,
          date,
          slots: slotsRef.current,
          updatedAt: Date.now(),
        })
      }
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const total = Object.keys(slots).length

  return (
    <div className="select-none">
      {/* Color legend (selectable + editable meanings) */}
      <div className="mb-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-medium text-ink">색상 범례</span>
          <button
            onClick={() => setEditLegend((v) => !v)}
            className="rounded-md px-2 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            {editLegend ? '완료' : '✏️ 의미 편집'}
          </button>
          <button
            onClick={() => setErase((v) => !v)}
            className={[
              'ml-auto rounded-md px-2.5 py-1 text-xs font-medium transition',
              erase ? 'bg-ink text-white' : 'bg-canvas text-muted hover:bg-line',
            ].join(' ')}
          >
            🧽 지우개
          </button>
          <span className="text-xs text-muted tnum">{total}칸</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TIMEBLOCK_COLORS.map((c) => (
            <div
              key={c}
              className={[
                'flex items-center gap-1.5 rounded-lg border px-2 py-1 transition',
                !erase && color === c ? 'border-ink/30 bg-canvas' : 'border-line',
              ].join(' ')}
            >
              <button
                onClick={() => {
                  setColor(c)
                  setErase(false)
                }}
                className="size-5 shrink-0 rounded"
                style={{ background: c }}
                aria-label={`색상 ${c} 선택`}
              />
              {editLegend ? (
                <input
                  value={labelFor(c)}
                  onChange={(e) => setLabelDraft((d) => ({ ...d, [c]: e.target.value }))}
                  onBlur={() => saveLabel(c)}
                  className="w-20 rounded border border-line bg-white px-1.5 py-0.5 text-xs text-ink outline-none focus:border-brand-400"
                  placeholder="의미"
                />
              ) : (
                <button
                  onClick={() => {
                    setColor(c)
                    setErase(false)
                  }}
                  className="text-xs text-ink"
                >
                  {labelFor(c)}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Column header */}
      <div className="mb-1 flex pl-10 text-[11px] text-muted tnum">
        {COLS.map((c) => (
          <span key={c} className="flex-1 text-center">
            {(c + 1) * 10}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="max-h-[420px] overflow-y-auto rounded-lg border border-line">
        {HOURS.map((h) => (
          <div key={h} className="flex border-b border-line/70 last:border-0">
            <div className="flex w-10 shrink-0 items-center justify-center bg-canvas text-xs font-medium text-muted tnum">
              {String(h).padStart(2, '0')}
            </div>
            <div className="flex flex-1">
              {COLS.map((c) => {
                const key = `${h}:${c}`
                const fill = slots[key]
                return (
                  <div
                    key={c}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      painting.current = true
                      apply(key)
                    }}
                    onPointerEnter={() => {
                      if (painting.current) apply(key)
                    }}
                    className="h-6 flex-1 border-l border-line/50 first:border-0"
                    style={{ background: fill ?? undefined, cursor: 'pointer' }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        빈 칸을 드래그해 색칠하세요. 색상을 고르거나 🧽 지우개로 지울 수 있어요.
      </p>
    </div>
  )
}
