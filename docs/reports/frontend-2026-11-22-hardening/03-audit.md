# 독립 화면·키보드 감사

검증 담당: FE 독립 QA. 2026-11-22 KST, Chromium Playwright CLI `hardeningqa` / `hardeningaudit`. 앱 코드는 수정하지 않았다. 루트·FE AGENTS, screen-specification, prototype-plan, 이전 navigation/video 독립 보고서를 기준으로 범위를 정했다. 실제 서버·메일·OAuth·Google API는 호출하지 않았다.

## 수정 전 발견

| 우선순위 | 재현 | 관측 | 담당자 전달 |
|---|---|---|---|
| P1 | 개인 일정 추가 → 제목 입력 → browser back | `/calendar`에서 `/teams`로 이동, 확인 없이 모달·입력 유실 | UI 담당에게 구현 전 전달 |
| P1 | 팀 멤버 → 초대 이메일 입력 → browser back | 팀 홈으로 이동, 확인 없이 모달·입력 유실 | UI 담당에게 구현 전 전달 |
| P2 | 390px 메뉴 열기 → Escape | `.sidebar.open` 유지, dialog 0, 초점 opener 잔류 | UI 담당에게 구현 전 전달 |

위 세 항목은 변경 전 브라우저에서 직접 재현했다. UI 담당의 별도 baseline 보고를 본인 실행으로 세지 않았다. 수정 후 개인 일정·기간·초대 전역 이탈 보호와 모바일 메뉴 focus trap/Escape/초점 복원을 확인했다.

## 11개 화면 × 두 너비

1440×900, 390×900에서 seed 지우 계정으로 화면 로드 후 document scrollWidth와 viewport 비교, 본문 경계, 표시된 button/input/select/textarea의 텍스트·label·aria 이름 유무를 점검했다. 추천 결과는 초안만 저장한 상태가 아니라 예시 추천을 생성한 상태로 보완했다.

| 화면 | 경로 | 1440 / 390 결과 |
|---|---|---|
| 로그인 | `/login` | 양쪽 가로 넘침 없음, 이름 누락 없음 |
| 초대 확인 | `/invite/welcome-seoyeon` | 동일 |
| 팀 목록 | `/teams` | 동일 |
| 팀 생성 | `/teams/new` | 동일 |
| 팀 홈 | `/teams/padong` | 동일 |
| 멤버·초대 | `/teams/padong/members` | 동일 |
| 개인 일정 | `/calendar` | 동일 |
| 조율 조건 | `/teams/padong/scheduling` | 동일 |
| 추천 결과 | `/teams/padong/scheduling/results` | 동일, 수요일 후보 1개·4회 정보 표시 |
| 회차 상세 | `/teams/padong/occurrences/rehearsal-1` | 동일 |
| 영상 상세 | `/teams/padong/occurrences/rehearsal-1/videos/video-1` | 동일 |

초기 측정 중 일부 화면은 lazy/load가 끝나지 않아 h1이 없었다. 그 결과를 완료 화면 판정으로 사용하지 않고 대기 시간을 늘린 전수 재실행 및 팀 목록 1440 별도 heading 대기로 보완했다. 최종 가로폭은 각각 1440/390이었다. 이 검사는 자동 DOM 기준 기본 감사이며 WCAG 전 항목 인증이나 모든 픽셀의 시각 검토가 아니다.

## 키보드·핵심 상태 대표 검사

- 모바일 메뉴 Enter로 열기, 연속 Tab 12회 초점 내부 유지, Escape 닫기, 메뉴 버튼 초점 복귀.
- 개인 일정 입력 후 browser back 취소 시 URL·입력 유지, Escape 폐기 후 일정 추가 버튼 초점 복귀.
- 일정 확인 기간 변경 후 back 취소 시 값 유지, 폐기 시 원래 목록 이동.
- 초대 빈 제출의 첫 오류 이메일 초점, 이메일 입력 후 back 취소·폐기.
- 저장소 경고와 복구 실패를 status/alert로 접근, 복구 성공 후 status 초점.
- 기존 영상 모달 추가·수정의 오류 첫 필드, 닫힘·초점 복귀는 기존 12그룹 회귀로 별도 확인.

최종 실행에서 추가 제품 결함을 발견하지 않았다. 스크린리더, 색 대비 수치, 확대 200%, 모든 Tab 순서, Safari/Firefox 및 모든 빈 상태·권한 조합은 이번 감사에서 전수 검증하지 않았다.
