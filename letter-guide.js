/* 무무토리 레터 — 날아다니는 도토리 도우미 (2026-11-04 사장님: "화면 움직임에 따라 도토리가 작게 슈퍼맨처럼 돌아다니면서
 * 말풍선으로 이거하면돼요! 요거하면 돼요! 이거해봐요!")
 * - 원래 3D 도토리 그림 그대로(크기만 줄임). 날아가는 느낌은 기울기 · 바람 줄 움직임으로만 낸다.
 * - 지금 단계에서 아직 안 한 칸을 찾아 그 옆으로 날아가 말풍선을 띄운다. 화면을 내리고 올리면 보이는 칸으로 따라간다.
 * - 글을 쓰는 동안(입력 칸에 커서가 있을 때)은 비켜서 숨는다. 칸을 가리지 않게 칸의 오른쪽 위에 선다.
 * - '그만 보기'를 누르면 이 기기에서는 다시 안 나온다. 움직임 줄이기 설정이면 날지 않고 그 자리에 나타난다.
 * - 편지 글은 읽지 않는다(칸이 비었는지만 본다).
 */
(function () {
  "use strict";
  var OFF_KEY = "mmt-letter-guide";
  try { if (localStorage.getItem(OFF_KEY) === "off") return; } catch (_) { /* 저장 안 돼도 보여 줌 */ }
  if (!document.querySelector(".step[data-step]")) return;
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var $ = function (s) { return document.querySelector(s); };
  var filled = function (sel) { var el = $(sel); return !!(el && String(el.value || "").trim()); };
  // 단계별 칸 · 말풍선 (순서대로). last: 다른 칸이 다 끝났을 때만
  var PLAN = {
    order: [
      { sel: "#o-name", msg: "주문하신 분 이름부터 써 주세요!", done: function () { return filled("#o-name"); } },
      { sel: "#o-phone4", msg: "휴대폰 번호 뒤 4자리, 요거 하면 돼요!", done: function () { return /^\d{4}$/.test(($("#o-phone4") || {}).value || ""); } },
      { sel: "#next", msg: "다 됐으면 이거 누르면 돼요!", last: true }
    ],
    write: [
      { sel: "#w-to", msg: "받는 분을 적어 봐요!", done: function () { return filled("#w-to"); } },
      { sel: "#w-ed", msg: "여기에 바로 편지를 써요!", done: function () { var b = $("#w-body"); return !!(b && b.value.trim().length >= 10); } },
      { sel: "#w-check", msg: "다 썼으면 검사하기 해 봐요!", done: function () { var b = $("#w-check"); return !!(b && b.getAttribute("aria-pressed") === "true"); } },
      { sel: "#w-from", msg: "보내는 분도 잊지 마요!", done: function () { return filled("#w-from"); } },
      { sel: "#next", msg: "다 됐으면 이거 누르면 돼요!", last: true }
    ],
    env: [
      { sel: "#envs", msg: "편지는 이렇게 담아 드려요!", done: function () { return seen["#envs"] && (!document.querySelector("#envs input[name=env]") || !!document.querySelector("#envs input[name=env]:checked")); } },
      { sel: "#next", msg: "이거 누르면 마지막 확인이에요!", last: true }
    ],
    review: [
      { sel: "#r-paper", msg: "마지막으로 한 번 읽어 봐요!", done: function () { return seen["#r-paper"]; } },
      { sel: "#consent", msg: "여기 체크하면 돼요!", done: function () { var c = $("#consent"); return !!(c && c.checked); } },
      { sel: "#next", msg: "이제 이거 누르면 끝!", last: true }
    ]
  };
  var DONE_PLAN = [{ sel: "#done h1", msg: "편지 고마워요! 정성껏 찍을게요!", last: true }];
  var seen = {};

  var g = document.createElement("div");
  g.className = "lg lg-pos"; g.setAttribute("aria-hidden", "true");
  g.innerHTML = '<div class="lg-body"><i class="lg-wind"></i><img src="img/brand/guide-dotori.webp" alt="" width="128" height="137" draggable="false"></div>' +
    '<div class="lg-bub" role="presentation"><span class="lg-t"></span><button type="button" class="lg-off" tabindex="-1">그만 보기</button></div>';
  var body = g.querySelector(".lg-body"), bub = g.querySelector(".lg-bub"), txt = g.querySelector(".lg-t");
  var pos = null, cur = null, curMsg = "", bubTimer = 0, flyTimer = 0, raf = 0, away = false;

  function stepNow() {
    var done = document.getElementById("done");
    if (done && !done.hidden) return DONE_PLAN;
    var el = document.querySelector(".step[data-step]:not([hidden])");
    return el ? PLAN[el.dataset.step] || [] : [];
  }
  function visible(el) { return !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden"); }
  function navH() { var n = $(".nav"); return n && visible(n) ? n.getBoundingClientRect().height : 0; }
  function size() { return window.innerWidth < 600 ? 46 : 58; }

  /* 11/5 사장님 "화면내용을 가리지 않는 선에서 맞춰줄래?" — 도토리 · 말풍선은 빈 곳에만 선다.
   * 화면에 보이는 글자(줄마다) · 입력 칸 · 버튼 · 그림 · 편지지 칸을 '차 있는 곳'으로 모으고,
   * 그 칸 가까운 곳부터 도토리 + 말풍선이 둘 다 빈 곳에 들어가는 자리를 찾는다(옆 여백 · 짧은 글 줄의 오른쪽 · 칸 사이 빈 줄).
   * 자리가 없으면 조금 작아지고, 그래도 없으면 말풍선은 접고 도토리만 빈 곳에, 그것도 없으면 잠깐 숨는다. */
  var BLOCK = "input, textarea, select, button, img, svg, canvas, video, .pe, .machine, .greeting-paper, .sheetbox, .env, .done-portrait";
  function occupied() {
    var H = window.innerHeight, out = [], nav = $(".nav"), nb = nav && visible(nav) && getComputedStyle(nav).position === "fixed" ? nav.getBoundingClientRect().top : H;
    function add(r, inNav) {
      if (r.width < 3 || r.height < 3 || r.bottom < 0 || r.top > H) return;
      var b = r.bottom;
      if (!inNav) { if (r.top >= nb) return; b = Math.min(b, nb); }   // 고정 아래 막대 뒤로 지나가는 글은 안 보이니 뺀다
      out.push([r.left, r.top, r.right, b]);
    }
    var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), rg = document.createRange(), n, i, rs;
    while ((n = tw.nextNode())) {
      if (!/\S/.test(n.nodeValue)) continue;
      var p = n.parentElement; if (!p || p.closest(".lg, .sr-only, script, style, title")) continue;
      rg.selectNodeContents(n); rs = rg.getClientRects();
      for (i = 0; i < rs.length; i++) add(rs[i], !!p.closest(".nav"));
    }
    document.body.querySelectorAll(BLOCK).forEach(function (e) {
      if (e.closest(".lg") || e.type === "hidden") return;
      var cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return;
      rs = e.getClientRects(); for (i = 0; i < rs.length; i++) add(rs[i], !!e.closest(".nav"));
    });
    return out;
  }
  function hit(O, l, t, r, b) {
    var a = 0;
    for (var i = 0; i < O.length; i++) { var o = O[i], w = Math.min(r, o[2]) - Math.max(l, o[0]); if (w <= 0) continue; var h = Math.min(b, o[3]) - Math.max(t, o[1]); if (h > 0) a += w * h; }
    return a;
  }
  // 도토리 자리(x, y, 크기) 기준 말풍선 자리 — 오른쪽 · 왼쪽 · 위 · 아래
  function bubAt(side, x, y, G, bw, bh) {
    if (side === "right") return { l: x + G + 10, t: y + G / 2 - bh / 2 };
    if (side === "left") return { l: x - 10 - bw, t: y + G / 2 - bh / 2 };
    var l = Math.max(8, Math.min(window.innerWidth - 8 - bw, x + G - bw + 6));
    return side === "up" ? { l: l, t: y - bh - 10 } : { l: l, t: y + G + 10 };
  }
  var SIDE_COST = { left: 0, up: 6, right: 10, down: 14 };

  // 아직 안 한 칸 중 화면에 보이는 첫 칸 → 없으면 아직 안 한 첫 칸(화면 밖이면 위/아래 가리키기)
  function pick() {
    var list = stepNow().map(function (t) { return { t: t, el: $(t.sel) }; }).filter(function (c) { return visible(c.el); });
    if (!list.length) return null;
    var pending = list.filter(function (c) { return !(c.t.done && c.t.done()); });
    var early = pending.filter(function (c) { return !c.t.last; });
    var pool = early.length ? early : pending.length ? pending : list.slice(-1);
    var top = 0, bottom = window.innerHeight - navH();
    var inView = pool.filter(function (c) { var r = c.el.getBoundingClientRect(); return c.el.closest(".nav") || (r.bottom > top + 24 && r.top < bottom - 24); });
    return inView[0] || pool[0];
  }
  function place(c) {
    var W = window.innerWidth, H = window.innerHeight, nh = navH(), r = c.el.getBoundingClientRect();
    var inNav = !!c.el.closest(".nav"), msg = c.t.msg, edge = "";
    if (!inNav) { if (r.bottom < 24) edge = "up"; else if (r.top > H - nh - 24) edge = "down"; }
    if (edge === "up") msg = "위에 있어요! " + msg;
    if (edge === "down") msg = "아래로 내려 봐요! " + msg;
    // 가고 싶은 곳(그 칸 근처) — 칸이 화면 밖이면 화면 위 · 아래 끝 근처
    var ty = edge === "up" ? 70 : edge === "down" ? H - nh - 70 : inNav ? r.top + r.height / 2 : r.top + Math.min(r.height, 56) / 2;
    var tx = inNav ? r.right : r.right;
    var O = occupied(), lo = 8, hi = H - 8;
    if (txt.textContent !== msg) txt.textContent = msg;   // 말풍선 크기를 재려고 글을 먼저 넣는다(보이진 않음)
    var bw = bub.offsetWidth, bh = bub.offsetHeight, best = null, k, G, xs, dy, s, y, x, j, side, bb, sc;
    function tryAt(x, y, G, dy, k, needBub) {
      if (x < 6 || x + G > W - 6 || y < lo || y + G > hi) return;
      if (hit(O, x, y - 5, x + G, y + G + 1) > 4) return;   // 위아래로 통통 뛰는 4px까지 비워 둠
      var sides = needBub ? ["left", "up", "right", "down"] : [""];
      for (var q = 0; q < sides.length; q++) {
        side = sides[q]; sc = dy + Math.abs(x + G / 2 - tx) * 0.12 + (k < 1 ? 45 : 0);
        if (side) {
          bb = bubAt(side, x, y, G, bw, bh);
          if (bb.l < 6 || bb.l + bw > W - 6 || bb.t < lo || bb.t + bh > hi) continue;
          if (hit(O, bb.l - 2, bb.t - 2, bb.l + bw + 2, bb.t + bh + 2) > 8) continue;
          sc += SIDE_COST[side];
        }
        // 지금 자리에서 크게 안 나빠지면 그대로 (스크롤할 때 이리저리 튀지 않게)
        if (pos && Math.abs(pos.x - x) < 4 && Math.abs(pos.y - y) < 4 && pos.G === G) sc -= 30;
        if (!best || sc < best.sc) best = { x: x, y: y, G: G, side: side, bl: side ? bb.l - x : 0, bt: side ? bb.t - y : 0, sc: sc };
      }
    }
    var tries = [[1, true], [0.8, true], [0.8, false]];
    for (j = 0; j < tries.length && !best; j++) {
      k = tries[j][0]; G = Math.round(size() * k);
      xs = [W - G - 10, r.right + 12, r.right - G, r.left - G - 12, r.left + r.width / 2 - G / 2, W / 2 - G / 2];
      if (pos && pos.G === G) xs.push(pos.x);
      for (dy = 0; dy <= 300; dy += 6) {
        for (s = 0; s < xs.length; s++) {
          x = Math.round(xs[s]);
          y = Math.round(ty - G / 2 - dy); tryAt(x, y, G, dy, k, tries[j][1]);
          if (dy) { y = Math.round(ty - G / 2 + dy); tryAt(x, y, G, dy, k, tries[j][1]); }
          if (pos && pos.G === G && s === 0) tryAt(pos.x, pos.y, G, Math.abs(pos.y + G / 2 - ty), k, tries[j][1]);
        }
        if (best && best.sc < dy) break;   // 더 멀리 볼 필요 없음
      }
    }
    if (!best) return null;   // 빈 곳이 없으면 잠깐 숨는다
    best.msg = msg; return best;
  }
  function showBubble(p) {
    // p.side: 말풍선 방향(빈 곳) · 없으면 접어 둔다
    g.style.setProperty("--bx", p.bl + "px"); g.style.setProperty("--by", p.bt + "px");
    var ax = "0px", ay = "50%", ar = "45deg", bo = "left center";
    if (p.side === "left") { ax = "100%"; ar = "-135deg"; bo = "right center"; }
    if (p.side === "up" || p.side === "down") {
      ax = Math.max(14, Math.min(bub.offsetWidth - 14, p.G / 2 - p.bl)) + "px";
      ay = p.side === "up" ? "100%" : "0px"; ar = p.side === "up" ? "-45deg" : "135deg"; bo = (p.side === "up" ? "bottom " : "top ") + ax;
    }
    g.style.setProperty("--ax", ax); g.style.setProperty("--ay", ay); g.style.setProperty("--ar", ar); g.style.setProperty("--bo", bo);
  }
  function say(msg, tap) {
    if (txt.textContent !== msg) txt.textContent = msg;
    curMsg = msg;
    if (!pos || !pos.side) { if (!tap || !pos) return; showBubble(fallbackSide(pos)); }   // 빈 곳이 없을 땐 눌렀을 때만 펼침
    g.classList.add("lg-talk");
    clearTimeout(bubTimer);
    bubTimer = setTimeout(function () { g.classList.remove("lg-talk"); }, 4200);
  }
  // 빈 곳이 없어 말풍선을 접어 둔 때, 손님이 도토리를 눌렀을 때만 펼칠 방향
  function fallbackSide(p) {
    var bw = bub.offsetWidth, bh = bub.offsetHeight, side = p.x > window.innerWidth / 2 ? "left" : "right", bb = bubAt(side, p.x, p.y, p.G, bw, bh);
    if (bb.l < 6 || bb.l + bw > window.innerWidth - 6) { side = p.y > window.innerHeight / 2 ? "up" : "down"; bb = bubAt(side, p.x, p.y, p.G, bw, bh); }
    return { G: p.G, side: side, bl: bb.l - p.x, bt: bb.t - p.y };
  }
  function update() {
    raf = 0;
    if (away) return;
    var c = pick();
    if (!c) { g.classList.add("lg-hide"); return; }
    g.classList.remove("lg-hide");
    if (c.t.sel === "#r-paper" || c.t.sel === "#envs") { var rr = c.el.getBoundingClientRect(); if (rr.top < window.innerHeight * 0.5) setTimeout(function () { seen[c.t.sel] = true; soon(); }, 2500); }
    var p = place(c);
    if (!p) { g.classList.add("lg-hide"); g.classList.remove("lg-talk"); return; }   // 빈 곳이 없으면 가리지 않게 잠깐 숨음
    var moved = !pos || Math.abs(p.x - pos.x) > 3 || Math.abs(p.y - pos.y) > 3 || p.G !== pos.G;
    var changed = !cur || cur.t !== c.t;
    if (moved) {
      var dx = pos ? p.x - pos.x : 0, dy = pos ? p.y - pos.y : 0, far = Math.abs(dx) + Math.abs(dy) > 60;
      if (far && !reduce.matches) {
        g.classList.add("lg-fly"); g.classList.toggle("lg-west", dx < 0);
        g.style.setProperty("--tilt", (dx < 0 ? -1 : 1) * (Math.abs(dy) > Math.abs(dx) * 1.5 ? 8 : 18) + "deg");
        clearTimeout(flyTimer); flyTimer = setTimeout(function () { g.classList.remove("lg-fly"); }, 750);
      }
      g.style.width = g.style.height = p.G + "px";
      g.style.transform = "translate3d(" + p.x + "px," + p.y + "px,0)";
    }
    var hadSide = pos && pos.side; pos = p;
    if (p.side) showBubble(p); else g.classList.remove("lg-talk");   // 말풍선 자리가 없으면 접어 둠(도토리를 누르면 펼침)
    if (p.side && (changed || p.msg !== curMsg || !hadSide)) { cur = c; say(p.msg); }
    else { cur = c; curMsg = p.msg; }
  }
  function soon() { if (!raf) raf = requestAnimationFrame(update); }

  // 글 쓰는 동안은 비켜 줌
  document.addEventListener("focusin", function (e) {
    if (e.target && e.target.matches && e.target.matches("input[type=text], input[type=tel], input:not([type]), textarea")) { away = true; g.classList.add("lg-away"); }
  });
  document.addEventListener("focusout", function () {
    setTimeout(function () {
      var a = document.activeElement;
      if (a && a.matches && a.matches("input[type=text], input[type=tel], input:not([type]), textarea")) return;
      away = false; g.classList.remove("lg-away"); soon();
    }, 250);
  });
  body.addEventListener("click", function () { if (cur) say(curMsg, true); g.classList.remove("lg-hop"); void g.offsetWidth; g.classList.add("lg-hop"); });
  g.querySelector(".lg-off").addEventListener("click", function () {
    try { localStorage.setItem(OFF_KEY, "off"); } catch (_) { /* 이번 방문만 */ }
    g.remove(); window.removeEventListener("scroll", soon); window.removeEventListener("resize", soon);
  });
  window.addEventListener("scroll", soon, { passive: true });
  window.addEventListener("resize", soon);
  document.addEventListener("input", soon);
  document.addEventListener("change", soon);
  document.addEventListener("click", function () { setTimeout(soon, 60); });
  try { new MutationObserver(soon).observe(document.querySelector("main") || document.body, { attributes: true, subtree: true, attributeFilter: ["hidden", "aria-pressed"] }); } catch (_) { /* 옛 브라우저 */ }
  // 처음엔 화면 오른쪽 위 밖에서 날아 들어온다
  setTimeout(function () { pos = { x: window.innerWidth + 20, y: 70 }; g.style.transform = "translate3d(" + pos.x + "px,70px,0)"; document.body.appendChild(g); void g.offsetWidth; soon(); }, 900);
})();
