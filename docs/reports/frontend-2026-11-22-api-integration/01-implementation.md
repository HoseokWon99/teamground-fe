# 실제 API 화면 연동 구현

2026-11-22. 인증 PR #8의 `74b3a324f036f2c2bef838d9b797d94c1f098750`에서 시작한 서버 전용 화면 확장이다. 원래 체크아웃과 인증 작업 트리의 변경은 보존한다.

## 구현 범위

| 영역 | 구현 |
| --- | --- |
| 공통 전송 | `/api/v1` 기본값, 선택적 HTTPS `VITE_API_BASE_URL`, 쿠키 포함, 모든 변경 전 fresh CSRF, PATCH/PUT/DELETE, quoted If-Match, 오류·재시도·401 세션 해제 |
| 팀 | 목록/생성/상세/정보 수정/이름 확인 삭제, 멤버 조회/퇴출/관리자 위임/본인 탈퇴 |
| 초대 | 목록/이메일 발급/재발급/취소, `/invite#token=...` 메모리 캡처·URL 즉시 정리·수락 |
| 개인 일정 | 기간 조회, 시간·종일 생성/수정/삭제, 입력 완료 범위 조회/확인 |
| Google 캘린더 | Google 회원만 연결 시작·상태·소스 선택·기간 동기화·해제, 이메일 회원 안내. 실제 OAuth는 미검증 |
| 조율 | 생성/목록/상세/조건 변경, 복수 탐색 시간대, 전원/필수 멤버(membershipId), 서버 후보/회차별 참석 가능 정보, 선택/관리자 확정 |
| 회차 | 기간 목록/상세/시간 변경/필수 멤버 대체/취소 |
| 영상 | 회차별 등록/조회/수정/삭제, 직접 재생 및 원본 열기, 피드백 이력에 따른 원본·회차 이동 제한, ±365일 회차 이동 선택 |
| 피드백 | 영상별 생성/조회/작성자 수정/작성자·관리자 삭제, 생성은 영상 버전·변경/삭제는 피드백 버전 |
| 입력 보호 | 기존 UnsavedChangesProvider 재사용, 새로고침·SPA 이동·로그아웃 보호, 편집 닫기 확인, 개인 일정 편집 전환 확인 |

`server-workspace`와 `server-auth`는 mock store/seed를 가져오지 않는다. API 실패를 데모 데이터로 대체하지 않는다. 서버 계산과 권한·최신 버전 검증이 최종 기준이다. 재조회 때 같은 리소스 데이터와 입력을 유지하고(401/403/404는 접근 종료 처리) 라우트가 달라지면 이전 리소스를 표시하지 않는다.

## API 설정

기본 `/api/v1`은 Vite의 로컬 BE 프록시를 사용한다. 운영 FE `app.jointeamground.com`은 빌드 환경 `VITE_API_BASE_URL=https://jointeamground.com/api/v1`를 사용한다. fetch와 Google 로그인/캘린더 승인 이동이 같은 helper를 사용한다. 잘못된 URL 설정을 다른 서버로 조용히 대체하지 않는다. HTTPS, credentials include, 허용 CORS origin 설정이 필요하다. 운영 배포·DNS·메일·OAuth 검증은 이 코드 작업의 완료 근거가 아니다.

`vercel.json`의 `git.deploymentEnabled: false`로 Git push 자동 배포를 차단한다. 이 PR은 기존 인증 PR #8에 의존하지만 main 대상 필수 CI를 실행하기 위해 base를 main으로 둔다. 신규 작업 diff는 `74b3a32..HEAD`다. PR #8이나 BE PR #20을 자동 병합하지 않는다.

## 실제 실행한 검증

- `pnpm test`: 전체 `src` 테스트 실행. 6 files / 92 tests 통과(transport/auth 18 포함).
- `pnpm typecheck`: 통과.
- `pnpm build`: 통과. upstream Zod 주석에 대한 Rollup 경고 2건만 있으며 빌드 성공.
- 실제 로컬 BE/Mailpit 브라우저 흐름과 상세 결과는 `03-verification.md`에 기록한다.

## 미구현·미검증 범위

- 프로필 표시 이름 변경(`/me PATCH`), 서비스 탈퇴(`/me DELETE`) 화면은 이번 범위에 추가하지 않았다.
- Google 실제 계정 OAuth 승인/외부 캘린더 데이터, 실제 운영 SMTP 전달, 운영 FE/BE 브라우저 연동은 미검증이다.
- 회차 영상 이동 대상은 현재 날짜 기준 이전/이후 365일 범위다.
- API는 초대 공개 상세 조회를 제공하지 않는다. 비로그인 초대 화면은 메일 링크를 로그인 후 다시 열도록 안내하며 토큰을 저장소나 returnTo에 보존하지 않는다.
- 기록 화면은 서버 DTO 중심 목록 UI이며 기존 데모의 월간 달력·풍부한 시각화 전체를 이식하지 않았다.
