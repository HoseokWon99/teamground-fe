# 독립 실행 검증

2026-11-22 KST. 구현과 분리된 FE QA가 직접 실행했다. 앱 코드·기존 dirty 파일은 수정하지 않고 이 보고서와 03-audit만 작성한다. 커밋·PR 통합은 UI 담당, HEAD/CI 승인 검토는 루트 담당이다.

## 검증 소스

최종 검사 시 HEAD `d1766e20012ba5e28b3044b1547d0758236ca3d6` 위 UI 미커밋 변경을 포함했다. 아래 8개 대상 파일의 `git hash-object` 값은 최종 검사 시작·종료가 동일하며 해당 검증 중 기능 변경은 없었다. 이 목록을 전체 변경 파일 목록으로 간주하지 않는다. 최종 UI 커밋은 이 blob과 비교해야 하며 위 HEAD만으로 UI 변경까지 커밋되었다고 해석하면 안 된다.

| 파일 | blob |
|---|---|
| src/app/App.tsx | `4c41b9e442e830184c4e53527fc6b3527a0818cd` |
| src/styles.css | `e12a980b8b0ef44297550898994750dfdd53708a` |
| src/features/calendar/pages.tsx | `1fac5649578be461ae275b117f2fc31ea2221dbc` |
| src/features/teams/pages.tsx | `ca6e68fd734296f67d0f1e65663b9af26db6ffa2` |
| src/stores/useAppStore.ts | `8f79ad71294100178eb2a56144bfe9873bdba576` |
| src/stores/persistence-schema.ts | `06edf71808434fe4e413b12f97302ed6913e302f` |
| src/components/StorageNotice.tsx | `994989f509ec37b8840101fc6e6f7724d613f656` |
| src/components/ui/modal.tsx | `37d864d427251ced5bb81ee4c68c4c087cf4bb35` |

## 화면·키보드 검사

03-audit의 11개 화면 × 1440/390 DOM 감사와 키보드 4그룹 PASS를 직접 관측했다. `/tmp/teamground-keyboard-qa.js`는 독립 작성한 CLI run-code 스크립트다. 오류 focus와 닫힘 후 focus는 비동기 업데이트를 기다려 검사했다. 즉시 assertion으로 발생했던 focus 실패는 기다린 후 실제 초점이 정상인 것을 확인하고 스크립트를 수정·재실행했다.

## 저장소 검사

`hardeningstorage` 세션과 시나리오별 새 browser context에서 `/tmp/teamground-storage-qa.js` 실행. 다음 12가지 PASS를 `window.__storageQA`로 확인했다.

- 잘못된 JSON, version 불일치, shape 오류, 실제 존재하지 않는 날짜, 없는 session ID, 고아 video 참조, javascript URL: 기본 데모·경고 표시, 로그인 후 메모리 사용 가능, 원래 저장 문자열 그대로 유지.
- localStorage getter throw, getItem throw, localStorage 부재: 앱 전체 오류 없이 경고와 메모리 로그인.
- setItem throw: 로그인 저장 시 경고 즉시 표시, 화면 계속 사용.
- 정상 저장 데이터: 변경한 팀 이름과 세션 복원, 새로고침 후 유지.

`/tmp/teamground-recovery-qa.js`의 2그룹도 PASS. 1440/390에서 복구 버튼 elementFromPoint 실제 가림 없음과 document overflow 없음. 취소 시 손상 원문 유지. quota 재현 시 복구 모달 내부 alert와 열림 유지. setItem 복원 후 재시도 성공, 사라진 버튼 대신 status로 초점 이동, unrelated 키 유지, 새로고침 후 경고 없이 정상 복원. 로그인 1440 quota 경고문도 x=289의 본문을 hit-test하여 sidebar에 가려지지 않음을 확인했다.

localStorage가 처음 부재했다가 다시 나타나 미확인 원본이 남아 있는 두 추가 edge 사례는 구현 담당 단위 테스트 범위이며 독립 브라우저에서는 직접 실행하지 않았다.

스토리지 오류 주입은 브라우저 init script와 Storage prototype 계측이며 실제 OS 브라우저 정책을 변경한 실험은 아니다. 단위 테스트 결과와 구분한다.

