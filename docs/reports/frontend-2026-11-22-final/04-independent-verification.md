# 최종 FE 독립 브라우저 검증

검증일: 2026-11-22 · 담당: 독립 FE QA

## 대상과 실행 근거

성능·달력 담당의 최종 freeze 이후 `NODE_ENV=production pnpm exec vite build --outDir /tmp/teamground-final-qa-dist --emptyOutDir`로 별도 빌드(exit 0), `pnpm exec vite preview --outDir /tmp/teamground-final-qa-dist --host 127.0.0.1 --port 4188 --strictPort`로 검사했다. 공용 dist를 수정하지 않았다. 앱 코드는 수정하지 않았고 별도 브라우저 context의 mock 데이터만 사용했다.

기존 quality 감사의 audit/modal/webkit-modal/cross 임시 스크립트를 이번 포트·뷰포트·브라우저 조합에 맞춰 재사용했다. 달력·cold direct URL·샘플 설명·데모 도구 오류의 독립 스크립트는 추가 작성했다. 임시 경로는 `/tmp/teamground-final-qa/`이며 저장소 CI 테스트 결과를 본인 실행으로 합산하지 않는다.

최종 실행 명령은 각 `node /tmp/teamground-final-qa/{audit,modal,webkit-modal,cross,calendar-cold,final-extras}.cjs`이며 6개 모두 exit 0이다. 최초 calendar-cold의 종료 시각 없는 접근 이름 선택자와 reload 304 응답을 실패로 분류한 검사 오류를 수정한 뒤 새 context로 재실행했다. 두 오류는 제품 결함이 아니었다.

## 자동 접근성 검사

Chromium 159.0.8154.6 + axe-core 4.14.0의 기본 전체 규칙으로 11개 화면(AUTH/INV, TEAM 4개, CAL, SCH 3개, VID)을 검사해 위반 0이었다. 영상 상세의 `video-caption` incomplete 1개는 자동 통과가 아니며 [03 접근성 보고서](03-accessibility.md)의 샘플별 수동 판정을 따른다.

초대, 개인 일정 추가, 영상 추가·수정, 일정 확정 5개 모달도 axe 위반 0이다. 이 결과는 전체 WCAG 준수나 실제 보조기술 청취 인증이 아니다.

## 재배치·달력 검사

11개 화면 각각 320/390/640/1440 CSS px에서 `documentElement.scrollWidth <= innerWidth`였다. 5개 모달은 320/640에서 viewport 안에 있고 모달 자체의 가로 넘침도 없었다. 640 검사는 실제 200% 확대 검사와 구분한다.

320/390 팀 달력에서 빈 날짜에 Enter → 빈 상태, 일정이 있는 날짜에 Space → 전체 제목·19:00–21:00·가능 4명·영상 1 표시를 확인했다. Tab 후 Shift+Tab으로 선택일에 돌아왔으며 선택일의 흰 inset outline을 캡처로 확인했다. 일정 클릭으로 원래 회차 상세에 도착했다. 1440에서는 기존 칸별 일정 표시와 회차 이동을 확인했다. 모든 개인 일정/긴 제목/월 이동 조합의 상세 회귀는 달력 담당의 별도 검사 결과를 참고한다.

fullPage 캡처에는 스크롤된 모바일 화면의 fixed 건너뛰기 링크가 중간에 찍히는 현상이 있었다. 캡처 직전 320/390에서 링크 rect.top=-100, focus=false, 실제 초점은 선택일 버튼, scrollY=450/269였다. 같은 시점의 일반 viewport 캡처에서는 링크가 노출되지 않아 fullPage 캡처 현상으로 구분했다. 실제 화면 리뷰에는 `viewport-{320,390}.png`와 달력 요소 캡처를 함께 사용한다.

## 키보드 모달 검사

