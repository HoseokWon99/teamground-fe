# 백엔드 연동 준비

기준일: 2026-11-22. 이번 범위는 문서와 비활성 환경 예시 준비다. API 클라이언트, 모드 전환, 환경 설정 주입 및 앱 동작 변경은 구현하지 않았다. 사용자 지시에 따라 테스트·타입 검사·빌드·HTTP·브라우저·배포·DNS 검증은 실행하지 않는다.

공통 계약의 원본은 PM의 [API 계약](../../../teamground-pm/docs/backend-api-contract.md)과 [인프라 기록](../../../teamground-pm/docs/aws-infrastructure.md)이다. FE의 [화면 초안](../screen-specification.md)과 [프로토타입 계획](../prototype-plan.md)은 기존 화면과 mock 동작의 참고 자료다. 프로토타입의 임시 정책보다 PM 확정 계약을 우선한다. 아래 구현 순서는 제안이며 실제 구현 완료를 뜻하지 않는다.

## 연결 주소와 수령할 설정

PM 기록에 `jointeamground.com`의 HTTPS 구성과 `/api/v1`, `/api/v1/*` 백엔드 라우팅 이력이 있다. 따라서 API 기준 URL 후보는 `https://jointeamground.com/api/v1`이다. 루트의 테스트 HTML 응답은 API 준비 완료의 증거가 아니다. PM의 ECS 배포 이력 역시 이번 작업에서 다시 검증한 상태가 아니며, 현재 배포 중인 변경의 준비 완료는 BE 담당자가 별도로 인계해야 한다.

| 수령·결정 항목 | 현재 상태 / 반영 기준 |
| --- | --- |
| API 기준 URL, 배포 커밋·이미지·환경 | 위 URL은 문서 기준 후보. BE의 최종 인계 기록에 확정 URL과 배포 버전을 남긴다. FE에서 API 경로를 중복 추가하지 않는다. |
| 정식 FE origin | 미확정. scheme·host·port를 포함한 origin을 정하고 BE 허용 origin, OAuth 복귀 목적지, 초대 링크 기준과 맞춘다. |
| Preview / 로컬 origin | 운영 origin과 구분해 별도 허용 여부를 결정한다. 임의 Preview 도메인 전체를 허용하지 않는다. |
| CORS | 자격 증명 허용, 확정 origin, OPTIONS 처리, 실제 메서드, `Content-Type`, `X-CSRF-TOKEN`, `If-Match` 허용 및 `ETag` 노출을 BE와 대조할 예정. 요청 ID 헤더를 읽게 되면 실제 헤더 이름과 노출 설정도 인계받는다. |
| 쿠키와 OAuth | 운영 Secure·HttpOnly·SameSite=Lax 계약. FE와 API가 cross-site이면 `credentials: "include"`만으로 쿠키 전송이 보장되지 않으므로 same-site FE 도메인 또는 별도 구조를 PM에서 결정한다. Google 설정 준비 여부·로그인/캘린더 승인 callback 및 FE returnTo 복귀 경로를 받는다. |
| Vercel 설정 | 프로젝트·Production/Preview 환경 구분, FE origin, SPA fallback과 빌드 시점 공개 변수 주입 여부를 후속 배포 작업에서 대조한다. 기존 로컬 `vercel.json`은 이 작업의 변경 대상이 아니다. |
| 환경 예시 | [env.example](env.example)은 docs 아래 주석만 있는 파일로 자동 로딩되지 않는다. `VITE_API_BASE_URL`은 미구현 제안 이름이다. 값 복사만으로 연동되지 않는다. |

OAuth client secret, 세션 원문, DB·Redis 비밀번호, AWS 자격 증명은 FE 환경 변수에 넣지 않는다. Vite 공개 변수는 번들에 포함되므로 공개 URL 이외 비밀값을 담지 않는다. 이번 작업은 실제 배포 설정을 조회·수정하거나 배포를 호출하지 않는다.

현재 로컬 README에는 `https://teamground-fe.vercel.app`이 표시되어 있다. API apex와는 cross-site이므로 이 주소에서 Lax 쿠키 인증이 된다고 가정하지 않는다. `https://app.jointeamground.com` 같은 same-site FE 주소는 미확정 제안이며 이번에는 DNS·도메인 연결·배포 설정을 바꾸지 않는다.

