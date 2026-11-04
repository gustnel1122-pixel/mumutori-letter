/* 무무토리 자사몰 '돌아다니는 도토리 상담원' — letter.mumutori.com/dotori/widget.js
 * 식스샵 코드 넣기(본문 끝)에 <script src="https://letter.mumutori.com/dotori/widget.js" defer></script> 한 줄
 * 시험 중엔 주소 끝에 ?dotori=1 을 붙인 사람에게만 보여요 (SHOW_ALL=false). '올려' 뒤 true로.
 * 만든 날: 2026-11-04 (총괄)
 */
(function () {
  var SHOW_ALL = false;
  var EXEC = 'https://script.google.com/macros/s/AKfycbxKJ466_i_oiyyea3I7Wa2ewlQdKYholPRm0vDGjaX3cnvRMtw8HbqlrlvNqstvQGaR/exec';   // 배포 담당이 Apps Script 웹 앱 주소로 바꿔 넣어요 (보고판 · 채팅에 적지 않기)
  var FACE = 'https://letter.mumutori.com/dotori/face/';
  var IMG = FACE + 'base.webp';   // 3D 도토리 원본 220px (표정 그림과 같은 자리 · 같은 크기)
  var FACES = { base: IMG, sleep: FACE + 'sleep.webp', happy: FACE + 'happy.webp', surprised: FACE + 'surprised.webp', tired: FACE + 'tired.webp' };
  var TYPING = FACE + 'typing.webp';   // 타자 치는 3D 도토리 (셔터 그림 그대로)
  var RIGU = 'https://letter.mumutori.com/dotori/rig/';
  var RIG = { cw: 220, ch: 235, parts: {"body": {"x": 4, "y": 75, "w": 208, "h": 159, "px": 114.1, "py": 231.0}, "cap": {"x": 1, "y": 1, "w": 207, "h": 145, "px": 109.7, "py": 125.1}, "handL": {"x": 18, "y": 164, "w": 40, "h": 49, "px": 48.3, "py": 174.5}, "handR": {"x": 190, "y": 151, "w": 29, "h": 41, "px": 198.6, "py": 164.6}},
    src: { cap: RIGU + 'cap.webp', handL: RIGU + 'handL.webp', handR: RIGU + 'handR.webp' },
    faces: { base: RIGU + 'body_base.webp', sleep: RIGU + 'body_sleep.webp', happy: RIGU + 'body_happy.webp', surprised: RIGU + 'body_surprised.webp', tired: RIGU + 'body_tired.webp' } };   // 원본 3D를 몸 · 모자 · 손으로 나눈 그림 (11/4 관절 애니메이션)
  try {
    if (/[?&]dotori=1/.test(location.search)) sessionStorage.setItem('dotori-test', '1');
    if (!SHOW_ALL && sessionStorage.getItem('dotori-test') !== '1') return;
  } catch (e) { if (!SHOW_ALL) return; }
  if (window.__dotoriLoaded) return; window.__dotoriLoaded = true;
  var font = document.createElement('link'); font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap'; document.head.appendChild(font);
  var st = document.createElement('style'); st.textContent = ".dt,.dw-panel{--page:#EFE8DE;--bg:#FCF7E5;--panel:#FFFDF7;--butter:#F4DC92;--butter-2:#F9EBC1;--ink:#4A2410;--ink-2:#7C4223;--line:#EBDDB0;--user:#7C4223;--user-ink:#FFF8EA;--accent:#9F5528;--accent-ink:#FFFBF2;--muted:#8F7052;--kakao:#FEE500;--kakao-ink:#191600;--shadow:0 12px 34px rgba(74,36,16,.22);color-scheme:light}\n.dt,.dt *,.dw,.dw *,.dw-say{box-sizing:border-box}\n.dt{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--bg);color:var(--ink);font-family:\"Gowun Dodum\",\"Apple SD Gothic Neo\",\"Malgun Gothic\",\"Noto Sans KR\",system-ui,sans-serif;font-size:15.5px;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}\n.dt-top{display:flex;align-items:center;gap:10px;padding:12px 12px 11px 14px;border-bottom:1.5px dashed var(--line)}\n.dt-av{width:40px;height:auto;flex:none}\n.dt-tt{display:flex;flex-direction:column;min-width:0;line-height:1.25}\n.dt-tt b{font-family:\"Jua\",\"Gowun Dodum\",system-ui,sans-serif;font-weight:400;font-size:19px;color:var(--ink-2)}\n.dt-tt span{font-size:12px;color:var(--muted)}\n.dt-badge{margin-left:auto;font-size:11.5px;padding:2px 9px;border-radius:999px;background:var(--butter-2);color:var(--ink-2);border:1px solid var(--line);white-space:nowrap}\n.dt-x{flex:none;width:34px;height:34px;border-radius:50%;border:0;background:transparent;color:var(--ink-2);font-size:20px;line-height:1;cursor:pointer}\n.dt-top .dt-x:first-of-type{margin-left:auto}\n.dt-badge~.dt-x{margin-left:2px}\n.dt-x:hover{background:var(--butter-2)}\n.dt-vp{flex:1;min-height:0;overflow-y:auto;padding:16px 14px 10px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}\n.dt-row{display:flex;gap:8px;align-items:flex-start;min-width:0}\n.dt-row.me{justify-content:flex-end}\n.dt-mini{width:30px;height:auto;flex:none;margin-top:2px}\n.dt-b{padding:10px 13px;border-radius:16px;max-width:84%;min-width:0;white-space:pre-wrap}\n.dt-row.bot .dt-b{background:var(--panel);border:1px solid var(--line);border-top-left-radius:6px}\n.dt-row.me .dt-b{background:var(--user);color:var(--user-ink);border-top-right-radius:6px}\n.dt-row.think .dt-b{color:var(--muted)}\n.dt-dots{display:inline-flex;gap:3px;margin-left:4px;vertical-align:middle}\n.dt-dots i{width:5px;height:5px;border-radius:50%;background:var(--muted);animation:dt-bl 1.1s infinite ease-in-out}\n.dt-dots i:nth-child(2){animation-delay:.15s}.dt-dots i:nth-child(3){animation-delay:.3s}\n@keyframes dt-bl{0%,80%,100%{opacity:.25}40%{opacity:1}}\n.dt-note{font-size:12px;color:var(--muted);text-align:right;margin-top:-7px}\n.dt-chips{display:flex;flex-wrap:wrap;gap:7px;padding-left:38px}\n.dt-chip{border:1px solid var(--line);background:var(--panel);color:var(--ink-2);border-radius:999px;padding:6px 12px;font:inherit;font-size:14px;line-height:1.4;cursor:pointer}\n.dt-chip:hover{background:var(--butter-2)}\n.dt-kk{display:inline-flex;align-items:center;gap:6px;background:var(--kakao);color:var(--kakao-ink);border-radius:999px;padding:7px 13px;font-size:14px;line-height:1.3;text-decoration:none;font-weight:700;white-space:nowrap}\n.dt-kk svg{width:16px;height:16px;flex:none}\n.dt-b .dt-kk{margin-top:9px;white-space:normal}\n.dt-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 14px;border-top:1px solid var(--line);background:var(--butter-2)}\n.dt-bar span{font-size:12px;color:var(--muted);min-width:0}\n.dt-in{display:flex;gap:8px;align-items:flex-end;padding:10px 14px 6px}\n.dt-in textarea{flex:1;min-width:0;resize:none;border:1.5px solid var(--line);border-radius:20px;padding:10px 14px;font:inherit;font-size:15.5px;line-height:1.45;background:var(--panel);color:var(--ink);max-height:120px}\n.dt-in textarea::placeholder{color:var(--muted)}\n.dt-in textarea:focus{outline:none;border-color:var(--accent)}\n.dt-send{flex:none;height:44px;padding:0 17px;border-radius:22px;border:0;background:var(--accent);color:var(--accent-ink);font:inherit;font-size:15px;cursor:pointer}\n.dt-send:disabled{opacity:.4;cursor:default}\n.dt-send.stop{background:var(--ink-2)}\n.dt-foot{margin:0;padding:2px 14px 10px;font-size:11.5px;color:var(--muted);text-align:center}\n.dt-fab{display:inline-flex;align-items:center;gap:8px;padding:5px 16px 5px 5px;border-radius:999px;border:0;background:var(--user);color:var(--user-ink);box-shadow:var(--shadow);font-family:\"Jua\",\"Gowun Dodum\",system-ui,sans-serif;font-size:16px;cursor:pointer}\n.dt-fab img{width:42px;height:42px;border-radius:50%;background:var(--butter-2);object-fit:contain;padding:3px}\n\n/* 돌아다니는 도토리 — 자사몰 위에 떠 있는 층 (손님 화면은 가리지 않게 도토리 몸만 눌림) */\n.dw{position:fixed;left:0;top:0;width:64px;height:68px;z-index:2147483000;border:0;padding:0;margin:0;background:transparent;cursor:pointer;will-change:transform;-webkit-tap-highlight-color:transparent}\n.dw:focus-visible{outline:3px solid #9F5528;outline-offset:3px;border-radius:50%}\n.dw-body{position:absolute;inset:0;transform-origin:50% 92%;will-change:transform}\n.dw-body img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;user-select:none;-webkit-user-drag:none;filter:drop-shadow(0 4px 3px rgba(74,36,16,.22))}\n.dw-rig{position:absolute;inset:0;transform-origin:50% 100%;filter:drop-shadow(0 4px 3px rgba(74,36,16,.22));will-change:transform}.dw-body .dw-rig img{position:absolute;display:block;max-width:none;object-fit:fill;filter:none;pointer-events:none;user-select:none;-webkit-user-drag:none;will-change:transform}.dw-shadow{position:absolute;left:14px;right:14px;bottom:-4px;height:7px;border-radius:50%;background:rgba(74,36,16,.18);transform-origin:50% 50%}\n.dw-mark{position:absolute;top:-14px;right:-6px;font:700 17px/1 \"Jua\",\"Gowun Dodum\",system-ui,sans-serif;color:#9F5528;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s;pointer-events:none;white-space:nowrap}\n.dw-mark.on{opacity:1;transform:none}\n.dw-dust{position:fixed;left:0;top:0;width:10px;height:10px;border-radius:50%;background:rgba(160,120,80,.35);pointer-events:none;z-index:2147482999;animation:dw-dust .55s ease-out forwards}\n@keyframes dw-dust{to{opacity:0;transform:var(--t) scale(2.2)}}\n.dw-say{position:fixed;left:0;top:0;z-index:2147483001;max-width:min(240px,calc(100vw - 32px));background:#FFFDF7;color:#4A2410;border:1px solid #EBDDB0;border-radius:14px;padding:8px 12px;font:15px/1.45 \"Gowun Dodum\",\"Apple SD Gothic Neo\",\"Malgun Gothic\",\"Noto Sans KR\",system-ui,sans-serif;box-shadow:0 8px 20px rgba(74,36,16,.16);pointer-events:none;opacity:0;transition:opacity .25s;word-break:keep-all}\n.dw-say.on{opacity:1}\n.dw-panel{position:fixed;z-index:2147483002;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(380px,calc(100vw - 32px));height:min(560px,calc(100dvh - 120px));border-radius:22px;overflow:hidden;box-shadow:0 18px 44px rgba(60,30,10,.32);border:1px solid #EBDDB0;transform-origin:85% 100%;animation:dw-pop .22s ease-out}\n.dw-panel[hidden]{display:none!important}\n@keyframes dw-pop{from{opacity:0;transform:scale(.92) translateY(10px)}}\n@media (max-width:520px){.dw-panel{left:0;right:0;bottom:0;width:100%;height:min(78dvh,620px);border-radius:22px 22px 0 0;border-left:0;border-right:0;border-bottom:0;padding-bottom:env(safe-area-inset-bottom,0px);background:#FCF7E5}}\n.dw-call{position:fixed;z-index:2147483000;right:0;bottom:calc(90px + env(safe-area-inset-bottom,0px));border:0;border-radius:14px 0 0 14px;background:#7C4223;color:#FFF8EA;font:15px/1 \"Jua\",\"Gowun Dodum\",system-ui,sans-serif;padding:10px 10px 10px 12px;box-shadow:0 6px 16px rgba(74,36,16,.25);cursor:pointer}\n.dw-call[hidden]{display:none!important}\n.dw-hide{display:block;margin:0 auto;border:0;background:none;color:#8F7052;font:12px/1.4 inherit;text-decoration:underline;cursor:pointer;padding:0 0 8px}\n.dw[hidden]{display:none!important}\n.dt-mini.typing{width:40px;margin-top:-2px;animation:dt-type .32s steps(2,end) infinite}\n@keyframes dt-type{50%{transform:translateY(-1px) rotate(-2deg)}}\n@media (prefers-reduced-motion:reduce){.dt-mini.typing{animation:none}}\n"; document.head.appendChild(st);
/* 무무토리 자사몰 '도토리 상담원' 위젯 core — 시험판(아티팩트)과 진짜(자사몰)가 같은 화면을 씀. ask()만 바뀜 */
(function () {
  var KAKAO = 'https://pf.kakao.com/_lqpZX/chat';
  var WELCOME = '안녕하세요, 무무토리 상점 도토리예요.\n배송 · 교환 · 선물 포장 · 편지 서비스까지\n궁금한 걸 편하게 물어보세요 🌰';
  var CHIPS = ['배송은 언제 와요?', '교환 · 반품하고 싶어요', '선물 포장 돼요?', '타자기 편지가 뭐예요?', '매장은 어디예요?'];
  var MAX_IN = 400, MAX_TURNS = 10;
  var BUBBLE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7L5.7 21l3.9-2.5c.8.2 1.6.3 2.4.3 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>';

  // 개인정보로 보이는 것은 AI에 보내기 전에 가림 (이메일 · 전화번호 · 주문번호처럼 8자리 넘게 이어진 숫자)
  function mask(s) {
    return s
      .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '(가림)')
      .replace(/\d[\d\s.-]{6,}\d/g, '(가림)');
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function kakaoLink(label) {
    var a = el('a', 'dt-kk');
    a.href = KAKAO; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = BUBBLE_SVG;
    a.appendChild(document.createTextNode(label));
    return a;
  }
  function splitTag(t) {
    var has = /\[카톡\]/.test(t);
    return { text: t.replace(/\s*\[카톡\]\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), kakao: has };
  }

  function mount(root, opts) {
    opts = opts || {};
    var turns = [], busy = false, ctl = null;
    root.classList.add('dt');
    root.innerHTML = '';

    var top = el('div', 'dt-top');
    var av = el('img', 'dt-av'); av.src = opts.img; av.alt = '';
    var tt = el('div', 'dt-tt');
    tt.appendChild(el('b', null, '도토리 상담원'));
    tt.appendChild(el('span', null, '무무토리 상점 · AI가 바로 답해요'));
    top.appendChild(av); top.appendChild(tt);
    if (opts.badge) top.appendChild(el('span', 'dt-badge', opts.badge));
    if (opts.closable) {
      var x = el('button', 'dt-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', '닫기');
      x.onclick = function () { opts.onClose && opts.onClose(); };
      top.appendChild(x);
    }

    var vp = el('div', 'dt-vp'); vp.setAttribute('role', 'log'); vp.setAttribute('aria-live', 'polite');
    var bar = el('div', 'dt-bar');
    bar.appendChild(el('span', null, '사람과 상담 · 평일 9~18시'));
    bar.appendChild(kakaoLink('카카오톡 상담'));
    var form = el('form', 'dt-in');
    var ta = el('textarea'); ta.rows = 1; ta.maxLength = MAX_IN; ta.placeholder = '도토리에게 물어보세요';
    ta.setAttribute('aria-label', '도토리에게 물어볼 말');
    var send = el('button', 'dt-send', '보내기'); send.type = 'submit';
    form.appendChild(ta); form.appendChild(send);
    var foot = el('p', 'dt-foot', opts.foot || 'AI 도토리가 답해요 · 틀릴 수 있어요 · 대화는 저장하지 않아요');
    root.appendChild(top); root.appendChild(vp); root.appendChild(bar); root.appendChild(form); root.appendChild(foot);

    function scroll() { vp.scrollTop = vp.scrollHeight; }
    function botRow() {
      var row = el('div', 'dt-row bot');
      var mi = el('img', 'dt-mini'); mi.src = opts.img; mi.alt = '';
      var b = el('div', 'dt-b');
      row.appendChild(mi); row.appendChild(b); vp.appendChild(row);
      return { row: row, b: b, mi: mi };
    }
    function setBot(b, raw, done) {
      var p = splitTag(raw);
      b.textContent = p.text;
      if (done && p.kakao) { b.appendChild(document.createElement('br')); b.appendChild(kakaoLink('카카오톡으로 이어서 상담하기')); }
    }
    function addMe(text, masked) {
      var row = el('div', 'dt-row me'); row.appendChild(el('div', 'dt-b', text)); vp.appendChild(row);
      if (masked) vp.appendChild(el('div', 'dt-note', '개인정보로 보이는 부분은 가리고 보냈어요'));
    }
    var welcome = botRow(); setBot(welcome.b, WELCOME, true);
    var chips = el('div', 'dt-chips');
    CHIPS.forEach(function (c) {
      var bt = el('button', 'dt-chip', c); bt.type = 'button';
      bt.onclick = function () { ta.value = c; submit(); };
      chips.appendChild(bt);
    });
    vp.appendChild(chips);

    // 시안용: 미리 정한 대화를 그대로 그림 (AI 부르지 않음)
    (opts.demo || []).forEach(function (m) {
      if (chips.parentNode) chips.remove();
      if (m.role === 'user') { var mm = mask(m.content); addMe(mm, mm !== m.content); }
      else setBot(botRow().b, m.content, true);
    });

    function setBusy(v) {
      busy = v; send.textContent = v ? '멈추기' : '보내기'; send.classList.toggle('stop', v);
      send.disabled = !v && !ta.value.trim();
    }
    ta.addEventListener('input', function () {
      ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
      if (!busy) send.disabled = !ta.value.trim();
    });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!busy) submit(); }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); if (busy) { ctl && ctl.abort(); return; } submit(); });
    send.disabled = true;

    async function submit() {
      var raw = ta.value.trim().slice(0, MAX_IN);
      if (!raw || busy || !opts.ask) return;
      if (chips.parentNode) chips.remove();
      var safe = mask(raw);
      addMe(safe, safe !== raw);
      turns.push({ role: 'user', content: safe });
      ta.value = ''; ta.style.height = 'auto';
      var r = botRow(); r.row.classList.add('think');
      if (opts.typingImg) { r.mi.src = opts.typingImg; r.mi.classList.add('typing'); }
      function unType() { if (r.mi.classList.contains('typing')) { r.mi.src = opts.img; r.mi.classList.remove('typing'); } }
      r.b.textContent = opts.typingImg ? '도토리가 타자로 답을 쓰고 있어요' : '도토리가 생각하고 있어요';
      var dots = el('span', 'dt-dots'); dots.innerHTML = '<i></i><i></i><i></i>'; r.b.appendChild(dots);
      scroll();
      ctl = new AbortController(); setBusy(true);
      var got = '';
      try {
        var text = await opts.ask(turns.slice(-MAX_TURNS), function (t) {
          got = t; r.row.classList.remove('think'); unType(); setBot(r.b, t, false); scroll();
        }, ctl.signal);
        r.row.classList.remove('think'); unType(); setBot(r.b, text, true);
        turns.push({ role: 'assistant', content: text });
      } catch (e) {
        r.row.classList.remove('think'); unType();
        var code = e && e.code;
        if (code === 'cancelled' && got) { setBot(r.b, got, true); turns.push({ role: 'assistant', content: got }); }
        else if (code === 'cancelled') { r.row.remove(); turns.pop(); }
        else if (code === 'not_granted') { setBot(r.b, 'AI 답하기를 허용하지 않아서 도토리가 답할 수 없어요.\n화면을 새로 열면 다시 물어봐요.', false); turns.pop(); }
        else if (code === 'limit') { setBot(r.b, '오늘은 도토리가 많이 답해서 잠깐 쉬어요.\n카카오톡 상담으로 남겨 주시면 차례로 답해 드릴게요. [카톡]', true); turns.pop(); }
        else { setBot(r.b, '지금은 도토리가 답하기 어려워요.\n카카오톡 상담으로 남겨 주시면 차례로 답해 드릴게요. [카톡]', true); turns.pop(); }
      } finally {
        setBusy(false); ctl = null; scroll();
      }
    }
    return { focus: function () { ta.focus(); } };
  }
  window.DotoriCS = { mount: mount, mask: mask, KAKAO: KAKAO };
})();

