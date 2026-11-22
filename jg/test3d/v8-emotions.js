import * as THREE from 'three';

export const EMOTIONS = Object.freeze({
  working:{label:'평소 · 일하는 중',open:1,slant:0,curve:0,effect:null},
  surprised:{label:'깜짝 · 발견',open:1.24,slant:0,curve:0,effect:'notice'},
  determined:{label:'결심 · 준비',open:0.58,slant:0.35,curve:0,effect:'steam'},
  excited:{label:'신남 · 발사',open:0.9,slant:0,curve:0.12,effect:'star'},
  proud:{label:'뿌듯 · 웃음',open:0.14,slant:0,curve:0.55,effect:'sparkle'},
  tired:{label:'졸림 · 지침',open:0.23,slant:0,curve:-0.12,effect:'sleep'},
});
const effects=new Map();
function effectTexture(kind){
  if(effects.has(kind))return effects.get(kind);
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.lineJoin='round';x.lineCap='round';x.lineWidth=7;x.strokeStyle='#87512b';x.fillStyle='#ffd85a';
  function star(cx,cy,r){x.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rad=i%2?r*.43:r;x.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);}x.closePath();x.fill();x.stroke();}
  if(kind==='notice'){x.fillStyle='#ffda58';x.beginPath();x.roundRect(53,12,22,66,10);x.fill();x.stroke();x.beginPath();x.arc(64,103,11,0,7);x.fill();x.stroke();}
  else if(kind==='steam'){x.strokeStyle='#e3eaf3';x.lineWidth=10;for(const i of [-1,0,1]){x.beginPath();x.moveTo(64+i*27,105);x.bezierCurveTo(27+i*27,76,101+i*27,55,64+i*27,18);x.stroke();}}
  else if(kind==='sleep'){x.font='bold 57px system-ui';x.fillStyle='#8d9bbd';x.fillText('z',15,100);x.font='bold 42px system-ui';x.fillText('z',67,50);}
  else{star(64,63,kind==='star'?44:30);if(kind==='sparkle'){x.lineWidth=4;star(20,22,12);star(111,100,11);}}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;effects.set(kind,texture);return texture;
}

// Find the independent eye surfaces. Welding identical seam vertices keeps a
// sphere's pole/seam from being mistaken for extra eyes; the peas keep six eyes.
function eyeCenters(geometry){
  const p=geometry.attributes.position,n=p.count,parent=new Int32Array(n);for(let i=0;i<n;i++)parent[i]=i;
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
  const same=new Map();
  for(let i=0;i<n;i++){
    const k=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
    if(same.has(k))join(i,same.get(k));else same.set(k,i);
  }
  const index=geometry.index;
  for(let i=0;i<(index?index.count:n);i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;join(a,b);join(a,c);}
  const groups=new Map();
  for(let i=0;i<n;i++){const k=find(i);if(!groups.has(k))groups.set(k,{box:new THREE.Box3(),count:0});const g=groups.get(k);g.box.expandByPoint(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)));g.count++;}
  return [...groups.values()].filter(g=>g.count>=8).map(g=>({center:g.box.getCenter(new THREE.Vector3()),radius:Math.max(0.0001,(g.box.max.x-g.box.min.x)/2),count:g.count})).sort((a,b)=>b.count-a.count);
}

