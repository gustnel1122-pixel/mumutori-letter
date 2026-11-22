const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname,'../jg/fast');

test('worker client keeps one image in flight and closes each bitmap', async () => {
  const previousWorker = global.Worker, previousBitmap = global.createImageBitmap;
  const frames=[];
  let worker,resolveBitmap;
  global.Worker=class {
    constructor(){worker=this;this.messages=[];}
    postMessage(message,transfer){this.messages.push({message,transfer});}
    terminate(){this.terminated=true;}
    reply(result){const id=this.messages.at(-1).message.id;this.onmessage({data:{id,result}});}
  };
  global.createImageBitmap=()=>new Promise(resolve=>{resolveBitmap=()=>{const frame={close(){this.closed=true;}};frames.push(frame);resolve(frame);};});
  try {
    const {WorkerDetector}=await import(pathToFileURL(path.join(root,'detection.js')));
    const client=new WorkerDetector();
    const result=client.detect({}, {timestamp:100,confidence:.3});
    assert.equal(await client.detect({}, {timestamp:101}), null);
    resolveBitmap();await new Promise(setImmediate);
    assert.equal(worker.messages.length,1);
    assert.equal(worker.messages[0].transfer[0],frames[0]);
    worker.reply({faces:[]});
    assert.deepEqual(await result,{faces:[]});
    assert.equal(frames[0].closed,true);
    const failed=client.detect({}, {timestamp:200});
    resolveBitmap();await new Promise(setImmediate);
    worker.onerror({preventDefault(){},message:'lost'});
    await assert.rejects(failed,/lost/);
    assert.equal(frames[1].closed,true);
    assert.equal(client.pending.size,0);
    assert.equal(worker.terminated,true);
    client.close();
  } finally {global.Worker=previousWorker;global.createImageBitmap=previousBitmap;}
});

test('new-frame fallback reuses a paused frame and resets for a source change', async () => {
  const {videoFrames}=await import(pathToFileURL(path.join(root,'renderer.js')));
  const events={};
  const video={readyState:4,currentTime:0,addEventListener:(e,f)=>events[e]=f,removeEventListener:e=>delete events[e]};
  const frames=videoFrames(video);
  assert.equal(frames.take(),true);assert.equal(frames.take(),false);
  video.currentTime=1/24;assert.equal(frames.take(),true);assert.equal(frames.take(),false);
  events.emptied();video.readyState=0;assert.equal(frames.take(),false);
  video.readyState=4;assert.equal(frames.take(),true);frames.stop();assert.equal(Object.keys(events).length,0);
});

test('video callback keys once per delivered frame and cancels on stop', async () => {
  const {videoFrames}=await import(pathToFileURL(path.join(root,'renderer.js')));
  let callback,cancelled;
  const video={readyState:4,requestVideoFrameCallback:f=>{callback=f;return 17;},cancelVideoFrameCallback:id=>{cancelled=id;},addEventListener(){},removeEventListener(){}};
  const frames=videoFrames(video);
  assert.equal(frames.take(),true);assert.equal(frames.take(),false);
  callback(42,{mediaTime:.04});assert.equal(frames.take(),true);assert.equal(frames.take(),false);
  frames.stop();assert.equal(cancelled,17);
});

test('changing idle to reaction re-arms the video callback and invalidates the cached frame', async () => {
  const {videoFrames}=await import(pathToFileURL(path.join(root,'renderer.js')));
  const events={};let serial=0,cancelled=[];
  const video={readyState:4,requestVideoFrameCallback:()=>++serial,cancelVideoFrameCallback:id=>cancelled.push(id),
    addEventListener:(e,f)=>events[e]=f,removeEventListener(){}};
  const frames=videoFrames(video);
  frames.take();assert.equal(frames.take(),false);
  video.readyState=0;events.emptied();assert.equal(frames.take(),false);
  assert.deepEqual(cancelled,[1]);assert.equal(serial,2);
  video.readyState=4;events.loadeddata();assert.equal(frames.take(),true);assert.equal(frames.take(),false);
  assert.deepEqual(cancelled,[1,2]);assert.equal(serial,3);frames.stop();
});

