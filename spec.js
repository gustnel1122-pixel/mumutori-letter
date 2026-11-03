/* 무무토리 레터 — 편지 규격·봉투·설문 문항. 고객 페이지와 프로젝트 허브가 함께 읽는다. */
/* 편지 규격 (2026-10-26 다시 잼 · 총괄 전달 사장님 지시 "예전 상세페이지의 실제 사진으로")
 * 근거 사진: 3월 첫 레터 상세 그림 2의 실제 편지 사진(봉투에 꽂힌 편지 — 종이 위·왼쪽·오른쪽 가장자리가 다 보임)
 *   https://cdn.sixshop.io/commerce/public/stores/mumutori/products/2_1772709894030.jpg
 *   재는 법: 사진을 4배로 키우고 종이 위 가장자리가 수평이 되게 11.6° 돌림 → 종이 폭 1744px = A5 가로 148mm로 놓음(0.0849mm/px).
 *   - 한 글자(한 칸, 띄어쓰기 포함): 긴 줄 7개(8~27칸)의 길이 ÷ 칸 수 → 평균 42.8px = 3.63mm
 *     (타자기 사진 10_1772709894101.jpg의 종이 누름대 눈금으로도 한 칸 ≈ 눈금 1.45칸 ≈ 3.68mm — 맞음)
 *   - 줄 간격: 첫 줄~17번째 줄 16칸 평균 102.6px = 8.71mm (사진 기울기 때문에 위쪽 9.2 · 아래쪽 8.3mm)
 *   - 여백: 왼쪽 글자 시작까지 146px = 12.4mm, 첫 줄 칸 위까지 약 10mm. 오른쪽 · 아래는 사진에서 안 보여 왼쪽과 같게 12mm(가정).
 *   - 사진 속 가장 긴 줄은 27칸(쓴 사람이 직접 줄을 바꿈 — 타자기 한계는 아님).
 *   - 종이 높이는 봉투에 가려 안 보임 → A5 210mm(레터 허브 '타자기 편지 A5, 반 접어 넣음').
 *   - 타자기 = 마라톤 marathon 1000 DLX (한글) — 사장님 10/26 10:19 자판 사진(총괄 전달). 탈네모꼴 활자의 한글 타자기.
 *     자판에 있는 기호: ! " ₩ $ % / : ( ) - × + , . ?  · 숫자 1~0 · 한글 음절과 ㅋㅋ 같은 낱자
 *     자판에 없는 기호: ' ~ ; … · (작은따옴표 · 물결 · 쌍반점 · 말줄임표 · 가운뎃점) · 영문 → 고객 화면에서 '못 찍는 글자'로 표시
 *     휴대폰 자동 변환 보정(letter.js fixPhone): “ ” → " , … → ... (‘ ’ 는 바꾸지 않음)
 *     받침 겹자 키는 ㄲ ㄻ ㄺ ㄶ ㅆ ㅄ 만 보임. 첫소리 ㄸ ㅃ ㅉ 와 받침 ㄳ ㄵ ㄼ ㄽ ㄾ ㄿ ㅀ 는 찍히는지 확인 필요(사장님 시험 한 줄) — 손님에게 막거나 경고하지 않음.
 * 넉넉히 잡은 값: 한 칸 3.7mm(재 값 3.63) · 한 줄 9.0mm(재 값 8.71)
 * 계산: 한 줄 글자 수 = (148 − 12 − 12) ÷ 3.7 = 33.5 → 33
 *       장당 줄 수   = (210 − 10 − 12) ÷ 9.0 = 20.9 → 20 (내림, 호칭 · 빈 줄 · 서명 포함)
 * 실제 타자기로 10글자 · 10줄을 찍어 재면 paper.cellMm · lineMm만 바꾸고 위 계산을 다시 한다.
 *
 * 2026-11-02 줄 규칙 바꿈 (사장님이 실제 타자기로 찍은 손님 편지 사진, 총괄 전달 "접수페이지 기능을 수정"):
 *   - 띄어쓰기는 한글 한 글자의 반 칸만 나간다(사진 15줄 맞춤: 한글 1칸, 띄어쓰기 0.49칸, . , ! ? 0.5~0.6칸, 숫자 약 0.5칸).
 *     예전 3.63mm는 띄어쓰기(반 칸)를 섞어 잰 평균이라, 한글 한 칸은 이보다 크다(약 4.1mm, 추정).
 *   - 사진에서 가장 긴 줄 = 29칸(예전 셈으로 33자). → 한 줄 = 29칸(lineCells). 낱말(띄어쓰기) 단위로 넘긴다.
 *   - 줄바꿈 계산은 아래 LetterTypewriter 하나로 한다. 고객 작성 화면(letter.js)과 관리자 접수함(대시보드 letter-hub.html)이 같이 쓴다.
 *   - 타자기로 '가'를 왼쪽 여백부터 끝까지 찍어 칸 수를 다시 재면 lineCells만 바꾼다. */
