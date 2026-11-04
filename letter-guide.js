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
  g.className = "lg"; g.setAttribute("aria-hidden", "true");
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
    var G = size(), W = window.innerWidth, H = window.innerHeight, nh = navH(), r = c.el.getBoundingClientRect();
    var inNav = !!c.el.closest(".nav"), x, y, msg = c.t.msg, edge = "";
    if (inNav) { x = Math.min(W - G - 10, Math.max(10, r.left + r.width * 0.7 - G / 2)); y = r.top - G - 8; }
    else {
      var beside = r.right + 12 + G < W - 8;   // 칸 오른쪽에 자리가 있으면 옆에, 없으면 칸 위(오른쪽 끝)에 — 칸은 안 가림
      x = beside ? r.right + 12 : Math.min(W - G - 8, r.right - G * 0.55);
      y = beside ? r.top - G * 0.3 : r.top - G - 6;
      var minY = 8, maxY = H - nh - G - 8;
      if (r.bottom < 24) { y = minY; edge = "up"; } else if (r.top > H - nh - 24) { y = maxY; edge = "down"; }
      y = Math.max(minY, Math.min(maxY, y));
    }
    if (edge === "up") msg = "위에 있어요! " + msg;
    if (edge === "down") msg = "아래로 내려 봐요! " + msg;
    return { x: Math.round(x), y: Math.round(y), msg: msg };
  }
  function say(msg, keep) {
    txt.textContent = msg; curMsg = msg;
    // 말풍선은 오른쪽에 자리가 있으면 오른쪽(칸 위로 안 겹치게), 없으면 왼쪽
    g.classList.toggle("lg-left", window.innerWidth - ((pos ? pos.x : 0) + size()) < 240);
    g.classList.add("lg-talk");
    clearTimeout(bubTimer);
    if (!keep) bubTimer = setTimeout(function () { g.classList.remove("lg-talk"); }, 4200);
  }
  function update() {
    raf = 0;
    if (away) return;
    var c = pick();
    if (!c) { g.classList.add("lg-hide"); return; }
    g.classList.remove("lg-hide");
    if (c.t.sel === "#r-paper" || c.t.sel === "#envs") { var rr = c.el.getBoundingClientRect(); if (rr.top < window.innerHeight * 0.5) setTimeout(function () { seen[c.t.sel] = true; soon(); }, 2500); }
    var p = place(c), moved = !pos || Math.abs(p.x - pos.x) > 3 || Math.abs(p.y - pos.y) > 3;
    var changed = !cur || cur.t !== c.t;
    if (moved) {
      var dx = pos ? p.x - pos.x : 0, dy = pos ? p.y - pos.y : 0, far = Math.abs(dx) + Math.abs(dy) > 60;
      if (far && !reduce.matches) {
        g.classList.add("lg-fly"); g.classList.toggle("lg-west", dx < 0);
        g.style.setProperty("--tilt", (dx < 0 ? -1 : 1) * (Math.abs(dy) > Math.abs(dx) * 1.5 ? 8 : 18) + "deg");
        clearTimeout(flyTimer); flyTimer = setTimeout(function () { g.classList.remove("lg-fly"); }, 750);
      }
      pos = p; g.style.transform = "translate3d(" + p.x + "px," + p.y + "px,0)";
    }
    if (changed || p.msg !== curMsg) { cur = c; say(p.msg); }
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
  body.addEventListener("click", function () { if (cur) say(curMsg); g.classList.remove("lg-hop"); void g.offsetWidth; g.classList.add("lg-hop"); });
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