test('worker forces CPU for iPad, maps crop boxes, closes frames after success and failure', async () => {
  const delegates=[],requests=[],replies=[];
  let draw,shouldFail=false;
  const model={setOptions:async()=>{},detectForVideo(){if(shouldFail)throw new Error('inference failed');return {detections:[{boundingBox:{originX:10,originY:20,width:30,height:40}}]};}};
  const context={
    importScripts(){},Promise,performance:{now:()=>20},
    OffscreenCanvas:class {constructor(w,h){this.width=w;this.height=h;}getContext(){return {drawImage(...args){draw=args;}};}},
    Vision:{FilesetResolver:{forVisionTasks:async()=>({})},FaceDetector:{async createFromOptions(_,o){delegates.push(o.baseOptions.delegate);requests.push(o);return model;}}},
    self:{postMessage:r=>replies.push(r)},
  };
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'detect-worker.js'),'utf8'),context);
  async function send(data){context.self.onmessage({data});await vm.runInContext('chain',context);return replies.at(-1);}
  await send({id:1,type:'init',options:{forceCPU:true,confidence:.3}});
  assert.deepEqual(delegates,['CPU']);assert.equal(requests[0].runningMode,'VIDEO');
  const frame={width:640,height:480,close(){this.closed=true;}};
  const result=await send({id:2,type:'detect',bitmap:frame,crop:true,timestamp:100,confidence:.3});
  const box=result.result.faces[0].boundingBox;
  assert.equal(box.originX,138);assert.equal(box.originY,116);assert.equal(box.width,30);
  assert.equal(draw[1],128);assert.equal(draw[2],96);assert.equal(frame.closed,true);
  shouldFail=true;
  const failedFrame={...frame,closed:false};
  const failed=await send({id:3,type:'detect',bitmap:failedFrame,timestamp:200,confidence:.3});
  assert.match(failed.error,/inference failed/);assert.equal(failedFrame.closed,true);
});

test('worker tries GPU first and falls back to CPU', async () => {
  const delegates=[],replies=[];
  const context={importScripts(){},Promise,performance,
    OffscreenCanvas:class{getContext(){return {}; }},
    Vision:{FilesetResolver:{forVisionTasks:async()=>({})},FaceDetector:{async createFromOptions(_,o){delegates.push(o.baseOptions.delegate);if(o.baseOptions.delegate==='GPU')throw new Error('no GPU');return {};}}},
    self:{postMessage:r=>replies.push(r)},
  };
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'detect-worker.js'),'utf8'),context);
  context.self.onmessage({data:{id:1,type:'init',options:{forceCPU:false,confidence:.3}}});await vm.runInContext('chain',context);
  assert.deepEqual(delegates,['GPU','CPU']);assert.equal(replies[0].result.faceDelegate,'CPU');
});

test('missing WebGL automatically selects half-resolution CPU keying with the live alpha and spill rules', async () => {
  const previousDocument=global.document;
  const input=[100,140,100,255,100,195,100,255,100,160,100,255];
  let keyedImage,keySize,replacement;
  const ctx={fillRect(){},drawImage(){},save(){},restore(){},translate(){},scale(){}};
  global.document={createElement(){const c={width:0,height:0,getContext(){return {
    drawImage(){},getImageData(){return {data:new Uint8ClampedArray(input)};},
    putImageData(frame){keyedImage=frame;keySize=[c.width,c.height];},
  };}};return c;}};
  const canvas={width:1280,height:720,getContext:()=>null,addEventListener(){},
    cloneNode(){return {width:1280,height:720,getContext:()=>ctx};},replaceWith(c){replacement=c;}};
  try{
    const {createRenderer}=await import(pathToFileURL(path.join(root,'renderer.js')));
    const renderer=createRenderer(canvas);
    assert.equal(renderer.mode,'CPU (640×360)');assert.equal(renderer.canvas,replacement);
    renderer.key({});renderer.render(null,false);
    assert.deepEqual(keySize,[640,360]);
    assert.deepEqual([...keyedImage.data],[100,140,100,255,100,115,100,0,100,115,100,162]);
  }finally{global.document=previousDocument;}
});
