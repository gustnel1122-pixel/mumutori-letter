# 렌더 시험판 ⓑ — 재료와 사용 범위

| 재료 | 출처 | 사용 조건 |
| --- | --- | --- |
| 도토리·밤·땅콩·병아리콩·완두콩 3알·해바라기씨·쌀 | `jg/test3d/models/*.glb` 정본 7개 | 무무토리 정본, 원본 SHA-256을 `scene-metadata.json`에 기록. Blender에 가져온 인스턴스의 자세·원본 눈 표면만 애니메이션 |
| 책상·의자·컴퓨터·책장·책·화분·상자·램프·서랍장 | [Kenney Furniture Kit 2.0](https://kenney.nl/assets/furniture-kit) | CC0 1.0. 로컬 배포본 License.txt와 자산 SHA-256 목록 보관 |
| 실내 HDRI Studio Small 09 | [Poly Haven](https://polyhaven.com/a/studio_small_09), Sergej Majboroda | CC0 1.0. 1K HDR 조명으로 사용 |
| 씨앗 장난감·카트·창틀·바닥·씨앗 | 이 파일럿의 Blender 절차형 모델링 | 직접 제작. 캐릭터를 새로 생성하지 않음 |
| 창의 얼룩·금·박힌 씨앗 | `renderer.js`의 GPU/Canvas 합성 | 직접 작성. 키로 뚫린 창에만 뒤에서 합성해 친구를 가리지 않음 |
| GPU 키잉·새 프레임 추적 | 기존 `jg/fast/renderer.js`, 이 폴더에서 별도 수정 | 라이브 원본 파일 수정 없음 |
| 감지 Worker | 기존 `jg/fast/detection.js`, `detect-worker.js` | MediaPipe Tasks Vision 1.2.3 / Apache-2.0. 얼굴 모델과 WASM만 CDN에서 읽음 |
| 제목 글꼴 | 정본 `Jua-Regular.ttf` | SIL OFL. Google Fonts Jua, 원본 글꼴 그대로 |

영상: Blender Eevee, 1920×1080, 초당 30프레임. S1 8초, S2 5초, S3 12초, S4 6초. S2~S4는 연속 파일 `battle.mp4`로 재생해 장면 사이 재로딩을 피한다. 별도 S2/S3/S4 파일은 검토용이다.

`?demo=1`: 카메라 없이 기본 장면 시작. `?debug=1`: 감지 시험·퇴장 시험·가동 측정 표시. `?cpu=1`: GPU 키잉을 쓸 수 없는 환경의 fallback 확인.

얼굴은 페이지 내부 Worker에만 전달한다. 카메라 영상 저장·서버 전송·분석 이벤트 전송·오디오 입력 없음. 진단 기록은 숫자만 브라우저 메모리에 보관하며 샘플 수를 제한한다. 카메라 OFF 검증 녹화만 개발 중 별도로 만든다.
