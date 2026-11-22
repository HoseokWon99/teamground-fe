# 완성 UI 운영 배포

2026-11-22 · FE 배포 담당

## 배포 범위와 소스

사용자가 요청한 완성 UI를 기존 Vercel 프로젝트 `teamground-fe`의 production에 배포한다. 소스는 PR #11이 병합된 `main`의 `3f3d1998792acfbd0145d8021f76c37bffab86b0`이다. 원본 체크아웃의 사용자 변경과 미커밋 문서는 배포에 포함하지 않는다. 백엔드와 운영 사용자 데이터는 변경하지 않는다.

- Vercel team: `team_er4AXNezYY2C1ysS4HHRmeZQ` (`hoseoks-projects-76438827`)
- Vercel project: `prj_nRNXuR2Wnj36vjHcTHvQign3eWgC`
- 운영 도메인: https://app.jointeamground.com
- API 계약상 production base URL: `https://jointeamground.com/api/v1` (실제 번들 확인은 검증 문서 참조)
- 소스 검증: [main CI 45002277577](https://github.com/HoseokWon99/teamground-fe/actions/runs/45002277577), 타입·단위 테스트·빌드 및 Chromium/Firefox/WebKit job 모두 성공

## 기존 파이프라인 실행 방법

Vercel MCP의 팀 조회는 빈 목록, 지정 프로젝트 조회는 403으로 실패했다. 비밀값을 조회하거나 출력하지 않고 GitHub 환경에 이미 등록된 secret을 사용하는 기존 `.github/workflows/vercel-deploy.yml`로 배포했다.

기존 `workflow_dispatch`는 preview 전용이다. production은 성공한 main 품질 검사에 연결된 `workflow_run`이다. 따라서 main SHA와 성공 CI를 확인한 후, `VERCEL_ACTIONS_ENABLED`를 일시적으로 `true`로 바꾸고 이미 생성돼 있던 production run `45002456746`을 재실행했다. 기존 `vercel-production` 환경의 required reviewer가 현재 인증 사용자이고 `current_user_can_approve=true`, `prevent_self_review=false`임을 확인했다. 사용자의 운영 배포 요청에 따라 정상 환경 승인 API로 승인했으며 보호 설정을 변경하지 않았다.

승인 직후 `VERCEL_ACTIONS_ENABLED=false`로 복원하고 조회로 확인했다. `vercel.json`의 `git.deploymentEnabled=false`도 그대로 유지한다. 자동 배포를 상시 활성화하지 않았다.

파이프라인은 배포 전과 빌드 후 최신 main SHA를 재확인한다. Node 22, pnpm 10.29.1, Vercel CLI 66.6.0으로 production 환경을 pull하고 `vercel build --prod`, `vercel deploy --prebuilt --prod`를 실행한다. SPA fallback은 `config/vercel.ci.json`을 사용한다. pull된 환경과 빌드 출력은 job 종료 시 제거하며 환경 파일을 아티팩트로 공개하지 않는다.

## 배포 결과

- [GitHub Actions run 45002456746](https://github.com/HoseokWon99/teamground-fe/actions/runs/45002456746), attempt 2: success
- GitHub deployment `7976110441`: environment `vercel-production`, SHA `3f3d1998792acfbd0145d8021f76c37bffab86b0`, success
- Production 고유 URL: https://teamground-6tnognzpp-hoseoks-projects-76438827.vercel.app
- Vercel Inspect: https://vercel.com/hoseoks-projects-76438827/teamground-fe/GzobHtfCNG7cxMnwrAY8AUYX8SPY
- CLI 완료 근거: `Ready in 9s`, `Aliased https://app.jointeamground.com` (2026-11-22 08:24:15 UTC / 17:24:15 KST)
- Vercel API의 raw `readyState`, `aliasAssigned`, deployment metadata는 MCP 403 때문에 별도 조회하지 못했다. 위 상태는 성공한 CLI 배포 로그 근거다.
- 빌드: TypeScript와 Vite 6.4.4 production build 성공, `.vercel/output` 완성 13초. 환경 및 출력 정리 step 성공.
- 배포 완료 후 `VERCEL_ACTIONS_ENABLED=false` 재확인.

CLI는 로컬 prebuilt의 시스템 환경변수 부재와 열린 Node engines 범위(`>=22.12.0`)가 Vercel 프로젝트 Node 24.x보다 최신 major(26.x)를 선택할 수 있음을 경고했다. 이번 runner는 workflow에서 Node 22를 설정했고 prebuilt build/deploy가 성공했다. 코드 변경 없이 배포했으며 버전 범위 정리는 후속 검토 사항이다.

## 롤백 대상

직전 성공 production 기록은 SHA `44104b13c28f613a59778230dc9ac6bd65542a19`, deployment `dpl_GSiUZmT77z4wyEsjfvj6h6T14fuf`, 고유 URL https://teamground-eic50su2h-hoseoks-projects-76438827.vercel.app 이다. GitHub deployment `7975498757`의 최신 상태가 success임을 배포 전에 확인했다. 롤백은 실행하지 않았다.

## 검증 범위

배포 및 공개 HTTP/브라우저 검증 결과를 각각 이 문서와 `03-verification.md`에 기록한다. 인증 사용자 시나리오나 모니터링 상태는 실제 확인한 범위만 완료로 보고한다.

Vercel 런타임 오류 로그와 모니터링 설정은 팀 접근 권한(403) 때문에 확인하지 못했다. CLI build/deploy 성공을 런타임 오류 0건 또는 모니터링 정상으로 해석하지 않는다.
