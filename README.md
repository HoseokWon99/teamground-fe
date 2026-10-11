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
