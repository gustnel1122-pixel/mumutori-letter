/* 고객 작성 흐름 회귀. 운영 Firebase는 차단하고 로컬 파일과 가상 응답만 사용한다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.QA_OUTPUT || path.join(root, '../qa-captures'));
fs.mkdirSync(out, { recursive: true });
const report = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const raw = url.pathname.startsWith('/captures/');
  const base = raw ? out : root;
  const file = path.resolve(base, '.' + decodeURIComponent(raw ? url.pathname.slice(9) : url.pathname));
  if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
  try { res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(fs.readFileSync(file)); }
  catch (_) { res.writeHead(404).end(); }
});
let browser;
const fixture = '오늘도 함께 걸어 줘서 고마워.\n작은 이야기를 나누던 시간들이\n내게는 오래 남는 기쁨이었어.\n\n이 편지가 너의 하루에\n조금 따뜻한 순간이 되면 좋겠어.';
async function fresh(viewport, mock = false) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: 'ko-KR', deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__audioContexts = 0;
    const NativeAudioContext = window.AudioContext;
    if (NativeAudioContext) window.AudioContext = class extends NativeAudioContext { constructor(...args) { super(...args); window.__audioContexts++; } };
  });
  if (process.env.QA_FONTS) {
    const fonts = process.env.QA_FONTS, manifest = JSON.parse(fs.readFileSync(path.join(fonts, 'manifest.json')));
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(fonts, 'fonts.css')) }));
    await page.route('https://fonts.gstatic.com/**', route => {
      const file = manifest[route.request().url()];
      return file ? route.fulfill({ contentType: 'font/ttf', body: fs.readFileSync(path.join(fonts, file)), headers: { 'Access-Control-Allow-Origin': '*' } }) : route.abort();
    });
  }
  const errors = [], writes = [], reads = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*.firebasedatabase.app/**', async route => {
    const req = route.request();
    if (!mock) { throw new Error('미리보기에서 Firebase 요청 발생: ' + req.method()); }
    if (req.method() === 'GET') {
      reads.push(req.url()); assert.match(req.url(), /\/letterIntake\.json$/);
      return route.fulfill({ json: { enabled: true, rulesVersion: 'letter-v1-20261026', verifiedAt: Date.now() } });
    }
    writes.push({ url: req.url(), body: req.postDataJSON() });
    return route.fulfill({ json: { ...req.postDataJSON(), createdAt: Date.now() } });
  });
  if (mock) await page.route('**/letter-intake-config.js', route => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(root, 'letter-intake-config.js'), 'utf8').replace('enabled: false', 'enabled: true') }));
  return { context, page, errors, writes, reads };
}
async function order(page, url = '/print.html') {
  await page.goto(origin + url); await page.locator('#o-no').fill('TEST-ONLY-001'); await page.locator('#o-name').fill('시험주문자'); await page.locator('#o-phone4').fill('0000'); await page.locator('#next').click();
}
async function write(page) {
  await page.locator('#w-to').fill('사랑하는 민지'); await page.locator('#w-from').fill('지수'); await page.locator('#w-body').fill(fixture);
}
async function next(page) { await page.locator('#next').click(); }
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '가로 넘침 없음');
  assert.equal(await page.locator('img').evaluateAll(imgs => imgs.every(i => i.hasAttribute('width') && i.hasAttribute('height'))), true, '이미지 비율 예약');
}
async function snap(page, name) {
  await page.evaluate(async () => { if (window.MMTExperience) MMTExperience.finishGreeting(); await document.fonts.ready; window.scrollTo(0, 0); });
  await noOverflow(page);
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true, animations: 'disabled' });
}
let origin;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true, args: ['--no-sandbox'] });
  for (const [size, viewport] of [['pc', { width: 1440, height: 1000 }], ['mobile390', { width: 390, height: 844 }]]) {
    const { context, page, errors, writes } = await fresh(viewport);
    await page.goto(origin + '/print.html');
    assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => window.__audioContexts), 0, '켜기 전에는 AudioContext도 생성하지 않는다');
    assert.equal(await page.locator('#prog li').count(), 4);
    assert.equal(await page.locator('#demo').isVisible(), true);
    await snap(page, '01_first_' + size);
    await page.locator('#sound-toggle').click();
    await page.waitForFunction(() => document.getElementById('sound-toggle').getAttribute('aria-pressed') === 'true');
    assert.equal(await page.evaluate(() => window.__audioContexts), 1);
    await page.locator('#sound-toggle').click(); assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'), 'false');
    await next(page); assert.equal(await page.evaluate(() => document.activeElement.id), 'o-no');
    await page.locator('#o-no').fill('TEST-ONLY-001'); await page.locator('#o-name').fill('시험주문자'); await page.locator('#o-phone4').fill('0000'); await next(page);
    await write(page);
    await page.locator('#w-body').fill('“고마워”… 늘 함께 걸어 줘서 고마워.');
    assert.equal(await page.locator('#w-body').inputValue(), '"고마워"... 늘 함께 걸어 줘서 고마워.');
    await page.locator('#w-body').fill('고맙습니다. A 한자 漢 이모지 😊'); await next(page);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'w-body');
    assert.equal(await page.locator('#w-bad').isVisible(), true);
    await page.locator('#w-body').fill(Array(17).fill('오늘도 정말 고마워.').join('\n')); await next(page);
    assert.equal(await page.locator('[data-step="write"]').isVisible(), true); assert.equal(await page.locator('#w-over').isVisible(), true);
    await page.locator('#w-body').fill('가'.repeat(33));
    assert.equal(await page.locator('#w-paper .ln').nth(2).locator('.c').count(), 33);
    await write(page); assert.equal(await page.locator('#w-body-err').isVisible(), false, '고친 입력의 이전 오류는 사라진다'); await snap(page, '02_write_' + size); await next(page);
    assert.equal(await page.locator('#env-name').isVisible(), false); assert.match(await page.locator('#envs').textContent(), /준비 중/);
    await snap(page, '03_envelope_' + size); await next(page);
    assert.equal(await page.locator('#next').textContent(), '미리보기 마치기');
    await next(page); assert.equal(await page.evaluate(() => document.activeElement.id), 'consent');
    await page.locator('#consent').check(); await next(page);
    assert.match(await page.locator('#done h1').textContent(), /미리보기/); assert.match(await page.locator('#done-no').textContent(), /접수되지 않음/);
    assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('mmt-letter-draft-print')).letter.body));
    await snap(page, '04_done_' + size);
    assert.equal(writes.length, 0); assert.deepEqual(errors, []);
    report.push(size + ': 일반 편지 4단계, 33자·20줄, 금지문자, 휴대폰 자동변환, 오류 초점, 미리보기 0전송 통과');
    await context.close();
  }
  {
    const { context, page, writes } = await fresh({ width: 390, height: 844 }, true);
    await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('blocked', 'SecurityError'); }; });
    await order(page); await write(page); await next(page); await next(page); await page.locator('#consent').check(); await next(page);
    await page.locator('#submit-err:not([hidden])').waitFor(); assert.equal(writes.length, 0); assert.match(await page.locator('#submit-err').textContent(), /전송하지 않았어요/);
    assert.equal(await page.locator('#done').isVisible(), false); report.push('브라우저 저장 차단 시 실제 전송을 막아 중복 접수 방지'); await context.close();
  }
  for (const [size, viewport] of [['pc', { width: 1440, height: 1000 }], ['mobile390', { width: 390, height: 844 }]]) {
    const { context, page, errors, writes, reads } = await fresh(viewport, true);
    await page.goto(origin + '/ghost.html'); await snap(page, 'ghost_first_' + size);
    await order(page, '/ghost.html');
    await page.locator('#rel label:has(input[value="friend"])').click(); await page.locator('#s-to').fill('민지'); await page.locator('#s-from').fill('지수');
    await page.locator('#q-call').fill('민지야'); await page.locator('label:has([data-q="tone"][value="반말"])').click(); await page.locator('label:has([data-q="why"][value="고마워서"])').click();
    await page.locator('#q-scene').fill('함께 길을 걸으며 웃었던 날이 기억나요.'); await page.locator('label:has([data-q="heart"][value="고마움"])').click();
    await page.locator('label:has([data-q="feel"][value="웃었으면"])').click(); await page.locator('#q-last').fill('늘 고마워.');
    await next(page); assert.equal(await page.locator('[data-step="memo"]').isVisible(), true); await next(page); await next(page); await page.locator('#consent').check();
    await next(page); await page.locator('#done:not([hidden])').waitFor();
    assert.match(await page.locator('#done h1').textContent(), /접수됐어요/); assert.equal(writes.length, 1); assert.equal(writes[0].body.type, 'ghost');
    assert.equal(await page.evaluate(() => localStorage.getItem('mmt-letter-draft-ghost')), 'null');
    assert.ok(reads.every(url => url.endsWith('/letterIntake.json'))); assert.deepEqual(errors, []);
    report.push(size + ': 대필 5개 내부 화면·상단 4단계, 설문·메모·서버 응답 확인 완료 (가상 서버)');
    await snap(page, 'ghost_done_mock_' + size); await context.close();
  }
  // 실제 규칙을 바꾸지 않고 서버 응답 유실 이후 동일 ID/동일 원문 재시도를 확인한다.
  {
    const { context, page, errors } = await fresh({ width: 1440, height: 1000 }, true);
    const attempts = [];
    await page.route('**/letters/*.json', async route => {
      attempts.push({ url: route.request().url(), body: route.request().postDataJSON() });
      if (attempts.length === 1) return route.abort('connectionreset');
      return route.fulfill({ json: { ...route.request().postDataJSON(), createdAt: Date.now() } });
    });
    await order(page); await write(page); await next(page); await next(page); await page.locator('#consent').check(); await next(page);
    await page.locator('#submit-err:not([hidden])').waitFor(); assert.equal(await page.locator('#done').isVisible(), false);
    assert.equal(await page.locator('#w-body').isDisabled(), true); await next(page); await page.locator('#done:not([hidden])').waitFor();
    assert.equal(attempts.length, 2); assert.equal(attempts[0].url, attempts[1].url); assert.deepEqual(attempts[0].body, attempts[1].body); assert.deepEqual(errors, []);
    report.push('연결 끊김: 거짓 완료 없음·원문 잠금·동일 접수번호/원문 재시도 통과 (가상 서버)');
    await context.close();
  }
  // 캡처 4장 안에 PC와 실제 390px 화면을 함께 배치한다. 각 원본 스크린샷의 내용은 그대로 둔다.
  for (const [stem, title] of [['01_first','첫 화면'],['02_write','편지 쓰기'],['03_envelope','봉투'],['04_done','미리보기 완료']]) {
    const { context, page } = await fresh({ width: 1460, height: 1100 });
    await page.setContent('<!doctype html><html lang="ko"><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;600&display=swap"><style>*{box-sizing:border-box}body{margin:0;background:#e9e0d4;color:#3e2416;font-family:"IBM Plex Sans KR",sans-serif;padding:28px}h1{font-size:24px;margin:0 0 10px}p{font-size:13px;margin:0 0 24px}main{display:grid;grid-template-columns:960px 390px;gap:24px;align-items:start}h2{font-size:14px;margin:0 0 12px}img{display:block;width:100%;height:auto;border:1px solid #cbb79d}</style><h1>무무토리 레터 · '+title+'</h1><p>PC 1440px · 휴대폰 390px / 가상 정보로 검수 · 운영 접수는 미리보기 상태</p><main><section><h2>PC · 1440px</h2><img src="'+origin+'/captures/'+stem+'_pc.png"></section><section><h2>휴대폰 · 390px</h2><img src="'+origin+'/captures/'+stem+'_mobile390.png"></section></main></html>');
    await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, stem + '_pc_mobile390.png'), fullPage: true }); await context.close();
  }
  fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ liveFirebaseRequests: 0, checks: report }, null, 2));
  console.log(JSON.stringify({ passed: report, liveFirebaseRequests: 0, captures: out }, null, 2));
})().catch(e => { console.error(e.stack); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
