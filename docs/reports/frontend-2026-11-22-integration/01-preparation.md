# FE 연동 준비 결과

작성일: 2026-11-22. 범위는 문서와 비활성 환경 예시 준비이며 연동 구현·동작 검증 완료 보고가 아니다.

## 변경 파일과 주요 결정

- `docs/integration/backend-readiness.md`: PM 계약과 mock/store의 차이, 수령할 배포 설정, 적용 순서, 데이터 격리·롤백, 후속 검증 게이트.
- `docs/integration/env.example`: 주석만 있는 URL 후보. 자동 로딩·변수 소비 코드·API 모드 활성화 없음.
- 이 보고서: 수행 범위, 미검증 항목과 후속 결정 기록.

API 후보는 `https://jointeamground.com/api/v1`이며 정식 FE origin은 미확정이다. PM의 도메인·배포 기록은 참조 자료이고 이번 실시간 검증 결과가 아니다. 실제 서버 응답/DTO 세부, FE origin과 쿠키의 same-site 구성은 BE/PM 인계 후 확정한다. 기존 mock의 global revision, userId 기반 필수 멤버, 데모 token 복사 및 댓글 존재 여부 기반 원본 수정 제한을 서버 계약으로 그대로 옮기지 않는다.

## 실제 수행한 검토

- `AGENTS.md`, FE 지침, 화면 명세와 프로토타입 계획, PM API 계약과 인프라 문서를 읽었다.
- `src/lib/types.ts`, `src/mocks/service.ts`, `src/stores/useAppStore.ts`를 정적으로 대조했다.
- 루트가 BE `origin/main`의 `a28b452743d4a5e1ee7ab556774b97de80e0ddc7`에서 읽어 전달한 CORS·CSRF·OAuth 복귀·초대 fragment 계약을 반영했다. 현재 배포 SHA로 단정하지 않는다. 현재 README의 Vercel origin과 API의 cross-site 차이, `/invite/:token`과 메일 `#token=...` 차이를 연동 선행 과제로 기록했다.
- `git status --short`, `git branch --show-current`로 작업 브랜치와 기존 변경 파일을 읽었다. 문서 내용과 변경 범위만 정적으로 검토한다.

기존 `.gitignore`, `AGENTS.md`, `README.md`, `docs/prototype-plan.md`, `vercel.json` 변경은 이 작업에서 수정하거나 stage하지 않는다. 앱 코드·의존성·워크플로·배포 설정을 변경하지 않는다.

## 미검증 및 공유 상태

사용자 지시에 따라 단위/E2E 테스트, 타입 검사, 빌드, HTTP/API/smoke, 브라우저, DNS 및 배포 검증은 실행하지 않았다. 테스트 결과나 통합 성공을 주장하지 않는다. readiness에 적은 명령은 후속 계획뿐이다. 이번 준비 과정에서는 CI 실행·배포를 직접 호출하지 않았다.

루트 정적 검토 후 문서만 커밋·push·Draft PR로 공유한다. 커밋에는 `[skip ci]`를 포함하되 Vercel 등 기존 외부 연동의 자동 빌드까지 억제한다고 보장하지 않는다. 테스트·빌드·배포를 직접 호출하거나 Actions dispatch/re-run을 하지 않는다. 검증 재개 전에는 무검증 Draft를 유지한다. 확정 커밋 SHA와 실제 공유 상태는 [최종 공유 기록](README.md) 및 [루트 검토 기록](02-review.md)을 따른다.

## 남은 결정과 후속 작업

1. BE 담당자: 실제 연결 URL·배포 버전·OAuth/SMTP 준비 상태, DTO/오류/ETag 헤더, CORS 허용 origin과 쿠키 구성 인계.
2. PM/루트: 정식 FE origin, Preview 정책, 초대 사전 조회 화면 범위, 신규 생명주기 화면 범위 확정 및 공통 계약 반영.
3. FE 담당자: 테스트 재개 지시와 계약 인계 후 API 경계·DTO·조회 상태 및 화면 연동 구현. mock 저장소 격리와 롤백을 함께 구현.
4. FE/BE 연동 검증은 위 준비 및 재개 지시 후 별도 수행한다. 현재 완료 범위는 준비 문서 작성까지다.
