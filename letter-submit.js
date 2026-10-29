/* 로그인 없는 고객 전용 접수. 편지는 읽지 않고 새 UUID에 한 번만 쓴다.
 * 서버가 돌려준 저장 결과를 확인해야 성공이다. 미리보기/실패를 성공으로 바꾸지 않는다.
 */
(function (global) {
  'use strict';
  var C = global.LETTER_INTAKE_CONFIG || {};
  var state = { enabled: false, reason: 'preview', rulesVersion: C.rulesVersion || '' };
  var pending = Object.create(null);
  var ALLOWED = /^[가-힣ㄱ-ㅎㅏ-ㅣ0-9 \n.,!?"()\-:₩$%\/×+]*$/;
  var TEXT_Q = ['call', 'whyLine', 'future', 'last'];
  var AREA_Q = ['scene', 'recent', 'strength'];
  var OPTIONS = {
    tone: ['반말', '반존대', '존댓말'],
    why: ['기념일', '고마워서', '미안해서', '응원하고 싶어서', '그냥 문득', '기타'],
    heart: ['고마움', '미안함', '사랑', '존경', '걱정', '응원'],
    feel: ['웃었으면', '울컥했으면', '안심했으면', '힘이 났으면']
  };
  function fail(code, message, id, uncertain) {
    var e = new Error(message); e.code = code; e.id = id || ''; e.uncertain = !!uncertain; return e;
  }
  function status() { return Object.assign({}, state); }
  function object(v) { return !!v && Object.prototype.toString.call(v) === '[object Object]'; }
  function keys(v, allowed, required) {
    if (!object(v) || Object.keys(v).some(function (k) { return allowed.indexOf(k) < 0; })) return false;
    return (required || allowed).every(function (k) { return Object.prototype.hasOwnProperty.call(v, k); });
  }
  function str(v, min, max) { return typeof v === 'string' && v.length >= min && v.length <= max; }
  function name(v) { return str(v, 1, 31) && !!v.trim() && ALLOWED.test(v) && v.indexOf('\n') < 0; }
  function validate(p) {
    if (!keys(p, ['type', 'order', 'letter', 'envelope', 'consent', 'spec', 'status', 'createdAt', 'schemaVersion', 'relation', 'survey', 'memo'], ['type', 'order', 'letter', 'envelope', 'consent', 'spec', 'status', 'createdAt', 'schemaVersion'])) return false;
    if (p.schemaVersion !== 1 || p.status !== 'received' || ['print', 'ghost'].indexOf(p.type) < 0) return false;
    if (!keys(p.order, ['no', 'name', 'phone4'], ['name', 'phone4']) || (Object.prototype.hasOwnProperty.call(p.order, 'no') && (!str(p.order.no, 1, 80) || !p.order.no.trim())) || !str(p.order.name, 1, 60) || !p.order.name.trim() || !str(p.order.phone4, 4, 4) || !/^\d{4}$/.test(p.order.phone4)) return false;
    if (!keys(p.envelope, ['id', 'writeName']) || p.envelope.id !== 'basic' || p.envelope.writeName !== false) return false;
    if (!keys(p.consent, ['privacy', 'at']) || p.consent.privacy !== true || !str(p.consent.at, 24, 24) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(p.consent.at)) return false;
    if (!keys(p.spec, ['lineChars', 'maxLines', 'paper']) || p.spec.lineChars !== 33 || p.spec.maxLines !== 20 || p.spec.paper !== 'A5') return false;
    if (!keys(p.createdAt, ['.sv']) || p.createdAt['.sv'] !== 'timestamp') return false;
    if (!keys(p.letter, p.type === 'print' ? ['to', 'from', 'body'] : ['to', 'from']) || !name(p.letter.to) || !name(p.letter.from)) return false;
    if (p.type === 'print') {
      if (['relation', 'survey', 'memo'].some(function (k) { return Object.prototype.hasOwnProperty.call(p, k); })) return false;
      return str(p.letter.body, 10, 660) && p.letter.body.trim().length >= 10 && ALLOWED.test(p.letter.body);
    }
    if (['lover', 'family', 'friend', 'thanks'].indexOf(p.relation) < 0 || !str(p.memo, 0, 300)) return false;
    if (!keys(p.survey, TEXT_Q.concat(AREA_Q, Object.keys(OPTIONS)), ['call', 'tone', 'why', 'scene', 'heart', 'feel', 'last'])) return false;
    if (!TEXT_Q.every(function (q) { var required = ['call', 'last'].indexOf(q) > -1; return !Object.prototype.hasOwnProperty.call(p.survey, q) || str(p.survey[q], required ? 1 : 0, 200) && (!required || !!p.survey[q].trim()); })) return false;
    if (!AREA_Q.every(function (q) { return !Object.prototype.hasOwnProperty.call(p.survey, q) || str(p.survey[q], q === 'scene' ? 1 : 0, 1200) && (q !== 'scene' || !!p.survey[q].trim()); })) return false;
    if (OPTIONS.tone.indexOf(p.survey.tone) < 0) return false;
    return ['why', 'heart', 'feel'].every(function (q) {
      var a = p.survey[q]; return Array.isArray(a) && a.length >= 1 && a.length <= OPTIONS[q].length && a.every(function (v) { return OPTIONS[q].indexOf(v) > -1; });
    });
  }
  function baseURL() {
    var u;
    try { u = new URL(C.databaseURL); } catch (e) { throw fail('CONFIG', '접수 연결을 확인하고 있어요. 잠시 후 다시 이용해 주세요.'); }
    if (u.protocol !== 'https:' || !/\.(firebasedatabase\.app|firebaseio\.com)$/.test(u.hostname) || u.username || u.password || u.search || u.hash || !/^\/$/.test(u.pathname)) throw fail('CONFIG', '접수 연결을 확인하고 있어요.');
    return u.origin;
  }
  async function request(url, options) {
    var controller = new AbortController();
    var timer = global.setTimeout(function () { controller.abort(); }, Math.max(1000, Math.min(+C.timeoutMs || 15000, 30000)));
    try {
      var response = await global.fetch(url, Object.assign({ credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal }, options));
      var body = await response.text();
      if (body.length > 24000) throw fail('RESPONSE', '');
      return { ok: response.ok, status: response.status, text: async function () { return body; }, json: async function () { return JSON.parse(body); } };
    }
    finally { global.clearTimeout(timer); }
  }
  async function initialize() {
    state.enabled = false;
    if (C.enabled !== true) { state.reason = 'preview'; return status(); }
    try {
      if (C.gatePath !== 'letterIntake' || C.rulesVersion !== 'letter-v1-20261026') throw fail('CONFIG', '');
      var r = await request(baseURL() + '/letterIntake.json', { method: 'GET' });
      if (!r.ok) { state.reason = 'gate-unavailable'; return status(); }
      var text = await r.text(); if (text.length > 2048) throw fail('CONFIG', '');
      var gate = JSON.parse(text);
      if (!gate || gate.enabled !== true || gate.rulesVersion !== C.rulesVersion || typeof gate.verifiedAt !== 'number' || gate.verifiedAt <= 0) { state.reason = 'gate-closed'; return status(); }
      state.enabled = true; state.reason = 'ready'; return status();
    } catch (e) { state.reason = 'gate-unavailable'; return status(); }
  }
  function newId() {
    if (!global.crypto || !global.crypto.getRandomValues) throw fail('UNSUPPORTED', '이 브라우저에서 안전한 접수번호를 만들 수 없어요. 최신 브라우저에서 열어 주세요.');
    var bytes = new Uint8Array(16); global.crypto.getRandomValues(bytes);
    return 'ltr_' + Array.from(bytes, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }
  function newSalt() {
    if (!global.crypto || !global.crypto.getRandomValues || !global.crypto.subtle) throw fail('UNSUPPORTED', '이 브라우저에서 안전한 접수를 준비할 수 없어요. 최신 브라우저에서 열어 주세요.');
    var bytes = new Uint8Array(32); global.crypto.getRandomValues(bytes);
    return Array.from(bytes, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(function (k) { return JSON.stringify(k) + ':' + canonical(value[k]); }).join(',') + '}';
    return JSON.stringify(value);
  }
  async function receiptHash(id, salt, value) {
    if (!/^[a-f0-9]{64}$/.test(salt) || !global.crypto || !global.crypto.subtle) throw fail('UNSUPPORTED', '안전한 접수 확인을 준비하지 못했어요.');
    var data = new TextEncoder().encode(id + '\n' + salt + '\n' + canonical(value));
    var digest = await global.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }
  async function confirmReceipt(id, hash) {
    var result;
    try {
      result = await request(baseURL() + '/letterReceiptChecks/' + id + '.json?print=silent', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(hash)});
    } catch (_) { return false; }
    return result.ok && result.status === 204 && (await result.text()) === '';
  }
  function same(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    var ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    return ka.length === kb.length && ka.every(function (k, i) { return k === kb[i] && same(a[k], b[k]); });
  }
  async function submit(input, existingId, salt) {
    var id = existingId || newId();
    if (!/^ltr_[a-f0-9]{32}$/.test(id)) throw fail('ID', '접수번호를 확인하지 못했어요. 새로고침 후 다시 시도해 주세요.', id);
    if (pending[id]) throw fail('BUSY', '접수 결과를 확인하고 있어요. 잠시 기다려 주세요.', id);
    pending[id] = true;
    try {
      var gate = await initialize();
      if (!gate.enabled) throw fail('CLOSED', '지금은 미리보기만 이용할 수 있어요. 편지는 가게로 전송되지 않았어요.', id);
      var p;
      try { p = JSON.parse(JSON.stringify(input)); } catch (e) { throw fail('VALIDATION', '입력 내용을 확인해 주세요.', id); }
      p.schemaVersion = 1; p.status = 'received'; p.createdAt = { '.sv': 'timestamp' };
      if (!validate(p)) throw fail('VALIDATION', '입력 내용을 다시 확인해 주세요. 길이와 필수 항목을 확인해 주시면 돼요.', id);
      if (salt != null) p.receiptHash = await receiptHash(id, salt, p);
      var body = JSON.stringify(p);
      if (new TextEncoder().encode(body).length > 18000) throw fail('VALIDATION', '적어 주신 내용이 너무 길어요. 조금 줄여 주세요.', id);
      var r;
      try {
        r = await request(baseURL() + '/letters/' + id + '.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: body });
      } catch (e) { throw fail('UNCERTAIN', '접수 결과를 아직 확인하지 못했어요. 같은 접수번호로 다시 확인해 주세요. 새 편지를 만들면 중복될 수 있어요.', id, true); }
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          if (salt != null && await confirmReceipt(id, p.receiptHash)) return {id:id, confirmed:true};
          throw fail('DENIED', '접수 여부를 확인하지 못했어요. 이미 전송되었거나 접수가 잠시 닫혔을 수 있어요. 주문 문의에 이 접수번호를 남겨 주세요.', id, true);
        }
        throw fail('SERVER', '접수 결과를 확인하지 못했어요. 같은 접수번호로 잠시 후 다시 시도해 주세요.', id, true);
      }
      var saved;
      try { saved = await r.json(); } catch (e) { throw fail('UNCERTAIN', '접수 결과를 확인하는 중 연결이 끊겼어요. 접수번호를 보관해 주세요.', id, true); }
      if (!object(saved) || typeof saved.createdAt !== 'number' || saved.createdAt <= 0) throw fail('UNCERTAIN', '저장 결과를 확인하지 못했어요. 접수번호를 보관해 주세요.', id, true);
      var expected = Object.assign({}, p, { createdAt: saved.createdAt });
      if (!same(saved, expected)) throw fail('UNCERTAIN', '저장 결과가 입력한 내용과 달라 확인이 필요해요. 접수번호를 보관해 주세요.', id, true);
      return { id: id, receivedAt: saved.createdAt };
    } finally { delete pending[id]; }
  }
  global.LetterIntake = Object.freeze({ status: status, initialize: initialize, newId: newId, newSalt: newSalt, submit: submit });
})(window);
