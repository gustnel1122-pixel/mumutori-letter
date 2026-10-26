const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../letter-submit.js'), 'utf8');
const configSource = fs.readFileSync(path.join(__dirname, '../letter-intake-config.js'), 'utf8');
const merge = require('../firebase/merge-rules.js');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase/letters.rules.json'), 'utf8'));
const CONFIG = { enabled: true, databaseURL: 'https://example-test.firebaseio.com', rulesVersion: 'letter-v1-20261026', gatePath: 'letterIntake', timeoutMs: 1000 };
const gate = { enabled: true, rulesVersion: CONFIG.rulesVersion, verifiedAt: 1 };
function payload() { return { type: 'print', order: { name: '시험주문자', phone4: '0000' }, letter: { to: '시험받는분', from: '시험보내는분', body: '고마운 마음을 편지에 담아 보냅니다.' }, envelope: { id: 'basic', writeName: false }, consent: { privacy: true, at: new Date().toISOString() }, spec: { lineChars: 33, maxLines: 20, paper: 'A5' } }; }
function response(data, code = 200) { return new Response(JSON.stringify(data), { status: code }); }
function boot(fetcher, config = CONFIG) {
  const context = { LETTER_INTAKE_CONFIG: config, fetch: fetcher, crypto: webcrypto, URL, AbortController, TextEncoder, setTimeout, clearTimeout };
  context.window = context; vm.runInNewContext(source, context); return context.LetterIntake;
}
test('미리보기 설정은 네트워크를 전혀 호출하지 않는다', async () => {
  const context = {}; context.window = context; vm.runInNewContext(configSource, context);
  const api = boot(() => { throw Error('network must not run'); }, { ...context.LETTER_INTAKE_CONFIG, enabled: false });
  assert.equal((await api.initialize()).enabled, false);
  await assert.rejects(api.submit(payload()), { code: 'CLOSED' });
});
test('서버 gate가 닫히거나 버전이 다르면 PUT을 하지 않는다', async () => {
  for (const remote of [{ ...gate, enabled: false }, { ...gate, rulesVersion: 'old' }, { ...gate, verifiedAt: 0 }]) {
    const calls = []; const api = boot(async (url, opts) => { calls.push(opts.method); return response(remote); });
    await assert.rejects(api.submit(payload()), { code: 'CLOSED' }); assert.deepEqual(calls, ['GET']);
  }
});
test('고객은 공개 gate만 읽고 키 없이 새 접수번호 경로에 PUT한다', async () => {
  const calls = []; const api = boot(async (url, opts) => {
    calls.push({ url, opts });
    if (opts.method === 'GET') return response(gate);
    const p = JSON.parse(opts.body); return response({ ...p, createdAt: 123456789 });
  });
  const p = payload(); const result = await api.submit(p);
  assert.match(result.id, /^ltr_[a-f0-9]{32}$/); assert.equal(result.receivedAt, 123456789);
  assert.equal(calls.length, 2); assert.match(calls[0].url, /\/letterIntake\.json$/); assert.match(calls[1].url, /\/letters\/ltr_[a-f0-9]{32}\.json$/);
  assert.deepEqual(Object.keys(JSON.parse(calls[1].opts.body).order).sort(), ['name', 'phone4']);
  assert.equal(calls[1].opts.method, 'PUT'); assert.equal(calls[1].opts.credentials, 'omit'); assert.equal(calls[1].opts.referrerPolicy, 'no-referrer');
  assert.equal(calls[1].opts.headers.Authorization, undefined); assert.ok(!calls[1].url.includes('auth='));
  assert.equal(p.schemaVersion, undefined, '호출자의 초안은 변경하지 않는다');
});
test('기존 주문번호가 있는 전송 원문은 재시도 때 그대로 유지한다', async () => {
  const bodies = []; const id = 'ltr_' + 'a'.repeat(32);
  const api = boot(async (_, opts) => {
    if (opts.method === 'GET') return response(gate);
    const p = JSON.parse(opts.body); bodies.push(p);
    if (bodies.length === 1) throw new TypeError('network lost');
    return response({ ...p, createdAt: 1 });
  });
  const p = payload(); p.order.no = 'LEGACY-ORDER';
  await assert.rejects(api.submit(p, id), { code: 'UNCERTAIN' });
  assert.equal((await api.submit(p, id)).id, id);
  assert.deepEqual(bodies[0], bodies[1]); assert.equal(bodies[1].order.no, 'LEGACY-ORDER');
});
test('선택 주문번호는 있을 때 기존 자료형·공백·길이 검사를 유지한다', async () => {
  const api = boot(async (_, opts) => { assert.equal(opts.method, 'GET'); return response(gate); });
  for (const no of ['', '   ', 123, null, 'x'.repeat(81)]) {
    const p = payload(); p.order.no = no;
    await assert.rejects(api.submit(p), { code: 'VALIDATION' });
  }
});
test('성공 HTTP여도 저장 내용이나 서버 시각이 다르면 완료 처리하지 않는다', async () => {
  for (const change of [p => ({ ...p, createdAt: 1, status: 'wrong' }), p => p, () => null]) {
    const api = boot(async (_, opts) => opts.method === 'GET' ? response(gate) : response(change(JSON.parse(opts.body))));
    await assert.rejects(api.submit(payload()), e => e.code === 'UNCERTAIN' && e.uncertain && /^ltr_/.test(e.id));
  }
});
test('실제 줄바꿈과 모든 자판 기호를 포함한 편지는 전송한다', async () => {
  const api = boot(async (_, opts) => opts.method === 'GET' ? response(gate) : response({ ...JSON.parse(opts.body), createdAt: 1 }));
  const p = payload(); p.letter.body = '고맙습니다.\n\n함께 걸어 주어서 고마워요.\n가힣ㄱㅎㅏㅣ0123456789 .,!?"()-:₩$%/×+';
  assert.ok((await api.submit(p)).id);
});
test('본문 trim 최소10자·영문 n·s·이름 줄바꿈 차단을 서버와 일치시킨다', async () => {
  const api = boot(async (_, opts) => { assert.equal(opts.method, 'GET'); return response(gate); });
  const changes = [p => p.letter.body = '          ', p => p.letter.body = '\n 가나다라마바사아자 \n', p => p.letter.body += 'n', p => p.letter.body += 's', p => p.letter.to = '시험\n이름', p => p.letter.from = '시험n', p => p.order.phone4 = 1234];
  for (const change of changes) { const p = payload(); change(p); await assert.rejects(api.submit(p), { code: 'VALIDATION' }); }
});
test('33자·20줄 규격 값을 임의로 바꾼 요청은 전송하지 않는다', async () => {
  const api = boot(async (_, opts) => { assert.equal(opts.method, 'GET'); return response(gate); });
  for (const [key, value] of [['lineChars', 32], ['lineChars', 34], ['maxLines', 19], ['maxLines', 21]]) { const p = payload(); p.spec[key] = value; await assert.rejects(api.submit(p), { code: 'VALIDATION' }); }
});
test('전송 결과 유실 뒤 재시도는 같은 ID를 쓰며 거절을 성공으로 바꾸지 않는다', async () => {
  let writes = 0; const ids = [];
  const api = boot(async (url, opts) => {
    if (opts.method === 'GET') return response(gate);
    ids.push(url); if (++writes === 1) throw new TypeError('network lost after send'); return response({ error: 'Permission denied' }, 401);
  });
  const id = api.newId(); await assert.rejects(api.submit(payload(), id), { code: 'UNCERTAIN', id });
  await assert.rejects(api.submit(payload(), id), { code: 'DENIED', id }); assert.equal(ids[0], ids[1]);
});
test('필드 추가, 긴 입력, 동의 미체크는 서버 쓰기 전에 막는다', async () => {
  const changes = [p => p.unexpected = 'x', p => p.order.extra = 'x', p => p.letter.body = '가'.repeat(661), p => p.letter.to = 'A', p => p.order.phone4 = '12', p => p.consent.privacy = false, p => p.envelope.writeName = true];
  for (const change of changes) {
    let writes = 0; const api = boot(async (_, opts) => { if (opts.method !== 'GET') writes++; return response(gate); });
    const p = payload(); change(p); await assert.rejects(api.submit(p), { code: 'VALIDATION' }); assert.equal(writes, 0);
  }
});
test('중복 클릭은 같은 ID로 두 번 전송하지 않는다', async () => {
  let release; let started; const began = new Promise(r => started = r); let writes = 0;
  const api = boot(async (_, opts) => { if (opts.method === 'GET') return response(gate); writes++; started(); await new Promise(r => release = r); return response({ ...JSON.parse(opts.body), createdAt: 1 }); });
  const id = api.newId(); const first = api.submit(payload(), id); await began;
  await assert.rejects(api.submit(payload(), id), { code: 'BUSY' }); release(); await first; assert.equal(writes, 1);
});
test('규칙 병합은 다른 경로를 보존하고 루트 광역 권한을 거절한다', () => {
  const live = { rules: { hub: { '.read': "auth.token.email == 'owner@example.test'", '.write': false }, sourcing: { '.read': false }, letters: { '.read': true } } };
  const output = merge.merge(live, rules);
  assert.deepEqual(output.rules.rules.hub, live.rules.hub); assert.deepEqual(output.rules.rules.sourcing, live.rules.sourcing);
  assert.ok(!JSON.stringify(output.rules).includes('__OWNER_GOOGLE_EMAIL__'));
  for (const property of ['.read', '.write']) assert.throws(() => merge.merge({ rules: { ...live.rules, [property]: true } }, rules), /자동 병합/);
  assert.equal(live.rules.letters['.read'], true, '원본 객체도 변경하지 않는다');
});
test('규칙 주석 제거는 문자열 URL과 이스케이프를 보존한다', () => {
  const parsed = merge.parse('{"rules":{/* x */ "thing":{"url":"https://example.test/a//b", "name":"a\\\"b"}} // tail\n}');
  assert.equal(parsed.rules.thing.url, 'https://example.test/a//b'); assert.equal(parsed.rules.thing.name, 'a"b');
});
