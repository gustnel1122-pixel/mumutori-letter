import * as THREE from 'three';
import {SceneDirector,AdaptiveQuality,SCENES,ATTACK_SECONDS,ENCOUNTER_SECONDS} from './v8-director.js?v=20261123-8d';
import {createEmotionRig,EMOTIONS} from './v8-emotions.js?v=20261123-8d';
import {furnishOffice,makePeaGun,makeAcornBazooka} from './v8-office.js?v=20261123-8d';
import {WindowMess,SeedProjectiles} from './v8-effects.js?v=20261123-8d';
import {createRenderPipeline} from './v8-render.js?v=20261123-8d';

const smooth=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
const clamp=THREE.MathUtils.clamp;
const hand=new THREE.Vector3(.40,.38,.30);
export function createV8(config){
  const {scene,renderer,camera,dirLight,windowZ,windowWidth,windowHeight,windowBottom,getActors,bazookaGroup,resize,resetActors}=config;
  const office=furnishOffice(config),director=new SceneDirector(),quality=new AdaptiveQuality(),pipeline=createRenderPipeline(renderer,scene,camera);
  const actorScale=config.actorScale || 1,propScale=actorScale*.75;
  const mess=new WindowMess(scene,{width:windowWidth,height:windowHeight,z:windowZ,bottom:windowBottom});
  const projectiles=new SeedProjectiles(scene,(point,kind)=>mess.impact(point,kind),Math.sqrt(actorScale));
  const mounts=[bazookaGroup,new THREE.Group()];scene.add(mounts[1]);
  const parked=[new THREE.Vector3(-5.65,propScale*.5,1.3),new THREE.Vector3(5.65,propScale*.5,1.3)];
  const deployed=[new THREE.Vector3(-4.8,propScale*.5,.1),new THREE.Vector3(5.0,propScale*.5,-.1)];
  const operators=['byeongari','ssal'];
  const flashMaterial=new THREE.MeshBasicMaterial({color:0xffe48b,transparent:true,opacity:.9});
  mounts.forEach((g,i)=>{
    g.clear();g.add(makeAcornBazooka());g.scale.setScalar(propScale);g.position.copy(parked[i]);g.userData.isLauncher=true;
    g.lookAt(new THREE.Vector3(i?2:-2,2.4,windowZ));
    // These launchers are wheeled toys, pushed into place by visible operators.
    for(const x of [-.25,.25])for(const z of [-.32,.32]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.08,16),new THREE.MeshStandardMaterial({color:0x80542f,roughness:.65}));
      wheel.rotation.z=Math.PI/2;wheel.position.set(x,-.42,z);g.add(wheel);
    }
    const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.16),flashMaterial);flash.position.z=.53;flash.visible=false;g.add(flash);
    g.userData.flash=flash;g.userData.fireAt=0;g.userData.flashUntil=0;
  });
  let frame=director.snapshot(),lastScene='work',emotionOverride=null,lastTime=0,lastFPS=0,lastCompleted=null,qualityChanges=[],testLevel=null;
  const phaseEvents=[],pickupEvents=[];
  function applyQuality(){const q=quality.current;office.quality(q);resize();pipeline.quality(q);qualityChanges.push({time:performance.now(),quality:q.id,pixelRatio:renderer.getPixelRatio()});}
  applyQuality();
  document.addEventListener('visibilitychange',()=>quality.resetSamples());
  const profile={dotori:{hop:.14,tilt:.08,pace:1},bam:{hop:.07,tilt:-.16,pace:.78},ddangkong:{hop:.06,tilt:.13,pace:1.15},
    byeongari:{hop:.20,tilt:-.1,pace:1.3},wandukong3:{hop:.13,tilt:.08,pace:1.5},haebaragi:{hop:.015,tilt:.02,pace:.45},ssal:{hop:.09,tilt:-.09,pace:.9}};
  function target(i,kind){
    const spread=kind==='bazooka'?1.7:windowWidth/2-.65;
    return new THREE.Vector3(clamp((Math.random()-.5)*spread*2+(kind==='bazooka'?(i?-2.2:2.2):0),-windowWidth/2+.6,windowWidth/2-.6),windowBottom+.75+Math.random()*(windowHeight-1.25),windowZ+.05);
  }
  function prepareActor(a){
    office.upgradeTree(a.model);a.emotionRig=createEmotionRig(a);a.fireIndex=['dotori','bam','ddangkong','byeongari','wandukong3','ssal'].indexOf(a.key);
    a.nextShot=0;a.flashUntil=0;a.held=false;a.pickupLogged=false;a.weapon=null;a.equipment=null;
    a.cratePosition=a.homePos.clone().add(new THREE.Vector3(-.9,0,-.5));
    a.pickupPosition=a.cratePosition.clone().add(new THREE.Vector3(-1.05,0,-.15));
    a.weaponRest=a.cratePosition.clone().add(new THREE.Vector3(0,.72,0));
    a.cover=a.key==='bam'?new THREE.Vector3(-14,0,-1):a.key==='ssal'?new THREE.Vector3(14,0,-3):new THREE.Vector3(a.homePos.x<0?-7.65:7.65,0,-5.9);
    a.coverPeek=a.cover.clone();a.coverPeek.x+=a.cover.x<0?1.5:-1.5;a.coverPeek.z+=1.3;
    if(a.key==='bam')a.coverPeek.set(-8.5,0,-1.5);
    if(a.key==='ssal')a.coverPeek.set(8.8,0,-3);
    const crate=office.assets.model('cardboardBoxOpen',[1.2,.62,.85]);
    if(crate){crate.position.copy(a.cratePosition);scene.add(crate);a.crate=crate;}
    const item=a.def.canThrow?makePeaGun():office.assets.model('cardboardBoxClosed',[.18,.16,.14]);
    if(item){
      item.scale.multiplyScalar(a.def.canThrow?actorScale*1.35:actorScale);scene.add(item);a.equipment=item;
      if(a.def.canThrow){a.weapon=item;const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.055),flashMaterial);flash.position.z=.25;flash.visible=false;item.add(flash);a.muzzleFlash=flash;}
      item.position.copy(a.weaponRest);
    }
  }
  function resetEquipment(){
    getActors().forEach(a=>{a.held=false;a.pickupLogged=false;a.wrapper.visible=true;if(a.equipment){a.equipment.position.copy(a.weaponRest);a.equipment.visible=true;a.equipment.rotation.set(0,0,0);}if(a.muzzleFlash)a.muzzleFlash.visible=false;});
    mounts.forEach((g,i)=>{g.position.copy(parked[i]);g.userData.flash.visible=false;});
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
    if(id==='work'){
      lastCompleted={hits:mess.hits,byKind:{...mess.byKind},shots:{...projectiles.shots},peakProjectiles:projectiles.peak,pickups:[...pickupEvents]};
      mess.reset();projectiles.reset();resetActors();resetEquipment();
    }
    window.dispatchEvent(new CustomEvent('jg-v8-scene',{detail:event}));
  }
  function update(dt,t,rawDt,level,now){
    lastTime=now;if(getActors().length && quality.sample(rawDt))applyQuality();
    const loaded=getActors().length>0;
    frame=director.update(loaded?dt:0,loaded?(testLevel??level):0);changeScene(frame.id);mess.fade(frame.id==='recover'?frame.clean:0);
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
  function animateActor(a,dt,t){
    const p=profile[a.key],phase=t*p.pace+a.phase,i=getActors().indexOf(a),id=frame.id;
    a.wrapper.position.copy(a.homePos);a.wrapper.scale.set(1,1,1);a.wrapper.rotation.set(0,0,0);a.wrapper.visible=true;a.cargoMesh.visible=false;
    a.action=id;a.movePhase='idle';a.gunActive=id==='gun' && a.fireIndex%2===(frame.progress<.5?0:1);
    if(emotionOverride)return;
    if(id==='notice'){
      const u=clamp(frame.age/.35,0,1);a.wrapper.rotation.y=(i%2?1:-1)*Math.sin(u*Math.PI)*.25;
      a.wrapper.scale.y=1-.08*u;a.wrapper.rotation.x=-.12*u;a.wrapper.position.y=Math.sin(u*Math.PI)*p.hop;
    }else if(id==='equip'){
      // All move within 0.24 seconds; every pickup has a visible bend/reach.
      const age=Math.max(0,frame.age-(i%4)*.1),u=age/4.7;
      if(u<.40)walk(a,a.homePos,a.pickupPosition,u/.40,t);
      else if(u<.70){a.wrapper.position.copy(a.pickupPosition);const bend=Math.sin((u-.40)/.30*Math.PI);a.wrapper.rotation.x=-.26*bend;a.wrapper.scale.y=1-.12*bend;}
      else walk(a,a.pickupPosition,a.homePos,(u-.70)/.30,t);
      a.pickupBlend=smooth((u-.46)/.18);a.held=a.pickupBlend>=1;
      if(a.held && !a.pickupLogged){a.pickupLogged=true;pickupEvents.push({key:a.key,kind:a.def.canThrow?'gun':'ammunition',at:frame.elapsed,from:a.weaponRest.toArray(),atActor:a.wrapper.position.toArray()});}
    }else if(['ready','throw','gun','fetch','bazooka','mess'].includes(id)){
      a.held=true;a.wrapper.rotation.x=-.08;a.wrapper.rotation.z=p.tilt*.25;
      if(['throw','gun'].includes(id)){const beat=Math.max(0,Math.sin(phase*7));a.wrapper.position.y=beat*p.hop*.35;a.wrapper.rotation.x-=beat*.10;}
      if(id==='mess')a.wrapper.position.y=Math.abs(Math.sin(phase*4))*p.hop*.5;
      const operator=operators.indexOf(a.key);
      if(operator>=0 && ['fetch','bazooka','mess'].includes(id)){
        const dock=parked[operator].clone().add(new THREE.Vector3(operator?-.75:.75,-parked[operator].y,.6));
        const firing=deployed[operator].clone().add(new THREE.Vector3(operator?-.75:.75,-deployed[operator].y,.6));
        if(id==='fetch' && frame.progress<.45)walk(a,a.homePos,dock,frame.progress/.45,t);
        else if(id==='fetch')walk(a,dock,firing,(frame.progress-.45)/.55,t);
        else a.wrapper.position.copy(firing);
      }
    }else if(id==='escape'){
      const u=clamp((frame.age-(i%4)*.1)/2.65,0,1);
      walk(a,a.escapeFrom || a.homePos,a.cover,u,t);a.wrapper.rotation.x=-.15;
      const crouch=smooth((u-.7)/.3);a.wrapper.scale.y=1-.2*crouch;a.wrapper.rotation.y=(a.cover.x<0?1:-1)*Math.PI/2*crouch;
    }else if(id==='hide'){
      a.wrapper.position.copy(a.cover);a.wrapper.rotation.x=-.12;a.wrapper.scale.y=.8;a.wrapper.rotation.y=(a.cover.x<0?1:-1)*Math.PI/2;
    }else if(id==='peek'){
      const u=clamp((frame.age-i*.34)/.9,0,1);
      walk(a,a.cover,a.coverPeek,u,t);a.wrapper.scale.y=.8+.2*smooth(u);a.wrapper.rotation.y=(a.cover.x<0?1:-1)*Math.PI/2*(1-smooth(u));a.wrapper.rotation.z=Math.sin(phase*3)*.07;
    }else if(id==='recover'){
      walk(a,a.coverPeek,a.homePos,clamp((frame.age-(i%3)*.12)/2.5,0,1),t);
    }
  }
  function updateEmotion(a,t){
    const name=frame.active?frame.emotion:emotionOverride || (a.action==='dozing'?'tired':'working');
    a.emotionRig?.update(name,t,frame.active,frame.id==='notice'?'notice':null);
    if(frame.active || emotionOverride)a.thoughtSprite.visible=false;
  }
  function afterActors(t,now){
    const actors=getActors();
    actors.forEach((a,i)=>{
      if(!a.equipment)return;
      a.wrapper.updateMatrixWorld(true);
      const heldPosition=(a.visualRoot || a.wrapper).localToWorld(hand.clone());
      if(frame.id==='equip')a.equipment.position.copy(a.weaponRest).lerp(heldPosition,a.pickupBlend || 0);
      else if(a.held)a.equipment.position.copy(heldPosition);
      else if(['escape','hide','peek','recover'].includes(frame.id)){
        const drop=(a.dropPosition || a.weaponRest).clone();drop.y=.16;
        a.equipment.position.copy(a.dropPosition || a.weaponRest).lerp(drop,smooth(frame.id==='escape'?frame.age/.55:1));
      }else a.equipment.position.copy(a.weaponRest);
      a.equipment.visible=!emotionOverride;
      if(a.weapon){
        a.weapon.lookAt(new THREE.Vector3(a.homePos.x,2.8,windowZ));
        a.muzzleFlash.visible=frame.id==='gun' && now<a.flashUntil;
      }
      if(!emotionOverride && ['throw','gun'].includes(frame.id) && a.def.canThrow && a.held && now>=a.nextShot){
        const kind=frame.id;if(kind==='gun' && !a.gunActive)return;
        const aim=target(i,kind);if(kind==='gun'){a.weapon.lookAt(aim);a.weapon.updateMatrixWorld(true);}
        const start=kind==='gun'?a.weapon.localToWorld(new THREE.Vector3(0,0,.25)):heldPosition;
        const shape=kind==='gun'?0:['bam','byeongari','ssal'].includes(a.key)?2:a.key==='wandukong3'?0:1;
        if(projectiles.fire(start,aim,kind,now,shape)){a.nextShot=now+(kind==='gun'?.24+(i%3)*.025:1.05+(i%3)*.11);a.flashUntil=now+.085;}
      }
    });
    mounts.forEach((g,i)=>{
      const pushed=frame.id==='fetch'?smooth((frame.progress-.45)/.55):['bazooka','mess','escape','hide','peek','recover'].includes(frame.id)?1:0;
      g.position.copy(parked[i]).lerp(deployed[i],pushed);
      const operator=actors.find(a=>a.key===operators[i]);
      if(frame.id==='bazooka' && operator && !emotionOverride && now>=g.userData.fireAt){
        const aim=target(i,'bazooka');g.lookAt(aim);g.updateMatrixWorld(true);
        if(projectiles.fire(g.localToWorld(new THREE.Vector3(0,0,.57)),aim,'bazooka',now,1)){g.userData.fireAt=now+1.3;g.userData.flashUntil=now+.16;}
      }
      g.position.z+=Math.max(0,(g.userData.flashUntil-now)/.16)*.07;g.userData.flash.visible=frame.id==='bazooka' && now<g.userData.flashUntil;
    });
    projectiles.update(now);
  }
  const api={
    demo(){emotionOverride=null;document.getElementById('startOverlay').style.display='none';return director.begin(true);},
    emotion(name){if(name && !EMOTIONS[name])throw new Error('Unknown emotion');if(director.active)return {ignored:true,reason:'shared encounter mode',emotion:frame.emotion};emotionOverride=name || null;document.getElementById('startOverlay').style.display='none';resetActors();return name || 'auto';},
    quality(mode){if(!['auto','low','medium','high'].includes(mode))throw new Error('Unknown quality');quality.choose(mode);applyQuality();return quality.current;},
    // Synthetic levels exercise this same director without ever opening a camera.
    testDetection(level){if(level!==null && ![0,1,2,3].includes(level))throw new Error('Invalid detection level');testLevel=level;if(level!==null){emotionOverride=null;document.getElementById('startOverlay').style.display='none';}return level;},
    inspect(){return {scene:{...frame},emotionOverride,attackSeconds:ATTACK_SECONDS,encounterSeconds:ENCOUNTER_SECONDS,hits:mess.hits,impactKinds:{...mess.byKind},shots:{...projectiles.shots},projectilePeak:projectiles.peak,lastCompleted,
      quality:quality.current,qualityMode:quality.mode,qualityChanges:[...qualityChanges],render:pipeline.inspect(),fps:lastFPS,environment:office.info.hdr,assets:office.info,
      models:getActors().map(a=>({key:a.key,mode:frame.mode,emotion:a.emotion,eyeSurfaces:a.emotionRig?.eyes,canThrow:a.def.canThrow,hasWeapon:!!a.weapon,held:a.held,pickupBlend:a.pickupBlend || 0,position:a.wrapper.position.toArray(),equipment:a.equipment?.position.toArray(),crate:a.cratePosition.toArray()})),
      pickups:[...pickupEvents],events:[...phaseEvents],stages:SCENES.map(s=>({...s})),testLevel,cameraStored:false};},
  };
  function disposeActor(a){
    a.emotionRig?.dispose();
    for(const root of [a.equipment,a.crate]){if(!root)continue;root.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();for(const m of [o.material].flat())if(m!==flashMaterial)m.dispose();});scene.remove(root);}
  }
  return {prepareActor,disposeActor,office,update,animateActor,updateEmotion,afterActors,api,ready:office.ready,render:()=>pipeline.render(),resize:()=>pipeline.resize(),
    get active(){return director.active;},get preview(){return !!emotionOverride;},get frame(){return frame;},get quality(){return quality.current;},setFPS(fps){lastFPS=fps;}};
}
