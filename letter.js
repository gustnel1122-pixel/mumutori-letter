/* 무무토리 레터 — 고객 페이지 공통 로직
 * body[data-mode] = "print"(일반 타자기) | "ghost"(대필 타자기)
 * 규격·문항·봉투는 아래 LETTER_SPEC 한 곳에서 고친다. 프로젝트 허브도 같은 값을 보여준다.
 */
(function () { function boot() {
  // 고객 작성 규격은 검수한 spec.js를 그대로 쓴다. 관리자 허브의 캐시·SDK와 분리한다.
  var S = window.LETTER_SPEC, M = window.MMT = window.MMT || {};
  var store = { get: function (key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; } },
    set: function (key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } } };
  var intake = window.LetterIntake, sending = false;
  var draftSaved = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function motion() { return reduce.matches ? 'auto' : 'smooth'; }
  M.live = false;
  var MODE = document.body.dataset.mode === "ghost" ? "ghost" : "print";
  var STEPS = MODE === "print" ? ["order", "write", "env", "review"] : ["order", "survey", "memo", "env", "review"];
  var ENV_READY = S.envReady !== false;   // 봉투 고르기 준비 전에는 기본 봉투 한 가지(spec.js envReady)
  var NAME_READY = S.envNameReady === true;   // 봉투 겉 이름 찍기(사장님 10/26 '지금 넣지 마') — false 면 칸 숨기고 늘 끔
  var LABEL = { order: "주문 확인", write: "편지 쓰기", survey: "마음 설문", memo: "꼭 넣고 싶은 말", env: ENV_READY ? "봉투 고르기" : "봉투", review: "확인하고 보내기" };
  var DKEY = "mmt-letter-draft-" + MODE;
  var st = store.get(DKEY, null) || { i: 0, order: {}, letter: {}, rel: "", survey: {}, memo: "", env: "kraft", envName: true };
  if (!st || typeof st !== 'object' || Array.isArray(st)) st = {};
  ['order', 'letter', 'survey'].forEach(function (key) { if (!st[key] || typeof st[key] !== 'object' || Array.isArray(st[key])) st[key] = {}; });
  if (!Number.isInteger(st.i) || st.i < 0 || st.i >= STEPS.length) st.i = 0;
  ['rel', 'memo'].forEach(function (key) { if (typeof st[key] !== 'string') st[key] = ''; });
  ['name', 'phone4'].forEach(function (key) { if (typeof st.order[key] !== 'string') st.order[key] = ''; });
  ['to', 'from', 'body'].forEach(function (key) { if (typeof st.letter[key] !== 'string') st.letter[key] = ''; });
  if (st.pendingReceipt) {
    var frozen = st.pendingReceipt.data;
    if (/^ltr_[a-f0-9]{32}$/.test(st.pendingReceipt.id || '') && frozen && frozen.type === MODE && frozen.order && frozen.letter) {
      st.order = Object.assign({}, frozen.order); st.letter = Object.assign({ body: '' }, frozen.letter);
      st.rel = frozen.relation || ''; st.survey = frozen.survey || {}; st.memo = frozen.memo || '';
    } else st.pendingReceipt = null;
  }
  if (!ENV_READY) st.env = "basic";
  if (!NAME_READY) st.envName = false;   // 예전 임시 저장분에 켜져 있어도 끈다
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  // 타자기 = 마라톤 marathon 1000 DLX 한글(사장님 10/26 자판 사진, spec.js 맨 위). 자판에 있는 기호만: . , ! ? " ( ) - : ₩ $ % / × +
  // 자판에 없는 ' ~ ; … · 와 영문은 '못 찍는 글자'로 표시된다. 휴대폰이 바꿔 넣는 “ ” 와 … 는 입력할 때 " 와 ... 로 고친다(fixPhone).
  var ALLOW = /[가-힣ㄱ-ㅎㅏ-ㅣ0-9 \n.,!?"()\-:₩$%\/×+]/;
  // 아이폰 등 자동 변환 보정: “ ” → " , … → ... (‘ ’ 와 ' 는 자판에 없어 그대로 두고 못 찍는 글자로 보인다). 커서 자리는 지킨다.
  function fixPhone(el) {
    var v = el.value;
    if (!/[“”…]/.test(v)) return;
    var pos = el.selectionStart, before = typeof pos === "number" ? v.slice(0, pos) : null;
    var fix = function (s) { return s.replace(/[“”]/g, '"').replace(/…/g, "..."); };
    el.value = fix(v);
    if (before !== null && document.activeElement === el) { var p = fix(before).length; try { el.setSelectionRange(p, p); } catch (e) { /* 커서 없음 */ } }
  }
  var LATIN = /[A-Za-zＡ-Ｚａ-ｚÀ-ɏ]/;
  /* 타자기로 못 찍는 글자 구분: 이모지(유니코드 범위 + 속성) · 한자 · 그 밖의 특수기호 */
  function re(src, flags, fallback) { try { return new RegExp(src, flags); } catch (e) { return fallback; } }
  var EMOJI_RANGE = /[←-⇿⌀-⏿①-⓿■-➿⤀-⥿⬀-⯿〰〽㊗㊙‍⃣︎️]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]|\uDB40[\uDC20-\uDC7F]/;  // U+1F000–1FAFF · U+2600–27BF · 국기·이음표 등
  var EMOJI_PROP = re("[\\p{Extended_Pictographic}\\p{Regional_Indicator}]", "u", null);
  var HAN = re("\\p{Script=Han}", "u", /[⺀-⿟々〇〡-〩〸-〻㐀-䶿一-鿿豈-﫿]|[\uD840-\uD87F][\uDC00-\uDFFF]/);
  function chars(s) { return Array.from(String(s || "")); }
  function kindOf(c) {
    if (ALLOW.test(c) && c.length === 1) return "";
    if (LATIN.test(c)) return "eng";
    // 이모지 속성을 아는 브라우저: 속성 또는 보조 평면(U+1F000~) → 이모지, 나머지 기호 범위는 특수기호. 모르는 브라우저: 범위 전체를 이모지로.
    if (EMOJI_PROP ? (EMOJI_PROP.test(c) || c.length > 1 && EMOJI_RANGE.test(c)) : EMOJI_RANGE.test(c)) return "emoji";
    if (HAN.test(c)) return "han";
    return "sym";
  }

  var demo = $('#demo');
  if (demo) demo.hidden = false;
  function nextLabel() {
    var step = STEPS[st.i];
    if (step === 'review') return M.live ? (st.pendingReceipt ? '같은 내용으로 다시 접수' : '편지 접수하기') : '미리보기 마치기';
    if (step === 'order') return MODE === 'print' ? '편지 쓰러 가기' : '마음 들려주기';
    if (step === 'env') return '내용 확인하기';
    return '다음으로';
  }
  if (intake) intake.initialize().then(function (state) {
    M.live = state.enabled === true;
    if (demo) demo.hidden = M.live;
    if (!sending) $('#next').textContent = nextLabel();
  }).catch(function () { M.live = false; });

  /* ---------- 편지 줄바꿈 (타자기 한 줄 글자 수 기준) ---------- */
  // 한 칸 = 한 글자(한글 한 음절 · 영문 · 숫자 · 띄어쓰기 모두 한 칸). 이모지처럼 두 단위인 글자도 한 칸으로 센다.
  var wrapInfo = { long: 0, cut: 0 };
  function wrap(text, n) {
    var out = []; wrapInfo = { long: 0, cut: 0 };
    String(text || "").replace(/\r/g, "").split("\n").forEach(function (para) {
      if (para === "") { out.push(""); return; }
      if (chars(para).length > n) wrapInfo.long++;
      var line = [];
      para.split(" ").forEach(function (w) {
        var a = chars(w);
        if (a.length > n) wrapInfo.cut++;
        while (a.length > n) { if (line.length) { out.push(line.join("")); line = []; } out.push(a.slice(0, n).join("")); a = a.slice(n); }
        if (!line.length) line = a;
        else if (line.length + 1 + a.length <= n) line = line.concat([" "], a);
        else { out.push(line.join("")); line = a; }
      });
      out.push(line.join(""));
    });
    return out;
  }
  function letterLines() {
    var L = st.letter, lines = [];
    lines.push((L.to || "") ? (L.to + "에게") : "");
    lines.push("");
    lines = lines.concat(wrap(L.body, S.lineChars));
    lines.push("");
    lines.push((L.from || "") ? ("- " + L.from) : "");   // 서명 앞 줄표는 타자기에 있는 - 로
    return lines;
  }
  function badChars(t) {
    var bad = {};
    chars(t).forEach(function (c) { if (kindOf(c)) bad[c] = 1; });
    return Object.keys(bad);
  }
  function badGroups(t) {
    var g = { eng: [], emoji: [], han: [], sym: [] };
    badChars(t).forEach(function (c) { var k = kindOf(c); if (/^[‍⃣︎️]$|^\uDB40/.test(c)) return; if (g[k].indexOf(c) < 0) g[k].push(c); });
    return g;
  }

  /* ---------- A5 편지지 미리보기 (spec.js paper 값 그대로, 한 칸 = cellMm, 한 줄 = lineMm) ---------- */
  var P = S.paper || { w: 148, h: 210, top: 20, right: 15, bottom: 15, left: 15, cellMm: 3.81, lineMm: 8.467 };
  function fitSheets() {
    $$(".sheet").forEach(function (s) {
      var w = s.offsetWidth; if (!w) return;
      var v = (w / P.w) + "px"; s.style.setProperty("--mm", v);
      var o = s.parentNode.querySelector(".ovf"); if (o) { o.style.setProperty("--mm", v); o.style.setProperty("--cell", "calc(var(--mm) * " + P.cellMm + ")"); o.style.setProperty("--line", "calc(var(--mm) * " + P.lineMm + ")"); }
    });
  }
  window.addEventListener("resize", fitSheets);
  function renderSheet(box, lines, empty) {
    if (!box) return;
    var mm = function (v) { return "calc(var(--mm) * " + v + ")"; };
    var row = function (t) {
      return '<div class="ln">' + chars(t).map(function (c) {
        return '<span class="c' + (kindOf(c) && c !== "\n" ? " bad" : "") + '">' + (c === " " ? "&nbsp;" : esc(c)) + "</span>";
      }).join("") + "</div>";
    };
    var keep = lines.slice(0, S.maxLines), rest = lines.slice(S.maxLines);
    var html = '<div class="sheet" style="padding:' + mm(P.top) + " " + mm(P.right) + " " + mm(P.bottom) + " " + mm(P.left) + ";--cell:" + mm(P.cellMm) + ";--line:" + mm(P.lineMm) + ';aspect-ratio:' + P.w + "/" + P.h + '">' +
      '<div class="area" style="height:' + mm(P.lineMm * S.maxLines) + ";width:" + mm(P.cellMm * S.lineChars) + '">' +
      (empty ? '<p class="ph">' + empty + "</p>" : keep.map(row).join("")) + "</div></div>";
    if (!empty && rest.length) html += '<div class="ovf"><b>한 장을 넘는 줄 ' + rest.length + "줄 — 이 부분은 찍을 수 없어요</b>" + rest.map(row).join("") + "</div>";
    html += '<p class="sheet-cap">A5 편지지(148×210mm) 비율 · 한 줄 ' + S.lineChars + "자 · 한 장 " + S.maxLines + "줄 · 여백 위 " + P.top + " · 옆 " + P.left + " · 아래 " + P.bottom + "mm</p>";
    box.innerHTML = html;
    fitSheets();
  }

  /* ---------- 화면 그리기 ---------- */
  function renderProgress() {
    var ol = $("#prog ol");
    var step = STEPS[st.i], visual = step === 'order' ? 0 : step === 'env' ? 2 : step === 'review' ? 3 : 1;
    var labels = ['주문 확인', MODE === 'print' ? '편지 쓰기' : '마음 쓰기', '봉투', '보내기'];
    ol.innerHTML = labels.map(function (label, k) { return '<li class="' + (k <= visual ? 'on' : '') + '"' + (k === visual ? ' aria-current="step"' : '') + '>' + label + '</li>'; }).join('');
    $("#prog .now").textContent = (visual + 1) + " / 4 · " + LABEL[step];
  }
  function show(moveFocus) {
    $$(".step[data-step]").forEach(function (el) { el.hidden = el.dataset.step !== STEPS[st.i]; });
    $("#done").hidden = true;
    $("#prev").hidden = st.i === 0;
    $('#next').disabled = false; $('#prev').disabled = false;
    $("#next").textContent = nextLabel();
    $('#prog').hidden = false; $('.nav').hidden = false;
    renderProgress();
    if (STEPS[st.i] === "review") renderReview();
    if (STEPS[st.i] === "write") renderPreview();
    if (STEPS[st.i] === "env") renderEnvs();
    fitSheets();
    window.scrollTo({ top: 0, behavior: motion() });
    if (moveFocus) {
      var heading = $('.step[data-step="' + STEPS[st.i] + '"] h2') || $('.step[data-step="' + STEPS[st.i] + '"] h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
    save();
  }
  function save() {
    draftSaved = store.set(DKEY, st);
    var notice = $('#draft-save-state');
    if (!draftSaved && !notice) { notice = document.createElement('p'); notice.id = 'draft-save-state'; notice.className = 'intro small'; notice.setAttribute('role', 'status'); $('.foot').before(notice); }
    if (notice) { notice.hidden = draftSaved; notice.textContent = '이 브라우저에서 임시 저장을 사용할 수 없어요. 창을 닫기 전에 작성한 내용을 따로 보관해 주세요. 접수하려면 이 사이트의 저장을 허용해 주세요.'; }
    return draftSaved;
  }
  function lockPending() {
    var locked = !!st.pendingReceipt;
    $$('.step input,.step textarea').forEach(function (el) { el.disabled = locked; });
    var clean = $('#w-clean'); if (clean) clean.disabled = locked;
    var notice = $('#pending-note');
    if (locked) {
      $('#consent').checked = true;
      if (!notice) { notice = document.createElement('p'); notice.id = 'pending-note'; notice.className = 'intro small'; notice.setAttribute('role', 'status'); $('#prog').before(notice); }
      notice.textContent = '접수 결과를 확인 중이에요. 중복을 막기 위해 처음 보낸 내용 그대로만 다시 접수할 수 있어요. 내용 수정은 가게에 문의해 주세요. 확인할 접수번호: ' + st.pendingReceipt.id;
    } else if (notice) notice.remove();
  }

  /* 주문 확인 */
  function bindOrder() {
    ["name", "phone4"].forEach(function (k) {
      var el = $("#o-" + k); if (!el) return;
      el.value = st.order[k] || "";
      el.addEventListener("input", function () {
        if (k === "phone4") el.value = el.value.replace(/\D/g, "").slice(0, 4);
        st.order[k] = el.value.trim();
        if (el.getAttribute('aria-invalid') === 'true' && (k === 'phone4' ? /^\d{4}$/.test(st.order[k]) : st.order[k].length > 0 && st.order[k].length <= (k === 'no' ? 80 : 60))) need(el, true);
        save();
      });
    });
  }

  /* 편지 쓰기 */
  function bindWrite() {
    if (!$("#w-body")) return;
    ["to", "body", "from"].forEach(function (k) {
      var el = $("#w-" + k); el.value = st.letter[k] || "";
      if (/[“”…]/.test(el.value)) { fixPhone(el); st.letter[k] = el.value; }   // 예전 임시 저장분도 같은 규칙으로
      el.addEventListener("input", function (event) { if (!event.isComposing) fixPhone(el); st.letter[k] = el.value; renderPreview(); save(); });
      el.addEventListener('compositionend', function () { fixPhone(el); st.letter[k] = el.value; renderPreview(); save(); });
    });
    $("#w-clean").addEventListener("click", function () {
      ["to", "body", "from"].forEach(function (k) {
        var v = chars(st.letter[k]).filter(function (c) { return !kindOf(c); }).join("");
        st.letter[k] = v; $("#w-" + k).value = v;
      });
      renderPreview(); save();
    });
    $$(".spec-line").forEach(function (e) { e.textContent = S.lineChars; });
    $$(".spec-max").forEach(function (e) { e.textContent = S.maxLines; });
  }
  function renderPreview() {
    if (!$("#w-body")) return;
    var lines = letterLines(), n = lines.length, over = n > S.maxLines;
    var meter = $("#w-meter");
    meter.classList.toggle("over", over);
    meter.innerHTML = "<span>편지지 1장 기준</span><span><b>" + n + "</b> / " + S.maxLines + "줄 · " + chars(st.letter.body).length + "자</span>";
    $("#w-bar").style.width = Math.min(100, n / S.maxLines * 100) + "%";
    var g = badGroups((st.letter.to || "") + (st.letter.body || "") + (st.letter.from || ""));
    var parts = [];
    if (g.eng.length) parts.push("영문 " + g.eng.slice(0, 8).join(" "));
    if (g.emoji.length) parts.push("이모지 " + g.emoji.slice(0, 8).join(" "));
    if (g.han.length) parts.push("한자 " + g.han.slice(0, 8).join(" "));
    if (g.sym.length) parts.push("특수기호 " + g.sym.slice(0, 8).join(" "));
    var anyBad = badChars((st.letter.to || "") + (st.letter.body || "") + (st.letter.from || "")).length > 0;
    $("#w-bad").hidden = !anyBad;
    $("#w-badlist").textContent = parts.join(" · ") || "보이지 않는 기호";
    var wi = $("#w-wrap"), msg = [];
    if (wrapInfo.long) msg.push("한 줄(" + S.lineChars + "자)보다 긴 줄이 " + wrapInfo.long + "곳 있어요. 그 줄은 자동으로 다음 줄로 넘어가요.");
    if (wrapInfo.cut) msg.push("띄어쓰기 없이 " + S.lineChars + "자를 넘는 말이 " + wrapInfo.cut + "곳 있어요. 낱말 중간에서 줄이 바뀌니 띄어쓰기를 넣어 주세요.");
    wi.hidden = !msg.length; wi.innerHTML = msg.map(function (m) { return "<span>" + m + "</span>"; }).join("");
    var body = (st.letter.body || "").trim();
    renderSheet($("#w-paper"), lines, body ? "" : "여기에 타자기로 찍힐 모습이 보여요.<br>한 줄에 " + S.lineChars + "자, 한 장에 " + S.maxLines + "줄까지 찍혀요.");
    $("#w-over").hidden = !over;
    if (over) $("#w-over").textContent = "편지지 한 장(" + S.maxLines + "줄)을 " + (n - S.maxLines) + "줄 넘었어요. 조금만 줄여 주세요.";
    ['to', 'body', 'from'].forEach(function (key) {
      var el = $('#w-' + key), value = st.letter[key];
      var valid = value.trim().length >= (key === 'body' ? 10 : 1) && value.length <= (key === 'body' ? 660 : 31) && !badChars(value).length && (key === 'body' ? !over : value.indexOf('\n') < 0);
      if (el.getAttribute('aria-invalid') === 'true' && valid) need(el, true);
    });
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
      var a11y = ' aria-labelledby="label-' + q.id + '" aria-describedby="error-' + q.id + '"' + (q.req ? ' aria-required="true"' : '');
      if (q.type === "text") input = '<input type="text" id="q-' + q.id + '" name="' + q.id + '" autocomplete="off" maxlength="200"' + a11y + ' data-q="' + q.id + '" placeholder="' + (ex || "") + '" value="' + esc(v || "") + '">';
      if (q.type === "textarea") input = '<textarea id="q-' + q.id + '" name="' + q.id + '" maxlength="1200"' + a11y + ' data-q="' + q.id + '" placeholder="생각나는 그대로 적어주세요">' + esc(v || "") + "</textarea>";
      if (q.type === "radio" || q.type === "checks") {
        var t = q.type === "radio" ? "radio" : "checkbox";
        input = '<div class="chips" role="group"' + a11y + '>' + q.options.map(function (o) {
          var on = q.type === "radio" ? v === o : (v || []).indexOf(o) > -1;
          return '<label class="chip"><input type="' + t + '" name="q-' + q.id + '" data-q="' + q.id + '" value="' + o + '"' + (on ? " checked" : "") + "><span>" + o + "</span></label>";
        }).join("") + "</div>";
      }
      return '<div class="f" data-f="' + q.id + '"><div class="lab" id="label-' + q.id + '">' + (k + 1) + ". " + q.q + tag + "</div>" + help + input + '<p class="err" id="error-' + q.id + '" aria-live="polite" hidden>이 질문에 답해주세요.</p></div>';
    }).join("");
  }
  function bindSurvey() {
    var box = $("#survey"); if (!box) return;
    renderSurvey();
    $("#rel").addEventListener("change", function (e) { if (e.target.name === "rel") { st.rel = e.target.value; $("#rel-err").hidden = true; renderSurvey(); save(); } });
    ["from", "to"].forEach(function (k) {
      var el = $("#s-" + k); el.value = st.letter[k] || "";
      el.addEventListener("input", function () {
        fixPhone(el);
        st.letter[k] = el.value.trim(); save();
        var b = badChars(el.value);   // 입력하자마자 표시
        need(el, !b.length, b.length ? "타자기로 찍을 수 없는 글자가 있어요(" + b.slice(0, 6).join(" ") + "). 한글로 적어 주세요." : "");
      });
    });
    box.addEventListener("input", onQ); box.addEventListener("change", onQ);
    function onQ(e) {
      var id = e.target.dataset.q; if (!id) return;
      var q = S.survey.filter(function (x) { return x.id === id; })[0];
      if (q.type === "checks") st.survey[id] = $$('input[data-q="' + id + '"]:checked', box).map(function (i) { return i.value; });
      else st.survey[id] = e.target.value;
      var f = e.target.closest(".f"); f.classList.remove("bad"); $(".err", f).hidden = true;
      $$('input,textarea', f).forEach(function (el) { el.setAttribute('aria-invalid', 'false'); });
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
  function envList() { return (S.envelopes || []).filter(function (e) { return e && !e.hidden; }); }
  function envFace(id, to) {
    var E = (S.envelopes || []).filter(function (e) { return e && e.id === id; })[0] || {};
    var name = to ? '<span class="to">' + esc(to) + " 에게</span>" : "";
    var ck = '<span class="ck">✓</span>';
    if (E.img) return '<div class="face photo" style="background-image:url(\'' + esc(E.img).replace(/'/g, "%27") + '\')">' + ck + name + "</div>";
    if (id === "kraft") return '<div class="face kraft">' + ck + '<span class="seal"></span>' + name + "</div>";
    if (id === "ivory") return '<div class="face ivory">' + ck + '<img src="stamp.png" alt="">' + name + "</div>";
    if (id === "airmail") return '<div class="face airmail">' + ck + '<span class="pm">MUMU<br>TORI</span>' + name + "</div>";
    if (id === "pattern") return '<div class="face pattern">' + ck + name + "</div>";
    return '<div class="face plain">' + ck + '<span class="lbl">' + esc(E.name || "") + "</span>" + name + "</div>";
  }
  function renderEnvs() {
    var box = $("#envs"); if (!box) return;
    var to = st.envName ? (st.letter.to || "받는 분") : "";
    if (!ENV_READY) {
      st.env = "basic";
      box.innerHTML = '<div class="envwait"><b>봉투 고르기는 준비 중이에요.</b><span>' + esc(S.envNote || "") + "</span></div>"
        + (S.envPhoto ? '<figure class="envphoto"><img src="' + esc(S.envPhoto) + '" alt="크라프트 편지봉투 앞면의 우표와 뒷면의 실링왁스" width="1000" height="1000" loading="lazy"><figcaption>예전 무무토리 레터 포장 사진 · 안개꽃은 사진에 보이지 않아요.</figcaption></figure>' : "");
      var sec = box.closest(".step"), h = sec && $("h2", sec), note = sec && $(".photo-note", sec);
      if (h) h.textContent = "편지를 담을 봉투";
      if (note) note.hidden = true;
      $("#env-name").checked = !!st.envName;
      return;
    }
    var L = envList(); if (!L.some(function (e) { return e.id === st.env; }) && L[0]) st.env = L[0].id;
    box.innerHTML = L.map(function (e) {
      return '<label class="env"><input type="radio" name="env" value="' + e.id + '"' + (st.env === e.id ? " checked" : "") + ">" + envFace(e.id, to) + '<span class="nm">' + e.name + '</span><span class="ds">' + e.desc + "</span></label>";
    }).join("");
    $("#env-name").checked = !!st.envName;
  }
  function bindEnv() {
    $("#envs").addEventListener("change", function (e) { if (e.target.name === "env") { st.env = e.target.value; save(); } });
    var nameBox = $("#env-name"), nameRow = nameBox && nameBox.closest("label");
    if (!NAME_READY) { if (nameRow) nameRow.hidden = true; return; }   // 봉투 겉 이름 찍기는 지금 안 함
    nameBox.addEventListener("change", function (e) { st.envName = e.target.checked; renderEnvs(); save(); });
  }

  /* 확인 */
  function renderReview() {
    var E = ENV_READY ? (S.envelopes.filter(function (e) { return e.id === st.env; })[0] || S.envelopes[0]) : { name: "기본 편지봉투(편지지 · 우표 · 안개꽃 · 실링왁스 장식)" };
    var rows = [["주문자", st.order.name], ["휴대폰 번호 뒤 4자리", st.order.phone4 || ""]];
    if (MODE === "print") {
      rows.push(["받는 분", st.letter.to]); rows.push(["보내는 분", st.letter.from]);
      rows.push(["편지", letterLines().length + " / " + S.maxLines + "줄 · " + chars(st.letter.body).length + "자"]);
    } else {
      var rel = S.relations.filter(function (r) { return r.id === st.rel; })[0];
      rows.push(["관계", rel ? rel.label : ""]); rows.push(["받는 분", st.letter.to]); rows.push(["보내는 분", st.letter.from]);
      var answered = S.survey.filter(function (q) { var v = st.survey[q.id]; return v && (v.length || v.trim); }).length;
      rows.push(["설문", answered + " / " + S.survey.length + "개 답변"]);
      rows.push(["꼭 넣을 말", st.memo ? st.memo.length + "자" : "없음"]);
    }
    rows.push(["봉투", E.name + (st.envName ? " · 받는 분 이름 적기" : "")]);
    $("#sum").innerHTML = rows.map(function (r) { return "<div><span class=\"k\">" + r[0] + "</span><span>" + esc(r[1] || "-") + "</span></div>"; }).join("");
    if ($("#r-paper")) renderSheet($("#r-paper"), letterLines(), "");
    $("#r-env").innerHTML = ENV_READY ? envFace(st.env, st.envName ? (st.letter.to || "받는 분") : "")
      : '<div class="envwait"><b>기본 편지봉투</b><span>봉투 고르기는 준비 중이에요. 편지지 · 우표 · 안개꽃 · 실링왁스 장식으로 보내 드려요.' + (st.envName ? " 봉투 앞면에 받는 분 이름을 찍어 드려요." : "") + "</span></div>";
  }

  /* ---------- 검사 ---------- */
  function need(el, ok, msg) {
    var f = el.closest(".f"); if (!f) return ok;
    el.setAttribute('aria-invalid', String(!ok));
    f.classList.toggle("bad", !ok);
    var er = $(".err", f); if (er) { er.hidden = ok; if (msg) er.textContent = msg; }
    return ok;
  }
  function validate(step, focusError) {
    var s = step || STEPS[st.i], ok = true, first = null;
    function chk(el, cond, msg) { var r = need(el, cond, msg); if (!r && !first) first = el; ok = ok && r; }
    if (s === "order") {
      chk($("#o-name"), !!st.order.name.trim() && st.order.name.length <= 60, "주문하신 분 이름을 60자 안으로 적어주세요.");
      chk($("#o-phone4"), /^\d{4}$/.test(st.order.phone4 || ""), "휴대폰 번호 뒤 4자리를 적어주세요.");
    }
    if (s === "write") {
      ['to', 'body', 'from'].forEach(function (key) {
        var value = st.letter[key], bad = badChars(value);
        var min = key === 'body' ? 10 : 1, max = key === 'body' ? 660 : 31;
        var msg = bad.length ? '타자기로 찍을 수 없는 글자가 있어요: ' + bad.slice(0, 6).join(' ') : key === 'body' ? '편지 내용을 10자 이상 적고, 한 장 안에 맞춰 주세요.' : '이름을 31자 안으로 적어주세요.';
        chk($('#w-' + key), value.trim().length >= min && value.length <= max && !bad.length && (key === 'body' || value.indexOf('\n') < 0), msg);
      });
      var over = letterLines().length > S.maxLines;
      if (over) { ok = false; if (!first) first = $('#w-body'); need($('#w-body'), false, '편지지 한 장(' + S.maxLines + '줄)을 넘었어요. 내용을 조금 줄여 주세요.'); }
    }
    if (s === "survey") {
      // 대필 편지도 받는 분 · 보내는 분 이름은 타자기로 찍음 → 영문 · 이모지 등은 막음
      var nameMsg = function (v, empty) { var b = badChars(v); return !v.trim() ? empty : v.length > 31 || v.indexOf('\n') > -1 ? '이름을 31자 안으로 적어주세요.' : (b.length ? "타자기로 찍을 수 없는 글자가 있어요(" + b.slice(0, 6).join(" ") + "). 한글로 적어 주세요." : ""); };
      var mTo = nameMsg(st.letter.to, "받는 분을 적어주세요."), mFrom = nameMsg(st.letter.from, "보내는 분을 적어주세요.");
      chk($("#s-to"), !mTo, mTo); chk($("#s-from"), !mFrom, mFrom);
      var relOk = S.relations.some(function (r) { return r.id === st.rel; }); $("#rel-err").hidden = relOk; if (!relOk) { ok = false; first = first || $('#rel input'); }
      S.survey.forEach(function (q) {
        var v = st.survey[q.id], has = Array.isArray(v) ? v.length > 0 : typeof v === 'string' && !!v.trim();
        var valid = !q.req && (v == null || v === '') || has;
        if (has && q.type === 'checks') valid = Array.isArray(v) && v.length <= q.options.length && v.every(function (x) { return q.options.indexOf(x) > -1; });
        else if (has && q.type === 'radio') valid = q.options.indexOf(v) > -1;
        else if (has) valid = typeof v === 'string' && v.length <= (q.type === 'textarea' ? 1200 : 200);
        var f = $('[data-f="' + q.id + '"]'); f.classList.toggle('bad', !valid); $('.err', f).hidden = valid;
        $('.err', f).textContent = has ? '답변 길이와 선택한 내용을 다시 확인해 주세요.' : '이 질문에 답해주세요.';
        $$('input,textarea', f).forEach(function (el) { el.setAttribute('aria-invalid', String(!valid)); });
        if (!valid) { ok = false; if (!first) first = $('input,textarea', f); }
      });
    }
    if (s === 'memo') chk($('#m-memo'), st.memo.length <= S.memoMax, '부탁은 ' + S.memoMax + '자 안으로 적어주세요.');
    if (s === "review") {
      var c = $("#consent").checked; $("#consent-err").hidden = c; if (!c) { ok = false; first = first || $("#consent"); }
    }
    if (!ok && first && focusError !== false) { first.focus({ preventScroll: true }); first.scrollIntoView({ behavior: motion(), block: 'center' }); }
    return ok;
  }

  /* ---------- 접수 ---------- */
  function payload() {
    var p = {
      type: MODE,
      order: { name: st.order.name, phone4: st.order.phone4 },
      letter: { to: st.letter.to || "", from: st.letter.from || "" },
      envelope: { id: ENV_READY ? st.env : "basic", writeName: !!st.envName },
      consent: { privacy: true, at: new Date().toISOString() },
      spec: { lineChars: S.lineChars, maxLines: S.maxLines, paper: "A5" },
      status: "received",
      schemaVersion: 1,
      createdAt: { '.sv': 'timestamp' }
    };
    if (MODE === "print") p.letter.body = st.letter.body || "";
    else { p.relation = st.rel; p.survey = st.survey; p.memo = st.memo || ""; }
    return p;
  }
  function finished(id, preview) {
    $$('.step[data-step]').forEach(function (el) { el.hidden = true; });
    $('#prog').hidden = true; $('.nav').hidden = true;
    var done = $('#done'), title = $('h1', done), message = $('p.muted', done), note = $('p.small', done);
    done.hidden = false;
    if (preview) {
      title.textContent = '편지 미리보기를 마쳤어요';
      message.textContent = draftSaved ? '작성한 내용은 이 기기에만 임시 저장됐어요. 아직 가게로 전송되지 않았으며, 실제 접수는 준비 중이에요.' : '아직 가게로 전송되지 않았어요. 이 브라우저는 임시 저장이 막혀 있어, 창을 닫기 전에 작성한 내용을 따로 보관해 주세요.';
      $('#done-no').textContent = '미리보기 · 접수되지 않음';
      note.textContent = '접수가 열리면 작성한 내용을 다시 확인하고 보내 주세요.';
      var mark = $('.done-mark', done); if (mark) mark.textContent = '…';
      var back = document.createElement('button'); back.type = 'button'; back.className = 'btn-2'; back.id = 'edit-preview'; back.textContent = '작성한 내용으로 돌아가기';
      back.addEventListener('click', function () { back.remove(); show(true); });
      done.appendChild(back);
    } else {
      store.set(DKEY, null);
      title.textContent = '편지가 접수됐어요';
      message.textContent = MODE === 'print' ? '적어 주신 편지를 타자기로 찍어 봉투에 담을게요. 편지 내용 확정 뒤 3일 안에 택배로 보내 드려요. 발송 일정은 카카오톡으로 알려 드려요.' : '보내 주신 이야기를 바탕으로 병아리콩이 편지를 쓸게요. 초안을 먼저 보여 드리고, 내용 확정 뒤 3일 안에 택배로 보내 드려요.';
      note.textContent = '접수번호는 문의하실 때 알려 주세요. 택배는 보통 1~2영업일 걸리며, 배송비는 무료예요.';
      var mark = $('.done-mark', done); if (mark) mark.textContent = '✓';
      st.pendingReceipt = null; lockPending();
      $('#done-no').textContent = '접수번호 ' + id;
      if (window.MMTExperience) window.MMTExperience.success();
    }
    title.tabIndex = -1; title.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: motion() });
  }
  async function submit() {
    if (sending) return;
    // 새로고침으로 마지막 단계에 돌아온 초안도 모든 칸을 다시 검사한다.
    for (var i = 0; i < STEPS.length; i++) {
      if (!validate(STEPS[i], false)) { st.i = i; show(); validate(); return; }
    }
    if (!M.live || !intake) {
      if (st.pendingReceipt) {
        var pendingError = $('#submit-err'); pendingError.hidden = false;
        pendingError.textContent = '이전에 보낸 편지의 접수 결과를 확인해야 해요. 지금은 접수가 닫혀 있어 다시 전송할 수 없어요. 위 접수번호로 가게에 확인해 주세요.';
        pendingError.focus({ preventScroll: true }); pendingError.scrollIntoView({ behavior: motion(), block: 'center' });
        return;
      }
      finished('', true); return;
    }
    var btn = $('#next'); sending = true;
    btn.disabled = true; $('#prev').disabled = true; btn.textContent = '접수하는 중…';
    var error = $('#submit-err'); error.hidden = true;
    var hadPending = !!st.pendingReceipt;
    try {
      // 결과를 못 받은 재시도는 같은 ID와 같은 원문을 사용한다. 중복 접수를 만들지 않는다.
      if (!st.pendingReceipt) {
        st.pendingReceipt = { id: intake.newId(), data: payload() };
        if (!save()) { st.pendingReceipt = null; var storageError = new Error('저장 불가'); storageError.code = 'STORAGE'; throw storageError; }
      }
      lockPending();
      var receipt = await intake.submit(st.pendingReceipt.data, st.pendingReceipt.id);
      finished(receipt.id, false);
    } catch (e) {
      btn.disabled = false; $('#prev').disabled = false;
      if (e.code === 'CLOSED') { M.live = false; if (demo) demo.hidden = false; }
      btn.textContent = nextLabel();
      var messages = {
        CLOSED: '지금은 미리보기만 이용할 수 있어요. 편지는 가게로 전송되지 않았어요.',
        VALIDATION: '입력 내용을 다시 확인해 주세요. 작성한 내용은 이 기기에 남아 있어요.',
        STORAGE: '중복 접수를 막기 위한 임시 저장이 차단되어 전송하지 않았어요. 이 사이트의 저장을 허용한 뒤 다시 시도해 주세요.',
        UNSUPPORTED: '이 브라우저에서 접수를 준비할 수 없어요. 최신 브라우저에서 다시 열어 주세요.'
      };
      error.textContent = messages[e.code] || '접수 결과를 아직 확인하지 못했어요. 같은 접수번호로 다시 시도하거나 가게에 확인해 주세요. 새 편지를 만들면 중복될 수 있어요.';
      if (st.pendingReceipt) error.textContent += ' 확인할 접수번호: ' + st.pendingReceipt.id;
      if (!hadPending && (e.code === 'VALIDATION' || e.code === 'CLOSED')) { st.pendingReceipt = null; save(); }
      lockPending();
      error.hidden = false; error.focus({ preventScroll: true }); error.scrollIntoView({ behavior: motion(), block: 'center' });
    } finally { sending = false; }
  }

  /* ---------- 시작 ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  bindOrder(); bindWrite(); bindSurvey(); bindMemo(); bindEnv();
  lockPending();
  if (st.i >= STEPS.length) st.i = 0;
  $("#next").addEventListener("click", function () {
    if (sending) return;
    if (!validate()) return;
    if (STEPS[st.i] === "review") { submit(); return; }
    st.i++; show(true);
  });
  $("#prev").addEventListener("click", function () { if (!sending && st.i > 0) { st.i--; show(true); } });
  $("#consent").addEventListener("change", function () { $("#consent-err").hidden = true; });
  show();
}
  boot();
})();
