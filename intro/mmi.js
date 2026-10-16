/* 무무토리 첫 방문 인트로(mmi.js) — 배경 없는 낱개 3D 그림을 층층이 겹쳐, 스크롤에 따라 층마다 따로 움직인다(사장님 10/13 '투명 배경 + 3D 오브젝트' 방향).
   장면: 도토리가 굴러 들어옴(저절로) → 뚜껑이 열리고 씨앗 친구들 → 버터가 녹는 작은 상점 → 편지 도착 → '둘러보기'.
   글은 지금 자사몰 Our Story · 푸터 문장과 레터서비스 2종(10/15 사장님 확정) 표현. 날짜·가격 같은 정해지지 않은 값은 넣지 않는다.
   쓰는 법
   - 자사몰: MumuIntro.start({base: '그림 폴더 주소/'}) — 첫 방문 확인은 <head> 조각이 하고, 여기서는 머리글 로고 자리를 재서 같은 자리에 같은 로고를 고정한다.
   - 시제품: MumuIntro.mount(틀, {base, frame: true, logo: {src, rect}, onClose})
   운영판(2026-10-16) = 시제품 3판(아티팩트 버전 4) + 자사몰에서 머리글 로고가 자리 잡을 때까지 따라가 맞추기(장면·글·그림은 그대로) */
