import * as THREE from 'three';
import {SceneDirector,AdaptiveQuality,SCENES,ATTACK_SECONDS,ENCOUNTER_SECONDS} from './v8-director.js?v=20261123-8e';
import {createEmotionRig,EMOTIONS,setEyeTune} from './v8-emotions.js?v=20261128-8h';
import {furnishOffice,makePeaGun,makeAcornBazooka} from './v8-office.js?v=20261128-desk';
import {WindowMess,SeedProjectiles} from './v8-effects.js?v=20261128-8i';
import {createRenderPipeline} from './v8-render.js?v=20261123-8e';
import {gradeMaterial} from './v8-lighting.js?v=20261123-8e';
import {MotionWorld,rectangleGap} from './v8-motion.js?v=20261123-8e';
import {createDeskMoves} from './v8-desks.js?v=20261128-desk-return';

const smooth=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
const clamp=THREE.MathUtils.clamp;
// 0010: 무기를 몸 바깥 손 위치에 둔다. v8f 의 (.40,.38,.30) 은 몸 안쪽이라 총대가 몸을 뚫었다.
// 실제 몸 반지름은 친구마다 다르므로 prepareActor 에서 잰 값으로 바깥쪽으로 더 민다.
const hand=new THREE.Vector3(.40,.38,.30);
const handSwing=new THREE.Vector3();
function handOffset(a){
  const base=a.handLocal||hand;
  const s=a.throwSwing;
  if(s==null)return base;
  // 8바퀴 — 팔 뼈대가 없는 친구가 많아 **쥔 물건이 그리는 길**로 던지는 동작을 만든다.
  // 뒤로 당김(0~0.36) → 앞으로 뿌림(0.36~0.60) → 제자리(0.60~1).
  const back=THREE.MathUtils.clamp(s/.36,0,1);
  const fwd=THREE.MathUtils.clamp((s-.36)/.24,0,1);
  const rest=THREE.MathUtils.clamp((s-.60)/.40,0,1);
  const ext=1-.42*back+1.15*fwd-1.15*rest;      // 0.58 → 1.73 → 1
  const lift=.30*back-.38*fwd+.08*rest;
  return handSwing.set(base.x*ext,base.y+lift,base.z*ext);
}
export function createV8(config){
  const {scene,renderer,camera,dirLight,windowZ,windowBottom,getActors,bazookaGroup,resize,resetActors}=config;
  // 1135 — 유리창은 화면을 채우도록 나중에 커질 수 있다. 씨앗이 맞는 범위·자국판도 같이 따라가게 변수로 둔다.
  let windowWidth=config.windowWidth, windowHeight=config.windowHeight;
  // 14바퀴 — 눈 값은 잠금 파일(locked/characters.lock.json)에서 온 것만 쓴다.
  setEyeTune(config.eyeTune||{});
  const office=furnishOffice(config),director=new SceneDirector(),quality=new AdaptiveQuality(),pipeline=createRenderPipeline(renderer,scene,camera);
  // 0206 ① — 친구가 커지면 숨는 줄도 넓어져야 한다(2.0 배에서 서로 못 지나가 도망이 멈췄다).
  // 길을 찾는 판 넓이도 같이 넓힌다(기본 ±12.4 로는 넓힌 숨는 자리에 닿지 못한다).
  const spread=config.layoutSpread||1;
  const WALK_RADIUS=0.48;   // 13바퀴 — 0.62 에서는 도토리·밤이 도망 때 한 걸음도 못 뗐다(매 걸음이 다른 친구에 막힘)
  // 13바퀴 — 숨는 자리를 고르게 벌리면서 길 찾는 판도 그 바깥까지 넓힌다(안 그러면 끝자리에 못 닿는다).
  const motion=new MotionWorld({minX:-20.5,maxX:20.5});
  const desks=createDeskMoves(camera);
  let furnitureObstacles=[], fixedObstacles=[];
  const actorScale=config.actorScale || 1,propScale=actorScale*.75;
  const mess=new WindowMess(scene,{width:windowWidth,height:windowHeight,z:windowZ,bottom:windowBottom});
  const projectiles=new SeedProjectiles(scene,(point,kind)=>mess.impact(point,kind),Math.sqrt(actorScale));
  // 13바퀴 ④ — 렉 원인 가르기용 스위치(검사 전용 · 기본은 전부 켬).
  const SEEDS_ON=config.seedsOn!==false, PATH_ON=config.pathOn!==false;
  const mounts=[bazookaGroup,new THREE.Group()];scene.add(mounts[1]);
  // 두 바주카는 각자 주인(병아리·쌀)이 가지러 간다. 세워 두는 곳은 화면에서 친구와
  // 겹쳐 보이지 않는 양쪽 끝 빈자리로 둔다 — v8f 에서는 쌀 바로 뒤에 서 있어서
  // 쌀이 바주카를 안고 있는 것처럼 보였다(2206 총괄 지적 ②).
  const spots=config.launcherSpots||{parked:[[-8,3.1],[0,-6.2]],deployed:[[-8,-.8],[0,-6.8]]};
  const GROUND_Y=propScale*.5;                      // 바퀴가 바닥에 닿는 높이
  const parked=spots.parked.map(([x,z])=>new THREE.Vector3(x,GROUND_Y,z));
  const deployed=spots.deployed.map(([x,z])=>new THREE.Vector3(x,GROUND_Y,z));
  // 1241 ⑦ — 오른쪽 통나무는 **가장 가까운 친구**(해바라기씨 x 6.7)가 가져온다. 쌀(x 0.5)이
  // 가져오면 완두콩·해바라기씨 앞을 가로질러 화면에서 깊게 겹쳤다(비율 0.50).
  const operators=['byeongari','haebaragi'];
  // 1241 ①⑦ — 미는 친구와 통나무의 거리. 2.00 은 통나무를 화면 밖·화분 속으로 보냈고,
  // 0.75 는 화면에서 몸에 박혀 보였다(겹침 103/240). 0.90 으로 두고 **서는 자리도 통나무 옆**
  // 으로 옮긴다(예전엔 통나무 정면 1.8 앞 — 카메라가 거의 수평이라 화면에서 통째로 겹쳤다).
  // 왼쪽 통나무는 1.20 까지 밀어도 화면 안(화면좌표 0.95)인데, 오른쪽은 더 앞(z 2.6)에 있어서
  // 1.20 이면 화면 밖(1.055)으로 나간다. 그래서 **통나무마다** 거리를 따로 둔다.
  // 0206 10바퀴 — 이 거리는 **몸 크기에 따라** 벌어져야 한다. 1.35 배 때 맞춰 둔 1.20 을
  // 2.0 배에서 그대로 쓰니 미는 친구와 통나무가 화면에서 계속 닿아 보였다(240 중 108회).
  const PUSH_SIZE=(config.actorScale||1.35)/1.35;
  const PUSH_GAPS=[1.20*PUSH_SIZE,1.20*PUSH_SIZE], PUSH_BACK=0.80*PUSH_SIZE;
  const pushSide=i=>(parked[i].x<0?-1:1);          // 통나무는 미는 친구의 바깥쪽 옆에 둔다
  const standBy=(spot,i)=>spot.clone().add(new THREE.Vector3(-pushSide(i)*(0.6+PUSH_GAPS[i]), -spot.y, PUSH_BACK));
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
    g.userData.homeBounds=new THREE.Box3().setFromObject(g);
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
    // 1241 ⑦ — 숨는 자리를 **제 자리 순서 그대로** 준다. 예전 배정은 네 쌍이 서로 길을 건너서
    // (도토리↔밤·도토리↔병아리콩·밤↔병아리콩·쌀↔해바라기씨) 도망·복귀 때 화면에서 겹쳤다.
    // 왼쪽 집 x: 병아리콩 -6.0 < 땅콩 -5.0 < 밤 -1.3 < 도토리 2.2 → 왼쪽 칸도 같은 순서로.
    // 오른쪽 집 x: 쌀 0.5 < 완두콩 5.5 < 해바라기씨 6.7 → 오른쪽 칸도 같은 순서로.
    // 0206 ① — 2.0 배에서는 한 줄로 서면 서로 못 지나가 도망이 멈췄다. 자리를 가로로 더 벌리면
    // 화면 밖까지 나가므로 **앞뒤 두 줄로 엇갈려** 세운다(같은 줄 사이가 두 배로 벌어진다).
    // 13바퀴 — 오른쪽 세 자리만 간격이 좁아(2.15) 3.0배에서 완두콩↔해바라기씨가 도망 때
    // 23장이나 겹쳤다(왼쪽 네 자리는 앞뒤로 엇갈려 같은 줄끼리 3.4 라 0장). 오른쪽도 3.3 으로.
    // 13바퀴 — 숨는 자리를 **자기 쪽**으로 준다. 예전엔 도토리(집 x +3.5)가 방을 가로질러
    // 왼쪽 끝까지 가야 해서, 가는 길에 밤이 비켜 주느라 둘 다 1.6초 동안 한 발도 못 뗐다.
    // 집 x 순서: 병아리콩 -10.6 · 땅콩 -7.1 · 밤 -3.5 · 쌀 0 · 도토리 3.5 · 완두콩 7.1 · 해바라기씨 10.6
    // 13바퀴 — 숨는 줄을 **책장 뒤**로 확실히 보낸다. 책장 뒷면이 z -4.53 인데 숨는 줄이 -5.0 이라
    // 3.0배 몸(걷는 반지름 0.8~1.1)이 책장 안에 걸려 도토리·밤이 길을 못 만들었다(gap -0.36 · -0.59).
    // 13바퀴 재작업 — 숨는 자리를 **자기 자리 바로 뒤 바깥쪽**으로. 1차에서는 모두 왼쪽으로
  // 몰려가며 남의 책상과 통나무를 가로질렀다(친구↔통나무 12장/240 · 최대 59.2% · 검토 ②).
  // 자리(세계좌표) ±9.53 / ±6.35 / ±3.18 / 0 → 바깥으로 2.4 물러나 앞뒤 두 줄로 엇갈린다.
  // 자기 기둥 바로 뒤로 두었더니(±12.0/±8.8/±5.6/-2.4) 통로가 좁아 도토리·밤·병아리콩이
  // 0px 로 다시 막혔다. **옆으로 흘러 나가는 자리**로 둔다 — 가로로 움직여야 화면에서 보인다.
  // 17바퀴 — 자리를 화면에서 고르게 옮기면서(겹침 58 → 18/240) **숨는 자리도 같은 만큼** 옮긴다.
  // 안 옮겼더니 집과 숨는 자리가 가까워져 도망 가로 이동이 42→32 · 74→35 · 45→28px 로 줄었다(실측).
  const covers={byeongari:[-16.5,-6.0],ddangkong:[-13.93,-7.8],bam:[-10.30,-6.0],ssal:[-5.20,-7.8],
                dotori:[9.70,-7.8],haebaragi:[17.8,-6.0],wandukong3:[14.90,-7.8]};
    // 도토리는 **가운데-왼쪽**으로 보낸다. 오른쪽으로 보내면 거의 뒤로만 가서(가로 5px) 화면에서는
    // 도망치는 것처럼 안 보였다 — 실제로는 숨는 자리까지 갔는데도 그랬다.
    // 도토리는 앞줄 가운데라 오른쪽 끝(6.9)으로 가려면 완두콩·해바라기씨 책상 사이 0.1 틈을 지나야 해서
    // 길이 아예 없었다(1.6초 동안 0px). 가운데 통로로 곧장 갈 수 있는 자리를 준다.
    // 11바퀴 — 숨는 줄까지 자리와 같은 비율로 벌리면 3.0배에서 **화면 밖**으로 나간다
    // (카메라가 가까워졌다). 앞뒤 두 줄로 엇갈려 있으니 가로는 조금만 벌린다.
    // 13바퀴 — 숨는 자리 자체를 3.3 간격으로 고르게 잡았으니 **더 벌리지 않는다**.
    // 더 벌리면 길 찾는 판 끝(±20.5)에 닿아 **병아리콩이 아예 도망을 못 갔다**(제자리 -11.3 · 걸음 6).
    const coverSpread=1;
    a.cover=new THREE.Vector3(covers[a.key][0]*coverSpread,0,covers[a.key][1]);
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
    // 7바퀴 영상분석 ⑦ — 0.62/0.70 은 길이가 reach 의 **0.94배**라 손이 몸 안쪽이었다
    // (씨앗총 초록 캡슐이 완두콩 얼굴을 가로지르고 옆구리를 뚫었다). 바깥으로 1.15배.
    const reach=(a.bodyRadius/(config.actorScale||1))+.02/(config.actorScale||1);
    a.handLocal=new THREE.Vector3(reach*.76,.40,reach*.86);
    motion.add(a.key,a.homePos,a.bodyRadius);
    for(const root of [a.wrapper,a.equipment])root?.traverse(o=>{for(const material of [o.material].flat())if(material)gradeMaterial(material);});
  }
  function rebuildWorld(){
    chestQueue.clear();
    const roots=scene.children.filter(o=>o.userData.isDesk);
    desks.rebuild(roots,getActors());
    office.rebuild(roots,getActors().map(a=>a.crate).filter(Boolean));
    fixedObstacles=office.obstacles.filter(o=>!/^(desk|crate)-/.test(o.key));
    // 0206 ① — 숨는 줄은 화면 밖까지 넓어야 하지만(친구가 커져 서로 못 지나간다), **평소 구역**은
    // 화면 안에 머물러야 한다. 2.0 배에서 수다 가던 땅콩이 왼쪽 구석(x -13.1)까지 돌아 나가
    // 몸이 잘렸다. 책장 앞(z > -3.0)에만 보이지 않는 벽을 세운다 — 도망 길(z < -3.0)은 그대로 연다.
    // 12바퀴 — 3.0배에서 이 벽이 **친구를 가두고 있었다**. 해바라기씨는 집이 x 10.6 인데 몸 반지름이
    // 1.72 라 11.0 벽 **안쪽에 박힌 채 시작**했고(minGap -0.649), 그래서 도망 길을 아예 못 만들었다
    // (검토 두 곳이 같은 세 명을 짚었다). 벽은 **제일 바깥 친구 몸 끝보다 더 밖**에 세운다.
    // 13바퀴 — 이 벽이 **도망 길을 막고 있었다**. 숨는 자리가 벽 바깥(±16.5)인데 벽이 ±12.7 이라
    // 병아리콩이 벽을 넘지 못해 제자리(-11.3)에 서 있었다(계획중 true · 걸음 6).
    // 벽은 **숨는 자리보다 더 밖**에 세운다 — 평소에 멀리 돌아 나가는 것만 막으면 된다.
    const reach=Math.max(0,...getActors().map(a=>Math.abs(a.homePos.x)+(a.bodyRadius||0)),
                         ...getActors().map(a=>Math.abs(a.cover?.x||0)));
    const idleWall=Math.max(11.0,reach+1.2);
    const keepInFrame=[-1,1].map(side=>({key:'frame-'+side,
      minX:side<0?-60:idleWall, maxX:side<0?-idleWall:60, minZ:-3.0, maxZ:9.0}));
    furnitureObstacles=[...office.obstacles,...keepInFrame];motion.clear();motion.setObstacles(furnitureObstacles);
    // 12바퀴 — 길 찾기에 **몸 전체 반지름**(3.0배에서 1.7)을 쓰니 앉은 자리가 책장·창틀 안으로
    // 들어가 길을 아예 못 만들었다(검토 두 곳이 같은 세 명을 짚음). 친구는 동글동글해서 제일 넓은
    // 곳은 머리·어깨고, 걸을 때 걸리는 것은 **발밑**이다 → 걷는 반지름은 그 비율로 쓴다.
    for(const a of getActors())motion.add(a.key,a.homePos,a.bodyRadius*WALK_RADIUS);
  }
  function resetEquipment(){
    getActors().forEach(a=>{a.held=false;a.pickupLogged=false;a.pickupDwell=0;a.pickupBlend=0;a.wrapper.visible=true;if(a.equipment){a.equipment.position.copy(a.weaponRest);a.equipment.visible=true;a.equipment.rotation.set(0,0,0);}if(a.muzzleFlash)a.muzzleFlash.visible=false;});
    // 4바퀴 ④ — 처음 자리·각도·높이를 그대로 되돌린다(화분에 박히거나 뜨지 않게).
    mounts.forEach((g,i)=>{g.position.copy(parked[i]);g.rotation.copy(g.userData.restRotation);
      g.userData.flash.visible=false;g.userData.fetched=false;g.userData.leftAt=null;g.userData.retract=0;});
  }
  // 17바퀴 — 손님을 본 **그 순간** 각자 서 있던 자리(놀라는 동안 여기 그대로 있는다).
  const SIDE_FIRST=new Set(['ddangkong','wandukong3']);   // 0050 — 옆으로 먼저 흩어지는 둘(도토리는 넣어 봤더니 0.655 로 더 겹쳤다)
  const startleSpots=new Map();
  function changeScene(id){
    if(id===lastScene)return;lastScene=id;
    const event={id,elapsed:director.elapsed,time:lastTime};phaseEvents.push(event);if(phaseEvents.length>80)phaseEvents.shift();
    if(id==='notice'){
      // 17바퀴 — 사장님 11/04 21:14 "사람이오면 **각자 그상황에서** 놀라고".
      // 전에는 여기서 resetActors() 가 모두 **제 책상으로 순간이동**시킨 뒤 놀랐다.
      // 이제 있던 자리를 기억해 두고, 놀라는 1초 동안은 그 자리에 그대로 있는다.
      startleSpots.clear();
      getActors().forEach(a=>startleSpots.set(a.key,a.wrapper.position.clone()));
      emotionOverride=null;mess.reset();projectiles.reset();resetActors(true);resetEquipment();pickupEvents.length=0;
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
  let waitHeld=0;                                   // 장면이 기다린 실제 시간(초)
  let giveUpScene=null;                             // 한계 시간이 지나 '기다리기를 포기한' 장면
  function update(dt,t,rawDt,level,now){
    lastTime=now;if(getActors().length && quality.sample(rawDt))applyQuality();
    const loaded=getActors().length>0;
    // The encounter clock waits at the end of travel phases. A collision-safe
    // detour must finish before hiding/resting is announced.
    const travelling=['escape','recover'].includes(frame.id) && frame.progress>.90;
    const equipWaiting=frame.id==='equip' && frame.progress>.90 && getActors().some(a=>{
      const p=motion.agents.get(a.key)?.position,want=battleStation(a);
      // 0206 10바퀴 — 몸이 커지면 길 찾기가 목표에서 더 멀찍이 멈춘다(2.0 배에서 쌀이 0.40).
      // 기준도 몸 크기에 맞춰 늘린다. 안 늘리면 전투가 '씨앗 보관함으로'에서 영영 못 넘어간다.
      return !a.held || !p || Math.hypot(p.x-want.x,p.z-want.z)>.25*(config.actorScale||1.35)/1.35*1.6;
    });
    const fetchWaiting=frame.id==='fetch' && frame.progress>.4 && mounts.some((g,i)=>getActors().some(a=>a.key===operators[i]) && !g.userData.fetched);
    const firingWaiting=frame.id==='fetch' && frame.progress>.9 && operators.some((key,i)=>{const p=motion.agents.get(key)?.position;return p && Math.hypot(p.x-deployed[i].x,p.z-deployed[i].z-1.8)>.15;});
    // 0224: 기다림에는 **한계 시간**을 둔다. 한 명이 길이 막혀 못 가면 장면이 영영 안 넘어가
    // 손님 화면이 '도망' 에서 멈춘다(영상·캡처에서 실제로 그렇게 됐다).
    // 1241: 예전 한계 시간은 `frame.age` 로 쟀는데, 기다리는 동안은 장면 시계를 멈추니까
    // age 도 같이 멈춰서 **한계 시간이 영원히 오지 않았다**(그래서 도망에서 멈췄다).
    // 기다린 실제 시간을 따로 센다.
    // 0206 10바퀴 — 예전엔 한계 시간이 지나면 `waitHeld` 가 **곧바로 0 으로 되돌아가서**
    // 장면이 한 프레임만 나아가고 다시 멈췄다(60초 자유 실행에서 equip 에 3541프레임).
    // 한 번 포기한 장면은 **그 장면이 끝날 때까지** 다시 기다리지 않는다.
    const deskScene=frame.id==='equip'||frame.id==='recover';
    const deskWaiting=deskScene && frame.progress>.90 && desks.stillMoving(frame.id);
    if(waitHeld>(frame.id==='recover'?24:deskScene?15:4.5))giveUpScene=frame.id;
    const stuckLimit=giveUpScene===frame.id;
    const waiting=!stuckLimit && (deskWaiting || equipWaiting || fetchWaiting || firingWaiting || travelling && getActors().some(a=>{
      const p=motion.agents.get(a.key)?.position,target=frame.id==='escape'?a.cover:a.homePos;
      return !p || Math.hypot(p.x-target.x,p.z-target.z)>.40;
    }));
    waitHeld=waiting?waitHeld+dt:0;
    const before=frame.id;
    frame=director.update(loaded && !waiting?dt:0,loaded?(testLevel??level):0);
    if(frame.id!==before){waitHeld=0;giveUpScene=null;}
    changeScene(frame.id);mess.fade(frame.id==='recover'?frame.clean:0);
    const badge=document.getElementById('sceneBadge');if(badge){
      const clearing=frame.id==='equip' && desks.stillMoving('equip');
      const restoring=frame.id==='recover' && desks.stillMoving('recover');
      badge.textContent=clearing?'책상을 옮기는 중':restoring?'책상을 제자리로':frame.label || '';
      badge.style.display=frame.active?'block':'none';
    }
    const emotionChoice=document.getElementById('emotionPreview');if(emotionChoice){emotionChoice.disabled=frame.active;if(frame.active)emotionChoice.value='';}
    const debug=document.getElementById('dbgQuality');if(debug)debug.textContent=quality.current.id+' · '+renderer.getPixelRatio().toFixed(2)+'× · '+(quality.mode==='auto'?'자동': '고정');
    return frame;
  }
  function walk(a,from,to,u,t){
    a.wrapper.position.copy(from).lerp(to,smooth(u));
    // 영상검사 ② — 걸음 장단을 **실제로 움직인 거리**(a.stride)로 낸다. 시간(t*14)으로 내면
    // 몸은 길 찾기가 끌고 가는데 발은 제 박자로 굴러 미끄러져 보였다.
    const beat=(a.stride||0)+a.phase;
    const moving=(a.realMoving!==undefined?a.realMoving:(u>0 && u<1));
    a.wrapper.position.y+=moving?Math.abs(Math.sin(beat))*.08:0;
    a.wrapper.rotation.z=moving?Math.sin(beat)*.055:0;
    // 영상검사 ② — 몸을 길 찾기가 끌고 가는 토막(도망·숨기·복귀)에서는 이 **곧은 선 방향**으로
    // 기울이면 실제 가는 쪽과 어긋나 미끄러져 보인다. 그 토막에서는 기울이지 않고 아래 yaw 에 맡긴다.
    const pathDriven=['escape','hide','peek','recover'].includes(frame.id);
    a.wrapper.rotation.y=(moving && !pathDriven)?Math.atan2(to.x-from.x,to.z-from.z)*.28:0;
    a.movePhase=(u>0 && u<1)?'moving':'idle';
  }
  // 1241 ⑦ — 숨는 자리를 제 자리 순서대로 바꿨으니 **지나가는 순서도 먼 자리부터** 다시 쓴다.
  // (안 고치면 뒤 사람이 앞 사람 자리를 지나가야 해서 도망이 영영 안 끝난다 — 실제로 그렇게 멈췄다)
  const traffic=[['byeongari','ddangkong','bam','ssal'],['haebaragi','wandukong3','dotori']];   // 13바퀴 — 숨는 자리 순서대로(먼 자리부터)
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
    // 13바퀴 — 0.55+0.30n 이면 네 번째 친구가 1.45초에야 출발한다. 영상 도망 토막이 1.6초라
    // 뒤 두 명은 '제자리'로 보였다. 숨는 자리를 고르게 벌려 길이 넓어졌으니 시차를 줄인다.
    // 0050 ① — 도망 겹침 5번은 네 명이 한꺼번에 같은 통로로 몰려서 났다. 걸음이 빨라졌으니(5.4)
    // 출발 시차를 벌려도 거리는 나온다.
    return frame.age>.12+idx*.16;   // 13바퀴 — 숨는 자리가 고르게 벌어져 길이 넓으니 더 일찍 출발해도 안 막힌다
  }
  function animateActor(a,dt,t){
    const p=profile[a.key],phase=t*p.pace+a.phase,i=getActors().indexOf(a),id=frame.id;
    a.wrapper.position.copy(a.homePos);a.wrapper.scale.set(1,1,1);a.wrapper.rotation.set(0,0,0);a.wrapper.visible=true;a.cargoMesh.visible=false;
    // 8바퀴 — 전투 자세(앞뒤 숙임·좌우 흔들기)는 **visualRoot** 에 적는다. wrapper 에 적으면
    // 아래 길 계산이 매 프레임 `rotation.x=0; rotation.z=0` 으로 지워 버려서
    // 1~7바퀴 내내 던지는 몸짓이 화면에 **한 번도 안 보였다**(검토 두 곳이 같은 지적).
    a.battleTiltX=0;a.battleTiltZ=0;a.throwSwing=null;
    a.action=id;a.movePhase='idle';a.gunActive=id==='gun' && a.fireIndex%2===(frame.progress<.5?0:1);
    // 17바퀴 — 놀라는 1초는 **있던 자리 그대로**(사장님 11/04 "각자 그상황에서 놀라고").
    // 그 다음 단계(씨앗 보관함으로)부터 제 자리로 걸어간다.
    const startle=id==='notice'?startleSpots.get(a.key):null;
    if(startle)a.wrapper.position.copy(startle);
    // 2345 — '씨앗 보관함으로' 단계에는 **일곱 다 무기 상자까지 걸어간다**(사장님 11/22 "어디서 가져와서 쏘고").
    // 상자는 양옆 둘. 가까운 쪽으로 가되 친구마다 조금씩 옆으로 비켜서서 줄을 선다.
    const chestGoal=id==='equip'?weaponChestSpot(a):null;
    a.motionGoal=startle||chestGoal||a.homePos;
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
      const jump=Math.sin(up*Math.PI/2)*(1-down)*.34;   // 2137 — 놀람을 눈이 아니라 **몸**으로(깡충 0.26 → 0.34)          // P1 점프 0 → 0.26(7바퀴: 0.18 은 머리 0.1~0.4칸밖에 안 올라갔다)
      a.wrapper.position.y=Math.max(0,jump);                   // P2 평소보다 낮아지지 않게
      const rise=up*(1-down);
      a.wrapper.scale.y=1+.34*rise;a.wrapper.scale.x=a.wrapper.scale.z=1-.20*rise;   // 2137 — 쏙 늘어나기 크게   // P5 늘어남
      if(down>=1){                                             // 착지 뒤 눌림 → 떨림
        const land=clamp((age-.30)/.08,0,1);
        a.wrapper.scale.y=1-.26*(1-land);a.wrapper.scale.x=a.wrapper.scale.z=1+.26*(1-land);   // 2137 — 착지 눌림도 크게
        const shake=clamp(1-(age-.38)/.6,0,1);                 // P6 0.6초 ±0.035 · 9회/초
        a.wrapper.position.x=a.homePos.x+Math.sin(age*Math.PI*2*9+i)*.035*shake;
      }
      a.wrapper.rotation.y=(i%2?1:-1)*Math.sin(up*Math.PI)*.18;
      a.wrapper.rotation.x=-.16*rise;
      a.panic=Math.max(a.panic||0,clamp(age/.1,0,1));          // 눈 크게(P3)·땀방울(P11) 신호
    }else if(id==='equip'){
      const pushing=desks.handling(a);
      const grabAt=chestGoal||a.pickupPosition;
      a.motionGoal=a.held?battleStation(a):grabAt;
      a.movePhase='moving';
      const physical=motion.agents.get(a.key)?.position;
      // 2350 3차 실측 — 2.2칸은 **상자에서 2~3칸 떨어진 채** 무기를 집은 것으로 치고
      // 돌아서게 만들었다(상자까지 최소 3.0~6.4칸). 실제로 닿아야 집는다.
      const atChest=physical&&Math.hypot(physical.x-grabAt.x,physical.z-grabAt.z)<1.0;
      if(!pushing&&atChest){
        const bend=Math.sin(clamp((a.pickupDwell||0)/.45,0,1)*Math.PI);
        a.battleTiltX=-.26*bend;a.wrapper.scale.y=1-.12*bend;a.movePhase='idle';
      }
      a.chestGrab=chestGoal?chestGoal.clone().setY(.62):null;
      if(!pushing&&atChest)a.pickupDwell=(a.pickupDwell || 0)+dt;
      // 2350 검사용 — 무기 상자 앞 자리까지 **실제로 닿았는지**(제일 가까웠던 거리).
      if(physical&&!pushing){const dd=Math.hypot(physical.x-grabAt.x,physical.z-grabAt.z);a.chestMin=Math.min(a.chestMin===undefined?99:a.chestMin,dd);}
      a.pickupBlend=smooth((a.pickupDwell || 0)/.30);a.held=a.pickupBlend>=1;   // 2350 — 걸어갈 시간을 남기려고 0.45 → 0.30초
      if(a.held && !a.pickupLogged && physical){a.pickupLogged=true;pickupEvents.push({key:a.key,kind:a.def.canThrow?'gun':'ammunition',at:frame.elapsed,from:(a.chestGrab||a.weaponRest).toArray(),atActor:[physical.x,0,physical.z]});}
    }else if(['ready','throw','gun','fetch','bazooka','mess'].includes(id)){
      a.held=true;a.battleTiltX=-.08;a.battleTiltZ=p.tilt*.25;
      if(['throw','gun'].includes(id) || (['bazooka','mess'].includes(id) && !operators.includes(a.key))){
        // 0224 P14·P15·P22 — 1초에 3번 던지는 몸짓. 팔 뼈대가 있는 친구는 도토리뿐이라
        // 나머지는 "뒤로 젖혔다 앞으로 숙이기 + 찌그러짐" 으로 던지는 동작을 만든다.
        // 한 번에 0.33초: 뒤로 0.12 · 앞으로 0.08 · 돌아오기 0.13.
        // 7바퀴 영상분석 ②: 전투 때 일곱이 다 **뒤돌아** 있어서 앞뒤로 숙이는 동작(rotation.x)이
        // 카메라 방향과 겹쳐 거의 안 보였다("팔 0 · 몸 기울기 0 · 전투가 평소보다 조용함").
        // 앞뒤 숙임은 그대로 두고, **화면에서 보이는 쪽**(위아래 뛰기 · 좌우 흔들기 · 몸 비틀기)을 키운다.
        const cycle=(t*3+a.phase*.37)%1;
        const back=clamp(cycle/.36,0,1),fwd=clamp((cycle-.36)/.24,0,1),back2=clamp((cycle-.60)/.40,0,1);
        const lean=back<1?-.17*back:(fwd<1?(-.17+.49*fwd):(.32*(1-back2)));   // 뒤 10° → 앞 18°
        const side=i%2?1:-1;
        a.battleTiltX=-.08+lean;                                               // P15 뒤 10° → 앞 18°
        a.throwSwing=cycle;                                                    // 손(무기)도 같이 휘두른다
        a.wrapper.position.y=Math.max(0,Math.sin(cycle*Math.PI)*.17);          // 던질 때마다 들썩
        const snap=fwd<1&&fwd>0?Math.sin(fwd*Math.PI):0;
        a.wrapper.scale.x=a.wrapper.scale.z=1+.18*snap;a.wrapper.scale.y=1-.15*snap;   // P22
        a.battleTiltZ=p.tilt*.25+Math.sin(cycle*Math.PI*2)*.24*side;           // 좌우로 크게
        a.wrapper.rotation.y=Math.sin(cycle*Math.PI*2+.6)*.26*side;            // 던지는 쪽으로 몸 비틀기
      }
      // 유리창 엉망일 때 통통 뛰기 — 던지는 몸짓이 만든 들썩임을 **덮어쓰지 않게** 더한다
      // (7바퀴 영상분석 ①: 8~9초가 제일 조용했던 까닭 중 하나).
      if(id==='mess')a.wrapper.position.y=Math.max(a.wrapper.position.y,Math.abs(Math.sin(phase*4))*p.hop*.9);
      const operator=operators.indexOf(a.key);
      a.motionGoal=battleStation(a);
      if(operator>=0 && ['fetch','bazooka','mess'].includes(id)){
        const dock=standBy(parked[operator],operator);
        // 쏘는 자리는 예전처럼 통나무 정면(+1.8) — 옆으로 옮기면 책상에 막혀 전투가 멈췄다.
        // 화면 겹침은 아래 '따라오기'가 통나무를 옆으로 빼서 막는다.
        const firing=deployed[operator].clone().add(new THREE.Vector3(0,-deployed[operator].y,1.8));
        a.motionGoal=id==='fetch' && !mounts[operator].userData.fetched?dock:firing;
        // 13바퀴 4차(영상검사) — 가져오기 1초 토막이 **통나무가 멈춘 그림**이었다. 영상은 이 토막의
        // 앞 1초(진행률 0~0.29)만 담는데, 걷기는 0~0.45 · 통나무는 0.45 부터 움직였기 때문이다.
        // 그 1초 안에 **걷기(0~0.16) → 손 뻗기(0.16~0.22) → 들기(0.22~0.30)** 가 다 들어오게 당긴다.
        if(id==='fetch' && frame.progress<.16)walk(a,a.homePos,dock,frame.progress/.16,t);
        else if(id==='fetch' && frame.progress<.30){
          a.wrapper.position.copy(dock);
          const u=(frame.progress-.16)/.14;                   // 손 뻗어 통나무를 세우는 동안
          a.battleTiltX=-.08-Math.sin(Math.PI*u)*.34;         // 숙였다가 일어서며 들어올린다
          a.wrapper.position.y+=Math.sin(Math.PI*u)*.10;
          a.movePhase='moving';
        }
        else if(id==='fetch')walk(a,dock,firing,(frame.progress-.30)/.70,t);
        else a.wrapper.position.copy(firing);
      }
    }else if(id==='escape'){
      // 0050 ② — 땅콩·완두콩은 숨는 자리가 **뒤쪽 깊은 줄**이라 길이 '뒤 먼저 · 옆 나중'으로 잡혀
      // 화면 가로 이동이 34·40px 밖에 안 됐다. 이 둘만 0.8초 동안 **옆으로 먼저** 뛴 뒤 숨는다.
      const go=turnToMove(a);
      let dest=a.cover;
      if(go && SIDE_FIRST.has(a.key) && frame.age<.85)
        dest=new THREE.Vector3(a.cover.x,0,a.homePos.z+(a.cover.z-a.homePos.z)*.25);
      a.motionGoal=go?dest:a.escapeFrom;
      // 13바퀴 재작업 — 막히면 길 찾기를 끄고 밀고 나가던 `panicWalk` 를 **없앴다**.
      // 몸이 통나무·남의 책상을 뚫고 지나갔다(친구↔통나무 12장/240 · 최대 59.2% · 검토 ②).
      // 대신 숨는 자리를 **자기 자리 바로 뒤**로 옮겨 길 자체를 넓혔다(위 covers).
      const u=clamp((frame.age-i*.16)/2.1,0,1);   // 출발 시차를 줄이고 조금 더 빨리 달린다
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
      walk(a,a.coverPeek,a.homePos,clamp((frame.age-i*.18)/2.5,0,1),t);   // 1241 ⑦ 돌아오는 시차도 벌린다
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
    // 11바퀴 — 옆으로도 벌려 봤지만(x*0.14) 바깥 친구가 통나무 쪽으로 밀려 더 나빠졌다
    // (겹침 131 → 135, 병아리콩↔통나무 94회). 앞으로만 나온다.
    if(!s){s=a.homePos.clone();s.z+=1.70;stations.set(a.key,s);}
    return s;
  }
  // 2345 — 무기 상자 앞에 **친구마다 다른 자리**(줄 서기). 가까운 쪽 상자로 간다.
  const chestQueue=new Map();
  function weaponChestSpot(a){
    if(!chestQueue.size){
      const left=getActors().filter(x=>x.homePos.x<0).sort((x,y)=>x.homePos.x-y.homePos.x);
      const right=getActors().filter(x=>x.homePos.x>=0).sort((x,y)=>y.homePos.x-x.homePos.x);
      [left,right].forEach((group,side)=>group.forEach((x,i)=>chestQueue.set(x.key,{side,i})));
    }
    const q=chestQueue.get(a.key);if(!q)return null;
    const chest=parked[q.side===0?0:1];
    const inward=q.side===0?1:-1;
    // Empty outer workstations keep their furniture. Approach the locker
    // from the open end when the usual queue beside it is still occupied.
    if(config.seated!==false && !getActors().some(friend=>friend.key===operators[q.side])){
      return new THREE.Vector3(chest.x,GROUND_Y,chest.z+1.66+q.i*1.92);
    }
    // 2350 4차 실측 — 줄 간격 1.9칸은 **3배로 커진 몸**(지름 3.4칸)이 들어갈 수 없어
    // 뒤 친구가 서로 막혀 상자 앞까지 못 왔다(도토리는 3칸 앞에서 10프레임 넘게 멈춰 있었다).
    // 몸이 다 들어가게 2.6칸으로 벌린다.
    return new THREE.Vector3(chest.x+inward*(1.7+q.i*2.6),GROUND_Y,chest.z-0.6-q.i*0.5);
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
      // 0206 10바퀴 — 2.0 배에서는 방도 넓어져 같은 속도로는 한 판이 1.94배 길어졌고,
      // 60초 자유 실행에서 전투가 '씨앗 보관함으로'(equip)에서 못 넘어갔다(검토 5/5회).
      // **걷는 빠르기를 크기에 맞춰** 올린다(1.35배 때와 같은 시간이 걸리도록).
      const sizeMul=(config.actorScale||1.35)/1.35;
      // 0050 ② — 도망 1.6초에 땅콩 34.0 · 완두콩 39.8px(목표 40). 둘 다 숨는 자리를
      // 3.5~4.1칸 **남긴 채** 시간이 끝났다 → 겁먹은 걸음을 더 빠르게(4.4 → 5.4).
      const base=(frame.id==='escape'||frame.id==='recover'?5.4:frame.id==='fetch'?4.0:frame.id==='equip'?4.6:3)*sizeMul;   // 2350 — 책상 밀고 상자까지 다녀오려면 더 빨라야 한다   // 13바퀴 재작업 — 4.8 은 너무 빨라 0.6초 토막에 걷는 모습이 거의 안 남았다(가져오기 2.92)
      goals.set(a.key,{x:goal.x,z:goal.z,speed:base*(a.paceMul||1)});
    }
    const handling=frame.id==='equip'||frame.id==='recover';
    const launcherActive=['fetch','bazooka','mess'].includes(frame.id);
    const stowing=['escape','hide','peek','recover'].includes(frame.id);
    const launcherOut=(g,i)=>actors.some(a=>a.key===operators[i]) &&
      (launcherActive || stowing && g.userData.leftAt && (g.userData.retract||0)<1);
    const launcherBoxes=()=>mounts.map((g,i)=>{
      // A toy stored inside a locker shares the locker's collision box.
      if(!launcherOut(g,i) || g.userData.fetched && launcherActive)return null;
      g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g);
      return {key:'launcher-'+i,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,
              ignoreKeys:stowing?[]:[operators[i]]};
    }).filter(Boolean);
    const offstage=handling || [...motion.agents.values()].some(a=>a.position.z>6 || Math.abs(a.position.x)>19.5);
    motion.minX=offstage?-39:-20.5;
    motion.maxX=offstage?39:20.5;
    motion.maxZ=offstage?28.5:6.5;
    const originalDesks=(frame.id==='work'||frame.id==='notice') && desks.allHome();
    const activeWalls=originalDesks
      ? (offstage?office.obstacles:furnitureObstacles)
      : (offstage?fixedObstacles:furnitureObstacles.filter(o=>!/^(desk|crate)-/.test(o.key)));
    const walls=[...activeWalls,...launcherBoxes()];
    motion.obstacles=originalDesks?walls:[...walls,...desks.obstacles(motion)];
    if(PATH_ON){desks.update(frame,motion,goals,walls,dt);motion.step(goals,dt);}
    for(const a of actors){
      const state=motion.agents.get(a.key),old=a.lastPhysical || state.position;
      const dx=state.position.x-old.x,dz=state.position.z-old.z;
      // 몸 자리는 늘 길 찾기가 정한다(13바퀴 재작업 — panicWalk 삭제).
      // 영상검사 ① — 한 프레임에 5.845 순간이동한 적이 있다(다른 여섯은 0.16~0.20).
      // 걸음은 제일 빨라야 4.8/초 = 0.08/프레임이라, 그 3배(0.25)를 넘으면 **끊어서** 따라간다.
      {
        const px=a.wrapper.position.x, pz=a.wrapper.position.z;
        const jx=state.position.x-px, jz=state.position.z-pz, jump=Math.hypot(jx,jz);
        const CAP=1.20;   // 0.25·0.60 으로 조이니 가져오기 걸음이 끊겼다(2.40·3.08). 보통 한 프레임 0.2 이하라 1.2 면 순간이동(5.845)만 잡힌다.
        if(jump>CAP && a.settled && !handling){
          a.wrapper.position.x=px+jx/jump*CAP; a.wrapper.position.z=pz+jz/jump*CAP;
        }else{
          a.wrapper.position.x=state.position.x; a.wrapper.position.z=state.position.z;
        }
        a.settled=true;   // 첫 프레임(자리 잡기)은 그대로 둔다
      }
      // 영상검사 ② — 발이 몸을 못 따라가 미끄러져 보였다(도토리 29 · 해바라기씨 20).
      // 걸음 장단을 **시간**이 아니라 **실제로 움직인 거리**에 맞춘다.
      a.stride=(a.stride||0)+Math.hypot(dx,dz)*3.6;
      a.realMoving=Math.hypot(dx,dz)>.004;
      // The clearance cylinder encloses every yaw. Keep the body upright so
      // an equip bend cannot lean outside that cylinder into a desk/crate.
      a.wrapper.rotation.x=0;a.wrapper.rotation.z=0;
      // …그리고 **그 안쪽**(visualRoot)에 전투 자세를 입힌다. 길 계산은 wrapper 만 보므로
      // 책상에 기대 들어갈 걱정 없이 숙이고 흔드는 모습이 화면에 보인다.
      if(frame.active){
        a.visualRoot.rotation.x=a.battleTiltX||0;a.visualRoot.rotation.z=a.battleTiltZ||0;
        if(a.deskHandling?.contact){
          const stride=Math.abs(Math.sin(a.stride*1.25));
          a.wrapper.position.y=.02*stride;
          a.wrapper.scale.y=1-.035*(1-stride);
          a.visualRoot.rotation.x=a.deskHandling.returning?-.09:.20;
          a.visualRoot.rotation.z=Math.sin(a.stride*1.25)*.035;
        }else if(handling && a.realMoving && !a.held)a.wrapper.position.y+=Math.abs(Math.sin(a.stride*1.25))*.065;
      }
      const attacking=['ready','throw','gun','fetch','bazooka','mess'].includes(frame.id);
      // v8g: 평소엔 저마다 자기 책상(a.idleYaw)을 본다 — 예전처럼 전원 0(정면)으로 맞추지 않는다.
      // 걸을 땐 가는 쪽을 보고(미끄러지듯 가지 않게), 수다 중엔 상대를 본다.
      const moving=Math.hypot(dx,dz)>.004;
      // 0010 답 1: 뒤돌아 싸우는 건 그대로 두되, **전투 전(놀람)** 에는 손님 쪽을 본다 —
      // 그래야 돌아서기 직전에 얼굴이 보인다.
      const faceCamera=Math.atan2(camera.position.x-state.position.x,camera.position.z-state.position.z);
      const idleFace=frame.id==='notice'?faceCamera
        :(a.poseGoal?.lookYaw!==undefined?a.poseGoal.lookYaw:(a.idleYaw??0));
      // 0206 10바퀴 — 놀라는 1초 동안은 **걷던 중이라도** 손님 쪽을 본다. 수다·커피로 가던
      // 친구가 등을 보인 채 놀라서 제일 중요한 '놀란 얼굴'이 안 보였다(땅콩·도토리).
      const yaw=a.deskHandling?.contact?a.deskHandling.yaw
        :attacking?Math.atan2(-state.position.x*.06,windowZ-state.position.z)
        :frame.id==='notice'?faceCamera
        :['work','recover'].includes(frame.id)?(moving?Math.atan2(dx,dz):idleFace)
        :moving?Math.atan2(dx,dz):a.facing;
      // 걷기 시작할 때는 더 빨리 돌아선다 — 천천히 돌면 몸이 옆으로 미끄러지는 것처럼 보인다
      // (2208 ③ "걷다가 미끄러지듯 미끄럼 X").
      // 영상검사 ② — 길이 꺾이는 도망·복귀에서는 조금 더 빨리 돌아선다(26 은 한 프레임 78도까지
    // 꺾여 뚝 끊겨 보였다). 느리게 돌면 몸이 가는 쪽을 못 보고 미끄러지는 것처럼 보인다.
    const turnRate=frame.id==='notice'?14:['escape','hide','peek','recover'].includes(frame.id)?17:moving?16:8;
      a.facing+=Math.atan2(Math.sin(yaw-a.facing),Math.cos(yaw-a.facing))*Math.min(1,dt*turnRate);a.wrapper.rotation.y=a.facing;
      a.lastPhysical={...state.position};a.shadow.position.set(state.position.x,.01,state.position.z);
      const operator=operators.indexOf(a.key);
      if(operator>=0 && frame.id==='fetch'){const dk=standBy(parked[operator],operator);if(Math.hypot(state.position.x-dk.x,state.position.z-dk.z)<.18)mounts[operator].userData.fetched=true;}
    }
    actors.forEach((a,i)=>{
      if(!a.equipment)return;
      a.wrapper.updateMatrixWorld(true);
      const heldPosition=(a.visualRoot || a.wrapper).localToWorld(handOffset(a).clone());
      if(frame.id==='equip')a.equipment.position.copy(a.chestGrab||a.weaponRest).lerp(heldPosition,a.pickupBlend || 0);   // 2350 — 무기는 보관함에서 꺼낸다
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
      // 8바퀴 검토 ⑤ — 'notice' 때는 아직 아무도 집지 않았는데 상자 속 씨앗총이 보여서
      // 1.35배로 커진 몸(완두콩 얼굴·쌀·땅콩 옆구리)을 가로질렀다. 챙기기(equip)부터 보인다.
      // 2315 — 씨앗 총도 **보관함에 다녀온 뒤**(씨앗 보관함으로 단계 중턱)부터 손에 들린다.
      // 2345 — 상자 **가까이 닿은 뒤**부터 손에 들린다(가서 꺼내 오는 것이 보이게).
      const gotSeeds=frame.id!=='equip' || a.pickupBlend>0;
      a.equipment.visible=!emotionOverride && !['work','lookup','notice','escape','hide','peek','recover'].includes(frame.id) && !pushingLauncher && gotSeeds;
      if(a.weapon){
        a.weapon.lookAt(new THREE.Vector3(a.homePos.x,2.8,windowZ));
        a.muzzleFlash.visible=frame.id==='gun' && now<a.flashUntil;
      }
      // 0224 P16·P17·P18·P19·P21 — 화면에 늘 4~7개가 날아다니게, 친구마다 다른 간격으로,
      // 일부러 40%는 빗나가게(천장·바닥·옆 친구 머리 위), 던지는 물건도 네 가지를 섞는다.
      // 7바퀴 영상분석 ① — 바주카·유리창 엉망(7~9초)은 통나무 미는 둘만 움직이고 나머지 다섯은
      // 가만히 서 있어서 **평소보다도 조용했다**(1초 변화량 0.77~0.82 vs 평소 1.4~2.6).
      // 미는 둘 말고는 그 동안에도 계속 던지게 한다.
      // 13바퀴 재작업(영상검사 ③) — `fetch` 가 빠져 있어서 **통나무 가지러 가는 동안 다섯 명이
      // 가만히 서 있었다**(토막 변화량 2.95 · 평소 4.23). 미는 둘 말고는 그때도 계속 던진다.
      const stillThrowing=['throw','gun'].includes(frame.id) ||
        (['fetch','bazooka','mess'].includes(frame.id) && !operators.includes(a.key));
      if(SEEDS_ON && !emotionOverride && stillThrowing && a.held && now>=a.nextShot){
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
      // 0206 10바퀴 — 돌아올 때는 통나무도 **제자리로 치운다**. 쏘던 자리에 두고 오면
      // 주인이 집으로 돌아오는 길과 화면에서 겹쳤다(복귀·빼꼼에서 25회).
      const pushed=!operator?0
        // 13바퀴 4차 — 0.45 부터 움직이면 영상 1초 토막(0~0.29) 안에서 통나무가 **한 번도 안 움직인다**.
        :frame.id==='fetch'?smooth(clamp((frame.progress-.22)/.78,0,1))
        :frame.id==='hide'?1-smooth(clamp(frame.progress/.35,0,1))   // 다 숨자마자 얼른 제자리로 치운다
        :['peek','recover'].includes(frame.id)?0
        :['bazooka','mess','escape'].includes(frame.id)?1:0;
      // 2315 — 평소에는 **보관함 안**(화면에 없음). 가지러 가는 순간부터 보인다.
      const previous=g.position.clone();
      g.visible=launcherOut(g,i);
      g.position.copy(parked[i]).lerp(deployed[i],pushed);
      // 5바퀴 불통: 통나무 뒤끝이 미는 친구 몸에 박히고 받침다리가 떴다.
      // 미는 사람 **앞쪽 옆**(몸 반지름 + 0.35)에 두고 바퀴 높이를 바닥에 맞춘다.
      // 5바퀴 불통: 통나무가 미는 친구 몸에 박히고 받침다리가 떴다.
      // 바깥쪽 **옆**(화면에서 겹치지 않는 쪽)으로 몸 반지름 + 0.8 만큼 떨어뜨리고
      // 바퀴 높이는 바닥에 맞춘다. 미는 동안엔 길 계산에서 주인만 이 통나무를 무시한다.
      // 1241 ①: escape 뒤에도 보정을 유지한다(안 그러면 도망부터 원래 자리로 돌아가
      // 통나무가 주인 몸을 관통했다 — 6바퀴 불통 84.6%). 밀어내는 거리는 2.00 → 0.75
      // (2.00 은 오른쪽을 화면 밖으로, 왼쪽을 화분 속으로 보냈다).
      if(['fetch','bazooka','mess'].includes(frame.id) && g.userData.fetched && operator){
        const out=pushSide(i);
        const gap=(operator.bodyRadius||.6)+PUSH_GAPS[i];
        g.position.x=operator.wrapper.position.x+out*gap;
        g.position.z=operator.wrapper.position.z-PUSH_BACK;
        g.userData.leftAt=g.position.clone();
      }else if(stowing && g.visible){
        const u=Math.min(1,(g.userData.retract||0)+dt/.85);
        g.position.copy(g.userData.leftAt).lerp(parked[i],smooth(u));
        const box=new THREE.Box3().setFromObject(g);
        const x=previous.x-g.position.x,z=previous.z-g.position.z;
        const swept={minX:box.min.x+Math.min(0,x),maxX:box.max.x+Math.max(0,x),
          minZ:box.min.z+Math.min(0,z),maxZ:box.max.z+Math.max(0,z)};
        // Leave the same walking clearance on both sides of the handoff.
        const blocked=[...motion.agents.values()].some(a=>rectangleGap(a.position,swept)<a.radius+.055);
        if(blocked)g.position.copy(previous);
        else{g.userData.retract=u;g.visible=u<1;}
      }
      g.position.y=GROUND_Y;
      // 13바퀴 4차(영상검사 ③) — '가지러 가서 **들어올리는**' 것이 보이게. 0.16~0.34 동안
      // 통나무 앞끝이 들렸다가 자리를 잡는다. 이 토막 1초는 그동안 완전히 정지 그림이었다.
      if(frame.id==='fetch' && frame.progress>.16 && frame.progress<.34 && operator){
        const u=clamp((frame.progress-.16)/.18,0,1), lift=Math.sin(Math.PI*u);
        g.position.y+=lift*0.42;
        g.rotation.x=g.userData.restRotation.x-lift*0.40;
      }
      if(frame.id==='bazooka' && operator && !emotionOverride && now>=g.userData.fireAt){
        const aim=target(i,'bazooka');g.lookAt(aim);g.updateMatrixWorld(true);
        if(projectiles.fire(g.localToWorld(new THREE.Vector3(0,0,.57)),aim,'bazooka',now,1)){g.userData.fireAt=now+1.3;g.userData.flashUntil=now+.16;}
      }
      g.position.z+=Math.max(0,(g.userData.flashUntil-now)/.16)*.07;g.userData.flash.visible=frame.id==='bazooka' && now<g.userData.flashUntil;
    });
    // Attached pushers and carts advance together. Check their current poses
    // after both moved, rather than comparing a new actor to yesterday's cart.
    motion.obstacles=[...activeWalls,...(originalDesks?[]:desks.obstacles(motion)),...launcherBoxes()];
    if(motion.overlaps().length && motion.overlapFrames===overlapFramesBefore)motion.overlapFrames++;
    projectiles.update(now);
  }
  const api={
    chestSpot(a){return weaponChestSpot(a);},        // 2350 검사용 — 무기 상자 앞 자리
    setWindowSize(w,h){windowWidth=w;windowHeight=h;mess.resize?.(w,h);return {windowWidth,windowHeight};},
    // 1135 — 창틀은 '정적 굽기'에 들어가 있어서 크기를 바꾸면 **다시 구워야** 화면에 반영된다.
    navigation(){return JSON.parse(JSON.stringify({obstacles:motion.obstacles,agents:[...motion.agents.values()]}));},
    demo(){emotionOverride=null;document.getElementById('startOverlay').style.display='none';return director.begin(true);},
    emotion(name){if(name && !EMOTIONS[name])throw new Error('Unknown emotion');if(director.active)return {ignored:true,reason:'shared encounter mode',emotion:frame.emotion};emotionOverride=name || null;document.getElementById('startOverlay').style.display='none';resetActors();return name || 'auto';},
    quality(mode){if(!['auto','low','medium','high'].includes(mode))throw new Error('Unknown quality');quality.choose(mode);applyQuality();return quality.current;},
    // Synthetic levels exercise this same director without ever opening a camera.
    testDetection(level){if(level!==null && ![0,1,2,3].includes(level))throw new Error('Invalid detection level');testLevel=level;if(level!==null){emotionOverride=null;document.getElementById('startOverlay').style.display='none';}return level;},
    inspect(){return {scene:{...frame},emotionOverride,attackSeconds:ATTACK_SECONDS,encounterSeconds:ENCOUNTER_SECONDS,hits:mess.hits,impactKinds:{...mess.byKind},shots:{...projectiles.shots},projectilePeak:projectiles.peak,lastCompleted,
      quality:quality.current,qualityMode:quality.mode,qualityChanges:[...qualityChanges],render:pipeline.inspect(),bake:office.bake.inspect(),motion:motion.inspect(),fps:lastFPS,environment:office.info.hdr,assets:office.info,
      models:getActors().map(a=>({key:a.key,mode:frame.mode,emotion:a.emotion,eyeSurfaces:a.emotionRig?.eyes,canThrow:a.def.canThrow,hasWeapon:!!a.weapon,held:a.held,pickupBlend:a.pickupBlend || 0,position:a.wrapper.position.toArray(),facing:a.facing,windowFacing:Math.cos(a.facing)<-.95,equipment:a.equipment?.position.toArray(),crate:a.cratePosition.toArray()})),
      pickups:[...pickupEvents],events:[...phaseEvents],stages:SCENES.map(s=>({...s})),deskMove:desks.inspect(),testLevel,cameraStored:false};},
  };
  function disposeActor(a){
    motion.remove(a.key);
    a.emotionRig?.dispose();
    for(const root of [a.equipment,a.crate]){if(!root)continue;root.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();for(const m of [o.material].flat())if(m!==flashMaterial)m.dispose();});scene.remove(root);}
  }
  return {prepareActor,disposeActor,rebuildWorld,office,update,animateActor,updateEmotion,afterActors,api,ready:office.ready,render:()=>pipeline.render(),resize:()=>pipeline.resize(),
    get active(){return director.active;},get preview(){return !!emotionOverride;},get frame(){return frame;},get quality(){return quality.current;},setFPS(fps){lastFPS=fps;}};
}
