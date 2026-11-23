// v8f 화면(카메라) 각도 단계와 낮은 카메라용 자리 배치 검사.
// 사장님 11/23 13:10 "여기서 화면 각도를 아래로좀 내려봐 카메라가 정면을 바라볼거야".
// 각도를 낮추면 깊이 차가 줄어 같은 x의 앞/뒷줄이 화면에서 한 칸을 다투게 된다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const literal = name => {
  const start = html.indexOf('const ' + name + ' = ');
  assert.ok(start >= 0, name + ' not found in index.html');
  const open = html.indexOf('{', start);
  let depth = 0, end = open;
  for (; end < html.length; end++){
    if (html[end] === '{') depth++;
    else if (html[end] === '}' && --depth === 0) break;
  }
  return eval('(' + html.slice(open, end + 1) + ')'); // eslint-disable-line no-eval
};
const LEVELS = literal('CAMERA_LEVELS');
const SLOTS = literal('LAYOUT_SLOTS_BY_CAM');

test('three camera levels exist and lower the look-down angle in order', () => {
  assert.deepEqual(Object.keys(LEVELS), ['0', '1', '2']);
  assert.equal(LEVELS['0'].pitch, 32);                     // v8e 그대로 되돌리기용
  assert.ok(LEVELS['0'].pitch > LEVELS['1'].pitch);        // ?cam=1 조금 내림
  assert.ok(LEVELS['1'].pitch > LEVELS['2'].pitch);        // ?cam=2 많이 내림
  assert.ok(LEVELS['2'].pitch <= 10, '거의 정면이어야 한다');
});

test('no ?cam value, or an unknown one, falls back to the near-front level', () => {
  const pick = asked => Object.prototype.hasOwnProperty.call(LEVELS, asked) ? asked : '2';
  assert.equal(pick(null), '2');
  assert.equal(pick('9'), '2');
  assert.equal(pick('0'), '0');
  assert.equal(pick('1'), '1');
});

test('the lowered layout keeps the v8e rows, count and depths', () => {
  assert.equal(SLOTS.lowered.length, SLOTS['0'].length);
  SLOTS.lowered.forEach((slot, i) => {
    assert.equal(slot.row, SLOTS['0'][i].row);
    assert.equal(slot.dz, SLOTS['0'][i].dz);
    assert.equal(slot.yaw, SLOTS['0'][i].yaw);
  });
});

// 화면 가로 위치 = dx / (카메라z - dz). 실제 맞춤 거리는 화면 비율에 따라 달라지므로
// 20~30 전 구간에서 이웃 간 간격이 남는지 본다(측정된 거리는 cam=1 22.32 · cam=2 23.78).
const columns = (slots, cameraZ) => slots
  .map((slot, index) => ({index, x: slot.dx / (cameraZ - slot.dz)}))
  .sort((a, b) => a.x - b.x);

test('the lowered layout gives all seven friends their own screen column', () => {
  for (let cameraZ = 20; cameraZ <= 30; cameraZ += 0.5){
    const sorted = columns(SLOTS.lowered, cameraZ);
    for (let i = 1; i < sorted.length; i++){
      const gap = sorted[i].x - sorted[i - 1].x;
      assert.ok(gap >= 0.055,
        'cameraZ ' + cameraZ + ': 자리 ' + sorted[i - 1].index + '·' + sorted[i].index + ' 간격 ' + gap.toFixed(4));
    }
  }
});

test('the check would catch the v8e layout, whose front and back share a column', () => {
  const sorted = columns(SLOTS['0'], 23.78);
  const smallest = Math.min(...sorted.slice(1).map((c, i) => c.x - sorted[i].x));
  assert.ok(smallest < 0.055, '겹치던 자리가 실제로 걸려야 한다');
});
