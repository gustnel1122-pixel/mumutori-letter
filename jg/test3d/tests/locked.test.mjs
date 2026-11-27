// 14바퀴(사장님 11/27 09:58 "캐릭터들을 장면을 만들고 고정시킨 후 그걸로 만들어야지")
// — 캐릭터 겉모습이 **잠긴 값에서 벗어나면 실패**하는 검사.
//
// 이 검사가 잡는 것
//   1) 정본 GLB 파일이 바뀌면          → 해시 불일치로 실패
//   2) 잠금 파일(characters.lock.json)이 바뀌면 → 승인 해시 불일치로 실패
//   3) 코드가 잠금을 안 거치고 캐릭터 값을 직접 쓰면 → '직접 쓴 값' 검사로 실패
//
// 바꾸려면: 사장님 승인을 받고 ① 잠금 파일을 고치고 ② 아래 `승인된_잠금해시`를 같이 고친다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const lockPath = join(root, 'locked', 'characters.lock.json');
const lockText = readFileSync(lockPath, 'utf8');
const lock = JSON.parse(lockText);

// 사장님 승인본(2026-11-27 **15바퀴** — 11:28 "테두리빼고 만들어봐" 로 외곽선 끔).
// 잠금 파일을 한 글자라도 고치면 이 값과 달라져 실패한다.
// 14바퀴(외곽선 켬) 승인본은 `8211a32f4f57a13940dc3d1f45ee9b54` 였다.
const 승인된_잠금해시 = '05340281f15e9b2dd5d604773b3899ed';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex').toUpperCase();
const md5 = (text) => createHash('md5').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex');

test('정본 GLB 일곱이 잠긴 해시 그대로다', () => {
  for (const [key, v] of Object.entries(lock.캐릭터)) {
    const got = sha256(readFileSync(join(root, 'models', v.glb))).slice(0, 16);
    assert.equal(got, v.sha256_16,
      `${key}(${v.glb}) 의 GLB 가 바뀌었습니다. 잠금 ${v.sha256_16} · 지금 ${got}`);
  }
});

test('잠금 파일이 사장님 승인본 그대로다', () => {
  assert.equal(md5(lockText), 승인된_잠금해시,
    '잠금 파일이 바뀌었습니다. 사장님 승인을 받고 이 검사의 `승인된_잠금해시` 도 같이 고치세요. 지금 ' + md5(lockText));
});

test('잠금에 일곱 명이 다 있고 정본 규칙을 지킨다', () => {
  const order = ['dotori', 'byeongari', 'bam', 'ddangkong', 'wandukong3', 'haebaragi', 'ssal'];
  assert.deepEqual(Object.keys(lock.캐릭터).sort(), [...order].sort());
  assert.equal(lock.공통.눈썹, false, '눈썹은 없어야 합니다');
  assert.equal(lock.캐릭터.wandukong3.알수, 3, '완두콩은 정확히 세 알');
  assert.equal(lock.캐릭터.haebaragi.줄무늬, true, '줄무늬는 해바라기씨에게');
  for (const key of ['dotori', 'bam', 'ddangkong', 'byeongari'])
    assert.equal(lock.캐릭터[key].입, false, key + ' 은 입이 없어야 합니다');
  for (const key of order)
    if (key !== 'haebaragi')
      assert.notEqual(lock.캐릭터[key].줄무늬, true, key + ' 에 줄무늬가 생기면 안 됩니다');
});

test('코드가 캐릭터 값을 직접 쓰지 않고 잠금에서 읽는다', () => {
  const page = readFileSync(join(root, 'index.html'), 'utf8');
  // 캐릭터 표 세 개는 전부 LOCK 에서 만들어져야 한다(직접 적힌 값 금지).
  for (const name of ['CANON_MATERIAL_COLOR', 'CANON_BELLY', 'CANON_ACCESSORY']) {
    const line = page.split('\n').find(l => l.startsWith('const ' + name));
    assert.ok(line, name + ' 를 찾지 못했습니다');
    assert.ok(/LOCK\./.test(line) || /Object\.(fromEntries|entries)/.test(line),
      name + ' 가 잠금 파일을 거치지 않고 직접 값을 쓰고 있습니다: ' + line.trim());
  }
  assert.ok(/parseInt\(LOCK\.공통\.외곽선\.색/.test(page), '외곽선 색이 잠금에서 와야 합니다');
  assert.ok(/LOCK\.공통\.외곽선\.배율/.test(page), '외곽선 굵기가 잠금에서 와야 합니다');
  assert.ok(/LOCK\.공통\.크기배율/.test(page), '크기 배율이 잠금에서 와야 합니다');
  const emotions = readFileSync(join(root, 'v8-emotions.js'), 'utf8');
  assert.ok(/export function setEyeTune/.test(emotions), '눈 값이 잠금에서 와야 합니다');
  assert.ok(/^let EYE_TUNE = \{\};$/m.test(emotions), '눈 표가 코드에 직접 적혀 있으면 안 됩니다');
});
