# 단계 2 · 미저장 화면 이탈 보호

작성: FE 구현 에이전트 · 2026-11-22 · 선행 HEAD `1847f85b7f848b7b3228d56fd2255c582c8e8622`

## 구현과 정책

- `src/app/App.tsx`: 기존 경로·AuthGuard·TeamGuard·lazy/Suspense를 유지하고 `createBrowserRouter`/`RouterProvider`로 전환했다. history monkey patch는 사용하지 않는다.
- `src/app/unsaved-changes.tsx`: 최상위 provider 한 곳에서 `useBlocker`를 사용한다. 팀 생성·조율·피드백 신규·피드백 수정·영상 모달이 각각 dirty/saving source를 등록하며, 다른 source의 입력은 한 폼 저장으로 해제되지 않는다. 기본값으로 되돌리면 clean이다.
- SPA 링크, `navigate`, 브라우저 뒤로/앞으로에서 공통 확인 모달을 제공한다. 취소는 현재 URL·입력·세션을 유지하고 폐기는 원래 목적지로 진행한다. 동일 pathname/search/hash 이동은 확인하지 않는다. 새 탭 원본 열기는 차단하지 않는다.
- `beforeunload`는 dirty/saving source가 있을 때만 등록한다. hard reload·탭 닫기의 문구와 실제 표시 여부는 브라우저 정책을 따른다.
- 로그아웃·데모 초기화·영상 삭제는 변경 service 호출 **전에** 미저장 확인한다. 허용 후 service가 실행되는 동안 전이 잠금과 처리 중 모달을 유지하며 성공한 서비스의 명시적인 목적지 이동만 우회한다. 실패 시 기존 source와 보호를 유지한다.
- 팀 생성과 조율 저장 성공은 해당 source를 동기 해제하여 RHF reset 렌더 이전 false prompt를 방지한다. 피드백 저장은 입력을 reset하며 수정 성공은 수정 상태를 닫는다. 입력 중 필드는 제출 중 잠근다.
- 조율 예시 채우기는 `keepDefaultValues`를 사용하여 저장된 조건과의 차이를 유지한다. `saveDraft` 성공 직후 baseline을 갱신한다. 이후 추천 조회 실패는 **초안 저장 성공/조회 실패**이므로 저장된 조건의 이탈 확인은 하지 않는다. saveDraft 자체 실패는 보호한다.
- 피드백 수정 취소·다른 댓글 수정·수정 중인 댓글 삭제에도 같은 확인을 적용한다. 기존 영상 모달의 닫기 확인/저장잠금은 유지하면서 화면 이탈 source만 추가했다.
- 백엔드·실제 OAuth·API 연동, 패키지 의존성 변경, 배포·머지는 수행하지 않았다.

## 설계 근거와 리뷰