window.LETTER_SPEC = {
  lineCells: 29,        // 한 줄 칸 수: 한글 한 글자(ㅋ·ㅎ 같은 낱자 포함) = 1칸, 띄어쓰기 · 숫자 · 기호 . , ! ? " ( ) - : / % $ + = 반 칸
  lineChars: 33,        // 예전 규칙(모든 글자 1칸 · 33자). 접수 데이터와 Firebase 규칙이 33만 받아 값은 그대로 둔다. 줄바꿈 계산에는 쓰지 않음.
  lineRuleSince: null,  // 새 규칙(29칸 · 첫 줄/끝 줄 고르기)을 올린 시각 — 올릴 때 꼭 넣기(예: "2026-11-03T15:00:00+09:00").
                        // 이보다 먼저 접수된 편지는 접수함이 예전처럼 "OO에게"/"- OO"을 붙여 보여 주고 '예전 33자 미리보기와 다름'도 알린다. null이면 모두 새 편지로 본다.
  maxLines: 20,         // 편지지 1장 최대 줄 수 = floor((210−22) ÷ 9.0), 호칭·서명 포함
  paper: { w: 148, h: 210, top: 10, right: 12, bottom: 12, left: 12, cellMm: 4.1, lineMm: 9.0 },  // 미리보기도 이 값으로 그림. cellMm = 한글 한 칸(띄어쓰기 등은 반 칸). 29 × 4.1 = 118.9mm ≤ 148 − 24
  memoMax: 300,         // 대필: 꼭 넣고 싶은 문장/메모 최대 글자
  // 타자기 = 마라톤 1000 DLX 한글(사장님 10/26 자판 사진): 영문 · ' ~ ; … · 는 못 찍음. letter.js ALLOW 와 같게 고친다.
  allowed: "한글(ㅋㅋ 같은 낱자 포함), 숫자, 띄어쓰기, 줄바꿈, 기호 . , ! ? \" ( ) - : ₩ $ % / × +",
  // 봉투: 지금 준비된 건 예전 상세페이지의 기본 봉투 한 가지뿐(10/25) → 고르는 칸은 막고 안내만. 준비되면 true.
  envReady: false,
  // 사장님 10/26 10:24: "편지봉투에 기본형, 편지지, 우표, 안개꽃, 실링왁스 장식으로 나간다 · 이전 상세페이지 포장처럼 · 준비 중이라 해당 사진처럼 발송"
  envNote: "지금은 아래 사진처럼 기본 편지봉투에 편지지 · 우표 · 안개꽃 · 실링왁스 장식으로 보내 드려요.",
  // 예전(3월) 레터 상세 대표 사진 4번과 같은 실제 사진(봉투 앞 우표 · 뒤 실링왁스). 옛 사진에는 안개꽃이 찍힌 장이 없음 → 실제 포장 사진을 찍으면 바꾼다.
  envPhoto: "mall/img/letter/photo_env_kraft.jpg",
  // 봉투 겉에 받는 분 이름을 타자기로 찍는 기능: 사장님 10/26 "지금 넣지 마" → 칸 · 안내 숨김. 다시 열 때 true.
  envNameReady: false,
  envelopes: [
    { id: "kraft",   name: "크라프트 · 실링왁스",  desc: "크라프트 봉투에 무무토리 도토리 실링", img: "mall/img/letter/mock_kraft_logo_seal.jpg" },
    { id: "ivory",   name: "아이보리 · 도토리 도장", desc: "아이보리 봉투에 무무토리 소인 도장", img: "mall/img/letter/mock_ivory_logo_stamp.jpg" },
    { id: "airmail", name: "에어메일",            desc: "줄무늬 봉투에 무무토리 우표와 소인", img: "mall/img/letter/mock_airmail_postage.jpg" },
    { id: "pattern", name: "무무토리 무늬",        desc: "무무토리 무늬 테이프와 봉인 스티커", img: "mall/img/letter/mock_pattern_tape.jpg" }
  ],
  relations: [
    { id: "lover",  label: "연인·배우자" },
    { id: "family", label: "가족" },
    { id: "friend", label: "친구" },
    { id: "thanks", label: "고마운 분" }
  ],
  survey: [
    { id: "call", q: "편지에서 이 사람을 어떻게 부르고 싶나요?", type: "text", req: true,
      ex: { lover: "예: 지수야 / 자기 / 여보", family: "예: 엄마 / 아빠 / 누나", friend: "예: 민정아 / 야 김민정", thanks: "예: 선생님 / 팀장님 / OO님" } },
    { id: "tone", q: "평소 이 사람에게 쓰는 말투는?", type: "radio", req: true,
      options: ["반말", "반존대", "존댓말"] },
    { id: "why", q: "이 편지를 쓰게 된 가장 큰 이유는?", type: "checks", req: true,
      options: ["기념일", "고마워서", "미안해서", "응원하고 싶어서", "그냥 문득", "기타"] },
    { id: "whyLine", q: "한 문장으로 말하면, \"이 편지는 ___해서 쓰는 편지다\"", type: "text", req: false },
    { id: "scene", q: "이 사람을 떠올리면 가장 먼저 생각나는 장면 하나를 적어주세요.", type: "textarea", req: true,
      help: "언제, 어디서, 어떤 모습이었는지. 아주 사소한 장면이 가장 좋아요. 적어주신 장면은 지우거나 바꾸지 않고 그대로 편지에 담아요." },
    { id: "heart", q: "평소에 잘 말하지 못했지만 꼭 전하고 싶은 마음은?", type: "checks", req: true,
      options: ["고마움", "미안함", "사랑", "존경", "걱정", "응원"] },
    { id: "recent", q: "최근 이 사람에게 있었던 일 중 편지에 담고 싶은 일이 있나요?", type: "textarea", req: false,
      help: "좋은 일이든 힘들었던 일이든 괜찮아요." },
    { id: "strength", q: "이 사람 덕분에 내가 조금 달라졌다고 느끼는 점은?", type: "textarea", req: false },
    { id: "future", q: "앞으로 이 사람과 함께하고 싶은 시간은?", type: "text", req: false },
    { id: "feel", q: "편지를 읽고 이 사람이 어떤 기분이면 좋겠어요?", type: "checks", req: true,
      options: ["웃었으면", "울컥했으면", "안심했으면", "힘이 났으면"] },
    { id: "last", q: "마지막으로 꼭 하고 싶은 한 마디", type: "text", req: true }
  ]
};

