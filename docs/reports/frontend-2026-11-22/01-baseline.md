# 단계 1 · FE 기준 검증

- 실행일: 2026-11-22 11:45~11:49 KST
- 기준 HEAD: `221732d57a2368e8ad03a4e9a6e2bd4ceeb5f4fd`
- 범위: 로컬 mock 프론트엔드. 백엔드·외부 API 연동 없음.
- 기존 dirty `.gitignore`, `AGENTS.md`, `README.md`, `docs/prototype-plan.md`, `vercel.json`은 수정하지 않았다. 이 검증 담당자는 본 보고서만 추가했다. 커밋·푸시·PR 없음.
- 루트/FE AGENTS.md, 화면 명세, 프로토타입 계획 및 Playwright 스킬 확인.

## 명령 결과

작업 디렉터리 `teamground-fe`:

| 실제 명령 | 결과 |
|---|---|
| `pnpm typecheck` | 성공, tsc --noEmit |
| `pnpm test` | 성공, 2 files / 18 tests, Vitest 3.2.7 |
| `pnpm build` | 성공, Vite 6.4.4, 2077 modules |
| `pnpm dev --host 127.0.0.1` | 성공, http://127.0.0.1:5173 |

빌드 경고: Zod 소스 주석의 PURE annotation 해석 경고 2건, index 번들 648.69 kB(500 kB 경고 기준 초과). 실패는 아니다. 테스트는 날짜 경계, 반복 추천, 확정 전 변경·중복, 서비스 권한, 초대 이메일·중복 수락, 다음 요청 실패·재시도, 영상 주소 제한·연쇄 삭제, 로그인 취소를 포함한다.

## 실제 브라우저 재현

Playwright CLI headed Chromium, named session `fe-baseline`, 실행/임시 산출물 디렉터리 `/tmp`. 초기 기본 세션이 다른 상태로 바뀌어 named session으로 분리했다. 아래는 실제 클릭·입력으로 실행했다.

1. `/login`에서 지우 선택 → 시작 → `/teams` → 파동 극단.
2. 일정 조율 → 발표 예시 채우기 → 추천 시간 찾기. 후보 1개, 수요일 19~21시, 10/14·10/21·10/28·11/04 네 회차, 모두 가능 표시. 금요일 후보 없음.
3. 화면을 390×844로 변경 → 이 시간으로 확정 → 4개 회차 확정 → 첫 회차 상세(1/4).
4. 영상 추가 → 로컬 데모 영상 선택 → 영상 추가 → 생성 영상 상세.
5. 실제 video.play() 실행 후 500ms 경과를 관측: currentTime=0.4798, paused=false, readyState=4, error=null. 소스는 localhost `/demo/rehearsal.mp4`.
6. 피드백 `단계 1 새로고침 검증 피드백` 입력 → 데모 도구 `다음 요청 실패` → 등록. 실패 안내가 나타나고 본문 유지, 피드백 수 0 유지.
7. 등록 재시도 → 새로고침. 피드백 1개·영상·연결 회차 유지, 입력란 비워짐.
8. 데모 계정 전환 → 하린 로그인. 원래 영상 URL 복귀, 지우 영상/댓글은 보이고 수정·삭제 버튼은 숨겨짐. 댓글 등록 입력은 계속 제공됨.

390px 추천 결과와 영상 상세에서 `innerWidth=390`, `document.documentElement.scrollWidth=375`로 수평 넘침 없음. 390px에서 확정 모달·영상 추가·댓글 실패/재시도를 실제 조작했다. 전체 화면 픽셀 수준 시각 검토나 전체 브라우저 조합 검증을 뜻하지 않는다.

핵심 관측 스냅샷(임시 파일):

- `/tmp/.playwright-cli/page-2026-11-22T02-47-25-524Z.yml`: 추천 결과
- `/tmp/.playwright-cli/page-2026-11-22T02-47-38-357Z.yml`: 첫 회차 확정
- `/tmp/.playwright-cli/page-2026-11-22T02-48-16-869Z.yml`: 실패 후 댓글 유지
- `/tmp/.playwright-cli/page-2026-11-22T02-48-26-882Z.yml`: 새로고침
- `/tmp/.playwright-cli/page-2026-11-22T02-48-48-704Z.yml`: 일반 멤버 권한 UI

## 재현한 결함 및 구현 인계

11:46 KST, 구현 담당자 수정 시작 전 baseline에서 확인:

1. `/teams/padong/occurrences/rehearsal-1` → 영상 추가 → 아무 입력 없이 Escape. `영상 추가를 닫을까요? 입력한 내용은 저장되지 않습니다.` confirm 발생. clean 폼에도 불필요한 이탈 확인.
2. `/teams/padong/occurrences/rehearsal-1/videos/video-1` → 수정 → 제목을 `수정 미저장 재현`으로 변경 → Escape. confirm 없이 모달이 닫히며 미저장 내용 보호 없음. 닫힌 뒤 수정 버튼으로 초점은 복원됨.

이 두 재현을 루트와 영상 모달 담당자에게 전달하여 수정 시작 허용. 이후 정상 흐름 검증 도중 영상 파일의 병행 수정이 시작되었으므로, 위 결함과 초기 명령 실행은 baseline 근거이고 후반 브라우저 정상 흐름은 작업 중 checkout 근거다. 수정 완료 SHA에 대한 독립 재검증은 별도 단계로 기록해야 한다.

추가 경미 관측: `/favicon.ico` 404 두 번(초기 브라우저 요청), 기능 런타임 예외는 관측하지 않음.

## 미검증

- 수정 모달 X/overlay 각각의 baseline 재현, 저장 중 dismiss·중복 제출, 모든 모달 키보드 경로 및 focus trap 전체.
- 이번 브라우저 실행에서 초대 수락, 일반 멤버 초대/확정 버튼 제한, 타 팀 ID 조작, 영상 A/B 댓글 분리, 추천 변경 시나리오를 각각 재실행하지 않음. 일부는 기존 18개 서비스 테스트로 확인되지만 브라우저 검증과 구별한다.
- 네트워크 전체 차단 환경 재생, 프로덕션 preview·배포 URL, Safari/Firefox, 실제 서버 보안은 검증하지 않음.
- 수정 완료 후 typecheck/test/build 및 변경 모달 독립 재검증 필요.
