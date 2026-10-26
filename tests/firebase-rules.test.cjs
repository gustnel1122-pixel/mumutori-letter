/* 공식 로컬 에뮬레이터만 사용. 실제 Firebase URL/키/자격증명은 받지 않는다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const BASE = 'http://127.0.0.1:9005';
const NS = 'demo-mumutori-letters';
const OWNER = 'owner@example.test';
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase/letters.rules.json'), 'utf8').replaceAll('__OWNER_GOOGLE_EMAIL__', OWNER));
const id = () => 'ltr_' + randomBytes(16).toString('hex');
const stamp = { '.sv': 'timestamp' };
function payload(type = 'print') {
  const p = { schemaVersion: 1, type, order: { name: '시험주문자', phone4: '0000' }, letter: { to: '시험받는분', from: '시험보내는분' }, envelope: { id: 'basic', writeName: false }, consent: { privacy: true, at: new Date().toISOString() }, spec: { lineChars: 33, maxLines: 20, paper: 'A5' }, status: 'received', createdAt: stamp };
  if (type === 'print') p.letter.body = '고마운 마음을 편지에 담아 보냅니다.';
  else { p.relation = 'friend'; p.survey = { call: '친구야', tone: '반말', why: ['고마워서'], scene: '함께 걸었던 날이 생각나요.', heart: ['고마움'], feel: ['웃었으면'], last: '늘 고마워' }; p.memo = ''; }
  return p;
}
function token({ email = OWNER, provider = 'google.com', verified = true, uid = 'fake-owner-uid' } = {}) {
  const enc = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return enc({ alg: 'none', typ: 'JWT' }) + '.' + enc({ iss: 'https://securetoken.google.com/' + NS, aud: NS, auth_time: now, iat: now, exp: now + 3600, sub: uid, user_id: uid, email, email_verified: verified, firebase: { sign_in_provider: provider, identities: {} } }) + '.';
}
async function request(method, target, data, auth, admin = false) {
  // owner는 로컬 emulator에서 규칙을 넣는 시험 전용 값이다. 실제 자격증명이 아니다.
  const url = BASE + '/' + target + '.json?ns=' + NS + (auth ? '&auth=' + encodeURIComponent(auth) : '');
  assert.equal(new URL(url).hostname, '127.0.0.1');
  const headers = { 'Content-Type': 'application/json' }; if (admin) headers.Authorization = 'Bearer owner';
  const response = await fetch(url, { method, headers, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(5000) });
  return { code: response.status, data: await response.json() };
}
let count = 0;
async function check(title, fn) { await fn(); count++; console.log('PASS', title); }
function denied(r) { assert.ok([401, 403].includes(r.code), 'expected deny, received ' + r.code + ': ' + JSON.stringify(r.data)); }
async function main() {
  const applied = await request('PUT', '.settings/rules', rules, null, true); assert.equal(applied.code, 200, JSON.stringify(applied));
  const seed = await request('PUT', 'letterIntake', { enabled: true, rulesVersion: 'letter-v1-20261026', verifiedAt: Date.now() }, null, true); assert.equal(seed.code, 200);
  let printID, ghostID;
  await check('주문번호 없는 미로그인 새 일반 편지 작성 허용', async () => { printID = id(); const r = await request('PUT', 'letters/' + printID, payload()); assert.equal(r.code, 200, JSON.stringify(r)); assert.equal(typeof r.data.createdAt, 'number'); });
  await check('주문번호 없는 미로그인 새 대필 작성 허용', async () => { ghostID = id(); const r = await request('PUT', 'letters/' + ghostID, payload('ghost')); assert.equal(r.code, 200, JSON.stringify(r)); });
  await check('기존 주문번호는 선택 항목이며 있으면 기존 검사 유지', async () => {
    for (const type of ['print', 'ghost']) { const p = payload(type); p.order.no = 'LEGACY-ORDER'; assert.equal((await request('PUT', 'letters/' + id(), p)).code, 200); }
    for (const no of ['', '   ', 123, 'x'.repeat(81)]) { const p = payload(); p.order.no = no; denied(await request('PUT', 'letters/' + id(), p)); }
  });
  await check('일반 편지의 실제 줄바꿈·빈 줄 허용', async () => { for (const body of ['고맙습니다.\n함께 걸어 주어서 고마워요.', '첫 줄의 마음을 담아요.\n\n끝 줄에도 마음을 담아요.', '\n\n가나다라마바사아자차\n\n']) { const p = payload(); p.letter.body = body; assert.equal((await request('PUT', 'letters/' + id(), p)).code, 200, JSON.stringify(body)); } });
  await check('마라톤 자판의 모든 허용기호·한글·숫자 허용', async () => { for (const c of Array.from('가힣ㄱㅎㅏㅣ0123456789 .,!?"()-:₩$%/×+')) { const p = payload(); p.letter.body += c; assert.equal((await request('PUT', 'letters/' + id(), p)).code, 200, JSON.stringify(c)); } });
  await check('영문 n·s 포함 영문과 비허용 제어문자 차단', async () => { for (const c of ['n', 's', 'A', 'z', '\t', '\r', '\\', "'", '~', ';', '…', '·']) { const p = payload(); p.letter.body += c; denied(await request('PUT', 'letters/' + id(), p)); } });
  await check('본문 앞뒤 공백·줄바꿈 제외 최소10자 경계', async () => { for (const body of ['          ', '\n \n \n       ', '  가나다라마바사아자  ', '\n 가나다라마바사아자 \n']) { const p = payload(); p.letter.body = body; denied(await request('PUT', 'letters/' + id(), p)); } const p = payload(); p.letter.body = '  가나다라마바사아자차  '; assert.equal((await request('PUT', 'letters/' + id(), p)).code, 200); });
  await check('이름의 줄바꿈·영문 n·s 금지 및31자 경계', async () => { for (const field of ['to', 'from']) { for (const name of ['받는\n분', '시험n', '시험s', '시험\t', '가'.repeat(32)]) { const p = payload(); p.letter[field] = name; denied(await request('PUT', 'letters/' + id(), p)); } const p = payload(); p.letter[field] = '가'.repeat(31); assert.equal((await request('PUT', 'letters/' + id(), p)).code, 200); } });
  await check('규격은 한줄33자·한장20줄 고정값만 허용', async () => { for (const [key, value] of [['lineChars', 32], ['lineChars', 34], ['maxLines', 19], ['maxLines', 21]]) { const p = payload(); p.spec[key] = value; denied(await request('PUT', 'letters/' + id(), p)); } const p = payload(); assert.equal((await request('PUT', 'letters/' + id(), p)).code, 200); });
  await check('미로그인 목록·단건·하위필드 읽기 차단', async () => { for (const p of ['letters', 'letters/' + printID, 'letters/' + printID + '/letter/body']) denied(await request('GET', p)); });
  await check('미로그인 덮어쓰기·부분수정·삭제 차단', async () => { denied(await request('PUT', 'letters/' + printID, payload())); denied(await request('PATCH', 'letters/' + printID, { status: 'done' })); denied(await request('DELETE', 'letters/' + printID)); });
  await check('사장님 verified Google 계정 읽기 허용', async () => { const r = await request('GET', 'letters', undefined, token()); assert.equal(r.code, 200, JSON.stringify(r)); assert.equal(r.data[printID].type, 'print'); });
  await check('다른 Google 계정·미확인 이메일·password provider 읽기 차단', async () => { for (const auth of [token({ email: 'someone@example.test', uid: 'fake-other' }), token({ verified: false }), token({ provider: 'password' })]) denied(await request('GET', 'letters', undefined, auth)); });
  await check('admins에 있어도 사장님이 아니면 편지 읽기 차단', async () => { await request('PUT', 'admins/fake-admin', true, null, true); denied(await request('GET', 'letters', undefined, token({ email: 'admin@example.test', uid: 'fake-admin' }))); });
  await check('사장님 클라이언트도 기존 편지 수정·삭제 차단', async () => { denied(await request('PATCH', 'letters/' + printID, { status: 'done' }, token())); denied(await request('DELETE', 'letters/' + printID, undefined, token())); });
  await check('허용목록 밖의 최상위·중첩 필드 차단', async () => { for (const change of [p => p.extra = 'x', p => p.order.extra = 'x', p => p.letter.extra = 'x', p => p.consent.extra = true, p => p.spec.extra = 1]) { const p = payload(); change(p); denied(await request('PUT', 'letters/' + id(), p)); } });
  await check('필드 우선순위 메타데이터로 추가 데이터를 숨기지 못함', async () => { const p = payload(); p.order.name = { '.value': '시험주문자', '.priority': 'unexpected-metadata' }; denied(await request('PUT', 'letters/' + id(), p)); });
  await check('필수값 누락·자료형·잘못된 동의 차단', async () => { for (const change of [p => delete p.order, p => delete p.letter.from, p => p.order.name = 123, p => p.order.phone4 = '123', p => p.consent.privacy = false, p => p.envelope.writeName = true, p => p.spec.lineChars = 100]) { const p = payload(); change(p); denied(await request('PUT', 'letters/' + id(), p)); } });
  await check('길이 초과·미허용 타자기 글자·위조 서버시각 차단', async () => { for (const change of [p => p.order.no = 'x'.repeat(81), p => p.letter.to = '가'.repeat(32), p => p.letter.body = '가'.repeat(661), p => p.letter.body += '😀', p => p.createdAt = 1]) { const p = payload(); change(p); denied(await request('PUT', 'letters/' + id(), p)); } });
  await check('대필 임의 문항·선택지·큰 배열·길이 초과 차단', async () => { for (const change of [p => p.survey.extra = 'x', p => p.survey.why = ['임의선택'], p => p.survey.why = Array(7).fill('기타'), p => delete p.survey.scene, p => p.survey.scene = '가'.repeat(1201), p => p.memo = '가'.repeat(301), p => p.letter.body = '임의 본문']) { const p = payload('ghost'); change(p); denied(await request('PUT', 'letters/' + id(), p)); } });
  await check('잘못된 접수번호와 최상위 덮어쓰기 차단', async () => { denied(await request('PUT', 'letters/arbitrary', payload())); denied(await request('PUT', 'letters', { [id()]: payload() })); });
  await check('gate 읽기는 공개·쓰기 사장님만 허용', async () => { assert.equal((await request('GET', 'letterIntake')).code, 200); const data = { enabled: false, rulesVersion: 'letter-v1-20261026', verifiedAt: Date.now() }; denied(await request('PUT', 'letterIntake', data)); assert.equal((await request('PUT', 'letterIntake', data, token())).code, 200); });
  await check('서버 gate 닫힘과 다른 규칙 버전에서 작성 차단', async () => { denied(await request('PUT', 'letters/' + id(), payload())); await request('PUT', 'letterIntake', { enabled: true, rulesVersion: 'old-version', verifiedAt: Date.now() }, null, true); denied(await request('PUT', 'letters/' + id(), payload())); });
  console.log(JSON.stringify({ passed: count, failed: 0, environment: '127.0.0.1 Firebase Realtime Database Emulator', productionRequests: 0 }));
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
