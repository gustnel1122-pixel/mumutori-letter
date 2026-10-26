(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  $('prepare').addEventListener('click', async function () {
    $('error').hidden = true; $('result').hidden = true; $('prepare').disabled = true;
    try {
      if (!$('current').value.trim() || $('current').value.length > 300000) throw Error('현재 콘솔 규칙 전체를 붙여넣어 주세요(300KB 이하).');
      var response = await fetch('letters.rules.json', { credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw Error('레터 규칙을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.');
      var result = LetterRules.merge(LetterRules.parse($('current').value), await response.json(), $('owner').value);
      $('output').value = JSON.stringify(result.rules, null, 2);
      $('summary').textContent = '바뀐 경로: letters, letterIntake. 편지를 읽을 계정: ' + result.ownerEmail + '. 나머지 기존 경로는 보존했습니다.';
      $('result').hidden = false; $('output').focus(); $('copy-status').textContent = '';
    } catch (e) { $('error').textContent = e.message; $('error').hidden = false; $('current').focus(); }
    finally { $('prepare').disabled = false; }
  });
  $('copy').addEventListener('click', async function () {
    try { await navigator.clipboard.writeText($('output').value); $('copy-status').textContent = '복사했어요. Firebase 콘솔 규칙 칸에 붙여넣고 게시해 주세요.'; }
    catch (e) { $('output').focus(); $('output').select(); $('copy-status').textContent = '내용을 선택했어요. 복사 단축키로 복사해 주세요.'; }
  });
})();
