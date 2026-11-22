# 책임자 정적 리뷰 · 연동 준비

2026-11-22 · 루트

## 검토 범위

테스트 금지 지시를 우선한다. 문서·소스 읽기와 diff 검토만 수행하며 타입 검사·빌드·단위/E2E·HTTP·브라우저·DNS·배포 확인을 실행하지 않는다. 준비 문서는 실행 결과나 실제 연동 성공을 의미하지 않는다.

## 근거

- FE main `9a902b17c31edff3a671a2877fec3b151f7b736e`는 승인된 PR #5를 포함한다.
- BE 체크아웃은 인프라 브랜치로 유지했다. 로컬 origin/main `a28b452743d4a5e1ee7ab556774b97de80e0ddc7`의 SecurityConfiguration, SessionCookies, GoogleLoginRedirects, AuthController, TeamspaceController, application.yml 및 README를 git show로 읽었다. 배포 SHA와 같다고 간주하지 않는다.
- 단일 APP_ORIGIN·credentials·노출 ETag와 Request ID, HttpOnly CSRF JSON 취득, OAuth 성공 후 CSRF 초기화·실패 복귀, 초대 fragment 형식을 코드/문서에서 확인했다.
- PM API 계약·인프라 기록과 FE mock 흐름을 대조했다. 현재 Vercel origin과 API는 다른 사이트이므로 동일 사이트 배치 또는 별도 프록시 결정을 선행한다. FE 운영 origin은 미확정이다.

## 승인 조건

- 환경 예시는 docs 하위에 두고 모두 주석 처리하여 자동 적용하지 않는다. API base env는 아직 코드에서 소비하지 않는 제안임을 명시한다.
- actual API 응답을 mock seed에 섞거나 HTTP 오류를 demo 데이터로 감추지 않는 전환·롤백 계획을 둔다.
- 로그인/초대 토큰·ETag·서버 ID·시간대의 차이를 명시한다. 비밀값을 읽거나 FE 환경 예시에 넣지 않는다.
- 이번에는 구현 및 테스트를 완료했다고 표현하지 않는다. 테스트 보류 때문에 새 CI 성공을 승인 조건으로 요구하거나 워크플로를 직접 시작하지 않는다.

## 정적 리뷰 결과

FE 담당의 준비표와 비활성 예시를 검토했다. API 주소가 실행 확인이 아닌 문서 기준임을 명시했고, origin·쿠키·초대 fragment·리소스 ETag·ID·시간 변환·mock 격리 조건을 포함했다. 공통 PM 문서와 적용 순서를 일치시키고 403의 권한·Origin·CSRF 원인을 구분하도록 피드백했다. 앱 코드·설정·워크플로 수정은 없다.

문서 범위 승인. 커밋에 `[skip ci]`를 포함하여 준비 변경의 GitHub 테스트 실행을 억제한다. 외부 Vercel 연동의 기존 자동 빌드는 별도로 발생할 수 있으나 직접 빌드·테스트·배포 호출은 하지 않는다. 새 준비 PR은 테스트 미실행 상태를 명시하고 Draft로 유지한다. 최종 커밋 SHA 및 공유 상태는 PR 본문에 기록한다.

PM 준비 문서는 Git 체크아웃이 없는 `teamground-pm/docs/frontend-backend-integration-readiness.md`에 로컬 저장했다. 다른 저장소를 초기화하거나 배포 중인 BE 체크아웃을 변경하지 않았다.
