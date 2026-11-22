# 이메일 인증 구현·검증 (2026-11-22)

PM `docs/email-authentication.md` 계약을 적용한다. 실제 계정 인증과 데모를 분리하고,
이메일 가입 신청→메일 확인 후 비밀번호 설정→로그인→로그아웃→재설정을 제공한다.
`GET /me`와 HttpOnly 세션 쿠키가 실제 인증의 기준이며 mock ID를 서버 프로필에 넣지 않는다.
POST마다 새 CSRF를 조회하며 네트워크 실패를 데모 성공으로 대체하지 않는다.

## 완료 조건

- 가입 신청 이름/이메일, 인증 후 비밀번호 설정, 재전송, 비밀번호 찾기/변경 화면 구현.
- 토큰 fragment를 주소에서 제거하고 메모리로만 보관. 새로고침/무효/재사용 링크 안내.
- 안전한 팀/달력 복귀 경로만 sessionStorage 보관. 쿼리, fragment, 초대 토큰은 제외.
- 실제 서버 로그인/세션 복원/로그아웃, 이메일 로그인 수단 표시, Google 캘린더 제한 안내.
- 실제 팀 목록/생성 랜딩. 나머지 도메인은 서버 연결 준비 안내. 데모는 명시적 선택으로 유지.
- 오류 시 입력 유지, 제출 중 차단, 필드 라벨/오류 연결 및 첫 오류 초점, 모바일 390px 화면.

## 검증

- `pnpm test`: 79 tests 통과.
- `pnpm typecheck`, `pnpm build`: 통과.
- `pnpm exec playwright test`: Chromium/Firefox/WebKit 65 tests 통과 (기존 데모 및 실제 모드 계약 테스트).
- 최종 세션 복원 경합 방지·Google 콜백 오류 보존 추가 후
  `pnpm exec playwright test tests/e2e/server-auth.spec.ts --project=chromium` 재검증.
- `pnpm exec playwright test -c playwright.live.config.ts`: 실제 localhost FE/BE/PostgreSQL/Mailpit 환경에서
  가입 메일→인증→로그인→새로고침→팀 생성→로그아웃→비밀번호 재설정→기존 별도 브라우저 세션
  거부→기존 비밀번호 거부→새 비밀번호 로그인→재설정 토큰 재사용 거부 통과.
- axe WCAG A/AA: 데모 주요 흐름 및 실제 가입 화면 390px 자동 검사 통과.
- 성공 화면: `output/playwright/live-signup-desktop.png`, `output/playwright/live-verify-mobile.png`.
  생성물은 Git에 포함하지 않는다. 비밀정보가 담길 수 있는 실제 인증 trace는 생성하지 않는다.

React 검토: 인증/데모 진입별 lazy 분리, 훅 호출 순서, 요청 완료 경합 처리, 안정적 상태 setter,
접근성 레이블/상태, 패스워드 메모리 범위와 입력 보존을 확인했다.

## 미검증·후속 범위

운영 배포, 실제 사용자 메일 발송, 외부 Google OAuth 제공자, 운영 프록시·Secure 쿠키는
이번 로컬 검증에 포함하지 않는다. 현재 Vercel 정적 설정에는 서버 `/api` 프록시가 없으므로
README에 배포 전 설정 요건을 명시했다. 개인 일정·초대·추천·영상·피드백의 실제 화면 연동은
별도 후속 작업이다. 로컬 테스트는 테스트 SMTP와 고유 example.test 계정만 사용한다.