루트가 BE `origin/main`의 `a28b452743d4a5e1ee7ab556774b97de80e0ddc7`을 정적으로 읽어 전달한 추가 근거는 아래와 같다. 이 SHA는 현재 배포 SHA로 확인된 값이 아니다.

- `SecurityConfiguration`: app origin은 단일 exact 값, credentials 허용. 허용 헤더는 `Content-Type`, `If-Match`, `X-CSRF-TOKEN`, `Idempotency-Key`; 노출 헤더는 `ETag`, `Location`, `Retry-After`, `X-Request-Id`다. 헤더 허용만으로 모든 엔드포인트의 Idempotency-Key 동작을 보장하지 않는다.
- CSRF 쿠키도 HttpOnly·Lax이므로 JS 쿠키 직접 읽기가 아니라 JSON `data.token`을 사용한다. 로그인 성공 시 CSRF가 clear되므로 복귀 후 다시 발급받는다. 로그인 실패 복귀는 `/?authError=CODE`이며 FE가 해당 오류를 표시하는 경로를 추가해야 한다.
- BE 설정 인계 이름은 `TEAMGROUND_APP_ORIGIN`, 로그인용 `TEAMGROUND_GOOGLE_REDIRECT_URI`, 별도 캘린더용 `TEAMGROUND_CALENDAR_GOOGLE_REDIRECT_URI`, `TEAMGROUND_INVITATION_ACCEPT_URL`이다. 이는 BE 설정 이름이며 Vite 공개 변수로 복사할 목록이 아니다.
- 초대 메일은 `#token=...` fragment를 사용하지만 현재 FE 경로는 `/invite/:token`이다. 인계받은 초대 수락 URL의 경로에 맞춰 fragment를 읽고 `POST /invitations/accept` 본문으로 전달해야 한다. OAuth 왕복 중에는 단기·동일 탭 범위로 보존할 방식을 정하고, 수락·취소·실패 종료 시 제거한다. 읽은 원문은 주소에서 제거하고 쿼리·로그·분석 이벤트에 넣지 않는다. 구체적인 보존 방식은 구현 단계에서 결정하며 현재 코드는 변경하지 않는다.

## 기존 mock과 API의 차이

정적 대조 대상: `src/mocks/service.ts`, `src/stores/useAppStore.ts`, `src/lib/types.ts`. 현재 읽기도 store의 데이터에 의존하므로 서비스 함수의 쓰기만 HTTP로 바꾸면 화면은 최신 서버 상태를 표시할 수 없다.

