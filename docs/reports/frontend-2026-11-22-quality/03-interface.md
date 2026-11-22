# UI 접근성·브라우저 결함 수정

작성: FE UI 담당, 2026-11-22. QA가 원본 production을 `/tmp/teamground-quality-baseline`에 고정한 뒤 수정했다. 기존 사용자 변경 5파일은 편집·stage하지 않았다.

## 재현과 수정

| 발견 | 수정 |
|---|---|
| 11화면의 작은 보조 텍스트 대비 부족: `.muted` 흰색 3.78:1/본문 배경 3.54:1, `.eyebrow` 흰색 3.96:1. nav/sidebar/meta/back-link/demo/ghost button도 실패 | 실제 baseline에서 실패한 10색만 `#5c6b59`로 변경. 흰색 5.67:1, 본문 5.32:1, hero 배경 4.98:1. 레이아웃·장식색은 유지 |
| Avatar 5색 모두 기존 글자색 `#244b37`로 2.1~3.99:1 | 배경 상대휘도를 계산해 검정/흰색 중 높은 대비 선택. 지우 보라색은 검정도 4.494:1로 미달이므로 흰색(4.67:1). 비정상·투명 배경은 불투명 기본 배경으로 fallback |
| 다른 달 날짜의 부모 opacity .4로 대비 1.57:1 | opacity 제거. 연한 배경과 `M/d` 표시로 구분하고 기존 일정 접근 유지. 일정 버튼 접근성 이름에 전체 날짜 추가 |
| 기존 키보드 focus outline은 흰 배경 대비 1.74/1.82:1 | primary outline으로 변경, 버튼/링크/summary에는 흰 안쪽 ring도 추가해 어두운 카드에서도 식별. input outline도 같은 primary 사용 |
| 공개 로그인·초대 main landmark 없음, 회차 페이지 unnamed aside 중복 | PublicLayout에 main, 회차 aside에 이름 제공. 이 두 항목은 axe best-practice이며 AA 위반과 구분 |
| WebKit에서 메뉴를 pointer click 후 닫으면 opener 초점 복원 실패 | 공통 Button의 native button click을 `focus({preventScroll:true})` 후 기존 onClick 호출로 정규화. Safari계열은 pointer click에 button 초점을 주지 않아 Modal의 이전 activeElement가 opener가 아니었다. asChild 링크/disabled 동작은 유지 |

`vercel:react-best-practices` 스킬을 읽고 기존 React/Radix 컴포넌트, 이벤트 전달, lazy 경계를 유지했다. 새 기능·백엔드·외부 연동·의존성을 추가하지 않았다. 대비 계산 helper는 모든 seed 색과 명암 전환 경계, 잘못된 색 fallback을 단위검사한다.

## 실제 검증

- `pnpm typecheck`: 앱과 CI 담당이 추가한 E2E TypeScript 검사 성공.
- `pnpm test -- src/lib/avatar-colors.test.ts`: 실제 package script는 `vitest run src -- ...`로 실행되어 전체 **5파일 74개 통과**(새 대비 검사 13개 포함).
- CI 담당의 최종 `pnpm build` 및 3브라우저 영구 E2E **13/13 통과**(19.7초). WebKit 모바일 메뉴·영상 추가 저장·영상 수정 Escape 후 opener 초점 복원 통과, Chromium axe 5상태 위반 0. 실행 근거는 CI 보고서에 기록한다.
- QA 중간 production 11화면 axe 전체 규칙 위반 0. 최종 11화면·모달 axe/reflow 검증은 QA 보고서를 따른다.
- `git diff --check`: 성공. 루트가 코드 diff와 1440/390 화면을 검토하고 커밋을 승인했다.

## 미검증·범위

현재 이 보고서 작성 시 독립 최종 브라우저 검증은 진행 중이다. 자동 axe 통과를 전체 WCAG 준수 또는 실제 Safari/보조기기 검증으로 표현하지 않는다. 320px reflow·확대·모달 검증의 방법과 한계는 QA 보고서에서 별도 기록한다.

## 추가 WebKit 초대 모달 수정

최초 13개 E2E 통과 이후 QA가 WebKit의 초대 모달 Tab 탈출을 별도로 발견했다. 단일 fresh browser, headed/headless, viewport 변경·axe 실행 없이도 이메일 → focus guard → 배경 팀 전환으로 이동했다. React fiber 진단에서 Radix scope는 `trapped: true`, `paused: false`였지만 마지막 내부 초점 ref가 비어 있었고, 진단용 재초점 후에는 탈출하지 않았다. 초대 이메일의 React `autoFocus`가 Radix focus listener보다 먼저 실행된 경우였다.

초대 입력의 `autoFocus`를 제거하고 공통 Modal의 선택적 `onOpenAutoFocus`에서 RHF `setFocus("email")`을 호출한다. 초기 이메일 초점은 유지하면서 Radix가 내부 초점 이동을 기록하게 한다. 새 Tab trap이나 브라우저별 분기는 추가하지 않았다. 페이지의 팀 생성 autofocus는 유지한다. 변경 후 `pnpm typecheck`, `git diff --check`는 통과했다. CI·QA의 새 production 빌드에서 양방향 Tab/Shift+Tab 루프와 Escape 복원을 재검증한다. 초기 13개 통과만으로 이 추가 결함의 해결을 주장하지 않는다.

추가 수정의 최종 결과: CI가 수정 전 WebKit 초대 테스트 실패를 확보하고 새 빌드에서 **16/16 E2E 통과**(21.8초), 타입 검사·74개 단위검사·production build 성공을 확인했다. QA는 강제 초점 호출 없이 WebKit 5개 모달 각각 Tab 8회·Shift+Tab 8회·Escape·opener 복원 통과, Chromium 5개 모달/11화면 axe 위반 0, Firefox/WebKit 핵심 흐름 통과를 독립 확인했다. 루트가 추가 2파일 diff를 검토 승인했다.
