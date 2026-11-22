# Teamground

공연예술·영화 팀의 일정 조율과 연습 영상·피드백 공유를 시연하는 프론트엔드 프로토타입입니다. 11개 화면을 로컬 mock 서비스와 공유 데이터로 연결했습니다.

## 실행

Node.js 22 이상, pnpm 10 기준입니다.

```sh
pnpm install
pnpm dev
```

기본 주소는 http://localhost:5173 입니다. 실제 백엔드나 환경 변수는 필요하지 않습니다.

```sh
pnpm typecheck
pnpm test
pnpm build
```

`dist/`가 정적 빌드 결과입니다. 다른 호스트에 배포할 때는 상세 URL을 `index.html`로 연결하는 SPA fallback 설정이 필요합니다.

## 발표 순서

1. 지우 계정으로 로그인하고 파동 극단 선택.
2. 일정 조율 → 발표 예시 채우기 → 추천 시간 찾기.
3. 수요일 4회 전원 가능 결과 확인 → 이 시간으로 확정 → 4개 회차 확정.
4. 영상 추가 → 로컬 데모 영상 선택 → 영상 추가.
5. 영상 카드 선택 → 재생 → 피드백 등록.
6. 새로고침 후 데이터 유지와 팀 홈의 일정·영상 수 확인.

화면 아래의 **발표용 데모 도구**에서 초기화, 계정 전환, 일정 미확인, 후보 없음, 확정 전 변경, 다음 요청 실패를 사용할 수 있습니다. 초기화하면 시연 중 만든 데이터가 seed 상태로 돌아갑니다.

초대 시연에는 `seoyeon@teamground.demo`를 사용합니다. 초기 초대 확인 주소는 `/invite/welcome-seoyeon`입니다. 서연으로 로그인한 뒤 별도로 수락해야 참여합니다. 실제 메일은 발송하지 않습니다.

## 구현 스택

React · TypeScript · Vite · React Router · Tailwind CSS · Radix 기반 shadcn/ui 스타일 컴포넌트 · Lucide · Zustand persist · React Hook Form · Zod · date-fns · Vitest.

데이터 변경은 화면 → 비동기 mock 서비스 → Zustand → localStorage 순서입니다. 실제 인증·메일·Google 연동·서버 접근 제어는 제공하지 않습니다. 팀 권한과 데이터 소속은 화면과 mock 서비스에서 검사합니다.

## 데모 영상

`public/demo/rehearsal.webm` 및 `rehearsal.mp4`는 이번 프로토타입을 위해 FFmpeg로 생성한 8초 길이의 추상 도형 샘플입니다. 실제 배우나 외부 저작물을 사용하지 않았습니다. 플레이어는 데모 주소에 대해 호환성이 높은 H.264 MP4를 재생합니다. `poster.jpg`는 샘플 영상의 프레임입니다. 외부 링크는 직접 재생 가능한 mp4/webm만 플레이어로 제공하며 다른 서비스 주소는 원본 열기를 제공합니다.

## 문서와 작업 보고서

- [개발 지침](AGENTS.md)
- [화면 명세서](docs/screen-specification.md)
- [프로토타입 계획](docs/prototype-plan.md)
- [통합 구현 보고서](docs/reports/integration.md)
- [Mock 도메인 보고서](docs/reports/mock-domain.md)
- [인증·팀 보고서](docs/reports/teams-auth.md)
- [일정·캘린더 보고서](docs/reports/scheduling-calendar.md)

## 실제 이메일 인증 (2026-11-22)

기본 진입은 실제 서버 계정 모드다. `/login`에서 이메일 로그인, Google 로그인,
회원가입(`/signup`), 비밀번호 찾기(`/forgot-password`)를 제공한다. 가입 신청에는
이름·이메일만 입력하고, 메일의 `/verify-email#token=...` 링크에서 비밀번호를 설정한다.
재설정은 `/reset-password#token=...`에서 완료하며 기존 세션을 모두 종료한다.
토큰은 주소에서 제거하고 메모리에만 보관하므로 새로고침하면 메일 링크를 다시 열어야 한다.

- 개발: 백엔드 `http://localhost:8080`, 프론트엔드 `pnpm dev --host localhost --port 5173 --strictPort`.
- 개발 서버의 `/api` 프록시는 `TEAMGROUND_API_TARGET`으로 대상 주소를 바꿀 수 있다.
  서버의 허용 Origin은 실제 프론트엔드 주소와 일치해야 한다. 기본 로컬 연동은
  `http://localhost:5173`이다 (`127.0.0.1`은 다른 Origin).
