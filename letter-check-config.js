/* 레터 '검사하기' AI 설정 (2026-11-04).
 * 배포 담당이 레터 검사 Apps Script(따로 만든 작은 프로젝트)를 웹앱으로 올린 뒤 endpoint 에 그 주소를 넣고 ai 를 true 로 바꾼다.
 * endpoint 가 비어 있거나 ai 가 false 이면 지금처럼 휴대폰 안 검사만 한다. 키 · 비밀값은 여기 넣지 않는다(키는 Apps Script 안에만).
 */
window.LETTER_CHECK_CONFIG = Object.freeze({
  ai: true,
  endpoint: 'https://script.google.com/macros/s/AKfycbxZVNaGfyrNK_JJJguuqjBiz1w98Ht6GtTdPK4z6uU8Sas5nxsC2sLpAOXBDxhQz7tB5w/exec',
  timeoutMs: 15000,
  maxPerVisit: 8
});
