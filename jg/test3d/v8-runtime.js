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
const hand=new THREE.Vector3(.40,.38,.30);
export function createV8(config){
  const {scene,renderer,camera,dirLight,windowZ,windowWidth,windowHeight,windowBottom,getActors,bazookaGroup,resize,resetActors}=config;
  const office=furnishOffice(config),director=new SceneDirector(),quality=new AdaptiveQuality(),pipeline=createRenderPipeline(renderer,scene,camera);
  const motion=new MotionWorld();let furnitureObstacles=[];
  const actorScale=config.actorScale || 1,propScale=actorScale*.75;
  const mess=new WindowMess(scene,{width:windowWidth,height:windowHeight,z:windowZ,bottom:windowBottom});
  const projectiles=new SeedProjectiles(scene,(point,kind)=>mess.impact(point,kind),Math.sqrt(actorScale));
  const mounts=[bazookaGroup,new THREE.Group()];scene.add(mounts[1]);
  const parked=[new THREE.Vector3(-8,propScale*.5,3.1),new THREE.Vector3(0,propScale*.5,-6.2)];
  const deployed=[new THREE.Vector3(-8,propScale*.5,-.8),new THREE.Vector3(0,propScale*.5,-6.8)];
  const operators=['byeongari','ssal'];
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
    // Small equipment boxes share the desk footprint; they do not wall off
    // the walking aisles behind the seven workstations.
    a.cratePosition=a.homePos.clone().add(new THREE.Vector3(Math.cos(a.deskYaw)*1.6,config.deskScale*.42,Math.cos(a.deskYaw)*.3));
    a.pickupPosition=a.homePos.clone().add(new THREE.Vector3(0,0,.25));
    a.weaponRest=a.cratePosition.clone().add(new THREE.Vector3(0,.35,0));
    const covers={dotori:[-9.5,-5.1],bam:[-7.6,-5.1],ddangkong:[-8.8,-7.3],byeongari:[-11.4,-5.1],wandukong3:[7.1,-5.1],haebaragi:[9.2,-7.3],ssal:[9.2,-5.1]};
    a.cover=new THREE.Vector3(covers[a.key][0],0,covers[a.key][1]);
    a.coverPeek=a.cover.clone();a.coverPeek.x+=a.cover.x<0?2.2:-2.2;a.coverPeek.z+=1.2;
    const crate=office.assets.model('cardboardBoxOpen',[.65,.35,.55]);
    if(crate){crate.position.copy(a.cratePosition);scene.add(crate);a.crate=crate;}
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
    a.bodyRadius=radius+.045;a.facing=0;a.motionGoal=a.homePos.clone();
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
    mounts.forEach((g,i)=>{g.position.copy(parked[i]);g.userData.flash.visible=false;g.userData.fetched=false;});
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
      const p=motion.agents.get(a.key)?.position;return !a.held || !p || Math.hypot(p.x-a.homePos.x,p.z-a.homePos.z)>.15;
    });
    const fetchWaiting=frame.id==='fetch' && frame.progress>.4 && mounts.some((g,i)=>getActors().some(a=>a.key===operators[i]) && !g.userData.fetched);
    const firingWaiting=frame.id==='fetch' && frame.progress>.9 && operators.some((key,i)=>{const p=motion.agents.get(key)?.position;return p && Math.hypot(p.x-deployed[i].x,p.z-deployed[i].z-1.8)>.15;});
    const waiting=equipWaiting || fetchWaiting || firingWaiting || travelling && getActors().some(a=>{
      const p=motion.agents.get(a.key)?.position,target=frame.id==='escape'?a.cover:a.homePos;
      return !p || Math.hypot(p.x-target.x,p.z-target.z)>.15;
    });
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
    return order.slice(0,order.indexOf(a.key)).every(key=>{
      const actor=getActors().find(other=>other.key===key),p=motion.agents.get(key)?.position,target=returning?actor.homePos:actor.cover;
      return p && Math.hypot(p.x-target.x,p.z-target.z)<.15;
    });
  }
  function animateActor(a,dt,t){
    const p=profile[a.key],phase=t*p.pace+a.phase,i=getActors().indexOf(a),id=frame.id;
    a.wrapper.position.copy(a.homePos);a.wrapper.scale.set(1,1,1);a.wrapper.rotation.set(0,0,0);a.wrapper.visible=true;a.cargoMesh.visible=false;
    a.action=id;a.movePhase='idle';a.gunActive=id==='gun' && a.fireIndex%2===(frame.progress<.5?0:1);
    a.motionGoal=a.homePos;
    if(emotionOverride)return;
    if(id==='notice'){
      const u=clamp(frame.age/.35,0,1);a.wrapper.rotation.y=(i%2?1:-1)*Math.sin(u*Math.PI)*.25;
      a.wrapper.scale.y=1-.08*u;a.wrapper.rotation.x=-.12*u;a.wrapper.position.y=Math.sin(u*Math.PI)*p.hop;
    }else if(id==='equip'){
      // All move within 0.24 seconds; every pickup has a visible bend/reach.
      const age=Math.max(0,frame.age-(i%4)*.1),u=age/4.7;
      a.motionGoal=a.held?a.homePos:a.pickupPosition;
      if(u<.40)walk(a,a.homePos,a.pickupPosition,u/.40,t);
      else if(u<.70){a.wrapper.position.copy(a.pickupPosition);const bend=Math.sin((u-.40)/.30*Math.PI);a.wrapper.rotation.x=-.26*bend;a.wrapper.scale.y=1-.12*bend;}
      else walk(a,a.pickupPosition,a.homePos,(u-.70)/.30,t);
      const physical=motion.agents.get(a.key)?.position;
      if(physical && Math.hypot(physical.x-a.pickupPosition.x,physical.z-a.pickupPosition.z)<.18)a.pickupDwell=(a.pickupDwell || 0)+dt;
      a.pickupBlend=smooth((a.pickupDwell || 0)/.45);a.held=a.pickupBlend>=1;
      if(a.held && !a.pickupLogged){a.pickupLogged=true;pickupEvents.push({key:a.key,kind:a.def.canThrow?'gun':'ammunition',at:frame.elapsed,from:a.weaponRest.toArray(),atActor:[physical.x,0,physical.z]});}
    }else if(['ready','throw','gun','fetch','bazooka','mess'].includes(id)){
      a.held=true;a.wrapper.rotation.x=-.08;a.wrapper.rotation.z=p.tilt*.25;
      if(['throw','gun'].includes(id)){const beat=Math.max(0,Math.sin(phase*7));a.wrapper.position.y=beat*p.hop*.35;a.wrapper.rotation.x-=beat*.10;}
      if(id==='mess')a.wrapper.position.y=Math.abs(Math.sin(phase*4))*p.hop*.5;
      const operator=operators.indexOf(a.key);
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
      const u=clamp((frame.age-(i%4)*.1)/2.65,0,1);
      walk(a,a.escapeFrom || a.homePos,a.cover,u,t);a.wrapper.rotation.x=-.15;
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
  }
  function updateEmotion(a,t){
    const name=frame.active?frame.emotion:emotionOverride || (a.action==='dozing'?'tired':'working');
    a.emotionRig?.update(name,t,frame.active,frame.id==='notice'?'notice':null);
    if(frame.active || emotionOverride)a.thoughtSprite.visible=false;
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
      goals.set(a.key,{x:goal.x,z:goal.z,speed:frame.id==='escape'||frame.id==='recover'?5:frame.id==='fetch'?4.8:3});
    }
    const launcherBoxes=mounts.map((g,i)=>{g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g);return {key:'launcher-'+i,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,ignoreKeys:frame.id==='fetch' && g.userData.fetched?[operators[i]]:[]};});
    motion.obstacles=[...furnitureObstacles,...launcherBoxes];motion.step(goals,dt);
    for(const a of actors){
      const state=motion.agents.get(a.key),old=a.lastPhysical || state.position;
      const dx=state.position.x-old.x,dz=state.position.z-old.z;
      a.wrapper.position.x=state.position.x;a.wrapper.position.z=state.position.z;
      // The clearance cylinder encloses every yaw. Keep the body upright so
      // an equip bend cannot lean outside that cylinder into a desk/crate.
      a.wrapper.rotation.x=0;a.wrapper.rotation.z=0;
      const attacking=['ready','throw','gun','fetch','bazooka','mess'].includes(frame.id);
      const yaw=attacking?Math.atan2(-state.position.x*.06,windowZ-state.position.z):['work','recover','notice'].includes(frame.id)?0:Math.hypot(dx,dz)>.001?Math.atan2(dx,dz):a.facing;
      a.facing+=Math.atan2(Math.sin(yaw-a.facing),Math.cos(yaw-a.facing))*Math.min(1,dt*8);a.wrapper.rotation.y=a.facing;
      a.lastPhysical={...state.position};a.shadow.position.set(state.position.x,.01,state.position.z);
      const operator=operators.indexOf(a.key);
      if(operator>=0 && frame.id==='fetch' && Math.hypot(state.position.x-parked[operator].x,state.position.z-(parked[operator].z+1.8))<.18)mounts[operator].userData.fetched=true;
    }
    actors.forEach((a,i)=>{
      if(!a.equipment)return;
      a.wrapper.updateMatrixWorld(true);
      const heldPosition=(a.visualRoot || a.wrapper).localToWorld(hand.clone());
      if(frame.id==='equip')a.equipment.position.copy(a.weaponRest).lerp(heldPosition,a.pickupBlend || 0);
      else if(a.held)a.equipment.position.copy(heldPosition);
      else if(['escape','hide','peek','recover'].includes(frame.id)){
        const drop=a.weaponRest.clone();
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
      const operator=actors.find(a=>a.key===operators[i]);
      const pushed=!operator?0:frame.id==='fetch'?smooth((frame.progress-.45)/.55):['bazooka','mess','escape','hide','peek','recover'].includes(frame.id)?1:0;
      g.position.copy(parked[i]).lerp(deployed[i],pushed);
      if(frame.id==='fetch' && g.userData.fetched && operator){g.position.x=operator.wrapper.position.x;g.position.z=operator.wrapper.position.z-1.8;}
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
      return {key:'launcher-'+i,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z};
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
