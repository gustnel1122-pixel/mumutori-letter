import * as THREE from 'three';
import {gradeMaterial} from './v8-lighting.js?v=20261123-8e';

export class WindowMess {
  constructor(scene,{width,height,z,bottom}){
    this.width=width;this.height=height;this.z=z;this.bottom=bottom;this.hits=0;this.byKind={throw:0,gun:0,bazooka:0};
    const c=document.createElement('canvas');c.width=2048;c.height=Math.round(2048*height/width);this.canvas=c;this.ctx=c.getContext('2d');
    this.texture=new THREE.CanvasTexture(c);this.texture.colorSpace=THREE.SRGBColorSpace;
    this.material=gradeMaterial(new THREE.MeshBasicMaterial({map:this.texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),this.material);
    this.mesh.position.set(0,bottom+height/2,z+.045);this.mesh.renderOrder=3;scene.add(this.mesh);
  }
  impact(point,kind='throw'){
    this.hits++;this.byKind[kind]=(this.byKind[kind] || 0)+1;
    const x=(point.x/this.width+.5)*this.canvas.width,y=(1-(point.y-this.bottom)/this.height)*this.canvas.height;
    // 0224 P36 — 크기 0.6배(가시 돋친 공처럼 보이지 않게).
    // 7바퀴 영상분석 ⑨ — 유리창이 커진 뒤로 같은 크기 자국이 화면에서 너무 작아져
    // '엉망'으로 안 보였다(8.5초에 큰 자국 1개 + 점 몇 개). 1.8배.
    const ctx=this.ctx,r=(kind==='bazooka'?.62:kind==='gun'?.23:.36)*1.08*this.canvas.width/this.width;
    ctx.save();ctx.translate(x,y);
    // Rounded pea/cream stains, no blood, harsh blast or character injury.
    const tint=kind==='bazooka'?'166,119,65':kind==='gun'?'125,160,66':'214,184,121';
    const gradient=ctx.createRadialGradient(0,0,r*.12,0,0,r);
    gradient.addColorStop(0,`rgba(${tint},.63)`);gradient.addColorStop(.62,`rgba(${tint},.35)`);gradient.addColorStop(1,`rgba(${tint},0)`);
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    // P36 — 가시처럼 뻗은 길쭉한 조각 7개 → **둥근 작은 방울 3~4개**로(두 가지 색).
    const drops=3+(this.hits%2);
    const tint2=kind==='bazooka'?'198,156,104':kind==='gun'?'154,186,96':'232,208,158';
    for(let i=0;i<drops;i++){
      const a=i*2.1+this.hits*.6,b=r*(.52+Math.random()*.42);
      ctx.fillStyle=`rgba(${i%2?tint2:tint},.42)`;
      ctx.beginPath();ctx.arc(Math.cos(a)*b,Math.sin(a)*b,r*(.16+Math.random()*.08),0,7);ctx.fill();
    }
    if(kind==='bazooka'){
      // 자국을 키운 뒤로 금이 '가시'처럼 길게 뻗어 보였다(0224 P36 이 빼라고 한 모양) → 짧게.
      const crackR=r*.85;
      ctx.strokeStyle='rgba(104,143,161,.75)';ctx.lineWidth=1.5;
      for(let i=0;i<4;i++){
        const a=i*Math.PI*2/4+this.hits*.13;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a+.18)*crackR*.4,Math.sin(a+.18)*crackR*.4);
        ctx.lineTo(Math.cos(a)*crackR,Math.sin(a)*crackR);ctx.stroke();
        ctx.strokeStyle='rgba(250,255,255,.93)';ctx.lineWidth=.7;ctx.stroke();ctx.strokeStyle='rgba(104,143,161,.75)';ctx.lineWidth=1.5;
      }
      // A few reflective chips stay on the pane: no destructive flying glass.
      ctx.fillStyle='rgba(221,244,250,.72)';
      for(let i=0;i<4;i++){const a=i*1.7;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,.8*Math.sin(a)*r);ctx.lineTo(Math.cos(a+.2)*r*1.3,Math.sin(a+.2)*r*1.3);ctx.lineTo(Math.cos(a+.4)*r*.8,Math.sin(a+.4)*r*.8);ctx.closePath();ctx.fill();}
    }
    // A seed caught on the glass, drawn into the bounded reusable texture.
    ctx.rotate(this.hits*.7);ctx.fillStyle=kind==='gun'?'#749d41':'#bd9158';ctx.strokeStyle='#71502e';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.ellipse(0,0,r*.27,r*.38,0,0,7);ctx.fill();ctx.stroke();
    if(kind==='bazooka'){ctx.fillStyle='#815431';ctx.beginPath();ctx.ellipse(0,-r*.22,r*.30,r*.16,0,0,7);ctx.fill();}
    // 7바퀴 — 자국을 1.8배로 키우고 바주카·유리창 엉망 때도 계속 던지게 하면서 한 프레임에
    // 여러 번 맞는 일이 생겼다. 맞을 때마다 큰 그림판을 GPU로 올리면 1% 저점이 뚝 떨어진다
    // (26.7 → 23.8). **한 프레임에 한 번만** 올린다.
    ctx.restore();this.dirty=true;
  }
  fade(clean){
    if(this.dirty){this.texture.needsUpdate=true;this.dirty=false;}   // 프레임마다 한 번만 올린다
    this.material.opacity=1-THREE.MathUtils.clamp(clean,0,1);
  }
  reset(){this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.hits=0;this.byKind={throw:0,gun:0,bazooka:0};this.texture.needsUpdate=true;this.material.opacity=1;}
}

