/* 무무토리 레터 — '검사하기' (2026-11-02 사장님: "자동 줄바꿈 · 띄어쓰기 · 맞춤법 검사, 누르면 고치지 말고 표시만")
 * 이 기기 안에서만 돈다. 편지 글을 어디에도 보내지 않는다. 고치지 않고 위치와 짧은 안내만 돌려준다.
 * 자주 틀리는 것만 살핀다(목록 · 간단한 규칙). 모든 맞춤법을 잡지는 못한다.
 * 돌려주는 값: [{ start, end, kind: "spell" | "space" | "punct" | "line", msg }] (start/end = 본문 글자 위치, UTF-16)
 */
window.LetterCheck = (function () {
  // 자주 틀리는 말: [틀린 말, 바른 말, 확실하지 않으면 true(“혹시”로 안내)]
  var SPELL = [
    ["되요", "돼요"], ["되서", "돼서"], ["됬", "됐"], ["뵈요", "봬요"], ["않돼", "안 돼"], ["몇일", "며칠"], ["어떻해", "어떡해"],
    ["오랫만", "오랜만"], ["금새", "금세"], ["희안", "희한"], ["깨끗히", "깨끗이"], ["일일히", "일일이"], ["곰곰히", "곰곰이"],
    ["틈틈히", "틈틈이"], ["번번히", "번번이"], ["가만이", "가만히"], ["솔직이", "솔직히"], ["웬지", "왠지"], ["왠일", "웬일"],
    ["왠만", "웬만"], ["역활", "역할"], ["설겆이", "설거지"], ["어의없", "어이없"], ["있슴", "있음"], ["없슴", "없음"],
    ["읍니다", "습니다"], ["뭐에요", "뭐예요"], ["아니예요", "아니에요"], ["할려고", "하려고"], ["갈려고", "가려고"],
    ["볼려고", "보려고"], ["내꺼", "내 거"], ["구지", "굳이", true], ["일부로", "일부러", true], ["바램", "바람", true]
  ];
  // 따로 떨어지면 앞말에 붙이는 조사(헷갈리는 이 · 가 · 도 · 의 · 와 · 과 · 만 · 로 · 에 · 보다 · 밖에는 뺌)
  var JOSA = { "은": 1, "는": 1, "을": 1, "를": 1, "에게": 1, "에서": 1, "한테": 1, "께서": 1, "처럼": 1, "부터": 1, "까지": 1, "마다": 1 };
  var GEO = { "는": 1, "던": 1, "을": 1, "할": 1, "갈": 1, "볼": 1, "올": 1, "줄": 1, "될": 1, "살": 1, "한": 1, "된": 1, "간": 1, "본": 1, "온": 1, "준": 1 };
  function fin(ch) { var c = (ch || "").charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? c % 28 : -1; }   // 받침: 0 없음 · 4 ㄴ · 8 ㄹ
  function isSyl(ch) { var c = (ch || "").charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3; }
  function run(text, TW, lineOffset) {
    text = String(text == null ? "" : text);
    var out = [], m;
    function add(s, e, kind, msg) { out.push({ start: s, end: e, kind: kind, msg: msg }); }
    // 1) 맞춤법: 자주 틀리는 말
    SPELL.forEach(function (r) {
      var i = -1;
      while ((i = text.indexOf(r[0], i + 1)) > -1) add(i, i + r[0].length, "spell", (r[2] ? "혹시 '" : "'") + r[0] + "' → '" + r[1] + "'" + (r[2] ? "?" : ""));
    });
    // 2) 띄어쓰기: 낱말 하나씩
    var wre = /[^ \n]+/g;
    while ((m = wre.exec(text))) {
      var w = m[0], at = m.index, n = w.length;
      if (JOSA[w] && at > 0 && text[at - 1] === " " && isSyl(text[at - 2])) add(at - 1, at + n, "space", "'" + w + "'은 앞말에 붙여 써요");
      for (var i = 1; i < n; i++) {
        var ch = w[i], prev = w[i - 1], next = w[i + 1] || "", f = fin(prev), seg = function (a, b) { return w.slice(a, b); };
        if (ch === "것" && (prev === "는" || prev === "던" || f === 4 || f === 8)) add(at + i - 1, at + i + 1, "space", "'" + seg(i - 1, i + 1) + "' → '" + prev + " 것'");
        else if (ch === "거" && GEO[prev] && /^(야|예|에요|지|면|라|니|같|고|를|가|는|다|잖|든)/.test(w.slice(i + 1))) add(at + i - 1, at + i + 1, "space", "'" + seg(i - 1, i + 1) + "' → '" + prev + " 거'");
        else if (ch === "수" && f === 8 && next !== "록" && (!next || /[있없도는가밖]/.test(next))) add(at + i - 1, at + i + 1, "space", "'" + seg(i - 1, i + 1) + "' → '" + prev + " 수'");
        else if (ch === "때" && next === "문") add(at + i, at + i + 2, "space", "'" + seg(0, i + 2) + "' → '" + seg(0, i) + " 때문'");
        else if (ch === "때" && f === 8) add(at + i - 1, at + i + 1, "space", "'" + seg(i - 1, i + 1) + "' → '" + prev + " 때'");
        else if (ch === "줄" && f === 8 && /[알몰]/.test(next)) add(at + i - 1, at + i + 1, "space", "'" + seg(i - 1, i + 1) + "' → '" + prev + " 줄'");
        else if (ch === "싶" && prev === "고" && i >= 2) add(at + i - 1, at + i + 1, "space", "'" + seg(i - 2, i + 1) + "' → '" + seg(i - 2, i) + " 싶'");
        else if (ch === "께" && f === 8 && (!next || next === "요")) add(at + i - 1, at + i + 1, "spell", "'" + seg(i - 1, i + 1) + "' → '" + prev + "게'");
        else if (ch === "껄" && f === 8) add(at + i - 1, at + i + 1, "spell", "'" + seg(i - 1, i + 1) + "' → '" + prev + "걸'");
        else if (ch === "꺼" && f === 8) add(at + i - 1, at + i + 1, "spell", "'" + seg(i - 1, i + 1) + "' → '" + prev + " 거'");
        else if (ch === "지" && i === n - 1 && f === 4 && /^ (\d|한 |두 |세 |네 |몇|오래|꽤|벌써)/.test(text.slice(at + n, at + n + 4))) add(at + i - 1, at + i + 1, "space", "'" + seg(i - 1, i + 1) + "' → '" + prev + " 지' (시간이 지난 만큼)");
      }
    }
    // 3) 문장부호 둘레 띄어쓰기
    var pre = / +(?=[,!?)]|\.(?!\.))/g;
    while ((m = pre.exec(text))) if (m.index > 0 && text[m.index - 1] !== "\n") add(m.index, m.index + m[0].length + 1, "punct", "문장부호 앞은 붙여 써요");
    var dbl = /([^ \n])( {2,})(?=[^ \n])/g;
    while ((m = dbl.exec(text))) add(m.index + 1, m.index + 1 + m[2].length, "punct", "띄어쓰기가 " + m[2].length + "번 들어갔어요");
    var aft = /[.!?,](?=[가-힣])/g;
    while ((m = aft.exec(text))) add(m.index, m.index + 2, "punct", "문장부호 뒤는 띄어 쓰면 읽기 편해요");
    // 4) 줄 나눔 (편지지에 찍힐 줄 그대로)
    if (TW) {
      var lines = TW.layout(text);
      lines.forEach(function (l, k) {
        if (!l.text) return;
        var paraStart = l.start === 0 || text[l.start - 1] === "\n", nextL = lines[k + 1];
        var paraEnd = !nextL || text[nextL.start - 1] === "\n" || nextL.start >= text.length;
        if (!paraStart && paraEnd && TW.cells(l.text) <= 3) add(l.start, l.start + l.text.length, "line", "짧은 말 하나만 다음 줄로 넘어갔어요. 앞을 조금 줄이거나 늘리면 보기 좋아요");
        if (/^[.,!?):]/.test(l.text.replace(/^ +/, ""))) add(l.start, l.start + 1, "line", "줄이 문장부호로 시작해요");
        if (!paraStart && l.start > 0 && text[l.start - 1] !== " " && !TW.canBreak(text[l.start - 1], text[l.start])) add(l.start - 1, l.start + 1, "line", "띄어쓰기 없이 긴 말이 줄 끝에서 잘렸어요");
      });
      // 줄 번호(편지지 기준)
      out.forEach(function (it) {
        for (var k = lines.length - 1; k >= 0; k--) if (lines[k].start <= it.start) { it.line = k + 1 + (lineOffset || 0); break; }
      });
    }
    // 겹치는 표시는 앞의 것만
    out.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
    var keep = [], last = -1;
    out.forEach(function (it) { if (it.start >= last) { keep.push(it); last = it.end; } });
    return keep;
  }
  return { run: run };
})();
