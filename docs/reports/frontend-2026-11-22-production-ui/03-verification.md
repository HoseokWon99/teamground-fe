# 운영 UI 독립 브라우저 검증

2026-11-22 17:22~17:27 KST. 대상: https://app.jointeamground.com, API: https://jointeamground.com/api/v1.

## 대상과 방법

- 배포 담당 확인: Actions run `45002456746` success, 소스 `3f3d1998792acfbd0145d8021f76c37bffab86b0`, 고유 배포 `https://teamground-6tnognzpp-hoseoks-projects-76438827.vercel.app`, 운영 alias 반영.
- 실제 브라우저에서 배포 전 `index-C_f5d_bE.js` / 발표용 데모 계정 선택을 확인했고, 배포 후 `index-DKOmfEtU.js` / 이메일·Google 로그인 화면으로 변경됨을 확인했다.
- Playwright CLI 스킬 사용. `command -v npx` 통과. 새 격리 Chromium 세션 `production-qa`, headed 브라우저에서 실행. 기존 사용자 로그인 세션이나 실계정 자격증명을 사용하지 않았다.
- 모의 응답, 로컬 앱, 테스트 SMTP를 운영 검증으로 사용하지 않았다. 앱 코드 변경 및 새 테스트 스펙 작성 없음.

## 공개 화면·반응형 확인

`1440×900`, `390×900` 각각 아래 7개 경로를 실제 운영 주소로 직접 열고 h1 렌더링, 최종 URL, 문서 가로 overflow, 네트워크 실패와 JavaScript 예외를 확인했다.

| 경로 | 두 화면 크기에서의 실제 결과 |
| --- | --- |
| `/login` | 이메일·비밀번호, 이메일 로그인, Google 로그인, 가입·비밀번호 찾기 및 명시적 데모 진입 표시 |
| `/signup` | 이름·이메일 입력, 가입 링크 요청 안내 표시. 실제 메일 요청은 하지 않음 |
| `/forgot-password` | 이메일 입력·재설정 요청 안내 표시. 실제 메일 요청은 하지 않음 |
| `/privacy` | 개인정보처리방침 본문 표시. 화면에 검토용 초안임을 명시 |
| `/terms` | 서비스 이용약관 본문 표시. 화면에 검토용 초안임을 명시 |
| `/account` | 비로그인 상태에서 `/login?returnTo=%2Faccount`로 이동 |
| `/qa-missing-page` | 앱 404 화면과 내 팀 목록 이동 링크 표시 |

14개 조합 모두 가로 overflow 없음. JavaScript `pageerror` 0, `requestfailed` 0. 문서 요청은 SPA fallback 정책으로 모두 HTTP 200이며, 없는 경로는 HTTP 404가 아닌 **앱 내 404 화면**이다. 각 새 문서 진입의 `/me` 401은 비로그인 상태 확인 응답이며 콘솔에 해당 resource error가 남는다. 따라서 콘솔 전체 오류가 0이라고 평가하지 않는다.

## 운영 API·로그인 오류 처리

- 운영 앱 origin에서 실제 `fetch(..., {credentials: "include"})`: `/auth/csrf` 200 및 `data.token` 존재, `/me` 401 `AUTH_REQUIRED`. 토큰 원문 출력·저장 없음.
- 브라우저에 `__Host-teamground-csrf` 쿠키가 저장됨: host `jointeamground.com`, path `/`, Secure, HttpOnly, SameSite=Lax. 값은 기록하지 않았다. 이는 CSRF 쿠키 검증이며, 로그인 성공 후의 세션 쿠키 검증은 아니다.
- 새 운영 UI에서 존재하지 않는 예약 `.invalid` 도메인의 이메일과 테스트용 문자열로 로그인 **1회** 제출. `/auth/csrf` 200 → `POST https://jointeamground.com/api/v1/auth/email/login` 401 `INVALID_CREDENTIALS` 확인.
- 화면에 “이메일 또는 비밀번호를 확인해 주세요. Google 가입자는 Google 로그인을 이용해 주세요.” 표시. 입력 보존 및 버튼 재활성화 확인. 네트워크 오류나 CORS 차단 없음.
- 위 실제 요청 URL로 새 UI의 API base가 `https://jointeamground.com/api/v1`임을 확인했다.
- Google 로그인 링크가 위 API의 `/auth/google/start?returnTo=%2Faccount`를 가리킴을 확인했다. Google 계정 로그인·consent는 진행하지 않았다. BE 독립 담당이 초기 302의 Google accounts 도착지 및 callback `https://jointeamground.com/api/v1/auth/google/callback`를 별도로 확인했다.

