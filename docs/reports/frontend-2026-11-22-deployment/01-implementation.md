# FE Vercel GitHub Actions 구현 보고

## 범위와 결과

- `.github/workflows/vercel-deploy.yml`: opt-in, 성공한 main push 품질 검사 후 Production, main 수동 Preview, 환경 분리, 정확한 커밋 checkout, 두 번의 최신 main 검사, 대상별 직렬화, 고정 CLI/Actions, prebuilt 배포와 summary.
- `config/vercel.ci.json`: 기존 로컬 설정과 동등한 Vite 빌드/설치/output/SPA fallback을 CI에서 명시적으로 사용.
- `vercel.json`: 기존 로컬 Vite/빌드/설치/output/SPA fallback 설정을 보존하고 `git.deploymentEnabled: false`를 추가해 Git 연동 자동 배포를 차단.
- `docs/deployment/github-actions.md`: 환경·비밀값·활성화·Git 자동 배포 전환·후속 검증 절차.

기존 dirty `.gitignore`, `AGENTS.md`, `README.md`, `docs/prototype-plan.md`는 수정하거나 커밋하지 않는다. 기존 미추적 `vercel.json`은 머지 시에도 실제 배포를 보류하기 위해 Git 자동 배포 차단 항목만 추가하여 이번 변경에서 추적한다. 작업은 `codex/fe-vercel-actions`에서 수행했다. 현재 구현은 정적 검토 대상이며 배포 완료 상태가 아니다.

## 실제 수행한 확인

- root/FE `AGENTS.md`, 관련 화면·프로토타입 문서, 기존 `quality.yml`, `package.json`, 로컬 `vercel.json`을 읽었다.
- `npm view vercel version engines --json`: CLI 66.6.0, Node >=20 확인. 패키지를 설치하거나 실행하지 않았다.
- `git ls-remote https://github.com/actions/checkout.git refs/tags/v6`: `d23441a48e516b6c34aea4fa41551a30e30af803`.
- `git ls-remote https://github.com/actions/setup-node.git refs/tags/v6`: `249970729cb0ef3589644e2896645e5dc5ba9c38`.
- `git ls-remote https://github.com/pnpm/action-setup.git refs/tags/v4.2.0`: `9fd676a19091d4595eefd76e4bd31c97133911f1`.
- Vercel 공식 CLI 전역 옵션 문서에서 `--local-config` 및 `VERCEL_TOKEN` 환경 변수 지원 확인.
- `git diff --check`: 기존 tracked 변경에 공백 오류 없음. 새 워크플로는 `git diff --no-index -- /dev/null .github/workflows/vercel-deploy.yml`로 읽고 검토했다.
- 최초 구현 시 `git diff --no-index -- vercel.json config/vercel.ci.json`: 차이 없음, 종료 코드 0. 후속 변경에서 루트 `vercel.json`에만 Git 자동 배포 차단 항목을 추가했다. CLI용 `config/vercel.ci.json`은 유지한다.
- 신규 4개 파일 각각 `git diff --no-index --check /dev/null <file>`: 공백 오류 출력 없음. 새 파일 diff이므로 종료 코드 1이며 앱 테스트 결과가 아니다.

루트 에이전트가 GitHub repository variables에 프로젝트 IDs와 `VERCEL_ACTIONS_ENABLED=false`를 설정했다. `vercel-production`(main 제한, HoseokWon99 required reviewer), `vercel-preview`(main 제한)를 준비했다. Production은 자기 실행 승인 및 관리자 우회가 허용된 설정이다. 두 환경의 `VERCEL_TOKEN`은 미등록이며 사용자 직접 입력이 필요하다. 기존 `Production`/`Preview` 환경은 유지했다. 이 설정 작업으로 테스트나 배포를 실행하지 않았다.

## 보류 사항

사용자 테스트 보류 지시에 따라 앱 테스트/typecheck/build/브라우저/백엔드 HTTP/실배포/workflow dispatch는 실행하지 않았다. 워크플로 파서·actionlint 실행도 하지 않았다. 이번 변경의 실행 검증 결과나 실제 배포 URL은 없다. 환경 보호 규칙·IDs·토큰과 프로젝트 설정을 확인하고, 추후 테스트·배포를 진행할 때 opt-in을 활성화한 뒤 검증해야 한다. Git 자동 배포는 루트 `vercel.json`의 `git.deploymentEnabled: false`로 차단하며 Actions opt-in은 비활성 상태로 유지한다.

Production은 최신 main 커밋의 전체 품질 검사 성공과 환경 승인 후 배포하도록 설계했다. 최종 SHA 확인과 실제 배포 사이의 새 main push를 원자적으로 막지는 않는다. 같은 대상 Actions 실행은 직렬화된다. Git 연동 자동 배포는 차단하고, 추후 명시적으로 활성화하는 Actions CLI 배포만 사용한다.
