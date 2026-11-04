/* AI 검사 · 도토리 도우미 시험 (11/4). 운영 Firebase · 실제 검사 서버는 막고 가짜 응답만 쓴다. 손님 편지 아님(지어낸 글). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.QA_OUTPUT ? path.resolve(process.env.QA_OUTPUT) : '';
const EP = 'https://script.google.com/macros/s/TESTONLY_letter-check_123/exec';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  const file = path.resolve(root, '.' + decodeURIComponent(u.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(fs.readFileSync(file)); }
  catch (_) { res.writeHead(404).end(); }
});
const BODY = '엄마 요즘 설래는 일이 생겼어요.\n엄마가 늘 건강하길 바래요. 고마워요.';
const AI_ITEMS = [{ wrong: '설래는', right: '설레는', kind: 'spell', why: '설레다가 바른 말' }, { wrong: '바래요', right: '바라요', kind: 'spell', why: '바라다가 바른 말' }, { wrong: '없는조각', right: '없는 조각', kind: 'space', why: '' }];
let browser, origin;

async function open(viewport, { ai = false, reply = { ok: true, items: AI_ITEMS }, guide = true, motion = 'reduce' } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: motion, locale: 'ko-KR', deviceScaleFactor: out ? 2 : 1 });
  const page = await context.newPage();
  const errors = [], posts = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*.firebasedatabase.app/**', (r) => { throw new Error('Firebase 요청 발생'); });
  await page.route(/script\.google\.com/, async (r) => {
    posts.push(Object.fromEntries(new URLSearchParams(r.request().postData() || '')));
    await new Promise((ok) => setTimeout(ok, 120));
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(reply) });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route('**/letter-intake-config.js*', (r) => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(root, 'letter-intake-config.js'), 'utf8').replace(/enabled: (true|false)/, 'enabled: false') }));
  if (ai) await page.route('**/letter-check-config.js*', (r) => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(root, 'letter-check-config.js'), 'utf8').replace("ai: false", 'ai: true').replace("endpoint: ''", "endpoint: '" + EP + "'") }));
  if (!guide) await page.addInitScript(() => { try { localStorage.setItem('mmt-letter-guide', 'off'); } catch (_) {} });
  await page.goto(origin + '/print.html');
  return { context, page, errors, posts };
}
async function toWrite(page) {
  await page.locator('#o-name').fill('시험주문자'); await page.locator('#o-phone4').fill('0000'); await page.locator('#next').click();
  await page.locator('#w-to').fill('엄마'); await page.locator('#w-from').fill('지수'); await page.locator('#w-body').fill(BODY);
  await page.locator('#w-body').blur();
}
const overlap = (a, b) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);

