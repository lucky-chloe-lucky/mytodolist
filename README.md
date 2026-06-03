# ⚡ Flow — 나의 업무 보드

Todo · 데일리 리포트 · 프로젝트 일정 · 스크럼을 한 곳에서 관리하는 개인용 PWA.
컴퓨터 브라우저에서도, 폰 홈화면에 설치해서도 사용할 수 있습니다.

- **반응형**: PC는 사이드바, 폰은 하단 탭 네비게이션
- **PWA**: 폰 홈화면 설치 + 오프라인 동작
- **두 가지 모드**
  - **로컬 모드** (기본): 별도 설정 없이 브라우저에 저장 — 바로 사용 가능
  - **클라우드 모드**: Firebase 연결 시 Google 로그인 + 모든 기기 실시간 동기화

## 기능

| 메뉴 | 설명 |
|------|------|
| 🏠 홈 | 오늘 요약 — 남은 할 일, 진행 프로젝트, 데일리/스크럼 작성 여부, 마감 임박 할 일 |
| ✅ Todo | 우선순위·마감일·상태(할 일/진행 중/완료)·프로젝트 연결 |
| 📁 프로젝트 | 색상·기간·상태, 마일스톤(진행률 바), 연결된 할 일 수 |
| 📝 데일리 | 탭(오늘 기록 / KPT 성찰 / 타임 트래커). 기분 이모지, 그날 완료 할 일 자동 표시, 템플릿. 타임 트래커는 10분 단위 색칠 + **색상별 의미(범례) 직접 정의** |
| 🗓 주간 | 이번 주 메모, 해빗 트래커(습관 × 요일 체크) |
| 🏃 스프린트 | 목표·기간·상태·프로젝트 연결, 할 일을 스프린트에 묶어 보드(할 일/진행/완료)·진행률로 관리 |
| ⚙️ 설정 | 동기화 상태, 백업 내보내기/가져오기(JSON), 전체 삭제 |

## 로컬에서 실행

```bash
npm install
npm run dev      # http://localhost:5273
npm run build    # 정적 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## 클라우드 동기화 켜기 (선택)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성
2. **앱 추가 → 웹(</>)** → 표시되는 `firebaseConfig` 값 복사
3. **빌드 → Authentication → 시작하기 → Google** 로그인 사용 설정
4. **빌드 → Firestore Database → 데이터베이스 만들기**
   - 만든 뒤 **규칙(Rules)** 탭에 [`firestore.rules`](firestore.rules) 내용을 붙여넣고 게시
5. 프로젝트 루트에 `.env.local` 파일 생성 ([`.env.example`](.env.example) 참고) 후 값 입력
6. `npm run dev` 재시작 → 우측 상단이 `☁️ 동기화`로 바뀌고 Google 로그인 화면이 나타납니다

> Firebase 웹 설정값은 비밀이 아닙니다(클라이언트에 노출되는 공개 키). 실제 보안은
> [`firestore.rules`](firestore.rules)가 담당해 **각 사용자는 자기 데이터만** 접근할 수 있습니다.

## GitHub Pages 배포

이 저장소에는 자동 배포 워크플로([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))가 포함돼 있습니다.

1. GitHub에 새 저장소를 만들고 코드를 push
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정
3. `main` 브랜치에 push하면 자동 빌드·배포 → `https://<사용자명>.github.io/<저장소명>/`
   - Firebase 설정은 커밋된 `.env.production`에서 주입됩니다(공개 설정이라 안전).
4. (클라우드 모드) Firebase **Authentication → Settings → 승인된 도메인**에 위 Pages 도메인 추가

> 라우팅은 `HashRouter`, 에셋 경로는 상대경로(`base: './'`)라서 저장소 이름과 무관하게
> GitHub Pages 하위 경로에서 그대로 동작합니다.

## 폰에 설치

배포된 URL을 폰 브라우저에서 열고:
- **iOS Safari**: 공유 → "홈 화면에 추가"
- **Android Chrome**: 메뉴 → "앱 설치" / "홈 화면에 추가"

## 기술 스택

Vite · React · TypeScript · Tailwind CSS · Firebase(Auth + Firestore) · vite-plugin-pwa
