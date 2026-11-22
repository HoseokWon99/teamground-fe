# 독립 브라우저·접근성 기준 감사

검증일: 2026-11-22 · 담당: fe_quality_audit

## 대상과 방식

루트/FE AGENTS.md, screen-specification, prototype-plan과 이전 navigation/hardening 보고를 확인했다. 시작 main `07d033b4`를 바탕으로 CI 담당의 의존성 추가만 있는 시점에 `pnpm exec vite build --outDir /tmp/teamground-quality-baseline`로 별도 production snapshot을 만들었다. UI 담당은 snapshot 완료까지 소스를 변경하지 않았다. `vite preview --outDir /tmp/teamground-quality-baseline --host 127.0.0.1 --port 4183`에서 독립 mock 계정으로 검사했다. HMR 서버를 사용하지 않았다.

Playwright 1.65.1 / axe-core 4.14.0. Chromium에서 axe 기본 전체 규칙을 실행하여 WCAG A/AA와 best-practice 결과를 구분했다. 외부 요청은 차단하고 실제 OAuth·메일·API를 호출하지 않았다. `/tmp/teamground-quality-qa/audit.cjs`는 이번 QA가 독립 작성한 임시 검사이며 과거 회귀 스크립트를 재사용하지 않았다. CLI snapshot으로 로그인 UI를 먼저 확인했다.

## 11개 화면 자동 검사

| 화면 | color-contrast 실패 노드 | 별도 best-practice | 320 / 640 / 1440 CSS px 문서 넘침 |
|---|---:|---|---|
| AUTH-01 | 14 | landmark-one-main, region | 없음 |
| INV-01 | 4 | landmark-one-main, region | 없음 |
| TEAM-01 | 22 | 없음 | 없음 |
| TEAM-02 | 45 | 없음 | 없음 |
| TEAM-03 | 13 | 없음 | 없음 |
| TEAM-04 | 21 | 없음 | 없음 |
| CAL-01 | 39 | 없음 | 없음 |
| SCH-01 | 17 | 없음 | 없음 |
| SCH-03 | 23 | landmark-unique | 없음 |
| VID-01 | 19 | 없음 | 없음 |
| SCH-02 | 16 | 없음 | 없음 |

SCH-02는 발표 예시 채우기 → 추천 시간 찾기로 실제 결과를 생성했다. 화면별 기본 상태의 검사이며 모든 권한·빈 상태·오류 조합을 포괄하지 않는다. 640 CSS px는 1280px 화면을 200% 확대한 경우의 유효 너비를 참고한 **재배치 대체 검사**다. 실제 브라우저 확대 검사와 동일하다고 주장하지 않는다.

## 결함과 전달

- **P2, WCAG 1.4.3 텍스트 대비:** `.muted` 3.32~3.78:1, `.eyebrow` 3.48~3.96:1, sidebar section 2.60:1, nav 4.13:1, demo label 3.26:1, demo summary 3.43:1 등 일반 글자 기준 4.5:1 미달. 개인 캘린더 다른 달 날짜는 1.57:1도 관측했다. 실제 선택 가능한 정보와 장식 구분을 UI 담당에게 요청했다.
- **P2, 아바타 글자:** foreground `#244b37`와 지우/하린/민서/도윤/서연 배경의 대비는 각각 2.10 / 3.99 / 3.16 / 3.02 / 3.59:1. 5색 모두 미달. 사용자별 색을 유지하면서 읽을 수 있게 조정하도록 전달했다.
- **구조 개선, axe best-practice:** AUTH-01/INV-01 `main` 부재와 region, SCH-03의 이름 없는 복수 aside에 `landmark-unique`. AA 위반과 별도로 기록하고 UI 담당에게 전달했다.

전체 원시 target·실측 값은 임시 `baseline.json`에 보관했다. UI 담당과 루트에게 즉시 전달했으며 수정 후 재실행 결과는 04 보고서가 기준이다.

## 핵심 모달

초대·개인 일정 추가·영상 추가·영상 수정·일정 확정 5개 모달에서 axe 색 대비 실패를 관측했다. 320/640 CSS px에서 모달 경계가 화면 안에 있고 내부 가로 넘침이 없었다. 각 모달에서 Tab 16회 동안 dialog 안에 초점이 유지되고 Escape 후 원래 버튼으로 복귀했다. Calendar 초점 복귀 첫 즉시 관측은 false였지만 close 처리 정착 120ms 후 전체 재실행에서 5개 모두 통과했다. 잘못 지정한 영상 수정 locator timeout은 실제 `수정` 버튼으로 보완했다. 앱 결함과 검사 오류를 구분한다.

## 한계

자동 axe/DOM/키보드 검사는 화면읽기기 청취 검증이 아니다. VoiceOver/NVDA 실사용, 실제 Safari 앱, 모든 WCAG 기준과 실제 서비스 연동은 이 기준 감사에 포함하지 않았다. WebKit 엔진 결과도 Safari 실기 검증으로 표현하지 않는다. 최종 브라우저별 핵심 흐름·저장 지속성과 확대 대체 검사, 소스 불변 근거는 독립 재검증 보고서에서 기록한다.

## 수정 후 추가 발견

최종 검사 확대 과정에서 WebKit 초대 모달의 초기 자동 초점 이후 Tab이 배경 컨트롤로 빠지는 P2 키보드 결함을 발견했다. 앱의 초기 초점을 모달 lifecycle에 맞추도록 수정했고 최종 5개 모달 양방향 이동에서 재현되지 않았다. 자세한 재현·원인 분리·재검증은 [04 독립 검증](04-independent-verification.md)에 기록했다.
