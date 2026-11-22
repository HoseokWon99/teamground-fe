# 책임자 리뷰 · 검증 자동화와 브라우저/접근성

리뷰어: 루트 · 2026-11-22

## 검토 기준

- PR 1~3의 main 머지 결과와 동일한 코드에서 후속 작업을 시작한다.
- CI는 Node 22·pnpm 10·frozen lockfile, 타입 검사·단위 테스트·빌드와 실제 브라우저 검사를 실행한다. read-only 권한과 비밀정보 없는 fork-safe 구성을 사용한다.
- 브라우저 회귀는 Vite 개발 모듈 계측 대신 production preview의 사용자 흐름을 검사한다. 이전 개발 중 HMR 계측 불일치를 자동화에서 반복하지 않도록 한다.
- 실제 접근성·reflow·호환성 결함을 재현하고 해당 범위만 수정한다. 단순 테스트 통과를 위한 axe suppression은 사용하지 않는다.
- Playwright WebKit은 실제 Safari 실행으로, axe/ARIA 검사는 실제 스크린리더 검증으로 표현하지 않는다.

## 설계 승인

단위 테스트는 src로 수집 범위를 한정하여 E2E가 Vitest에 섞이지 않게 한다. Playwright 브라우저 3종에 공통 사용자 흐름을 적용하고 Chromium에서 접근성 검사를 추가한다. 테스트 아티팩트는 기존 ignored dist 하위에 보관하여 사용자 .gitignore 변경을 건드리지 않는다. 루트가 최종 diff·실제 실행 결과·GitHub 체크를 검토한다.

## 최종 검증·승인

소스 및 로컬 검증 리뷰 승인. 최종 원격 HEAD와 체크 결과 및 Ready 전환 여부는 PR 본문 승인 기록에서 확인한다.

- CI 담당 실행: 앱/E2E 타입 검사, 단위 테스트 74개, production 빌드, Chromium·Firefox·WebKit E2E 13개 통과. WebKit 메뉴와 영상 추가 저장·수정 Escape의 opener 초점 복원을 포함한다.
- 독립 QA: 11개 화면과 주요 모달 5개의 axe 검사에서 위반 0, Chromium 모달 키보드 검사 통과. Firefox/WebKit 주요 흐름 재검증 통과. WebKit 초대 모달 추가 Tab 검사에서 배경으로 초점이 이동하는 후보를 발견해 원인을 확인 중이다. 상세 조건과 한계는 04 기록에 남긴다.
- 소스 검토: 보조 문구 대비, 달력의 이전/다음 달 opacity 제거와 날짜 이름, 아바타 상대 휘도 기반 검정/흰색 선택을 확인했다. 공개 화면 main과 연습 aside 이름도 확인했다.
- 공통 Button은 WebKit의 마우스 클릭 시 초점 미설정에 대응하여 native button 클릭에서만 preventScroll 초점을 준 뒤 기존 콜백을 호출한다. asChild 링크 동작은 유지하며 실제 모달 회귀 검사로 확인했다.
- 루트는 1440px 팀 화면과 390px 모바일 메뉴 스크린샷을 직접 확인했다. 기존 배치와 녹색 계열 디자인이 유지되고 문구 대비가 개선됐다. 좁은 달력 칸의 시간/제목 줄바꿈은 후속 사용성 개선 후보다.
- 백엔드 코드·계약·네트워크 연동 변경 없음. 사용자 기존 dirty 파일은 제외한다.

## 추가 리뷰 · 초대 모달 키보드 회귀

독립 QA에서 WebKit 초대 모달의 Tab 초점이 배경으로 빠지는 사례를 발견했다. 단일 페이지·headed 실행에서도 재현하여 단순 자동화 환경 문제와 구분했다. React input autoFocus가 Radix FocusScope의 초점 추적 준비보다 먼저 실행되어 초기 초점이 기록되지 않는 것이 원인이었다. 초대 입력의 autoFocus를 제거하고 Modal의 optional onOpenAutoFocus에서 RHF setFocus('email')을 실행하도록 변경했다. 초기 이메일 초점을 유지하며 별도 키보드 trap 구현은 추가하지 않는다.

루트는 두 소스 파일의 최소 변경과 새 회귀 테스트를 검토했다. 수정 전 WebKit 실패를 실제 확보했고, 새 테스트는 이메일 초기 초점 → Tab/Shift+Tab 각 12회 모달 내부 유지 → Escape 후 opener 복원을 브라우저 3종에서 검사한다. 최종 자동 브라우저 검사 수는 16개다.

첫 Draft HEAD `d0bc641ebdffdd8c2d1d355c5c763fe23b368f93`의 GitHub 타입·단위·빌드, Chromium·Firefox·WebKit, Vercel·Preview Comments가 모두 성공했다. 추가 초대 수정이 포함된 최종 HEAD의 결과는 별도로 확인한다. [PR #4](https://github.com/HoseokWon99/teamground-fe/pull/4)

추가 수정 `1a64d73` 및 회귀 `8de110c`가 포함된 소스에서 타입 검사·단위 74개·빌드·E2E 16개가 모두 통과했다. 독립 QA도 새 production 빌드에서 11화면·5모달 axe 위반 0, Chromium 모달 키보드 검사 및 WebKit 5모달 양방향 Tab·Escape·초점 복원, Firefox/WebKit 핵심 흐름을 통과했다. 루트는 앱 코드·영구 테스트 diff와 서로 독립적인 검증 근거를 검토하여 소스를 승인했다.

최종 문서가 포함된 HEAD의 원격 체크 성공을 확인한 뒤 PR을 Ready로 전환한다. 자기 자신 커밋 SHA를 문서에 포함할 수 없으므로 **승인한 최종 HEAD SHA·체크 링크·전환 결과는 PR 본문에 기록**한다. 새 PR #4의 머지는 이번 요청에 포함하지 않는다.
