# 영상 파일 업로드 구현 및 검증

2026-11-22. 공통 계약: PM `docs/video-file-upload.md`.

## 구현

- 서버/데모 등록·수정에서 URL 입력과 데모 URL 선택 제거. MP4/WebM, 최대 100 MiB, 빈 파일 및 확장자/MIME 검증.
- 서버는 기존 API base와 쿠키 세션·CSRF·If-Match를 사용하는 multipart XHR. Content-Type boundary는 브라우저가 생성한다. OS가 MIME을 제공하지 않으면 확장자에 따른 MIME을 지정한다.
- 진행률, 서버 저장 중 표시, 중복 저장/편집 닫기 방지, 입력 보존, 취소, 10분 전송 시간 제한. 중단 시 최신 기록 조회 요청 및 사용자 확인 전 재시도 잠금. 서버 저장 완료와 취소 경합을 성공/실패로 단정하지 않는다.
- 제목·회차 이동 JSON PATCH 유지. 파일 교체와 회차 이동은 별도 저장. 피드백 이력/취소 회차의 원본 잠금 유지. 재생 오류의 다시 시도는 최신 상세 조회 및 플레이어 재생성을 수행한다.
- 데모는 IndexedDB에 파일을 저장하고 object URL 수명을 관리한다. 새로고침 후 재생 복원. 데모 저장을 S3 업로드라고 표시하지 않는다.

## 실행한 검증

- `pnpm typecheck`: 통과.
- `pnpm test`: 8개 파일, 101개 테스트 통과.
- `pnpm build`: 통과. 기존 Zod 의존성의 Rollup 주석 경고만 발생.
- `pnpm exec playwright test --project=chromium`: 48개 통과. 기존 전체 브라우저 회귀 및 신규 파일 업로드 검증. 추천→확정→로컬 파일 선택→실재생→피드백→새로고침, 초대·역할 제한·좁은 화면·접근성 검사를 포함한다.
- `tests/e2e/video-upload.spec.ts`: **API 응답을 모킹한** UI/요청 계약 검증. 잘못된 파일 차단, 503 후 파일/제목 유지, multipart/CSRF, 중복 제출, 네트워크 단절 후 확인 전 재시도 잠금, 제목 JSON/파일 multipart PATCH와 If-Match, 원본 교체 잠금.

## 실제 로컬 FE–BE–S3 호환 통합

BE의 격리된 로컬 PostgreSQL fixture와 S3Mock 실행 후:

```sh
TEAMGROUND_API_TARGET=http://localhost:18080 pnpm dev --host localhost --port 5174 --strictPort
node scripts/verify-video-upload.mjs
```

스크립트는 localhost만 허용하며 BE 로컬 검증용 계정과 fixture ID를 사용한다. 운영 계정/세션/자격 증명은 포함하지 않는다. 파일은 BE fixture가 생성한 `/tmp/teamground-video-fixture.mp4`이며 `TEAMGROUND_VIDEO_FILE`로 변경할 수 있다.

실제 브라우저에서 로그인→파일 업로드→S3Mock의 서명 URL에서 동영상 재생→새로고침 후 재생→제목 수정→파일 교체→피드백 저장→새로고침 후 피드백→피드백 이후 파일 교체 잠금→다른 멤버의 편집 UI 비노출 및 실제 API 403을 확인했다. 1440px와 390px 화면에서 가로 넘침이 없었다. 최종 실행 PASS.

스크린샷은 `output/video-upload/{upload-desktop,upload-mobile,playback-desktop,playback-mobile}.png`로 생성하며 Git에는 포함하지 않는다.

S3Mock은 AWS 서명/ACL 정책을 강제하는 보안 환경이 아니다. AWS 실제 비공개 버킷/IAM 정책, 운영 배포, 100 MiB 전체 네트워크 전송, 10분 실제 경과 timeout은 실행하지 않았다. 용량 경계는 단위 테스트에서 검증했다. 전송 중단 흐름은 브라우저 네트워크 실패로 검증했으며 취소와 서버 커밋의 타이밍별 경합을 전부 재현한 것은 아니다.

## WebKit 저장 호환 수정

첫 CI에서 WebKit의 데모 파일 저장이 실패했다. 로컬 WebKit에서도 IndexedDB에 File/Blob을 직접 저장하면 `UnknownError: Error preparing Blob/File data to be stored in object store`가 발생했고, ArrayBuffer는 정상 저장됨을 확인했다. 데모 저장 형식을 파일 바이트(ArrayBuffer)+MIME으로 바꾸고 읽을 때 Blob으로 복원한다. 이전 Blob 저장값의 읽기 호환은 유지한다. 변환 중에는 파일 크기만큼의 추가 메모리가 일시적으로 필요하다(최대 100 MiB). 회귀 시나리오는 새로고침 후 피드백뿐 아니라 저장된 파일의 실제 재생도 다시 검증한다.

수정 후 `pnpm typecheck`, `pnpm build` 통과. `pnpm exec playwright test --project=webkit --project=chromium --project=firefox tests/e2e/journeys.spec.ts --grep '관리자가'`는 세 브라우저 모두 통과했고, `pnpm exec playwright test --project=webkit` 전체 40개도 통과했다.
