/* 현재 콘솔 규칙을 유지하며 레터 세 경로만 병합. 외부 전송·자동 배포 없음. */
(function (global) {
  'use strict';
  function parse(text) {
    // Firebase 콘솔의 // 및 /* */ 주석만 제거한다. 문자열 안의 URL은 보존한다.
    var out = '', quoted = false, escaped = false, line = false, block = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i], n = text[i + 1];
      if (line) { if (c === '\n') { line = false; out += c; } continue; }
      if (block) { if (c === '*' && n === '/') { block = false; i++; } else if (c === '\n') out += c; continue; }
      if (quoted) { out += c; if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
      if (c === '"') { quoted = true; out += c; }
      else if (c === '/' && n === '/') { line = true; i++; }
      else if (c === '/' && n === '*') { block = true; i++; }
      else out += c;
    }
    if (block || quoted) throw Error('규칙의 따옴표나 주석이 닫히지 않았어요. 콘솔의 규칙 전체를 다시 복사해 주세요.');
    return JSON.parse(out);
  }
  function inferOwner(live) {
    var text = JSON.stringify(live), values = [], match;
    var re = /auth\.token\.email\s*={2,3}\s*'([^']+)'/g;
    while ((match = re.exec(text))) if (match[1] !== '__OWNER_GOOGLE_EMAIL__' && values.indexOf(match[1]) < 0) values.push(match[1]);
    return values.length === 1 ? values[0] : '';
  }
  function merge(live, fragment, ownerEmail) {
    if (!live || !live.rules || typeof live.rules !== 'object' || Array.isArray(live.rules)) throw Error('최상위 rules가 있는 현재 규칙 전체가 필요해요.');
    ['.read', '.write'].forEach(function (k) {
      var v = live.rules[k];
      if (v !== undefined && v !== false && v !== 'false') throw Error('맨 위의 ' + k + ' 규칙이 하위 편지 규칙보다 넓은 권한을 줄 수 있어요. 자동 병합을 멈췄어요. 현재 규칙을 담당자에게 검토받아 주세요.');
    });
    if (!fragment || !fragment.rules || !fragment.rules.letters || !fragment.rules.letterIntake || !fragment.rules.letterReceiptChecks || Object.keys(fragment.rules).length !== 3) throw Error('레터 규칙 파일을 확인하지 못했어요.');
    var owner = (ownerEmail || inferOwner(live)).trim();
    if (!/^[^\s@<>"'\\]+@[^\s@<>"'\\]+\.[^\s@<>"'\\]+$/.test(owner)) throw Error('사장님 구글 계정 이메일을 이 화면에 적어 주세요. 키나 비밀번호는 적지 마세요.');
    var copy = JSON.parse(JSON.stringify(live));
    function replace(value) {
      if (typeof value === 'string') return value.replace(/__OWNER_GOOGLE_EMAIL__/g, owner);
      if (value && typeof value === 'object') Object.keys(value).forEach(function (k) { value[k] = replace(value[k]); });
      return value;
    }
    var next = replace(JSON.parse(JSON.stringify(fragment.rules)));
    if (copy.rules.letters && copy.rules.letters.$id) {
      var priorTemplate = JSON.parse(JSON.stringify(next.letters));
      delete priorTemplate.$id.receiptHash;
      var currentLetters = JSON.stringify(copy.rules.letters);
      if (currentLetters !== JSON.stringify(priorTemplate) && currentLetters !== JSON.stringify(next.letters)) throw Error('현재 편지 규칙에 다른 권한이나 내용이 있어 자동 덮어쓰기를 중단했어요. 담당자가 현재 규칙을 기준으로 검토해 주세요.');
    }
    if (copy.rules.letterIntake && JSON.stringify(copy.rules.letterIntake) !== JSON.stringify(next.letterIntake)) throw Error('현재 접수 설정 규칙이 달라 자동 덮어쓰기를 중단했어요. 담당자 검토가 필요해요.');
    if (copy.rules.letterReceiptChecks && JSON.stringify(copy.rules.letterReceiptChecks) !== JSON.stringify(next.letterReceiptChecks)) throw Error('기존 접수 확인 규칙이 있어 자동 병합을 중단했어요. 담당자 검토가 필요해요.');
    copy.rules.letters = next.letters; copy.rules.letterIntake = next.letterIntake; copy.rules.letterReceiptChecks = next.letterReceiptChecks;
    Object.keys(live.rules).forEach(function (k) {
      if (k !== 'letters' && k !== 'letterIntake' && k !== 'letterReceiptChecks' && JSON.stringify(copy.rules[k]) !== JSON.stringify(live.rules[k])) throw Error('기존 규칙을 그대로 보존하지 못해 중단했어요.');
    });
    return { rules: copy, ownerEmail: owner, changedPaths: ['letters', 'letterIntake', 'letterReceiptChecks'] };
  }
  var api = { parse: parse, merge: merge, inferOwner: inferOwner };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.LetterRules = api;
})(typeof window === 'undefined' ? globalThis : window);