- 운영: 이 클라이언트는 같은 Origin의 `/api/v1`을 사용한다. 별도 정적 호스팅에는
  백엔드로 전달하는 HTTPS reverse proxy가 필요하고, `/api`를 SPA HTML로 rewrite하면 안 된다.
  세션·CSRF 쿠키와 Origin 검증 설정을 함께 맞춰야 한다. 기존 Vercel 정적 설정만으로
  실제 API가 연결되지는 않는다. 이번 변경은 운영 배포를 수행하지 않는다.
- 로그인 상태는 서버 쿠키와 `GET /me`만 사용한다. 비밀번호·인증 토큰·서버 프로필을
  localStorage에 저장하지 않는다. 기존 mock sessionUserId는 실제 인증에 사용하지 않는다.
- 현재 실제 계정에서는 인증과 팀 목록·생성만 연결되어 있다. 초대·개인 일정·일정 조율·
  영상·피드백 화면은 서버 연결 준비 안내를 표시한다. 이메일 계정은 Google 캘린더
  연결 대상이 아니며, Google 계정도 별도 캘린더 동의 화면 연동이 필요하다.
- `데모 체험하기`로 명시적으로 들어가면 기존 브라우저 데이터 기반 시연을 유지한다.
  상단 `실제 계정으로 돌아가기`로 종료한다. 메일 링크는 데모 중에도 실제 인증 화면으로 열린다.

검증: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm exec playwright test`.
기존 E2E는 demo-fixture로 데모 진입을 명시하고, server-auth.spec.ts는 실제 계정 모드의
네트워크 계약·오류·접근성을 검사한다.

실제 FE/BE/SMTP 연동 테스트: 백엔드와 Mailpit(API `http://localhost:18025`,
SMTP `localhost:11025`), 프론트엔드 개발 서버를 실행한 뒤
`pnpm exec playwright test -c playwright.live.config.ts`.
테스트는 고유 `@example.test` 계정을 생성한다. 가입 메일→인증→로그인→새로고침 복원→
팀 생성→로그아웃→재설정→별도 브라우저 기존 세션 거절→기존 비밀번호 거절→새 비밀번호 로그인→
토큰 재사용 거절을 검사한다. 비밀이 담긴 브라우저 trace는 이 테스트에서 생성하지 않는다.
외부 Google 제공자와 실제 메일 수신함, 운영 쿠키·프록시는 별도 검증 대상이다.

## 서버 도메인 화면

인증·팀 목록에서 팀 상세, 개인 일정/확인 범위, 조율 추천·확정, 회차 영상·피드백으로 이어지는 실제 API 화면을 제공합니다. 데모는 명시적으로 선택하며 실제 API 오류를 데모 데이터로 대체하지 않습니다.

API 기본값은 `/api/v1`입니다. FE와 BE를 같은 사이트의 서로 다른 origin으로 배포하는 경우 `.env.example`처럼 `VITE_API_BASE_URL=https://jointeamground.com/api/v1`를 빌드 시 설정합니다. 서버 CORS는 FE origin과 credential 요청을 허용해야 합니다. 잘못된 base URL은 오류로 처리합니다. `vercel.json`은 Git 자동 배포를 비활성화합니다.

범위와 미검증 항목은 [API 연동 보고서](docs/reports/frontend-2026-11-22-api-integration/README.md)를 참고하세요. 로컬 BE/Mailpit 통합 테스트는 실행 중인 localhost:8080 BE, SMTP :11025, Mailpit :18025, FE 127.0.0.1:5173 환경에서 `pnpm exec playwright test --config playwright.integration.config.ts`로 실행합니다. 운영 환경에는 실행하지 마세요.

## 운영 배포

운영 프론트엔드는 https://app.jointeamground.com 에서 제공합니다. 완성 UI main `3f3d199`를 기존 GitHub Actions production 파이프라인으로 단발 배포했습니다. 자동 배포는 비활성 상태를 유지합니다. [배포·리뷰·검증 기록](docs/reports/frontend-2026-11-22-production-ui/README.md)에 배포 소스와 확인 범위, 미검증 항목을 기록합니다.