## 기존 이탈 보호 회귀

이전 `frontend-2026-11-22-navigation/navigation-regression.js`를 읽고 직접 재사용 실행했다. `window.__navigationResults` 4그룹 PASS:

- 팀 생성 back 취소·폐기/forward, 팀·계정·로그아웃·초기화 전환 취소, 저장 실패·재시도, synthetic beforeunload.
- 조율 예시 dirty, saveDraft 실패 후 보호, 재시도 성공.
- 신규·수정 피드백 실패·재시도, 영상 모달과 동시 dirty 보존, 390px 취소·폐기.
- 로그아웃 허용 시 세션 해제와 로그인 이동.

## 기존 영상 회귀와 재생

최종 별도 fresh Vite `http://localhost:5174` (`pnpm dev --port 5174`), 새 Chromium `hardeningfinal` 세션에서 기존 `frontend-2026-11-22/video-modal-regression.js`를 직접 실행했다. `window.__videoRegressionResults` **12그룹 모두 PASS**:

- 추가/수정 × 취소·Escape·닫기·overlay의 clean 종료, dirty 취소·허용, 원래 값 복원 시 clean, 초점 복귀.
- 추가/수정 각각 오류 첫 필드 초점·입력 잠금 해제.
- 저장 중 닫기·입력 잠금, 동시 submit 호출 1회, 실패 입력·오류 보존, 재시도 성공·초점 복귀.

동일 세션에서 로컬 영상 play 후 currentTime=0.2132, readyState=4, 실제 소스 `/demo/rehearsal.mp4`를 확인했다. 외부 영상 호스트 접근은 하지 않았다.

초기 5173 실행은 개발 중 full reload와 HMR 모듈 계측 불일치로 중단됐다. 저장 UI가 실행되는데 bare dynamic-import probe 호출은 0인 상황을 확인했다. 그 시도를 PASS로 계산하지 않고 소스 고정·별도 새 서버의 재실행 결과만 영상 회귀 근거로 사용한다. 개발 중 보고서/build 생성으로 인한 reload 가능성이 있어 최종 실행 동안 저장소 파일쓰기를 중지했다.

## 실제 명령과 증거 위치

작업 cwd는 `/tmp`. CLI 경로는 `/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh`.

```sh
playwright_cli.sh -s=hardeningaudit run-code --filename=/tmp/teamground-audit.js
playwright_cli.sh -s=hardeningaudit run-code --filename=/tmp/teamground-keyboard-qa.js
playwright_cli.sh -s=hardeningstorage run-code --filename=/tmp/teamground-storage-qa.js
playwright_cli.sh -s=hardeningstorage run-code --filename=/tmp/teamground-recovery-qa.js
playwright_cli.sh -s=hardeningqa run-code --filename=/Users/hoseok/services/teamground/teamground-fe/docs/reports/frontend-2026-11-22-navigation/navigation-regression.js
playwright_cli.sh -s=hardeningfinal run-code --filename=/Users/hoseok/services/teamground/teamground-fe/docs/reports/frontend-2026-11-22/video-modal-regression.js
```

각 결과는 CLI eval로 결과 배열을 직접 읽었다. 신규 임시 스크립트와 `.playwright-cli` 콘솔·snapshot은 `/tmp`에 있어 영구 CI 산출물은 아니다. 기존 회귀 스크립트는 저장소에 있다. 신규 스크립트는 구현 담당 테스트와 독립 작성했고, 이전 회귀는 기존 스크립트 재사용임을 구분한다.

## 미검증 및 후속 책임

이번 QA는 typecheck/Vitest/build를 재실행하지 않았다. 해당 명령은 구현 담당의 실행 근거를 루트가 별도로 검토해야 한다. 필수 CI와 최종 PR HEAD 검토도 루트 책임이다. 실제 백엔드·API·OAuth·메일·배포 URL, Safari/Firefox, 스크린리더, 전체 WCAG, 모든 모바일 오류/권한/빈 상태 조합은 검증하지 않았다. 보고된 범위 내 미해결 제품 결함은 없다.
