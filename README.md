# 무무토리 레터서비스

- `index.html` — 프로젝트 허브 (체크리스트, 고객 페이지 미리보기, 상세페이지 기획안, 접수함)
- `print.html` — 결제 후 보내는 일반 타자기 편지 작성 페이지
- `ghost.html` — 결제 후 보내는 대필 편지 설문 페이지
- `spec.js` — 편지 규격·봉투·설문 문항 (두 페이지와 허브가 함께 읽음)
- `letter-experience.js` — 종이 위 인사, 사용자가 켤 때만 재생하는 Web Audio 효과음
- `letter-intake-config.js` · `letter-submit.js` — 고객 전용 접수 연결. 현재 `enabled: false`인 미리보기 상태
- `firebase/prepare-rules.html` — 현재 콘솔 규칙에서 레터 경로만 병합하는 사장님용 화면
- `firebase/letters.rules.json` — 필드·길이 검사와 고객 새 편지 작성만 허용하는 **병합용 규칙 조각**
- `firebase-config.js` · `fb.js` — 기존 관리자 허브의 Firebase 연결. 고객 작성 화면은 이 설정을 읽지 않음
- `database.rules.json` — **과거 참고 파일. 현재 콘솔 규칙과 같지 않으며 전체 배포에 사용하면 안 됨**

## 현재 접수 상태

화면은 PC·휴대폰에서 작성부터 완료까지 확인할 수 있지만 **실제 접수는 아직 열지 않았다**. 운영 규칙의 적용·차단 시험 확인 전에는 `letter-intake-config.js`의 `enabled: false`를 유지한다. 미리보기 완료는 가게에 전송된 것이 아니며, 화면에서도 이를 명확히 안내한다.

새 연결은 대시보드와 같은 Realtime Database의 `letters/`에 REST로 새 편지만 쓴다. 고객 로그인·API 키·관리자 키는 필요 없다. 성공 응답의 저장 내용을 대조한 뒤에만 접수 완료로 안내한다. 결과가 불명확한 재시도는 같은 무작위 접수번호와 원문을 유지하며, 저장을 사용할 수 없는 브라우저에서는 중복 방지를 위해 전송하지 않는다.

새 규칙의 읽기는 지정한 사장님의 verified Google 계정만 허용하며 기존 `admins` 목록 전체에는 열지 않는다. 운영 콘솔의 현재 규칙은 별도 확인이 필요하다. 적용 순서와 주의점은 [레터 Firebase 안내](firebase/README.md)에 있다. 다른 업무 규칙을 보존하도록 기존 콘솔 규칙에 레터 두 경로만 병합한다.

## 유지한 기능

- 주문 확인 → 편지 쓰기 → 봉투 → 보내기. 대필은 두 번째 단계 안에서 마음 설문과 꼭 넣을 말을 차례로 작성한다.
- 한 줄 33자·한 장 20줄, 마라톤 1000 DLX 자판 허용 문자, 휴대폰 큰따옴표·말줄임 자동 보정.
- 미리보기는 참고용, 봉투는 기본 포장 안내와 사진, 봉투 겉 이름 칸은 숨김.
- 소리 기본 꺼짐, 움직임 줄이기 설정, 오류 안내와 첫 문제 칸 초점 이동.

## 검증

```sh
node --test --test-isolation=none tests/intake-client.test.cjs
# 공식 Realtime Database Emulator를 127.0.0.1:9005에서 실행한 뒤:
node tests/firebase-rules.test.cjs
# 로컬 Playwright와 Chromium이 준비된 환경에서:
node tests/browser-flow.cjs
```

브라우저 검수는 운영 Firebase 요청을 차단하고 가상 서버 응답만 쓴다. `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, `QA_OUTPUT` 환경변수로 검수 환경을 지정할 수 있다. 브라우저의 한글 글꼴 네트워크 사용이 제한된 환경에서는 `QA_FONTS`에 현재 Google Fonts 원본과 manifest를 임시 준비할 수 있다. 검수 캡처에는 가상 주문만 사용한다.
