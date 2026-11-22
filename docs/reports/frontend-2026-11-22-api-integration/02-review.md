# 책임자 연동 리뷰

2026-11-22 · 루트 · 소스 검토 완료, PR HEAD·CI 최종 확인 예정

## 근거

PM backend-api-contract.md, email-authentication.md 및 실행 범위 문서를 기준으로 FE 서버 모드와 BE DTO·controller·서비스의 경로, 메서드, 입력, 버전을 대조했다. 기존 인증 PR #8을 기반으로 검토하며 mock 화면과 서버 데이터의 분리를 유지한다.

## 발견·수정 요청

- 기본 Button이 type=button이므로 신규 form 제출 버튼에 type=submit이 필요했다. 실제 로컬 연동 QA에서 발견해 수정했다.
- 내부 라우트 이동·로그아웃에도 미저장 내용을 보호하도록 기존 UnsavedChangesProvider를 재사용했다. 회차 전환 시 영상 입력 폼을 식별자로 분리하고 개인 일정 편집 전환에는 버림 확인을 추가했다.
- 조회 시작 때 기존 데이터를 지워 폼을 언마운트하면 충돌 복구 중 입력이 사라졌다. 같은 리소스의 재조회에서는 데이터를 유지하도록 수정했다.
- 날짜 기본값은 브라우저 로컬/UTC 날짜 혼합 대신 Asia/Seoul 날짜 기준으로 계산한다.
- 회차 변경의 requiredMemberIds는 필수 멤버가 이탈한 경우에만 허용된다. 정상 회차에도 항상 보내던 구현은 BE DefaultOccurrenceService와 맞지 않아 기본 요청에서 생략하도록 수정했다. 로컬 실제 회차 이동 200을 확인했다. 대체 요청은 현재 멤버 ID와 대조해 이탈 멤버의 과거 snapshot ID를 제외한다.
- Google 캘린더 DTO·source 선택·sync 입력과 콜백 복귀 경로를 대조했다. 실제 외부 Google 동의 성공을 주장하지 않는다.
- 환경 API base를 모든 fetch 및 Google 시작 URL에 공통 적용한다. 기본 상대 API 경로와 HTTPS base를 지원하고 잘못된 설정은 조용히 다른 서버로 대체하지 않는다.

## 운영 구성 경계

사용자가 선택한 FE 주소는 https://app.jointeamground.com 이며 API는 https://jointeamground.com/api/v1 이다. Vercel 도메인 등록·DNS 연결 및 production 공개 API base 등록을 완료했다. 실제 HTTPS도 확인했다. 새 연동 코드가 운영에 배포됐다는 의미는 아니다. BE AppOrigin 변경은 별도 변경 세트를 리뷰한 뒤 적용했으며 UPDATE_COMPLETE, app Origin의 CSRF/OPTIONS 200 및 기존 Vercel Origin 403을 확인했다. 기존 이미지와 Google callback은 유지했다.

서버 데이터 변경 검증은 localhost의 테스트 계정·테스트 SMTP로 수행한다. 운영 메일 발송, 실제 OAuth 동의, 운영 사용자 데이터 변경은 하지 않는다. 최종 명령·결과와 미검증 항목은 03-verification.md에 기록한다.

## 소스 검토 결론

위 필수 수정 반영을 확인했다. 조회 실패의 입력 보존과 401/403/404 데이터 제거, /invite의 명시적 서버 모드 진입, 실제 API와 mock 격리도 검토했다. 로컬 단위 테스트 92개와 타입 검사·빌드가 통과했고, 독립 QA가 실제 로컬 BE/SMTP에서 핵심 업무 흐름과 412·401 복구를 확인했다. 최종 소스에 대한 재검증 결과는 03-verification.md를 따른다.

프로필 수정·서비스 탈퇴 UI는 이번 구현 범위 밖이다. 로컬에서 실행하지 않은 Google·초대·권한 및 삭제 기능은 검증 보고서에 구분했다. 필수 수정 사항은 해결됐으며 최종 승인 HEAD와 CI 결과는 현재 커밋을 확인한 뒤 PR 본문에 기록한다. PR #8과 BE #20 의존성, 운영 배포 전환은 별도이며 이 보고서는 운영 전체 기능 검증 완료를 뜻하지 않는다.
