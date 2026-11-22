# 실제 서비스 UI 완성 · 구현 기록

2026-11-22. 작업 브랜치 `codex/fe-ui-completion`, 기준 main `19194b5e556ec4f37d8d39f4ebad9677efbdb239`. 기존 연동 PR #10(main `87a131f14f2ad53c136752d0a062ccbeb102b889`, 이메일 인증 PR #8 포함)과 정책 페이지 PR #9를 머지한 뒤 시작했다.

## 범위와 기준

PM의 `backend-api-contract.md`, `user-aggregate.md`, `email-authentication.md`, `frontend-ui-completion.md`, `public-legal-pages.md`를 우선했다. FE 화면 명세·프로토타입 계획은 탐색과 표현의 참고 자료로만 사용했다. 서버 화면에 mock store/seed를 연결하지 않았으며, 프로필 이미지 업로드·Google 원본 이벤트 제목·회차별 영상 수를 임의로 만들지 않았다.

## 화면별 결과

| 화면 | 변경 |
|---|---|
| 공통 작업 공간 | 기존 시각 스타일을 사용한 사이드바, 팀 전환, 모바일 메뉴 모달, 본문 건너뛰기, 계정 메뉴, 정책 footer |
| 내 팀·생성 | 독립 `/teams/new`, 생성 후 새 팀으로 이동, 입력 보호와 오류 유지 |
| 팀 일정 | 월 달력·목록 전환, 이전/다음 달·오늘, 서버 회차 상태 표시, 일정 조율 진입 |
| 팀 멤버 | 독립 `/teams/:teamId/members`, 본인/관리자 표시, 초대·소유권 위임·퇴출·탈퇴·팀 수정/삭제 |
| 내 일정 | 월 달력·목록, 개인 일정 추가/수정 모달, 종일·여러 날짜 일정 표시, 저장 성공 후 해당 월로 이동 |
| 입력 완료·Google | 확인·동기화 기간과 달력 조회 월 분리, 이메일 계정 연결 불가 사유, 소스 상태 한국어 표시 |
| 조율 | 조건 요약/상태, 후보 카드 비교, 회차별 참석 가능 정보, 선택/확정 권한과 최종 확인 모달 |
| 회차 | 확정·변경 당시 참석 가능 스냅샷, 같은 정기 일정 이전·다음 회차, 영상 카드 |
| 영상·피드백 | 기존 실제 API 쓰기 유지, 수정/삭제 확인을 접근성 모달로 통일 |
| 계정 | 프로필 표시 이름 수정, 충돌 재조회, 읽기 전용 계정 정보, 소유 팀 탈퇴 차단·명시적 서비스 탈퇴 확인 |
| 정책·오류 | 비로그인 `/privacy`·`/terms`, 인증 footer, PM의 실제/데모 구분 문구 반영, 공개 404와 오류 재시도 |

## 구현 결정

- `CalendarView.tsx`는 서버 ISO 시각을 한국 시간으로 변환하고, 화면에 보이는 날짜 범위로만 구간을 분할한다. 종일 `endDateExclusive`와 자정 종료를 다음 날짜에 표시하지 않는다. 월 이동 중에도 컴포넌트를 유지해 선택한 목록/달력 보기를 보존한다.
- `ConfirmAction.tsx`는 공통 Radix 모달과 Promise를 사용한다. 키보드 초점 복원과 취소를 제공하고 언마운트 시 대기 확인을 해제한다. 서버 화면의 native `window.confirm`을 제거했다.
- 개인 일정 저장·삭제 중에는 모달 닫기와 충돌하는 쓰기를 차단한다. 실패 입력과 오류를 모달 안에 유지한다. QA에서 저장 중 Escape가 공통 Modal의 closeDisabled를 우회해 이탈 처리/중첩 모달을 유발함을 확인해, 공통 Dialog에서 Escape·외부 상호작용 dismissal을 명시적으로 차단했다. 데이터 유실이 확인된 결과로 해석하지 않는다.
- 회차 응답의 실제 `scheduleId`를 FE 타입에 포함했다. 이전/다음은 같은 scheduleId의 sequence만 사용한다. 회차 날짜 전후 366일을 조회하며 그 범위를 화면에 명시한다. 다른 기간은 팀 달력으로 탐색한다.
- 서버가 제공하지 않는 Google 원본 일정 목록·영상 수·추천 데이터 기준 시각은 표시하지 않는다. 실제 참석 응답과 추천/확정 당시 참석 가능성을 구분한다.
- 계정 화면은 별도 FE 담당자가 같은 브랜치의 `Account.tsx`를 구현했다. QA 담당자는 테스트와 검증 기록을 독립적으로 작성했다.
- React best practices 기준으로 조건부 hook을 피하고, 독립 조회는 병렬 실행하고, 키가 바뀐 상세 페이지의 작성 상태를 분리했다. 날짜·탐색 UI에는 데이터 의존성이 없는 기존 MonthView를 재사용했다.

## 주요 변경 파일

`src/components/ui/modal.tsx`, `src/app/ServerApp.tsx`, `src/features/server-auth/{Workspace,api,pages}`, `src/features/server-workspace/{Account,Calendar,CalendarView,ConfirmAction,Teams,Scheduling,Records,GoogleCalendar,shared,types}`, `src/features/legal/content.ts`, `src/styles.css`. 테스트·상세 검증은 [03-verification.md](03-verification.md)를 참고한다.

## 검증

- `pnpm typecheck`: 통과.
- `pnpm test`: 최종 7개 파일, 95개 통과(달력 KST·종일 종료 제외·가시 범위 clipping 3개 포함). 인증 복귀 단위 검사에 `/account` 허용과 토큰 query 거절을 추가했다.
- `pnpm build`: 통과. 기존 zod의 Rollup annotation 경고만 발생했으며 빌드 실패는 없었다.
- `pnpm dlx prettier@3.6.2 --write …`: 수정한 구현 파일 형식 정리.
- `git diff --check`: 통과.
- 실제 서버·모바일·접근성 검증과 재검증 결과: [03-verification.md](03-verification.md).

## 경계

운영 배포, BE 코드 변경, OAuth 실제 승인, DNS·운영 설정 변경은 수행하지 않았다. 기존 자동 배포 비활성 설정을 유지한다. 공통 정책 페이지는 검토용 초안 상태를 유지한다. 운영 외부 서비스의 성공을 로컬 검증으로 주장하지 않는다.
