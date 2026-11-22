# 개인 일정·초대 보호와 모바일 메뉴

작성: FE UI 담당 · 2026-11-22. 시작 HEAD `d5f706b`, 최종 검증 시 저장소 담당 HEAD `d1766e2` + 아래 UI diff. 책임자 구조·범위 리뷰 후 확정했다.

## 변경과 결정

- `src/features/calendar/pages.tsx`: 개인 일정 모달과 확인 기간을 각각 기존 `useUnsavedChanges`에 등록했다. 브라우저 back·SPA 이동·beforeunload에서 보호하며 일정 저장이 다른 source인 확인 기간의 미저장을 해제하지 않는다. 확인 기간은 성공 시에만 baseline을 갱신하고 실패 시 입력/기준을 유지한다. 변경한 기간에는 입력 완료 배지를 표시하지 않는다.
- 개인 일정 저장/삭제 및 Google 동기화 중에는 입력·닫기·Escape를 잠근다. 공통 비동기 실행에 ref 잠금을 두어 중복 실행을 막는다. 성공 시 RHF reset과 해당 source 해제, 실패 시 입력 보존, 취소 허용 시 초안 폐기를 적용했다. Google 읽기 전용 일정은 dirty source로 등록하지 않는다.
- `src/features/teams/pages.tsx`: 초대 모달도 dirty/saving source를 등록하고 저장 중 이메일과 X를 잠근다. 저장 실패 시 이메일·보호 유지, 성공 시 reset/해제, 폐기 허용 시 reset한다. 만료 초대의 이메일 미리 채우기도 dirty로 처리한다.
- `src/components/ui/modal.tsx`: 선택적인 `id`, `closeDisabled`만 추가했다. 기존 Radix 초점 유지·Escape·종료 후 초점 복원은 유지한다. 개인 일정·초대 오류는 `aria-invalid`와 설명 ID로 입력에 연결했다.
- `src/app/App.tsx`, `src/styles.css`: 모바일의 CSS offcanvas를 공통 Modal 메뉴로 바꿨다. 닫기 버튼, Tab 초점 유지, Escape, opener 복원, `aria-expanded`/`aria-controls`를 제공한다. 데스크톱 nav landmark, header/main, 본문 건너뛰기도 추가했다. 데스크톱 전환 시 모바일 메뉴를 닫는다.
- 반응형 `StorageNotice`를 인증된 Layout의 main과 로그인·초대 PublicLayout에 배치했다. 동시에 하나만 mount하며 데스크톱 고정 sidebar에 가리지 않는다. 실제 저장·복구 구현은 [01-persistence.md](01-persistence.md) 담당이다.

전역 provider, API 계약, 백엔드, 외부 서비스, 의존성은 변경하지 않았다. `vercel:react-best-practices`의 훅 순서·이벤트 리스너 cleanup·기존 lazy 경계·접근성 컴포넌트 재사용 기준으로 검토했다. React Hook Form/Zod/Radix 패턴을 유지했다.

## 실제 검증

- `pnpm typecheck && pnpm test && pnpm build && git diff --check`: 모두 성공. Vitest 4파일 **61개** 통과. 기존 Zod 주석 2건과 500kB 청크 경고는 유지된다. 실행 시간 13:04 KST 이후 앱 코드는 변경하지 않았다.
- Chromium + 새 Vite `http://127.0.0.1:5174`, `interface-frozen` 세션: [interface-regression.js](interface-regression.js) 최종 전체 실행 후 `window.__interfaceResults` 5그룹 PASS를 직접 확인했다.

| 검증 | 결과 |
|---|---|
| 개인 일정 | back 취소·원래 모달 초점·입력 유지, 실패 후 재시도, 보류 응답 동안 입력/X/닫기/Escape/back 보호, 저장 성공 clean |
| 확인 기간 | SPA 취소·실패 후 dirty 유지, 다른 일정 저장 후에도 보호 유지, 저장 중 입력 잠금, 성공 baseline 갱신과 값 복원 clean |
| Google 일정 | 동기화 후 읽기 전용 입력 잠금, dirty 없음, Escape 닫기 |
| 초대 | back 취소·실패 입력 유지·beforeunload, 보류 저장의 이메일/X/Escape 잠금, 성공 clean, 폐기 후 다시 열면 빈 입력 |
| 390px 메뉴 | expanded/controls 연결, 반복 Tab trap, Escape·opener 복원, 메뉴 링크 이탈 취소 후 기간 유지, 본문 건너뛰기, 가로 overflow 없음 |

별도 `interface-native` 세션에서 개인 일정 제목 `새로고침 보존`을 입력하고 CLI `reload`를 실행했다. 실제 Chromium **beforeunload dialog**가 나타났고 `dialog-dismiss` 후 `/calendar`와 같은 제목이 유지되었다. `window.confirm`이 native인 것도 확인했다. 초대·확인 기간은 synthetic cancelable beforeunload 이벤트로 검사했으며 각 폼의 실제 탭 닫기와 다른 브라우저는 실행하지 않았다.

콘솔에는 기존 favicon 404만 관측했다. 11화면 × 2폭과 독립 회귀는 [03-audit.md](03-audit.md), [04-independent-verification.md](04-independent-verification.md)의 별도 담당 결과다.

## 검증 재현과 중간 실패 구분

Playwright 스킬의 CLI를 사용했다. 저장소 루트의 `AGENTS.md`, FE 지침, 화면 명세와 프로토타입 계획, 선행 보고서를 읽고 QA의 baseline 재현 완료 후 수정했다. QA는 수정 전 개인 일정·초대 back 입력 유실과 메뉴 Escape 미동작을 확인했다.

테스트 준비는 별도 브라우저 프로필·새 Vite 서버를 사용하고 아티팩트 cwd는 `/tmp`로 둔다. 스크립트는 seed를 초기화하므로 실제 사용 중인 브라우저에서 실행하지 않는다.

```sh
# FE 디렉터리에서 새 서버 실행. 실행 중 repo 소스·보고서 쓰기를 멈춘다.
pnpm dev --host 127.0.0.1 --port 5174
# 별도 /tmp 디렉터리에서
/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh -s=interface-frozen open http://127.0.0.1:5174 --headed
/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh -s=interface-frozen run-code "$(cat /Users/hoseok/services/teamground/teamground-fe/docs/reports/frontend-2026-11-22-hardening/interface-regression.js)"
/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh -s=interface-frozen eval 'window.__interfaceResults'
```

중간 실행은 통과 근거에서 제외했다. HMR이 발생한 5173 서버에서 전체 Suspense 대기·동적 서비스 계측 모듈 차이가 관측되어 별도 5174로 바꿨다. 초기 조회가 완료되기 전 failNext를 설정하면 조회가 오류를 소비하므로 스크립트에 초기 목록 완료 대기를 추가했다. 모바일 모달 뒤의 opener는 aria-hidden이므로 상태 검사는 includeHidden으로 수행하고 Radix의 비동기 종료 초점 복원 완료를 기다리게 했다. 재실행 시작 viewport도 명시했다. 이는 검증의 준비·대기 보완이며 앱 코드를 수정하지 않았다.

최종 스크립트는 `finally`에서 임시 confirm과 서비스 proxy를 복원하고 보류 promise를 해제한다. 로그/이전 아티팩트는 `/tmp/teamground-interface-final/`에 보관하며 이번 담당이 생성한 repo `.playwright-cli` 파일만 이동했다. 기존 `console-2026-11-22T03-39-16-393Z.log`는 건드리지 않았다.
