# 실제 브라우저·보조기술 및 샘플 영상 접근성

검증일: 2026-11-22 · 담당: 독립 FE QA

## 실제 Safari 검사

macOS 26.6.2(25G83)의 `/usr/bin/safaridriver --port 4455` 실행 후 WebDriver `POST /session`에 `browserName: safari`를 전달했다. 응답은 `session not created`, `You must enable 'Allow remote automation' in the Developer section of Safari Settings to control Safari via WebDriver.`였다. 실제 Safari 앱의 페이지 검증은 완료하지 않았다. 설정을 임의로 변경하지 않았다. 재검증 조건은 사용자가 Safari의 원격 자동화를 허용한 환경이다. Playwright WebKit 결과는 Safari 실사용 결과로 대체하지 않는다.

## 실제 브라우저 200% 확대 검사

headed Chromium에서 Playwright CLI로 `Meta+Equal`을 전달했다. 전달 전후 `innerWidth=1200`, `devicePixelRatio=2`가 동일하여 브라우저 UI 확대가 실행됐다는 근거가 없었다. `System Events`의 Safari menu bar 조회도 `osascript is not allowed assistive access. (-1728)`로 실패했다. 따라서 실제 200% 확대는 미검증이다. CSS zoom 또는 640 CSS px 재배치 검사로 통과 처리하지 않는다. 재검증에는 브라우저 UI에서 200%를 선택할 수 있는 환경과 설정값 확인, 확대 상태의 탐색·폼·모달 조작이 필요하다.

## VoiceOver·접근성 API 검사

`osascript -e 'tell application "System Events" to get UI elements enabled'`는 `false`를 반환했다. VoiceOver 프로세스 조회 결과는 비어 있었고 현재 제공 도구에는 실제 화면읽기기 출력을 청취하는 수단이 없다. 보조 접근 권한 변경이나 VoiceOver 시스템 설정 변경은 수행하지 않았다. 실제 VoiceOver 청취는 미검증이며 axe/ARIA/키보드 검사를 청취 검증으로 표현하지 않는다. 후속 환경에서는 VoiceOver를 실제로 사용하여 로그인, 메뉴, 캘린더 날짜·일정 이름, 모달 제목·오류, 추천·확정 상태와 영상 피드백 순서 및 초점 복귀를 확인해야 한다.

## 샘플 영상의 자막 필요성 수동 판정

검사 대상은 저장소에 포함된 `public/demo/rehearsal.mp4`, `public/demo/rehearsal.webm` 두 파일이다. `ffprobe -v error -show_streams -show_format <file>`로 컨테이너 전체 스트림을 조사했다.

| 형식 | 스트림 | 영상 | 길이 | 오디오 |
|---|---|---|---|---|
| MP4 | 1개 | H.264, 960×540, 24fps | 8초 | 0개 |
| WebM | 1개 | VP9, 960×540, 24fps | 8초 | 0개 |

MP4의 1초 간격 8프레임 contact sheet를 `ffmpeg -y -hide_banner -loglevel error -i public/demo/rehearsal.mp4 -vf 'fps=1,scale=320:-1,tile=4x2' -frames:v 1 /tmp/teamground-final-qa/sample-contact.png`로 추출하고 직접 확인했다. 녹색 격자 배경 위 세 개의 밝은 막대와 수평선으로 구성된 추상 애니메이션이며 사람의 대사나 글자 정보가 없다. WebM도 같은 필터로 `/tmp/teamground-final-qa/sample-webm-contact.png`를 추출하여 동일한 시각 구성을 확인했다. 음성을 듣지 않고 무음이라고 추측한 것이 아니라 두 파일 모두 오디오 스트림 자체가 없음을 확인했다.

이 샘플에 전사할 음성·음향이 없으므로 **샘플의 음성 자막은 필요하지 않음**으로 판정한다. axe의 `video-caption` incomplete를 자동 통과로 바꾸거나 모든 영상의 접근성을 인증하는 결론은 아니다. 최종 구현은 로컬 샘플에 “로컬 데모 · 녹색 격자 위 세 막대가 나타나는 8초 무음 재생 테스트 영상” 설명을 노출하고 video의 aria-describedby로 연결한다. 최종 production 브라우저에서 문구와 연결을 확인했다. 실제 연습 영상·외부 링크·사용자 등록 영상의 대사, 중요한 소리, 시각 정보에 대한 자막·대체 설명 정책은 이번 샘플 검사로 결정하지 않는다.

파일 SHA-256:

- MP4: `e8ca105eeab7602ce8e101f8db3bdb899f625f0c6134ca21f452418ac5bb0ed8`
- WebM: `061df3f367bd0d4ccd399c53e07a8e9af19e307f07155e0ac9487ec34933812d`

## 자동화·키보드 검증과 완료 범위

최종 소스의 자동 접근성, 키보드, 반응형 및 브라우저 검증은 [04-independent-verification.md](04-independent-verification.md)에 별도로 기록한다. 이 문서의 환경 차단 항목은 제품 결함 재현과 구분하며, 실제 Safari·native 200%·VoiceOver 실사용 및 전체 WCAG 준수 인증은 완료로 주장하지 않는다.
