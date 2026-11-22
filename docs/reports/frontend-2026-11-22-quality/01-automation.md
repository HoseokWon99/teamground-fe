# 01 · CI 및 영구 브라우저 회귀

담당: FE 자동화 서브에이전트 `fe_quality_ci` · 2026-11-22.

## 구현

- `.github/workflows/quality.yml`: main 대상 PR과 main push에서 Node 22, pnpm 10.29.1, frozen lockfile 설치 → 앱/E2E 타입 검사 → Vitest → production build. 같은 빌드 artifact를 Chromium/Firefox/WebKit matrix가 받아 preview로 검증한다.
- workflow 권한은 `contents: read`, checkout credential 미보존, secret·백엔드·배포 의존 없음. fork PR에서도 동일한 로컬 mock 검증만 실행한다. 동일 ref의 이전 실행은 취소하고 브라우저 한 종류 실패가 다른 종류를 취소하지 않는다.
- `playwright.config.ts`, `tests/e2e/`: 브라우저별 격리 context와 UI 로그인으로 시작한다. 개발 모듈 import, store 강제 주입, HMR, 임의 sleep 없이 사용자 동작 및 Playwright 대기 assertion을 사용한다.
- 총 16개 실행: 사용자 흐름 5개 × 브라우저 3종 + Chromium axe 검사 1개(5개 화면 상태). 일반 멤버 권한은 시뮬레이션 검증이며 서버 보안 검증이 아니다.
- `package.json`, `pnpm-lock.yaml`: 최소 dev 의존성 `@playwright/test`, `@axe-core/playwright`, `packageManager` 고정. axe 의존성의 최소 버전에 맞춰 Node 엔진을 22.12.0 이상으로 명시한다. Vitest 수집을 `src`로 한정해 E2E와 분리한다. 별도 `tests/e2e/tsconfig.json`으로 테스트와 Playwright 설정도 타입 검사한다. 기존 Vite 설정은 변경하지 않는다.

