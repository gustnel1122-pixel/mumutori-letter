import {test} from 'node:test';import assert from 'node:assert/strict';
import {WorkerDetector} from '../detection.js';import {videoFrames,createRenderer} from '../renderer.js';
test('one detection frame in flight; every transferred bitmap closes on success and failure',async()=>{
  const previousWorker=global.Worker,previousBitmap=global.createImageBitmap;let worker,release;
  const bitmaps=[];
  global.Worker=class{constructor(){worker=this;}postMessage(m){this.id=m.id;}terminate(){this.closed=true;}reply(){this.onmessage({data:{id:this.id,result:{faces:[]}}});}};
  global.createImageBitmap=()=>new Promise(resolve=>{release=()=>{const b={close(){this.closed=true;}};bitmaps.push(b);resolve(b);};});
  try{const client=new WorkerDetector();const pending=client.detect({},{});assert.equal(await client.detect({},{}),null);release();await new Promise(setImmediate);worker.reply();await pending;assert.equal(bitmaps[0].closed,true);
    const failure=client.detect({},{});release();await new Promise(setImmediate);worker.onerror({preventDefault(){},message:'lost'});await assert.rejects(failure,/lost/);assert.equal(bitmaps[1].closed,true);assert.equal(client.pending.size,0);
  }finally{global.Worker=previousWorker;global.createImageBitmap=previousBitmap;}
});
test('holding a hidden video never reprocesses an unchanged frame',()=>{
  let cb,cancel;const listeners={};const video={readyState:4,requestVideoFrameCallback:f=>(cb=f,123),cancelVideoFrameCallback:id=>cancel=id,addEventListener:(e,f)=>listeners[e]=f,removeEventListener:e=>delete listeners[e]};
  const frames=videoFrames(video);assert.equal(frames.take(),true);for(let i=0;i<500;i++)assert.equal(frames.take(),false);cb();assert.equal(frames.take(),true);frames.stop();assert.equal(cancel,123);assert.equal(Object.keys(listeners).length,0);
});
test('CPU keying retains canonical green peas and removes only the strong green key',()=>{
  const previous=global.document;let result;
  const pixels=[182,210,92,255,0,255,0,255,100,200,100,255];
  const context={fillRect(){},drawImage(){},save(){},restore(){},translate(){},scale(){}};
  global.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(pixels)}),putImageData:x=>result=x})})};
  try{const canvas={width:1920,height:1080,getContext:()=>context,addEventListener(){}};const r=createRenderer(canvas,{forceCPU:true});r.key({});r.render(null,false);assert.equal(result.data[3],255);assert.equal(result.data[7],0);assert.equal(result.data[11],170);r.dispose();}finally{global.document=previous;}
});
