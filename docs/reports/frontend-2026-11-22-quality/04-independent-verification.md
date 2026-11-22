# 수정 후 독립 브라우저 검증

검증일: 2026-11-22 · 담당: fe_quality_audit

## 실행 환경과 독립성

CI 담당의 Playwright 1.65.1, axe-core 4.14.0 의존성을 사용했다. 브라우저 설치는 `pnpm exec playwright install firefox webkit`가 exit 0으로 완료됐고 Firefox 159.0 / WebKit 27.2가 실행됐다. WebKit은 Playwright 엔진이며 실제 Safari 앱 검증이 아니다. 실제 백엔드·메일·OAuth 요청은 없었으며 독립 브라우저 저장소의 mock 지우 계정을 사용했다.

이번 QA가 `/tmp/teamground-quality-qa/`에 새로 작성한 audit/modal/cross 스크립트로 직접 실행했다. 과거 보고서의 회귀 스크립트를 재사용하지 않았다. CI 담당의 영구 E2E 결과도 이 보고서의 본인 실행으로 합산하지 않는다. QA가 수정한 저장소 파일은 02/04 보고서뿐이다.

UI 첫 freeze 이후 모든 `src/` 파일의 git blob hash를 저장하고 별도 production 빌드 `/tmp/teamground-quality-final`, preview `http://127.0.0.1:4185`를 사용했다. 최종 소스 불변/커밋 연계는 아래 마감 기록에 추가한다.

## 자동 접근성 및 재배치

- Chromium: 11개 화면의 axe 기본 전체 규칙에서 위반 0. 색 대비와 WCAG A/AA 자동 규칙뿐 아니라 이전 공개 main/복수 aside best-practice 위반도 사라졌다. VID-01의 `video-caption` 1개는 `incomplete`(수동 판단 필요)로 남았으며 자동 통과로 간주하지 않는다. 로컬 추상 영상의 자막 필요성 전체 판정은 이번 감사에서 완료하지 않았다.
- 초대·개인 일정·영상 추가·영상 수정·일정 확정 5개 모달에서도 axe 위반 0.
- 11개 화면에서 320/640/1440 CSS px 각각 `documentElement.scrollWidth <= innerWidth`. 5개 모달은 320/640에서 경계가 viewport 안에 있고 내부 가로 넘침이 없다.
- 320px 로그인·조율 화면 캡처를 직접 확인하여 정보·입력·버튼의 가로 잘림이 없음을 확인했다. 모든 화면의 모든 시각적 조합을 수작업 인증한 것은 아니다.
- 640 CSS px 검사는 1280px에서 200% 확대할 때의 유효 너비를 참고한 **재배치 대체 검사**다. 별도 팀 홈에서 `documentElement.style.zoom = '2'`도 실행하고 가로 overflow 없음(1280=1280)을 관측했다. CSS zoom은 미디어 쿼리 동작이 실제 브라우저 확대와 달라, 실제 브라우저 200% 확대 검증 완료로 표현하지 않는다.

## Firefox·WebKit 핵심 흐름

두 브라우저 각각 새 context에서 아래 전체 흐름을 직접 실행했고 production 소스 변경 전후 각각 통과했다.

1. 지우 로그인 → 발표 예시 채우기 → 추천 → 첫 후보 확정 모달 → 4회차 확정.
2. 생성된 회차에 브라우저별 제목의 로컬 샘플 영상 추가 → 영상 상세 이동.
3. 피드백 등록 → 새로고침 → 같은 영상과 본문 유지 확인.
4. 로컬 video.play 성공 및 currentTime 증가/paused false 확인.
5. 새 피드백 입력 → 내 팀 링크 이탈 시 공통 확인 → 계속 작성 → 입력 유지.
6. 320 CSS px 영상 상세의 문서 가로 넘침 없음.

두 브라우저 모두 pageerror 0. 첫 시도의 빈 회차에서는 영상 추가 버튼이 2개라 strict locator가 실패했으며, 상단 버튼을 명확히 지정한 뒤 새 context부터 전체 재실행했다. 이는 검사 선택자 오류였다.

## 키보드와 추가 WebKit 결함

Chromium의 5개 모달은 Tab 16회 내부 유지, Escape 닫기와 원래 버튼 초점 복귀가 통과했다. WebKit 추가 감사에서는 **초대 모달의 첫 입력 autoFocus 이후 Tab이 배경으로 탈출**하는 현상을 발견해 루트/UI 담당에게 전달했다. axe 없는 단일 fresh page, 화면 크기 변경 없음, 로그인 returnTo로 직접 멤버 페이지 접근, 열림 후 700ms 대기, bringToFront, headed 모드에서도 재현했다.

