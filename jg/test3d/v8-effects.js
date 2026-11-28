import * as THREE from 'three';
import {gradeMaterial} from './v8-lighting.js?v=20261123-8e';

export const SEED_STYLES = {
  dotori:     {shape:'nut',   color:0xbb773c, scale:[.92,1.18,.92]},
  bam:        {shape:'nut',   color:0x98542c, scale:[1.13,.85,1]},
  ddangkong:  {shape:'grain', color:0xd79447, scale:[1,1.21,1]},
  byeongari:  {shape:'nut',   color:0xe6b75b, scale:[1,1,1]},
  wandukong3: {shape:'round', color:0x92bf50, scale:[1,1,1]},
  haebaragi:  {shape:'grain', color:0x514139, scale:[.90,1.35,.59]},
  ssal:       {shape:'grain', color:0xf4e8c8, scale:[.72,1.35,.68]},
};

export function seedGeometry(shape) {
  if(shape==='round')return new THREE.SphereGeometry(.058,10,7);
  if(shape==='grain')return new THREE.CapsuleGeometry(.038,.075,3,8);
  return new THREE.SphereGeometry(.063,7,5);
}

export class WindowMess {
  // 1135 — 유리창이 커지면 자국판도 같은 크기로(늘이지 않고 그림판 비율을 다시 잡는다).
  resize(width,height){
    if(Math.abs(width-this.width)<.02 && Math.abs(height-this.height)<.02)return;
    this.width=width;this.height=height;
    this.canvas.height=Math.max(64,Math.round(this.canvas.width*height/width));
    this.mesh.scale.set(width/this.baseWidth,height/this.baseHeight,1);
    this.mesh.position.set(0,this.bottom+height/2,this.z+.045);
    this.texture.needsUpdate=true;
  }