(function(){
  'use strict';
  var KEY = 'mmtIntroSeen';
  var CAPS = [
    ['귀여움이 우주를 구하다', '도토리 한 알이 굴러 들어왔어요', '무무토리를 대표하는 도토리. 성격은 좋다고 볼 수 있다.'],   // Our Story 원문 그대로(2판)
    ['씨앗 친구들', '뚜껑이 열리자 씨앗 친구들이 나왔고', '그중엔 모든 창작물이 나온다는 대표작가 병아리콩도 있어요.'],
    ['소품상점', '버터가 녹는 작은 상점을 차렸어요', '한 장의 편지, 작은 선물, 감성적인 소품까지.'],
    ['레터서비스', '그리고, 편지가 도착했습니다', '적어 주신 글은 타자기로 찍고, 질문에 답해 주시면 대신 써서 보내 드려요.']
  ];
  var END = ['무무토리 상점', '전하고 싶은 마음이 있는 날', '무무토리는 마음을 전하는 순간을 준비합니다.', '둘러보기'];
  var SRC = {obClosed: 'ob_closed', obOpen: 'ob_open', obCap: 'ob_cap', obSun: 'ob_sun', obSunJ: 'ob_sunj', obChick: 'ob_chick', obPeanut: 'ob_peanut', obSeed: 'ob_seed', obButter: 'ob_butter', obLetter: 'ob_letter', obLetterF: 'ob_letterf', obHeart: 'ob_heart'};
  ['drip1', 'drip2', 'drip3', 'star', 'star2', 'spark', 'sparkg', 'sprout', 'leaf', 'leafb', 'sprig', 'clover', 'bush', 'grass', 'flower', 'flower2', 'burst', 'hpink', 'hbrown', 'hgreen', 'sun', 'cloud', 'cloud2', 'dotb', 'dotc'].forEach(function(k){ SRC[k] = 'd_' + k; });
  // 실제 판매 상품(지금 자사몰 상세 사진에서 배경만 지움 · 색·모양 그대로): 카피바라 말랑이 2 · 미니 패브릭 가방 4
  ['mal1', 'mal2', 'bag1', 'bag2', 'bag3', 'bag4'].forEach(function(k){ SRC['pr' + k.charAt(0).toUpperCase() + k.slice(1)] = 'pr_' + k; });
  var GAP = 16;   // 로고 상자 둘레 비워 둘 여백(px)
  var TMAX = 4.7, END_AT = 4.2;

  var CSS = '.mmi{position:fixed;inset:0;z-index:2147483000;background:#EFE9E4;color:#6A3906;font-family:"GangwonEduPowerExtraBoldA","Jua","Apple SD Gothic Neo","Malgun Gothic",sans-serif;visibility:visible;opacity:1;transition:opacity .45s ease;-webkit-tap-highlight-color:transparent;overflow:hidden}'
    + '.mmi.in-frame{position:absolute}.mmi.out{opacity:0;pointer-events:none}.mmi *{box-sizing:border-box}'
    + '.mmi-scroll{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none}.mmi-scroll::-webkit-scrollbar{display:none}'
    + '.mmi-track{height:560%}.mmi-stage{position:absolute;inset:0;pointer-events:none}'
    + '.mmi-cv{position:absolute;inset:0;width:100%;height:100%;display:block}'
    + '.mmi-logo{position:absolute;z-index:3;height:auto;max-width:none;pointer-events:none;-webkit-user-select:none;user-select:none}'
    + '.mmi-skip{position:absolute;z-index:4;top:calc(env(safe-area-inset-top,0px) + 16px);right:14px;pointer-events:auto;padding:9px 16px 10px;border:2px solid rgba(106,57,6,.2);border-radius:999px;background:rgba(255,253,248,.88);color:#6A3906;font:inherit;font-size:15px;line-height:1;cursor:pointer}'
    + '.mmi-skip:focus-visible,.mmi-go:focus-visible{outline:3px solid #EC7A2C;outline-offset:3px}'
    + '.mmi-cap{position:absolute;left:22px;right:22px;top:76%;text-align:center;transition:opacity .35s ease,transform .35s ease}'
    + '.mmi-veil{position:absolute;inset:0;background:rgba(239,233,228,.72);opacity:0;transition:opacity .4s ease;pointer-events:none}.mmi-veil.show{opacity:1}'
    + '.mmi-tap{position:absolute;padding:5px 11px 6px;border-radius:999px;background:#FFF8EC;border:2px solid rgba(106,57,6,.18);color:#6A3906;font-size:14px;line-height:1;white-space:nowrap;transition:opacity .4s;animation:mmi-b 1.2s ease-in-out infinite;pointer-events:none}'
    + '.mmi-cap.swap,.mmi-cap.hide{opacity:0;transform:translateY(8px)}'
    + '.mmi-k{display:inline-block;padding:5px 12px 6px;border-radius:999px;background:#FDE9BE;color:#6A3906;font-size:13px;letter-spacing:.5px}'
    + '.mmi-t{margin:10px 0 0;font-weight:400;font-size:27px;line-height:1.3;color:#6A3906;text-wrap:balance;word-break:keep-all}'
    + '.mmi-s{margin:8px auto 0;max-width:30em;font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:15px;line-height:1.6;font-weight:600;color:rgba(106,57,6,.85);word-break:keep-all;text-wrap:pretty}'
    + '.mmi-hint{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 20px);margin:0;text-align:center;font-size:14px;color:rgba(106,57,6,.72);transition:opacity .4s}'
    + '.mmi-hint i{display:inline-block;font-style:normal;animation:mmi-b 1.4s ease-in-out infinite}@keyframes mmi-b{50%{transform:translateY(4px)}}'
    + '.mmi-dots{position:absolute;right:12px;top:50%;transform:translateY(-50%);display:grid;gap:9px}'
    + '.mmi-dots i{display:block;width:7px;height:7px;border-radius:50%;background:rgba(106,57,6,.22);transition:background .3s,transform .3s}.mmi-dots i.on{background:#EC7A2C;transform:scale(1.35)}'
    + '.mmi-end{position:absolute;left:50%;top:45%;width:min(86%,440px);padding:26px 22px 26px;border-radius:32px;background:rgba(255,253,248,.94);box-shadow:0 18px 40px rgba(106,57,6,.16);text-align:center;opacity:0;transform:translate(-50%,-46%) scale(.96);pointer-events:none;transition:opacity .4s ease,transform .4s ease}'
    + '.mmi-end.show{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}'
    + '.mmi-go{margin-top:18px;padding:15px 36px 16px;border:0;border-radius:999px;background:#6A3906;color:#FDE9BE;font:inherit;font-size:19px;line-height:1;cursor:pointer;box-shadow:0 5px 0 rgba(106,57,6,.22)}'
    + '.mmi.pc .mmi-cap{top:auto;bottom:5%}.mmi.pc .mmi-hint{bottom:10px}.mmi.pc .mmi-t{font-size:38px}.mmi.pc .mmi-s{font-size:17px;max-width:44em}.mmi.pc .mmi-k{font-size:15px}'
    + '.mmi.pc .mmi-skip{top:26px;right:30px;font-size:16px}.mmi.pc .mmi-dots{right:26px}.mmi.pc .mmi-end{padding:34px 30px 32px}.mmi.pc .mmi-end .mmi-t{font-size:36px}'
    + '@media (prefers-reduced-motion: reduce){.mmi-hint i{animation:none}.mmi-cap,.mmi-end,.mmi{transition:none}}';

  function css(){ if (document.getElementById('mmi-css')) return; var s = document.createElement('style'); s.id = 'mmi-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
  var clamp = function(v){ return Math.max(0, Math.min(1, v)); };
  var lerp = function(a, b, t){ return a + (b - a) * t; };
  var eo = function(t){ return 1 - Math.pow(1 - t, 3); };
  var eio = function(t){ return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var back = function(t){ var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  /* 한 장면 그리기(목업 '브랜드 이야기' 그대로 옮김 · 친구는 받은 05 그림 4명). T: 0~4, now: 흐르는 시간(둥실거림), px·py: 마우스(-1~1) */
  /* X(2판): ko = 로고 상자 + 16px(그림 좌표) — 오브제가 들어오지 않는 곳, top = 머리글 아래 선(버터 차양이 여기서 시작), poke = 도토리 톡(0~1) */
  function draw(c, IM, W, H, T, now, px, py, X){
    now = now || 0; px = px || 0; py = py || 0; X = X || {};
    var KO = X.ko || null, TOP = X.top || 0, poke = X.poke || 0;
    var m = H > W, AH = m ? W * .38 : Math.min(H * .40, W * .225), G = m ? H * .66 : H * .72, ax = W * .5, PV = G - AH * .5;
    var t1 = clamp(T), t2 = clamp(T - 1), t3 = clamp(T - 2), t4 = clamp(T - 3);
    var eA = back(clamp((t3 - .02) / .30)), barH = AH * (m ? .17 : .15);   // 버터 차양(장면 3) 나오는 정도 · 두께
    var zin = t2 < .3 ? eio(t2 / .3) : 1 - eio((t2 - .3) / .7);
    var camX = -W * .10 * (1 - eo(t1)), camZ = 1.05 - .05 * eo(t1) + .10 * zin - .06 * eio(t3) + .11 * eio(t4), camY = AH * (.14 * zin + .07 * eio(t3) - .03 * eio(t4));
    var P = function(x, y, d){ var sc = 1 + (camZ - 1) * d; return {x: ax + (x - ax) * sc - camX * d + px * W * .016 * (d - .4), y: PV + (y - PV) * sc + camY * d + py * H * .014 * (d - .4), s: sc}; };
    var bob = function(sp, ph, amp){ return Math.sin(now * .001 * sp + ph) * amp; };
    var spr = function(k, x, y, h, o){
      var im = IM[k]; if (!im) return; o = o || {};
      var p = P(x, y, o.d == null ? 1 : o.d), hh = (o.w ? o.w * im.height / im.width : h) * p.s, ww = hh * im.width / im.height, a = o.a == null ? 1 : clamp(o.a);
      if (a <= 0 || hh <= 0) return;
      if (KO && o.ko !== false){   // 로고 둘레에 들어오면: 기본은 그 아래로 밀어내고, 스쳐 가는 것(ko:'fade')은 흐려서 지움
        var r0 = o.r || 0, sw = (o.sx || 1) * ww, sh = (o.sy || 1) * hh, oy = o.an === 'c' ? 0 : o.an === 't' ? sh / 2 : -sh / 2;
        var cx = p.x - oy * Math.sin(r0), cy = p.y + oy * Math.cos(r0), bw = Math.abs(sw * Math.cos(r0)) + Math.abs(sh * Math.sin(r0)), bh = Math.abs(sw * Math.sin(r0)) + Math.abs(sh * Math.cos(r0));
        if (cx + bw / 2 > KO.x0 && cx - bw / 2 < KO.x1 && cy - bh / 2 < KO.y1){
          if (o.ko === 'fade'){ var dep = Math.min(KO.y1 - (cy - bh / 2), cx + bw / 2 - KO.x0, KO.x1 - (cx - bw / 2)); a *= clamp(1 - dep / (Math.min(bw, bh) * .45)); }
          else p.y += KO.y1 - (cy - bh / 2);
          if (a <= 0) return;
        }
      }
      c.save(); c.globalAlpha = a; c.translate(p.x, p.y); if (o.r) c.rotate(o.r); c.scale(o.sx || 1, o.sy || 1);
      c.drawImage(im, -ww / 2, o.an === 'c' ? -hh / 2 : o.an === 't' ? 0 : -hh, ww, hh); c.restore();
    };
    var shadow = function(x, y, w, a){ if (a <= 0) return; var p = P(x, y, 1); c.save(); c.globalAlpha = a; c.fillStyle = '#6A3906'; c.beginPath(); c.ellipse(p.x, p.y, w * p.s / 2, w * p.s * .075, 0, 0, 7); c.fill(); c.restore(); };
    c.clearRect(0, 0, W, H);
    var hp = P(ax, PV, .3), hr = AH * (m ? 1.7 : 2.1), gl = c.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, hr);
    gl.addColorStop(0, 'rgba(253,233,190,.95)'); gl.addColorStop(.5, 'rgba(253,233,190,.6)'); gl.addColorStop(1, 'rgba(253,233,190,0)');
    c.fillStyle = gl; c.fillRect(0, 0, W, H);
    // 먼 층: 해·구름·반짝이
    var sunIn = eo(clamp(t1 / .7));
    spr('sun', m ? W * .80 : W * .845, (m ? H * .17 : H * .21) + (1 - sunIn) * H * .18 + bob(.6, 0, AH * .02), AH * .46, {d: .4, an: 'c', r: now * .00012 + t1 * .8, a: sunIn});
    spr('cloud', (m ? W * .21 : W * .145) + bob(.25, 1, W * .012), m ? H * .20 : H * .25, AH * .40, {d: .5, an: 'c', a: .97});
    spr('cloud2', (m ? W * .66 : W * .665) + bob(.2, 3, W * .015), m ? H * .27 : H * .14, AH * .25, {d: .35, an: 'c', a: .92});
    (m ? [['spark', .50, .135, .16], ['sparkg', .93, .42, .13], ['star2', .07, .36, .15], ['spark', .90, .62, .11]] : [['spark', .31, .15, .17], ['sparkg', .945, .47, .14], ['star2', .055, .50, .17], ['spark', .56, .09, .11], ['sparkg', .245, .36, .10]]).forEach(function(q, i){
      var tw = .78 + .22 * Math.sin(now * .0022 + i * 1.7);
      spr(q[0], W * q[1], H * q[2], AH * q[3] * tw, {d: .45 + (i % 3) * .1, an: 'c', r: Math.sin(now * .0006 + i) * .25, a: clamp(T * 2.2 - i * .35) * .95});
    });
    spr('obLetterF', W * (1.1 - t4 * 1.0), H * .32 - Math.sin(t4 * Math.PI) * H * .08 + bob(.9, 2, AH * .02), AH * .2, {d: .5, an: 'c', r: -.3 + t4 * .5, a: Math.sin(clamp(t4) * Math.PI) * 1.4, ko: 'fade'});
    // 뒤쪽 바닥: 장면 3에서 솟아나는 풀·꽃
    var hw = W / 2, sprout = function(i){ return back(clamp((t3 - .30 - i * .07) / .30)); };
    (m ? [['bush', .80, -.02, .44, .85], ['grass', -.84, 0, .24, .85], ['clover', -.60, .30, .30, 1.06], ['flower', .84, .32, .22, 1.06], ['flower2', -.90, .34, .17, 1.08]]
       : [['bush', .90, -.01, .50, .85], ['grass', -.93, 0, .28, .85], ['clover', -.80, .07, .33, 1.06], ['flower', -.69, .09, .22, 1.08], ['flower2', .685, .09, .20, 1.08], ['sprout', .97, .10, .26, 1.1]]).forEach(function(q, i){
      var e = sprout(i); if (e <= 0) return;
      spr(q[0], ax + hw * q[1], G + AH * q[2], AH * q[3], {d: q[4], sy: e, sx: .7 + .3 * clamp(e), r: bob(.9, i, .03)});
    });
    // 가운데 층: 도토리와 씨앗 친구들(받은 05 그림: 해바라기씨 · 병아리콩 모양 · 땅콩 · 작은 씨앗)
    var FR = m ? [['obSun', -.93, 0], ['obChick', -.50, 0], ['obPeanut', .52, 0], ['obSeed', .94, 0]] : [['obSun', -1.33, 0], ['obChick', -.755, 0], ['obPeanut', .755, 0], ['obSeed', 1.33, 0]];
    var RANK = [1, 0, 2, 3];
    var lean = 1 - .10 * eio(clamp(t4 / .6));
    var U = AH / (IM.obClosed ? IM.obClosed.height : 456), capDraw = null;
    var friend = function(i, front){
      var f = FR[i], u = clamp((t2 - .24 - RANK[i] * .105) / .34); if (T < 1 || u <= 0 || front !== true) return;
      var key = f[0] === 'obSun' && u < .9 && IM.obSunJ ? 'obSunJ' : f[0], im = IM[key]; if (!im) return;
      var h = im.height * U, tx = ax + AH * f[1] * lean, by = G + AH * f[2], e = eo(u);
      var x = lerp(ax, tx, e), y = lerp(G - AH * .50, by, u) - Math.sin(u * Math.PI) * AH * (.55 + .08 * RANK[i]);
      var sc = .2 + .8 * back(clamp(u / .75)), land = u < 1 ? Math.sin(clamp((u - .88) / .12) * Math.PI) : 0;
      var hop = -Math.abs(Math.sin(Math.PI * clamp((t3 - .46 - i * .07) / .22))) * AH * .13 - (f[0] === 'obSeed' ? Math.abs(Math.sin(t4 * Math.PI * 4)) * AH * .07 * clamp(t4 * 3) * (1 - clamp((t4 - .85) / .15)) : 0);
      var br = u >= 1 ? 1 + .012 * Math.sin(now * .002 + i * 1.3) : 1;
      shadow(tx, by + AH * .01, h * .5 * (1 + hop / AH), clamp((u - .8) / .2) * .16);
      spr(key, x, y + hop, h * sc, {r: (1 - e) * (i % 2 ? 1 : -1) * 4.4, sy: (1 - .11 * land) * br, sx: 1 + .07 * land});
    };
    // 도토리: 굴러 들어옴 → 뚜껑이 튀어 올라 날아감 → 열린 몸통에서 친구들 → 뚜껑이 지붕처럼 → 편지를 담고 닫힘
    var OPEN = .13, closeU = clamp((t4 - .73) / .11);
    if (IM.obClosed && T < 1){
      var e0 = eo(t1), x0 = lerp(-W * .22, ax, e0), bn = -Math.abs(Math.sin(t1 * Math.PI * 3.2)) * AH * .16 * (1 - t1);
      for (var d0 = 1; d0 <= 4; d0++){ var dq = clamp(t1 * 1.5 - d0 * .08), dz = AH * (.05 + .05 * dq) * (1 - t1); if (dz > 1 && t1 < .92) spr(d0 % 2 ? 'dotc' : 'dotb', x0 - AH * (.34 + d0 * .2), G - dz * .5 - Math.abs(Math.sin(t1 * 9 + d0)) * AH * .05, dz * 2, {an: 'c', a: (1 - t1) * .8}); }
      shadow(x0, G + AH * .01, AH * .62 * (1 + bn / AH), .18);
      var pk0 = -Math.abs(Math.sin(poke * Math.PI * 2)) * AH * .22 * (1 - poke);
      spr('obClosed', x0, G - AH * .5 + bn + pk0, AH, {an: 'c', r: (1 - e0) * -Math.PI * 3.2});
      X.acornAt = {x: x0, y: G - AH * .5, r: AH * .62};
    } else if (IM.obClosed && IM.obOpen && IM.obCap){
      var opened = t2 >= OPEN && closeU < 1, ant = t2 < OPEN ? Math.sin(t2 / OPEN * Math.PI) * .10 : 0;
      var pop = 1 + .14 * Math.sin(clamp((t2 - OPEN) / .10) * Math.PI) + .12 * Math.sin(clamp((t4 - .84) / .10) * Math.PI);
      var hopB = -Math.abs(Math.sin(Math.PI * clamp((t4 - .84) / .10))) * AH * .08 - Math.abs(Math.sin(Math.PI * clamp((t3 - .40) / .2))) * AH * .05 - Math.abs(Math.sin(poke * Math.PI * 2)) * AH * .22 * (1 - poke), brB = 1 + .010 * Math.sin(now * .0019) + .07 * Math.sin(poke * Math.PI * 4) * (1 - poke);
      X.acornAt = {x: ax, y: G - AH * .5, r: AH * .62};
      shadow(ax, G + AH * .01, AH * .60 * (1 + hopB / AH), .18);
      if (opened) spr('obOpen', ax, G + hopB, IM.obOpen.height * U, {sx: pop, sy: pop * brB});
      else spr('obClosed', ax, G + hopB, AH, {sx: (1 + ant * .6) * pop, sy: (1 - ant) * pop * brB});
      if (opened) capDraw = function(){
        var cu = clamp((t2 - OPEN) / .32), ce = eo(cu), roof = eio(clamp((t3 - .05) / .45)), peek = Math.sin(clamp((t4 - .20) / .52) * Math.PI), cl = eio(closeU);
        var hx = lerp(ax + AH * .66, ax + AH * .02, roof) + peek * AH * .16, hy = lerp(G - AH * 1.50, G - AH * 1.17, roof) - peek * AH * .24, hr = lerp(.32, -.04, roof) + peek * .30;
        var cx = lerp(lerp(ax - AH * .02, hx, ce), ax - AH * .03, cl), cy = lerp(lerp(G - AH * .70, hy, ce) - Math.sin(cu * Math.PI) * AH * .22, G - AH * .72, cl), cr = lerp((1 - ce) * -6.283 + hr, 0, cl);
        var capMin = TOP + barH * 1.25 + IM.obCap.height * U * .55;   // 차양이 나온 뒤에는 뚜껑이 차양 아래에 머묾(2판)
        if (eA > 0 && cy < capMin) cy += (capMin - cy) * clamp(eA);
        spr('obCap', cx, cy + bob(1.1, 0, AH * .02) * (1 - cl), IM.obCap.height * U, {an: 'c', d: 1.08, r: cr + bob(.7, 1, .035) * (1 - cl)});
      };
      var bw = clamp((t2 - OPEN) / .26);
      if (bw > 0 && bw < 1){ var bA = 1 - bw * bw, bS = AH * (.22 + .2 * eo(bw)); spr('burst', ax - AH * .56, G - AH * .86, bS, {an: 'c', sx: -1, r: .5, a: bA}); spr('burst', ax + AH * .60, G - AH * .92, bS, {an: 'c', r: -.1, a: bA}); spr('spark', ax - AH * .30, G - AH * (1.05 + .25 * eo(bw)), bS * .8, {an: 'c', r: bw * 2, a: bA}); }
    }
    for (var j = 0; j < FR.length; j++) friend(j, true);
    if (capDraw) capDraw();
    // 도토리를 톡: 통통 튀며 작은 하트 두 개
    if (poke > 0 && poke < 1) [['hpink', -.42], ['hbrown', .46]].forEach(function(q, i){ spr(q[0], ax + AH * q[1], G - AH * (1.0 + .55 * eo(poke)), AH * .13 * back(clamp(poke * 2.2)), {an: 'c', r: q[1] * .6, a: 1 - poke * poke}); });
    // 작은 상점(장면 3~): 나무 진열대 + 이름표(가격 없음) 위에 진열된 말랑이(실제 상품 사진 · 배경만 지움 · 3판에서 키움)
    var stand = function(x, yTop, w, h, a, label){   // 점토 느낌 나무 받침: 윗면 · 앞면 · 이름표
      var p = P(x, yTop, 1), sw = w * p.s, sh = h * p.s, X0 = p.x - sw / 2, Y0 = p.y;
      c.save(); c.globalAlpha = a;
      c.fillStyle = 'rgba(106,57,6,.16)'; c.beginPath(); c.ellipse(p.x, Y0 + sh + sh * .12, sw * .56, sh * .22, 0, 0, 7); c.fill();
      var g = c.createLinearGradient(0, Y0, 0, Y0 + sh); g.addColorStop(0, '#E2BC86'); g.addColorStop(1, '#C8985C');
      c.fillStyle = g; c.beginPath(); if (c.roundRect) c.roundRect(X0, Y0, sw, sh, [sh * .12, sh * .12, sh * .38, sh * .38]); else c.rect(X0, Y0, sw, sh); c.fill();
      c.fillStyle = '#F1D9AE'; c.beginPath(); c.ellipse(p.x, Y0, sw / 2, sh * .30, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(p.x - sw * .08, Y0 - sh * .05, sw * .32, sh * .10, 0, 0, 7); c.fill();
      var tw = sw * .62, th = sh * .50, tx = p.x - tw / 2, ty = Y0 + sh * .36;
      c.fillStyle = '#FFF8EC'; c.strokeStyle = 'rgba(106,57,6,.28)'; c.lineWidth = Math.max(1, sh * .03);
      c.beginPath(); if (c.roundRect) c.roundRect(tx, ty, tw, th, th * .3); else c.rect(tx, ty, tw, th); c.fill(); c.stroke();
      c.fillStyle = '#6A3906'; c.font = Math.round(th * .62) + 'px GangwonEduPowerExtraBoldA, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, p.x, ty + th * .54); c.restore();
    };
    (m ? [['prMal1', -.74, .22], ['prMal2', .76, .24]] : [['prMal1', -1.04, -.02], ['prMal2', 1.06, -.01]]).forEach(function(q, i){
      var u = clamp((t3 - .42 - i * .08) / .30); if (u <= 0 || !IM[q[0]]) return;
      var x = ax + AH * q[1] * lean, y = G + AH * q[2], h = AH * (m ? .52 : .56), su = clamp(u * 1.6);
      stand(x, y, AH * (m ? .56 : .52), AH * (m ? .15 : .14) * back(su), clamp(u * 4), '말랑이');
      spr(q[0], x, y - Math.abs(Math.sin(Math.PI * clamp((t4 - .78 - i * .05) / .2))) * AH * .06, h * back(u), {d: 1, r: (1 - u) * (i ? 1 : -1) * .9 + bob(.9, i + 4, .02)});
    });
    // 장면 4: 편지가 날아와 열린 몸통 안으로 쏙 → 뚜껑이 닫히고 하트
    if (T > 3){
      var e4 = eo(clamp(t4 / .50)), dr = eio(clamp((t4 - .52) / .16)), flip = e4 < 1 ? Math.cos(e4 * Math.PI * 4) : 1;
      var lx = lerp(W * 1.10, ax + AH * .02, e4), ly = lerp(-H * .06, G - AH * .94, e4) - Math.sin(e4 * Math.PI) * AH * .30 + dr * AH * .46;
      var lmix = clamp((e4 - .80) / .20), lfade = 1 - clamp((dr - .70) / .30), lhh = AH * lerp(.22, .34, e4) * (1 - .45 * dr), lyy = ly + bob(1.4, 0, AH * .012) * (1 - dr);
      spr('obLetterF', lx, lyy, lhh * 1.06, {an: 'c', r: (1 - e4) * 1.1 + .12 * lmix, sx: Math.sign(flip || 1) * Math.max(.14, Math.abs(flip)), a: (1 - lmix) * lfade});
      spr('obLetter', lx, lyy, lhh, {an: 'c', r: -.05 + dr * .22, a: lmix * lfade});
      var hu = clamp((t4 - .84) / .16), hy0 = G - AH * .58;
      if (hu > 0) ['obHeart', 'hbrown', 'obHeart', 'hgreen', 'obHeart', 'hpink', 'obHeart'].forEach(function(k, i){
        var big = k === 'obHeart' ? 1.4 : 1, an = -Math.PI * (.08 + i * .14), rr = AH * (.66 + (i % 3) * .22) * eo(hu);
        spr(k, ax + Math.cos(an) * rr * 1.25, hy0 + Math.sin(an) * rr - hu * AH * .12 + bob(1.1, i, AH * .025), AH * (.12 + (i % 3) * .035) * big * back(clamp(hu * 1.6)), {d: 1.1 + (i % 3) * .15, an: 'c', r: (i - 3) * .16 + bob(.8, i, .12)});
      });
    }
    // 가까운 층(장면 3): 머리글 아래 선에서 내려오는 버터 차양 → 차양에 매달린 미니 가방(실제 상품 사진) · 녹아 흐르는 버터
    var nx = function(f){ return W * f - camX * 1.3 + px * W * .016 * .9; };
    (m ? [['prBag1', .12, .10], ['prBag2', .36, .06], ['prBag3', .64, .07], ['prBag4', .88, .11]] : [['prBag1', .18, .07], ['prBag2', .385, .05], ['prBag3', .615, .055], ['prBag4', .82, .075]]).forEach(function(q, i){
      var u = clamp((t3 - .10 - i * .05) / .32), im = IM[q[0]]; if (u <= 0 || !im) return;
      var L = q[2] * H * eo(u), hh = AH * (m ? .40 : .34), ww = hh * im.width / im.height, sw = Math.sin(now * .0017 + i * 1.4) * .07 * u + (1 - u) * .5 * (i % 2 ? 1 : -1);
      c.save(); c.globalAlpha = clamp(u * 3); c.translate(nx(q[1]), TOP + barH * .8); c.rotate(sw);
      c.strokeStyle = 'rgba(106,57,6,.55)'; c.lineWidth = Math.max(1.5, W / 520); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, L + hh * .02); c.stroke();
      c.drawImage(im, -ww / 2, L - hh * .04, ww, hh); c.restore();
    });
    (m ? [['drip1', .25, 1.30], ['drip3', .63, .62], ['drip2', .90, .80]] : [['drip2', .085, .80], ['drip1', .27, 1.0], ['drip3', .73, .62], ['drip1', .91, .92]]).forEach(function(q, i){   // PC는 가운데(뚜껑 지붕 위) 드립을 비움(2판)
      var u = clamp((t3 - .03 - i * .07) / .40), im = IM[q[0]]; if (u <= 0 || !im) return;
      var ww = AH * q[2], hh = ww * im.height / im.width * (.12 + .88 * back(u)) * (1 + .03 * Math.sin(now * .0015 + i)), x = nx(q[1]);
      c.save(); c.globalAlpha = clamp(u * 4); c.drawImage(im, x - ww / 2, TOP + barH * .45, ww, hh); c.restore();
    });
    if (eA > 0){   // 차양: 받은 버터 그림과 같은 색(그림에서 뽑은 값)으로, 위쪽 선은 머리글 아래에 맞춤
      var bh2 = barH * eA, gr = c.createLinearGradient(0, TOP, 0, TOP + bh2);
      gr.addColorStop(0, '#FBDA92'); gr.addColorStop(1, '#EDBC6E');
      c.save(); c.globalAlpha = clamp((t3 - .02) * 6);
      c.fillStyle = 'rgba(106,57,6,.10)'; c.beginPath(); c.roundRect ? c.roundRect(-W * .05, TOP + bh2 * .25, W * 1.1, bh2, bh2 / 2) : c.rect(-W * .05, TOP + bh2 * .25, W * 1.1, bh2); c.fill();
      c.fillStyle = gr; c.beginPath(); c.roundRect ? c.roundRect(-W * .05, TOP, W * 1.1, bh2, bh2 / 2) : c.rect(-W * .05, TOP, W * 1.1, bh2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.38)'; c.fillRect(-W * .05, TOP + bh2 * .16, W * 1.1, Math.max(1, bh2 * .12));
      c.restore();
    }
    if (IM.obButter){ var bq = clamp((t3 - .08) / .40), bhh = IM.obButter.height * U * (m ? .80 : .90), bwv = 1 + .025 * Math.sin(now * .0016), bim = IM.obButter, bw2 = bhh * bim.width / bim.height;
      if (bq > 0){ c.save(); c.globalAlpha = clamp(bq * 4); c.translate(nx(m ? .10 : .055), TOP + barH + bhh * (.15 + .25 * back(bq))); c.rotate(-.10 + .02 * Math.sin(now * .001)); c.scale(bwv, 1 / bwv); c.drawImage(bim, -bw2 / 2, -bhh / 2, bw2, bhh); c.restore(); } }
    spr('star', ax - AH * (m ? .98 : 1.5), H * (m ? .36 : .34) + bob(.8, 1, AH * .02), AH * .26 * back(clamp((t3 - .55) / .3)), {d: 1.2, an: 'c', r: -.25 + bob(.5, 0, .1)});
    if (T < 1.4) [['leaf', .16, 1.55, .30], ['leafb', .52, 1.75, .24], ['leaf', .86, .7, .15]].forEach(function(q, i){
      var u = clamp(T * 1.05 - i * .17); if (u <= 0 || u >= 1) return;
      spr(q[0], W * q[1] + u * W * .22 + Math.sin(u * 7 + i) * W * .02, lerp(-H * .12, H * 1.12, u), AH * q[3], {d: q[2], an: 'c', r: u * 6 + i * 2, a: Math.sin(u * Math.PI) * 1.6, ko: 'fade'});
    });
    spr('obLetterF', lerp(-W * .12, W * (m ? .9 : .42), t4), lerp(H * 1.05, H * (m ? .52 : .10), eio(t4)), AH * .46, {d: 1.9, an: 'c', r: -.5 + t4 * .9, a: Math.sin(t4 * Math.PI) * 1.5, ko: 'fade'});
    spr('sprig', m ? W * .03 : W * .04, H * 1.05, AH * (m ? .80 : .98), {d: 1.75, r: .28 + bob(.5, 0, .035), ko: false});
    spr('leaf', m ? W * .98 : W * .968, H * 1.06, AH * (m ? .62 : .80), {d: 1.9, r: -.42 + bob(.42, 2, .045), ko: false});
  }

  /* 인트로 붙이기. host: 붙일 곳(자사몰은 body, 시제품은 휴대폰·PC 틀) */
  function mount(host, cfg){
    cfg = cfg || {};
    css();
    var reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var root = document.createElement('div');
    root.className = 'mmi' + (cfg.frame ? ' in-frame' : '');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', '무무토리 소개');
    root.innerHTML = '<div class="mmi-scroll"><div class="mmi-track"></div></div>'
      + '<div class="mmi-stage"><canvas class="mmi-cv" aria-hidden="true"></canvas>'
      + '<div class="mmi-cap" aria-live="polite"><span class="mmi-k"></span><h2 class="mmi-t"></h2><p class="mmi-s"></p></div>'
      + '<p class="mmi-hint">천천히 내려 보세요 <i>↓</i></p><span class="mmi-tap" aria-hidden="true">톡!</span><div class="mmi-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>'
      + '<div class="mmi-veil"></div><div class="mmi-end"><span class="mmi-k"></span><h2 class="mmi-t"></h2><p class="mmi-s"></p><button type="button" class="mmi-go"></button></div></div>'
      + '<img class="mmi-logo" alt="무무토리 상점"><button type="button" class="mmi-skip">건너뛰기</button>';
    host.appendChild(root);
    var q = function(s){ return root.querySelector(s); };
    var sc = q('.mmi-scroll'), cv = q('.mmi-cv'), ctx = cv.getContext('2d'), cap = q('.mmi-cap'), end = q('.mmi-end'), hint = q('.mmi-hint'), veil = q('.mmi-veil'), tap = q('.mmi-tap'), dots = [].slice.call(root.querySelectorAll('.mmi-dots i')), logo = q('.mmi-logo');
    end.querySelector('.mmi-k').textContent = END[0]; end.querySelector('.mmi-t').textContent = END[1]; end.querySelector('.mmi-s').textContent = END[2]; end.querySelector('.mmi-go').textContent = END[3];
    var IM = {}, ready = false, closed = false, raf = 0, introAt = 0, seqT = 0, lastS = -1, ptr = {x: 0, y: 0, tx: 0, ty: 0}, W = 780, H = 1688, pc = false;
    var prevOverflow = null;
    if (!cfg.frame){ prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; }
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}   // 보이기 시작하면 '봤음'(다음 방문부터 바로 메인)

    // 로고: 머리글 로고와 같은 파일·같은 자리·같은 크기(높이는 원래 비율대로 따라감)
    logo.src = cfg.logo && cfg.logo.src || '';
    function place(){
      pc = root.clientWidth >= 700; root.classList.toggle('pc', pc);
      var r = cfg.logo && cfg.logo.rect ? cfg.logo.rect(root) : null;
      if (r && r.width > 0 && r.width <= 240){ logo.style.left = r.left + 'px'; logo.style.top = r.top + 'px'; logo.style.width = r.width + 'px'; }
      else { var w = pc ? 100 : 50; logo.style.width = w + 'px'; logo.style.left = (root.clientWidth - w) / 2 + 'px'; logo.style.top = (pc ? 17 : 13) + 'px'; }
      var cw = root.clientWidth || 390, ch = root.clientHeight || 844, w2 = pc ? 1600 : 780, h2 = Math.round(w2 * ch / cw);
      if (cv.width !== w2 || cv.height !== h2){ cv.width = w2; cv.height = h2; } W = w2; H = h2;
      hint.firstChild.nodeValue = pc ? '스크롤을 내려 보세요 ' : '천천히 내려 보세요 ';
      // 로고 상자 + 16px: 그림이 들어오지 않는 곳 / 머리글 아래 선: 버터 차양이 시작하는 곳(2판)
      var k = W / cw, L = parseFloat(logo.style.left) || 0, Tt = parseFloat(logo.style.top) || 0, Lw = parseFloat(logo.style.width) || 50, Lh = Lw * (logo.naturalWidth ? logo.naturalHeight / logo.naturalWidth : 690 / 515);
      var hb = cfg.header ? cfg.header(root) : 0;
      XO.ko = {x0: (L - GAP) * k, y0: Math.max(0, Tt - GAP) * k, x1: (L + Lw + GAP) * k, y1: (Tt + Lh + GAP) * k};
      XO.top = Math.max(hb || 0, Tt + Lh + GAP) * k;
    }
    var XO = {ko: null, top: 0, poke: 0}, pokeAt = 0;
    logo.addEventListener('load', function(){ place(); });
    place();
    // 자사몰(운영): 처음엔 스타일이 늦게 입혀져 머리글 로고가 크게 재지고(PC 515px) 살짝 내려앉은 뒤 제자리에 선다(PC 약 2.2초·휴대폰 1.5초, 10/16 실측)
    // → 처음 6초 동안 0.1초마다 머리글 로고·머리글 아래 선을 다시 재서 바뀌면 같은 자리로 옮긴다. 240px 넘는 크기는 스타일 전 값이라 무시(위 place).
    var follow = 0;
    if (!cfg.frame && cfg.logo && cfg.logo.rect){
      var fk = '', f0 = Date.now();
      follow = setInterval(function(){
        var r = cfg.logo.rect(root), hb = cfg.header ? cfg.header(root) : 0, k = (r ? [r.left, r.top, r.width].join() : '') + '|' + hb;
        if (k !== fk){ fk = k; place(); }
        if (Date.now() - f0 > 6000) clearInterval(follow);
      }, 100);
    }
    var keys = Object.keys(SRC), need = ['obClosed', 'obOpen', 'obCap'], left = need.length;
    keys.forEach(function(k){ var im = new Image(); im.decoding = 'async'; im.onload = function(){ IM[k] = im; if (need.indexOf(k) >= 0 && --left === 0) ready = true; }; im.src = (cfg.base || 'img/') + SRC[k] + '.webp'; });
    setTimeout(function(){ ready = true; }, 4000);   // 그림이 늦어도 4초 뒤엔 시작

    function setCap(s){
      if (s === lastS) return; lastS = s;
      dots.forEach(function(d, i){ d.classList.toggle('on', i === s); });
      if (s === 4){ cap.classList.add('hide'); end.classList.add('show'); veil.classList.add('show'); return; }
      end.classList.remove('show'); veil.classList.remove('show'); cap.classList.remove('hide'); cap.classList.add('swap');
      setTimeout(function(){ cap.querySelector('.mmi-k').textContent = CAPS[s][0]; cap.querySelector('.mmi-t').textContent = CAPS[s][1]; cap.querySelector('.mmi-s').textContent = CAPS[s][2]; cap.classList.remove('swap'); }, lastS === 0 && !introAt ? 0 : 180);
    }
    cap.querySelector('.mmi-k').textContent = CAPS[0][0]; cap.querySelector('.mmi-t').textContent = CAPS[0][1]; cap.querySelector('.mmi-s').textContent = CAPS[0][2];
    setCap(0);

    function loop(now){
      raf = 0; if (closed) return;
      var span = sc.scrollHeight - sc.clientHeight, sp = span > 0 ? clamp(sc.scrollTop / span) : 0;
      if (ready && !introAt) introAt = now;
      var intro = reduce ? 1 : (introAt ? clamp((now - introAt) / 1900) : 0), goal = intro + sp * (TMAX - intro), dT = goal - seqT;
      seqT = reduce ? (sp > 0 ? Math.min(TMAX, Math.floor(goal) + .999) : .999) : (Math.abs(dT) < .0008 ? goal : seqT + dT * .13);
      ptr.x += (ptr.tx - ptr.x) * .07; ptr.y += (ptr.ty - ptr.y) * .07;
      XO.poke = pokeAt ? clamp((now - pokeAt) / 650) : 0; if (XO.poke >= 1) pokeAt = 0;
      draw(ctx, IM, W, H, Math.min(seqT, 3.999), reduce ? 0 : now, ptr.x, ptr.y, XO);
      setCap(seqT > END_AT ? 4 : Math.min(3, Math.floor(Math.max(0, seqT - .10))));
      hint.style.opacity = sp > .015 || intro < 1 ? 0 : 1;
      // '톡!' 말풍선: 첫 장면에서만 도토리 오른쪽 위에(3판 — 아래 안내와 잎이 겹치지 않게 옮김)
      var a = XO.acornAt, on = !reduce && a && sp <= .015 && intro >= 1 && seqT < 1.05;
      if (a){ var kx = root.clientWidth / W, ky = root.clientHeight / H; tap.style.left = Math.round((a.x + a.r * .55) * kx) + 'px'; tap.style.top = Math.round((a.y - a.r * 1.05) * ky) + 'px'; }
      tap.style.opacity = on ? 1 : 0;
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    var onResize = function(){ place(); };
    window.addEventListener('resize', onResize);
    root.addEventListener('pointermove', function(ev){ if (ev.pointerType === 'touch' || !pc) return; var r = root.getBoundingClientRect(); ptr.tx = ((ev.clientX - r.left) / r.width - .5) * 2; ptr.ty = ((ev.clientY - r.top) / r.height - .5) * 2; });
    root.addEventListener('pointerleave', function(){ ptr.tx = 0; ptr.ty = 0; });
    // 도토리를 톡 누르면 통통(스크롤·건너뛰기는 그대로)
    root.addEventListener('click', function(ev){
      if (ev.target.closest && ev.target.closest('button') || !XO.acornAt || reduce) return;
      var r = root.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height, a = XO.acornAt;
      if ((x - a.x) * (x - a.x) + (y - a.y) * (y - a.y) < a.r * a.r) pokeAt = performance.now();
    });
    function close(how){
      if (closed) return; closed = true;
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      cancelAnimationFrame(raf); clearInterval(follow); window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey);
      root.classList.add('out');
      setTimeout(function(){ if (root.parentNode) root.parentNode.removeChild(root); if (!cfg.frame) document.documentElement.style.overflow = prevOverflow || ''; if (cfg.onClose) cfg.onClose(how); }, reduce ? 0 : 460);
    }
    var onKey = function(e){ if (e.key === 'Escape') close('esc'); };
    document.addEventListener('keydown', onKey);
    q('.mmi-skip').addEventListener('click', function(){ close('skip'); });
    q('.mmi-go').addEventListener('click', function(){ close('go'); });
    return {close: close, el: root};
  }

  /* 자사몰에서: <head> 조각이 첫 방문을 확인한 뒤 부른다. 머리글 로고를 찾아 같은 자리에 둔다 */
  function start(cfg){
    cfg = cfg || {};
    var go = function(){
      var d = document.documentElement;
      var hl = document.querySelector('header img');
      var hd = document.querySelector('header');
      mount(document.body, {base: cfg.base, header: function(){ var r = hd && hd.getBoundingClientRect(); return r && r.height ? r.bottom : 0; }, logo: {src: hl ? (hl.currentSrc || hl.src) : (cfg.logoSrc || ''), rect: function(){ var r = hl && hl.getBoundingClientRect(); return r && r.width ? {left: r.left, top: r.top, width: r.width} : null; }}, onClose: cfg.onClose});
      d.classList.remove('mmi-wait');
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }

  window.MumuIntro = {mount: mount, start: start, draw: draw, KEY: KEY};
})();