실제 순서: email → Radix focus guard → body → guard → 배경 팀 전환 select → 배경 초대 링크 input → 데모 도구 summary. focusin/out 로그와 document.hasFocus true를 확인했으므로 단순 관찰 타이밍이나 크기 변경으로 설명하지 않았다. dialog는 1개였고 내부 진단에서 trapped/loop true, paused false였다. 진단용으로 닫기 버튼과 입력을 다시 focus한 뒤에는 내부에 유지되어 초기 자동 초점과 trap 등록 순서가 원인 후보가 되었다. 이 강제 초점 검사는 제품 통과 근거로 사용하지 않는다.

초대의 HTML autoFocus를 제거하고 모달 `onOpenAutoFocus`에서 입력 초점을 지정하도록 UI 담당이 수정했다. 아래 마감 기록의 강제 focus 없는 재검증으로 해결을 확인했다.

## 시각 리뷰와 한계

루트가 요청한 첫 freeze production 캡처 `final-team1440.png`(1440×1000 팀 홈), `final-menu390.png`(390×844 열린 모바일 메뉴)를 `/tmp/teamground-quality-qa/`에 전달했다. 루트는 기존 디자인과 가독성 유지에 대한 시각 리뷰를 완료했다. 캡처와 임시 JSON/스크립트는 영구 보존을 보장하지 않으므로 핵심 관찰을 본문에 기록한다.

VoiceOver/NVDA 등의 실제 화면읽기기 청취는 실행하지 않았다. axe·landmark·ARIA 구조 검사와 키보드 결과를 화면읽기기 검증 완료로 설명하지 않는다. 실제 Safari, 실제 브라우저 확대, 모든 상태/권한/오류 조합, 전체 WCAG 준수 인증, 실제 외부 서비스 연동은 미검증이다. CI와 타입·단위 테스트 결과는 01 자동화 보고서와 실제 체크를 별도로 참조한다.

## 마감 기록 · 최종 수정 후

- 최종 검증 production: `pnpm exec vite build --outDir /tmp/teamground-quality-final2` 성공, preview `http://127.0.0.1:4186`. 이전과 같은 Zod 주석/번들 크기 경고는 남는다.
- `final2-audit.cjs`: 11개 화면 전체 axe 위반 0, 320/640/1440 가로 넘침 없음. 위 `video-caption` 수동 판단 항목만 별도 유지.
- `final2-modal.cjs`: Chromium 5개 모달 axe 위반 0, Tab 16회 내부 유지, Escape 닫기/원래 버튼 복귀 통과.
- `final2-webkit-modal.cjs`: WebKit 5개 모달 각각 **Tab 8회 + Shift+Tab 8회** 내부 유지, Escape 닫기/원래 버튼 복귀 통과. 앱 DOM을 강제로 focus하지 않았으며 axe 분석도 이 스크립트에서는 실행하지 않았다. 이 WebKit 결과를 axe 0 근거로 혼용하지 않는다.
- `final2-cross.cjs`: Firefox/WebKit 핵심 전체 흐름 재실행 통과, pageerror 0. 저장된 회차·영상·피드백은 reload 뒤 유지됐다.
- `extras.cjs`: Chromium 320px 모바일 메뉴와 미저장 이탈 모달 추가 검사. axe 위반 0, Tab/Shift+Tab 각각 6회 유지, Escape 닫기. 두 모달 모두 left 16/right 304, clientWidth=scrollWidth=288. 초기 이탈 링크 locator 오류를 실제 취소 버튼으로 고친 뒤 별도 clean 실행 exit 0을 확인했다.
- 최종 검증 전후 31개 추적 대상 `src/` 파일의 blob hash가 같고 코드 커밋 `1a64d73e8ce476f3e945234d957d6eeca114a0fe` 및 이후 문서 HEAD의 blob과 일치한다. `.DS_Store`는 소스 검증 대상에서 제외했다. 경로→git blob 맵을 정렬한 JSON의 SHA-256은 `997d500b70df6b5064926b39375e6549e69c129a6311d6b28fae2edc5c6a0713`이다. 소스 검증이 HEAD 변경으로 끊기지 않도록 문서 커밋과 코드 불변을 구분했다.

이번 자동화·키보드 범위의 미해결 재현 결함은 없다. 실제 브라우저 200% 확대, 화면읽기기 실사용, 자막 필요성 수동 판단과 전체 WCAG 준수 판정은 여전히 완료하지 않았다. QA는 커밋/푸시하지 않았으며 최종 PR/HEAD/CI 승인은 루트와 통합 담당의 책임이다.