| 영역 | 기존 FE | 연동 시 필요한 변경 |
| --- | --- | --- |
| 상태·인증 | seed + Zustand persist, `sessionUserId`로 데모 계정 선택 | 서버 `GET /me`를 세션 판정 근거로 사용. HttpOnly 세션을 JS 저장소에서 읽거나 복제하지 않는다. 모든 서버 조회·변경 경로에 credentials include를 일관 적용한다. |
| 응답·오류 | 서비스 반환값과 한국어 `Error` | 성공 `{data: ...}`를 해제하고 204는 JSON 파싱하지 않는다. 오류 `{error:{code,message,requestId}}`와 HTTP 상태를 보존한다. HTML·빈 본문·네트워크 실패도 별도 오류로 취급한다. |
| CSRF | 없음 | `GET /auth/csrf`의 `data.token`을 메모리에 보관하고 변경 요청에 `X-CSRF-TOKEN`을 보낸다. 로그인/로그아웃 이후 토큰 상태를 새로 맞춘다. CSRF 오류를 이유로 쓰기 요청을 무한 재전송하지 않는다. |
| 버전 | 전체 데이터 `revision` | 리소스별 ETag를 응답과 함께 보관하고 해당 리소스 변경 시 따옴표를 포함한 `If-Match`를 전송한다. 임의 전역 revision으로 대신하지 않는다. 피드백 생성에는 대상 영상 ETag를 사용한다. |
| 식별자·유저 | user `name/email`, membership은 teamId/userId/role, 필수 대상 `requiredIds` | `displayName/verifiedEmail`을 UI에 매핑. userId와 membershipId를 별도로 보관. 조율 `requiredMemberIds`에는 membershipId, 소유권 이전·멤버 퇴출에는 userId를 쓴다. 서버 발급 ID를 사용하며 seed ID를 보내지 않는다. |
| 역할 | `admin/member` | `OWNER/MEMBER`와 명시적 변환. 이름 변경만으로 끝내지 않고 작성자·소유자 정책을 기능별 적용한다. 영상/피드백 수정은 작성자, 삭제는 작성자 또는 소유자다. 서버가 최종 권한을 판단한다. |
| 초대 | 원문 token을 저장하고 데모 링크 복사, 사전 조회 화면 | 서버 발급 원문은 메일로만 전달. 현재 PM에 공개 초대 상세 조회 계약은 없다. 수락 전 팀명·이메일 표시 요구는 계약 추가 또는 화면 축소를 먼저 결정한다. 임의 조회 API를 만들지 않는다. |
| 개인 일정 | 오프셋 없는 `start/end`, 종일도 같은 필드 | 시간 일정 `startsAt/endsAt`는 오프셋 포함. Asia/Seoul 입력을 명시적으로 변환한다. 종일 `startDate/endDateExclusive`는 날짜로 유지. 확인 범위 `dateFrom/dateTo`는 양끝 포함. |
| 캘린더 | 연결·동기화 시뮬레이션, confirmed boolean | 연결/소스 선택/동기화/확인 범위를 분리한다. 실제 연결 상태와 성공 범위·최신성에 근거해 표시하며 실패·미확인을 참석 가능으로 바꾸지 않는다. |
| 조율·추천 | 로컬 draft·추천 계산·revision·확정 | 서버 조율 생성 → 후보 조회 → selection → confirm의 리소스 흐름으로 전환. `durationMinutes/windows/attendanceMode`와 서버 후보 ID를 보존. `AVAILABLE/UNAVAILABLE/UNKNOWN`은 UI의 available/busy/unknown에 명시적으로 매핑한다. |
| 영상 | `url`, HTTP와 로컬 demo 허용, 현재 댓글 존재 여부로 수정 제한 | `sourceUrl`, HTTPS, 서버 `playbackType` 기준. 첫 피드백 이력이 있으면 현재 댓글이 0개여도 원본 교체·회차 이동 제한. 취소 회차의 신규 작성 제한과 작성자/소유자 삭제 권한을 반영한다. |
| 추가 생명주기 | 팀 삭제·소유권 이전·회차 수정/취소·서비스 탈퇴 화면은 프로토타입 제외 | 서버 지원 자체를 FE 완료로 표시하지 않는다. PM에서 화면 범위를 정한 뒤 별도 구현한다. |

시각 구간은 시작 포함·종료 미포함이다. 브라우저 로컬 시간대에 암묵 의존하거나 날짜를 UTC 문자열로 바꾼 뒤 자르지 않는다. 조회 `from/to`의 경계 의미, weekday 인코딩, 상세 응답 필드와 버전 충돌 오류 코드/상태는 PM 요약만으로 추정하지 않고 BE DTO 및 최신 계약 인계로 확정한다.

401은 서버 캐시와 인증 상태를 정리하고 재로그인을 안내한다. 403은 오류 코드에 따라 업무 권한 부족, `ORIGIN_DENIED`(허용 origin 설정 문제), `CSRF_DENIED`(CSRF 상태 문제)를 구분한다. origin 거절을 재로그인으로 해결된다고 안내하거나 CSRF 거절에 쓰기를 무조건 재전송하지 않는다. 다른 스페이스 리소스의 404는 노출 없이 없는 항목으로 처리한다. 버전 충돌은 입력을 보존한 채 최신 조회·재선택을 요구하며, 최신 ETag로 자동 덮어쓰지 않는다. 5xx·연결 실패에는 재시도 수단과 requestId를 제공하되 요청 본문·초대 token·CSRF token을 로그에 남기지 않는다. Google 미설정 로그인 503은 데모 로그인으로 우회하지 않는다.