[React Router 공식 useBlocker 문서](https://reactrouter.com/api/hooks/useBlocker)를 확인하고 SPA blocker와 beforeunload를 분리했다. `vercel:react-best-practices`의 이벤트 중복 방지·훅 의존성·기존 lazy boundary·Radix 접근성 재사용 기준으로 점검했다. 별도 상태 라이브러리는 추가하지 않았다.

초기 검증과 수정 시작 공지가 겹쳐 baseline 마지막 피드백 재현은 원본 피드백 + 새 App 혼합 상태였다. 시점과 제한은 [01-baseline.md](01-baseline.md)에 명시한다. 수정 후 검증은 fresh load를 기준으로 수행했다.

## 실제 검증

- `pnpm typecheck`: 성공.
- `pnpm test`: 기존 2파일, 18개 성공.
- `pnpm build`: 성공. 기존 Zod 주석 2건 및 500kB 청크 경고가 남아 있다.
- `git diff --check`: 성공.
- `navigation-pending-regression.js`: 저장 보류 중 back 차단·성공 목적지 및 모달 해제, saveDraft 성공/recommend 실패 baseline, reset 허용 후 로그인 이동 통과.
- fresh load에서 복수 blocker 경고·앱 런타임 예외 없음. 기존 favicon 404만 관측.
- Chromium + Vite `http://127.0.0.1:5173`, 별도 `navigation-impl` 세션: `navigation-regression.js` 실행 성공.

| 검증 묶음 | 결과 |
|---|---|
| 팀 생성 back 취소/허용, forward, 팀 전환 navigate 취소 | URL·입력 보존 및 허용 목적지 이동 통과 |
| 계정전환·logout·reset 취소 | 미저장 입력·세션·팀 데이터 유지 통과 |
| 팀 저장 실패/재시도 성공 | 오류와 입력 유지, 성공 후 false prompt 없음 |
| 조율 예시 dirty, 저장 실패/재시도 | 링크 이탈 확인 유지, 성공 결과 화면 정상 이동 |
| 피드백 신규/수정 실패·재시도, local 수정 취소 | 입력 보존·성공 clean 통과 |
| 영상 모달과 신규 피드백 동시 dirty | 모달 저장 후 피드백 이탈 보호 유지 |
| 390px | 확인 취소/폐기, 입력 보존, 가로 overflow 없음 |
| logout 허용 | session null, 명시적 `/login`, false prompt 없음 |
| beforeunload | dirty cancelable 이벤트 방지, 저장 후 방지 없음 확인 |

첫 스크립트는 편집 시작 후 기존 댓글본문이 사라져 locator가 timeout났다. 마지막 댓글 기준 locator로 수정하고 전체 재실행하여 통과했다. 추가 pending 검증의 즉시 `isVisible` 검사는 URL commit과 모달 렌더 사이를 읽었으므로 `waitFor(hidden)`으로 바꾸었다. 이는 UI 정착 대기 보완이다.

## 마무리 검증 · 2026-11-22 12:46 KST

- 새 provider와 변경 JSX를 주변 코드 스타일로 정리했다. 기능 변경은 없으며 저장소 의존성·설정은 변경하지 않았다.
- 최종 소스에서 `pnpm typecheck && pnpm test && pnpm build && git diff --check`를 다시 실행하여 모두 성공했다. Vitest는 2파일 18개 통과, 빌드의 기존 Zod 주석 2건·500kB 청크 경고는 유지된다.
- 회귀 스크립트 두 개에 `try/finally`를 추가했다. 현재 문서의 `window.confirm`, 추천 서비스 및 보류 서비스 원본을 복원하고 보류 promise도 해제한다. `page.goto`로 폐기된 이전 문서의 원본은 현재 문서에 적용하지 않는다.
- 별도 Chromium `navigation-finish` 세션에서 두 스크립트를 다시 실행하여 모두 성공했다. 실행 로그는 `/tmp/teamground-navigation-finish/`에 보관했다. 앱 예외·중복 blocker 경고 없이 기존 favicon 404만 관찰했다.
- 최종 소스 diff는 커밋 전 루트 리뷰를 통과했다. 독립 검증 결과는 04 보고서에서 별도로 관리한다.

## 재현

독립 **테스트 브라우저**에서만 실행한다. 기본 스크립트가 기존 mock `reset`을 호출하여 해당 브라우저 저장 데이터를 seed로 되돌린다. 테스트 전용 앱 코드·의존성은 추가하지 않는다. Vite 개발 모듈을 import하여 실패/지연을 계측하므로 production preview용 검사가 아니다.

```sh
pnpm dev -- --host 127.0.0.1 --port 5173
# CLI 산출물을 저장소 밖에 둡니다.
cd /tmp
/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh -s=navigation-impl open http://127.0.0.1:5173
# 앱에서 지우로 로그인한 뒤, 별도 터미널에서
python3 - <<'PY'
from pathlib import Path
import subprocess
for name in ['navigation-regression.js', 'navigation-pending-regression.js']:
    script = Path('/Users/hoseok/services/teamground/teamground-fe/docs/reports/frontend-2026-11-22-navigation') / name
    subprocess.run([
        '/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh',
        '-s=navigation-impl', 'run-code', script.read_text(),
    ], check=True)
PY
```

이번 실행의 CLI 로그는 `/tmp/teamground-navigation-impl-playwright-20261122/`로 옮겼다.

결과는 `window.__navigationResults`, `window.__navigationPendingResults`에서도 확인할 수 있다. 첫 스크립트 종료는 로그아웃 상태다. 추가 스크립트는 로그인 후 지연 저장/추천 실패/초기화를 검증한다.

## 미검증 범위

실제 Safari/Firefox, 전체 화면 접근성, 초대·개인일정 폼의 전역 이탈 보호는 이번 범위 밖이다. synthetic beforeunload는 이벤트 등록 여부 검사이며 실제 브라우저 네이티브 확인창 검증과 구분한다. 독립 검증과 추가 회귀 결과는 `04-independent-verification.md`에 기록한다. 기존 사용자 dirty `.gitignore`, `AGENTS.md`, 루트 `README.md`, `docs/prototype-plan.md`, `vercel.json`은 커밋에서 제외한다.
