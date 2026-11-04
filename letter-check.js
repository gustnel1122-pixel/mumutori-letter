/* 무무토리 레터 — '검사하기' (2026-11-02 사장님: "자동 줄바꿈 · 띄어쓰기 · 맞춤법 검사, 누르면 고치지 말고 표시만")
 * 기본은 이 기기 안에서만 돈다. 고치지 않고 위치와 짧은 안내만 돌려준다.
 * AI 검사(11/4 사장님 "claude 검사 붙이자 우리 api 써서"): 설정(letter-check-config.js)이 켜져 있고 손님이 'AI로 검사하기'를 고를 때만
 *   편지 본문을 레터 검사 서버(Apps Script → Claude)로 보낸다. 서버는 글을 저장하지 않는다. 돌아온 것도 표시만 한다.
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
  // 띄어 쓰는 꾸밈말(11/4) — 뒤에 붙어도 되는 말은 ADV_OK 로 뺀다
  var ADV = ["너무", "정말", "진짜", "아주", "항상", "매일", "다시", "많이", "제일", "가장", "더욱", "조금", "벌써", "모두", "서로"];
  var ADV_OK = /^(너무(나|도|해|하|한|했|할|함)|정말(로|요|이|은|인|이야|이에요)|진짜(로|요|야|는|인|가|배기|예요|이)|아주(머니|버님|까|요)|항상(은|요|이)|매일(매일|은|요|같|의|이)|다시(마|금|는|요|한번)|많이(도|요|는)|제일(가|로|은|요|이)|가장(자리|은|요|이)|더욱(이|더|요)|조금(씩|만|은|이|요|도)|벌써(요|부터)|모두(들|의|가|를|에게|요|는|도|와|랑)|서로(의|가|를|에게|요|서로|는|도))/;
  function fin(ch) { var c = (ch || "").charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? c % 28 : -1; }   // 받침: 0 없음 · 4 ㄴ · 8 ㄹ
  function isSyl(ch) { var c = (ch || "").charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3; }
  function run(text, TW, lineOffset, extra) {
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
      // 낱말 끝 문장부호는 떼고 본다(11/4 사장님 미리보기 — "만날께." 처럼 마침표가 붙으면 못 잡던 것)
      var w = m[0].replace(/[.,!?~…"'”’)\]]+$/, ""), at = m.index, n = w.length;
      if (!n) continue;
      // 자주 붙여 쓰는 꾸밈말(너무좋다 → 너무 좋다). 한 낱말로 쓰는 말(너무하다 · 다시마 · 이미지 등)은 뺀다
      for (var k = 0; k < ADV.length; k++) {
        var A = ADV[k];
        if (n > A.length && w.indexOf(A) === 0 && isSyl(w[A.length]) && !ADV_OK.test(w)) { add(at, at + n, "space", "'" + w + "' → '" + A + " " + w.slice(A.length) + "'"); break; }
      }
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
    // AI 검사가 찾은 곳(있으면) — 같은 자리는 아래 '겹치는 표시'에서 하나만 남는다
    (extra || []).forEach(function (it) { if (it && it.end > it.start && it.end <= text.length) out.push({ start: it.start, end: it.end, kind: it.kind, msg: it.msg, ai: true }); });
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
  /* ---------- AI 검사 (설정이 켜져 있고 손님이 고를 때만) ---------- */
  var CFG = window.LETTER_CHECK_CONFIG || {};
  var EP = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
  var OK_CHARS = /^[가-힣ㄱ-ㅎㅏ-ㅣ0-9 \n.,!?"()\-:₩$%\/×+]*$/;
  var CONSENT = "mmt-letter-ai-check", consentMem = "";
  var ai = { text: null, items: [], state: "idle", err: "", used: 0 };   // state: idle · busy · done · fail
  function aiOn() { return CFG.ai === true && EP.test(CFG.endpoint || ""); }
  function getConsent() { try { return localStorage.getItem(CONSENT) || consentMem; } catch (_) { return consentMem; } }
  function setConsent(v) { consentMem = v; try { localStorage.setItem(CONSENT, v); } catch (_) { /* 저장 안 돼도 이번 방문은 기억 */ } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function request(text) {
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, Math.max(3000, Math.min(+CFG.timeoutMs || 15000, 30000)));
    var body = new URLSearchParams(); body.set("type", "letterCheck"); body.set("text", text);
    return fetch(CFG.endpoint, { method: "POST", body: body, signal: ctl ? ctl.signal : undefined, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (v) { clearTimeout(timer); return v; }, function (e) { clearTimeout(timer); throw e; });
  }
  // 검사 시작. done 은 상태가 바뀔 때마다 불린다(화면 다시 그리기).
  function aiStart(text, done) {
    text = String(text || "");
    var redraw = function () { if (typeof done === "function") done(); };
    if (!aiOn() || getConsent() !== "yes") return false;
    if (ai.state === "busy") return true;
    if (ai.text === text && ai.state === "done") { redraw(); return true; }
    var why = text.trim().length < 2 ? "SHORT" : text.length > 700 ? "TOO_LONG" : !OK_CHARS.test(text) ? "BAD_CHARS" : ai.used >= (+CFG.maxPerVisit || 8) ? "LIMIT" : "";
    if (why) { ai.state = "fail"; ai.err = why; redraw(); return false; }
    ai.used++; ai.state = "busy"; ai.err = ""; redraw();
    request(text).then(function (v) {
      if (v && v.ok === true && Array.isArray(v.items)) { ai.text = text; ai.items = v.items.slice(0, 20); ai.state = "done"; }
      else { ai.state = "fail"; ai.err = (v && typeof v.code === "string" && v.code) || "ERROR"; }
    }, function () { ai.state = "fail"; ai.err = "NETWORK"; }).then(redraw);
    return true;
  }
  // 지금 글에서 AI가 짚은 조각이 있는 자리(글을 고쳐도 남아 있는 조각만)
  function aiFor(text) {
    var res = [];
    if (!aiOn() || !ai.items.length) return res;
    ai.items.forEach(function (it) {
      if (!it || typeof it.wrong !== "string" || !it.wrong || typeof it.right !== "string") return;
      var i = -1;
      while ((i = text.indexOf(it.wrong, i + 1)) > -1) res.push({ start: i, end: i + it.wrong.length, kind: it.kind === "space" ? "space" : "spell", msg: "'" + it.wrong + "' → '" + it.right + "'" + (it.why ? " · " + it.why : "") });
    });
    return res;
  }
  var FAIL = {
    BUDGET: "오늘은 AI 검사를 더 쓸 수 없어요. 휴대폰 안 검사 결과만 보여요.", OFF: "지금은 AI 검사를 쉬고 있어요. 휴대폰 안 검사 결과만 보여요.",
    LIMIT: "AI 검사는 한 번 들어오실 때 " + (+CFG.maxPerVisit || 8) + "번까지예요.", BAD_CHARS: "타자기로 찍을 수 없는 글자를 먼저 고치면 AI로 검사할 수 있어요.",
    TOO_LONG: "글이 길어서 AI 검사를 못 했어요.", SHORT: "글을 조금 더 쓰면 AI로 검사할 수 있어요."
  };
  // 검사 결과 칸 위에 붙는 AI 안내(묻기 · 살펴보는 중 · 결과 · 다시 검사)
  function aiPanel(text) {
    if (!aiOn()) return "";
    var c = getConsent();
    if (!c) return '<div class="ai-ask"><p><b>AI로 더 꼼꼼히 볼까요?</b> 지금은 자주 틀리는 것만 살펴봐요. AI 검사를 고르면 검사를 위해 편지 글이 AI(Anthropic Claude · 해외 서버)로 잠깐 보내져요. 무무토리는 글을 저장하지 않아요.</p><div class="ai-btns"><button type="button" class="btn-s ai-yes" data-ai="yes">AI로 검사하기</button><button type="button" class="ai-link" data-ai="no">이 휴대폰 안에서만</button></div></div>';
    if (c !== "yes") return '<p class="ai-line">이 휴대폰 안에서만 살펴봤어요. <button type="button" class="ai-link" data-ai="yes">AI로도 검사하기</button></p>';
    if (ai.state === "busy") return '<p class="ai-line busy" role="status">AI가 꼼꼼히 살펴보는 중이에요…</p>';
    if (ai.state === "fail") return '<p class="ai-line">' + esc(FAIL[ai.err] || "AI 검사가 잠깐 안 돼요.") + (FAIL[ai.err] && ai.err !== "SHORT" && ai.err !== "BAD_CHARS" ? "" : ' <button type="button" class="ai-link" data-ai="again">다시 해 보기</button>') + "</p>";
    if (ai.state === "done" && ai.text === text) return '<p class="ai-line ok">AI와 함께 살펴봤어요.</p>';
    if (ai.state === "done") return '<p class="ai-line">글을 고쳤어요. <button type="button" class="ai-link" data-ai="again">AI로 다시 검사</button></p>';
    return '<p class="ai-line"><button type="button" class="ai-link" data-ai="again">AI로 검사하기</button></p>';
  }
  function emptyMsg(text) {
    return aiOn() && ai.state === "done" && ai.text === text ? "AI와 함께 살펴봤는데 표시할 곳이 없어요." : ai.state === "busy" ? "휴대폰 안 검사로는 표시할 곳이 없어요. AI 결과를 기다려 주세요." : "표시할 곳을 찾지 못했어요. 자주 틀리는 것만 살펴봐요.";
  }
  function aiAction(act, text, done) {
    if (act === "no") { setConsent("no"); if (typeof done === "function") done(); return; }
    if (act === "yes") setConsent("yes");
    if (act === "again" && ai.state === "fail") ai.state = "idle";
    aiStart(text, done);
  }
  // AI가 켜져 있으면 버튼 옆 안내를 바꾼다(글이 밖으로 안 나간다는 말이 틀리지 않게)
  if (aiOn()) {
    var note = document.querySelector(".chk-note");
    if (note) note.innerHTML = "줄 나눔 · 띄어쓰기 · 맞춤법을 <b>표시만</b> 해요. 고칠지는 직접 정해 주세요. AI 검사를 고르실 때만 글이 검사를 위해 잠깐 보내져요(저장 안 함).";
  }
  return { run: run, aiOn: aiOn, aiStart: aiStart, aiFor: aiFor, aiPanel: aiPanel, aiAction: aiAction, emptyMsg: emptyMsg };
})();