## 후속 구현 순서와 격리

1. PM/BE에서 URL·origin·쿠키 구조·DTO·오류·헤더·배포 버전을 인계받고, 사용자 테스트 재개 지시를 받는다. 이번 작업에서는 어느 요청도 실행하지 않는다.
2. 서비스 경계, DTO 변환, 공통 HTTP 처리, 리소스별 버전 캐시를 구현한다. 모드 선택 방식은 이때 확정한다. 현재 코드에 API 모드 스위치는 없다.
3. [PM 공통 준비 문서](../../../teamground-pm/docs/frontend-backend-integration-readiness.md)의 순서에 맞춰 인증 및 `/me` → 팀·멤버 읽기 → 개인 일정 → 조율·선택·확정 → 회차·영상·피드백을 연결한다. 초대와 실제 Google Calendar 연동은 별도 승인 후 진행한다. 새 조회 데이터를 store selector 소비 경로까지 전달한다.
4. API 상태는 기존 `teamground-prototype-v1`과 분리한다. 기존 mock 저장 데이터를 자동 업로드·변환·삭제하지 않는다. API 캐시는 환경·로그인 사용자·스페이스별로 분리하고 로그아웃/계정 전환 시 제거한다. 민감한 서버 데이터를 무조건 persist하지 않는다.
5. API 모드에서는 seed 주입, 데모 계정 선택, 실패 주입, 시나리오 전환, 데모 초기화가 서버 작업으로 연결되지 않게 한다. 네트워크 실패 시 mock 데이터로 자동 대체하지 않는다. 중복 클릭 억제와 서버의 확정 재요청 정책을 구분하며 임의 Idempotency-Key 지원을 가정하지 않는다.
6. 롤백은 알려진 mock 배포로의 명시적 전환으로 설계한다. 진행 중 요청을 중단하고 API 메모리 캐시를 폐기하되 서버 쓰기 이력을 되돌린 것으로 표시하지 않는다. API 데이터가 mock 저장소에 남지 않게 하고, 기존 mock 데이터 복원에는 사용자 확인 정책을 유지한다. 전환 전에 배포 버전과 남은 서버 변경을 기록한다.

## 검증 계획 — 이번에는 실행하지 않음

후속 검증은 테스트 재개 지시와 확정 배포/설정 인계 후 별도 작업으로 수행한다. 아래는 계획이며 통과 결과가 아니다.

- FE 계약 변환·204/비JSON 오류·401·권한·CSRF·리소스 ETag 충돌·날짜 경계에 필요한 검증을 작성하고 실행한다.
- 실제 확정 FE origin에서 CORS preflight, 쿠키 세션, 로그인 복귀, CSRF 갱신, ETag 노출을 확인한다. cross-site Preview 결과를 정식 origin의 성공으로 대체하지 않는다.
- 실제 사용자 계정으로 팀/멤버/초대 → 일정 확인 → 추천/선택/확정 → 영상/피드백 → 새로고침 흐름과 계정·팀 격리를 확인한다.
- 동시 변경 후 충돌 처리, 만료 세션, 취소 회차, 첫 피드백 이후 원본 변경 제한, 서비스 탈퇴 등 확정 범위를 확인한다.
- 명령 후보 `pnpm typecheck`, `pnpm test`, `pnpm build` 및 필요한 브라우저·통합 검증은 후속 실행 시 실제 명령·배포 버전·결과를 새 보고서에 남긴다.

문서 커밋의 `[skip ci]`는 GitHub CI 실행 억제를 위한 표식이며 모든 외부 통합의 비실행을 보장하지 않는다. 특히 push/PR로 기존 Vercel 연동의 자동 빌드가 시작될 수 있다. 루트 승인에 따라 문서만 push·Draft PR로 공유하되 테스트·빌드·배포를 직접 호출하거나 Actions dispatch/re-run을 하지 않는다. 실제 공유 상태는 [최종 공유 기록](../reports/frontend-2026-11-22-integration/README.md)을 따른다. 검증 재개 전에는 무검증 Draft로 유지한다.