/* 실제 타자기 줄바꿈 (2026-11-02). 고객 작성 칸(letter.js)과 관리자 접수함(대시보드 letter-hub.html)이 이 함수 하나를 같이 쓴다.
 * 너비는 반 칸 단위: 한글 한 글자(낱자 포함) · ₩ · × = 2, 띄어쓰기 · 숫자 · 기호(. , ! ? " ( ) - : / % $ +) = 1.
 *   (영문처럼 자판에 없는 영어 글자도 1로 세지만, 고객 화면에서 '못 찍는 글자'로 막힌다.)
 * 한 줄에 lineCells × 2 까지. 띄어쓰기에서 다음 줄로 넘기고, 줄 끝에 걸린 띄어쓰기는 사라진다. 문단 맨 앞 띄어쓰기(들여쓰기)는 남는다.
 * 띄어쓰기 없이 붙은 말은 아래 BREAK 표의 기호 자리에서만 넘어가고(예: "고마워!사랑해" → "고마워!" / "사랑해"),
 * 그런 자리도 없이 한 줄보다 길면 줄 끝에서 자른다.
 * 이 규칙은 고객 작성 칸(textarea · Nanum Gothic Coding 글꼴 · word-break: keep-all)의 실제 줄바꿈과 같게 맞췄다
 * (2026-11-02 Chromium에서 글자 짝마다 재서 BREAK 표를 만듦, 무작위 글 비교). 그래서 고객이 칸에서 본 줄 = 접수함 줄 = 찍을 줄.
 * 한 줄 칸 수는 이 파일의 lineCells(허브의 '적용본'이 덮어써도 바뀌지 않게 여기서 먼저 잡아 둔다). */