export class SeedProjectiles {
  constructor(scene,onImpact,displayScale=1){
    this.onImpact=onImpact;this.displayScale=displayScale;this.pool=Array.from({length:28},()=>({active:false,start:new THREE.Vector3(),target:new THREE.Vector3(),kind:'throw',shape:0,t0:0,duration:0,arc:0,size:1}));
    this.meshes=[
      new THREE.InstancedMesh(new THREE.SphereGeometry(.055,8,6),gradeMaterial(new THREE.MeshLambertMaterial({color:0x91b954})),28),
      new THREE.InstancedMesh(new THREE.CapsuleGeometry(.048,.075,2,7),gradeMaterial(new THREE.MeshLambertMaterial({color:0xc59454})),28),
      new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.065,0),gradeMaterial(new THREE.MeshLambertMaterial({color:0xf2e6c8})),28),
    ];
    this.meshes.forEach(m=>{m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);});
    this.dummy=new THREE.Object3D();this.position=new THREE.Vector3();this.shots={throw:0,gun:0,bazooka:0};this.peak=0;this.update(0);
  }
  fire(start,target,kind,time,shape=0){
    const s=this.pool.find(s=>!s.active);if(!s)return false;
    s.active=true;s.start.copy(start);s.target.copy(target);s.kind=kind;s.shape=shape;s.t0=time;
    s.duration=kind==='throw'?.8:kind==='gun'?.46:.66;s.arc=kind==='throw'?1.2:kind==='gun'?.18:.45;// 7바퀴 영상분석 ⑩ — 960 화면에서 지름 3~4px 이라 '먼지'로 보였다. 8~10px 되게 키운다.
    s.size=(kind==='bazooka'?3.4:kind==='gun'?1.9:2.1)*this.displayScale;
    this.shots[kind]++;return true;
  }
  update(time){
    let active=0;
    for(let i=0;i<this.pool.length;i++){
      const s=this.pool[i];
      if(s.active && time-s.t0>=s.duration){s.active=false;this.onImpact(s.target,s.kind);}
      for(let j=0;j<this.meshes.length;j++){
        this.dummy.position.set(0,-100,0);this.dummy.scale.setScalar(0);
        if(s.active && s.shape===j){
          const u=Math.max(0,(time-s.t0)/s.duration);this.position.copy(s.start).lerp(s.target,u);this.position.y+=Math.sin(Math.PI*u)*s.arc;
          this.dummy.position.copy(this.position);this.dummy.rotation.set(u*6,u*4,0);this.dummy.scale.setScalar(s.size);active++;
        }
        this.dummy.updateMatrix();this.meshes[j].setMatrixAt(i,this.dummy.matrix);
      }
    }
    this.meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);this.peak=Math.max(this.peak,active);return active;
  }
  reset(){this.pool.forEach(s=>s.active=false);this.shots={throw:0,gun:0,bazooka:0};this.peak=0;this.update(0);}
}
