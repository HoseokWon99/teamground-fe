# 실제 초대 수락 연동 검증 (2026-11-22)

PM 계약: `teamground-pm/docs/invitation-acceptance-integration.md`.

## 구현

- `/invite#token=…`의 기존 즉시 fragment 제거·메모리 보관을 유지하고 안전한 `/invite` 인증 복귀 경로를 허용한다. 토큰은 returnTo·history state·브라우저 저장소에 기록하지 않는다.
- 이메일 로그인과 계정 변경은 SPA 내에서 초대 화면으로 돌아온다. 현재 이메일, 명시적 수락, 중복 제출 방지, 세션 만료 재로그인, 네트워크 재시도를 제공한다.
- Google 로그인·회원가입·비밀번호 재설정·새로고침으로 토큰을 잃으면 원래 초대 메일을 다시 열도록 안내한다.
- 초대 오류 코드별 안내를 표시하고 수락 후 실제 팀/멤버 API로 현재 접근 권한을 확인한다. 탈퇴한 사용자의 과거 수락 응답을 재가입 성공으로 표시하지 않는다.
- 실제 서비스 화면만 변경했으며 기존 mock 데모는 별도 경로/상태를 유지한다.

## 로컬 통합 실행

FE: `TEAMGROUND_API_TARGET=http://localhost:18085 pnpm dev --port 5175 --strictPort`

BE의 격리된 로컬 환경은 FE origin `http://localhost:5175`, invitation URL `/invite`, verification URL `/verify-email`, Mailpit HTTP `18086`을 사용한다. 테스트는 실제 이메일 가입·메일 토큰 검증으로 계정을 만들며 seed 인증 우회를 사용하지 않는다.

`pnpm exec playwright test --config=playwright.invitation.config.ts`

브라우저 trace·스크린샷·비디오는 끄고, 토큰/비밀번호를 보고서나 파일에 저장하지 않는다. Mailpit API와 초대 토큰은 메모리에서만 처리한다.

## 검증 결과

- `pnpm typecheck`: 통과.
- `pnpm test`: 99개 통과.
- `pnpm build`: 통과. 기존 Zod Rollup 주석 경고만 발생.
- 초대/인증 Playwright: Chromium·Firefox·WebKit 40개 통과. 명령: `pnpm exec playwright test tests/e2e/invitation.spec.ts tests/e2e/server-auth.spec.ts`.
- 실제 SMTP 통합: 계정 2개 가입 → 팀 생성 → 초대 메일 → 잘못된 계정 거절 → 계정 전환 → 수락 → 팀/멤버 2명 조회 통과. 모바일 비로그인 → 이메일 로그인 → 재수락 → 탈퇴 → 과거 링크 접근 불가 안내 통과.
- 실제 SMTP 재발급/취소: 이전 링크와 취소 링크 거절, 멤버 1명 유지 확인 통과. 초기 테스트가 과거 초대 행을 잘못 선택하여 실패한 뒤, 수락 대기 행을 명시적으로 선택하도록 수정하고 재실행 통과.

- 데스크톱/390px 모바일 화면을 Playwright 스크린샷으로 확인했다. 넘침이나 버튼 잘림 없음. 가상 계정만 사용했고 토큰은 주소에서 제거된 상태다. 로컬 증거: `output/playwright/invitation-visual/desktop.png`, `mobile.png`.

## 검증 한계

- 실제 Google OAuth 외부 로그인은 실행하지 않았다. 페이지 이동 시 토큰 소실 및 메일 재진입 안내를 제공한다.
- 운영 배포·실제 SES 전달 확인은 루트 검토/배포 단계에서 수행한다.
- 만료/팀 정원 초과는 브라우저 API 응답 시나리오와 BE 통합 테스트로 검증한다. 이 FE SMTP 브라우저 테스트는 DB 시간을 임의 변경하지 않는다.
