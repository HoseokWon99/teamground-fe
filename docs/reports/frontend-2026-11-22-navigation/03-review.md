# 책임자 리뷰 · 미저장 입력 보호

리뷰어: 루트 에이전트 · 2026-11-22

## 초기 코드 검토

- 팀 생성은 문서 click 캡처와 beforeunload만 사용하여 브라우저 history 이동 및 버튼 기반 navigate를 포괄하지 않는다.
- 일정 조율은 팀 일정 복귀 링크에만 확인이 있고 사이드바·팀 전환 등은 우회한다. 예시 채우기는 `form.reset`으로 dirty를 지워 저장되지 않은 입력을 clean으로 취급한다.
- 피드백 신규·수정에는 화면 이탈 보호가 없고 수정 취소·다른 항목 수정도 입력을 잃을 수 있다.
- 로그아웃과 데모 초기화는 서비스의 세션/데이터 변경 후 navigate하므로 라우터 blocker만 추가해서는 기존 입력과 세션을 보존할 수 없다. 상태 변경 전 확인이 필요하다.

## 설계 검토 기준

React Router 공식 이동 차단을 사용하고 history monkey patch는 금지한다. 필요하면 기존 React Router 내에서 data router로 최소 전환하되 경로·lazy·접근 가드는 유지한다. 한 화면에 피드백과 영상 모달 등 여러 입력이 있을 때 blocker 충돌을 피한다. 저장 성공은 이탈 차단을 안전하게 해제하고 실패는 보호를 유지한다. 새 탭의 원본 영상 열기는 현재 페이지를 떠나는 동작으로 간주하지 않는다.

## 최종 검토/승인

- PR: [#2](https://github.com/HoseokWon99/teamground-fe/pull/2), base `codex/fe-video-form-safety`. 선행 PR #1을 머지하지 않고 후속 변경만 분리했다.
- 검토한 코드 HEAD: `fec9e900e45d60b625267ca77bdf603c2ceea235`. 구현 담당 보고와 `gh pr view 2 --json headRefOid`가 일치한다.
- 루트가 소스 5개 파일 전체 변경과 공백 제외 diff, 구현/독립 검증 보고서, 회귀 스크립트를 검토했다. **코드 HEAD 승인**, 남은 수정 요청 없음. 이는 책임자 검토 기록이며 GitHub 계정의 자기 PR 승인 review를 뜻하지 않는다.
- 타입 검사, 기존 테스트 18개, 빌드, diff-check 통과. 독립 QA가 최종 고정 소스에서 이동 보호 스크립트 2개, 실제 native beforeunload 취소/입력 유지, 라우팅 7개 항목, 기존 영상 모달 12개 항목을 재실행했다. 소스 시작/종료 hash가 승인 커밋 blob과 일치한다. 구체적 한계는 [독립 검증 보고서](04-independent-verification.md) 참조.
- 해당 HEAD의 실제 체크: `Vercel` SUCCESS, `Vercel Preview Comments` SUCCESS. Vitest 결과는 로컬 검증이며 이 두 체크를 테스트 CI로 설명하지 않는다.
- 코드 변경은 FE 소스 5개에 한정된다. 의존성·mock 서비스·백엔드 변경 없음. 기존 사용자 dirty 5개 파일은 PR 파일 목록에 포함되지 않음을 확인했다.
- 이 최종 리뷰와 QA 보고서만 추가한 문서 커밋 후 소스 불변·새 HEAD·체크를 재확인하여 Ready로 전환한다. 최종 SHA와 전환 결과는 PR 본문에 기록한다. 문서 자신의 커밋 SHA를 문서에 넣는 순환을 피한다.
- 머지·직접 프로덕션 배포 없음. 기존 연결에 의한 Vercel preview 체크만 실행됐다.

## 진행 중 리뷰 이력

1. 단일 `useBlocker`와 source별 dirty/saving 등록 구조 승인. 기존 React Router 안에서 data router로 전환하며 라우트 트리는 유지한다.
2. baseline 세 흐름의 유실 관찰 확인. HMR과 코드 수정이 겹친 피드백 관찰은 혼합 checkout 근거로 제한하여 기록했다. 최종 고정 코드 검증과 구분한다.
3. 상태 변경 승인 시 async 작업 전체를 bypass하던 초기 구현에 수정 요청. 성공한 작업의 명시적 redirect에만 bypass를 적용하고 작업 중 입력·이동을 잠그도록 반영 중이다.
4. 상태 변경 요청이 같은 tick에 중복 진입하지 않도록 await 이후 재검사 요청. 진행 중 응답하지 않는 버튼은 비활성화하도록 요청.
5. 다중 dirty source 중 하나를 저장해도 다른 source는 유지, 저장 실패 보호, 예시 입력 dirty, HMR 후 fresh reload 단일 blocker, 실제 back/forward URL 복원과 로그아웃 redirect 검증을 요청했다.
6. 전이 잠금과 중복 요청 방지 수정 반영 확인. 새 provider와 변경 JSX를 주변 스타일로 정리한 뒤 최종 타입·테스트·빌드를 재실행했다.
7. 두 navigation 회귀 스크립트에 계측 원복 누락을 발견해 수정 요청했다. `finally`에서 confirm/service 복원·보류 promise 해제를 추가하고 두 스크립트 재실행 및 네이티브 confirm 원복을 확인했다.
8. 중단 전 QA 보고를 최종 직접 실행으로 혼동하지 않도록 재개 담당이 새 세션에서 독립 검증했다. 실제 reload 확인은 계측 없는 별도 세션에서 수행했고, fresh document에서 복수 blocker 경고나 pageerror가 없음을 확인했다.

## 남은 범위

저장소 오류·복원 검증, 전체 화면 접근성·반응형, 초대·개인일정 폼 전역 보호, Safari/Firefox 및 실제 탭 닫기 확인은 후속이다. 기존 Zod 주석·번들 크기 경고는 남아 있다. 백엔드 연동은 계속 보류한다.