/* 돌아다니는 도토리 — 화면 아래를 걸어 다니고, 스크롤을 따라오고, 누르면 작은 상담창 (원본 3D 그림을 몸 · 모자 · 손으로 나눠 관절처럼 움직임) */
(function () {
  function DotoriWander(opts) {
    var IMG = opts.img;
    var RIG = opts.rig || null;                 // { cw, ch, parts:{body,cap,handL,handR}, src:{cap,handL,handR}, faces:{base,...} }
    var BIG = innerWidth >= 760;                // PC는 조금 크게
    var W_ = RIG ? (BIG ? 78 : 64) : 64, H_ = RIG ? Math.round(W_ * RIG.ch / RIG.cw) : 68;
    // 표정 (원본 3D 그대로 · 눈만 바꾼 그림 — AI 안 씀): base · sleep · happy · surprised · tired
    var FACES = (RIG && RIG.faces) || opts.faces || {}; FACES.base = FACES.base || IMG;
    Object.keys(FACES).forEach(function (k) { var p = new Image(); p.src = FACES[k]; });
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var TIPS = opts.tips || [];

    var btn = document.createElement('button');
    btn.className = 'dw'; btn.type = 'button'; btn.setAttribute('aria-label', 'AI 도토리 상담 열기');
    btn.style.width = W_ + 'px'; btn.style.height = H_ + 'px';
    var R = {};
    if (RIG) {
      btn.innerHTML = '<span class="dw-shadow"></span><span class="dw-body"><span class="dw-rig">' +
        '<img class="r-body" alt=""><img class="r-hr" alt=""><img class="r-hl" alt=""><img class="r-cap" alt=""></span></span><span class="dw-mark"></span>';
      var place = function (el, g) {
        el.style.left = (g.x / RIG.cw * 100) + '%'; el.style.top = (g.y / RIG.ch * 100) + '%';
        el.style.width = (g.w / RIG.cw * 100) + '%'; el.style.height = (g.h / RIG.ch * 100) + '%';
        el.style.transformOrigin = ((g.px - g.x) / g.w * 100) + '% ' + ((g.py - g.y) / g.h * 100) + '%';
      };
      R.rig = btn.querySelector('.dw-rig');
      R.body = btn.querySelector('.r-body'); R.cap = btn.querySelector('.r-cap');
      R.hl = btn.querySelector('.r-hl'); R.hr = btn.querySelector('.r-hr');
      place(R.body, RIG.parts.body); place(R.cap, RIG.parts.cap); place(R.hl, RIG.parts.handL); place(R.hr, RIG.parts.handR);
      R.cap.src = RIG.src.cap; R.hl.src = RIG.src.handL; R.hr.src = RIG.src.handR; R.body.src = FACES.base;
      R.k = W_ / RIG.cw;                          // 그림 1px → 화면 px
    } else {
      btn.innerHTML = '<span class="dw-shadow"></span><span class="dw-body"><img alt=""></span><span class="dw-mark"></span>';
      btn.querySelector('img').src = IMG;
    }
    var face_ = RIG ? R.body : btn.querySelector('.dw-body img');
    var faceNow = 'base', faceT = 0;
    function face(n, ms) {
      if (!FACES[n]) n = 'base';
      if (faceNow !== n) { face_.src = FACES[n]; faceNow = n; }
      clearTimeout(faceT);
      if (ms) faceT = setTimeout(function () { face(st.mode === 'sleep' ? 'sleep' : 'base'); }, ms);
    }
    var body = btn.querySelector('.dw-body'), shadow = btn.querySelector('.dw-shadow'), mark = btn.querySelector('.dw-mark');
    var say = document.createElement('div'); say.className = 'dw-say'; say.setAttribute('role', 'status');
    var panel = document.createElement('div'); panel.className = 'dw-panel'; panel.hidden = true;
    var call = document.createElement('button'); call.className = 'dw-call'; call.type = 'button'; call.textContent = '도토리 부르기'; call.hidden = true;
    document.body.appendChild(btn); document.body.appendChild(say); document.body.appendChild(panel); document.body.appendChild(call);

    var W = innerWidth, H = innerHeight;
    function ground() { return scrollY + H - H_ - 18; }
    var st = { x: W - W_ - 28, y: ground(), dir: -1, face: -1, mode: 'walk', until: 0, act: performance.now(), far: false, farSince: 0,
      t: 0, sayUntil: 0, jump: -1, open: false, hidden: false, lastSay: 0, mounted: false,
      waveUntil: 0, cheerUntil: 0, shockUntil: 0, tiredUntil: 0 };
    try { if (sessionStorage.getItem('dw-hidden') === '1') { st.hidden = true; btn.hidden = true; call.hidden = false; } } catch (e) {}

    function mode(m, ms) { st.mode = m; st.until = performance.now() + (ms || 0); }
    var markT;
    function showMark(s, ms) { mark.textContent = s; mark.classList.add('on'); clearTimeout(markT); if (ms) markT = setTimeout(function () { mark.classList.remove('on'); }, ms); }
    function hideMark() { mark.classList.remove('on'); }
    function speak(s, ms) { say.textContent = s; say.classList.add('on'); st.sayUntil = performance.now() + (ms || 2600); st.lastSay = performance.now(); }
    function wave(ms) { st.waveUntil = performance.now() + (ms || 1600); }
    function dust(vx, vy, dx, dy) {
      var d = document.createElement('span'); d.className = 'dw-dust';
      d.style.left = (vx + W_ / 2 - 5 + (Math.random() - .5) * 20) + 'px'; d.style.top = (vy + H_ - 10) + 'px';
      d.style.setProperty('--t', 'translate(' + dx + 'px,' + dy + 'px)');
      document.body.appendChild(d); setTimeout(function () { d.remove(); }, 600);
    }
    var lastScroll = 0;
    function wake() { st.act = performance.now(); if (st.mode === 'sleep') { hideMark(); mode('idle', 900); face('base'); wave(1200); } }
    addEventListener('scroll', function () { lastScroll = performance.now(); wake(); }, { passive: true });
    addEventListener('pointerdown', function () { st.act = performance.now(); }, { passive: true });

    // 관절 스프링 — 손 · 모자가 몸보다 살짝 늦게 따라오며 출렁여서 '살아 있는' 느낌
    var sp = { hl: { a: 0, v: 0 }, hr: { a: 0, v: 0 }, cy: { a: 0, v: 0 }, cr: { a: 0, v: 0 }, fx: -1, pty: 0, pvy: 0, prot: 0, prv: 0 };
    function spring(s, target, k, c, dt) { s.v += ((target - s.a) * k - s.v * c) * dt; s.a += s.v * dt; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    // 스크롤 중엔 그 자리에 남겨져(화면과 같이 밀려 사라짐) → 스크롤이 멈추고 잠깐 뒤 '후다닥' 달려옴
    var REACT = 260, CATCH = 40;
    st.chase = false; st.reactAt = 0; st.offSince = 0; st.lastBig = -1e9;
    var last = performance.now(), dustAcc = 0;
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      W = innerWidth; H = innerHeight;
      if (!st.open && !st.hidden) {
        var g = ground();
        st.y = Math.max(scrollY - H_ - 8, Math.min(scrollY + H + 8, st.y)); // 화면 바로 밖까지만
        var dy = g - st.y, dist = Math.abs(dy), running = false;
        var scrolling = now - lastScroll < 160;
        var vy0 = st.y - scrollY;
        var off = vy0 < -H_ * 0.45 || vy0 > H - H_ * 0.35;
        if (off && !st.offSince) st.offSince = now;
        if (scrolling) {
          st.reactAt = now + REACT;                                   // 스크롤 중엔 따라가지 않음
          if (!st.chase && dist > CATCH && !reduce) { st.chase = true; showMark('!', 700); face('surprised', 900); st.shockUntil = now + 700; }
        } else if (dist > 3 && (now >= st.reactAt || reduce)) {
          if (!st.chase && dist > CATCH) st.chase = true;
          running = !reduce && dist > 60;
          var RUN = Math.max(560, Math.min(860, H * 0.85));           // 화면 한 번 가로지르는 데 약 1초
          var spd = reduce ? 4000 : (running ? RUN : 140);
          st.y += (dy > 0 ? 1 : -1) * Math.min(dist, spd * dt);
          dist = Math.abs(g - st.y);
        }
        if (st.chase && dist <= 3 && !scrolling) {
          st.chase = false;
          if (st.offSince && now - st.offSince > 250) {
            if (now - st.lastBig > 15000) { speak('헉헉… 너무 빨라서 따라잡기 힘들었어요!', 2800); st.lastBig = now; }
            showMark('💦', 2400); face('tired', 2400); st.tiredUntil = now + 2400;
          }
          st.offSince = 0; mode('idle', 1500);
        }
        if (!off && !st.chase) st.offSince = 0;
        var vy = st.y - scrollY;
        if (!running && !st.chase && !reduce) {
          if (st.mode === 'walk') {
            st.x += st.dir * 46 * dt;
            if (st.x < 12) { st.x = 12; st.dir = 1; }
            if (st.x > W - W_ - 12) { st.x = W - W_ - 12; st.dir = -1; }
            if (now > st.until && Math.random() < dt * 0.35) mode('idle', 1800 + Math.random() * 2600);
          } else if (st.mode === 'idle') {
            if (now > st.until) { if (Math.random() < 0.4) st.dir *= -1; mode('walk', 2500 + Math.random() * 4000); }
          }
          if (now - st.act > 25000 && st.mode !== 'sleep') { mode('sleep', 1e9); showMark('Zzz'); face('sleep'); }
          if (TIPS.length && st.mode !== 'sleep' && now - st.lastSay > 75000 && now - st.act > 6000) { speak(TIPS[Math.floor(Math.random() * TIPS.length)], 3200); face('happy', 1100); wave(1400); }
          if (st.mode !== 'sleep' && faceNow === 'base' && now > (st.blinkAt || 0)) { if (st.blinkAt) face('sleep', 140); st.blinkAt = now + 2600 + Math.random() * 3600; }
        }
        if (st.mode === 'walk' && !running) st.face = st.dir > 0 ? 1 : -1;
        if (reduce) st.x = W - W_ - 20;
        st.x = Math.max(12, Math.min(W - W_ - 12, st.x));
        st.t += dt;
        var k = W_ / 64;                                               // 크기에 맞춰 움직임 크기도
        var ty = 0, rot = 0, sx = 1, sy = 1, c;
        if (st.jump >= 0) {
          var p = (now - st.jump) / 420;
          if (p >= 1) st.jump = -1; else { var s = Math.sin(Math.PI * p); ty = -34 * k * s; sy = 1 + .07 * s; sx = 1 - .05 * s; if (p > 0.85) { sy = 0.93; sx = 1.06; } }
        } else if (running) {
          var sr = Math.abs(Math.sin(st.t * 22)); c = 1 - sr;
          ty = -sr * 7 * k; rot = Math.sin(st.t * 22) * 7 + st.face * 6;
          sy = 1 - 0.08 * c * c * c; sx = 1 + 0.06 * c * c * c;
          dustAcc += dt; if (dustAcc > .06) { dustAcc = 0; dust(st.x, vy, (Math.random() - .5) * 16, (dy > 0 ? -1 : 1) * 18); }
        } else if (st.mode === 'walk' && !reduce) {
          var sw = Math.abs(Math.sin(st.t * 7)); c = 1 - sw;
          ty = -sw * 4.5 * k; rot = Math.sin(st.t * 7) * 4 + st.face * 3;
          sy = 1 - 0.07 * c * c * c; sx = 1 + 0.05 * c * c * c;       // 내려앉을 때 살짝 납작 → 통통
        } else if (st.mode === 'sleep') {
          rot = 9 + Math.sin(st.t * 1.5) * 2; sy = 1 + Math.sin(st.t * 1.5) * .02; ty = 2 * k;
        } else if (now < st.tiredUntil && !reduce) {
          sy = 1 + Math.sin(st.t * 13) * .035; sx = 1 - Math.sin(st.t * 13) * .02;   // 헉헉 숨 고르기
        } else { sy = 1 + Math.sin(st.t * 2.4) * .02; }
        body.style.transform = 'translateY(' + ty.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
        shadow.style.transform = 'scale(' + (1 + ty / (60 * k)).toFixed(3) + ')'; shadow.style.opacity = Math.max(.3, 1 + ty / (50 * k)).toFixed(2);

        if (RIG) {
          // 손: 상황마다 목표 각도 → 스프링으로 따라감 (왼손 +는 위로 · 오른손 −는 위로)
          var tl, tr, w;
          if (reduce) { tl = 0; tr = 0; }
          else if (st.jump >= 0 || now < st.cheerUntil) { w = Math.sin(st.t * 16); tl = 58 + 16 * w; tr = -30 + 12 * w; }
          else if (now < st.shockUntil) { tl = 70; tr = -40; }
          else if (running) { w = Math.sin(st.t * 22); tl = 34 + 24 * w; tr = -14 + 18 * w; }
          else if (now < st.waveUntil) { tl = 74 + 24 * Math.sin(st.t * 15); tr = 6 + 3 * Math.sin(st.t * 3); }
          else if (st.mode === 'sleep') { tl = -10; tr = 10; }
          else if (now < st.tiredUntil) { w = Math.sin(st.t * 13); tl = -16 + 4 * w; tr = 16 + 4 * w; }
          else if (st.mode === 'walk') { w = Math.sin(st.t * 7); tl = 18 * w; tr = 18 * w; }
          else { tl = 5 * Math.sin(st.t * 2.4); tr = 5 * Math.sin(st.t * 2.4 + 1.3); }
          if (reduce) { sp.hl.a = tl; sp.hr.a = tr; sp.cy.a = 0; sp.cr.a = 0; }
          else {
            spring(sp.hl, tl, 260, 15, dt); spring(sp.hr, tr, 260, 15, dt);
            // 모자: 몸이 위아래로 움직일 때 반 박자 늦게 출렁 · 몸이 기울면 살짝 늦게 따라 기움
            var bvy = (ty - sp.pty) / Math.max(dt, 0.008), bay = (bvy - sp.pvy) / Math.max(dt, 0.008);
            sp.pty = ty; sp.pvy = bvy;
            var rv = (rot - sp.prot) / Math.max(dt, 0.008), ra = (rv - sp.prv) / Math.max(dt, 0.008);
            sp.prot = rot; sp.prv = rv;
            sp.cy.v += (-sp.cy.a * 320 - sp.cy.v * 15 - clamp(bay, -4000, 4000) * 0.9) * dt; sp.cy.a += sp.cy.v * dt;
            sp.cr.v += (-sp.cr.a * 240 - sp.cr.v * 14 - clamp(ra, -6000, 6000) * 0.32) * dt; sp.cr.a += sp.cr.v * dt;
            sp.cy.a = clamp(sp.cy.a, -2.4 * k, 2.4 * k); sp.cr.a = clamp(sp.cr.a, -5, 5);
          }
          // 방향 바꿀 때 납작해졌다 돌아서기 (진짜로 뒤도는 느낌)
          sp.fx += (st.face - sp.fx) * Math.min(1, dt * (reduce ? 60 : 11));
          var fx = Math.abs(sp.fx) < 0.12 ? (sp.fx < 0 ? -0.12 : 0.12) : sp.fx;
          R.rig.style.transform = 'scaleX(' + fx.toFixed(3) + ')';
          R.hl.style.transform = 'rotate(' + sp.hl.a.toFixed(1) + 'deg)';
          R.hr.style.transform = 'rotate(' + sp.hr.a.toFixed(1) + 'deg)';
          R.cap.style.transform = 'translateY(' + sp.cy.a.toFixed(2) + 'px) rotate(' + sp.cr.a.toFixed(2) + 'deg)';
        }

        btn.style.transform = 'translate(' + st.x.toFixed(1) + 'px,' + vy.toFixed(1) + 'px)';
        if (say.classList.contains('on')) {
          var bw = say.offsetWidth, bh = say.offsetHeight;
          var bx = Math.max(16, Math.min(W - bw - 16, st.x + W_ / 2 - bw / 2));
          var by = vy - bh - 10; if (by < 8) by = vy + H_ + 8;
          say.style.transform = 'translate(' + bx.toFixed(0) + 'px,' + by.toFixed(0) + 'px)';
          if (now > st.sayUntil) say.classList.remove('on');
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function openChat() {
      if (!st.mounted) {
        window.DotoriCS.mount(panel, { img: IMG, typingImg: opts.typingImg, badge: opts.badge, ask: opts.ask, closable: true, onClose: closeChat });
        var hide = document.createElement('button'); hide.type = 'button'; hide.className = 'dw-hide'; hide.textContent = '도토리 잠깐 숨기기';
        hide.onclick = hideAll; panel.appendChild(hide);
        st.mounted = true;
      }
      st.open = true; btn.hidden = true; say.classList.remove('on'); panel.hidden = false;
      var ta = panel.querySelector('textarea'); if (ta && innerWidth > 520) ta.focus();
    }
    function closeChat() { panel.hidden = true; st.open = false; btn.hidden = st.hidden; if (!st.hidden) { st.jump = performance.now(); speak('또 궁금하면 저를 눌러 주세요!', 2200); face('happy', 1600); wave(1600); } }
    function hideAll() { st.hidden = true; st.open = false; panel.hidden = true; btn.hidden = true; say.classList.remove('on'); call.hidden = false; try { sessionStorage.setItem('dw-hidden', '1'); } catch (e) {} }
    call.onclick = function () { st.hidden = false; call.hidden = true; btn.hidden = false; try { sessionStorage.removeItem('dw-hidden'); } catch (e) {} st.y = ground(); st.jump = performance.now(); speak('다시 왔어요!', 1800); face('happy', 1800); wave(1800); };
    btn.addEventListener('pointerenter', function () { if (!st.open && st.mode !== 'sleep') { face('happy', 1200); wave(1000); } });
    btn.addEventListener('click', function () {
      var wasSleep = st.mode === 'sleep'; wake(); hideMark();
      st.jump = performance.now(); face('happy', 1400); st.cheerUntil = performance.now() + 600;
      if (wasSleep) speak('앗, 졸았어요! 무엇이 궁금하세요?', 1500);
      setTimeout(openChat, wasSleep ? 650 : 380);
    });
    setTimeout(function () { if (!st.open && !st.hidden) { speak('궁금한 게 있으면 저를 눌러 주세요!', 3400); face('happy', 1600); wave(2000); } }, 3000);
    return { open: openChat, close: closeChat, state: st };
  }
  window.DotoriWander = DotoriWander;
})();

  async function ask(turns, onText, signal) {
    var r = await fetch(EXEC, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ turns: turns }), signal: signal });
    var j = await r.json();
    if (j.error) throw { code: j.error === 'limit' ? 'limit' : j.error };
    onText(j.text); return j.text;
  }
  function start() { window.DotoriWander({ img: IMG, rig: RIG, typingImg: TYPING, ask: ask, tips: ['선물 포장도 돼요 · 1,000원', '2만 원 넘게 사면 배송비가 무료예요', '편지는 타자기로 한 글자씩 쳐서 보내요'] }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
