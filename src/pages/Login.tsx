import { useApp } from '../store/AppStore'
import { Button } from '../components/ui'

// Shown only in cloud mode when no user is signed in.
export function Login() {
  const { signIn } = useApp()
  return (
    <div className="grid min-h-full place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-ink text-3xl text-brand-400 shadow-lg">
          ⚡
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Flow</h1>
        <p className="mt-1 mb-8 text-muted">
          Todo · 데일리 · 프로젝트 · 스프린트를
          <br />한 곳에서, 모든 기기에서.
        </p>
        <Button onClick={signIn} className="w-full py-3 text-base">
          Google로 시작하기
        </Button>
        <p className="mt-4 text-xs text-muted">로그인하면 데이터가 기기 간 자동 동기화됩니다.</p>
      </div>
    </div>
  )
}
