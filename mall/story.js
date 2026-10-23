/* 무무토리 브랜드 이야기 스크롤 3D 장면 — 목업 v12 그대로(2026-10-19). 식스샵 블록 '무무토리 브랜드 이야기 (스크롤 3D)'가 불러 씀. */
(function () {
  if (window.MumuStory) return;
  var CSS = "\n  /* \ubb34\ubb34\ud1a0\ub9ac \ube0c\ub79c\ub4dc \uc774\uc57c\uae30 \u2014 \ubaa9\uc5c5 v12(2026-10-19 q108) \uc2a4\ud06c\ub864 3D \uc7a5\uba74 + Our Story \uae00 + \uc528\uc557 \uce5c\uad6c\ub4e4. \uadf8\ub9bc\uc740 '\uadf8\ub9bc \uc8fc\uc18c \uc55e\ubd80\ubd84' \uc124\uc815 + \ud30c\uc77c \uc774\ub984 */\n  .mbs { --bg: #EFE9E4; --ink: #6A3906; --ink4: #D9C3A5; --butter: #FCF0D3; --butter-ink: #6A3906; --card: #FFFDF8; color: #5B3410; }\n  .mbs .seq { position: relative; background: var(--bg); }\n  .mbs .seq-st { position: sticky; overflow: hidden; }\n  .mbs .seq canvas { display: block; width: 100%; height: 100%; }\n  .mbs .seq-cap { position: absolute; left: 50%; bottom: 7%; transform: translateX(-50%); width: max-content; max-width: calc(100% - 40px); text-align: center; font-family: var(--font-family-heading); font-weight: var(--font-weight-heading); font-size: 30px; line-height: 1.4; color: var(--butter-ink); background: var(--card); box-shadow: 0 6px 20px rgba(74,40,6,.10); padding: 8px 26px; border-radius: 999px; text-wrap: balance; margin: 0; }\n  .mbs .seq-dots { position: absolute; right: 26px; top: 50%; display: grid; gap: 10px; transform: translateY(-50%); }\n  .mbs .seq-dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--ink4); transition: transform .2s, background .2s; }\n  .mbs .seq-dots i.on { background: var(--ink); transform: scale(1.5); }\n  .mbs .seq-hint { position: absolute; left: 0; right: 0; top: 22px; text-align: center; font-size: 14px; font-weight: 700; color: var(--butter-ink); opacity: .75; transition: opacity .3s; margin: 0; font-family: var(--font-family-body); }\n  .mbs .stills { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 30px 24px; background: var(--butter); }\n  .mbs .stills figure { margin: 0; } .mbs .stills canvas { width: 100%; height: auto; border-radius: 20px; display: block; }\n  .mbs .stills figcaption { font-family: var(--font-family-heading); text-align: center; margin-top: 8px; color: var(--butter-ink); }\n  .mbs .sec { position: relative; padding: 72px 24px 40px; }\n  .mbs .drips { position: absolute; left: 0; right: 0; top: 0; height: 0; pointer-events: none; }\n  .mbs .drips img { position: absolute; top: 0; height: auto; } .mbs .drips .a { left: 4%; width: 22%; } .mbs .drips .b { left: 46%; width: 11%; } .mbs .drips .c { right: 5%; width: 15%; }\n  .mbs .orns { display: flex; justify-content: center; gap: 18px; margin: 0 0 16px; } .mbs .orns img { height: 56px; width: auto; }\n  .mbs .say { max-width: 860px; margin: 0 auto; text-align: center; }\n  .mbs .say h3 { font-family: var(--font-family-heading); font-weight: var(--font-weight-heading); font-size: 40px; line-height: 1.4; color: var(--ink); margin: 0; text-wrap: balance; word-break: keep-all; }\n  .mbs .say p { font-family: var(--font-family-body); font-size: 18px; line-height: 1.9; margin: 22px 0 0; white-space: pre-line; word-break: keep-all; }\n  .mbs .seeds-h { font-family: var(--font-family-heading); font-weight: var(--font-weight-heading); font-size: 42px; text-align: center; line-height: 1.4; margin: 0 0 40px; color: var(--ink); text-wrap: balance; }\n  .mbs .seeds { display: grid; grid-template-columns: repeat(3, 1fr); gap: 50px 30px; max-width: 1100px; margin: 0 auto; }\n  .mbs .seed { text-align: center; }\n  .mbs .seed-im { display: grid; place-items: center; width: 220px; height: 220px; margin: 0 auto 18px; border-radius: 50%; overflow: hidden; background: var(--butter); }\n  .mbs .seed-im img { width: 100%; height: 100%; object-fit: cover; } .mbs .seed-im.cut img { width: auto; height: 78%; object-fit: contain; }\n  .mbs .seed h4 { font-family: var(--font-family-heading); font-weight: var(--font-weight-heading); font-size: 24px; line-height: 1.4; margin: 0; color: var(--ink); }\n  .mbs .seed p { font-family: var(--font-family-body); font-size: 15px; line-height: 1.6; margin: 6px 0 0; white-space: pre-line; word-break: keep-all; }\n  .mbs .shopn { display: flex; align-items: center; gap: 28px; max-width: 900px; margin: 0 auto; background: var(--butter); border-radius: 28px; padding: 24px 36px; }\n  .mbs .shopn img { width: 120px; height: auto; } .mbs .shopn div { flex: 1; }\n  .mbs .shopn h3 { font-family: var(--font-family-heading); font-weight: var(--font-weight-heading); font-size: 26px; margin: 0 0 6px; color: var(--ink); }\n  .mbs .shopn p { font-family: var(--font-family-body); margin: 0; font-size: 15px; }\n  .mbs .btn { display: inline-flex; align-items: center; justify-content: center; padding: 13px 24px; border-radius: 999px; background: #6A3906; color: #FFF8EE; font-family: var(--font-family-heading); font-weight: var(--font-weight-heading); font-size: 15px; text-decoration: none; white-space: nowrap; }\n  @media (max-width: 767px) {\n    .mbs .seq-cap { font-size: 18px; bottom: 6%; padding: 7px 18px; }\n    .mbs .seq-dots { right: 12px; gap: 8px; } .mbs .seq-dots i { width: 7px; height: 7px; }\n    .mbs .stills { grid-template-columns: 1fr; }\n    .mbs .sec { padding: 52px 16px 28px; }\n    .mbs .say h3 { font-size: 25px; } .mbs .say p { font-size: 15px; margin-top: 14px; }\n    .mbs .seeds-h { font-size: 24px; margin-bottom: 24px; }\n    .mbs .seeds { grid-template-columns: repeat(2, 1fr); gap: 28px 12px; }\n    .mbs .seed-im { width: 130px; height: 130px; margin-bottom: 10px; } .mbs .seed h4 { font-size: 18px; } .mbs .seed p { font-size: 13px; }\n    .mbs .shopn { flex-direction: column; text-align: center; padding: 24px 18px; } .mbs .shopn img { width: 90px; }\n  }\n";
  window.MumuStory = { mount: function (box, BASE) {
    if (!document.getElementById('mbs-css')) { var s = document.createElement('style'); s.id = 'mbs-css'; s.textContent = CSS; document.head.appendChild(s); }

  var root = box.querySelector('.mbs'); if (!root || root.getAttribute('data-mbs')) return; root.setAttribute('data-mbs', '1');
  var seqEl = root.querySelector('.seq'), st = root.querySelector('.seq-st'), cv = st.querySelector('canvas'), ctx = cv.getContext('2d');
  var capEl = root.querySelector('.seq-cap'), dotsEl = root.querySelector('.seq-dots'), hintEl = root.querySelector('.seq-hint');
  var IM = {}, W = 1600, H = 900;
  var CAPS = ['도토리 한 알이 굴러 들어왔어요', '뚜껑이 열리자 씨앗 친구들이 나왔고', '버터가 녹는 작은 상점을 차렸어요', '그리고, 편지가 도착했습니다'];
  var SRC = {obClosed: 'ob_closed.webp', obOpen: 'ob_open.webp', obCap: 'ob_cap.webp', obSun: 'ob_sun.webp', obSunJ: 'ob_sunj.webp', obChick: 'ob_chick.webp', obPeanut: 'ob_peanut.webp', obSeed: 'ob_seed.webp', obButter: 'ob_butter.webp', obLetter: 'ob_letter.webp', obLetterF: 'ob_letterf.webp', obHeart: 'ob_heart.webp', ch1: 'ch1.png', body: 'ch1_body.png', cap: 'ch1_cap.png', ch2: 'ch2.png', ch3: 'ch3.png', ch4: 'ch4.png', ch5: 'ch5.png', ch6: 'ch6.png'};
  ['drip1', 'drip2', 'drip3', 'star', 'star2', 'spark', 'sparkg', 'sprout', 'leaf', 'leafb', 'sprig', 'clover', 'bush', 'grass', 'flower', 'flower2', 'burst', 'env1', 'env2', 'env3', 'hpink', 'hbrown', 'hcream', 'hgreen', 'sun', 'cloud', 'cloud2', 'dotb', 'dotc'].forEach(function (k) { SRC[k] = 'd_' + k + '.webp'; });
  Object.keys(SRC).forEach(function (k) { var i = new Image(); i.onload = function () { IM[k] = i; seqTick(); }; i.src = BASE + SRC[k]; });
  var REL = {ch2: .87, ch3: .53, ch4: .69, ch5: .91, ch6: .45};   // 도토리 키를 1로 본 친구들 키
  var clamp = function(v){ return Math.max(0, Math.min(1, v)); };
  var lerp = function(a, b, t){ return a + (b - a) * t; };
  var eo = function(t){ return 1 - Math.pow(1 - t, 3); };
  var eio = function(t){ return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var back = function(t){ var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  var isMo = function () { return window.innerWidth < 768; };
  // 크기: 고정 헤더 아래부터 화면 높이만큼 장면을 붙여 두고, 그 4.4배(휴대폰 4배)를 스크롤하는 동안 장면 4개가 이어짐
  function fit() {
    var hd = document.querySelector('header'), top = 0;
    if (hd) { var r = hd.getBoundingClientRect(); if (getComputedStyle(hd).position === 'fixed' || getComputedStyle(hd).position === 'sticky') top = Math.max(0, r.bottom); }
    var h = Math.max(380, window.innerHeight - top);
    st.style.top = top + 'px'; st.style.height = h + 'px'; seqEl.style.height = Math.round(h * (isMo() ? 4 : 4.4)) + 'px';
    var w = isMo() ? 780 : 1600, cw = st.clientWidth || 1, hh = Math.round(w * h / cw);
    if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; } W = w; H = hh;
  }
  function draw(c, W, H, T, now, px, py){
    now = now || 0; px = px || 0; py = py || 0;
    var m = H > W, AH = m ? W * .36 : Math.min(H * .40, W * .225), G = m ? H * .60 : H * .80, ax = W * .5, PV = G - AH * .5;
    var t1 = clamp(T), t2 = clamp(T - 1), t3 = clamp(T - 2), t4 = clamp(T - 3);
    // 카메라: 장면 1 왼쪽에서 따라옴 → 장면 2 뚜껑 쪽으로 다가갔다 물러남 → 장면 3 위쪽을 보여 줌 → 장면 4 다시 다가감
    var zin = t2 < .3 ? eio(t2 / .3) : 1 - eio((t2 - .3) / .7);
    var camX = -W * .10 * (1 - eo(t1)), camZ = 1.05 - .05 * eo(t1) + .10 * zin - .06 * eio(t3) + .11 * eio(t4), camY = AH * (.14 * zin + .07 * eio(t3) - .03 * eio(t4));
    var P = function(x, y, d){ var sc = 1 + (camZ - 1) * d; return {x: ax + (x - ax) * sc - camX * d + px * W * .016 * (d - .4), y: PV + (y - PV) * sc + camY * d + py * H * .014 * (d - .4), s: sc}; };
    var bob = function(sp, ph, amp){ return Math.sin(now * .001 * sp + ph) * amp; };
    // 그림 한 장: (x, y)는 기준점(an: b=아래 가운데, c=한가운데, t=위 가운데), h는 높이(o.w를 주면 너비 기준), d는 깊이(작을수록 멀다)
    var spr = function(k, x, y, h, o){
      var im = IM[k]; if (!im) return; o = o || {};
      var p = P(x, y, o.d == null ? 1 : o.d), hh = (o.w ? o.w * im.height / im.width : h) * p.s, ww = hh * im.width / im.height, a = o.a == null ? 1 : clamp(o.a);
      if (a <= 0 || hh <= 0) return;
      c.save(); c.globalAlpha = a; c.translate(p.x, p.y); if (o.r) c.rotate(o.r); c.scale(o.sx || 1, o.sy || 1);
      c.drawImage(im, -ww / 2, o.an === 'c' ? -hh / 2 : o.an === 't' ? 0 : -hh, ww, hh); c.restore();
    };
    var shadow = function(x, y, w, a){ if (a <= 0) return; var p = P(x, y, 1); c.save(); c.globalAlpha = a; c.fillStyle = '#6A3906'; c.beginPath(); c.ellipse(p.x, p.y, w * p.s / 2, w * p.s * .075, 0, 0, 7); c.fill(); c.restore(); };
    c.clearRect(0, 0, W, H);

    // ── 맨 뒤: 은은한 빛(배경 그림 없이 깊이만) ──
    var hp = P(ax, PV, .3), hr = AH * (m ? 1.7 : 2.1), gl = c.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, hr);
    gl.addColorStop(0, 'rgba(245,235,221,.95)'); gl.addColorStop(.5, 'rgba(245,235,221,.6)'); gl.addColorStop(1, 'rgba(245,235,221,0)');
    c.fillStyle = gl; c.fillRect(0, 0, W, H);

    // ── 먼 층: 해·구름·반짝이 ──
    var sunIn = eo(clamp(t1 / .7));
    spr('sun', m ? W * .80 : W * .845, (m ? H * .12 : H * .19) + (1 - sunIn) * H * .18 + bob(.6, 0, AH * .02), AH * .46, {d: .4, an: 'c', r: now * .00012 + t1 * .8, a: sunIn});
    spr('cloud', (m ? W * .21 : W * .145) + bob(.25, 1, W * .012), m ? H * .155 : H * .23, AH * .40, {d: .5, an: 'c', a: .97});
    spr('cloud2', (m ? W * .66 : W * .665) + bob(.2, 3, W * .015), m ? H * .235 : H * .12, AH * .25, {d: .35, an: 'c', a: .92});
    (m ? [['spark', .50, .075, .16], ['sparkg', .93, .40, .13], ['star2', .07, .345, .15], ['spark', .90, .70, .11]] : [['spark', .31, .13, .17], ['sparkg', .945, .47, .14], ['star2', .055, .50, .17], ['spark', .56, .075, .11], ['sparkg', .245, .36, .10]]).forEach(function(q, i){
      var tw = .78 + .22 * Math.sin(now * .0022 + i * 1.7);
      spr(q[0], W * q[1], H * q[2], AH * q[3] * tw, {d: .45 + (i % 3) * .1, an: 'c', r: Math.sin(now * .0006 + i) * .25, a: clamp(T * 2.2 - i * .35) * .95});
    });
    // 장면 4: 멀리서 떠가는 편지
    spr(IM.obLetterF ? 'obLetterF' : 'env2', W * (1.1 - t4 * 1.0), (m ? H * .30 : H * .30) - Math.sin(t4 * Math.PI) * H * .08 + bob(.9, 2, AH * .02), AH * .2, {d: .5, an: 'c', r: -.3 + t4 * .5, a: Math.sin(clamp(t4) * Math.PI) * 1.4});

    // ── 뒤쪽 바닥: 장면 3에서 솟아나는 풀·꽃(작은 상점 앞마당) ──
    var hw = W / 2, sprout = function(i){ return back(clamp((t3 - .30 - i * .07) / .30)); };
    (m ? [['bush', .80, -.02, .44, .85], ['grass', -.84, 0, .24, .85], ['clover', -.60, .30, .30, 1.06], ['flower', .84, .32, .22, 1.06], ['flower2', -.90, .34, .17, 1.08]]
       : [['bush', .90, -.01, .50, .85], ['grass', -.93, 0, .28, .85], ['clover', -.80, .07, .33, 1.06], ['flower', -.69, .09, .22, 1.08], ['flower2', .685, .09, .20, 1.08], ['sprout', .97, .10, .26, 1.1]]).forEach(function(q, i){
      var e = sprout(i); if (e <= 0) return;
      spr(q[0], ax + hw * q[1], G + AH * q[2], AH * q[3], {d: q[4], sy: e, sx: .7 + .3 * clamp(e), r: bob(.9, i, .03)});
    });

    // ── 가운데 층: 도토리와 씨앗 친구들 ──
    var FR = m ? [['ch2', -.944, 0], ['ch3', -.514, 0], ['ch4', .514, 0], ['ch5', .944, 0], ['ch6', .17, .30]] : [['ch2', -1.33, 0], ['ch3', -.755, 0], ['ch4', .755, 0], ['ch5', 1.33, 0], ['ch6', 1.80, 0]];
    var RANK = [1, 0, 2, 3, 4];   // 튀어나오는 순서(가까이 설 친구부터)
    var lean = 1 - .10 * eio(clamp(t4 / .6));   // 장면 4: 편지 쪽으로 모여듦
    var OB = !!(IM.obClosed && IM.obOpen && IM.obCap), U = AH / 760, capDraw = null;   // 받은 3D 오브젝트(닫힌 도토리 키 760px = 도토리 키)
    var friend = function(i, front){
      var f = FR[i], u = clamp((t2 - .24 - RANK[i] * .105) / .34); if (T < 1 || u <= 0 || (OB || u >= .45) !== front) return;
      var key = f[0], h = AH * REL[key] * (OB ? .88 : 1), tx = ax + AH * f[1] * lean, by = G + AH * f[2], e = eo(u);
      var ok = OB && {ch2: 'obSun', ch3: 'obChick', ch5: 'obPeanut', ch6: 'obSeed'}[key];   // 받은 3D 그림이 있는 친구(호박씨 ch4는 아직 임시 컷)
      if (ok && IM[ok]){ key = ok === 'obSun' && u < .9 && IM.obSunJ ? 'obSunJ' : ok; h = IM[key].height * U; }   // 해바라기씨: 뛰는 동안은 손 흔드는 자세, 앉으면 해를 든 자세
      var x = lerp(ax - AH * (OB ? 0 : .04), tx, e), y = lerp(G - AH * (OB ? .50 : .74), by, u) - Math.sin(u * Math.PI) * AH * (.55 + .08 * RANK[i]);
      var sc = .2 + .8 * back(clamp(u / .75)), land = u < 1 ? Math.sin(clamp((u - .88) / .12) * Math.PI) : 0;
      var hop = -Math.abs(Math.sin(Math.PI * clamp((t3 - .46 - i * .07) / .22))) * AH * .13 - (f[0] === 'ch6' ? Math.abs(Math.sin(t4 * Math.PI * 4)) * AH * .07 * clamp(t4 * 3) * (1 - clamp((t4 - .85) / .15)) : 0);
      var br = u >= 1 ? 1 + .012 * Math.sin(now * .002 + i * 1.3) : 1;
      shadow(tx, by + AH * .01, h * .5 * (1 + hop / AH), clamp((u - .8) / .2) * .16);
      spr(key, x, y + hop, h * sc, {r: (1 - e) * (i % 2 ? 1 : -1) * 4.4, sy: (1 - .11 * land) * br, sx: 1 + .07 * land});
    };
    for (var i = 0; i < 5; i++) friend(i, false);   // 막 나오는 친구는 도토리 뒤에서

    // 도토리 — 받은 3D 오브젝트: 굴러 들어옴 → 움찔하고 뚜껑이 튀어 올라 날아감 → 열린 몸통에서 친구들이 나옴 → (장면 3) 뚜껑이 지붕처럼 떠 있음 → (장면 4) 편지를 담고 닫힘
    var OPEN = .13, closeU = clamp((t4 - .73) / .11);
    if (OB && T < 1){
      var e0 = eo(t1), x0 = lerp(-W * .22, ax, e0), bn = -Math.abs(Math.sin(t1 * Math.PI * 3.2)) * AH * .16 * (1 - t1);
      for (var d0 = 1; d0 <= 4; d0++){ var dq = clamp(t1 * 1.5 - d0 * .08), dz = AH * (.05 + .05 * dq) * (1 - t1); if (dz > 1 && t1 < .92) spr(d0 % 2 ? 'dotc' : 'dotb', x0 - AH * (.34 + d0 * .2), G - dz * .5 - Math.abs(Math.sin(t1 * 9 + d0)) * AH * .05, dz * 2, {an: 'c', a: (1 - t1) * .8}); }
      shadow(x0, G + AH * .01, AH * .62 * (1 + bn / AH), .18);
      spr('obClosed', x0, G - AH * .5 + bn, AH, {an: 'c', r: (1 - e0) * -Math.PI * 3.2});
    } else if (OB){
      var opened = t2 >= OPEN && closeU < 1, ant = t2 < OPEN ? Math.sin(t2 / OPEN * Math.PI) * .10 : 0;
      var pop = 1 + .14 * Math.sin(clamp((t2 - OPEN) / .10) * Math.PI) + .12 * Math.sin(clamp((t4 - .84) / .10) * Math.PI);
      var hopB = -Math.abs(Math.sin(Math.PI * clamp((t4 - .84) / .10))) * AH * .08 - Math.abs(Math.sin(Math.PI * clamp((t3 - .40) / .2))) * AH * .05, brB = 1 + .010 * Math.sin(now * .0019);
      shadow(ax, G + AH * .01, AH * .60 * (1 + hopB / AH), .18);
      if (opened) spr('obOpen', ax, G + hopB, IM.obOpen.height * U, {sx: pop, sy: pop * brB});
      else spr('obClosed', ax, G + hopB, AH, {sx: (1 + ant * .6) * pop, sy: (1 - ant) * pop * brB});
      if (opened) capDraw = function(){
        var cu = clamp((t2 - OPEN) / .32), ce = eo(cu), roof = eio(clamp((t3 - .05) / .45)), peek = Math.sin(clamp((t4 - .20) / .52) * Math.PI), cl = eio(closeU);
        var hx = lerp(ax + AH * .66, ax + AH * .02, roof) + peek * AH * .16, hy = lerp(G - AH * 1.50, G - AH * 1.17, roof) - peek * AH * .24, hr = lerp(.32, -.04, roof) + peek * .30;
        var cx = lerp(lerp(ax - AH * .02, hx, ce), ax - AH * .03, cl), cy = lerp(lerp(G - AH * .70, hy, ce) - Math.sin(cu * Math.PI) * AH * .22, G - AH * .72, cl), cr = lerp((1 - ce) * -6.283 + hr, 0, cl);
        spr('obCap', cx, cy + bob(1.1, 0, AH * .02) * (1 - cl), IM.obCap.height * U, {an: 'c', d: 1.08, r: cr + bob(.7, 1, .035) * (1 - cl)});
      };
      var bw = clamp((t2 - OPEN) / .26);
      if (bw > 0 && bw < 1){ var bA = 1 - bw * bw, bS = AH * (.22 + .2 * eo(bw)); spr('burst', ax - AH * .56, G - AH * .86, bS, {an: 'c', sx: -1, r: .5, a: bA}); spr('burst', ax + AH * .60, G - AH * .92, bS, {an: 'c', r: -.1, a: bA}); spr('spark', ax - AH * .30, G - AH * (1.05 + .25 * eo(bw)), bS * .8, {an: 'c', r: bw * 2, a: bA}); }
    } else if (T < 1){   // 장면 1: 굴러 들어옴
      var e1 = eo(t1), x1 = lerp(-W * .22, ax, e1), bounce = -Math.abs(Math.sin(t1 * Math.PI * 3.2)) * AH * .16 * (1 - t1);
      for (var d1 = 1; d1 <= 4; d1++){ var du = clamp(t1 * 1.5 - d1 * .08), dr = AH * (.05 + .05 * du) * (1 - t1); if (dr > 1 && t1 < .92) spr(d1 % 2 ? 'dotc' : 'dotb', x1 - AH * (.34 + d1 * .2), G - dr * .5 - Math.abs(Math.sin(t1 * 9 + d1)) * AH * .05, dr * 2, {an: 'c', a: (1 - t1) * .8}); }
      shadow(x1, G + AH * .01, AH * .62 * (1 + bounce / AH), .18);
      spr('ch1', x1, G - AH * .5 + bounce, AH, {an: 'c', r: (1 - e1) * -Math.PI * 3.2});
    } else {
      // 장면 2: 움찔 → 뚜껑이 들림 → 친구들이 나옴 → 뚜껑이 닫힘 / 장면 4: 편지를 받고 폴짝
      var lift = t2 <= 0 ? 0 : t2 < .32 ? back(clamp((t2 - .12) / .20)) : t2 < .84 ? 1 + Math.sin((t2 - .32) * 24) * .035 : 1 - eio(clamp((t2 - .84) / .13));
      var sq = Math.sin(clamp(t2 / .14) * Math.PI) * .08 + Math.sin(clamp((t2 - .95) / .05) * Math.PI) * .05 + Math.sin(clamp((t3 - .40) / .2) * Math.PI) * .05;
      var hopA = -Math.abs(Math.sin(Math.PI * clamp((t4 - .70) / .22))) * AH * .09, brA = 1 + .010 * Math.sin(now * .0019);
      var p = P(ax, G + hopA, 1), hh = AH * p.s, im = IM.ch1, ww = im ? hh * im.width / im.height : 0;
      shadow(ax, G + AH * .01, AH * .62 * (1 + hopA / AH), .18);
      if (im){
        c.save(); c.translate(p.x, p.y); c.scale(1 + sq * .6, (1 - sq) * brA);
        if (lift > .002 && IM.body && IM.cap){
          c.drawImage(IM.body, -ww / 2, -hh, ww, hh);
          var pvx = ww * .40, pvy = -hh * .56;   // 뚜껑 오른쪽 끝을 경첩 삼아 열림
          c.translate(pvx, pvy - lift * hh * .17); c.rotate(-lift * .60); c.translate(-pvx, -pvy);
          c.drawImage(IM.cap, -ww / 2, -hh, ww, hh);
        } else c.drawImage(im, -ww / 2, -hh, ww, hh);
        c.restore();
      }
      // 뚜껑이 열리는 순간의 반짝임
      var bu = clamp((t2 - .13) / .26);
      if (bu > 0 && bu < 1){ var ba = 1 - bu * bu, bs = AH * (.22 + .2 * eo(bu)); spr('burst', ax - AH * .50, G - AH * 1.02, bs, {an: 'c', sx: -1, r: .5, a: ba}); spr('burst', ax + AH * .58, G - AH * 1.08, bs, {an: 'c', r: -.1, a: ba}); spr('spark', ax - AH * .05, G - AH * (1.25 + .25 * eo(bu)), bs * .8, {an: 'c', r: bu * 2, a: ba}); }
    }
    for (var j = 0; j < 5; j++) friend(j, true);
    if (capDraw) capDraw();

    // ── 장면 4: 편지가 날아와 열린 몸통 안으로 쏙 → 뚜껑이 닫히고 하트 ──
    if (T > 3){
      var hu, hy0;
      if (OB){
        var e4 = eo(clamp(t4 / .50)), dr = eio(clamp((t4 - .52) / .16)), flip = e4 < 1 ? Math.cos(e4 * Math.PI * 4) : 1;
        var lx = lerp(W * 1.10, ax + AH * .02, e4), ly = lerp(-H * .06, G - AH * .94, e4) - Math.sin(e4 * Math.PI) * AH * .30 + dr * AH * .46;
        var LF = IM.obLetterF ? 'obLetterF' : 'env1', LS = IM.obLetter ? 'obLetter' : 'env1', lmix = clamp((e4 - .80) / .20), lfade = 1 - clamp((dr - .70) / .30), lhh = AH * lerp(.22, .34, e4) * (1 - .45 * dr), lyy = ly + bob(1.4, 0, AH * .012) * (1 - dr);
        spr(LF, lx, lyy, lhh * 1.06, {an: 'c', r: (1 - e4) * 1.1 + .12 * lmix, sx: Math.sign(flip || 1) * Math.max(.14, Math.abs(flip)), a: (1 - lmix) * lfade});
        spr(LS, lx, lyy, lhh, {an: 'c', r: -.05 + dr * .22, a: lmix * lfade});
        hu = clamp((t4 - .84) / .16); hy0 = G - AH * .58;
      } else {   // 임시 컷: 도토리 품에 안김
        var f4 = eo(clamp(t4 / .70)), fl = f4 < 1 ? Math.cos(f4 * Math.PI * 4) : 1;
        spr('env1', lerp(W * 1.10, ax + AH * .01, f4), lerp(-H * .06, G - AH * .19, f4) - Math.sin(f4 * Math.PI) * AH * .35 - Math.abs(Math.sin(Math.PI * clamp((t4 - .70) / .22))) * AH * .09, AH * lerp(.20, .30, f4) * (1 + .22 * Math.sin(clamp((t4 - .70) / .14) * Math.PI)), {d: 1.05, an: 'c', r: (1 - f4) * 1.1 - .06, sx: Math.sign(fl || 1) * Math.max(.14, Math.abs(fl))});
        hu = clamp((t4 - .70) / .30); hy0 = G - AH * .42;
      }
      if (hu > 0) ['obHeart', 'hbrown', 'obHeart', 'hgreen', 'obHeart', 'hpink', 'obHeart'].forEach(function(k, i){
        var big = k === 'obHeart' ? 1.4 : 1; if (!IM[k]) k = 'hcream';   // 받은 하트는 크게, 사이사이 작은 조각 하트
        var an = -Math.PI * (.08 + i * .14), rr = AH * (.66 + (i % 3) * .22) * eo(hu);
        spr(k, ax + Math.cos(an) * rr * 1.25, hy0 + Math.sin(an) * rr - hu * AH * .12 + bob(1.1, i, AH * .025), AH * (.12 + (i % 3) * .035) * big * back(clamp(hu * 1.6)), {d: 1.1 + (i % 3) * .15, an: 'c', r: (i - 3) * .16 + bob(.8, i, .12)});
      });
    }

    // ── 가까운 층 ──
    // 장면 3: 위에서 버터가 녹아 흘러내림(차양처럼)
    (m ? [['drip1', .25, 1.30], ['drip3', .63, .62], ['drip2', .90, .80]] : [['drip2', .085, .86], ['drip1', .295, 1.30], ['drip3', .515, .62], ['drip1', .725, 1.16], ['drip2', .935, .84]]).forEach(function(q, i){
      var u = clamp((t3 - .03 - i * .07) / .40), im = IM[q[0]]; if (u <= 0 || !im) return;
      var ww = AH * q[2], hh = ww * im.height / im.width * (.12 + .88 * back(u)) * (1 + .03 * Math.sin(now * .0015 + i)), x = W * q[1] - camX * 1.3 + px * W * .016 * .9;
      c.save(); c.globalAlpha = clamp(u * 4); c.drawImage(im, x - ww / 2, -H * .012, ww, hh); c.restore();
    });
    if (IM.obButter){ var bq = clamp((t3 - .02) / .40), bh = IM.obButter.height * U * 1.05, bwv = 1 + .025 * Math.sin(now * .0016), bim = IM.obButter, bw2 = bh * bim.width / bim.height;
      if (bq > 0){ c.save(); c.globalAlpha = clamp(bq * 4); c.translate(W * (m ? .25 : .295) - camX * 1.3 + px * W * .016 * .9, lerp(-bh * 1.05, -bh * .36, back(bq)) + bh / 2); c.rotate(-.10 + .02 * Math.sin(now * .001)); c.scale(bwv, 1 / bwv); c.drawImage(bim, -bw2 / 2, -bh / 2, bw2, bh); c.restore(); } }
    spr('star', ax - AH * (m ? .98 : 1.5), (m ? H * .30 : H * .30) + bob(.8, 1, AH * .02), AH * .26 * back(clamp((t3 - .55) / .3)), {d: 1.2, an: 'c', r: -.25 + bob(.5, 0, .1)});
    // 장면 1: 잎이 흩날려 지나감
    if (T < 1.4) [['leaf', .16, 1.55, .30], ['leafb', .52, 1.75, .24], ['leaf', .86, .7, .15]].forEach(function(q, i){
      var u = clamp(T * 1.05 - i * .17); if (u <= 0 || u >= 1) return;
      spr(q[0], W * q[1] + u * W * .22 + Math.sin(u * 7 + i) * W * .02, lerp(-H * .12, H * 1.12, u), AH * q[3], {d: q[2], an: 'c', r: u * 6 + i * 2, a: Math.sin(u * Math.PI) * 1.6});
    });
    // 장면 4: 바로 앞을 스쳐 가는 편지
    spr(IM.obLetterF ? 'obLetterF' : 'env3', lerp(-W * .12, W * (m ? .9 : .42), t4), lerp(H * 1.05, H * (m ? .52 : .10), eio(t4)), AH * .46, {d: 1.9, an: 'c', r: -.5 + t4 * .9, a: Math.sin(t4 * Math.PI) * 1.5});
    // 화면 아래 모서리에 걸친 큰 잎(가장 가까운 층 — 가장 많이 밀린다)
    spr('sprig', m ? W * .03 : W * .04, H * 1.05, AH * (m ? .62 : .98), {d: 1.75, r: .28 + bob(.5, 0, .035)});
    spr('leaf', m ? W * .98 : W * .968, H * 1.06, AH * (m ? .48 : .80), {d: 1.9, r: -.42 + bob(.42, 2, .045)});
  }
  var seqT = 0, rafId = 0, lastS = -1, introAt = 0, ptr = {x: 0, y: 0, tx: 0, ty: 0};
  function seqVisible() { var a = seqEl.getBoundingClientRect(); return !seqEl.hidden && a.bottom > -60 && a.top < window.innerHeight + 60; }
  function seqLoop(now) {
    rafId = 0; if (!seqVisible()) return;
    var a = seqEl.getBoundingClientRect(), b = st.getBoundingClientRect(), span = a.height - b.height, sp = span > 0 ? clamp((b.top - a.top) / span) : 0;
    if (!introAt) introAt = now;   // 페이지를 연 순간부터 첫 장면(굴러 들어옴)이 저절로 재생
    var intro = clamp((now - introAt) / 1900), goal = intro + sp * (3.999 - intro), dT = goal - seqT;
    seqT = Math.abs(dT) < .0008 ? goal : seqT + dT * .13;
    ptr.x += (ptr.tx - ptr.x) * .07; ptr.y += (ptr.ty - ptr.y) * .07;
    draw(ctx, W, H, seqT, now, ptr.x, ptr.y);
    var s = Math.min(3, Math.floor(Math.max(0, seqT - .10)));
    if (s !== lastS) { lastS = s; capEl.textContent = CAPS[s]; [].forEach.call(dotsEl.children, function (d, i) { d.classList.toggle('on', i === s); }); }
    hintEl.style.opacity = sp > .015 || intro < 1 ? 0 : .75;
    rafId = requestAnimationFrame(seqLoop);
  }
  function seqTick() { if (!rafId && seqVisible()) rafId = requestAnimationFrame(seqLoop); }
  window.addEventListener('scroll', seqTick, {passive: true});
  window.addEventListener('resize', function () { fit(); seqTick(); });
  st.addEventListener('pointermove', function (ev) { if (ev.pointerType === 'touch') return; var r = st.getBoundingClientRect(); ptr.tx = ((ev.clientX - r.left) / r.width - .5) * 2; ptr.ty = ((ev.clientY - r.top) / r.height - .5) * 2; });
  st.addEventListener('pointerleave', function () { ptr.tx = 0; ptr.ty = 0; });
  fit();
  // 움직임 줄이기 설정: 움직임 대신 장면별 정지 그림 4장
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    seqEl.hidden = true; var sb = root.querySelector('.stills'); sb.hidden = false;
    var paint = function () { sb.innerHTML = ''; [.999, 1.999, 2.999, 3.999].forEach(function (T, i) { var fg = document.createElement('figure'), k = document.createElement('canvas'), fc = document.createElement('figcaption'); k.width = 1600; k.height = 900; draw(k.getContext('2d'), 1600, 900, T, 0, 0, 0); fc.textContent = CAPS[i]; fg.append(k, fc); sb.append(fg); }); };
    paint(); setTimeout(paint, 1500);
  }
  seqTick();

  } };
})();
