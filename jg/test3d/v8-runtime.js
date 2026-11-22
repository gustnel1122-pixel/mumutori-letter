import * as THREE from 'three';
import {SceneDirector,AdaptiveQuality,SCENES,ATTACK_SECONDS,ENCOUNTER_SECONDS} from './v8-director.js?v=20261122-8b';
import {createEmotionRig,EMOTIONS} from './v8-emotions.js?v=20261122-8b';
import {furnishOffice,makePeaGun,makeAcornBazooka} from './v8-office.js?v=20261122-8b';
import {WindowMess,SeedProjectiles} from './v8-effects.js?v=20261122-8b';

export function createV8(config){
  const {scene,renderer,dirLight,floor,windowMesh,windowZ,windowWidth,windowHeight,windowBottom,getActors,bazookaGroup,resize,resetActors}=config;
  const office=furnishOffice(config),director=new SceneDirector(),quality=new AdaptiveQuality(/Android/.test(navigator.userAgent)?1:2);
  const mess=new WindowMess(scene,{width:windowWidth,height:windowHeight,z:windowZ,bottom:windowBottom});
  const projectiles=new SeedProjectiles(scene,(point,kind)=>mess.impact(point,kind));
  const mounts=[bazookaGroup,new THREE.Group()];scene.add(mounts[1]);
  const mountPositions=[new THREE.Vector3(4.1,.66,-.7),new THREE.Vector3(-4.05,.62,-2.65)];
  const flashMaterial=new THREE.MeshBasicMaterial({color:0xffe48b,transparent:true,opacity:.9});
  mounts.forEach((g,i)=>{
    g.clear();g.add(makeAcornBazooka());g.position.copy(mountPositions[i]);
    g.lookAt(new THREE.Vector3(i? -2:2,2.4,windowZ));
    const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.16),flashMaterial);flash.position.z=.53;flash.visible=false;g.add(flash);g.userData.flash=flash;g.userData.fireAt=0;g.userData.flashUntil=0;
  });
  let lastScene='work',emotionOverride=null,frame=director.snapshot(),lastTime=0,lastFPS=0,lastCompleted=null,qualityChanges=[];
  let previousActive=false;
  function applyQuality(){const q=quality.current;office.quality(q);resize();qualityChanges.push({time:performance.now(),quality:q.id,scale:q.scale});}
  applyQuality();
  const profile={dotori:{hop:.14,tilt:.08,pace:1},bam:{hop:.07,tilt:-.16,pace:.78},ddangkong:{hop:.06,tilt:.13,pace:1.15},
    byeongari:{hop:.20,tilt:-.1,pace:1.3},wandukong3:{hop:.13,tilt:.08,pace:1.5},haebaragi:{hop:.015,tilt:.02,pace:.45},ssal:{hop:.09,tilt:-.09,pace:.9}};
  function target(i,kind){
    const spread=kind==='bazooka'?1.7:5.55;
    return new THREE.Vector3(THREE.MathUtils.clamp((Math.random()-.5)*spread*2+(kind==='bazooka'?(i? -2.2:2.2):0),-windowWidth/2+.6,windowWidth/2-.6),
      windowBottom+.75+Math.random()*(windowHeight-1.25),windowZ+.05);
  }
  function prepareActor(actor){
    office.upgradeTree(actor.model);actor.emotionRig=createEmotionRig(actor);
    actor.fireIndex=['dotori','bam','ddangkong','byeongari','wandukong3','ssal'].indexOf(actor.key);
    actor.weapon=null;actor.nextShot=0;
    if(actor.def.canThrow){
      const gun=makePeaGun();gun.position.set(.31,.61,.17);gun.scale.setScalar(1.35);actor.wrapper.add(gun);gun.visible=false;
      const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.055),flashMaterial);flash.position.z=.25;flash.visible=false;gun.add(flash);
      actor.weapon=gun;actor.muzzleFlash=flash;actor.flashUntil=0;
    }
  }
  function changeScene(id){
    if(id===lastScene)return;
    lastScene=id;
    if(id==='notice'){
      mess.reset();projectiles.reset();resetActors();
      getActors().forEach((a,i)=>{a.nextShot=lastTime+i*.10;a.flashUntil=0;});
    }
    if(['throw','gun','bazooka'].includes(id)){
      getActors().forEach((a,i)=>a.nextShot=lastTime+i*.12);
      mounts.forEach((g,i)=>g.userData.fireAt=lastTime+i*.45);
    }
    if(id==='work'){
      lastCompleted={hits:mess.hits,byKind:{...mess.byKind},shots:{...projectiles.shots},peakProjectiles:projectiles.peak};
      mess.reset();projectiles.reset();resetActors();
    }
    window.dispatchEvent(new CustomEvent('jg-v8-scene',{detail:{id,elapsed:director.elapsed}}));
  }
  function update(dt,t,rawDt,level,now){
    lastTime=now;
    if(quality.sample(rawDt))applyQuality();
    frame=director.update(dt,level);changeScene(frame.id);
    if(previousActive && !frame.active)getActors().forEach(a=>{a.wrapper.scale.set(1,1,1);});previousActive=frame.active;
    mess.fade(frame.id==='recover'?frame.clean:0);
    const badge=document.getElementById('sceneBadge');
    if(badge){badge.textContent=frame.label || (frame.id==='lookup'?'누가 왔나 봐요':'');badge.style.display=frame.active || frame.id==='lookup'?'block':'none';}
    return frame;
  }
  function animateActor(a,dt,t){
    const p=profile[a.key],phase=t*p.pace+a.phase;
    const pose=emotionOverride || (frame.id==='lookup'?'surprised':frame.emotion);
    a.wrapper.position.copy(a.homePos);a.wrapper.scale.set(1,1,1);a.cargoMesh.visible=false;
    a.wrapper.rotation.x=0;a.wrapper.rotation.z=0;
    a.gunActive=frame.id==='gun' && a.fireIndex%2===(frame.progress<.5?0:1);
    const attacking=frame.id==='throw' || a.gunActive;
    // The calm sunflower keeps holding its canonical sun and never gets a gun.
    let yaw=attacking && a.def.canThrow?Math.PI+(a.homePos.x>0?-.25:.25):0;
    a.wrapper.rotation.y=THREE.MathUtils.lerp(a.wrapper.rotation.y,yaw,.12);
    if(pose==='surprised'){
      const shock=frame.id==='notice'?Math.sin(Math.min(1,frame.age/.6)*Math.PI):.5;
      a.wrapper.position.y=Math.max(0,shock)*p.hop;a.wrapper.rotation.z=p.tilt*Math.sin(phase*5);
      a.wrapper.scale.set(1+shock*.04,1-shock*.035,1+shock*.04);
    }else if(pose==='determined'){
      a.wrapper.rotation.x=-.10*p.pace;a.wrapper.rotation.z=p.tilt*.6;
      a.wrapper.position.y=.012*Math.sin(phase*7);
    }else if(pose==='excited'){
      const beat=Math.max(0,Math.sin(phase*7));a.wrapper.position.y=beat*p.hop*.65;
      a.wrapper.rotation.x=-beat*.13*p.pace;a.wrapper.rotation.z=Math.sin(phase*5)*p.tilt*.45;
    }else if(pose==='proud'){
      a.wrapper.position.y=Math.abs(Math.sin(phase*4))*p.hop*.55;
      a.wrapper.rotation.z=Math.sin(phase*3)*p.tilt;
    }else if(pose==='tired'){
      a.wrapper.rotation.z=p.tilt*1.5;a.wrapper.rotation.x=.07+Math.sin(phase)*.035;
    }else a.wrapper.position.y=Math.abs(Math.sin(phase*5))*.015;
    a.action=frame.id;a.movePhase='idle';
    if(a.weapon){
      a.weapon.visible=!emotionOverride && (frame.id==='gun' || frame.id==='equip' && frame.progress>.35);
      a.muzzleFlash.visible=a.weapon.visible && lastTime<a.flashUntil;
    }
  }
  function updateEmotion(a,t){
    let name=emotionOverride || (frame.id==='work'?(a.action==='dozing'?'tired':'working'):frame.emotion);
    if(a.key==='haebaragi' && frame.active && !emotionOverride){name=['mess','celebrate'].includes(frame.id)?'proud':'working';}
    a.emotionRig?.update(name,t,frame.active && a.def.canThrow);
    if(frame.active || emotionOverride)a.thoughtSprite.visible=false;
  }
  function afterActors(t,now){
    const actors=getActors();
    if(!emotionOverride && ['throw','gun'].includes(frame.id)){
      actors.forEach((a,i)=>{
        if(!a.def.canThrow || now<a.nextShot)return;
        const kind=frame.id;
        if(kind==='gun' && !a.gunActive)return;
        const aim=target(i,kind);
        a.wrapper.updateMatrixWorld(true);
        if(kind==='gun'){a.weapon.lookAt(aim);a.weapon.updateMatrixWorld(true);}
        const start=kind==='gun'?a.weapon.localToWorld(new THREE.Vector3(0,0,.25)):a.wrapper.localToWorld(new THREE.Vector3(.16,.7,.18));
        const shape=kind==='gun'?0:['bam','byeongari','ssal'].includes(a.key)?2:a.key==='wandukong3'?0:1;
        if(projectiles.fire(start,aim,kind,now,shape)){
          a.nextShot=now+(kind==='gun'?.24+(i%3)*.025:1.05+(i%3)*.11);a.flashUntil=now+.085;
        }
      });
    }
    mounts.forEach((g,i)=>{
      const fire=frame.id==='bazooka' && !emotionOverride && now>=g.userData.fireAt;
      if(fire){
        const aim=target(i,'bazooka');g.lookAt(aim);g.updateMatrixWorld(true);
        if(projectiles.fire(g.localToWorld(new THREE.Vector3(0,0,.57)),aim,'bazooka',now,1)){
          g.userData.fireAt=now+1.3;g.userData.flashUntil=now+.16;
        }
      }
      const recoil=Math.max(0,(g.userData.flashUntil-now)/.16);
      g.position.copy(mountPositions[i]);g.position.z+=recoil*.07;
      g.userData.flash.visible=now<g.userData.flashUntil;
    });
    projectiles.update(now);
  }
  function demo(){emotionOverride=null;document.getElementById('startOverlay').style.display='none';return director.begin();}
  const api={
    demo,
    emotion(name){if(name && !EMOTIONS[name])throw new Error('Unknown emotion');emotionOverride=name || null;document.getElementById('startOverlay').style.display='none';resetActors();return name || 'auto';},
    quality(mode){if(!['auto','low','medium','high'].includes(mode))throw new Error('Unknown quality');quality.choose(mode);applyQuality();return quality.current;},
    inspect(){return {scene:{...frame},emotionOverride,attackSeconds:ATTACK_SECONDS,encounterSeconds:ENCOUNTER_SECONDS,
      hits:mess.hits,impactKinds:{...mess.byKind},shots:{...projectiles.shots},projectilePeak:projectiles.peak,lastCompleted,
      quality:quality.current,qualityMode:quality.mode,qualityChanges:[...qualityChanges],fps:lastFPS,
      environment:office.info.hdr,models:getActors().map(a=>({key:a.key,emotion:a.emotion,eyeSurfaces:a.emotionRig?.eyes,canThrow:a.def.canThrow,hasWeapon:!!a.weapon})),
      stages:SCENES.map(s=>({...s})),cameraStored:false};},
  };
  function disposeActor(a){
    a.emotionRig?.dispose();
    const materials=new Set();
    a.weapon?.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();if(o!==a.muzzleFlash)materials.add(o.material);});
    materials.forEach(m=>m.dispose());
  }
  return {prepareActor,disposeActor,office,update,animateActor,updateEmotion,afterActors,api,
    get active(){return director.active;},get preview(){return !!emotionOverride;},get frame(){return frame;},
    get quality(){return quality.current;},setFPS(fps){lastFPS=fps;},
  };
}