  constructor(scene,{width,height,z,bottom}){
    this.width=width;this.height=height;this.z=z;this.bottom=bottom;this.hits=0;
    // 13바퀴 재작업 — 영상검사 ③ '자국이 11바퀴보다 18~22% 적다'를 가르기 위해 ?mess= 로 크기를 바꿀 수 있게.
    const MESS_PX=+((new URLSearchParams(location.search)).get('mess')||1024);
    const c=document.createElement('canvas');c.width=MESS_PX;c.height=Math.round(MESS_PX*height/width);this.canvas=c;this.ctx=c.getContext('2d');
    // 13바퀴 ④ — 1% 저점이 v8f 보다 낮은 원인이 **이 그림판을 GPU 로 올리는 것**이었다
    // (씨앗을 끄면 저점 42 → 81). 2048 은 4MB·1024 는 1MB. 자국은 뭉개진 동그라미라 1024 로도 같아 보인다.
    this.lastUpload=-1;this.uploadEvery=0.05;   // 1초에 최대 20번만 올린다(눈으로는 구분 안 됨)
    this.texture=new THREE.CanvasTexture(c);this.texture.colorSpace=THREE.SRGBColorSpace;
    this.material=gradeMaterial(new THREE.MeshBasicMaterial({map:this.texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),this.material);
    this.mesh.position.set(0,bottom+height/2,z+.045);this.mesh.renderOrder=3;scene.add(this.mesh);
    this.baseWidth=width;this.baseHeight=height;
  }
  impact(point,key){
    this.hits++;
    const x=(point.x/this.width+.5)*this.canvas.width,y=(1-(point.y-this.bottom)/this.height)*this.canvas.height;
    // 0224 P36 — 크기 0.6배(가시 돋친 공처럼 보이지 않게).
    // 7바퀴 영상분석 ⑨ — 유리창이 커진 뒤로 같은 크기 자국이 화면에서 너무 작아져
    // '엉망'으로 안 보였다(8.5초에 큰 자국 1개 + 점 몇 개). 1.8배.
    const ctx=this.ctx,r=.34*this.canvas.width/this.width;
    ctx.save();ctx.translate(x,y);
    const color=SEED_STYLES[key].color;
    const tint=[color>>16,(color>>8)&255,color&255].join(',');
    const gradient=ctx.createRadialGradient(0,0,r*.12,0,0,r);
    gradient.addColorStop(0,`rgba(${tint},.63)`);gradient.addColorStop(.62,`rgba(${tint},.35)`);gradient.addColorStop(1,`rgba(${tint},0)`);
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    // P36 — 가시처럼 뻗은 길쭉한 조각 7개 → **둥근 작은 방울 3~4개**로(두 가지 색).
    const drops=3+(this.hits%2);
    for(let i=0;i<drops;i++){
      const a=i*2.1+this.hits*.6,b=r*(.52+Math.random()*.42);
      ctx.fillStyle=`rgba(${tint},${i%2?.28:.42})`;
      ctx.beginPath();ctx.arc(Math.cos(a)*b,Math.sin(a)*b,r*(.16+Math.random()*.08),0,7);ctx.fill();
    }
    // A seed caught on the glass, drawn into the bounded reusable texture.
    const [sx,sy]=SEED_STYLES[key].scale;
    ctx.rotate(this.hits*.7);ctx.fillStyle=`rgb(${tint})`;ctx.strokeStyle='#71502e';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.ellipse(0,0,r*.28*sx,r*.33*sy,0,0,7);ctx.fill();ctx.stroke();
    ctx.restore();this.dirty=true;
  }
  fade(clean){
    if(this.dirty){
      const now=performance.now()/1000;
      if(this.lastUpload<0 || now-this.lastUpload>=this.uploadEvery){
        this.texture.needsUpdate=true;this.dirty=false;this.lastUpload=now;
      }
    }
    this.material.opacity=1-THREE.MathUtils.clamp(clean,0,1);
  }
  reset(){this.lastUpload=-1;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.hits=0;this.texture.needsUpdate=true;this.material.opacity=1;}
}

export class SeedProjectiles {
  constructor(scene,onImpact,displayScale=1){
    this.onImpact=onImpact;
    this.displayScale=displayScale;
    this.pool=Array.from({length:28},()=>({active:false,start:new THREE.Vector3(),target:new THREE.Vector3()}));
    this.meshes=Object.fromEntries(Object.entries(SEED_STYLES).map(([key,style])=>{
      const mesh=new THREE.InstancedMesh(seedGeometry(style.shape),gradeMaterial(new THREE.MeshLambertMaterial({color:style.color})),this.pool.length);
      mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
      return [key,mesh];
    }));
    this.dummy=new THREE.Object3D();this.shots={};this.peak=0;
  }
  fire(start,target,time,key){
    const seed=this.pool.find(seed=>!seed.active);if(!seed)return false;
    seed.active=true;seed.start.copy(start);seed.target.copy(target);seed.key=key;seed.t0=time;
    seed.duration=THREE.MathUtils.clamp(start.distanceTo(target)*.057,.60,1.03);
    this.shots[key]=(this.shots[key]||0)+1;
    return true;
  }
  update(time){
    for(const mesh of Object.values(this.meshes))mesh.count=0;
    let active=0;
    for(const seed of this.pool){
      if(!seed.active)continue;
      const u=(time-seed.t0)/seed.duration;
      if(u>=1){
        seed.active=false;
        this.onImpact(seed.target,seed.key);
        continue;
      }
      const mesh=this.meshes[seed.key];
      this.dummy.position.copy(seed.start).lerp(seed.target,u);
      this.dummy.position.y+=Math.sin(Math.PI*u)*1.2;
      this.dummy.rotation.set(u*7,u*4,u*3);
      this.dummy.scale.fromArray(SEED_STYLES[seed.key].scale).multiplyScalar(2.35*this.displayScale);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count++,this.dummy.matrix);
      active++;
    }
    for(const mesh of Object.values(this.meshes))if(mesh.count)mesh.instanceMatrix.needsUpdate=true;
    this.peak=Math.max(this.peak,active);
  }
  reset(){this.pool.forEach(seed=>seed.active=false);this.shots={};this.peak=0;this.update(0);}
}
