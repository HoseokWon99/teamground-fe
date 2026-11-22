# 영상 파일 업로드 운영 배포·검증

사용자 승인 범위: FE/BE 기능 PR 머지, 운영 배포, 실제 AWS S3 업로드 및 브라우저 재생 검증. 공통 정책은 PM `docs/video-file-upload.md`를 따른다.

## 배포 대상과 상태

- 운영 URL: https://app.jointeamground.com
- API: https://jointeamground.com/api/v1
- FE PR #14 머지 SHA: `6f3a71bdd3ad779b38b345f8ac5eccd474bd7770`.
- Vercel team `team_er4AXNezYY2C1ysS4HHRmeZQ`, project `prj_nRNXuR2Wnj36vjHcTHvQign3eWgC`.
- 배포 전 원래 설정: `VERCEL_ACTIONS_ENABLED=false`, Git 자동 배포 비활성.
- Vercel 플러그인 프로젝트 조회는 403. 기존 GitHub Actions의 main quality 성공 → production workflow_run 경로를 사용한다. `vercel-production`의 현재 사용자 reviewer 승인을 정상 처리하며 환경 보호 규칙을 변경하지 않는다.
- main CI [45041242356](https://github.com/HoseokWon99/teamground-fe/actions/runs/45041242356): 타입/단위/빌드 및 Chromium·Firefox·WebKit 전체 4개 job 성공.
- 운영 배포 [45041471856](https://github.com/HoseokWon99/teamground-fe/actions/runs/45041471856), attempt 2 성공. main SHA를 checkout 전/배포 직전 재확인한 기존 파이프라인을 사용했다.
- 고유 배포: https://teamground-g94cplc8q-hoseoks-projects-76438827.vercel.app
- 2026-11-23 01:18:03 KST: CLI `Ready in 8s`, `Aliased https://app.jointeamground.com`. deploy job 41초.
- 배포 완료 후 `VERCEL_ACTIONS_ENABLED=false` 복원 확인. Git 자동 배포 비활성 유지.
- 실제 운영 `/login` HTTP 200, 번들 `index-Bcr_jBVL.js`, `index-BtqLsmbZ.css` 확인. Vercel API READY 원문은 플러그인 403으로 조회하지 못했으며, CLI 완료·alias 로그와 실제 도메인 응답을 근거로 한다.
- BE revision 16 롤링 완료 후 실제 운영 QA를 실행했다. 업로드·재생은 통과했으나 삭제 후 화면 이동 결함을 발견하여 아래 수정/재검증을 진행한다.

## 실제 운영 검증

`scripts/verify-production-video-upload.mjs`는 localhost 전용 기존 검증기를 변경하지 않은 별도 운영 전용 스크립트다. 운영 FE 호스트를 고정하고, chmod600 fixture 파일과 승인된 합성 팀/회차 ID를 요구한다. 예약 `.test` 계정만 사용하며 비밀번호·쿠키·서명 URL 원문을 출력하지 않는다. API를 모킹하거나 운영 사용자 데이터를 사용하지 않는다.

검증 범위: 파일 선택/업로드 진행률, 실제 multipart 업로드, AWS S3 서명 재생과 currentTime 증가, unsigned 객체 403, signed Range 206, 새로고침 재생, 제목 수정, 파일 교체 후 새 객체 재생, 피드백 유지와 원본 교체 잠금, 다른 멤버 편집 비노출/API403, 1440px·390px 캡처와 가로 넘침, 생성 영상·피드백 삭제, 세션 로그아웃.

스크린샷/비밀정보 없는 JSON 결과는 `output/playwright/video-production/`에 저장한다. 합성 계정·팀·회차와 S3 잔여 객체 최종 정리는 BE 담당자가 별도로 확인한다.

### 실행 결과와 삭제 후 이동 결함

- 실제 브라우저 업로드 진행률 0→100 확인. S3 host는 `teamground-dev-infra-mediabucket-sancu1cpbwsc.s3.ap-northeast-2.amazonaws.com`.
- 비서명 객체 GET 403, 서명 Range GET 206, `video/mp4`, `bytes 0-1023/3051` 확인. 브라우저 최초 재생·원본 교체 후 재생·새로고침 재생에서 currentTime이 증가했다.
- 제목 수정, 새 object key로 원본 교체, 피드백 새로고침 유지, 피드백 이후 원본 교체 잠금, 다른 멤버 편집 UI 비노출 및 실제 API 403 통과. 1440px/390px 업로드·재생 캡처 생성, 가로 넘침 없음.
- 첫 스크립트는 편집 닫기의 확인 모달을 처리하지 못해 삭제 단계에서 멈췄다. 해당 스크립트를 보완했다.
- 두 번째 실행에서 실제 DELETE는 성공했으나 빈 피드백 입력에도 “저장하지 않은 내용을 버릴까요?” 모달이 나타나 회차 이동을 차단했다. 이를 스크립트로 우회해 통과 처리하지 않았다. BE는 객체 delete marker 반영을 별도 확인했다.
- 원인: DELETE 성공 시 `action.run`의 busy가 아직 true여서 `useUnsaved(Boolean(body), action.busy)`의 저장 중 entry가 성공 후 navigate까지 차단한다.
- 수정: 성공 DELETE 직후 `clearFeedbackDirty()`로 해당 entry를 동기 해제한 뒤 회차로 이동한다. 실패/취소 시 해제하지 않아 피드백 초안을 보존한다. 삭제 확인 문구에 업로드 파일 삭제 및 작성 중인 피드백 소실을 명시했다.
- 회귀 검증은 **로컬 API 모킹 테스트**이며 실제 운영 S3 결과와 구분한다. 빈/입력된 피드백 각각 취소 시 요청 없음, 503 실패 시 초안 유지, 실패 후 이탈 경고 유지, 성공 204 뒤 추가 경고 없는 회차 이동을 검증한다. 수정 전 빈 입력 테스트가 동일한 URL 대기로 실패했고, 수정 후 세 브라우저의 6개 회귀 검증이 통과했다.
- `pnpm typecheck`, `pnpm build`, `node --check scripts/verify-production-video-upload.mjs` 통과. `pnpm exec playwright test tests/e2e/video-upload.spec.ts`: Chromium·Firefox·WebKit 전체 12개 통과.

현재 완료 범위는 첫 운영 배포 및 업로드/재생 검증, 삭제 이동 수정과 로컬 회귀 검증이다. 수정의 main 머지·운영 재배포 후 전체 운영 QA와 BE 최종 데이터/객체 정리를 다시 확인해야 한다. 전체 운영 검증 PASS로 보고하지 않는다.
