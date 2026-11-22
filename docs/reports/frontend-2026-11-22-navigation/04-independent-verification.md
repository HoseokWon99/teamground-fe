# 단계 3 · 독립 FE 검증

검증일: 2026-11-22 · 담당: 독립 FE QA 재개 에이전트 `fe_navigation_recheck`

## 범위와 검증 대상

루트가 중단된 QA의 남은 검증을 위임했다. 루트/FE AGENTS.md, 화면 명세·프로토타입 계획의 해당 흐름, 이번 회차 01·02·03 문서와 회귀 스크립트를 확인했다. 앱 소스는 수정하지 않았고 이 보고서만 작성했다. 백엔드·실제 외부 연동은 실행하지 않았다.

기존 5173 서버가 응답하지 않아 `pnpm dev --host 127.0.0.1`로 Vite를 시작했다. Playwright CLI Chromium의 별도 `navigation-recheck` 세션을 사용했고, 네이티브 이탈 확인은 계측이 없는 새 `navigation-native` 세션에서 별도로 수행했다. CLI 로그·임시 스크립트는 `/tmp/teamground-navigation-independent-20261122/`, 기본 CLI console/snapshot은 `/tmp/.playwright-cli/`에 있다. 임시 산출물은 영구 보존을 보장하지 않으며, 핵심 절차와 결과는 아래에 기록한다.