## 재현 명령

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm exec playwright install chromium firefox webkit
pnpm test:e2e
# axe만 재실행 (production build 포함)
pnpm test:a11y
```

Linux CI는 `playwright install --with-deps <browser>`로 OS 의존성까지 설치한다. `test:e2e`와 `test:a11y`는 먼저 빌드한다. 이미 동일 소스로 빌드된 artifact를 검사하는 CI에서는 `pnpm exec playwright test --project=<browser>`를 사용한다. 자동 preview는 고정 `127.0.0.1:4173`을 사용하며 기존 서버를 재사용하지 않아 오래된 빌드/개발 서버 혼입을 막는다. 포트가 사용 중이면 명시적으로 실패한다.

보고서·실패 screenshot·trace·axe JSON은 ignored `dist/qa-artifacts/`에 남긴다. `pnpm exec playwright show-report dist/qa-artifacts/report`로 결과를 연다. 이후 빌드가 dist를 비우므로 보관할 결과는 빌드 전에 복사한다. CI는 브라우저별 artifact를 7일 보관한다. 사용자 수정 중인 `.gitignore`는 건드리지 않았다.

## 완료 조건별 검증

| 항목 | 관측 |
|---|---|
| 관리자 핵심 흐름 | 로그인 → 4개 수요일 추천, 금요일 제외 → 전체 날짜 확인 및 확정 → 로컬 영상 추가·실제 재생 currentTime 증가 → 피드백 저장 → reload 후 제목·댓글 단일 복원 → 영상 수정 모달 click/Escape 및 opener 초점 복원 |
| 이탈 보호 | 팀 만들기 입력 → browser back 취소 후 URL/값 유지 → 다시 back 폐기 후 목록 이동, 팀 미생성 |
| 일반 멤버 | 하린 로그인·멤버 화면 초대 없음 → 추천 조회 가능, 확정 없음 → 다른 팀 회차 ID를 파동 경로에 넣으면 찾을 수 없음 |
| 모바일 | 390px 메뉴 expanded, Tab 반복으로 모달 내부 초점 유지, Escape 후 opener 복원, 내 일정 이동·닫힘·가로 overflow 없음 |
| 접근성 | 로그인, 팀 목록, 추천, 영상 피드백, 모바일 메뉴에서 WCAG2 A/AA 및 WCAG2.1 A/AA axe 전체 페이지 검사. 규칙 제외·위반 suppression 없음 |

## 초기 실행 및 수정 발견

- Node v22.13.0 / pnpm 10.29.1에서 frozen install, 앱+E2E typecheck, Vitest 61개 통과. production build 성공.
- Chromium/Firefox/WebKit 다운로드 완료. 12개 기능 검증 중 11개 통과. WebKit에서 클릭으로 연 모바일 메뉴의 Escape 후 opener 초점 복원이 실패하여 UI 담당자에게 전달했다. Chromium/Firefox는 같은 검사를 통과했다.
- 최초 Chromium axe는 기존 muted/eyebrow/avatar/sidebar 등의 색상 대비 위반을 발견했다. 접근성 수정 담당자에게 전달했으며 테스트를 약화하지 않았다.
- 최초 모바일 테스트 locator는 모달이 배경을 aria-hidden으로 만든 동안 opener를 찾지 못해 실패했다. `includeHidden`으로 DOM 속성을 읽도록 locator만 수정했다. WebKit 초점 실패는 이 수정 후 별도로 재현된 앱 동작이다.

## 최종 결과

UI 담당자의 소스 동결 후 다음 명령을 순서대로 다시 실행했다.

| 명령 | 결과 |
|---|---|
| `pnpm typecheck` | 앱 및 E2E/설정 타입 검사 통과 |
| `pnpm test` | 5개 파일, 74개 테스트 통과 (Avatar 대비 13개 포함) |
| `pnpm test:e2e --workers=3` | production build 성공, 16/16 통과, 브라우저 실행 21.8초 |

WebKit의 모바일 메뉴, 영상 추가 저장 후, 영상 수정 Escape 후 opener 초점 복원을 모두 통과했다. Chromium axe 5개 상태의 위반은 0개였다. 자동 보고서는 `dist/qa-artifacts/report/`, 실행 로그는 `/tmp/teamground-quality-final-tests-16.log`이며 임시 산출물은 영구 보존하지 않는다.

추가 독립 QA의 WebKit 초대 모달 Tab 탈출은 영구 suite를 기존 production 빌드에 실행하여 실패를 재현했다(`pnpm exec playwright test tests/e2e/journeys.spec.ts --project=webkit --grep '초대 모달'`, `/tmp/teamground-invite-before.log`). 이메일 초기 초점은 통과했으나 Tab 이후 모달 내부 assertion이 false였다. UI 담당자가 React autoFocus를 Radix onOpenAutoFocus로 옮긴 뒤 16개 전체 실행을 통과했다. 초대 검사는 이메일 초기 초점, Tab/Shift+Tab 각각 12회 내부 유지, Escape 후 opener 복원을 3개 브라우저에서 확인한다.

Draft [PR #4](https://github.com/HoseokWon99/teamground-fe/pull/4)의 최초 HEAD `d0bc641`은 [Actions run 44986713020](https://github.com/HoseokWon99/teamground-fe/actions/runs/44986713020)에서 타입·단위·빌드 및 3개 브라우저 job을 모두 통과했다. 이는 초대 회귀 추가 전 13개 suite 결과이며 최종 16개 suite의 원격 결과와 구분한다.

## 범위와 제한

Playwright WebKit은 실제 Safari 앱이나 iOS 기기 검증과 같지 않다. Chromium axe 5개 대표 상태의 통과도 전체 접근성 준수를 보증하지 않으며 키보드·화면별 독립 검증은 QA 보고서를 함께 본다. 앱은 백엔드 없는 로컬 mock이다. 네이티브 새로고침/탭 종료 확인창, 전체 저장 중 경합, 실제 외부 영상/인증/메일은 이번 영구 suite에 포함하지 않는다. 기존 수동 회귀 보고서는 별도 근거로 유지한다.

빌드에는 기존 Zod PURE 주석 및 큰 초기 chunk 경고가 남아 있다. pnpm은 기존 esbuild lifecycle script 차단 안내를 출력했으나 설치 및 실제 빌드는 성공했다.

참고: [Playwright CI](https://playwright.dev/docs/ci-intro), [Playwright 접근성 검사](https://playwright.dev/docs/accessibility-testing).
