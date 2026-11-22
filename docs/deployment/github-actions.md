# GitHub Actions를 통한 Vercel 배포

`.github/workflows/vercel-deploy.yml`은 React/Vite SPA를 Vercel에 배포한다. 구현 시점에는 사용자 지시에 따라 테스트와 배포 실행을 보류했다. `VERCEL_ACTIONS_ENABLED`를 `true`로 설정하기 전에는 모든 배포 job이 건너뛰어진다. 워크플로를 추가했다는 사실만으로 배포가 검증되거나 활성화된 것은 아니다.

## 실행 대상

| 진입 | 조건 | Vercel 대상 | GitHub environment |
|---|---|---|---|
| 자동 | 같은 저장소의 main push에서 `Frontend quality` 전체 성공 | Production | `vercel-production` |
| 수동 `workflow_dispatch` | main에서 실행 | Preview | `vercel-preview` |

두 경로 모두 repository variable `VERCEL_ACTIONS_ENABLED == true`가 필요하다. PR/fork 품질 검사 결과와 main 이외 수동 실행은 배포하지 않는다. 수동 Production 우회 경로는 없다. `workflow_run` 워크플로는 기본 브랜치에 머지되어 있어야 동작한다.

자동 배포는 완료된 품질 검사의 `head_sha`를 checkout한다. 수동 Preview는 dispatch 시점 `github.sha`를 checkout한다. 두 경로 모두 checkout 전과 배포 직전에 GitHub API로 최신 main SHA와 비교하고, 달라지면 실패 처리하여 배포를 중단한다. target별 concurrency group과 `cancel-in-progress: false`로 진행 중인 같은 대상 배포가 겹치지 않게 한다. GitHub concurrency는 FIFO를 보장하지 않으며 대기 중 실행은 대체될 수 있다. 최신 SHA 검사는 최종 확인 이후의 새 push까지 원자적으로 막지는 않는다. 새 커밋은 자기 품질 검사 성공 후 후속 배포 대상이 된다.

Production은 기존 `.github/workflows/quality.yml`의 typecheck·unit·build·Chromium/Firefox/WebKit job 전체 성공을 기다린다. 품질 워크플로를 변경해 기준이 약화되지 않도록 main 및 워크플로 변경을 코드 리뷰로 보호한다. Preview는 환경 설정과 배포 동작을 확인하기 위한 수동 경로이며 품질 검사 성공을 강제하지 않는다.

## 활성화 전 설정

2026-11-22 설정 상태: repository variables의 두 ID를 등록했고 `VERCEL_ACTIONS_ENABLED=false`를 유지한다. 새 `vercel-production`은 main branch만 허용하며 `HoseokWon99`를 required reviewer로 지정했다(자기 실행 승인 가능, 관리자 우회는 기본 허용). 새 `vercel-preview`도 main branch만 허용한다. 기존 `Production`/`Preview` 환경은 변경하지 않았다. 두 새 환경의 secret 목록은 비어 있으며 사용자가 각각 `VERCEL_TOKEN`을 직접 등록해야 한다. 현재 opt-in이 false이므로 수동 Preview도 실행되지 않는다.

1. GitHub Settings → Environments에 `vercel-production`, `vercel-preview`를 준비하고 deployment branches를 `main`으로 제한한다. Production에는 담당 required reviewer를 지정한다. 기존 `Production`/`Preview`와 별도 환경이다.
2. 각 환경에 아래 값과 비밀값을 등록한다. 토큰은 사용자가 GitHub 설정 화면에서 직접 입력하고 채팅·명령 인수·문서에 붙여 넣지 않는다. 환경 변수 우선, 공통 IDs를 repository variables에 등록하는 것도 가능하다.
3. Vercel 프로젝트의 Root Directory가 FE 저장소 루트이고 Node.js 22 및 Vite 설정이 맞는지 확인한다. 필요한 앱 환경 변수는 Vercel의 Preview/Production 대상에 각각 설정한다. `VITE_*`는 클라이언트 번들에 포함되므로 비밀값을 넣지 않는다.
4. 루트 vercel.json의 `git.deploymentEnabled=false`를 유지한다. 머지 시 기존 Git 연동이 자동 배포하지 않도록 차단한 설정이며, Actions 배포와 중복되지 않게 한다.
5. 테스트 보류를 해제한 뒤 워크플로가 main에 반영되었는지 확인하고 opt-in 값을 `true`로 바꾼다. main 수동 Preview를 실행해 환경 다운로드·빌드·SPA 경로 새로고침을 확인한다. 이후 main push 품질 검사 성공과 Production 환경 승인을 통해 자동 배포를 검증한다. opt-in 변경 자체는 배포를 실행하지 않는다.

| 종류 | 이름 | 값/설명 |
|---|---|---|
| Repository variable | `VERCEL_ACTIONS_ENABLED` | 준비 중 `false`, 활성화 시 `true` |
| Environment/repository variable | `VERCEL_ORG_ID` | `team_er4AXNezYY2C1ysS4HHRmeZQ` |
| Environment/repository variable | `VERCEL_PROJECT_ID` | `prj_nRNXuR2Wnj36vjHcTHvQign3eWgC` |
| Environment secret | `VERCEL_TOKEN` | 해당 팀·프로젝트 배포 권한을 가진 토큰 |