Chromium 5개 모달에서 Tab 16회 내부 유지, Escape 닫기, 트리거 초점 복귀가 통과했다. WebKit 27.2에서는 각 모달에서 Tab 8회 + Shift+Tab 8회 내부 유지, Escape, 트리거 초점 복귀가 통과했다. WebKit 스크립트는 axe를 실행하지 않으므로 그 결과의 빈 violations 필드는 axe 통과 근거로 사용하지 않는다. 검사 도중 모달 내부로 초점을 강제로 돌려 trap을 보정하지 않았다.

## 세 브라우저 핵심 흐름 검사

Chromium 159.0.8154.6, Firefox 159.0, Playwright WebKit 27.2 각각 새 context에서 로그인 → 발표 예시 → 추천 → 4개 회차 확정 → 로컬 영상 추가 → 영상 상세 → 댓글 등록 → 새로고침 후 유지가 통과했다. video.play 성공, currentTime 증가 및 paused=false를 확인했다. 댓글 미저장 상태에서 이탈 취소 시 본문 유지, 320px 영상 상세의 가로 넘침 없음도 확인했다. 세 브라우저 모두 pageerror 0. WebKit을 실제 Safari 앱 결과로 표현하지 않는다.

## Cold 직접 URL·lazy 로딩 검사

320/390/1440 각각 비로그인 보호된 팀 URL로 시작해 로그인 returnTo 복원과 팀 달력을 확인했다. 로그인 상태만 새 context에 전달하고 영상 상세 URL에 직접 접근해 플레이어·피드백 입력을 표시하고 reload 후에도 유지했다. 스크립트 응답은 새 context에서 200, reload의 정상 캐시 재검증에서 304였고 실패 응답 및 pageerror가 없었다.

샘플 video의 `aria-describedby="demo-video-description"`와 노출된 “8초 무음 재생 테스트 영상” 설명을 직접 확인했다. 팀 생성 초안을 작성한 뒤 DemoToolsContent 청크 요청을 강제로 차단했을 때 로컬 오류 안내가 나타나고 초안이 유지됐다. 그 상태에서 내 일정으로 이탈하면 기존 미저장 확인이 열렸으며 계속 작성 후에도 초안이 유지됐다. 의도적으로 유발한 청크 로드 오류는 정상 흐름의 pageerror 결과와 분리했다. 데모 도구를 닫아도 mounted 상태를 유지하는 구현은 루트 소스 리뷰로 확인했으며, 열고 닫는 중의 모든 비동기 경합을 별도 실험한 것으로 표현하지 않는다.

## 소스 동일성과 산출물

최종 production 빌드 전과 위 검사 후 34개 src 파일(추가 파일 포함, `.DS_Store` 제외)의 git blob hash가 모두 같았다. 경로→blob JSON `/tmp/teamground-final-qa/source-before.json`의 SHA-256은 `5555e7662e80479e4e1c6737c2171b6e690b4c0d3f45650277f2f19f84805338`이다. 코드 통합 커밋 `ce67a8f75a1137dfffeffcafc6cd97e76e2acf05`의 동일 34개 src blob과 모두 일치함을 `git rev-parse <SHA>:<path>`로 확인했다.

캡처: `/tmp/teamground-final-qa/team-{320,390,1440}.png`, `/tmp/teamground-final-qa/calendar-{320,390,1440}.png`. JSON/로그/임시 스크립트는 같은 디렉터리에 있으며 영구 보존을 보장하지 않으므로 주요 결과는 이 문서에 기록했다. QA는 커밋·푸시를 하지 않고 통합 담당에게 문서를 전달했다.

실제 Safari 앱, 브라우저 native 200% 확대, VoiceOver 청취의 환경 차단 및 정확한 재검증 조건은 03 보고서에 있다. 현재 실행 범위에서 미해결 제품 결함은 발견하지 않았다. 실제 백엔드·메일·OAuth 및 사용자 등록 영상의 접근성 정책은 이번 FE mock 검사 범위가 아니다.
