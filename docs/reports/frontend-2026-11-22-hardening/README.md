# 프론트엔드 3차 · 로컬 데이터와 화면 사용성

기준일: 2026-11-22 · 책임/리뷰: 루트 에이전트

사용자의 “백엔드 연동 필요한 부분 제외하고 계속 진행” 지시에 따라 2차의 남은 우선순위를 이어서 처리한다. 실제 서버·OAuth·메일·Google API·파일 업로드는 제외하고 mock 기반 프론트엔드를 유지한다.

## 단계와 완료 기준

| 순서 | 담당 | 작업·완료 기준 | 기록 | 상태 |
|---|---|---|---|---|
| 1 | fe_persistence | 정상 저장 복원 유지, 손상/미지원 데이터 안전 처리, 저장소 접근·쓰기 실패 안내와 메모리 동작, 의미 있는 회귀 테스트 | [01-persistence.md](01-persistence.md) | 진행 중 |
| 2 | fe_hardening_qa | 11개 화면의 1440px/390px·키보드 사용성 감사, 발견 결함과 미검증 분리 | [03-audit.md](03-audit.md) | 진행 중 |
| 3 | fe_accessibility | 개인일정·초대 입력 보호, 모바일 메뉴·감사 결함 개선, 저장 경고 UI 통합 | [02-interface.md](02-interface.md) | 진행 중 |
| 4 | fe_hardening_qa / 루트 | 독립 브라우저 회귀, 타입·테스트·빌드 근거와 PR HEAD·CI 리뷰 | [04-independent-verification.md](04-independent-verification.md), [05-review.md](05-review.md) | 대기 |

## 작업 경계

- 저장소 담당은 `src/stores/`, 복원 검증 코드·테스트, 새 `StorageNotice`를 맡는다. UI 담당은 App·스타일·개인일정·팀/초대 및 공통 모달을 맡는다. 파일 소유권을 분리하고 통합 지점은 메시지로 합의한다.
- 오류 데이터는 조용히 덮어쓰거나 무단 삭제하지 않는다. 복원 불가와 메모리 전용 상태를 알려 사용자가 영향을 이해하고 명시적으로 복구할 수 있게 한다.
- 기존 요구사항의 프론트엔드 완성도를 높이는 작업이며 PM 정책·API 계약·백엔드를 변경하지 않는다.
- 기존 dirty `.gitignore`, `AGENTS.md`, 루트 `README.md`, `docs/prototype-plan.md`, `vercel.json`은 수정·커밋하지 않는다.
- 시작 HEAD `d5f706bfa738822b7ee1aae2e924d01db164bf40`. 작업 브랜치 `codex/fe-local-hardening`, PR base는 미머지 선행 PR #2의 `codex/fe-unsaved-navigation`이다. 선행 PR을 임의 머지하지 않는다.

## 초기 책임자 코드 검토

1. `storageWarning`은 mutable export이며 저장소 쓰기 실패 직후 UI 갱신이 보장되지 않는다. 반응형 상태로 분리할 필요가 있다.
2. 현재 복원 schema의 날짜는 임의 문자열을 허용하고 참조 무결성·세션 존재를 검증하지 않는다. 유효하지 않은 복원 값이 표시 함수/라우트에서 오류를 만들지 않게 해야 한다.
3. 개인일정·초대 폼은 모달 내부 닫기 확인은 일부 있으나 전역 이탈 source가 없다. 개인일정은 저장 중 입력/닫기 잠금도 일관되지 않다.
4. 모바일 사이드바는 CSS 이동만으로 열며 aria-expanded/controls와 모달식 키보드 처리가 없다. 실제 감사에서 동작을 확인한 뒤 수정한다.

[전체 작업 목록](../README.md)
