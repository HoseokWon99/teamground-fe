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

구현·독립 검증 대기. PR HEAD·diff·검증 근거·실제 체크를 확인한 뒤 승인 SHA 및 Ready 전환 결과를 기록한다.

## 진행 중 리뷰 이력

1. 단일 `useBlocker`와 source별 dirty/saving 등록 구조 승인. 기존 React Router 안에서 data router로 전환하며 라우트 트리는 유지한다.
2. baseline 세 흐름의 유실 관찰 확인. HMR과 코드 수정이 겹친 피드백 관찰은 혼합 checkout 근거로 제한하여 기록했다. 최종 고정 코드 검증과 구분한다.
3. 상태 변경 승인 시 async 작업 전체를 bypass하던 초기 구현에 수정 요청. 성공한 작업의 명시적 redirect에만 bypass를 적용하고 작업 중 입력·이동을 잠그도록 반영 중이다.
4. 상태 변경 요청이 같은 tick에 중복 진입하지 않도록 await 이후 재검사 요청. 진행 중 응답하지 않는 버튼은 비활성화하도록 요청.
5. 다중 dirty source 중 하나를 저장해도 다른 source는 유지, 저장 실패 보호, 예시 입력 dirty, HMR 후 fresh reload 단일 blocker, 실제 back/forward URL 복원과 로그아웃 redirect 검증을 요청했다.
