# PR #5 마감 및 백엔드 연동 준비

2026-11-22 · 책임/리뷰: 루트

사용자 요청은 PR #5 머지·결과 기록과 백엔드 연동 준비다. **테스트와 실제 연동은 아직 수행하지 않는다.**

## PR #5 머지 결과

- PR: [#5](https://github.com/HoseokWon99/teamground-fe/pull/5)
- 승인·재확인 HEAD: `046eb351576534e438eafd1c5e136006652cbb09`
- main 머지 SHA: `9a902b17c31edff3a671a2877fec3b151f7b736e`
- 머지 완료: 2026-11-22 14:24:40 KST
- `gh pr merge --merge --match-head-commit`으로 승인 HEAD를 지정해 머지했다. 브랜치는 삭제하지 않았다.
- 머지 전 **기존** 타입·단위·빌드, Chromium·Firefox·WebKit, Vercel·Preview Comments 성공을 재확인했다. [기존 CI 실행](https://github.com/HoseokWon99/teamground-fe/actions/runs/44988024731)의 74개 단위·58개 브라우저 결과는 앞선 작업의 근거이며 이번 작업에서 재실행하지 않았다.
- 머지로 기존 main 자동화가 실행될 수 있다. 새로운 테스트·워크플로를 직접 실행/재실행하지 않았다. 준비 문서에는 `[skip ci]`를 적용한다.

## 위임 및 산출물

| 담당 | 범위 | 기록 |
|---|---|---|
| fe_integration_prep | FE mock/API 차이, 전송·인증·상태 전환 준비, 비활성 환경 예시 | [01-preparation.md](01-preparation.md), [연동 준비표](../../integration/backend-readiness.md), [환경 예시](../../integration/env.example) |
| 루트 | PM 공통 준비 조건, 실제 BE 소스 정적 대조, 머지 기록 및 문서 리뷰 | [02-review.md](02-review.md), PM `docs/frontend-backend-integration-readiness.md` |

## 현재 범위

도메인은 배포 문서의 `jointeamground.com`, API 후보 base는 `https://jointeamground.com/api/v1`이다. 이번에는 도메인·API·배포 상태를 호출해 확인하지 않았다. 현재 FE 문서의 Vercel origin과 API 간 동일 사이트 쿠키 조건, 실제 초대 fragment 형식, UUID/membershipId, ETag, ISO 날짜와 mock 저장 데이터 격리 조건을 정리한다.

runtime 코드, API 활성화, DNS·Vercel·백엔드 배포 설정은 변경하지 않는다. 기존 사용자 dirty `.gitignore`, `AGENTS.md`, 루트 `README.md`, `docs/prototype-plan.md`, `vercel.json`은 보존한다. 이후 구현·테스트를 시작하려면 배포 값 확정과 사용자의 테스트 진행 지시가 필요하다.

[전체 작업 기록](../README.md)
