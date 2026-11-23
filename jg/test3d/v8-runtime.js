import * as THREE from 'three';
import {SceneDirector,AdaptiveQuality,SCENES,ATTACK_SECONDS,ENCOUNTER_SECONDS} from './v8-director.js?v=20261123-8e';
import {createEmotionRig,EMOTIONS} from './v8-emotions.js?v=20261123-8e';
import {furnishOffice,makePeaGun,makeAcornBazooka} from './v8-office.js?v=20261123-8e';
import {WindowMess,SeedProjectiles} from './v8-effects.js?v=20261123-8e';
import {createRenderPipeline} from './v8-render.js?v=20261123-8e';
import {gradeMaterial} from './v8-lighting.js?v=20261123-8e';
import {MotionWorld} from './v8-motion.js?v=20261123-8e';

const smooth=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
const clamp=THREE.MathUtils.clamp;
// 0010: 무기를 몸 바깥 손 위치에 둔다. v8f 의 (.40,.38,.30) 은 몸 안쪽이라 총대가 몸을 뚫었다.
// 실제 몸 반지름은 친구마다 다르므로 prepareActor 에서 잰 값으로 바깥쪽으로 더 민다.
const hand=new THREE.Vector3(.40,.38,.30);
function handOffset(a){return a.handLocal||hand;}
export function createV8(config){
  const {scene,renderer,camera,dirLight,windowZ,windowWidth,windowHeight,windowBottom,getActors,bazookaGroup,resize,resetActors}=config;
  const office=furnishOffice(config),director=new SceneDirector(),quality=new AdaptiveQuality(),pipeline=createRenderPipeline(renderer,scene,camera);
  const motion=new MotionWorld();let furnitureObstacles=[];
  const actorScale=config.actorScale || 1,propScale=actorScale*.75;
  const mess=new WindowMess(scene,{width:windowWidth,height:windowHeight,z:windowZ,bottom:windowBottom});
  const projectiles=new SeedProjectiles(scene,(point,kind)=>mess.impact(point,kind),Math.sqrt(actorScale));
  const mounts=[bazookaGroup,new THREE.Group()];scene.add(mounts[1]);
  // 두 바주카는 각자 주인(병아리·쌀)이 가지러 간다. 세워 두는 곳은 화면에서 친구와
  // 겹쳐 보이지 않는 양쪽 끝 빈자리로 둔다 — v8f 에서는 쌀 바로 뒤에 서 있어서
  // 쌀이 바주카를 안고 있는 것처럼 보였다(2206 총괄 지적 ②).
  const spots=config.launcherSpots||{parked:[[-8,3.1],[0,-6.2]],deployed:[[-8,-.8],[0,-6.8]]};
  const GROUND_Y=propScale*.5;                      // 바퀴가 바닥에 닿는 높이
  const parked=spots.parked.map(([x,z])=>new THREE.Vector3(x,GROUND_Y,z));
  const deployed=spots.deployed.map(([x,z])=>new THREE.Vector3(x,GROUND_Y,z));
  const operators=['byeongari','ssal'];
  // P7 — 일곱이 똑같이 반응하지 않도록 사람마다 늦게 반응하는 시간(초).
  const PANIC_LAG=[0,.08,.13,.21,.28,.36,.45];
  // P19 — 집어 던지는 물건 네 가지를 번갈아(씨앗·서류·머그·지우개 모양).
  const THROW_SHAPES=[0,1,2,1];
  const flashMaterial=new THREE.MeshBasicMaterial({color:0xffe48b,transparent:true,opacity:.9});
  mounts.forEach((g,i)=>{
    g.clear();g.add(makeAcornBazooka());g.scale.setScalar(propScale);g.position.copy(parked[i]);g.userData.isLauncher=true;
    g.lookAt(new THREE.Vector3(i?2:-2,2.4,windowZ));
    // These launchers are wheeled toys, pushed into place by visible operators.
    for(const x of [-.25,.25])for(const z of [-.32,.32]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.08,16),gradeMaterial(new THREE.MeshLambertMaterial({color:0x80542f})));
      wheel.rotation.z=Math.PI/2;wheel.position.set(x,-.42,z);g.add(wheel);
    }
    const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.16),flashMaterial);flash.position.z=.53;flash.visible=false;g.add(flash);
    g.userData.flash=flash;g.userData.fireAt=0;g.userData.flashUntil=0;g.userData.restRotation=g.rotation.clone();
  });
  let frame=director.snapshot(),lastScene='work',emotionOverride=null,lastTime=0,lastFPS=0,lastCompleted=null,qualityChanges=[],testLevel=null;
  const phaseEvents=[],pickupEvents=[];
  function applyQuality(){const q=quality.current;office.quality(q);resize();pipeline.quality(q);qualityChanges.push({time:performance.now(),quality:q.id,pixelRatio:renderer.getPixelRatio()});}
  applyQuality();
  document.addEventListener('visibilitychange',()=>quality.resetSamples());
  const profile={dotori:{hop:.14,tilt:.08,pace:1},bam:{hop:.07,tilt:-.16,pace:.78},ddangkong:{hop:.06,tilt:.13,pace:1.15},
    byeongari:{hop:.20,tilt:-.1,pace:1.3},wandukong3:{hop:.13,tilt:.08,pace:1.5},haebaragi:{hop:.015,tilt:.02,pace:.45},ssal:{hop:.09,tilt:-.09,pace:.9}};
  // P17·P18 — 허겁지겁이라 잘 못 맞힌다. 10번에 4번은 일부러 빗나간다.
  function panicAim(i,kind,a){
    const aim=target(i,kind);
    if(kind!=='throw')return aim;
    const r=Math.random();
    if(r<.15)aim.y=windowBottom+windowHeight*(1.02+Math.random()*.12);       // 천장 쪽으로 넘김
    else if(r<.30)aim.y=windowBottom+windowHeight*(Math.random()*.10);        // 바닥 쪽으로 처짐
    else if(r<.40){                                                           // 옆 친구 머리 위로
      const other=getActors()[(i+1+Math.floor(Math.random()*2))%getActors().length];
      if(other){aim.x=other.wrapper.position.x;aim.y=windowBottom+windowHeight*.22;}
    }
    const spread=Math.tan(.384);                                              // ±22°
    aim.x+=(Math.random()-.5)*2*spread*Math.abs(windowZ-a.wrapper.position.z);
    aim.y+=(Math.random()-.5)*2*Math.tan(.262)*Math.abs(windowZ-a.wrapper.position.z);  // ±15°
    aim.x=clamp(aim.x,-windowWidth/2+.5,windowWidth/2-.5);
    aim.y=clamp(aim.y,windowBottom+.12,windowBottom+windowHeight-.12);
    return aim;
  }
  function target(i,kind){
    const spread=kind==='bazooka'?1.7:windowWidth/2-.65;
    return new THREE.Vector3(clamp((Math.random()-.5)*spread*2+(kind==='bazooka'?(i?-2.2:2.2):0),-windowWidth/2+.6,windowWidth/2-.6),windowBottom+.75+Math.random()*(windowHeight-1.25),windowZ+.05);
  }
  function prepareActor(a){
    office.upgradeTree(a.model);a.emotionRig=createEmotionRig(a);a.fireIndex=['dotori','bam','ddangkong','byeongari','wandukong3','ssal'].indexOf(a.key);
    a.nextShot=0;a.flashUntil=0;a.held=false;a.pickupLogged=false;a.weapon=null;a.equipment=null;
    // Small equipment boxes share the desk footprint; they do not wall off
    // the walking aisles behind the seven workstations.
    // v8g: 책상이 친구 '앞'으로 바뀌었다 — 장비 상자도 그 책상 왼쪽 위에 놓는다.
    const deskScale=config.deskScale||1,face=new THREE.Vector3(Math.sin(a.deskYaw),0,Math.cos(a.deskYaw));
    const left=new THREE.Vector3(face.z,0,-face.x);
    if(config.seated===false){   // ?ver=f 되돌리기 — v8f 자리 그대로
      a.cratePosition=a.homePos.clone().add(new THREE.Vector3(Math.cos(a.deskYaw)*1.6,deskScale*.42,Math.cos(a.deskYaw)*.3));
      a.pickupPosition=a.homePos.clone().add(new THREE.Vector3(0,0,.25));
    }else{
      a.cratePosition=a.homePos.clone()
        .addScaledVector(face,1.12*deskScale).addScaledVector(left,.42*deskScale);
      a.cratePosition.y=.42*deskScale;
      a.pickupPosition=a.homePos.clone().addScaledVector(face,.30);
    }
    a.weaponRest=a.cratePosition.clone().add(new THREE.Vector3(0,.35,0));
    // 0010: 숨을 때·빼꼼할 때도 화면에서 서로 겹치지 않게 칸을 나눈다(2바퀴 검토 escape·peek·recover).
    // 책장 뒤(왼쪽 -11.9~-6.6 · 오른쪽 6.6~10.0) 안에서 x 를 벌리고 깊이를 번갈아 둔다.
    // 책장(z -3.93~-3.08) 뒤 한 줄로 숨는다. **지나가는 순서(traffic)대로 먼 자리부터** 줘야
    // 먼저 도착한 친구가 뒤에 오는 친구의 길을 막지 않는다(막히면 길 찾기가 영영 돌았다).
    // 같은 깊이에 x 만 벌려 화면에서도 서로 겹치지 않는다.
    const covers={ddangkong:[-11.6,-5.0],byeongari:[-9.9,-5.0],dotori:[-8.2,-5.0],bam:[-6.6,-5.0],
                  ssal:[11.2,-5.0],haebaragi:[9.1,-5.0],wandukong3:[6.9,-5.0]};
    a.cover=new THREE.Vector3(covers[a.key][0],0,covers[a.key][1]);
    // 빼꼼은 제자리에서 앞으로만 나온다 — 옆으로 몰리면 서로 가린다.
    a.coverPeek=a.cover.clone();a.coverPeek.x+=a.cover.x<0?1.9:-1.9;a.coverPeek.z+=1.05;
    const crate=office.assets.model('cardboardBoxOpen',[.65,.35,.55]);
    if(crate){crate.position.copy(a.cratePosition);crate.userData.ownerKey=a.key;scene.add(crate);a.crate=crate;}
    const item=a.def.canThrow?makePeaGun():office.assets.model('cardboardBoxClosed',[.18,.16,.14]);
    if(item){
      item.scale.multiplyScalar(a.def.canThrow?actorScale*1.35:actorScale);scene.add(item);a.equipment=item;
      if(a.def.canThrow){a.weapon=item;const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.055),flashMaterial);flash.position.z=.25;flash.visible=false;item.add(flash);a.muzzleFlash=flash;}
      item.position.copy(a.weaponRest);
    }
    a.wrapper.updateMatrixWorld(true);let radius=0;
    const vertex=new THREE.Vector3();
    a.model.traverse(o=>{if(!o.isMesh || !/^(Body|Cap|CapLine|Leaf|Stem)$/.test(o.name))return;
      const p=o.geometry.attributes.position;
      for(let i=0;i<p.count;i++){vertex.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);radius=Math.max(radius,Math.hypot(vertex.x-a.homePos.x,vertex.z-a.homePos.z));}
    });
    a.bodyRadius=radius+.045;a.facing=a.deskYaw||0;a.motionGoal=a.homePos.clone();
    a.paceMul=.85+Math.random()*.40;           // P24 친구마다 걷는 빠르기가 다르다
    // 손은 몸 반지름 바깥(+10%)에 둔다 — visualRoot 안 좌표라 actorScale 로 나눠 준다.
    // 총대가 몸을 뚫지 않도록 손을 몸 반지름 바깥으로 충분히 뺀다(3바퀴 불통 '몸 관통').
    // 0224 P20 — 몸을 뚫지도, 멀리 떠 있지도 않게: 몸 반지름 **바로 바깥 0.02**.
    const reach=(a.bodyRadius/(config.actorScale||1))+.02/(config.actorScale||1);
    a.handLocal=new THREE.Vector3(reach*.62,.40,reach*.70);
    motion.add(a.key,a.homePos,a.bodyRadius);
    for(const root of [a.wrapper,a.equipment])root?.traverse(o=>{for(const material of [o.material].flat())if(material)gradeMaterial(material);});
  }
  function rebuildWorld(){
    office.rebuild(scene.children.filter(o=>o.userData.isDesk),getActors().map(a=>a.crate).filter(Boolean));
    furnitureObstacles=office.obstacles;motion.clear();motion.setObstacles(furnitureObstacles);
    for(const a of getActors())motion.add(a.key,a.homePos,a.bodyRadius);
  }
  function resetEquipment(){
    getActors().forEach(a=>{a.held=false;a.pickupLogged=false;a.pickupDwell=0;a.pickupBlend=0;a.wrapper.visible=true;if(a.equipment){a.equipment.position.copy(a.weaponRest);a.equipment.visible=true;a.equipment.rotation.set(0,0,0);}if(a.muzzleFlash)a.muzzleFlash.visible=false;});
    // 4바퀴 ④ — 처음 자리·각도·높이를 그대로 되돌린다(화분에 박히거나 뜨지 않게).
    mounts.forEach((g,i)=>{g.position.copy(parked[i]);g.rotation.copy(g.userData.restRotation);
      g.userData.flash.visible=false;g.userData.fetched=false;});
  }
  function changeScene(id){
    if(id===lastScene)return;lastScene=id;
    const event={id,elapsed:director.elapsed,time:lastTime};phaseEvents.push(event);if(phaseEvents.length>80)phaseEvents.shift();
    if(id==='notice'){
      emotionOverride=null;mess.reset();projectiles.reset();resetActors();resetEquipment();pickupEvents.length=0;
      getActors().forEach((a,i)=>{a.nextShot=lastTime+i*.1;a.flashUntil=0;});
    }
    if(['throw','gun','bazooka'].includes(id)){getActors().forEach((a,i)=>a.nextShot=lastTime+i*.12);mounts.forEach((g,i)=>g.userData.fireAt=lastTime+i*.45);}
    if(id==='escape')getActors().forEach(a=>{a.escapeFrom=a.wrapper.position.clone();a.dropPosition=a.equipment?.position.clone();a.held=false;});
    if(id==='recover')getActors().forEach(a=>a.recoverFrom=a.wrapper.position.clone());
    if(id==='work'){
      lastCompleted={hits:mess.hits,byKind:{...mess.byKind},shots:{...projectiles.shots},peakProjectiles:projectiles.peak,pickups:[...pickupEvents]};
      mess.reset();projectiles.reset();resetActors();resetEquipment();
    }
    window.dispatchEvent(new CustomEvent('jg-v8-scene',{detail:event}));
  }
  function update(dt,t,rawDt,level,now){
    lastTime=now;if(getActors().length && quality.sample(rawDt))applyQuality();
    const loaded=getActors().length>0;
    // The encounter clock waits at the end of travel phases. A collision-safe
    // detour must finish before hiding/resting is announced.
    const travelling=['escape','recover'].includes(frame.id) && frame.progress>.90;
    const equipWaiting=frame.id==='equip' && frame.progress>.90 && getActors().some(a=>{
      const p=motion.agents.get(a.key)?.position,want=operators.includes(a.key)?a.homePos:battleStation(a);
      return !a.held || !p || Math.hypot(p.x-want.x,p.z-want.z)>.25;
    });
    const fetchWaiting=frame.id==='fetch' && frame.progress>.4 && mounts.some((g,i)=>getActors().some(a=>a.key===operators[i]) && !g.userData.fetched);
    const firingWaiting=frame.id==='fetch' && frame.progress>.9 && operators.some((key,i)=>{const p=motion.agents.get(key)?.position;return p && Math.hypot(p.x-deployed[i].x,p.z-deployed[i].z-1.8)>.15;});
    // 0224: 기다림에는 **한계 시간**을 둔다. 한 명이 길이 막혀 못 가면 장면이 영영 안 넘어가
    // 손님 화면이 '도망' 에서 멈춘다(영상·캡처에서 실제로 그렇게 됐다).
    const stuckLimit=frame.age>4.5;
    const waiting=!stuckLimit && (equipWaiting || fetchWaiting || firingWaiting || travelling && getActors().some(a=>{
      const p=motion.agents.get(a.key)?.position,target=frame.id==='escape'?a.cover:a.homePos;
      return !p || Math.hypot(p.x-target.x,p.z-target.z)>.40;
    }));
    frame=director.update(loaded && !waiting?dt:0,loaded?(testLevel??level):0);changeScene(frame.id);mess.fade(frame.id==='recover'?frame.clean:0);
    const badge=document.getElementById('sceneBadge');if(badge){badge.textContent=frame.label || '';badge.style.display=frame.active?'block':'none';}
    const emotionChoice=document.getElementById('emotionPreview');if(emotionChoice){emotionChoice.disabled=frame.active;if(frame.active)emotionChoice.value='';}
    const debug=document.getElementById('dbgQuality');if(debug)debug.textContent=quality.current.id+' · '+renderer.getPixelRatio().toFixed(2)+'× · '+(quality.mode==='auto'?'자동': '고정');
    return frame;
  }
  function walk(a,from,to,u,t){
    a.wrapper.position.copy(from).lerp(to,smooth(u));
    const moving=u>0 && u<1;a.wrapper.position.y+=moving?Math.abs(Math.sin(t*14+a.phase))*.08:0;
    a.wrapper.rotation.z=moving?Math.sin(t*14+a.phase)*.055:0;
    a.wrapper.rotation.y=moving?Math.atan2(to.x-from.x,to.z-from.z)*.28:0;
    a.movePhase=moving?'moving':'idle';
  }
  const traffic=[['ddangkong','byeongari','dotori','bam'],['ssal','haebaragi','wandukong3']];
  function turnToMove(a,returning=false){
    const active=new Set(getActors().map(actor=>actor.key));
    const order=traffic.find(group=>group.includes(a.key)).filter(key=>active.has(key));
    if(returning)order.reverse();
    const idx=order.indexOf(a.key);
    if(idx<=0)return true;
    // 0224 P27 — 앞의 '모든' 친구가 다 숨을 때까지 기다리면 뒤 두 명(해바라기씨·쌀)이 아예 안 움직인다.
    // **바로 앞 한 명**만 길을 비우면 출발하고, 그래도 막히면 차례대로 조금씩 늦게 출발한다.
    const ahead=getActors().find(other=>other.key===order[idx-1]);
    const p=ahead&&motion.agents.get(ahead.key)?.position;
    const target=ahead?(returning?ahead.homePos:ahead.cover):null;
    if(p&&target&&Math.hypot(p.x-target.x,p.z-target.z)<.35)return true;
    return frame.age>.55+idx*.30;
  }
  function animateActor(a,dt,t){
    const p=profile[a.key],phase=t*p.pace+a.phase,i=getActors().indexOf(a),id=frame.id;
    a.wrapper.position.copy(a.homePos);a.wrapper.scale.set(1,1,1);a.wrapper.rotation.set(0,0,0);a.wrapper.visible=true;a.cargoMesh.visible=false;
    a.action=id;a.movePhase='idle';a.gunActive=id==='gun' && a.fireIndex%2===(frame.progress<.5?0:1);
    a.motionGoal=a.homePos;
    // v8g: 평소엔 의자에 앉아 있다 — 손님을 보고 일어서는 동안 높이를 서서히 내린다
    // (갑자기 바닥으로 뚝 떨어지지 않게). 감정 미리보기는 평소 장면이라 앉은 채로 둔다.
    a.seatBlend=emotionOverride?1:Math.max(0,(a.seatBlend??1)-dt*3.2);
    if(emotionOverride){a.wrapper.position.y+=(a.seatY||0)*a.seatBlend;a.visualRoot.rotation.set(0,0,0);return;}
    if(id==='notice'){
      // 0224 영상분석 P1·P2·P5·P6·P7 — "너무 놀라서" 가 보이게.
      // 지금까지는 7명이 같은 0.04초에 같은 자세로, 점프 0, 오히려 가라앉기까지 했다.
      const lag=PANIC_LAG[i%PANIC_LAG.length];                 // P7 0.00~0.45초 어긋나게
      const age=Math.max(0,frame.age-lag);
      const up=clamp(age/.12,0,1),down=clamp((age-.12)/.18,0,1);
      const jump=Math.sin(up*Math.PI/2)*(1-down)*.18;          // P1 점프 0 → 0.18
      a.wrapper.position.y=Math.max(0,jump);                   // P2 평소보다 낮아지지 않게
      const rise=up*(1-down);
      a.wrapper.scale.y=1+.25*rise;a.wrapper.scale.x=a.wrapper.scale.z=1-.15*rise;   // P5 늘어남
      if(down>=1){                                             // 착지 뒤 눌림 → 떨림
        const land=clamp((age-.30)/.08,0,1);
        a.wrapper.scale.y=1-.20*(1-land);a.wrapper.scale.x=a.wrapper.scale.z=1+.20*(1-land);
        const shake=clamp(1-(age-.38)/.6,0,1);                 // P6 0.6초 ±0.035 · 9회/초
        a.wrapper.position.x=a.homePos.x+Math.sin(age*Math.PI*2*9+i)*.035*shake;
      }
      a.wrapper.rotation.y=(i%2?1:-1)*Math.sin(up*Math.PI)*.18;
      a.wrapper.rotation.x=-.16*rise;
      a.panic=Math.max(a.panic||0,clamp(age/.1,0,1));          // 눈 크게(P3)·땀방울(P11) 신호
    }else if(id==='equip'){
      // All move within 0.24 seconds; every pickup has a visible bend/reach.
      const age=Math.max(0,frame.age-(i%4)*.1),u=age/4.7;
      // 장비를 챙기고 나면 바로 책상 앞 전투 자리로 나와 선다 — 'ready' 에서야 움직이면
      // 공격 시작 사진에서 아직 책상 뒤에 있다(2바퀴 검토 지적).
      a.motionGoal=a.held?(operators.includes(a.key)?a.homePos:battleStation(a)):a.pickupPosition;
      if(u<.40)walk(a,a.homePos,a.pickupPosition,u/.40,t);
      else if(u<.70){a.wrapper.position.copy(a.pickupPosition);const bend=Math.sin((u-.40)/.30*Math.PI);a.wrapper.rotation.x=-.26*bend;a.wrapper.scale.y=1-.12*bend;}
      else walk(a,a.pickupPosition,a.homePos,(u-.70)/.30,t);
      const physical=motion.agents.get(a.key)?.position;
      if(physical && Math.hypot(physical.x-a.pickupPosition.x,physical.z-a.pickupPosition.z)<.18)a.pickupDwell=(a.pickupDwell || 0)+dt;
      a.pickupBlend=smooth((a.pickupDwell || 0)/.45);a.held=a.pickupBlend>=1;
      if(a.held && !a.pickupLogged){a.pickupLogged=true;pickupEvents.push({key:a.key,kind:a.def.canThrow?'gun':'ammunition',at:frame.elapsed,from:a.weaponRest.toArray(),atActor:[physical.x,0,physical.z]});}
    }else if(['ready','throw','gun','fetch','bazooka','mess'].includes(id)){
      a.held=true;a.wrapper.rotation.x=-.08;a.wrapper.rotation.z=p.tilt*.25;
      if(['throw','gun'].includes(id)){
        // 0224 P14·P15·P22 — 1초에 3번 던지는 몸짓. 팔 뼈대가 있는 친구는 도토리뿐이라
        // 나머지는 "뒤로 젖혔다 앞으로 숙이기 + 찌그러짐" 으로 던지는 동작을 만든다.
        // 한 번에 0.33초: 뒤로 0.12 · 앞으로 0.08 · 돌아오기 0.13.
        const cycle=(t*3+a.phase*.37)%1;
        const back=clamp(cycle/.36,0,1),fwd=clamp((cycle-.36)/.24,0,1),back2=clamp((cycle-.60)/.40,0,1);
        const lean=back<1?-.17*back:(fwd<1?(-.17+.49*fwd):(.32*(1-back2)));   // 뒤 10° → 앞 18°
        a.wrapper.rotation.x=-.08+lean;
        a.wrapper.position.y=Math.max(0,Math.sin(cycle*Math.PI)*.055);
        const snap=fwd<1&&fwd>0?Math.sin(fwd*Math.PI):0;
        a.wrapper.scale.x=a.wrapper.scale.z=1+.12*snap;a.wrapper.scale.y=1-.10*snap;   // P22
        a.wrapper.rotation.z=p.tilt*.25+Math.sin(cycle*Math.PI*2)*.07;
      }
      if(id==='mess')a.wrapper.position.y=Math.abs(Math.sin(phase*4))*p.hop*.5;
      const operator=operators.indexOf(a.key);
      if(operator<0 && ['ready','throw','gun','fetch','bazooka','mess'].includes(id))a.motionGoal=battleStation(a);
      if(operator>=0 && ['fetch','bazooka','mess'].includes(id)){
        const dock=parked[operator].clone().add(new THREE.Vector3(0,-parked[operator].y,1.8));
        const firing=deployed[operator].clone().add(new THREE.Vector3(0,-deployed[operator].y,1.8));
        a.motionGoal=id==='fetch' && !mounts[operator].userData.fetched?dock:firing;
        if(id==='fetch' && frame.progress<.45)walk(a,a.homePos,dock,frame.progress/.45,t);
        else if(id==='fetch')walk(a,dock,firing,(frame.progress-.45)/.55,t);
        else a.wrapper.position.copy(firing);
      }
    }else if(id==='escape'){
      const go=turnToMove(a);a.motionGoal=go?a.cover:a.escapeFrom;
      const u=clamp((frame.age-i*.34)/2.65,0,1);
      walk(a,a.escapeFrom || a.homePos,a.cover,u,t);
      // 0224 P25·P26 — 1초에 6걸음 통통(±0.03) + 앞으로 12° 숙이고 돌 때 안쪽으로 기울기.
      const run=u>0&&u<1?1:0;
      a.wrapper.position.y+=Math.abs(Math.sin(t*Math.PI*7+a.phase))*.03*run;
      a.wrapper.rotation.x=-.21*run-.15*(1-run);
      a.wrapper.rotation.z=(a.cover.x<0?1:-1)*.14*run;
      a.panic=Math.max(a.panic||0,.8);
      const p=motion.agents.get(a.key)?.position,d=p?Math.hypot(p.x-a.cover.x,p.z-a.cover.z):10;
      const crouch=smooth(1-d);a.wrapper.scale.y=1-.55*crouch;a.wrapper.rotation.y=(a.cover.x<0?1:-1)*Math.PI/2*crouch;
    }else if(id==='hide'){
      a.motionGoal=a.cover;
      a.wrapper.position.copy(a.cover);a.wrapper.rotation.x=-.12;a.wrapper.scale.y=.45;a.wrapper.rotation.y=(a.cover.x<0?1:-1)*Math.PI/2;
    }else if(id==='peek'){
      a.motionGoal=frame.age>i*.34?a.coverPeek:a.cover;
      const u=clamp((frame.age-i*.34)/.9,0,1);
      walk(a,a.cover,a.coverPeek,u,t);a.wrapper.scale.y=.8+.2*smooth(u);a.wrapper.rotation.y=(a.cover.x<0?1:-1)*Math.PI/2*(1-smooth(u));a.wrapper.rotation.z=Math.sin(phase*3)*.07;
    }else if(id==='recover'){
      a.motionGoal=turnToMove(a,true)?a.homePos:a.cover;
      walk(a,a.coverPeek,a.homePos,clamp((frame.age-(i%3)*.12)/2.5,0,1),t);
    }
    a.wrapper.position.y+=(a.seatY||0)*a.seatBlend;
  }
  function updateEmotion(a,t){
    const name=frame.active?frame.emotion:emotionOverride || (a.action==='dozing'?'tired':'working');
    a.emotionRig?.update(name,t,frame.active,frame.id==='notice'?'notice':null);
    if(frame.active || emotionOverride)a.thoughtSprite.visible=false;
  }
  // 전투 자리 = 자기 자리에서 손님 쪽으로 한 발. 자리 간격은 그대로라 서로 더 가까워지지 않는다.
  const stations=new Map();
  function battleStation(a){
    if(config.seated===false)return a.homePos;
    let s=stations.get(a.key);
    // 책상은 자리에서 앞으로 1.17, 깊이 0.39 — 그보다 더 손님 쪽으로 나와야 몸이 안 가린다.
    if(!s){s=a.homePos.clone();s.z+=1.70;stations.set(a.key,s);}
    return s;
  }
  function afterActors(t,now,dt){
    const actors=getActors();
    const overlapFramesBefore=motion.overlapFrames;
    // All poses propose destinations; one controller owns the physical XZ
    // positions in every mode, including utility-AI visits and scene changes.
    const goals=new Map();
    for(const a of actors){
      let goal=frame.active?a.motionGoal:a.homePos;
      if(!frame.active && !emotionOverride && ['going','busy','returning'].includes(a.movePhase))goal=a.movePhase==='returning'?a.moveFrom:a.moveTo;
      // 0224 P23·P24 — 도망은 '종종걸음'(보폭 절반)으로, 속도는 친구마다 0.85~1.25배 다르게.
      // 보폭 자체는 이동 담당이 '속도' 하나로만 움직여서 따로 못 준다 → 겁먹은 종종걸음은
      // **빠른 속도 + 1초 7번 통통 + 앞으로 숙이기**로 만든다(P23 의 뜻). 너무 늦추면 도망이 늘어진다.
      const base=frame.id==='escape'||frame.id==='recover'?4.4:frame.id==='fetch'?4.8:3;
      goals.set(a.key,{x:goal.x,z:goal.z,speed:base*(a.paceMul||1)});
    }
    const launcherBoxes=mounts.map((g,i)=>{g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g);return {key:'launcher-'+i,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,ignoreKeys:[operators[i]]};});   // 바주카는 늘 그 주인 것 — 단계가 바뀌는 그 한 프레임에도 막히지 않게
    motion.obstacles=[...furnitureObstacles,...launcherBoxes];motion.step(goals,dt);
    for(const a of actors){
      const state=motion.agents.get(a.key),old=a.lastPhysical || state.position;
      const dx=state.position.x-old.x,dz=state.position.z-old.z;
      a.wrapper.position.x=state.position.x;a.wrapper.position.z=state.position.z;
      // The clearance cylinder encloses every yaw. Keep the body upright so
      // an equip bend cannot lean outside that cylinder into a desk/crate.
      a.wrapper.rotation.x=0;a.wrapper.rotation.z=0;
      const attacking=['ready','throw','gun','fetch','bazooka','mess'].includes(frame.id);
      // v8g: 평소엔 저마다 자기 책상(a.idleYaw)을 본다 — 예전처럼 전원 0(정면)으로 맞추지 않는다.
      // 걸을 땐 가는 쪽을 보고(미끄러지듯 가지 않게), 수다 중엔 상대를 본다.
      const moving=Math.hypot(dx,dz)>.004;
      // 0010 답 1: 뒤돌아 싸우는 건 그대로 두되, **전투 전(놀람)** 에는 손님 쪽을 본다 —
      // 그래야 돌아서기 직전에 얼굴이 보인다.
      const faceCamera=Math.atan2(camera.position.x-state.position.x,camera.position.z-state.position.z);
      const idleFace=frame.id==='notice'?faceCamera
        :(a.poseGoal?.lookYaw!==undefined?a.poseGoal.lookYaw:(a.idleYaw??0));
      const yaw=attacking?Math.atan2(-state.position.x*.06,windowZ-state.position.z)
        :['work','recover','notice'].includes(frame.id)?(moving?Math.atan2(dx,dz):idleFace)
        :moving?Math.atan2(dx,dz):a.facing;
      // 걷기 시작할 때는 더 빨리 돌아선다 — 천천히 돌면 몸이 옆으로 미끄러지는 것처럼 보인다
      // (2208 ③ "걷다가 미끄러지듯 미끄럼 X").
      const turnRate=moving?16:8;
      a.facing+=Math.atan2(Math.sin(yaw-a.facing),Math.cos(yaw-a.facing))*Math.min(1,dt*turnRate);a.wrapper.rotation.y=a.facing;
      a.lastPhysical={...state.position};a.shadow.position.set(state.position.x,.01,state.position.z);
      const operator=operators.indexOf(a.key);
      if(operator>=0 && frame.id==='fetch' && Math.hypot(state.position.x-parked[operator].x,state.position.z-(parked[operator].z+1.8))<.18)mounts[operator].userData.fetched=true;
    }
    actors.forEach((a,i)=>{
      if(!a.equipment)return;
      a.wrapper.updateMatrixWorld(true);
      const heldPosition=(a.visualRoot || a.wrapper).localToWorld(handOffset(a).clone());
      if(frame.id==='equip')a.equipment.position.copy(a.weaponRest).lerp(heldPosition,a.pickupBlend || 0);
      else if(a.held)a.equipment.position.copy(heldPosition);
      else if(['escape','hide','peek','recover'].includes(frame.id)){
        const drop=a.weaponRest.clone();
        a.equipment.position.copy(a.dropPosition || a.weaponRest).lerp(drop,smooth(frame.id==='escape'?frame.age/.55:1));
      }else a.equipment.position.copy(a.weaponRest);
      // v8g: 평소엔 씨앗 장난감을 상자 안에 둔 것으로 치고 숨긴다 — 책상 위에 둥둥 떠 있으면
      // 귀엽지도 자연스럽지도 않다(사장님 11/23 22:03). 손님을 보고 챙길 때부터 보인다.
      // 한 번에 무기 하나만: 바주카를 맡은 친구는 바주카를 미는 동안 씨앗총을 감춘다(3바퀴 ⑥).
      // 숨는 동안에도 감춘다 — 상자에 무기만 꽂혀 보이던 것(3바퀴 ⑦).
      const pushingLauncher=operators.includes(a.key) && ['fetch','bazooka','mess'].includes(frame.id);
      a.equipment.visible=!emotionOverride && !['work','lookup','escape','hide','peek'].includes(frame.id) && !pushingLauncher;
      if(a.weapon){
        a.weapon.lookAt(new THREE.Vector3(a.homePos.x,2.8,windowZ));
        a.muzzleFlash.visible=frame.id==='gun' && now<a.flashUntil;
      }
      // 0224 P16·P17·P18·P19·P21 — 화면에 늘 4~7개가 날아다니게, 친구마다 다른 간격으로,
      // 일부러 40%는 빗나가게(천장·바닥·옆 친구 머리 위), 던지는 물건도 네 가지를 섞는다.
      if(!emotionOverride && ['throw','gun'].includes(frame.id) && a.held && now>=a.nextShot){
        const kind=frame.id;
        if(kind==='gun' && (!a.def.canThrow || !a.gunActive)){/* 총은 쏠 수 있는 친구만 */}
        else{
          const aim=panicAim(i,kind,a);
          if(kind==='gun' && a.weapon){a.weapon.lookAt(aim);a.weapon.updateMatrixWorld(true);}
          const start=(kind==='gun' && a.weapon)?a.weapon.localToWorld(new THREE.Vector3(0,0,.25)):heldPosition;
          const shape=kind==='gun'?0:THROW_SHAPES[(a.throwCount=(a.throwCount||0)+1)%THROW_SHAPES.length];
          if(projectiles.fire(start,aim,kind,now,shape)){
            // P21 친구마다 0.5~1.1초 무작위(총은 그대로 빠르게)
            a.nextShot=now+(kind==='gun'?.20+(i%3)*.02:.38+Math.random()*.45);
            a.flashUntil=now+.085;
          }
        }
      }
    });
    mounts.forEach((g,i)=>{
      const operator=actors.find(a=>a.key===operators[i]);
      const pushed=!operator?0:frame.id==='fetch'?smooth((frame.progress-.45)/.55):['bazooka','mess','escape','hide','peek','recover'].includes(frame.id)?1:0;
      g.position.copy(parked[i]).lerp(deployed[i],pushed);
      // 5바퀴 불통: 통나무 뒤끝이 미는 친구 몸에 박히고 받침다리가 떴다.
      // 미는 사람 **앞쪽 옆**(몸 반지름 + 0.35)에 두고 바퀴 높이를 바닥에 맞춘다.
      // 5바퀴 불통: 통나무가 미는 친구 몸에 박히고 받침다리가 떴다.
      // 바깥쪽 **옆**(화면에서 겹치지 않는 쪽)으로 몸 반지름 + 0.8 만큼 떨어뜨리고
      // 바퀴 높이는 바닥에 맞춘다. 미는 동안엔 길 계산에서 주인만 이 통나무를 무시한다.
      if(['fetch','bazooka','mess'].includes(frame.id) && g.userData.fetched && operator){
        const out=operator.wrapper.position.x<0?-1:1;
        const gap=(operator.bodyRadius||.6)+2.00;
        g.position.x=operator.wrapper.position.x+out*gap;
        g.position.z=operator.wrapper.position.z-.80;
        g.position.y=GROUND_Y;
      }
      if(frame.id==='bazooka' && operator && !emotionOverride && now>=g.userData.fireAt){
        const aim=target(i,'bazooka');g.lookAt(aim);g.updateMatrixWorld(true);
        if(projectiles.fire(g.localToWorld(new THREE.Vector3(0,0,.57)),aim,'bazooka',now,1)){g.userData.fireAt=now+1.3;g.userData.flashUntil=now+.16;}
      }
      g.position.z+=Math.max(0,(g.userData.flashUntil-now)/.16)*.07;g.userData.flash.visible=frame.id==='bazooka' && now<g.userData.flashUntil;
    });
    // Attached pushers and carts advance together. Check their current poses
    // after both moved, rather than comparing a new actor to yesterday's cart.
    motion.obstacles=[...furnitureObstacles,...mounts.map((g,i)=>{
      g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g);
      // 여기서도 '주인은 자기 바주카를 들고 민다'를 그대로 적어 줘야 한다 —
      // 안 적으면 바로 이 검사에서만 겹쳤다고 나온다(5바퀴에서 실제로 그랬다).
      return {key:'launcher-'+i,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,ignoreKeys:[operators[i]]};
    })];
    if(motion.overlaps().length && motion.overlapFrames===overlapFramesBefore)motion.overlapFrames++;
    projectiles.update(now);
  }
  const api={
    navigation(){return JSON.parse(JSON.stringify({obstacles:motion.obstacles,agents:[...motion.agents.values()]}));},
    demo(){emotionOverride=null;document.getElementById('startOverlay').style.display='none';return director.begin(true);},
    emotion(name){if(name && !EMOTIONS[name])throw new Error('Unknown emotion');if(director.active)return {ignored:true,reason:'shared encounter mode',emotion:frame.emotion};emotionOverride=name || null;document.getElementById('startOverlay').style.display='none';resetActors();return name || 'auto';},
    quality(mode){if(!['auto','low','medium','high'].includes(mode))throw new Error('Unknown quality');quality.choose(mode);applyQuality();return quality.current;},
    // Synthetic levels exercise this same director without ever opening a camera.
    testDetection(level){if(level!==null && ![0,1,2,3].includes(level))throw new Error('Invalid detection level');testLevel=level;if(level!==null){emotionOverride=null;document.getElementById('startOverlay').style.display='none';}return level;},
    inspect(){return {scene:{...frame},emotionOverride,attackSeconds:ATTACK_SECONDS,encounterSeconds:ENCOUNTER_SECONDS,hits:mess.hits,impactKinds:{...mess.byKind},shots:{...projectiles.shots},projectilePeak:projectiles.peak,lastCompleted,
      quality:quality.current,qualityMode:quality.mode,qualityChanges:[...qualityChanges],render:pipeline.inspect(),bake:office.bake.inspect(),motion:motion.inspect(),fps:lastFPS,environment:office.info.hdr,assets:office.info,
      models:getActors().map(a=>({key:a.key,mode:frame.mode,emotion:a.emotion,eyeSurfaces:a.emotionRig?.eyes,canThrow:a.def.canThrow,hasWeapon:!!a.weapon,held:a.held,pickupBlend:a.pickupBlend || 0,position:a.wrapper.position.toArray(),facing:a.facing,windowFacing:Math.cos(a.facing)<-.95,equipment:a.equipment?.position.toArray(),crate:a.cratePosition.toArray()})),
      pickups:[...pickupEvents],events:[...phaseEvents],stages:SCENES.map(s=>({...s})),testLevel,cameraStored:false};},
  };
  function disposeActor(a){
    motion.remove(a.key);
    a.emotionRig?.dispose();
    for(const root of [a.equipment,a.crate]){if(!root)continue;root.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();for(const m of [o.material].flat())if(m!==flashMaterial)m.dispose();});scene.remove(root);}
  }
  return {prepareActor,disposeActor,rebuildWorld,office,update,animateActor,updateEmotion,afterActors,api,ready:office.ready,render:()=>pipeline.render(),resize:()=>pipeline.resize(),
    get active(){return director.active;},get preview(){return !!emotionOverride;},get frame(){return frame;},get quality(){return quality.current;},setFPS(fps){lastFPS=fps;}};
}
