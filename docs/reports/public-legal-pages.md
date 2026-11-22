# 공개 정책 페이지 구현과 검증

- 작성일: 2026-11-22
- 기준: `teamground-pm/docs/public-legal-pages.md`의 검토용 초안
- 브랜치: `codex/public-legal-pages`, 기준 커밋: `44104b1` (`origin/main`)

## 구현

인증 가드 밖에 `/privacy`, `/terms`를 추가하고 기존 lazy/Suspense 구조로 로드한다. 로그인·초대 공개 레이아웃과 앱 작업 공간 하단에 동일한 정책 링크를 제공한다. 두 페이지는 각 8개 절, 목차, 페이지 제목, 홈 이동, 초안 안내와 작성일을 표시한다. 문의 주소는 `mailto:hs1j333@gmail.com`이며 개인정보 페이지는 Google 연결 관리와 User Data Policy 링크를 포함한다.

PM의 실제 서비스 정책과 현재 브라우저 저장 데모를 구분한다. 정식 시행일이나 운영 주체는 임의로 확정하지 않았다. 동의 수집·인증 방식·백엔드·배포 설정 변경은 없다. 기존 Vercel SPA rewrite를 이용한다.

## 자동 검증

| 명령 | 실제 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | 성공, lockfile 변경 없음 |
| `pnpm typecheck` | 성공 |
| `pnpm test` | 5개 파일, 74개 테스트 통과 |
| `pnpm build` | 성공. 기존 Zod PURE 주석 경고만 발생 |
| `pnpm exec playwright test --project=chromium` | 20개 통과 |
| `pnpm exec playwright test` | 최종 코드 기준 Chromium/Firefox/WebKit 58개 통과 |
| `git diff --check` | 성공 |

기존 E2E는 추천→확정→영상 재생→피드백→새로고침, 권한 제한, 초대·메뉴 모달, 미저장 이탈과 로딩 오류 회귀를 포함한다. 신규 정책 페이지는 아래 실제 브라우저 검증으로 확인했으며 기존 E2E에 신규 정책 전용 테스트를 추가하지 않았다.

## 실제 브라우저 확인

`pnpm preview --port 4181`의 프로덕션 빌드를 Playwright CLI의 독립 Chromium 세션으로 확인했다.

- 비로그인 `/privacy`, `/terms` 직접 접근 및 새로고침: 로그인으로 이동하지 않고 각 제목·8개 절 유지.
- `/privacy#privacy-3` 직접 접근·새로고침: 3절 상단 위치 23.8125px, 해시 대상 유지.
- 390×844 두 페이지: 문서 너비와 viewport 모두 390px, 가로 넘침 없음.
- 1440×1000 개인정보 페이지: 문서 너비와 viewport 모두 1440px, 레이아웃 시각 확인.
- 로그인 footer의 개인정보처리방침 클릭 → `/privacy`, 로그인 후 앱 footer의 서비스 이용약관 클릭 → `/terms`.
- 문의 링크의 `mailto:` 주소, Google 외부 링크 목적지 확인. 이메일 발송이나 외부 계정 권한 철회는 실행하지 않음.
- axe-core 4.14.1로 두 페이지 WCAG 2 A/AA 및 2.1 A/AA 검사: 위반 0건.
- 모바일 약관 및 데스크톱 개인정보 전체 화면 캡처 시각 검토.

로컬 캡처(커밋 제외): `output/playwright/privacy-desktop.png`, `output/playwright/privacy-mobile.png`, `output/playwright/terms-mobile.png`.

## 남은 항목

정식 운영 주체·개인정보 보호책임자·시행일·외부 처리업체와 국외 이전·문의/로그 보존기간 등은 PM 문서에 남은 결정으로 기록되어 있다. 배포된 URL의 동작과 OAuth 심사 충족은 이 로컬 검증에 포함하지 않는다. 루트 에이전트의 PR HEAD 및 원격 CI 검토가 남아 있다.
