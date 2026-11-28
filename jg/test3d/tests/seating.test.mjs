// v8g 평소 장면 검사 — 자기 의자에 앉기 · 저마다 다른 방향 · 크기 비율 · 되돌리기(?ver=f).
// 사장님 11/23 22:03 "하나도 안귀엽고 하나도 자연스럽지가 않아" · 22:07 "다 정면만 보고일하고있는데".
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const office = await readFile(new URL('../v8-office.js', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../v8-runtime.js', import.meta.url), 'utf8');
const lock = JSON.parse(await readFile(new URL('../locked/characters.lock.json', import.meta.url), 'utf8'));
const has = (src, needle, why) => assert.ok(src.includes(needle), why + ' — 못 찾음: ' + needle);

const shapeOf = which => {
  const line = html.split('\n').find(l => l.includes('actorScale:') && l.includes('deskScale:') && l.includes(which === 'f' ? '// v8f' : '// v8g'));
  assert.ok(line, which + ' 비율 줄을 못 찾음');
  // 1319 — v8g 친구 크기는 `?scale=` 로도 바꿀 수 있게 상수로 뺐다. 그 기본값을 읽어 온다.
  const named = key => {
    const raw = line.split(key + ':')[1].split(/[,}]/)[0].trim();
    if (!Number.isNaN(Number(raw))) return Number(raw);
    // 14바퀴 — 크기 기본값은 **잠금 파일**에서 온다(사장님 11/27 09:58 '고정시킨 후').
    if (/LOCK\.공통\.크기배율/.test(html)) return lock.공통.크기배율;
    const m = html.match(/\?\s*SCALE_REQUEST\s*:\s*([0-9.]+)/);
    assert.ok(m, raw + ' 의 기본값을 못 찾음');
    return Number(m[1]);
  };
  const n = named;
  return {actorScale: n('actorScale'), deskScale: n('deskScale'), seated: /seated:true/.test(line)};
};
const SEAT_YAW_DEG = JSON.parse(html.match(/const SEAT_YAW_DEG = (\[[^\]]+\]);/)[1]);

test('v8g shrinks the friends and grows the desks, v8f stays as it was', () => {
  const f = shapeOf('f'), g = shapeOf('g');
  assert.equal(f.actorScale, 1.65);            // ?ver=f 는 v8f 그대로 되돌리기
  assert.equal(f.deskScale, 1.20);
  // 0206 — 사장님 11/25 02:05 "2배". v8f 때는 '친구를 작게'였지만 이제는 **더 크게**가 지시다.
  // 대신 책상·의자를 같은 비율로 키워 '앉아서 일하는' 비율을 지킨다(아래 ratio 검사).
  assert.ok(g.actorScale >= 1.9, '사장님 지시대로 친구는 2.0배 근처여야 한다: ' + g.actorScale);
  assert.ok(g.deskScale > f.deskScale, '책상·의자는 커져야 한다');
  assert.equal(g.seated, true);
  // 책상 상판이 친구 키의 40~60% 여야 '앉아서 일하는' 비율로 읽힌다.
  const ratio = (0.42 * g.deskScale) / (0.95 * g.actorScale);
  assert.ok(ratio > 0.40 && ratio < 0.60, '책상/친구 비율 ' + ratio.toFixed(3));
});

test('each friend faces its own desk, nobody stares straight at the camera', () => {
  assert.equal(SEAT_YAW_DEG.length, 7);
  assert.equal(new Set(SEAT_YAW_DEG).size, 7, '일곱이 모두 다른 각도여야 한다');
  for (const deg of SEAT_YAW_DEG){
    assert.ok(Math.abs(deg) >= 20, '정면(0도)에 붙어 있으면 "다 정면만 본다"가 된다: ' + deg);
    assert.ok(Math.abs(deg) <= 60, '60도를 넘으면 옆얼굴만 보여 귀엽지 않다: ' + deg);
  }
  assert.ok(SEAT_YAW_DEG.some(d => d > 0) && SEAT_YAW_DEG.some(d => d < 0), '좌우로 갈라져야 한다');
});