구현 담당의 기능불변 포맷 완료 신호 후 검증을 시작했다. 시작/종료 `git hash-object` 값이 같고, 최종 커밋 `fec9e900e45d60b625267ca77bdf603c2ceea235`의 blob과 모두 일치함을 직접 확인했다. PR: [#2](https://github.com/HoseokWon99/teamground-fe/pull/2).

| 소스 | 시작 = 종료 = HEAD blob |
|---|---|
| `src/app/App.tsx` | `fd1502abd5b70cb4072e8b2e7f769134e48ebf0e` |
| `src/app/unsaved-changes.tsx` | `af4a7eabdf4a5aeeedd46463d8f7f1dcc1b43da8` |
| `src/features/scheduling/pages.tsx` | `684c45c41a925ce7a5fa09e3cc9e41dd486ec4cb` |
| `src/features/teams/pages.tsx` | `967f562bf3b01937838f5b8a63b3453afb9a5655` |
| `src/features/videos/pages.tsx` | `ed5db74daa38d79a1e51c78b1e69dbc91b4fb200` |

## 이번 에이전트가 직접 실행한 이동 보호 검증

루트 리뷰로 계측의 finally 복원이 추가된 `navigation-regression.js`, `navigation-pending-regression.js`를 별도 세션에서 `playwright_cli.sh -s=navigation-recheck run-code <스크립트 내용>`으로 순서대로 실행했다. 둘 다 오류 없이 마지막 로그인 목적지까지 완료했다. 후자의 `window.__navigationPendingResults` 3개 PASS도 조회했다. 실패는 Vite mock service/store 계측으로 재현하며 실제 API 오류 검사가 아니다.

| 항목 | 직접 관측한 결과 |
|---|---|
| 팀 생성 | browser back 취소 시 URL·이름 유지, 폐기 후 팀 목록, forward 후 clean 복귀 통과 |
| 팀/계정/로그아웃/초기화 전환 | 취소 시 입력·세션·팀 데이터 유지, 저장 실패 시 보호 유지, 재시도 성공 후 clean 통과 |
| 조율 | 발표 예시 채우기 후 이탈 확인, saveDraft 실패 시 dirty 보호, 재시도 성공 시 추천 결과 이동 통과 |
| 피드백 신규/수정 | 링크 이탈·수정 취소에서 입력 보존, 저장 실패 후 재시도 성공과 clean 전환 통과 |
| 다중 입력 | 피드백 dirty 상태에서 영상 수정 모달 저장 후에도 피드백 보호 유지 통과 |
| 390 × 844 | 피드백 이탈 취소·폐기 및 입력 유지, document 가로 overflow 없음 통과 |
| 로그아웃 허용 | session null 및 명시적인 `/login` 이동, 남은 확인창 없음 통과 |
| 저장 중 | 팀 저장 응답 보류 동안 입력 잠금·back 차단, 성공 목적지 이동 후 저장 모달 해제 통과 |
| 저장 baseline | saveDraft 성공 뒤 recommend 실패 시 이미 저장된 초안은 clean, 내 일정 이동 통과 |
| 초기화 허용 | 미저장 폐기 뒤 초기화·로그인 이동, 불필요한 확인 없음 통과 |
| synthetic beforeunload | dirty에서 취소 가능한 이벤트가 방지되고 저장 후에는 방지되지 않음 통과 |

## 네이티브 새로고침 확인

새 `navigation-native` 세션에서 UI로 지우 로그인 → 팀 만들기 → 이름 `네이티브 확인 보존` 입력 → CLI `reload`를 실행했다. CLI가 **beforeunload 타입의 실제 브라우저 dialog**를 보고했다. `dialog-dismiss` 후 `/teams/new`와 입력값 `네이티브 확인 보존`이 유지됨을 evaluate로 확인했다. 같은 검사에서 `window.confirm.toString().includes('[native code]') === true`였다. synthetic 이벤트 검사와 별개인 실제 Chromium 확인 결과다.

초기 `navigation-recheck` 세션에서 dialog listener를 넣은 run-code도 beforeunload를 관측했으나 CLI의 dialog 인터럽트로 결과가 분리되었다. 그 시도의 입력 보존을 확정 근거로 쓰지 않고 위의 새 세션·명시적 reload/dismiss 결과를 사용한다. 탭 닫기·Safari·Firefox의 실제 확인창은 실행하지 않았다.

## 라우팅 회귀

임시 `routing.js`를 Playwright CLI에서 실행하고 `window.__routingResults`의 7개 PASS를 확인했다.

- 비로그인으로 원래 영상 상세 URL 접근 → 로그인 → 같은 영상 URL·피드백 화면 복귀.
- 비로그인 초대 `welcome-seoyeon` → 로그인 버튼 → 서연 선택 → 같은 초대 복귀 → 수락 → 파동 팀 홈 이동.
- 서연이 참여하지 않은 프레임 팀 URL은 `이 팀에 접근할 수 없습니다` 표시.
- 일반 멤버의 멤버 화면에 `멤버 초대` 버튼 없음.
- 파동 경로에서 프레임 회차 `frame-1` 접근 시 찾을 수 없음 표시.
- 존재하지 않는 영상 ID 접근 시 찾을 수 없음 표시.
- fresh document/route loads 동안 pageerror와 복수 blocker 경고 없음. 전체 CLI console에도 `A router only supports one blocker at a time` 경고 없음. 초기 favicon 404는 관측됨.

첫 임시 스크립트는 초대 로그인 요소를 link로 지정해 timeout됐다. snapshot에서 실제 button임을 확인하고 locator를 수정한 후 seed reset부터 전체 재실행하여 통과했다. 앱 결함이나 앱 수정은 없었다.

## 기존 영상 모달 회귀

이전 회차 `video-modal-regression.js`에 실행 준비용 mock reset/지우 로그인을 임시로 앞붙여 실행했다. 저장소의 스크립트는 수정하지 않았다. `window.__videoRegressionResults`의 12개 PASS를 직접 조회했다.

- 추가/수정 각각 취소·Escape·닫기·overlay의 clean 닫기, dirty 취소·허용, 원래 값 복원 시 clean, 닫힌 뒤 초점 복귀 통과.
- 추가/수정 각각 유효성 오류 첫 필드 초점, 저장 중 입력·닫기 잠금, 동시 submit 중복 방지, 실패 후 입력·오류 보존, 재시도 성공 및 초점 복귀 통과.

## 이전 보고와 남은 한계

중단 전 QA의 팀 back/팀 전환/logout 취소/sidebar 폐기, 피드백 신규·수정, 저장 후 clean, 영상 모달 저장 후 다른 dirty 유지, synthetic beforeunload PASS는 루트로부터 전달받은 **이전 보고**다. 이번 판정은 위 직접 재실행 결과를 근거로 하며 이전 보고를 본인 실행으로 세지 않는다. 01 baseline의 HMR 혼합 관측도 최종 고정 소스 검증과 구분한다.

`pnpm typecheck`, `pnpm test` 18개, `pnpm build`는 이번 독립 QA가 다시 실행하지 않았다. 구현 담당의 최종 실행 보고는 02 문서와 PR에서 검토해야 한다. CI와 Ready 승인 판단은 루트 책임이다. 실제 백엔드 연동, 전체 화면 접근성·모바일 전수, Safari/Firefox, 탭 닫기, 초대·개인일정 폼 전역 보호 확대는 미검증/범위 밖이다. 이번 직접 검증에서 추가 앱 결함은 발견하지 않았다.
