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
  if(kind==='notice'){
    // 0224 P8·P10·P13 — 굵게·크게·진한 주황(흰 사무실에서 금색은 안 보인다).
    x.fillStyle='#E8651B';x.strokeStyle='#7A2E06';x.lineWidth=9;
    x.beginPath();x.roundRect(46,6,36,78,14);x.fill();x.stroke();
    x.beginPath();x.arc(64,110,16,0,7);x.fill();x.stroke();
  }
  else if(kind==='sweat'){
    // P11 — 땀방울(놀람·허겁지겁). 물방울 3개.
    x.strokeStyle='#5E86B8';x.lineWidth=5;x.fillStyle='#BFE0F5';
    for(const [cx,cy,r] of [[40,46,19],[82,66,14],[58,96,11]]){
      x.beginPath();x.moveTo(cx,cy-r*1.5);x.quadraticCurveTo(cx+r,cy+r*.2,cx,cy+r);
      x.quadraticCurveTo(cx-r,cy+r*.2,cx,cy-r*1.5);x.closePath();x.fill();x.stroke();
    }
  }
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

// 0224 P28·P30·P32·P33 — 친구별 눈 보정(정본 모양은 그대로, 기운 각도만 수평으로).
const EYE_TUNE={
  // 밤은 눈동자(검은 부분)가 큰 편이라 **눈을 키우면 검은 덩어리**가 된다.
  // 크기는 조금만, 대신 세로로 더 열어 둥글게 만들고 기운 각도를 되돌린다.
  bam:       {size:1.10, fix:0.30, open:1.34},
  wandukong3:{size:1.26, fix:0.20, open:1.14},
  ddangkong: {size:1.34, fix:0.12, open:1.22},
  byeongari: {size:1.22, fix:0.06, open:1.06},
  dotori:    {size:1.26, fix:0.05, open:1.04},
  haebaragi: {size:1.24, fix:0.05, open:1.04},
  ssal:      {size:1.24, fix:0.05, open:1.04},
};
export function createEmotionRig(actor){
  const tune=EYE_TUNE[actor.key]||{size:1,fix:0,open:1};
  const eyeMeshes=[],arms=[],highlights=[],props=[];
  actor.model.traverse(o=>{if(o.isMesh && /^Eye/.test(o.name))eyeMeshes.push(o);if(/^Arm_[LR]$/.test(o.name))arms.push({node:o,z:o.rotation.z});});
  const iris=eyeMeshes.find(o=>/^EyeIris/.test(o.name));
  const centers=iris?eyeCenters(iris.geometry).slice(0,actor.key==='wandukong3'?6:2):[];
    // 0224 영상분석: P3 놀랄 때 눈 1.6배 · P28 기본 눈을 정본 비율로 · P30/P32/P33 기운 눈 되돌리기.
  const uniforms={open:{value:1},slant:{value:0},curve:{value:0},size:{value:1},fix:{value:0}},owned=[];
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
      const copy=m.clone(),baseCompile=m.onBeforeCompile;copy.onBeforeCompile=function(shader,...args){
        baseCompile.call(this,shader,...args);
        shader.uniforms.emotionOpen=uniforms.open;shader.uniforms.emotionSlant=uniforms.slant;shader.uniforms.emotionCurve=uniforms.curve;shader.uniforms.emotionSize=uniforms.size;shader.uniforms.emotionFix=uniforms.fix;
        shader.vertexShader='attribute vec4 emotionCenter;\nuniform float emotionOpen;\nuniform float emotionSlant;\nuniform float emotionCurve;\nuniform float emotionSize;\nuniform float emotionFix;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          float dx=position.x-emotionCenter.x;
          float side=sign(emotionCenter.x);
          float normalizedX=clamp(dx/max(emotionCenter.w,0.0001),-1.0,1.0);
          transformed.x=emotionCenter.x+dx*emotionSize;
          transformed.y=emotionCenter.y+(position.y-emotionCenter.y)*emotionOpen*emotionSize+dx*side*emotionSlant;
          transformed.y-=dx*side*emotionFix*emotionSize;
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
  const visualRoot=actor.visualRoot || actor.wrapper;
  // P9 — 머리 위 1.0머리 → 0.35머리(화면 밖으로 안 잘리게) · P8 크기 0.35 → 0.70배
  sprite.position.set(0,1.05,0);sprite.scale.set(.46,.46,1);sprite.visible=false;visualRoot.add(sprite);
  // P11 — 땀방울은 머리 옆에 따로.
  const sweat=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,map:effectTexture('sweat')}));
  sweat.position.set(.34,.92,.06);sweat.scale.set(.30,.30,1);sweat.visible=false;visualRoot.add(sweat);
  let previous;
  return {
    dispose(){owned.forEach(o=>o.dispose());sprite.material.dispose();visualRoot.remove(sprite);
      sweat.material.dispose();visualRoot.remove(sweat);},
    eyes:centers.length,eyeMeshes:eyeMeshes.length,
    update(name,t,active=false,effectOverride=null){
      const e=EMOTIONS[name] || EMOTIONS.working;
      const effect=effectOverride || e.effect;
      let open=e.open;
      if(actor.key==='haebaragi' && name==='surprised')open=1.05;
      if(actor.key==='bam' && name==='working')open=.7;
      if(name==='working' && (t+actor.phase)%4.8<.12)open=.08;
      // P3 — 놀란 순간 눈이 1.6배까지 커졌다가 1.15배로만 돌아온다.
      const panic=THREE.MathUtils.clamp(actor.panic||0,0,1);
      uniforms.size.value=THREE.MathUtils.lerp(uniforms.size.value,tune.size*(1+.6*panic),panic>(uniforms.lastPanic||0)?.42:.14);
      uniforms.lastPanic=panic;uniforms.fix.value=tune.fix;open*=tune.open;
      uniforms.open.value=THREE.MathUtils.lerp(uniforms.open.value,open,.28);
      uniforms.slant.value=THREE.MathUtils.lerp(uniforms.slant.value,e.slant,.25);
      uniforms.curve.value=THREE.MathUtils.lerp(uniforms.curve.value,e.curve,.25);
      // P29 — 아래 초승달 하이라이트는 흘겨보는 눈으로 보인다. 눈동자 왼쪽 위 둥근 점으로.
      for(const h of highlights){
        h.visible=uniforms.open.value>.48;
        if(h.userData.jgBase===undefined){h.userData.jgBase=h.position.clone();h.userData.jgScale=h.scale.clone();}
        // 눈 크기에 맞춰 **눈 반지름의 40% 만큼 왼쪽 위로** 올리고, 둥근 점처럼 작게.
        const eyeR=centers[0]?centers[0].radius:0.05;
        h.position.set(h.userData.jgBase.x-eyeR*0.42,h.userData.jgBase.y+eyeR*0.78,h.userData.jgBase.z+eyeR*0.18);
        h.scale.set(h.userData.jgScale.x*0.42,h.userData.jgScale.y*0.42,h.userData.jgScale.z);
      }
      for(const arm of arms)arm.node.rotation.z=arm.z+(active?Math.sin(t*8+actor.phase)*.35:Math.sin(t*4+actor.phase)*.05);
      for(const prop of props)prop.node.rotation.z=prop.z+(name==='excited'?Math.sin(t*8+actor.phase)*.02:0);
      sprite.visible=!!effect;
      if(effect && previous!==effect){sprite.material.map=effectTexture(effect);sprite.material.needsUpdate=true;previous=effect;}
      // P10 — 뻥 튀어나왔다가(0.10초 1.4배) 1.0배로 가라앉는다.
      const age=actor.effectAge=(effect&&previous===effect)?(actor.effectAge||0)+1/60:0;
      const pop=age<.10?(age/.10)*1.4:age<.18?1.4-(age-.10)/.08*.4:1;
      sprite.scale.set(.46*pop,.46*pop,1);
      sprite.position.y=1.03+Math.sin(t*3+actor.phase)*.03;
      sprite.material.opacity=.95;
      // P11 — 놀란 뒤 땀방울. 1.2초마다 한 방울씩 흘러내린다.
      const panicNow=THREE.MathUtils.clamp(actor.panic||0,0,1);
      sweat.visible=panicNow>.05 && active;
      if(sweat.visible){
        const fall=((t*(1/1.2))%1);
        sweat.position.set(.34,.98-fall*.30,.06);
        sweat.material.opacity=.85*panicNow*(1-fall*.5);
        sweat.scale.setScalar(.30*(.7+.3*panicNow));
      }
      actor.emotion=name;
    },
  };
}
