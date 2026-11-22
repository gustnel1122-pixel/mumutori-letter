import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../v8-motion.js',import.meta.url),'utf8');
const {MotionWorld}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const simulate=(world,goals,seconds,dt=1/60)=>{for(let t=0;t<seconds;t+=dt)assert.deepEqual(world.step(goals,dt),[]);};
test('routes a body around a desk instead of crossing its inflated corners',()=>{
  const world=new MotionWorld();world.setObstacles([{key:'desk',minX:-1,maxX:1,minZ:-1,maxZ:1}]);
  world.add('a',{x:-4,z:0},.7);simulate(world,new Map([['a',{x:4,z:0}]]),8);
  assert.ok(world.agents.get('a').arrived);assert.equal(world.inspect().overlapFrames,0);
});
test('two crossing friends remain separated and both finish their routes',()=>{
  const world=new MotionWorld();world.add('a',{x:-4,z:0},.6);world.add('b',{x:0,z:-4},.6);
  simulate(world,new Map([['a',{x:4,z:0}],['b',{x:0,z:4}]]),12);
  assert.ok([...world.agents.values()].every(a=>a.arrived));assert.equal(world.inspect().overlapFrames,0);
});
test('large frame gaps cannot tunnel through furniture or another body',()=>{
  const world=new MotionWorld();world.setObstacles([{key:'wall',minX:0,maxX:.1,minZ:-2,maxZ:2}]);
  world.add('a',{x:-3,z:0},.6);world.add('b',{x:3,z:0},.6);
  simulate(world,new Map([['a',{x:3,z:3,speed:5}],['b',{x:-3,z:-3,speed:5}]]),12,.15);
  assert.ok([...world.agents.values()].every(a=>a.arrived));
});
test('an occupied destination makes a visitor wait safely',()=>{
  const world=new MotionWorld();world.add('host',{x:0,z:0},.7);world.add('visitor',{x:-4,z:0},.7);
  simulate(world,new Map([['host',{x:0,z:0}],['visitor',{x:0,z:0}]]),6);
  assert.equal(world.inspect().overlapFrames,0);assert.ok(Math.hypot(world.agents.get('visitor').position.x,world.agents.get('visitor').position.z)>=1.4);
});
test('a brief corner intersection cannot be skipped by route smoothing',()=>{
  const world=new MotionWorld();world.setObstacles([{key:'launcher',minX:-8.76951514774044,maxX:-7.20272313984612,minZ:-1.5354235178829865,maxZ:-.09007322337626505}]);
  const start={x:-6.3041005907385355,z:.1246035444312086},goal={x:-6,z:-1.7},radius=.8872468056012675;
  assert.equal(world.segment(start,goal,radius,'a'),false);
  world.add('a',start,radius);simulate(world,new Map([['a',goal]]),5);
  assert.ok(world.agents.get('a').arrived);assert.equal(world.inspect().overlapFrames,0);
});
