/* 무무토리 레터 — 고객 페이지 공통 로직
 * body[data-mode] = "print"(일반 타자기) | "ghost"(대필 타자기)
 * 규격·문항·봉투는 아래 LETTER_SPEC 한 곳에서 고친다. 프로젝트 허브도 같은 값을 보여준다.
 */
(function () {
  var S = window.LETTER_SPEC, M = window.MMT || {}, store = M.store;
  var MODE = document.body.dataset.mode === "ghost" ? "ghost" : "print";
  var STEPS = MODE === "print" ? ["order", "write", "env", "review"] : ["order", "survey", "memo", "env", "review"];
  var LABEL = { order: "주문 확인", write: "편지 쓰기", survey: "마음 설문", memo: "꼭 넣고 싶은 말", env: "봉투 고르기", review: "확인하고 보내기" };
  var DKEY = "mmt-letter-draft-" + MODE;
  var st = store.get(DKEY, null) || { i: 0, order: {}, letter: {}, rel: "", survey: {}, memo: "", env: "kraft", envName: true };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ALLOW = /[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 \n.,!?'"()\-~:;…·]/;

  if (!M.live) { var d = $("#demo"); if (d) d.hidden = false; }

  /* ---------- 편지 줄바꿈 (타자기 한 줄 글자 수 기준) ---------- */
  function wrap(text, n) {
    var out = [];
    String(text || "").replace(/\r/g, "").split("\n").forEach(function (para) {
      if (para === "") { out.push(""); return; }
      var line = "";
      para.split(" ").forEach(function (w) {
        while (w.length > n) { if (line) { out.push(line); line = ""; } out.push(w.slice(0, n)); w = w.slice(n); }
        if (!line) line = w;
        else if ((line + " " + w).length <= n) line += " " + w;
        else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  }
  function letterLines() {
    var L = st.letter, lines = [];
    lines.push((L.to || "") ? (L.to + "에게") : "");
    lines.push("");
    lines = lines.concat(wrap(L.body, S.lineChars));
    lines.push("");
    lines.push((L.from || "") ? ("— " + L.from) : "");
    return lines;
  }
  function badChars(t) {
    var bad = {};
    Array.from(String(t || "")).forEach(function (c) { if (!ALLOW.test(c)) bad[c] = 1; });
    return Object.keys(bad);
  }

  /* ---------- 화면 그리기 ---------- */
  function renderProgress() {
    var ol = $("#prog ol");
    ol.innerHTML = STEPS.map(function (_, k) { return '<li class="' + (k <= st.i ? "on" : "") + '"></li>'; }).join("");
    $("#prog .now").textContent = (st.i + 1) + " / " + STEPS.length + " · " + LABEL[STEPS[st.i]];
  }
  function show() {
    $$(".step[data-step]").forEach(function (el) { el.hidden = el.dataset.step !== STEPS[st.i]; });
    $("#done").hidden = true;
    $("#prev").hidden = st.i === 0;
    $("#next").textContent = STEPS[st.i] === "review" ? "편지 접수하기" : "다음";
    renderProgress();
    if (STEPS[st.i] === "review") renderReview();
    if (STEPS[st.i] === "write") renderPreview();
    if (STEPS[st.i] === "env") renderEnvs();
    window.scrollTo({ top: 0, behavior: "smooth" });
    save();
  }
  function save() { store.set(DKEY, st); }

  /* 주문 확인 */
  function bindOrder() {
    ["no", "name", "phone4"].forEach(function (k) {
      var el = $("#o-" + k); if (!el) return;
      el.value = st.order[k] || "";
      el.addEventListener("input", function () {
        if (k === "phone4") el.value = el.value.replace(/\D/g, "").slice(0, 4);
        st.order[k] = el.value.trim(); save();
      });
    });
  }

  /* 편지 쓰기 */
  function bindWrite() {
    if (!$("#w-body")) return;
    ["to", "body", "from"].forEach(function (k) {
      var el = $("#w-" + k); el.value = st.letter[k] || "";
      el.addEventListener("input", function () { st.letter[k] = el.value; renderPreview(); save(); });
    });
    $("#w-clean").addEventListener("click", function () {
      ["to", "body", "from"].forEach(function (k) {
        var v = Array.from(st.letter[k] || "").filter(function (c) { return ALLOW.test(c); }).join("");
        st.letter[k] = v; $("#w-" + k).value = v;
      });
      renderPreview(); save();
    });
    $("#spec-line").textContent = S.lineChars;
    $("#spec-max").textContent = S.maxLines;
  }
  function renderPreview() {
    if (!$("#w-body")) return;
    var lines = letterLines(), n = lines.length, over = n > S.maxLines;
    var meter = $("#w-meter");
    meter.classList.toggle("over", over);
    meter.innerHTML = "<span>편지지 1장 기준</span><span><b>" + n + "</b> / " + S.maxLines + "줄 · " + (st.letter.body || "").length + "자</span>";
    $("#w-bar").style.width = Math.min(100, n / S.maxLines * 100) + "%";
    var bad = badChars((st.letter.to || "") + (st.letter.body || "") + (st.letter.from || ""));
    var cw = $("#w-bad");
    cw.hidden = !bad.length;
    if (bad.length) $("#w-badlist").textContent = bad.slice(0, 12).join(" ");
    var body = (st.letter.body || "").trim();
    var pre = $("#w-paper");
    if (!body) pre.innerHTML = '<span class="ph">여기에 타자기로 찍힐 모습이 보여요.\n한 줄에 ' + S.lineChars + '자씩 찍혀요.</span>';
    else pre.textContent = lines.join("\n");
    $("#w-over").hidden = !over;
  }

  /* 대필 설문 */
  function renderSurvey() {
    var box = $("#survey"); if (!box) return;
    var rel = $("#rel");
    rel.innerHTML = S.relations.map(function (r) {
      return '<label class="chip"><input type="radio" name="rel" value="' + r.id + '"' + (st.rel === r.id ? " checked" : "") + '><span>' + r.label + "</span></label>";
    }).join("");
    box.innerHTML = S.survey.map(function (q, k) {
      var v = st.survey[q.id], tag = q.req ? '<span class="req">필수</span>' : '<span class="opt">선택</span>';
      var ex = q.ex ? (q.ex[st.rel] || q.ex.lover) : "";
      var help = q.help ? '<p class="help">' + q.help + "</p>" : "";
      var input = "";
      if (q.type === "text") input = '<input type="text" id="q-' + q.id + '" data-q="' + q.id + '" placeholder="' + (ex || "") + '" value="' + esc(v || "") + '">';
      if (q.type === "textarea") input = '<textarea id="q-' + q.id + '" data-q="' + q.id + '" placeholder="생각나는 그대로 적어주세요">' + esc(v || "") + "</textarea>";
      if (q.type === "radio" || q.type === "checks") {
        var t = q.type === "radio" ? "radio" : "checkbox";
        input = '<div class="chips">' + q.options.map(function (o) {
          var on = q.type === "radio" ? v === o : (v || []).indexOf(o) > -1;
          return '<label class="chip"><input type="' + t + '" name="q-' + q.id + '" data-q="' + q.id + '" value="' + o + '"' + (on ? " checked" : "") + "><span>" + o + "</span></label>";
        }).join("") + "</div>";
      }
      return '<div class="f" data-f="' + q.id + '"><div class="lab">' + (k + 1) + ". " + q.q + tag + "</div>" + help + input + '<p class="err" hidden>이 질문에 답해주세요.</p></div>';
    }).join("");
  }
  function bindSurvey() {
    var box = $("#survey"); if (!box) return;
    renderSurvey();
    $("#rel").addEventListener("change", function (e) { if (e.target.name === "rel") { st.rel = e.target.value; $("#rel-err").hidden = true; renderSurvey(); save(); } });
    ["from", "to"].forEach(function (k) {
      var el = $("#s-" + k); el.value = st.letter[k] || "";
      el.addEventListener("input", function () { st.letter[k] = el.value.trim(); save(); });
    });
    box.addEventListener("input", onQ); box.addEventListener("change", onQ);
    function onQ(e) {
      var id = e.target.dataset.q; if (!id) return;
      var q = S.survey.filter(function (x) { return x.id === id; })[0];
      if (q.type === "checks") st.survey[id] = $$('input[data-q="' + id + '"]:checked', box).map(function (i) { return i.value; });
      else st.survey[id] = e.target.value;
      var f = e.target.closest(".f"); f.classList.remove("bad"); $(".err", f).hidden = true;
      save();
    }
  }
  function bindMemo() {
    var el = $("#m-memo"); if (!el) return;
    el.value = st.memo || ""; el.maxLength = S.memoMax;
    var c = $("#m-count");
    var up = function () { c.textContent = (el.value.length) + " / " + S.memoMax + "자"; };
    el.addEventListener("input", function () { st.memo = el.value; up(); save(); }); up();
  }

  /* 봉투 */
  function envFace(id, to) {
    var name = to ? '<span class="to">' + esc(to) + " 에게</span>" : "";
    if (id === "kraft") return '<div class="face kraft"><span class="ck">✓</span><span class="seal"></span>' + name + "</div>";
    if (id === "ivory") return '<div class="face ivory"><span class="ck">✓</span><img src="stamp.png" alt="">' + name + "</div>";
    if (id === "airmail") return '<div class="face airmail"><span class="ck">✓</span><span class="pm">MUMU<br>TORI</span>' + name + "</div>";
    return '<div class="face pattern"><span class="ck">✓</span>' + name + "</div>";
  }
  function renderEnvs() {
    var box = $("#envs"); if (!box) return;
    var to = st.envName ? (st.letter.to || "받는 분") : "";
    box.innerHTML = S.envelopes.map(function (e) {
      return '<label class="env"><input type="radio" name="env" value="' + e.id + '"' + (st.env === e.id ? " checked" : "") + ">" + envFace(e.id, to) + '<span class="nm">' + e.name + '</span><span class="ds">' + e.desc + "</span></label>";
    }).join("");
    $("#env-name").checked = !!st.envName;
  }
  function bindEnv() {
    $("#envs").addEventListener("change", function (e) { if (e.target.name === "env") { st.env = e.target.value; save(); } });
    $("#env-name").addEventListener("change", function (e) { st.envName = e.target.checked; renderEnvs(); save(); });
  }

  /* 확인 */
  function renderReview() {
    var E = S.envelopes.filter(function (e) { return e.id === st.env; })[0] || S.envelopes[0];
    var rows = [["주문번호", st.order.no], ["주문자", st.order.name + " (" + (st.order.phone4 || "") + ")"]];
    if (MODE === "print") {
      rows.push(["받는 분", st.letter.to]); rows.push(["보내는 분", st.letter.from]);
      rows.push(["편지", letterLines().length + "줄 · " + (st.letter.body || "").length + "자"]);
    } else {
      var rel = S.relations.filter(function (r) { return r.id === st.rel; })[0];
      rows.push(["관계", rel ? rel.label : ""]); rows.push(["받는 분", st.letter.to]); rows.push(["보내는 분", st.letter.from]);
      var answered = S.survey.filter(function (q) { var v = st.survey[q.id]; return v && (v.length || v.trim); }).length;
      rows.push(["설문", answered + " / " + S.survey.length + "개 답변"]);
      rows.push(["꼭 넣을 말", st.memo ? st.memo.length + "자" : "없음"]);
    }
    rows.push(["봉투", E.name + (st.envName ? " · 받는 분 이름 적기" : "")]);
    $("#sum").innerHTML = rows.map(function (r) { return "<div><span class=\"k\">" + r[0] + "</span><span>" + esc(r[1] || "-") + "</span></div>"; }).join("");
    if ($("#r-paper")) $("#r-paper").textContent = letterLines().join("\n");
    $("#r-env").innerHTML = envFace(st.env, st.envName ? (st.letter.to || "받는 분") : "");
  }

  /* ---------- 검사 ---------- */
  function need(el, ok, msg) {
    var f = el.closest(".f"); if (!f) return ok;
    f.classList.toggle("bad", !ok);
    var er = $(".err", f); if (er) { er.hidden = ok; if (msg) er.textContent = msg; }
    return ok;
  }
  function validate() {
    var s = STEPS[st.i], ok = true, first = null;
    function chk(el, cond, msg) { var r = need(el, cond, msg); if (!r && !first) first = el; ok = ok && r; }
    if (s === "order") {
      chk($("#o-no"), !!st.order.no, "주문번호를 적어주세요.");
      chk($("#o-name"), !!st.order.name, "주문하신 분 이름을 적어주세요.");
      chk($("#o-phone4"), /^\d{4}$/.test(st.order.phone4 || ""), "휴대폰 번호 뒤 4자리를 적어주세요.");
    }
    if (s === "write") {
      chk($("#w-to"), !!(st.letter.to || "").trim(), "받는 분을 적어주세요.");
      chk($("#w-body"), (st.letter.body || "").trim().length >= 10, "편지 내용을 10자 이상 적어주세요.");
      chk($("#w-from"), !!(st.letter.from || "").trim(), "보내는 분을 적어주세요.");
      var bad = badChars((st.letter.to || "") + (st.letter.body || "") + (st.letter.from || ""));
      var over = letterLines().length > S.maxLines;
      if (bad.length || over) { ok = false; if (!first) first = $("#w-body"); }
    }
    if (s === "survey") {
      chk($("#s-to"), !!st.letter.to, "받는 분을 적어주세요.");
      chk($("#s-from"), !!st.letter.from, "보내는 분을 적어주세요.");
      var relOk = !!st.rel; $("#rel-err").hidden = relOk; if (!relOk) { ok = false; first = first || $("#rel"); }
      S.survey.forEach(function (q) {
        if (!q.req) return;
        var v = st.survey[q.id], has = Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
        var f = $('[data-f="' + q.id + '"]'); f.classList.toggle("bad", !has); $(".err", f).hidden = has;
        if (!has) { ok = false; if (!first) first = f; }
      });
    }
    if (s === "review") {
      var c = $("#consent").checked; $("#consent-err").hidden = c; if (!c) { ok = false; first = first || $("#consent"); }
    }
    if (!ok && first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  }

  /* ---------- 접수 ---------- */
  function payload() {
    var p = {
      type: MODE,
      order: { no: st.order.no, name: st.order.name, phone4: st.order.phone4 },
      letter: { to: st.letter.to || "", from: st.letter.from || "" },
      envelope: { id: st.env, writeName: !!st.envName },
      consent: { privacy: true, at: new Date().toISOString() },
      spec: { lineChars: S.lineChars, maxLines: S.maxLines },
      status: "접수",
      createdAt: M.live ? M.fb.ts : Date.now()
    };
    if (MODE === "print") p.letter.body = st.letter.body || "";
    else { p.relation = st.rel; p.survey = st.survey; p.memo = st.memo || ""; }
    return p;
  }
  function submit() {
    var btn = $("#next"); btn.disabled = true; btn.textContent = "접수하는 중…";
    var p = payload();
    var fin = function (id) {
      store.set(DKEY, null);
      $$(".step[data-step]").forEach(function (el) { el.hidden = true; });
      $("#prog").hidden = true; $(".nav").hidden = true;
      $("#done-no").textContent = "접수번호 " + id;
      $("#done").hidden = false; window.scrollTo(0, 0);
    };
    if (M.live) {
      var ref = M.fb.db.ref("letters").push();
      ref.set(p).then(function () { fin(ref.key.slice(-8).toUpperCase()); }).catch(function (e) {
        btn.disabled = false; btn.textContent = "편지 접수하기";
        $("#submit-err").hidden = false; $("#submit-err").textContent = "접수 중 문제가 생겼어요. 잠시 후 다시 눌러주세요. (" + (e.code || e.message) + ")";
      });
    } else {
      var id = "DEMO" + String(Date.now()).slice(-6);
      var all = store.get("mmt-demo-letters", []); p.id = id; all.unshift(p); store.set("mmt-demo-letters", all.slice(0, 30));
      setTimeout(function () { fin(id); }, 500);
    }
  }

  /* ---------- 시작 ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  bindOrder(); bindWrite(); bindSurvey(); bindMemo(); bindEnv();
  if (st.i >= STEPS.length) st.i = 0;
  $("#next").addEventListener("click", function () {
    if (!validate()) return;
    if (STEPS[st.i] === "review") { submit(); return; }
    st.i++; show();
  });
  $("#prev").addEventListener("click", function () { if (st.i > 0) { st.i--; show(); } });
  $("#consent").addEventListener("change", function () { $("#consent-err").hidden = true; });
  show();
})();