export function createEmotionRig(actor){
  const eyeMeshes=[],arms=[],highlights=[],props=[];
  actor.model.traverse(o=>{if(o.isMesh && /^Eye/.test(o.name))eyeMeshes.push(o);if(/^Arm_[LR]$/.test(o.name))arms.push({node:o,z:o.rotation.z});});
  const iris=eyeMeshes.find(o=>/^EyeIris/.test(o.name));
  const centers=iris?eyeCenters(iris.geometry).slice(0,actor.key==='wandukong3'?6:2):[];
  const uniforms={open:{value:1},slant:{value:0},curve:{value:0}},owned=[];
  for(const mesh of eyeMeshes){
    if(/^EyeHighlight/.test(mesh.name))highlights.push(mesh);
    const geometry=mesh.geometry.clone(),p=geometry.attributes.position;
    const attribute=new Float32Array(p.count*4);
    for(let i=0;i<p.count;i++){
      const v=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i));
      const eye=centers.reduce((best,c)=>!best || c.center.distanceToSquared(v)<best.center.distanceToSquared(v)?c:best,null);
      if(!eye)continue;
      attribute.set([eye.center.x,eye.center.y,eye.center.z,eye.radius],i*4);
    }
    geometry.setAttribute('emotionCenter',new THREE.BufferAttribute(attribute,4));mesh.geometry=geometry;owned.push(geometry);
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const copies=materials.map(m=>{
      const copy=m.clone();copy.onBeforeCompile=shader=>{
        shader.uniforms.emotionOpen=uniforms.open;shader.uniforms.emotionSlant=uniforms.slant;shader.uniforms.emotionCurve=uniforms.curve;
        shader.vertexShader='attribute vec4 emotionCenter;\nuniform float emotionOpen;\nuniform float emotionSlant;\nuniform float emotionCurve;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          float dx=position.x-emotionCenter.x;
          float side=sign(emotionCenter.x);
          float normalizedX=clamp(dx/max(emotionCenter.w,0.0001),-1.0,1.0);
          transformed.y=emotionCenter.y+(position.y-emotionCenter.y)*emotionOpen+dx*side*emotionSlant;
          transformed.y+=emotionCurve*emotionCenter.w*(1.0-normalizedX*normalizedX);
        `);
      };
      copy.customProgramCacheKey=()=> 'jg-v8-eye';owned.push(copy);return copy;
    });
    mesh.material=Array.isArray(mesh.material)?copies:copies[0];
  }
  // Existing canonical prop meshes can pivot; no new limbs, mouths or eyebrows.
  actor.model.traverse(o=>{if(o.isMesh && /^(Pen|Box|Cup|Camera|Sun)$/.test(o.name))props.push({node:o,z:o.rotation.z});});
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));
  sprite.position.set(0,1.2,0);sprite.scale.set(.25,.25,1);sprite.visible=false;actor.wrapper.add(sprite);
  let previous;
  return {
    dispose(){owned.forEach(o=>o.dispose());sprite.material.dispose();actor.wrapper.remove(sprite);},
    eyes:centers.length,eyeMeshes:eyeMeshes.length,
    update(name,t,active=false){
      const e=EMOTIONS[name] || EMOTIONS.working;
      let open=e.open;
      if(actor.key==='haebaragi' && name==='surprised')open=1.05;
      if(actor.key==='bam' && name==='working')open=.7;
      if(name==='working' && (t+actor.phase)%4.8<.12)open=.08;
      uniforms.open.value=THREE.MathUtils.lerp(uniforms.open.value,open,.28);
      uniforms.slant.value=THREE.MathUtils.lerp(uniforms.slant.value,e.slant,.25);
      uniforms.curve.value=THREE.MathUtils.lerp(uniforms.curve.value,e.curve,.25);
      for(const h of highlights)h.visible=uniforms.open.value>.48;
      for(const arm of arms)arm.node.rotation.z=arm.z+(active?Math.sin(t*8+actor.phase)*.35:Math.sin(t*4+actor.phase)*.05);
      for(const prop of props)prop.node.rotation.z=prop.z+(name==='excited'?Math.sin(t*8+actor.phase)*.02:0);
      sprite.visible=!!e.effect;
      if(e.effect && previous!==e.effect){sprite.material.map=effectTexture(e.effect);sprite.material.needsUpdate=true;previous=e.effect;}
      sprite.position.y=1.19+Math.sin(t*3+actor.phase)*.035;
      sprite.material.opacity=.88;
      actor.emotion=name;
    },
  };
}
