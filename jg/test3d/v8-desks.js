import * as THREE from 'three';
import {rectangleGap} from './v8-motion.js?v=20261123-8e';

const PAD = .06;
const MAX_DESK_SPEED = 6.2;
const ACCELERATION = 11;
const ARRIVAL = .045;
const GRIP_TOLERANCE = .11;
const ENTRY_LENGTH = 2.4;
const TURN_RADIUS = 3;
const TURN_LENGTH = Math.PI * TURN_RADIUS / 2;
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const overlap = (a,b) => Math.max(0,Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX)) *
  Math.max(0,Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ));
const rect = (p, size) => ({
  minX:p.x-size.x, maxX:p.x+size.x, minZ:p.z-size.z, maxZ:p.z+size.z,
});
const intersects = (a,b) =>
  a.minX<b.maxX && a.maxX>b.minX && a.minZ<b.maxZ && a.maxZ>b.minZ;
const union = (a,b) => ({
  minX:Math.min(a.minX,b.minX), maxX:Math.max(a.maxX,b.maxX),
  minZ:Math.min(a.minZ,b.minZ), maxZ:Math.max(a.maxZ,b.maxZ),
});

function contactShadow(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'), fade=ctx.createRadialGradient(32,32,2,32,32,32);
  fade.addColorStop(0,'rgba(49,34,20,.33)');
  fade.addColorStop(.48,'rgba(49,34,20,.15)');
  fade.addColorStop(1,'rgba(49,34,20,0)');
  ctx.fillStyle=fade;ctx.fillRect(0,0,64,64);
  const material=new THREE.MeshBasicMaterial({
    map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
}

export function createDeskMoves(camera){
  let desks=[];
  const shadow=contactShadow();
  const projected=new THREE.Vector3();

  function rebuild(roots,actors){
    const owners=new Map(actors.map(a=>[a.key,a]));
    desks=roots.map(root=>{
      root.userData.homeBounds=new THREE.Box3().setFromObject(root);
      const original=root.userData.deskContents || root;
      const chair=root.userData.chair || original.children.find(o=>o.userData.isOfficeChair);
      const payload=new THREE.Group();
      payload.name='table-and-desk-props';
      for(const child of [...original.children])if(child!==chair)payload.add(child);
      original.add(payload);root.updateMatrixWorld(true);
      root.userData.movingDesk=payload;
      const box=new THREE.Box3().setFromObject(payload);
      const center=box.getCenter(new THREE.Vector3()), half=box.getSize(new THREE.Vector3()).multiplyScalar(.5);
      const home={x:center.x,z:center.z}, size={x:half.x,z:half.z};
      const chairBounds=chair?new THREE.Box3().setFromObject(chair):null;
      const actor=owners.get(root.userData.ownerKey);
      const mark=shadow.clone();
      mark.geometry=shadow.geometry.clone();mark.material=shadow.material.clone();
      mark.rotation.x=-Math.PI/2;
      mark.position.set(center.x,.012,center.z);
      mark.scale.set(half.x*2.18,half.z*2.08,1);
      payload.attach(mark);
      const inverseParent=original.matrixWorld.clone().invert(), offsetOrigin=new THREE.Vector3().applyMatrix4(inverseParent);
      const tabletop=actor?.cratePosition.clone();
      return {root,payload,actor,chairBounds,home,size,top:box.max.y,
        key:'desk-'+root.userData.slotIndex,chairKey:'chair-'+root.userData.slotIndex,
        position:{...home},inverseParent,offsetOrigin,tabletop,
        exit:null,laneX:home.x,turn:null,travel:0,end:0,skipped:false,
        parked:false,speed:0,gripped:false,approachReady:0,pushedDistance:0,
        gripX:actor?THREE.MathUtils.clamp(actor.homePos.x-home.x,-size.x*.76,size.x*.76):0,
      };
    });
    const ordered=desks.slice().sort((a,b)=>b.home.z-a.home.z);
    ordered.forEach((d,i)=>{d.delay=i*.21;});
  }

  function place(d,p){
    d.position=p;
    const dx=p.x-d.home.x, dz=p.z-d.home.z;
    d.payload.position.set(dx,0,dz).applyMatrix4(d.inverseParent).sub(d.offsetOrigin);
    if(d.actor?.crate){
      const {actor,tabletop}=d;
      actor.crate.position.set(tabletop.x+dx,tabletop.y,tabletop.z+dz);
    }
  }

  function outside(d,x,z){
    let left=Infinity,right=-Infinity,top=-Infinity;
    // The entire workstation must have crossed one of the frame edges.
    for(const dx of [-d.size.x,d.size.x])for(const dz of [-d.size.z,d.size.z])for(const y of [0,d.top]){
      projected.set(x+dx,y,z+dz).project(camera);
      left=Math.min(left,projected.x);
      right=Math.max(right,projected.x);
      top=Math.max(top,projected.y);
    }
    return left>1.025 || right< -1.025 || top< -1.025;
  }

  function trackX(d,z,x=d.laneX){
    const u=THREE.MathUtils.smoothstep(z-d.home.z,0,ENTRY_LENGTH);
    return d.home.x+(x-d.home.x)*u;
  }

  function trackPoint(d,travel){
    const turn=d.turn;
    if(!turn || travel<=turn.start){
      const z=d.home.z+travel;
      return {x:trackX(d,z),z};
    }
    const arc=travel-turn.start;
    const angle=Math.min(arc,TURN_LENGTH)/TURN_RADIUS;
    return {
      x:d.laneX+turn.side*(TURN_RADIUS*(1-Math.cos(angle))+Math.max(0,arc-TURN_LENGTH)),
      z:d.home.z+turn.start+TURN_RADIUS*Math.sin(angle),
    };
  }

  function aisle(d,walls){
    const nearby=[
      ...walls.filter(o=>!o.key.startsWith('frame-')),
      ...desks.filter(o=>o!==d && o.chairBounds).map(o=>o.chairBounds).map(b=>({
        minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,
      })),
      ...desks.filter(o=>!o.actor).map(o=>rect(o.position,o.size)),
    ].filter(o=>o.maxZ>d.home.z-d.size.z && o.minZ<10);
    const start=rect(d.home,d.size);
    const options=[d.home.x];
    for(let step=1;step<=17;step++)options.push(d.home.x-step*.18,d.home.x+step*.18);
    for(const x of options){
      let clear=true;
      for(let z=d.home.z+.1;z<11 && clear;z+=.10){
        const a=rect({x:trackX(d,z,x),z},d.size);
        clear=!nearby.some(o=>overlap(a,o)>Math.max(0,overlap(start,o)-.01));
      }
      if(clear)return x;
    }
    return null;
  }

  function planExits(walls){
    const occupied=desks.filter(d=>d.actor).sort((a,b)=>a.home.z-b.home.z);
    for(const d of occupied){
      d.laneX=aisle(d,walls);
      d.skipped=d.laneX===null;
      d.turn=null;d.exit=null;
    }
    const sorted=occupied.filter(d=>!d.skipped);
    if(camera.aspect>=1.2){
      for(const d of sorted){
        let z=Math.max(8,d.home.z+4);
        const max=Math.min(28, camera.position.z-d.size.z-.8);
        while(z<max && !outside(d,d.laneX,z))z+=.18;
        for(const other of sorted){
          if(other===d || !other.exit)continue;
          if(Math.abs(other.exit.x-d.laneX)<other.size.x+d.size.x+.25)
            z=Math.max(z,other.exit.z+other.size.z+d.size.z+.40);
        }
        d.end=z-d.home.z;d.exit={x:d.laneX,z};
      }
      if(sorted.every(d=>d.exit.z<=28 && outside(d,d.exit.x,d.exit.z)))return;
    }
    // In portrait the camera is much farther back. The foreground never
    // reaches the bottom of the image, so use staggered side aisles instead.
    // Empty workstations still occupy the outer aisles. Keep their turn slots
    // so inner pushers cross in front of the remaining furniture.
    const lane = d=>d.laneX ?? d.home.x;
    for(const side of [-1,1]){
      const group=desks.filter(d=>(lane(d)<0?-1:1)===side).sort((a,b)=>Math.abs(lane(b))-Math.abs(lane(a)));
      group.forEach((d,i)=>{
        if(!d.actor || d.skipped)return;
        d.turn={side,start:9.3+i*5.45-TURN_RADIUS-d.home.z};
        let travel=d.turn.start+TURN_LENGTH;
        let p=trackPoint(d,travel);
        while(Math.abs(p.x)<37 && !outside(d,p.x,p.z))p=trackPoint(d,travel+=.18);
        d.end=travel;d.exit=p;
      });
    }
  }

  function handleReach(d,state){
    return Math.max(state.radius+.09,d.actor.bodyRadius*.63);
  }

  function gripPoint(d,p,state){
    return {x:p.x+d.gripX,z:p.z-d.size.z-handleReach(d,state)};
  }

  function reserveReturnPath(d,state){
    const sections=[];
    // The pusher can reach the handle from either side of its nominal point.
    // Reserve that tolerance too so another table cannot trap the pusher.
    const reach=state.radius+PAD+GRIP_TOLERANCE;
    const body={x:reach,z:reach};
    let from=trackPoint(d,0);
    for(let start=0;start<d.end;start+=.42){
      const to=trackPoint(d,Math.min(d.end,start+.42));
      sections.push({
        start,
        table:union(rect(from,d.size),rect(to,d.size)),
        pusher:union(rect(gripPoint(d,from,state),body),rect(gripPoint(d,to,state),body)),
      });
      from=to;
    }
    return sections;
  }

  function returnLaneBusy(d,table,pusher,radius){
    // Let the rear rows finish crossing a shared aisle before another table
    // parks there. As the rear table advances, the reserved path shrinks.
    for(const other of desks){
      if(!other.returnPath || other.travel<ARRIVAL || other.home.z>=d.home.z-1)continue;
      for(const section of other.returnPath){
        if(section.start>=other.travel)break;
        if(intersects(table,section.table) || intersects(table,section.pusher) ||
          rectangleGap(pusher,section.table)<radius+PAD ||
          rectangleGap(pusher,section.pusher)<radius+PAD)return true;
      }
    }
    return false;
  }

  function drive(d,state,goals,motion,dt,returning){
    const from=d.position,remaining=(returning?0:d.end)-d.travel,length=Math.abs(remaining);
    if(length<1e-8)return true;
    const grip=gripPoint(d,from,state);
    const gripGap=distance(state.position,grip);
    const yaw=Math.atan2(from.x-state.position.x,from.z-state.position.z);
    if(gripGap>GRIP_TOLERANCE){
      d.gripped=false;d.approachReady=0;d.speed=0;d.blocked='grip';
      // A moving friend can make the route end short of the handle. Once
      // that handle is free again, replace the completed detour's goal.
      if(state.arrived && !state.search && state.resolvedGoal &&
        distance(state.resolvedGoal,grip)>GRIP_TOLERANCE && motion.free(grip,state.radius,state.key,true)){
        state.goal=null;
      }
      goals.set(state.key,{...grip,speed:returning?7.0:5.8});
      d.actor.deskHandling={yaw,contact:false};
      return false;
    }
    d.actor.deskHandling={yaw,contact:true,returning,speed:0};
    d.approachReady+=dt;
    if(!d.gripped && d.approachReady<.16){
      goals.set(state.key,{...state.position,speed:0});
      return false;
    }

    // With contact established, test the table and the pusher over the same swept step.
    // Either both advance by that step or both wait.
    d.gripped=true;
    const speedLimit=MAX_DESK_SPEED*(returning?.91:1);
    const speed=Math.min(speedLimit,d.speed+ACCELERATION*dt,Math.sqrt(2*ACCELERATION*length));
    const u=THREE.MathUtils.clamp(d.travel/ENTRY_LENGTH,0,1);
    const slope=(d.laneX-d.home.x)*6*u*(1-u)/ENTRY_LENGTH;
    const step=Math.sign(remaining)*Math.min(length,speed*dt/Math.hypot(1,slope));
    const to=trackPoint(d,d.travel+step);
    const nextActor={x:state.position.x+to.x-from.x,z:state.position.z+to.z-from.z};
    const footprint=union(rect(from,d.size),rect(to,d.size));
    const obstruction=motion.obstacles.find(o=>o.key!==d.key && o.key!==d.chairKey &&
      intersects(footprint,o) && overlap(rect(to,d.size),o)>=overlap(rect(from,d.size),o));
    const hitFriend=[...motion.agents.values()].some(a=>a!==state && rectangleGap(a.position,footprint)<a.radius+PAD);
    const needsRoom=returning && returnLaneBusy(d,footprint,nextActor,state.radius);
    if(needsRoom || obstruction || hitFriend || !motion.segment(state.position,nextActor,state.radius,state.key,true)){
      d.speed=0;d.blocked=needsRoom?'return-lane':obstruction?.key || (hitFriend?'friend':'pusher');
      goals.set(state.key,{...state.position,speed:0});
      return false;
    }
    d.blocked=null;d.speed=speed;state.position=nextActor;state.path=[];state.search=null;state.goal=null;
    goals.delete(state.key);
    d.actor.deskHandling.speed=speed;
    d.pushedDistance+=distance(from,to);
    d.travel+=step;
    place(d,to);
    return Math.abs(step)===length;
  }

  function obstacles(motion){
    return desks.flatMap(d=>{
      const key=d.root.userData.ownerKey;
      const owner=motion.agents.get(key);
      const table=rect(d.position,d.size);
      // The owner can sit at the table and step out of its conservative box.
      const canExit=owner && (distance(d.position,d.home)<ARRIVAL || rectangleGap(owner.position,table)<owner.radius+.035);
      const result=[{...table,key:d.key,ignoreKeys:canExit?[key]:[]}];
      if(d.chairBounds){
        const b=d.chairBounds;
        result.push({key:d.chairKey,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,ignoreKeys:[key]});
      }
      return result;
    });
  }

  function update(frame,motion,goals,walls,dt){
    for(const d of desks)if(d.actor)d.actor.deskHandling=null;
    const returning=frame.id==='recover';
    if(frame.id!=='equip' && !returning){
      for(const d of desks){d.speed=0;d.gripped=false;d.approachReady=0;}
      if(frame.id==='work')for(const d of desks)if(distance(d.position,d.home)<ARRIVAL){
        d.exit=null;d.skipped=false;
      }
      return;
    }
    if(!returning && desks.some(d=>d.actor && !d.exit && !d.skipped)){
      planExits(walls);
      for(const d of desks)if(d.exit)d.returnPath=reserveReturnPath(d,motion.agents.get(d.actor.key));
    }
    const ordered=desks.slice().sort((a,b)=>(returning?1:-1)*(a.position.z-b.position.z));
    for(const d of ordered){
      const state=d.actor && motion.agents.get(d.actor.key);
      if(!state || d.skipped || (!returning && d.parked) || (returning && d.travel<1e-8))continue;
      if(!returning && frame.age<d.delay){
        goals.set(state.key,{...state.position,speed:0});
        continue;
      }
      const before=d.position;
      if(drive(d,state,goals,motion,dt,returning)){
        d.parked=!returning;d.speed=0;d.gripped=false;d.approachReady=0;
      }
      if(d.position!==before)motion.obstacles=[...walls,...obstacles(motion)];
    }
  }

  return {rebuild,update,obstacles,
    allHome(){return desks.every(d=>distance(d.position,d.home)<ARRIVAL);},
    stillMoving(id){
      return desks.some(d=>d.actor && (id==='equip'?(!d.parked && !d.skipped):distance(d.position,d.home)>ARRIVAL));
    },
    handling(actor){
      const d=desks.find(d=>d.actor===actor);
      return !!d && !d.parked && !d.skipped;
    },
    inspect(){
      return desks.map(d=>({key:d.root.userData.ownerKey,home:d.home,position:d.position,parked:d.parked,
        outside:outside(d,d.position.x,d.position.z),gripped:d.gripped,
        speed:d.speed,pushedDistance:d.pushedDistance,exit:d.exit,size:d.size,blocked:d.blocked,skipped:d.skipped}));
    },
  };
}
