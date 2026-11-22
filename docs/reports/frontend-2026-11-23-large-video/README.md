# 100 MiB 근접 실제 영상 운영 검증

2026-11-23 KST 사용자 요청에 따라 실제 운영 `https://app.jointeamground.com`에서 수행했다. 운영 FE source `f79ad1643ffdac6333997c1d94bc8a632459cc78`, 번들 `index-BYWvEGB_.js`. 이번 변경은 검증 스크립트와 기록뿐이며 제품 변경이나 배포가 아니다.

## 파일 생성

ffmpeg로 시간에 따라 움직이는 testsrc2 및 noise를 실제 H.264로 인코딩했다. 작은 파일 뒤에 바이트를 붙이지 않았다. 두 영상 모두 1280×720, 30fps, yuv420p, 2초 GOP, 오디오 없음, faststart다.

```sh
ffmpeg -y -hide_banner -loglevel error -f lavfi -i testsrc2=size=1280x720:rate=30 \
  -vf 'noise=alls=30:allf=t' -t 60 -c:v libx264 -preset veryfast \
  -b:v 13900k -minrate 13900k -maxrate 13900k -bufsize 13900k \
  -x264-params nal-hrd=cbr -pix_fmt yuv420p -g 60 -an -movflags +faststart near-limit.mp4
```

초과 파일은 같은 명령에서 `-t 61`로 생성했다. `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,pix_fmt,width,height -of json <file>`로 검증했다. MP4 atom 검사에서도 두 파일의 moov가 offset32에 있고 mdat보다 앞에 있음을 확인했다. 인코더 버전에 따라 파일 크기가 달라질 수 있으므로 재실행 전 크기를 반드시 확인한다.

| 파일 | 실제 크기 | 길이 | 한도 비교 |
|---|---:|---:|---|
| near-limit.mp4 | 104,857,450 bytes | 60초 | 100 MiB보다 150 bytes 작음 |
| over-limit.mp4 | 106,549,492 bytes | 61초 | 100 MiB 초과 |

## 실제 운영 결과

`TEAMGROUND_PRODUCTION_FIXTURE=<absolute 0600 fixture> node scripts/verify-production-large-video.mjs` 최초 실행 exit0/PASS. 기존 사용자 데이터와 API mock은 사용하지 않았다. 새 합성 계정·팀·회차는 BE가 승인된 일회성 ECS 작업으로 준비했다. 테스트 범위는 스크립트의 exact team/occurrence allowlist 및 고정 운영 호스트로 제한한다. 재사용하려면 새로 승인한 합성 범위로 allowlist를 수정해야 한다. 비밀번호·세션·서명 URL은 출력하거나 파일로 저장하지 않는다.

| 확인 항목 | 결과 |
|---|---|
| 초과 파일 UI | `영상은 최대 100 MiB까지 업로드할 수 있습니다.` 표시 |
| 저장 차단 | 저장 버튼 disabled, 업로드 POST 0회 |
| 입력 보존 | 제목과 선택 파일 크기 유지 |
| 정상 파일 재선택 | 오류 사라짐, 저장 활성화, 제목 유지 |
| 실제 multipart 전송 | 104,857,450 bytes, POST 1회, HTTP 201, 4,570ms |
| 업로드 진행률 | 0→100, 26개 진행률 표본 |
| 최초 재생 | currentTime 0.8699초, readyState4, media error 없음 |
| 중간 seek | 30초 지정 후 30.8722초로 진행 |
| 후반 seek | 54초 지정 후 54.8709초로 진행 |
| 새로고침 재생 | currentTime 0.8256초로 진행 |
| 실제 브라우저 Range | HTTP206 4회; bytes=0-, 51871744-, 92798976-, 0- |
| 반응형 | 1440px/390px 초과 안내 및 재생 캡처, 모바일 가로 넘침 없음 |
| 종료 | 로그아웃 및 브라우저 종료, 영상은 BE metadata/정리 검증용으로 유지 |

검증 영상 ID: `bb958ccf-aa73-473e-b416-913e930f59b4`. 숫자와 응답만 담은 상세 결과는 [result.json](./result.json)에 있다. 로컬 증거는 `output/playwright/video-large-production/`의 `oversize-desktop.png`, `oversize-mobile.png`, `valid-selected-desktop.png`, `playback-desktop.png`, `playback-mobile.png`다.

UI 차단과 BE의 raw authenticated multipart 413은 별도 검증이다. BE 담당자가 초과 파일로 raw authenticated multipart 1회를 수행해 HTTP413 `VIDEO_FILE_TOO_LARGE`를 2.961초에 받았고, 전후 목록 ID가 동일함을 확인했다. S3 HeadObject도 ContentLength 104,857,450 bytes, video/mp4, AES256, Range 지원을 확인했다. DB/S3 정리는 BE가 담당한다. 아래 정리 기록을 참고한다. 여러 대용량 파일의 동시 업로드, 실시간 취소 경합, 다른 네트워크 속도에서의 성능은 검증하지 않았다.

## 로컬 검증

- `node --check scripts/verify-production-large-video.mjs`: 성공.
- 실제 운영 Chromium QA: exit0/PASS, 위 결과와 동일.
- `pnpm typecheck`, `pnpm build`: 성공. 빌드에는 기존 zod PURE 주석 위치 경고만 있었다.

## 정리

BE metadata/초과 요청/정리 완료 후 최종 기록을 추가한다. 성공 영상은 앱에서 삭제하지 않고 BE가 승인된 합성 범위 전체를 정리한다.