test('the workstation seats the friend: chair under them, desk and screen in front', () => {
  has(office, "place(inner,'chairDesk'", '의자가 자리에 있어야 한다');
  has(office, "place(inner,'desk',[1.16,.42,.60],V(0,0,.90))", '책상은 친구 앞(+z)');
  has(office, 'g.userData.seatY', '앉는 높이를 재서 들고 있어야 한다');
  has(office, 'intersectObject(chair,true)[0]', '앉는 면을 짐작하지 말고 실제로 재야 한다');
  has(html, 'actor.seatY = COMPOSITION.seated', '친구를 그 높이에 앉혀야 한다');
});

test('a friend is not blocked by its own desk, but others still walk around it', () => {
  has(office, 'ignoreKeys:root.userData.ownerKey', '자기 책상은 자기에게 막힘이 아니다');
  has(html, 'deskGroup.userData.ownerKey = FRIEND_ORDER[i]', '책상 주인을 적어 둬야 한다');
});

test('idle yaw drives the work scene instead of forcing everyone to zero', () => {
  assert.ok(!runtime.includes("['work','recover','notice'].includes(frame.id)?0:"),
    'v8f 의 "평소엔 전원 정면(0도)" 규칙이 남아 있으면 안 된다');
  has(runtime, 'idleFace', '평소 방향은 친구마다 다른 a.idleYaw 를 따라야 한다');
});

test('poses are followed smoothly instead of snapping', () => {
  has(html, 'function damp(current, goal, rate, dt)', '부드럽게 따라가는 함수가 있어야 한다');
  has(html, 'Math.exp(-rate*dt)', '프레임이 흔들려도 같은 속도로 따라가야 한다');
  const flat = html.replace(/[ 	]+/g, ' ');
  for (const key of ['poseLift','poseTiltX','poseTiltZ','poseSquash','poseSeat'])
    assert.ok(flat.includes('a.' + key + ' = damp('), key + ' 가 부드럽게 따라가야 한다');
});

test('the idle action list covers the actions the owner asked for', () => {
  for (const name of ['lookAside','stretch','yawn','chairSpin','drawer','quirk'])
    has(html, name + ':', name + ' 가 있어야 한다(2208 1-2)');
  has(html, 'busyNow.has(c.k)', '같은 동작을 둘이 동시에 하지 않아야 한다');
  // 1022 — 사장님 11/28 10:21 "지금애들이 너무 앉아만 있어 진짜각자역할에 맞게 회사생활하는것처럼".
  //        '한 번에 한 명만 자리를 비운다'(someoneAway) 규칙을 사장님 말대로 풀었다.
  //        대신 **여럿이 동시에 움직이는 것**이 코드에 남아 있는지를 본다.
  has(html, 'awayCount', '여럿이 같이 자리를 비울 수 있어야 한다(1022)');
  has(html, 'MAX_AWAY', '자리 비움 상한이 있어야 한다(1022)');
  for (const name of ['rounds','meeting','mailbox','board'])
    has(html, name + ':', name + ' 가 있어야 한다(1022 돌아다니는 직무 일)');
  has(html, 'nextTripAllowedAt', '늘 누군가 돌아다니지 않게 쉬는 시간이 있어야 한다');
});

test('friends face the window and throw from their own stations after setting down their baskets', () => {
  has(runtime, "attacking?Math.atan2(-state.position.x*.06,windowZ-state.position.z)", '씨앗은 유리창에 던진다');
  has(runtime, "a.motionGoal=a.station", '각자 자기 자리에서 던진다');
  has(runtime, "if(!SEEDS_ON || frame.id!=='throw' || !a.basketPlaced", '바구니를 내려놓고 던진다');
  has(html, 'VARIANT === \'f\'', '?ver=f 되돌리기가 있어야 한다');
});
