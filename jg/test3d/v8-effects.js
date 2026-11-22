import * as THREE from 'three';

export class WindowMess {
  constructor(scene,{width,height,z,bottom}){
    this.width=width;this.height=height;this.z=z;this.bottom=bottom;this.hits=0;this.byKind={throw:0,gun:0,bazooka:0};
    const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*height/width);this.canvas=c;this.ctx=c.getContext('2d');
    this.texture=new THREE.CanvasTexture(c);this.texture.colorSpace=THREE.SRGBColorSpace;
    this.material=new THREE.MeshBasicMaterial({map:this.texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),this.material);
    this.mesh.position.set(0,bottom+height/2,z+.045);this.mesh.renderOrder=3;scene.add(this.mesh);
  }
  impact(point,kind='throw'){
    this.hits++;this.byKind[kind]=(this.byKind[kind] || 0)+1;
    const x=(point.x/this.width+.5)*this.canvas.width,y=(1-(point.y-this.bottom)/this.height)*this.canvas.height;
    const ctx=this.ctx,r=(kind==='bazooka'?.85:kind==='gun'?.23:.36)*this.canvas.width/this.width;
    ctx.save();ctx.translate(x,y);
    // Rounded pea/cream stains, no blood, harsh blast or character injury.
    const tint=kind==='bazooka'?'166,119,65':kind==='gun'?'125,160,66':'214,184,121';
    const gradient=ctx.createRadialGradient(0,0,r*.12,0,0,r);
    gradient.addColorStop(0,`rgba(${tint},.63)`);gradient.addColorStop(.62,`rgba(${tint},.35)`);gradient.addColorStop(1,`rgba(${tint},0)`);
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    for(let i=0;i<7;i++){
      const a=i*.9+this.hits,b=r*(.6+Math.random()*.65);
      ctx.fillStyle=`rgba(${tint},.40)`;ctx.beginPath();ctx.ellipse(Math.cos(a)*b,Math.sin(a)*b,r*.15,r*.09,a,0,7);ctx.fill();
    }
    if(kind==='bazooka' || this.hits%4===0){
      const crackR=r*(kind==='bazooka'?1.8:1.4);
      ctx.strokeStyle='rgba(104,143,161,.75)';ctx.lineWidth=1.5;
      for(let i=0;i<7;i++){
        const a=i*Math.PI*2/7+this.hits*.13;
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
    ctx.restore();this.texture.needsUpdate=true;
  }
  fade(clean){this.material.opacity=1-THREE.MathUtils.clamp(clean,0,1);}
  reset(){this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.hits=0;this.byKind={throw:0,gun:0,bazooka:0};this.texture.needsUpdate=true;this.material.opacity=1;}
}

export class SeedProjectiles {
  constructor(scene,onImpact){
    this.onImpact=onImpact;this.pool=Array.from({length:28},()=>({active:false,start:new THREE.Vector3(),target:new THREE.Vector3(),kind:'throw',shape:0,t0:0,duration:0,arc:0,size:1}));
    this.meshes=[
      new THREE.InstancedMesh(new THREE.SphereGeometry(.055,8,6),new THREE.MeshStandardMaterial({color:0x91b954,roughness:.7}),28),
      new THREE.InstancedMesh(new THREE.CapsuleGeometry(.048,.075,2,7),new THREE.MeshStandardMaterial({color:0xc59454,roughness:.7}),28),
      new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.065,0),new THREE.MeshStandardMaterial({color:0xf2e6c8,roughness:.9}),28),
    ];
    this.meshes.forEach(m=>{m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);});
    this.dummy=new THREE.Object3D();this.position=new THREE.Vector3();this.shots={throw:0,gun:0,bazooka:0};this.peak=0;this.update(0);
  }
  fire(start,target,kind,time,shape=0){
    const s=this.pool.find(s=>!s.active);if(!s)return false;
    s.active=true;s.start.copy(start);s.target.copy(target);s.kind=kind;s.shape=shape;s.t0=time;
    s.duration=kind==='throw'?.8:kind==='gun'?.46:.66;s.arc=kind==='throw'?1.2:kind==='gun'?.18:.45;s.size=kind==='bazooka'?3.4:kind==='gun'?1:1.2;
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
