# 무무토리 레터서비스

- `index.html` — 프로젝트 허브 (체크리스트, 고객 페이지 미리보기, 상세페이지 기획안, 접수함)
- `print.html` — 결제 후 보내는 일반 타자기 편지 작성 페이지
- `ghost.html` — 결제 후 보내는 대필 편지 설문 페이지
- `spec.js` — 편지 규격·봉투·설문 문항 (두 페이지와 허브가 함께 읽음)
- `firebase-config.js` — Firebase 프로젝트 `mumutori-letter` 웹 설정
- `database.rules.json` — Realtime Database 보안 규칙 (콘솔에 게시된 것과 같음)

접수 데이터는 Firebase `letters/`에 저장되고, 관리자(`admins/{uid}`)만 읽을 수 있다.
