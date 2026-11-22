# 3차 · 로컬 저장 복원과 실패 안내

## 위임과 범위

루트 에이전트가 FE 저장소 전담 구현자 `fe_persistence`에 저장·복원 검증, reactive 경고, 복구 UI와 단위 검증을 위임했다. 작업 브랜치는 `codex/fe-local-hardening`이다. 공통 화면 통합은 별도 `fe_accessibility`, 실제 브라우저 검증은 독립 `fe_hardening_qa`가 담당한다. 백엔드·배포·마이그레이션은 변경하지 않는다.

## 확인한 문제와 변경

- 기존 문자열 스키마는 실재하지 않는 날짜, 없는 사용자 세션, 끊어진 회차/영상/댓글 참조와 안전하지 않은 URL을 복원했다. 현재 버전 1 envelope, 날짜·시각·회차 번호·ID 중복·팀 소속 관계·추천 날짜와 행 수 등을 복원 전에 검사한다. 일반 영상은 http/https, 로컬 샘플은 `/demo/rehearsal.webm`만 허용한다.
- Zustand의 기본 버전 불일치 처리는 콘솔 경고만 남겼다. 버전 누락·타입 오류·다른 버전을 명시적으로 거절하고 사용자에게 안내한다.
- 잘못된 원본 또는 읽기 실패 후 메모리 상태 변경이 원본을 덮어쓰지 않도록 해당 실행의 자동 쓰기를 차단한다. 기존 키를 자동 삭제하거나 백업/마이그레이션하지 않는다.
- 저장소 부재, 접근 getter/read 오류, quota/security 쓰기 오류에도 메모리 작업을 이어간다. 쓰기 이후 갱신되는 전역 문자열 대신 별도 Zustand 구독으로 사용자 안내를 즉시 전달한다. 기존 비 React import 호환 문자열은 유지한다.
- `StorageNotice`는 로그인 화면에도 통합되며, 명시적 확인 후 현재 실행 데이터를 저장하는 복구 동작을 제공한다. 확인문은 기존 원본 대체·복구 불가·미저장 폼 제외를 알린다. 성공한 경우만 자동 쓰기 차단을 해제하며, 실패는 열린 모달 내부에도 표시한다. 다른 앱 저장 키는 변경하지 않는다.
- 루트 리뷰에서 음수 UTC offset의 날짜 표시 오류가 발견되어 `displayDate`의 timezone suffix 판별을 보완했다. 일정 시작·종료는 실제 앱 생성 형식인 시간대 없는 서울 시각만 복원하며 생성/수정 시각은 ISO timezone을 지원한다.

## 실제 검증

- `pnpm test src/stores/useAppStore.test.ts`: 초기 36개 성공.
- `pnpm typecheck`: 성공.
- `pnpm test`: 4개 파일, 총 59개 성공. 저장소 37개, 날짜 표시 4개, 기존 추천·서비스 17개, 병렬 작업의 로그인 취소 1개 포함.
- `pnpm build`: TypeScript 및 Vite 빌드 성공. Zod 주석 annotation 경고와 기존 대형 청크 경고는 남는다.
- 저장소 테스트는 빈 저장소, 정상 사용자 데이터/추천 보존, `failNext=false` 복원, malformed JSON/schema/version, 잘못된 날짜·시각·세션·참조·중복 ID·URL, 저장소 getter/read/write 오류 및 부재, 별도 경고 구독, 원본 보존, 명시적 복구 실패/재시도/후속 쓰기, 타 앱 키 보존을 확인한다.
- 실제 mock 서비스로 팀 생성, 개인 일정 저장·확인, 추천·확정, 영상·피드백 생성, 초대 수락 후 얻은 상태 전체를 재복원하여 유효 데이터가 거절되지 않음을 확인한다.
- 독립 QA의 실제 브라우저 12개 fresh context 검증(malformed/version/shape/date/session/orphan/url/getter/getItem/setItem/absent/normal reload)이 성공했다. 원본 보존·메모리 로그인·쓰기 경고 즉시 표시를 확인했다. 복구 확인·실패·취소·390px 후속 검증은 QA 보고서에서 별도 기록하며 이 문서 작성 시 진행 중이다.
- 리뷰 후 `pnpm dlx prettier@3.6.2 --write`를 할당 구현·신규 테스트 파일에만 적용했다. format-only 후 `pnpm typecheck`, `pnpm test src/stores/useAppStore.test.ts src/lib/utils.test.ts`(41개), `git diff --check` 성공. package.json/lockfile 변경 없음.

## 변경 파일과 리뷰

- `src/stores/useAppStore.ts`: 저장 adapter, 안전한 복원, 명시적 저장 복구.
- `src/stores/persistence-schema.ts`: 구조·의미 검증 및 복구 저장 정규화.
- `src/stores/storage-warning.ts`: 독립 경고 구독.
- `src/stores/useAppStore.test.ts`: 복원/실패/복구/서비스 회귀 검증.
- `src/components/StorageNotice.tsx`: reactive 안내·복구 확인 및 실패 표시.
- `src/lib/utils.ts`, `src/lib/utils.test.ts`: timezone suffix 회귀 수정·검증(루트 추가 허가).
- `src/lib/recommendation.test.ts`: 첫 실행 테스트는 복원 오류 없음의 원래 의도를 유지하고 저장소 부재 안내를 허용하도록 assertion 하나만 수정(루트 허가).

루트 초기 설계 리뷰에서 원본 보존 후 복구 경로 필요, 미저장 입력 제외 명시, 음수 offset 날짜, 열린 모달 내 실패 알림을 지적했고 반영했다. 루트가 소스·테스트 diff를 검토하고 추가 기능 수정 요청 없이 커밋을 승인했다. 최종 HEAD 승인 및 필수 CI는 루트 통합 리뷰 단계에서 기록한다. 실제 브라우저 저장소의 영속 보장이나 서버 보안을 제공하는 변경은 아니다.