IDs는 로컬 프로젝트 연결 정보에서 확인한 대상이다. 연결 도구의 프로젝트 조회가 403으로 제한되어 서버 측 프로젝트 설정과 권한은 활성화 전에 소유자가 다시 확인해야 한다. 토큰은 pull/deploy 단계의 환경 변수로만 전달하며 build/install에는 전달하지 않는다. 다만 pull로 저장한 앱 환경 파일은 빌드에 사용되므로 신뢰할 수 있는 main 코드만 실행해야 한다.

## 빌드와 설정

Node.js 22, pnpm 10.29.1, Vercel CLI 66.6.0을 사용한다. Actions는 공식 저장소의 commit SHA로 고정한다. pnpm 버전은 `package.json`과 일치시킨다. CLI 설치 후 `vercel pull` → `vercel build` → `vercel deploy --prebuilt` 순서로 실행한다. Production은 pull의 environment와 build/deploy의 `--prod`를 함께 적용한다. Vercel build가 `pnpm install --frozen-lockfile`과 `pnpm build`를 수행한다.

모든 Vercel 명령은 `--local-config=config/vercel.ci.json`으로 CI 전용 설정을 명시한다. 이 파일은 Vite, `dist`, frozen lockfile 설치, React Router의 `/index.html` fallback을 정의한다. 루트 `vercel.json`은 기존 동일 설정을 유지하고 Git 자동 배포 차단 항목을 추가해 추적한다. 앱 빌드 설정을 변경할 때 두 파일의 공통 항목도 함께 리뷰한다.

품질 검사의 artifact는 다운로드하지 않고 같은 커밋을 대상 환경에서 새로 빌드한다. 따라서 Production 앱 환경으로 만들어진 최종 산출물 자체의 브라우저 검증을 의미하지 않는다. `.vercel`의 환경 파일·빌드 결과는 업로드하지 않고 종료 시 제거한다. 성공한 배포의 URL·대상·커밋은 Actions summary에 남는다. summary URL 검증이 실패해도 배포 명령이 이미 성공했을 수 있으므로 재실행 전에 Vercel 배포 상태를 확인한다.

## Vercel Git 자동 배포 전환

PR #7 머지와 실제 배포 보류를 함께 지키기 위해 루트 `vercel.json`에 `git.deploymentEnabled=false`를 추가했다. Git 연결 자체는 유지하지만 이 설정이 포함된 커밋의 자동 Git 배포는 차단한다. CI 전용 파일에만 이 값을 넣는 것으로는 Git 연동을 막을 수 없다. 이전 브랜치처럼 이 설정이 없는 커밋에는 차단이 적용되지 않을 수 있으므로, 보류 기간에는 해당 브랜치를 push하지 않는다.

Actions는 `VERCEL_ACTIONS_ENABLED=false`를 유지한다. 다시 Git 자동 배포로 전환하는 것은 별도 작업이며 이 차단 설정을 임의로 제거하지 않는다. Git 자동 배포 차단은 이미 서비스 중인 배포를 내리거나 도메인을 삭제하지 않는다.

## 토큰 직접 발급·등록

1. [Vercel Tokens](https://vercel.com/account/settings/tokens)에서 Create Token을 선택한다. 이름은 예를 들어 `teamground-github-actions`로 지정한다.
2. Scope는 `teamground-fe` 프로젝트가 속한 팀(`hoseoks-projects-76438827`, team ID `team_er4AXNezYY2C1ysS4HHRmeZQ`)을 선택하고 만료 기간을 정한다. 프로젝트 제한 기능을 사용할 수 있다면 해당 프로젝트만 선택한다.
3. 생성된 값을 [GitHub Environments](https://github.com/HoseokWon99/teamground-fe/settings/environments)의 `vercel-preview`와 `vercel-production` 각각에 등록한다. 각 환경의 Environment secrets → Add environment secret에서 Name은 정확히 `VERCEL_TOKEN`, Secret은 발급값이다. 같은 토큰을 두 환경에 등록할 수 있다.
4. 토큰은 GitHub 설정에 직접 입력하고 채팅·문서·저장소·VITE 환경 변수에 넣지 않는다. org/project ID는 이미 repository variables에 등록돼 있다.
5. 지금은 토큰 등록까지만 한다. `VERCEL_ACTIONS_ENABLED=false`를 유지하고 Run workflow를 누르지 않는다. 토큰 등록 자체는 테스트나 배포를 시작하지 않는다.

토큰은 사용자가 직접 발급·등록하며 에이전트는 토큰 생성 API 호출이나 값 조회를 하지 않았다. [Vercel 인증 안내](https://vercel.com/docs/rest-api#authentication)

## 실행 보류와 후속 검증

현재 앱 테스트, typecheck, build, 브라우저 검사, 백엔드 HTTP 요청, Vercel CLI 설치·실행, workflow dispatch 및 실배포는 수행하지 않았다. 이후 Preview 배포에서 CLI 인증, frozen install, 환경값 적용, SPA 직접 경로 접근, 정적 자산을 확인하고 Production에서는 품질 성공 gate·환경 승인·실제 연결 도메인을 확인해야 한다. 현재 앱은 mock/localStorage 프로토타입이며 이 배포 설정이 실제 백엔드 연동을 추가하지 않는다.

## 공식 참고

- [Vercel CLI 전역 옵션: local config 및 환경 변수 인증](https://vercel.com/docs/cli/global-options)
- [Vercel build](https://vercel.com/docs/cli/build)
- [Vercel deploy와 prebuilt](https://vercel.com/docs/cli/deploy)
- [Vercel 프로젝트 Git 설정](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled)
- [GitHub workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
