import {createRenderer,videoFrames} from './renderer.js?v=b1';
import {WorkerDetector} from './detection.js?v=b1';
import {Director} from './director.mjs?v=b1';
const $=id=>document.getElementById(id),q=new URLSearchParams(location.search);
const idle=$('idle'),battle=$('battle'),camera=$('camera'),director=new Director();
const renderer=createRenderer($('canvas'),{forceCPU:q.get('cpu')==='1',onFallback:()=>message('화면 합성을 가벼운 방식으로 바꿨어요.')});
const clocks=new Map([idle,battle,camera].map(v=>[v,videoFrames(v)]));
let source=idle,started=false,detector=null,stream=null,detectTimer=null,detectBusy=false,raf=0,stopped=false,manual=false,force=false,cameraStarting=false,cameraEpoch=0,wakeLock=null;
let renderCount=0,officeFrames=0,renderWindow=performance.now(),fps=0,detectCount=0,detectMs=0,firstResponseMs=null,startAt=performance.now(),readyMs=null;
let activeTime=0,lastTick=performance.now(),detectorState='꺼짐',failureCount=0;
const telemetry={version:'20261123-b1',errors:[],samples:[],switches:0};
const labels={idle:'평소 · 일하기',prepare:'깜짝 · 장난감 챙기기',attack:'씨앗 던지기 · 총 · 바주카',retreat:'함께 숨기',hidden:'숨어서 기다리기',return:'빼꼼 · 자리로 돌아가기'};
function message(text){$('message').textContent=text;}
function error(e){const text=String(e?.message||e);telemetry.errors.push({at:performance.now(),message:text});if(telemetry.errors.length>30)telemetry.errors.shift();message(text);}
function loaded(video){return video.readyState>=2?Promise.resolve():new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);video.removeEventListener('loadeddata',ok);video.removeEventListener('error',bad);};const ok=()=>{done();resolve();},bad=()=>{done();reject(new Error('장면을 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.'));};const timer=setTimeout(bad,45000);video.addEventListener('loadeddata',ok,{once:true});video.addEventListener('error',bad,{once:true});});}
function play(v){return v.play().catch(e=>{error(new Error('재생을 시작하려면 화면을 한 번 눌러 주세요.'));$('welcome').style.display='grid';throw e;});}
const ready=Promise.all([loaded(idle),loaded(battle)]).then(()=>{readyMs=performance.now()-startAt;$('loading').textContent='친구들이 준비됐어요';renderer.key(idle);renderer.render(null,false);}).catch(e=>{error(e);throw e;});
function switchSource(v){source=v;force=true;clocks.get(v).reset();telemetry.switches++;}
function tick(now){
  if(stopped)return;raf=requestAnimationFrame(tick);
  if(document.hidden || !started){lastTick=now;return;}
  activeTime+=Math.min(1000,now-lastTick);lastTick=now;
  const action=director.update(now,battle.currentTime,battle.ended);
  if(action==='start'){
    battle.currentTime=0;switchSource(battle);play(battle).then(()=>{idle.pause();}).catch(()=>{});
  }else if(action==='hold'){battle.pause();}
  else if(action==='resume'){play(battle).catch(()=>{});}
  else if(action==='idle'){
    idle.currentTime=0;switchSource(idle);play(idle).catch(()=>{});battle.pause();manual=false;
  }
  const officeChanged=clocks.get(source).take()||force,cameraChanged=clocks.get(camera).take();
  if(source.readyState>=2 && (officeChanged||cameraChanged)){
    if(officeChanged){renderer.key(source);officeFrames++;if(source===battle && firstResponseMs===null)firstResponseMs=now-director.reactionAt;}
    const progress=source===battle?Math.max(0,Math.min(1,(battle.currentTime-5)/12)):0;
    renderer.damage(battle.currentTime>21 && source===battle?progress*Math.max(0,(23-battle.currentTime)/2):progress);
    renderer.render(camera,cameraChanged);force=false;renderCount++;
  }
  if(now-renderWindow>=1000){
    fps=renderCount*1000/(now-renderWindow);renderCount=0;renderWindow=now;
    const quality=source.getVideoPlaybackQuality?.();
    const sample={wallMs:now-startAt,activeMs:activeTime,state:director.state,fps:+fps.toFixed(1),officeFrames,decoded:quality?.totalVideoFrames,dropped:quality?.droppedVideoFrames,heapMB:performance.memory?+(performance.memory.usedJSHeapSize/1048576).toFixed(1):null};
    telemetry.samples.push(sample);if(telemetry.samples.length>7500)telemetry.samples.shift();
    if(!$('debug').hidden)$('stats').textContent=`${labels[director.state]}\n${renderer.mode} · ${renderer.width}×${renderer.height}\n합성 ${fps.toFixed(1)} FPS · 영상 30fps\n새 사무실 프레임 ${officeFrames}\n감지 ${detectorState} · ${detectMs.toFixed(1)} ms\n감지→첫 영상 ${firstResponseMs===null?'—':firstResponseMs.toFixed(1)+' ms'}\n손님 ${director.present?'있음':'없음'}\n누락 ${quality?.droppedVideoFrames??'—'} / ${quality?.totalVideoFrames??'—'}\n메모리 ${sample.heapMB??'—'} MB\n가동 ${(activeTime/60000).toFixed(1)}분`;
  }
}
async function detectTick(){
  if(stopped)return;
  if(detectBusy||document.hidden||!detector||camera.readyState<2){detectTimer=setTimeout(detectTick,145);return;}
  detectBusy=true;const begin=performance.now();
  try{
    const result=await detector.detect(camera,{timestamp:performance.now(),confidence:.3,crop:false,body:false});
    if(result){const ratio=Math.max(0,...result.faces.map(d=>(d.boundingBox?.width||0)/(camera.videoWidth||1)));if(!manual)director.observe(ratio>=.15,performance.now());detectMs=result.faceMs;detectCount++;failureCount=0;}
  }catch(e){failureCount++;if(failureCount>=3){detector?.close();detector=null;detectorState='오류';director.leave(performance.now());message('감지가 멈췄어요. 새로고침하면 다시 시작할 수 있어요.');}}
  finally{detectBusy=false;if(!stopped)detectTimer=setTimeout(detectTick,Math.max(0,143-(performance.now()-begin)));}
}
async function enableCamera(){
  if(cameraStarting||stream)return;cameraStarting=true;const epoch=++cameraEpoch;
  try{
    const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:30}}});
    if(stopped||epoch!==cameraEpoch){acquired.getTracks().forEach(t=>t.stop());return;}
    stream=acquired;
    camera.srcObject=stream;await camera.play();
    if(epoch!==cameraEpoch)return;
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
    detector=new WorkerDetector();detectorState='준비 중';
    const info=await detector.init({forceCPU:ios,confidence:.3,wasmBase:'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm',faceURL:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',bodyScore:.25});
    if(epoch!==cameraEpoch)return;
    detectorState=info.faceDelegate;detectTick();message('');
  }catch(e){if(epoch===cameraEpoch){cameraOff();message(e.name==='NotAllowedError'?'카메라가 허용되지 않았어요. 카메라 없이 장면을 보거나, 브라우저에서 허용한 뒤 다시 시작할 수 있어요.':'카메라 감지를 시작하지 못했어요. 카메라 없이 장면을 볼 수 있어요.');$('debug').hidden=false;}}
  finally{cameraStarting=false;}
}
function cameraOff(){cameraEpoch++;clearTimeout(detectTimer);detector?.close();detector=null;detectorState='꺼짐';stream?.getTracks().forEach(t=>t.stop());stream=null;camera.srcObject=null;director.leave(performance.now());force=true;}
async function keepAwake(){if(navigator.wakeLock&&!wakeLock&&!document.hidden)try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});}catch{/* Unsupported or denied: video still plays. */}}
async function start(useCamera){
  if(started)return;
  $('start').disabled=$('preview').disabled=true;
  try{await ready;await play(idle);started=true;stopped=false;lastTick=performance.now();$('welcome').style.display='none';keepAwake();if(useCamera)await enableCamera();else message('카메라 없이 보는 장면 미리보기예요.');}
  catch(e){$('start').disabled=$('preview').disabled=false;error(e);}
}
$('start').onclick=()=>start(true);$('preview').onclick=()=>start(false);
$('trigger').onclick=()=>{manual=true;if(director.state==='idle')firstResponseMs=null;director.trigger(performance.now());};
$('leave').onclick=()=>{manual=true;director.leave(performance.now());};$('cameraOff').onclick=cameraOff;
$('cameraOn').onclick=async()=>{if(!started)await start(false);if(!stream){manual=false;await enableCamera();}};
$('download').onclick=()=>{
  const payload={diagnostics:window.__pilot.diagnostics,telemetry,device:{userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],pixelRatio:devicePixelRatio},cameraImagesIncluded:false};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='jg-render-b-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
