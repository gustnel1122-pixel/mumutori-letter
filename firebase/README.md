# 레터 접수 연결

고객 페이지는 기본 미리보기 상태다. `letter-intake-config.js`의 `enabled`는 실제 보안 규칙 적용·차단 시험을 확인하기 전까지 `false`로 둔다. 개발·화면 검수에 성공한 것과 운영 Firebase 규칙 적용은 별도다.

## 같은 프로젝트를 쓰는 방법

대시보드와 같은 Realtime Database에 고객이 REST `PUT /letters/<무작위 접수번호>.json`으로 새 편지를 쓴다. 고객은 로그인하지 않으며 웹 API 키·비밀번호·관리자 키·SDK가 필요 없다. 글을 읽는 요청은 보내지 않는다. 접수번호는 `crypto.getRandomValues`로 만든 128비트 무작위 값이며 주문번호나 이름이 들어가지 않는다.

`letter-submit.js`는 HTTP 성공 응답에 들어 있는 저장 결과를 입력값과 비교하고 서버 시각을 확인한 뒤에만 성공을 돌려준다. 시간 초과·권한 거절·응답 불일치는 성공으로 처리하지 않는다. 다시 시도할 때는 같은 접수번호를 사용한다. 응답이 유실된 뒤 재시도가 거절되면 기존 접수가 있었는지 고객이 읽어 확인할 수 없으므로 가게 확인이 필요하다. 새 접수번호로 자동 재전송하지 않는다.

## 보안 규칙을 적용할 때

저장소 루트의 `database.rules.json`은 과거 참고 파일이다. **현재 콘솔 규칙 전체를 이 파일로 교체하지 않는다.** 기존 장부·소싱 등 다른 경로를 잃을 수 있다.

1. Firebase 콘솔의 기존 프로젝트에서 **Realtime Database → 규칙**을 열고 현재 규칙 전체를 복사한다.
2. [규칙 준비 화면](prepare-rules.html)에 붙여넣고 **기존 규칙을 보존하고 준비하기**를 누른다. 기존 규칙에 사장님 이메일이 하나만 있으면 자동으로 사용한다. 찾지 못했을 때만 구글 계정 이메일을 그 화면에 적는다. 키·비밀번호는 필요 없다.
3. 합친 내용에서 바뀐 경로가 `letters`, `letterIntake`뿐인지 확인하고, 콘솔 규칙 칸에 붙여넣어 **게시**한다. 다른 경로를 보존할 수 없거나 루트에 더 넓은 읽기·쓰기 허용이 있으면 준비 화면이 중단한다.
4. 게시한 규칙과 확인 결과를 담당자가 검증한다. 미로그인 읽기·덮어쓰기·잘못된 값 거절, 사장님 Google 계정 읽기만 허용됨을 확인한다. 확인 전에는 접수를 켜지 않는다.
5. 확인된 경우에만 `letterIntake` 데이터에 `{ "enabled": true, "rulesVersion": "letter-v1-20261026", "verifiedAt": <확인한 시각의 밀리초> }`를 넣고 고객 설정의 `enabled`를 켠 뒤, 가상 정보로 시험 접수 **1건**을 확인한다. 이 작업에서는 시험 건을 지우지 않는다.

`letters.rules.json`은 **두 경로만 들어 있는 병합용 조각**이다. `__OWNER_GOOGLE_EMAIL__`은 준비 화면이 기존 규칙의 사장님 이메일로 치환한다. 조각 전체를 현재 콘솔에 단독으로 덮어쓰지 않는다. 최상위 읽기·쓰기 권한은 하위에서 취소할 수 없기 때문에 병합 도우미가 광역 허용을 발견하면 중단한다.

## 규칙이 보장하는 범위

- 새 UUID 경로 작성만 허용한다. 고객과 일반 클라이언트는 기존 편지 수정·덮어쓰기·삭제를 할 수 없다.
- 읽기는 지정한 이메일의 **이메일 확인이 끝난 Google 로그인**만 허용한다. 기존 `admins` 목록 전체에는 편지 읽기를 허용하지 않는다.
- 편지는 관리 화면에서도 기본 읽기 전용이다. 현재 요청에 없는 고객 내용 수정·삭제 권한을 새로 열지 않는다. Firebase 콘솔 관리자의 권한은 별도다.
- 필수 칸·허용 칸·자료형·개별 길이·문항 선택지·동의 값·서버 시각을 검사한다. 이름·본문은 해당 타자기 허용 글자만 받는다. 봉투는 현재 `basic`, 겉이름은 `false`만 허용한다.
- Realtime Database 정규식의 `\n`은 JavaScript와 다르게 문자 `n`으로 해석될 수 있다. 본문 검사는 문자열 `replace('\n', ' ')`로 실제 줄바꿈만 공백으로 치환한 뒤 허용문자와 앞뒤 공백을 뺀 최소 10자를 검사한다. 저장되는 원문과 줄바꿈은 바꾸지 않는다. 이름에는 줄바꿈을 허용하지 않는다.
- `letterIntake` 서버 스위치와 코드의 미리보기 스위치가 모두 열려야 전송한다. 공개 스위치만으로 실제 규칙 검증을 대신하지 않는다.
- 로그인 없는 공개 작성은 주문의 결제 여부 확인이나 요청 횟수 제한을 제공하지 않는다. 주문 확인은 가게의 기존 절차대로 한다. 큰 규모로 공개할 때는 별도의 주문 검증·요청 제한을 검토한다.

## 로컬 검증

`tests/intake-client.test.cjs`는 서버 통신을 가짜 응답으로 시험한다. 운영 Firebase에 접속하지 않는다.

`tests/firebase-rules.test.cjs`는 `127.0.0.1:9005`의 공식 Realtime Database Emulator만 사용한다. 테스트 전용 프로젝트 이름과 가상 이메일·가상 편지를 사용한다. 실서버 URL을 받지 않는다. 공식 에뮬레이터 버전·다운로드 검증값과 시험 결과는 검수 기록에 남긴다.

```sh
node --test tests/intake-client.test.cjs
node tests/firebase-rules.test.cjs
```

## 공식 문서

- 인증 없는 REST 접근과 보안 규칙: https://firebase.google.com/docs/database/rest/auth
- REST 저장 응답·서버 시각: https://firebase.google.com/docs/database/rest/save-data
- 새 데이터 검사·필드 허용목록: https://firebase.google.com/docs/database/security/rules-conditions
- 상위 권한 상속: https://firebase.google.com/docs/database/security/core-syntax
- Google 로그인 확인 속성: https://firebase.google.com/docs/reference/security/database#authtoken
