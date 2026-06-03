import { useRef } from 'react'
import { useApp } from '../store/AppStore'
import { COLLECTIONS, type CollectionName } from '../lib/types'
import { Button, Card, PageHeader } from '../components/ui'

export function Settings() {
  const { mode, user, signIn, signOut, data, save, remove } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flow-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File) => {
    const text = await file.text()
    try {
      const parsed = JSON.parse(text) as Record<string, { id: string }[]>
      for (const name of COLLECTIONS) {
        const items = parsed[name]
        if (Array.isArray(items)) {
          for (const item of items) await save(name as CollectionName, item as never)
        }
      }
      alert('가져오기 완료!')
    } catch {
      alert('파일을 읽을 수 없어요. 올바른 백업 파일인지 확인해주세요.')
    }
  }

  const clearAll = async () => {
    if (!confirm('모든 데이터를 삭제할까요? 되돌릴 수 없습니다.')) return
    for (const name of COLLECTIONS) {
      for (const item of data[name]) await remove(name as CollectionName, item.id)
    }
  }

  const counts = COLLECTIONS.map((name) => ({ name, n: data[name].length }))
  const LABELS: Record<string, string> = {
    todos: '할 일',
    projects: '프로젝트',
    milestones: '마일스톤',
    sprints: '스프린트',
    reports: '데일리',
    kpts: 'KPT',
    habits: '습관',
    weeklyNotes: '주간메모',
    timeblocks: '타임블록',
    timeCategories: '색상범례',
  }

  return (
    <>
      <PageHeader title="설정" />

      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="mb-2 font-semibold text-ink">동기화</h2>
          {mode === 'cloud' ? (
            user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" className="size-10 rounded-full" />
                  )}
                  <div>
                    <p className="font-medium text-ink">{user.displayName ?? '사용자'}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                  </div>
                </div>
                <Button variant="subtle" onClick={signOut}>
                  로그아웃
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">로그인하면 모든 기기에서 동기화돼요.</p>
                <Button onClick={signIn}>Google 로그인</Button>
              </div>
            )
          ) : (
            <p className="text-sm text-muted">
              현재 <b className="text-ink">로컬 모드</b>입니다 — 이 브라우저에만 저장돼요. Firebase 키를 연결하면
              Google 로그인 + 기기 간 실시간 동기화가 켜집니다. (자세한 건 README 참고)
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-ink">데이터</h2>
          <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {counts.map((c) => (
              <div key={c.name} className="rounded-xl bg-canvas px-3 py-2 text-center">
                <p className="text-lg font-bold text-ink">{c.n}</p>
                <p className="text-xs text-muted">{LABELS[c.name]}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" onClick={exportData}>
              ⬇️ 백업 내보내기
            </Button>
            <Button variant="subtle" onClick={() => fileRef.current?.click()}>
              ⬆️ 가져오기
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importData(f)
                e.target.value = ''
              }}
            />
            <Button variant="danger" onClick={clearAll}>
              전체 삭제
            </Button>
          </div>
        </Card>

        <p className="px-1 text-center text-xs text-muted">Flow · 나의 업무 보드</p>
      </div>
    </>
  )
}
