# 단계 2 · 영상 폼 입력 보호

작성: FE 구현 에이전트 · 2026-11-22 · 기준: `221732d`

## 변경과 결정

- `src/features/videos/pages.tsx`: 영상 추가/수정의 `VideoFormModal`이 폼과 모달을 함께 소유한다. 취소·Escape·X·overlay는 동일한 `requestClose`로 처리한다.
- RHF `isDirty`가 false이면 즉시 닫고, true이면 기존 한국어 폐기 확인을 제공한다. 취소하면 입력과 오류를 유지한다. 입력을 원래 값으로 되돌리면 clean으로 처리한다.
- 제출 이벤트에서 ref를 즉시 잠가 비동기 검증 전 같은 tick의 재제출·닫기를 막는다. `finally`에서 검증 실패까지 포함해 해제한다. 화면 입력·데모 선택·취소·제출은 `isSubmitting`으로 잠근다.
- 저장 실패는 모달 안에서 오류를 표시하고 입력을 보존한다. 성공만 확인 없이 닫는다. 열린 동안만 폼을 마운트하여 재열기 시 최신 초기값을 사용한다.
- 공통 Modal, 라우터, mock 서비스, 백엔드 계약과 배포 설정은 수정하지 않았다. 기존 mock → Zustand → localStorage 흐름을 유지한다.
- `vercel:react-best-practices` 적용: 단일 폼 상태를 직접 읽고 상태 복제용 effect를 추가하지 않았으며 ref는 이벤트 경쟁 방지에만 사용한다. 기존 Radix 모달의 제목·초점 복원을 재사용한다. 기존 스타일에는 닫힘 애니메이션이 없다.
- `video-modal-regression.js`: 실제 Chromium UI와 기존 mock을 대상으로 반복 가능한 브라우저 검증. 새 패키지나 앱 테스트 전용 분기를 추가하지 않는다.

## 완료 조건별 검증

| 조건 | 실제 결과 |
|---|---|
| 추가/수정 × 취소/Escape/X/overlay clean 닫기 | 확인 0회, 닫힘, 열기 버튼으로 초점 복원 통과 |
| 같은 8경로 dirty 폐기 취소/동의 | 확인 취소 시 입력 유지, 동의 시 닫힘·초점 복원 통과 |
| 수정 후 초기값으로 되돌림 | 추가/수정 네 경로 모두 확인 없이 닫힘 통과 |
| 잘못된 제출 | 첫 오류 제목 필드 초점 및 잠금 해제 통과 |
| 제출 중 이탈·입력·재제출 | 제목/URL/데모/취소/제출 disabled, Escape/X/overlay 무시, 동일 tick requestSubmit 2회에도 mock 호출 1회 통과 |
| 저장 실패 | 입력·오류 유지, 잠금 해제, 폐기 확인 취소 시 오류도 보존 통과 |
| 재시도 성공 | 데이터 1건 표시, 확인 없이 닫힘, 열기 버튼 초점 복원 통과 |
| 실제 백엔드 금지 | 앱 변경은 영상 화면 1파일, 기존 mock 호출만 유지 |

## 실제 실행 명령과 결과

FE 저장소에서 실행:

- `pnpm typecheck`: 성공.
- `pnpm test`: 2개 파일, 18개 테스트 성공. 기존 추천·서비스·로그인 회귀 검사이며 UI 매트릭스는 별도 브라우저 검사다.
- `pnpm build`: 성공. 기존 Zod PURE 주석 2건과 500kB 청크 경고가 남아 있다.
- `git diff --check`: 성공.
- Playwright CLI `video-forms` 세션에서 아래 회귀 스크립트 실행 성공. Chromium/Vite `http://127.0.0.1:5173` 사용.

### 브라우저 회귀 재실행

필요 도구: Node 22+, pnpm 10, Python 3, Codex Playwright skill의 CLI wrapper 및 Chromium. Vite **개발 서버**가 필요하다(기존 mock 모듈을 브라우저 안에서 계측하므로 preview 빌드 대상이 아니다).

1. FE 저장소에서 `pnpm dev -- --host 127.0.0.1 --port 5173` 실행한다.
2. 별도 테스트 브라우저 세션에서 앱을 열고 지우로 로그인한다. 기본 seed의 `rehearsal-1` 및 `video-1`이 필요하다. 해당 데이터가 없으면 테스트 브라우저의 데모 도구에서 초기화 후 로그인한다. 초기화는 **해당 브라우저 저장 데이터를 삭제**하므로 실제 사용 브라우저에서 실행하지 않는다.
3. 아래 명령을 실행한다. CLI 산출물은 `/tmp/.playwright-cli`에 생성된다.

```sh
cd /tmp
/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh -s=video-forms open http://127.0.0.1:5173
# 위 창에서 지우로 로그인한 뒤 실행
python3 - <<'PY'
from pathlib import Path
import subprocess
script = Path('/Users/hoseok/services/teamground/teamground-fe/docs/reports/frontend-2026-11-22/video-modal-regression.js')
subprocess.run([
    '/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh',
    '-s=video-forms', 'run-code', script.read_text(),
], check=True)
PY
/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh -s=video-forms eval 'window.__videoRegressionResults'
```

마지막 출력은 12개 PASS 결과여야 한다. 실행마다 영상 1건을 추가하고 seed 영상 `video-1` 제목을 변경하며 해당 테스트 브라우저에 저장한다. 고유 실행 시각을 제목에 포함하므로 재실행할 수 있다.

스크립트는 확인창의 반환값과 호출 수를 `window.confirm` 계측으로 제어한다. 저장 중 상태는 기존 mock 함수를 브라우저 메모리에서 잠시 보류해 검사하고 `finally`에서 복원한다. 서버나 앱 코드는 변경하지 않는다. 네이티브 확인창 자체와 390px 검증은 독립 검증 결과를 `03-review.md`에서 확인한다.

초기 실행에서는 CLI의 네이티브 dialog 처리와 테스트 listener가 충돌하여 시퀀스가 중단됐다. 세션을 새로 열고 반환값 계측으로 수정한 후 재실행했다. overlay 클릭도 좌표 즉시 클릭 대신 실제 overlay locator의 안정화 대기 후 클릭으로 바꿨다. 이는 검증 도구 수정이며 앱 코드 변경 원인이 아니다.

## 미검증 및 후속

- 전역 라우트 이동·브라우저 뒤로가기·새로고침의 미저장 보호는 이번 범위가 아니다.
- 전체 화면 접근성, 모든 브라우저 조합, 실제 API 연동은 검증하지 않았다.
- 네이티브 확인 및 좁은 화면의 독립 재검증, PR HEAD·CI·Ready 전환은 단계 3에서 기록한다.
- 사용자 기존 dirty `.gitignore`, `AGENTS.md`, 루트 `README.md`, `docs/prototype-plan.md`, `vercel.json`은 변경·스테이징하지 않는다.
