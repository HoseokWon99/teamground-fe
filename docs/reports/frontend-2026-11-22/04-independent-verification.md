# 단계 3 · 독립 재검증

- 검증 담당: 구현과 분리된 FE 검증 에이전트
- 실행: 2026-11-22 11:51~11:54 KST, 로컬 Vite `http://127.0.0.1:5173`
- 브랜치: `codex/fe-video-form-safety`
- `git hash-object src/features/videos/pages.tsx`: 시작·종료 모두 `bc7e6697bdfa19062dca206a5a1d126a096d7e4b`
- 종료 시 HEAD: `2afd2cbe84aa098bcfdc6f4ed8d26515f5c7a46d`
- `git rev-parse HEAD:src/features/videos/pages.tsx`의 커밋 blob도 `bc7e6697bdfa19062dca206a5a1d126a096d7e4b`로 검사 파일과 일치한다.
- 소스 변경 없이 본 보고서만 작성. 외부 서버/API 연동 없음.

## 독립 실행한 회귀 매트릭스

Playwright CLI `fe-independent`라는 별도 headed Chromium 세션, `/tmp`에서 실행했다. 구현 담당의 `video-modal-regression.js`를 먼저 읽고 다음 명령으로 독립 실행했다.

```sh
/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh -s=fe-independent run-code --filename=/Users/hoseok/services/teamground/teamground-fe/docs/reports/frontend-2026-11-22/video-modal-regression.js
/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh -s=fe-independent eval 'window.__videoRegressionResults'
```

12개 결과 묶음 모두 PASS:

| 모드 | 실제 검증 |
|---|---|
| 추가·수정 각각 | 취소 / Escape / X(닫기) / overlay의 clean 무확인 종료 |
| 추가·수정 각각 | 각 네 경로에서 dirty 확인 취소 → 입력 유지, 동의 → 닫힘 |
| 추가·수정 각각 | 값을 원래대로 되돌리면 clean, 닫힌 뒤 opener 초점 복원 |
| 추가·수정 각각 | 빈 제목 제출 시 첫 오류 제목 입력으로 초점, 입력 잠금 해제 |
| 추가·수정 각각 | 저장 중 제목·주소·데모 선택·취소·제출 비활성, Escape/X/overlay 종료 차단 |
| 추가·수정 각각 | 같은 tick의 requestSubmit 두 번에 mock 서비스 호출 1회 |
| 추가·수정 각각 | 저장 실패 본문·오류 유지, Escape 확인 취소 후에도 유지, 재시도 성공·중복 없음·opener 초점 복원 |

이 매트릭스는 window.confirm 반환값 계측 및 mock 서비스 Promise 보류로 저장 중 상태를 결정적으로 확인한다. 실제 브라우저 네이티브 확인창을 모두 사람이 조작한 것과 구별한다. 브라우저 메모리 계측은 finally에서 복원하며 저장소 코드는 수정하지 않았다. 최초 로그인 버튼의 stale ref는 최신 snapshot 재확인 후 해결했다.

## 별도 네이티브 조작·390px 검증

매트릭스 종료 및 계측 복원 후 viewport를 390×844로 바꾸고 실제 CLI click/fill/press/dialog-dismiss/dialog-accept를 사용했다.

1. 수정 창: 제목을 `독립 네이티브 확인`으로 입력 → Escape → 실제 확인창 취소. 모달과 입력이 유지됨. 다시 Escape → 동의 → 닫히고 수정 버튼에 초점 복원.
2. 수정 다시 열기: 미저장 문자열 대신 저장된 `회귀 검증 edit 1795315916757` 복원 확인. dialog x=16, width=358, right=374, bottom=669.79로 390×844 안에 배치. document scrollWidth=390으로 수평 넘침 없음.
3. 추가 창: 제목 `추가 네이티브 확인` 입력 → 취소 버튼 → 실제 `작성 중인 내용을 버릴까요?` 확인창 취소. 입력 및 모달 유지. 다시 취소 → 동의 → 닫힘.
4. 추가 재열기: 제목·주소 모두 빈 초기값 확인. clean Escape는 확인창 없이 닫힘, `document.activeElement.textContent`가 `영상 추가`로 복원. 추가 모달에서도 width=390, document scrollWidth=390.

증거는 `/tmp/.playwright-cli/` 임시 파일에 있으며 주요 snapshot은 `page-2026-11-22T02-52-27-808Z.yml`, `page-2026-11-22T02-52-57-371Z.yml`, `page-2026-11-22T02-53-34-556Z.yml`, `page-2026-11-22T02-53-37-117Z.yml`이다. 화면 전환 중 개발 서버 reload로 ref가 변경된 경우 최신 snapshot을 재수집했다. 시작·종료 코드 hash는 동일하다.

## 결론과 한계

관측한 변경 범위의 회귀 결함 없음. baseline의 clean 추가 확인과 dirty 수정 Escape 무확인 종료 문제는 수정된 동작을 확인했다. 전체 8개 닫기 경로 매트릭스를 이 담당자도 직접 실행했으나 독립 작성 테스트는 아니며 구현 담당 작성 스크립트를 재사용했다. 네이티브 확인창 별도 조작은 수정 Escape와 추가 취소 두 대표 경로다. 저장 중 보류·중복 제출은 계측된 브라우저 자동 검증이며 390px에서 모든 매트릭스를 반복하지는 않았다.

이번 단계에서 typecheck/test/build를 중복 실행하지 않았다. 단계1 baseline 결과와 구현 담당의 수정 후 실행 결과를 구분해 참조한다. Safari/Firefox, 실제 백엔드·배포 URL, 전체 앱 회귀·스크린리더·키보드 focus trap 전체는 미검증이다.
