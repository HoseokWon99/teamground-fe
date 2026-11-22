# 책임자 리뷰 · Vercel 배포 파이프라인

2026-11-22 · 루트

## 확인 근거

기존 Frontend quality workflow, package.json, 미추적 vercel.json, 비밀값 없는 `.vercel/project.json`의 프로젝트 ID만 읽었다. GitHub repository/environment Secret은 이름 목록만 확인했으며 토큰 값은 조회하지 않았다. Vercel 연결 도구의 프로젝트 조회는 해당 팀 접근 권한 부족 403으로 실패하여 실제 서버 설정을 확인했다고 표현하지 않는다. 공식 Vercel 문서에서 env 토큰 인증·local-config·prebuilt 흐름을 확인했다.

## 소스 정적 검토

- 성공 이벤트는 이름이 일치하는 Frontend quality의 같은 저장소 main push로 제한한다. PR/fork 이벤트와 main 이외 수동 실행은 배포하지 않는다.
- workflow_run의 head_sha를 그대로 checkout하며 최신 main을 checkout 전·배포 직전에 재확인한다. 아티팩트·캐시를 다른 실행에서 가져오지 않는다. 두 번의 검사는 배포 중 발생하는 새 push와의 원자성을 보장하지 않는다.
- Production/Preview별 environment와 concurrency를 사용한다. cancel-in-progress=false이며 진행 중 배포를 중단해 상태가 불명확해지는 일을 피한다. 외부 Git 자동 배포는 별도의 전환이 필요하다.
- checkout `d23441a48e516b6c34aea4fa41551a30e30af803`, setup-node `249970729cb0ef3589644e2896645e5dc5ba9c38`, pnpm setup `9fd676a19091d4595eefd76e4bd31c97133911f1`는 담당자가 공식 Git 저장소 태그로 대조했다. root가 최종 파일에 같은 SHA가 쓰였음을 확인했다. CLI는 npm metadata에서 확인한 66.6.0으로 고정한다.
- contents:read만 요청한다. 토큰은 pull/deploy 단계 env로만 전달하고 인수·출력·artifact로 내보내지 않는다. 빌드는 대상 설정을 내려받아 실행하며 .vercel은 종료 시 정리한다.
- 기존 로컬 vercel.json과 동등한 CI 설정을 별도 파일로 추적해 사용자 파일을 stage하지 않는다. 환경별 prebuilt 결과와 SPA fallback을 유지한다.

독립 리뷰 담당자도 필수 수정 사항을 발견하지 않았다. 이 결론은 정적 리뷰 범위이며 YAML 파서·빌드·배포 성공을 의미하지 않는다.

## GitHub 설정과 실행 보류

루트는 요청 범위 안에서 신규 환경 두 개, main branch 제한, 운영 reviewer 및 비밀값 없는 repo ID 변수들을 설정했다. 활성화 값은 false다. 기존 Production/Preview 환경과 Vercel Git 연결은 유지했다. 환경별 토큰을 직접 등록하고 기존 Git 배포와의 전환을 마친 후 활성화해야 한다.

구현 diff 승인. 앞선 테스트 보류 지시에 따라 새 테스트나 배포를 실행하지 않으며, 새 PR은 `[skip ci]` 커밋과 무검증 Draft로 공유한다. 최종 검토 HEAD는 PR 본문에 기록한다. 사용자 토큰을 읽거나 대신 생성하지 않는다.

## PR #7 머지 요청 후속 리뷰

위 내용은 최초 구현 당시의 기록이다. 후속 사용자 요청에 따라 fe_vercel_merge_hold에게 Git 자동 배포 차단을 위임했다. 루트는 기존 vercel.json 항목이 모두 보존되고 git.deploymentEnabled=false만 추가된 것을 확인했다. 이번에는 해당 파일도 추적하며 다른 사용자 변경 네 파일은 보존한다. Git 연결은 유지하지만 자동 배포는 차단한다.

토큰 발급·환경별 등록 안내를 운영 문서에 추가했다. 정적 리뷰 후 Ready 전환 및 머지를 진행하며 추가 커밋과 머지 제목에 [skip ci]를 사용한다. 최종 승인 HEAD 및 실제 머지 SHA는 [PR #7](https://github.com/HoseokWon99/teamground-fe/pull/7) 본문에 기록한다. Actions 활성화는 false를 유지하고 테스트·빌드·워크플로 실행·실배포는 보류한다.