(async () => {
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch();
  const report = [];
  try {
    // 1) AI 꺼짐(기본 설정): 지금처럼 휴대폰 안 검사만 · 밖으로 아무것도 안 감
    { const { context, page, errors, posts } = await open({ width: 1280, height: 900 }, { guide: false });
      await toWrite(page);
      assert.ok((await page.locator('.chk-note').textContent()).includes('휴대폰 밖으로 나가지 않아요'));
      await page.locator('#w-check').click();
      await page.waitForTimeout(200);
      assert.equal(await page.locator('#w-chk-res .ai-ask').count(), 0);
      assert.ok((await page.locator('#w-chk-res').textContent()).includes('표시할 곳을 찾지 못했어요'));
      assert.equal(posts.length, 0); assert.deepEqual(errors, []);
      report.push('AI 꺼짐(기본): 묻기 칸 없음 · 휴대폰 안 검사만 · 밖으로 0번');
      await context.close(); }
    // 2) AI 켜짐: 먼저 묻고 → 고르면 그때만 보냄 → 표시만 · AI 표시 · 고치면 다시 검사
    for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const { context, page, errors, posts } = await open(vp, { ai: true, guide: false });
      await toWrite(page);
      assert.ok((await page.locator('.chk-note').textContent()).includes('AI 검사를 고르실 때만'));
      await page.locator('#w-check').click();
      await page.locator('#w-chk-res .ai-ask').waitFor();
      assert.equal(posts.length, 0, '묻기 전엔 안 보냄');
      if (out && vp.width === 390) await page.locator('#w-chk-res').screenshot({ path: path.join(out, 'ai-ask-390.png') });
      await page.locator('#w-chk-res [data-ai="yes"]').click();
      await page.locator('#w-chk-res .ai-line.ok').waitFor({ timeout: 5000 });
      assert.equal(posts.length, 1); assert.equal(posts[0].type, 'letterCheck'); assert.equal(posts[0].text, BODY);
      const txt = await page.locator('#w-chk-res').textContent();
      assert.ok(txt.includes("'설래는' → '설레는'") && txt.includes("'바래요' → '바라요'"), 'AI 표시');
      assert.ok(!txt.includes('없는조각'), '글에 없는 조각은 표시 안 함');
      assert.equal(await page.locator('#w-chk-res .k.ai').count(), 2);
      assert.ok(await page.locator('.pe-marks mark').count() >= 2);
      assert.equal(await page.locator('#w-body').inputValue(), BODY, '고치지 않음');
      if (out) await page.screenshot({ path: path.join(out, `ai-result-${vp.width}.png`), fullPage: false });
      // 글을 고치면: 남은 조각만 표시 + 다시 검사 버튼
      await page.locator('#w-body').fill(BODY.replace('설래는', '설레는'));
      await page.waitForTimeout(400);
      const t2 = await page.locator('#w-chk-res').textContent();
      assert.ok(!t2.includes("'설래는'") && t2.includes("'바래요'") && t2.includes('글을 고쳤어요'));
      await page.locator('#w-chk-res [data-ai="again"]').click();
      await page.locator('#w-chk-res .ai-line.ok').waitFor({ timeout: 5000 });
      assert.equal(posts.length, 2);
      // 같은 글로 다시 켜면 다시 안 보냄
      await page.locator('#w-check').click(); await page.locator('#w-check').click(); await page.waitForTimeout(200);
      assert.equal(posts.length, 2);
      assert.deepEqual(errors, []);
      report.push(`${vp.width}px AI 켜짐: 먼저 묻기(묻기 전 0번) → 고르면 본문만 보냄 → AI 2곳 표시(글에 없는 조각 버림) · 글 안 고침 · 고치면 남은 것만 + 다시 검사 · 같은 글은 다시 안 보냄`);
      await context.close();
    }
    // 3) '이 휴대폰 안에서만' → 안 보냄 · 서버 한도 → 안내
    { const { context, page, posts } = await open({ width: 1280, height: 900 }, { ai: true, guide: false, reply: { ok: false, code: 'BUDGET' } });
      await toWrite(page); await page.locator('#w-check').click();
      await page.locator('#w-chk-res [data-ai="no"]').click(); await page.waitForTimeout(150);
      assert.equal(posts.length, 0); assert.ok((await page.locator('#w-chk-res').textContent()).includes('이 휴대폰 안에서만 살펴봤어요'));
      await page.locator('#w-chk-res [data-ai="yes"]').click(); await page.waitForTimeout(400);
      assert.equal(posts.length, 1); assert.ok((await page.locator('#w-chk-res').textContent()).includes('오늘은 AI 검사를 더 쓸 수 없어요'));
      report.push("'이 휴대폰 안에서만' → 0번 · 서버 한도(BUDGET) → 안내 후 휴대폰 검사 결과만");
      await context.close(); }
    // 4) 도토리 도우미: 날아와서 말풍선 · 칸 안 가림 · 다음 칸으로 · 글 쓸 땐 비킴 · 그만 보기
    for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const { context, page, errors } = await open(vp, { motion: 'no-preference' });
      const g = page.locator('.lg');
      await g.waitFor({ state: 'attached', timeout: 3000 }); await page.waitForTimeout(1000);
      assert.ok((await page.locator('.lg-t').textContent()).includes('주문하신 분 이름'));
      const gb = await page.locator('.lg-body').boundingBox(), ib = await page.locator('#o-name').boundingBox();
      assert.ok(!overlap(gb, ib), '이름 칸을 가리지 않음');
      if (out) await page.screenshot({ path: path.join(out, `guide-order-${vp.width}.png`) });
      await page.locator('#o-name').focus(); await page.waitForTimeout(100);
      assert.ok(await g.evaluate((el) => el.classList.contains('lg-away')), '글 쓸 땐 비킴');
      await page.locator('#o-name').fill('시험주문자'); await page.locator('#o-name').blur(); await page.waitForTimeout(1100);
      assert.ok((await page.locator('.lg-t').textContent()).includes('4자리'), '다음 칸으로');
      const pb = await page.locator('#o-phone4').boundingBox(), gb2 = await page.locator('.lg-body').boundingBox();
      assert.ok(!overlap(gb2, pb), '번호 칸을 가리지 않음');
      await page.locator('#o-phone4').fill('0000'); await page.locator('#o-phone4').blur(); await page.waitForTimeout(1100);
      assert.ok((await page.locator('.lg-t').textContent()).includes('누르면'), '다음 버튼 가리킴');
      await page.locator('#next').click(); await page.waitForTimeout(1100);
      assert.ok((await page.locator('.lg-t').textContent()).includes('받는 분'));
      if (out) await page.screenshot({ path: path.join(out, `guide-write-${vp.width}.png`) });
      // 그만 보기
      await page.locator('.lg-body').click({ force: true }); await page.waitForTimeout(150);
      await page.locator('.lg-off').click({ force: true });
      assert.equal(await page.locator('.lg').count(), 0);
      await page.reload(); await page.waitForTimeout(1500);
      assert.equal(await page.locator('.lg').count(), 0, '그만 보기 기억');
      assert.deepEqual(errors, []);
      report.push(`${vp.width}px 도토리: 날아와 말풍선 · 이름/번호 칸 안 가림 · 칸 채우면 다음 칸 · 다음 버튼 · 단계 넘어가면 따라옴 · 글 쓸 땐 비킴 · 그만 보기 기억`);
      await context.close();
    }
    // 5) 움직임 줄이기: 날지 않고 나타남
    { const { context, page } = await open({ width: 390, height: 844 }, { motion: 'reduce' });
      await page.locator('.lg').waitFor({ state: 'attached', timeout: 3000 }); await page.waitForTimeout(300);
      const tr = await page.locator('.lg').evaluate((el) => getComputedStyle(el).transitionProperty);
      assert.ok(!/transform/.test(tr), 'reduce: 이동 애니메이션 없음');
      report.push('움직임 줄이기: 날지 않고 그 자리에 나타남');
      await context.close(); }
  } finally { await browser.close(); server.close(); }
  console.log(JSON.stringify({ passed: report }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
