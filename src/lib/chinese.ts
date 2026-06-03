import { pinyin } from 'pinyin-pro'

// 한자 → 병음 (성조 포함). 한자가 아니면 빈 문자열.
export function toPinyin(hanzi: string): string {
  const text = hanzi.trim()
  if (!text) return ''
  try {
    return pinyin(text, { toneType: 'symbol', type: 'string' })
  } catch {
    return ''
  }
}

// 중국어 음성 읽기 (브라우저 TTS, zh-CN). 음원 저장 불필요.
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const t = text.trim()
  if (!t) return
  const u = new SpeechSynthesisUtterance(t)
  u.lang = 'zh-CN'
  u.rate = 0.85
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export const ttsSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window

// 간단 SRS: 정답이면 간격을 늘리고, 오답이면 처음으로.
const DAY = 24 * 60 * 60 * 1000
const STEPS = [1, 3, 7, 16, 35, 70] // days

export function nextDue(reviewCount: number, correct: boolean, now: number) {
  const count = correct ? reviewCount + 1 : 0
  const days = STEPS[Math.min(count, STEPS.length - 1)]
  return { reviewCount: count, lastReviewedAt: now, dueAt: now + days * DAY }
}