window.LetterTypewriter = (function () {
  var FILE_CELLS = Number((window.LETTER_SPEC || {}).lineCells) || 29;
  var FILE_SINCE = (window.LETTER_SPEC || {}).lineRuleSince || null;
  // 띄어쓰기 없이 붙은 두 글자 사이에서 줄을 넘길 수 있는 짝: 왼쪽 글자 → 오른쪽에 올 수 있는 글자들. H = 한글 음절, J = 한글 낱자, N = 숫자.
  var BREAK = { H: "($+₩×", J: "($+₩×", ".": "HJ(₩", ",": "HJ(₩", ":": "HJ(₩", "!": "HJ(₩×", "?": "HJN(-%$+₩×",
    '"': "(", ")": "HJ(₩", "-": 'HJ"(-%+₩×', "/": "HJ₩×", "%": "HJ(₩", "$": "₩", "+": "(₩", "₩": "(%$+₩", "×": "HJ" };
  function chars(s) { return Array.from(String(s == null ? "" : s)); }
  function half(c) { var n = c.charCodeAt(0); return c.length === 1 && n >= 32 && n <= 126 ? 1 : 2; }
  function units(list) { var u = 0; for (var i = 0; i < list.length; i++) u += half(list[i]); return u; }
  function cells(s) { return units(chars(s)) / 2; }
  function lineCells() { return FILE_CELLS; }
  function key(c) { var n = c.charCodeAt(0); return n >= 0xAC00 && n <= 0xD7A3 ? "H" : n >= 0x3131 && n <= 0x318E ? "J" : n >= 48 && n <= 57 ? "N" : c; }
  function canBreak(x, y) { if (y === " ") return false; if (x === " ") return true; var r = BREAK[key(x)]; return !!r && r.indexOf(key(y)) > -1; }
  // 줄마다 { text, start(원문에서 그 줄 첫 글자 위치, UTF-16) }. info(선택): { long: 한 줄보다 긴 문단 수, cut: 띄어쓰기 없이 한 줄보다 긴 말 수 }
  function layout(text, info) {
    var cap = FILE_CELLS * 2, out = [], st = info || {}, pos = 0;
    st.long = 0; st.cut = 0;
    String(text == null ? "" : text).replace(/\r/g, "").split("\n").forEach(function (para) {
      var base = pos; pos += para.length + 1;
      var a = chars(para), n = a.length, off = [], o = base;
      for (var q = 0; q < n; q++) { off.push(o); o += a[q].length; }
      off.push(o);
      if (units(a) > cap) st.long++;
      para.split(" ").forEach(function (w) { if (units(chars(w)) > cap) st.cut++; });
      var s = 0, w = 0, last = -1;
      function push(end) { out.push({ text: a.slice(s, end).join("").replace(/ +$/, ""), start: off[s] }); }
      for (var i = 0; i < n; i++) {
        var c = a[i];
        if (i > s && canBreak(a[i - 1], c)) last = i;
        if (c === " ") { w += 1; continue; }               // 띄어쓰기는 줄 끝에 걸릴 수 있어 넘침을 만들지 않음
        var cu = half(c);
        while (w + cu > cap && i > s) {                     // 이 글자가 안 들어가면: 마지막 넘김 자리, 없으면 이 글자 앞에서
          var end = last > s ? last : i;
          push(end); s = end; w = units(a.slice(s, i)); last = -1;
          for (var j = s + 1; j <= i; j++) if (canBreak(a[j - 1], a[j])) last = j;
        }
        w += cu;
      }
      push(n);
    });
    return out;
  }
  function wrap(text, info) { return layout(text, info).map(function (l) { return l.text; }); }
  // 첫 줄 · 끝 줄 (2026-11-02 사장님 "OO에게 · - OO 양식이 싫은 사람은?") — 손님이 고른다.
  //   greet: "to"(기본, "받는 분에게") | "none"(첫 줄 없이, 필요하면 손님이 직접 씀)
  //   sign : "dash"(기본, "- 보내는 분") | "ga"("보내는 분가/이가") | "olim"("보내는 분 올림") | "none"(끝 줄 없이)
  // 접수 데이터(letter)에는 고른 값을 담을 칸이 없어(Firebase 규칙) 접수할 때 compose()로 본문 앞뒤에 넣어 보낸다.
  // 그래서 새 편지의 body = 찍을 글 전부. 접수함은 새 편지는 body만, 바꾸기 전 편지는 예전처럼 "OO에게"/"- OO"을 붙여 보여 준다.
  function hasFinal(s) { var c = String(s || "").trim().slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; }
  function greetLine(L) { L = L || {}; return L.greet === "none" ? null : (L.to ? L.to + "에게" : ""); }
  function signLine(L) {
    L = L || {}; var f = L.from || "";
    if (L.sign === "none") return null;
    if (L.sign === "ga") return f ? f + (hasFinal(f) ? "이가" : "가") : "";
    if (L.sign === "olim") return f ? f + " 올림" : "";
    return f ? "- " + f : "";   // 서명 앞 줄표는 타자기에 있는 -
  }
  // 편지 한 장의 줄: [첫 줄, 빈 줄] + 본문 + [빈 줄, 끝 줄] (고른 대로)
  function letterLines(letter, info) {
    var L = letter || {}, g = greetLine(L), s = signLine(L), out = g === null ? [] : [g, ""];
    out = out.concat(wrap(L.body, info));
    return s === null ? out : out.concat(["", s]);
  }
  // 접수할 본문: 고른 첫 줄 · 끝 줄을 넣은 글. wrap(compose(L))는 letterLines(L)과 같다.
  function compose(letter) {
    var L = letter || {}, g = greetLine(L), s = signLine(L);
    return (g === null ? "" : g + "\n\n") + String(L.body == null ? "" : L.body) + (s === null ? "" : "\n\n" + s);
  }
  // 2026-11-02 전 규칙(모든 글자 1칸, 한 줄 33자). 바뀌기 전에 접수된 편지가 고객 화면과 달랐는지 접수함에서 비교할 때만 쓴다.
  function letterLinesOld(letter, n) {
    var L = letter || {}, out = [];
    n = Number(n) > 0 ? Number(n) : 33;
    String(L.body == null ? "" : L.body).replace(/\r/g, "").split("\n").forEach(function (para) {
      if (para === "") { out.push(""); return; }
      var line = [];
      para.split(" ").forEach(function (w) {
        var a = chars(w);
        while (a.length > n) { if (line.length) { out.push(line.join("")); line = []; } out.push(a.slice(0, n).join("")); a = a.slice(n); }
        if (!line.length) line = a;
        else if (line.length + 1 + a.length <= n) line = line.concat([" "], a);
        else { out.push(line.join("")); line = a; }
      });
      out.push(line.join(""));
    });
    return [L.to ? L.to + "에게" : "", ""].concat(out, ["", L.from ? "- " + L.from : ""]);
  }
  // 접수 시각(ms)이 새 규칙(29칸 · 첫 줄/끝 줄 넣어 보내기) 전이면 true. 규칙 시각이 없으면(null) 새 편지로 본다(올릴 때 꼭 넣기).
  function beforeRule(createdAt) {
    var since = FILE_SINCE ? Date.parse(FILE_SINCE) : NaN;
    return since > 0 && Number(createdAt) < since;
  }
  return { chars: chars, half: half, cells: cells, lineCells: lineCells, canBreak: canBreak, layout: layout, wrap: wrap, greetLine: greetLine, signLine: signLine,
    letterLines: letterLines, compose: compose, letterLinesOld: letterLinesOld, beforeRule: beforeRule };
})();
