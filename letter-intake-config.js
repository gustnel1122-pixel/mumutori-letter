/* 고객 접수 설정. API 키·비밀번호·관리자 자격증명은 사용하지 않는다.
 * 실제 콘솔 규칙과 차단 시험이 확인되기 전에는 enabled를 바꾸지 않는다.
 * 자세한 적용 순서: firebase/README.md
 */
window.LETTER_INTAKE_CONFIG = Object.freeze({
  enabled: false,
  databaseURL: 'https://mumutori-letter-default-rtdb.asia-southeast1.firebasedatabase.app',
  rulesVersion: 'letter-v1-20261026',
  gatePath: 'letterIntake',
  timeoutMs: 15000
});
