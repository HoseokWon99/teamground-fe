# 서비스 UI 독립 검증 — 2026-11-22

## 범위와 환경

- 작업 브랜치 `codex/fe-ui-completion`, FE 공유 worktree. 검증 담당자는 구현 소스를 수정하지 않고 테스트와 이 보고서를 작성했다.
- Chromium, 한국어/Asia/Seoul, 1440px 및 390px. Vite `127.0.0.1:5173`에 Chromium localhost resolver를 적용하고 실제 API는 로컬 `localhost:8080`, 인증 메일은 Mailpit `localhost:18025`만 사용했다.
- 기존 `[::1]:5173` 서버는 보존했다. 외부 OAuth, 운영 메일, 운영 계정, 배포는 검증하지 않았다.
- API 계약 mock 검증과 실제 BE 검증을 구분했다. 실제 테스트 계정은 실행별 고유 `@example.test` 주소다. trace/screenshot/video 자동 저장은 껐으며, 명시적으로 저장한 화면 캡처는 mock 데이터만 포함한다.

## 화면·접근성 검증

`pnpm exec playwright test --config playwright.ui-completion.config.ts`

- 기존 서버 인증 5개: 로그인/복원/로그아웃, 메일 토큰 제거, 요청 실패 입력 유지, 세션 경합, Google 콜백 오류 표시 통과.
- 신규 mock 화면 10개: 작업 공간 10화면(내 팀, 팀 생성, 팀 멤버, 개인 달력, 팀 달력, 조율 입력, 조율 결과, 회차, 영상, 계정)을 desktop/mobile 각각 axe WCAG A/AA 및 가로 넘침 검사. 인증·가입·재설정·초대 6화면 역시 두 너비에서 검사. 공개 정책 직접 접근·새로고침, 팀 목록 빈/실패/재시도, 계정 412 입력 유지/If-Match/409 안내, 메뉴 키보드·초점 복원, 종일 종료일 제외·월 이동·빈 상태 통과.
- 멤버 권한 테스트는 `/teams/:id/members`에서 멤버 목록·팀 탈퇴 존재, 관리자 위임·팀 삭제·초대 요청 부재를 검증하도록 보강 후 통과했다.
- 추가 모바일 추천 후보 테스트: 후보 2개 응답, 회차 상세 펼침 및 멤버 가능 정보, axe/overflow 검사 통과.
- 추가 일정 경합 테스트: 지연 PATCH 중 삭제·취소 비활성, Escape/외부 클릭 시 모달 유지; 지연 DELETE 중 저장·취소 비활성, DELETE 503 도착 후 모달 내 오류가 추가 표시됨(alert 2개), 입력 유지 통과.

## 단위 검증

`pnpm exec vitest run src/features/server-workspace/CalendarView.test.ts` — 3개 통과.

종일 일정의 월 경계 종료일 제외, 한국 시각 자정에 걸친 일정 분할과 종료일 제외, 긴 일정의 조회 범위 제한을 확인했다. `pnpm typecheck`도 통과했다.

## 실제 백엔드 검증

`tests/live/ui-completion.spec.ts` 통과: 신규 가입·Mailpit 인증·로그인 → 표시 이름 수정/새로고침 영속 → 검증용 소유 팀 생성 → DELETE /me 409 → UI 소유 팀 안내와 탈퇴 비활성 → 검증용 팀 삭제 → UI 탈퇴 → 새로고침 후 로그인 화면 → 기존 자격 증명 재로그인 거절 및 보호 경로 접근 차단.

`tests/live/backend-integration.spec.ts`는 새 팀 생성 경로, 일정 모달, 공통 확인 모달, 팀 달력/영상 카드에 맞춰 선택자·이동 경로를 조정했다. 기존 추천·확정·회차 변경·영상별 피드백 분리·영속·412 경합·로그아웃 검증은 유지했다. 최종 실행 결과는 아래에 기록한다.

## 발견 및 재검증

- 월 이동 시 달력 컴포넌트가 재마운트되어 목록 보기가 초기화되는 문제 발견. 구현 담당자가 mount를 유지하도록 수정했고 브라우저 회귀 통과.
- `closeDisabled` 상태에서 Escape/외부 클릭이 닫기 제한을 우회하는 문제 발견. 공통 모달 dismissal 이벤트 차단 수정 후 지연응답 회귀 통과. 이 관측만으로 데이터 유실을 주장하지 않는다.
- 초기 실패에는 변경된 화면의 중복 heading/link와 변경된 accessible name을 사용한 테스트 선택자 오류 및 개발 중 HMR 재탐색도 포함되었다. 구현 결함과 구분하여 선택자를 갱신하고 재실행했다.

## 검토용 캡처

`output/ui-completion/{teams,create-team,members,calendar,team,scheduling,results,occurrence,video,account}-{1440,390}.png` 및 `output/ui-completion/candidates-390.png`.

최종 커밋·Draft PR·CI 및 공통 모달 변경의 Firefox/WebKit 회귀는 구현 리드와 루트가 통합 검토한다. 자동 접근성 검사는 보조 기술을 사용하는 사람의 전체 사용성 검증을 대체하지 않는다.

## 최종 실제 핵심 흐름 결과

`pnpm exec playwright test --config playwright.ui-completion.config.ts tests/live/backend-integration.spec.ts --output output/playwright/ui-live-stable` — **1개 통과 (12.2초)**.

로컬 신규 가입 → 팀 생성 → 개인 바쁜 일정 추가와 기간 확인 → 추천 조회·후보 선택·전체 확정 → 목록 보기에서 생성된 첫 회차의 월로 이동 → 회차 시간 변경 → 영상 A 및 피드백 등록·새로고침 영속 → 영상 주소 변경 제한 → 피드백 수정 → 영상 B와 피드백 분리 → 390px 표시 → 개인 일정의 실제 412 경합·입력 유지·최신 버전 재저장 → 로그아웃 후 보호 경로 차단까지 검증했다. 월 경계로 첫 회차가 다음 달인 경우 정상적인 달력 월 이동을 테스트에 포함했다.

최종 검사 수: 기존 서버 인증 5개, 신규 mock UI 12개, 실제 BE 2개가 각각 최종 실행에서 통과했다. 19개를 한 번에 실행한 결과로 합산한 것은 아니며, 신규/수정된 테스트는 해당 변경 이후 다시 실행했다. 공통 모달의 저장 중 Escape/외부 클릭 차단 및 삭제 실패 오류 추가 표시는 마지막 경합 단독 실행에서도 통과했다.