## 실행 명령과 증거

실행 위치는 FE 기본 체크아웃이며 wrapper는 `/Users/hoseok/.codex/skills/playwright/scripts/playwright_cli.sh`이다.

- `command -v npx`
- `playwright_cli.sh -s=production-qa open https://app.jointeamground.com --headed`
- `playwright_cli.sh -s=production-qa run-code 'async () => { ... }'`: 읽기 전용 route/viewport 반복, h1 대기, overflow 및 pageerror/requestfailed/status 수집, 공개 화면 캡처. API 호출은 CSRF/현재 사용자 조회만 수행.
- `goto https://app.jointeamground.com/login`, `snapshot`, `fill` 두 입력, `click` 이메일 로그인, `snapshot`.
- `requests`: `/me` 401, `/auth/csrf` 200, `/auth/email/login` 401 확인.
- `response-body 200`: 해당 요청 번호의 `INVALID_CREDENTIALS` 오류 확인. `console error`: 의도한 `/me` 및 invalid login의 401 resource error 2건만 확인.
- `screenshot --filename output/playwright/production-ui/...png`.

도구 시행착오: `run-code`의 초기 구조분해 인수 사용은 page undefined로 실패하여 CLI 전역 page를 사용하는 형식으로 교정했다. 스킬 문서의 `network` 명령은 설치 CLI에서 지원하지 않아 실제 `requests` 명령으로 교체했다. 애플리케이션 실패가 아니다.

공개 화면 캡처는 FE 기본 체크아웃의 `.gitignore` 대상 `output/playwright/production-ui/`에 보관했다(문서 PR에 이미지 미포함):

- `before-deployment-demo.png`
- `login-1440.png`, `login-390.png`, `login-error-390.png`
- `signup-1440.png`, `signup-390.png`
- `forgot-password-1440.png`, `forgot-password-390.png`
- `qa-missing-page-1440.png`, `qa-missing-page-390.png`

## 남은 제한과 판정

**운영 공개 UI, 실제 API 연결, 비로그인 보호 및 잘못된 로그인 오류 처리는 통과했다. 전체 실사용 흐름 완료 판정은 하지 않는다.**

- BE 담당 증거: 이메일 인증 코드가 포함된 main `9b65c8c9f258c082857e52ad0d0f8106f7c47897`가 ECS revision 8에 배포되었으나 MAIL/SMTP 환경변수·secret 설정 없음. 배포 소스의 `SmtpAuthMailer.requireConfigured`는 `spring.mail.host`, `TEAMGROUND_AUTH_MAIL_FROM` 미설정 시 `503 AUTH_MAIL_UNAVAILABLE`을 반환한다. 이는 설정·코드 근거이며 이번 QA에서 가입·재설정 POST를 호출한 결과가 아니다.
- 실제 메일 발송, 이메일 인증 완료, 비밀번호 재설정 완료는 미검증. 메일 설정 및 승인된 테스트 수신 계정이 필요하다.
- 로그인 성공·세션 갱신·로그아웃, 실제 계정의 팀/일정/영상/피드백 흐름은 인증 자격증명 없이 확인할 수 없어 미검증. 기존 데모 성공을 이 항목의 증거로 대체하지 않았다.
- 약관·개인정보 문서는 화면상 검토용 초안이다. 법률적 적정성이나 운영 정책 확정을 이번 UI 검증 결과로 주장하지 않는다.