let taps=[];$('corner').onclick=()=>{const now=performance.now();taps=taps.filter(t=>now-t<1800);taps.push(now);if(taps.length>=5){$('debug').hidden=!$('debug').hidden;taps=[];}};
if(q.get('debug')==='1')$('debug').hidden=false;
document.addEventListener('visibilitychange',()=>{lastTick=renderWindow=performance.now();renderCount=0;if(document.hidden){idle.pause();battle.pause();clearTimeout(detectTimer);}else if(started){force=true;keepAwake();play(source).then(()=>{if(director.state==='hidden')battle.pause();}).catch(()=>{});if(detector)detectTick();}});
function dispose(){stopped=true;cancelAnimationFrame(raf);cameraOff();wakeLock?.release().catch(()=>{});for(const v of [idle,battle]){v.pause();clocks.get(v).stop();}clocks.get(camera).stop();renderer.dispose();}
window.addEventListener('pagehide',dispose,{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
window.__pilot={director,telemetry,renderer,start,cameraOff,get diagnostics(){return {state:director.state,present:director.present,source:source.id,time:source.currentTime,fps,officeFrames,detectCount,detectMs,firstResponseMs,readyMs,wallMs:performance.now()-startAt,activeTime,video:[source.videoWidth,source.videoHeight],camera:!!stream,transitions:director.transitions,errors:telemetry.errors};},trigger(){manual=true;if(director.state==='idle')firstResponseMs=null;director.trigger(performance.now());},leave(){manual=true;director.leave(performance.now());},dispose};
raf=requestAnimationFrame(tick);
if(q.get('demo')==='1')ready.then(()=>start(false)).catch(()=>{});
