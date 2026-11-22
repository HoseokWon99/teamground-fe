# GitHub Actions Vercel 배포 파이프라인

2026-11-22 · 루트 책임/리뷰

사용자 요청에 따라 FE 배포를 GitHub Actions에서 실행할 수 있도록 구성했다. 앞선 테스트 보류 및 백엔드 연동 준비 한정 지시는 유지한다. 파이프라인 구현과 GitHub 설정은 완료했으나 토큰 등록·활성화·실행 검증은 남아 있다.

## 위임과 리뷰

후속 PR #7 머지 요청에서는 `fe_vercel_merge_hold`에게 Git 자동 배포 차단을 위임했다. 아래 최초 구현 기록과 달리 루트 `vercel.json`도 기존 설정을 보존하고 `git.deploymentEnabled=false`를 추가해 추적한다. 다른 사용자 변경 네 파일은 보존한다. 추가 커밋과 머지 제목에 `[skip ci]`를 사용하고 Actions 활성화 값은 false를 유지한다. 최종 승인 HEAD와 머지 결과는 [PR #7](https://github.com/HoseokWon99/teamground-fe/pull/7) 본문에 기록한다. 토큰 등록 안내는 운영 문서에 추가했으며 테스트·실배포는 계속 보류한다.

| 담당 | 작업 | 결과 |
|---|---|---|
| fe_vercel_pipeline | 워크플로·CI 전용 Vercel 설정·운영 안내 구현 | [01-implementation.md](01-implementation.md) |
| fe_vercel_review | 권한·이벤트·SHA·환경·비밀값·동시성 독립 정적 검토 | 필수 수정 사항 없음, 실제 실행 미검증 |
| 루트 | 기존 설정 확인, GitHub 환경/변수 구성, 최종 diff 리뷰 | [02-review.md](02-review.md) |

## 구성

- Production: 같은 저장소 main push의 `Frontend quality` 전체 성공 → 운영 environment 승인 → 해당 SHA의 prebuilt 배포.
- Preview: main에서 수동 실행. Production 수동 우회는 없다.
- 공통: `VERCEL_ACTIONS_ENABLED=true`일 때만 실행, 정확한 SHA checkout, 두 번의 최신 main 확인, 대상별 배포 직렬화, CLI와 Actions 버전 고정.
- CI 설정은 `config/vercel.ci.json`으로 Vite·frozen install·dist·SPA fallback을 명시한다. 기존 미추적 `vercel.json`은 보존했다.

## 실제 설정한 항목

- Repository variables: `VERCEL_ORG_ID=team_er4AXNezYY2C1ysS4HHRmeZQ`, `VERCEL_PROJECT_ID=prj_nRNXuR2Wnj36vjHcTHvQign3eWgC`, `VERCEL_ACTIONS_ENABLED=false`.
- 새 environment `vercel-production`: main 브랜치만 허용, required reviewer `HoseokWon99`. 자기 실행 승인 가능, 관리자 우회는 기본 허용이다.
- 새 environment `vercel-preview`: main 브랜치만 허용.
- 기존 자동 배포용 `Production`/`Preview` 환경은 변경하지 않았다. 새 두 환경의 Secret 목록은 비어 있었다.

## 활성화 전 남은 작업

1. 사용자가 두 environment의 `VERCEL_TOKEN` Secret을 GitHub 설정에서 직접 등록한다. 토큰을 대화에 붙여 넣지 않는다.
2. Vercel 프로젝트 대상·설정과 Git 자동 배포 중복 해소 방법을 확정한다. 이번에는 기존 Vercel Git 연결을 끄지 않았다.
3. 워크플로를 main에 반영하고 테스트/배포 보류를 해제한 뒤 활성화 값을 true로 변경하여 Preview부터 실행한다. 활성화 값 변경 자체가 배포를 시작하지는 않는다.

[운영 설정·전환 절차](../../deployment/github-actions.md), [GitHub 환경 설정](https://github.com/HoseokWon99/teamground-fe/settings/environments)

## 수행 범위

소스·문서·공식 패키지 metadata·Git diff를 정적으로 읽었다. 앱 테스트·타입 검사·빌드·actionlint·Vercel CLI 실행·워크플로 dispatch·실배포·백엔드 호출은 하지 않았다. 새 PR에는 `[skip ci]`를 사용하고 Draft로 유지한다. 기존 외부 Git 연동의 자동 빌드까지 이 표식으로 차단되는 것은 아니다.

기존 사용자 변경 다섯 파일은 보존한다. PR #5는 main `9a902b17c31edff3a671a2877fec3b151f7b736e`에 머지됐고, 연동 준비 [PR #6](https://github.com/HoseokWon99/teamground-fe/pull/6)은 별도 Draft다. 이 배포 작업은 PR #6의 API 구현이나 실제 백엔드 연결을 포함하지 않는다.
