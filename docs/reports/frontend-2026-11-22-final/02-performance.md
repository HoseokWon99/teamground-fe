# 초기 번들 및 로딩 회귀 검증

검증일: 2026-11-22. 기준 소스: PR #4가 합쳐진 `afd195c`.

## production 비교

기준 소스는 `git archive`로 별도 임시 디렉터리에 풀고 동일 설치 의존성을 사용했다. 기준·변경 모두 `NODE_ENV=production`으로 빌드했다. Chromium 새 페이지에서 `/login`을 열어 로그인 버튼 표시 및 networkidle까지 요청한 JS URL을 수집했다. raw는 해당 파일 byte 수, gzip은 각 파일을 Node `gzipSync` 기본 옵션으로 압축한 byte 합계다. 로컬 preview가 실제 gzip 전송을 제공한다는 의미는 아니며 HTTP 헤더·TLS 비용은 제외한다.

| 측정 | 기준 raw / gzip (B) | 변경 raw / gzip (B) | 감소 raw / gzip |
|---|---:|---:|---:|
| entry JS | 529,528 / 167,443 | 475,479 / 151,403 | 10.21% / 9.58% |
| 최초 로그인에 요청한 전체 JS | 537,773 / 171,436 | 486,146 / 156,649 | 9.60% / 8.63% |

기준 로그인 요청: entry, auth pages, use-load, arrow-right 4개. 변경: entry, auth pages, use-load, arrow-right, users, calendar-days 6개. 요청 수는 증가하지만 총 전송 대상 JS는 줄었다. 로그인 최초 로딩에는 service, recommendation, WorkspaceLayout, DemoToolsContent를 요청하지 않으며 E2E에서 이를 확인한다. entry의 500 kB 경고는 실제 크기 감소로 해소했다. manualChunks나 경고 한도 변경은 없다.

실행 환경의 `NODE_ENV=development`를 그대로 받은 초기 관찰에서는 기존 entry가 763,960 B였고 개발용 React가 포함됐다. 이것을 최적화 전후 수치로 사용하지 않았다. `build`를 `tsc -b && NODE_ENV=production vite build`로 변경해 macOS/Linux 셸과 GitHub Linux CI에서 production을 명시한다. 새 의존성은 없다. 기준·변경 production 결과에서 `react-dom-client.development.js` 런타임 표식이 없음을 확인했다. Zod 패키지 자체의 PURE 주석 관련 Rollup 안내 2건은 남으며 빌드 성공과 무관하다.

## 변경과 보존한 동작

- 저장소의 classic Zod 선언을 설치된 `zod/mini`의 check/optional/nullable API로 동등 변환했다. 동기 복원, 원본 보존, 버전 검사, 참조 정합성, normalization은 유지한다.
- 작업공간 레이아웃은 인증 후 lazy 로드한다. 데모 도구는 최초 펼침 시 로드하며 이후 접혀도 mounted 상태를 유지한다. 도구 chunk 오류는 로컬 boundary에서 처리하여 작성 폼과 이탈 가드를 보존한다.
- 로그인/초대 서비스는 실제 동작 시 가져온다. import 실패에는 연결 확인·새로고침 복구를 안내한다. import 대기 중 취소된 로그인은 세션을 만들지 않는다.
- 추천 계산은 추천/확정 요청 시 가져오며 import 완료 후 현재 상태·권한을 검증한다. 중복 요청 coalescing은 유지한다.
- 로컬 8초 무음 샘플 영상의 시각 설명을 플레이어와 aria-describedby로 연결했다. 사용자 영상에는 해당 설명을 붙이지 않는다.

## 검증

- `pnpm typecheck`: 통과.
- `pnpm test`: 74/74 통과. 저장소 복원 39개, 추천/권한·일관성 17개, 로그인 취소 및 기존 유틸 회귀 포함.
- `pnpm build`: 통과, production entry 475.48 kB / gzip 151.40 kB.
- `pnpm exec playwright test tests/e2e/loading.spec.ts --workers=3`: Chromium/Firefox/WebKit 21/21 통과. 초기 요청 경계, cold 링크 로그인·복원, 지연 chunk fallback, 서비스 실패·새로고침 복구, import 중 로그인 취소, 미저장 이탈 취소·폐기, 데모 도구 chunk 실패 시 폼 보존.
- 최종 전체 `pnpm exec playwright test --workers=3`: 55/58 통과. 나머지 3건은 새 모바일 agenda 날짜 제목이 기존 월 제목 부분일치 locator에 함께 잡힌 테스트 오류였다. 월 제목에 `exact: true`를 명시하고 해당 3개를 재검증했다. 최종 원격 CI 전체 결과는 종합 보고서/PR에서 확인한다.
- classic/mini 차등 검사: Vite `ssrLoadModule`로 기준 schema와 변경 schema를 함께 로드하고 `validPersistedData` 및 `normalizePersistedData` 결과를 비교했다. 추천까지 채운 seed의 290개 경로에 undefined/null/NaN/Infinity/빈 문자열/false/0/-1/빈 객체/빈 배열/잘못된 날짜를 각각 대입하고, 최상위 비정상값·정상 seed·optional 누락·unknown key를 추가한 3,198건 모두 동일했다. 이 검사는 임시 실행이며 별도 제품 파일을 남기지 않았다.

성능 수치는 로컬 production 정적 자산 비교이며 실제 배포의 LCP/INP나 모바일 기기 CPU 벤치마크는 아니다. 백엔드·외부 OAuth·구글 캘린더 API·실제 업로드는 이 검증 범위에 없다.
