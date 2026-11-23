import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../v8-director.js',import.meta.url),'utf8');
const {SceneDirector,AdaptiveQuality,SCENES,ATTACK_SECONDS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const advance=(director,seconds,level)=>{for(let t=0;t<seconds;t+=.02)director.update(.02,level);return director.snapshot();};

test('any detected person starts the same determined battle within one frame',()=>{
  const d=new SceneDirector(),s=d.update(1/60,1);assert.equal(s.id,'notice');assert.equal(s.mode,'battle');assert.equal(s.emotion,'determined');assert.equal(s.encounters,1);
  assert.equal(advance(d,.5,3).id,'equip');
});
test('battle emotions never include tired or working, and all attack stages run',()=>{
  const d=new SceneDirector();d.begin();const stages=new Set();
  for(let t=0;t<33;t+=.02){const s=d.update(.02,3);stages.add(s.id);if(s.mode==='battle')assert.ok(!['tired','working'].includes(s.emotion));}
  for(const id of ['equip','ready','throw','gun','fetch','bazooka','mess','escape'])assert.ok(stages.has(id),id);
  assert.equal(ATTACK_SECONDS,17);   // 0224: 공격을 12.5초 → 17초로 늘림
});
test('persistent visitor keeps the group hidden; two seconds absent releases them',()=>{
  const d=new SceneDirector();d.begin();assert.equal(advance(d,80,2).id,'hide');assert.equal(d.encounters,1);
  assert.equal(advance(d,1,0).id,'hide');assert.equal(advance(d,1.2,0).id,'peek');
  advance(d,8,0);assert.equal(d.snapshot().id,'work');d.update(.02,1);assert.equal(d.encounters,2);
});
test('a returning visitor during peek sends everyone back to cover',()=>{
  const d=new SceneDirector();d.begin();advance(d,35.5,0);assert.equal(d.snapshot().id,'peek');
  assert.equal(d.update(.02,1).id,'escape');assert.equal(d.encounters,1);
});
test('camera-free demo follows all stages and completes without a presence feed',()=>{
  const d=new SceneDirector();d.begin(true);const seen=new Set();for(let t=0;t<45;t+=.02)seen.add(d.update(.02,0).id);
  for(const s of SCENES)assert.ok(seen.has(s.id),s.id);assert.equal(d.snapshot().id,'work');
});
test('quality preserves native resolution without real-time effects, even when fixed high',()=>{
  const q=new AdaptiveQuality();assert.equal(q.current.scale,1);assert.equal(q.current.shadow,0);assert.equal(q.current.ao,false);assert.equal(q.current.bloom,false);assert.equal(q.current.transmission,0);
  for(let i=0;i<1200;i++)q.sample(1/30);assert.equal(q.current.id,'high');
});
test('quality needs over five seconds below 24 FPS and drops only one tier at a time',()=>{
  const q=new AdaptiveQuality();for(let i=0;i<99;i++)q.sample(.05);assert.equal(q.current.id,'high');
  for(let i=0;i<22;i++)q.sample(.05);assert.equal(q.current.id,'medium');assert.equal(q.current.scale,1);
  for(let i=0;i<121;i++)q.sample(.05);assert.equal(q.current.id,'low');assert.ok(q.current.scale>=.85);
});
test('quality restores after recovery, ignores suspended time, and honors fixed high',()=>{
  const q=new AdaptiveQuality();q.choose('low');q.mode='auto';for(let i=0;i<510;i++)q.sample(1/60);assert.equal(q.current.id,'medium');
  q.sample(60);assert.equal(q.current.id,'medium');for(let i=0;i<510;i++)q.sample(1/60);assert.equal(q.current.id,'high');
  q.choose('high');for(let i=0;i<500;i++)q.sample(.1);assert.equal(q.current.id,'high');
});
test('sustained one-FPS rendering also triggers a downgrade',()=>{
  const q=new AdaptiveQuality();for(let i=0;i<5;i++)q.sample(1);assert.equal(q.current.id,'high');q.sample(1);assert.equal(q.current.id,'medium');
});
