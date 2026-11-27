import * as THREE from 'three';

export const EMOTIONS = Object.freeze({
  working:{label:'평소 · 일하는 중',open:1,slant:0,curve:0,effect:null},
  surprised:{label:'깜짝 · 발견',open:1.0,slant:0,curve:0,effect:'notice'},   // 2216 — 놀라도 눈은 **평소와 똑같이**(1.24 → 1.08 → 1.0). 놀람은 몸으로만
  // 1241 ②: 기울기 0.35 가 전투 준비 내내 일곱 눈을 기울여 '노려보는' 얼굴을 만들었다.
  // 결심은 눈을 조금 좁히는 것으로만 내고 기울기는 거의 없앤다(0224 P30).
  // 0152 — 사장님 "뭐가 둥둥떠있는데?" · 이 '김(≋)' 은 커피 김이 아니라 결심 기분 표시였고
  // 허공에 떠 보였다 → 뺀다(놀람 '!' · 신남 ⭐ 는 그대로).
  determined:{label:'결심 · 준비',open:0.78,slant:0.08,curve:0,effect:null},
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
// 14바퀴(사장님 11/27 09:58 "고정시킨 후") — 눈 값은 **잠금 파일에서만** 읽는다.
// 아래 `EYE_TUNE_OLD` 는 바퀴마다 손대던 옛 값이고, 지금은 쓰이지 않는다(기록으로만 남긴다).
let EYE_TUNE = {};
export function setEyeTune(table){ EYE_TUNE = table || {}; }
const EYE_TUNE_OLD={
  // 밤은 눈동자(검은 부분)가 큰 편이라 **눈을 키우면 검은 덩어리**가 된다.
  // 크기는 조금만, 대신 세로로 더 열어 둥글게 만들고 기운 각도를 되돌린다.
  // 1241 ④ 다시: open 1.95 는 반대로 **얼굴을 덮는 검은 판**이 됐다(7바퀴 04 사진).
  // 정본 2D 의 밤은 '적당한 타원 + 큰 흰 반짝임'이라 크기를 줄이고 적당히만 연다.
  bam:       {size:0.95, fix:0.55, open:1.15},   // fix 를 올리면 바깥 눈꼬리가 내려가 정본 모양이 된다
  wandukong3:{size:1.26, fix:0.20, open:1.14},
  // 1241 ⑥ — 정본 2D 의 땅콩은 **반달 눈**(윗꺼풀이 덮인 옆눈)이다. 크고 둥글게 뜨면
  // 검은 알 두 개가 붙어 '선글라스'로 보인다(7바퀴 04 사진).
  ddangkong: {size:1.10, fix:0.12, open:0.62},
  byeongari: {size:1.22, fix:0.06, open:1.06},
  dotori:    {size:1.26, fix:0.05, open:1.04},
  haebaragi: {size:1.24, fix:0.05, open:1.04},
  ssal:      {size:1.24, fix:0.05, open:1.04},
};
export function createEmotionRig(actor){
  const tune=EYE_TUNE[actor.key]||{size:1,fix:0,open:1};
  // 1241 ④ 되돌림 — 흰자 메시를 키우면 **제자리에서 커져 머리 밖으로 날개처럼 튀어나온다**
  // (7바퀴 04 사진에서 밤이 그렇게 됐다). 밤 눈은 세로로 더 여는 것(open 1.95)만으로 잡는다.
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
    // 17바퀴(사장님 11/27 17:56 "눈동자 흰색이 왜따로 튀어나와있지?") —
    // 놀랄 때 눈을 1.6배로 키우면 **흰자가 검은 테두리 밖으로 비어져 나왔다**(밤이 제일 심함).
    // 흰자는 테두리(EyeRim) 안에 있어야 하므로 **흰자만 덜 키운다**(커지는 몫의 45%).
    // 모양·색·개수는 그대로 — 커지는 양만 줄인다.
    const grow={value:/^EyeWhite/.test(mesh.name)?0.45:1.0};
    const copies=materials.map(m=>{
      const copy=m.clone(),baseCompile=m.onBeforeCompile;copy.onBeforeCompile=function(shader,...args){
        baseCompile.call(this,shader,...args);
        shader.uniforms.emotionOpen=uniforms.open;shader.uniforms.emotionSlant=uniforms.slant;shader.uniforms.emotionCurve=uniforms.curve;shader.uniforms.emotionSize=uniforms.size;shader.uniforms.emotionFix=uniforms.fix;shader.uniforms.emotionGrow=grow;
        shader.vertexShader='attribute vec4 emotionCenter;\nuniform float emotionOpen;\nuniform float emotionSlant;\nuniform float emotionCurve;\nuniform float emotionSize;\nuniform float emotionFix;\nuniform float emotionGrow;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          float dx=position.x-emotionCenter.x;
          float side=sign(emotionCenter.x);
          float jgSize=1.0+(emotionSize-1.0)*emotionGrow;
          float normalizedX=clamp(dx/max(emotionCenter.w,0.0001),-1.0,1.0);
          transformed.x=emotionCenter.x+dx*jgSize;
          transformed.y=emotionCenter.y+(position.y-emotionCenter.y)*emotionOpen*jgSize+dx*side*emotionSlant;
          transformed.y-=dx*side*emotionFix*jgSize;
          transformed.y+=emotionCurve*emotionCenter.w*(1.0-normalizedX*normalizedX);
        `);
      };
      copy.customProgramCacheKey=()=> 'jg-v8-eye';owned.push(copy);return copy;
    });
    mesh.material=Array.isArray(mesh.material)?copies:copies[0];
  }
  // Existing canonical prop meshes can pivot; no new limbs, mouths or eyebrows.
  actor.model.traverse(o=>{if(o.isMesh && /^(Pen|Box|Cup|Camera|Sun)$/.test(o.name))props.push({node:o,z:o.rotation.z});});
  // 1241 ③ — 정본 그림의 하이라이트는 '눈동자 **왼쪽 위**의 둥근 점 2개'다.
  // 눈 메시의 부모에 붙여 고개를 돌려도 눈과 같이 움직이게 한다.
  const dots=[];
  if(iris && centers.length){
    const dotMaterial=new THREE.MeshBasicMaterial({color:0xffffff});
    for(const c of centers){
      // 정본 2D 의 반짝임은 눈의 절반 가까이 되게 크다 — 작으면 눈이 그냥 검은 알로 보인다.
      for(const [k,scale] of [['big',0.46],['small',0.18]]){
        const r=c.radius*scale;
        const dot=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),dotMaterial);
        // 큰 점은 왼쪽 위, 작은 점은 그보다 더 위·바깥으로 조금.
        // 8바퀴 검토 ② — 두 점이 겹쳐 한 덩어리로 보였다. 작은 점을 더 위·바깥으로 뗀다.
        const ox=k==='big'?-0.34:0.40, oy=k==='big'?0.34:0.62;
        // 17바퀴(사장님 11/27 17:56 "눈동자 흰색이 왜따로 튀어나와있지?") —
        // 반짝이 점은 **눈알 겉면 위**에 놓는다. 전에는 눈 가운데에서 앞으로 0.95칸 띄워 둬서
        // 옆에서 보면 얼굴 앞에 흰 공이 따로 떠 보였다. 겉면에 붙이면 옆에서도 눈 안에 머문다.
        const rho=Math.min(0.88,Math.hypot(ox,oy));            // 눈 테두리를 넘지 않게
        const unit=Math.hypot(ox,oy)||1;
        const px=ox/unit*rho, py=oy/unit*rho;
        const pz=Math.sqrt(Math.max(0.04,1-rho*rho));
        dot.position.set(c.center.x+c.radius*px, c.center.y+c.radius*py, c.center.z+c.radius*pz);
        dot.renderOrder=4;dot.visible=false;
        // 눈이 모양을 바꿀 때(평소 가늘게 · 놀랄 때 1.6배) **같이 따라가도록** 기준값을 남긴다.
        dot.userData.base={x:dot.position.x,y:dot.position.y,z:dot.position.z,
                           cx:c.center.x,cy:c.center.y,w:c.radius};
        iris.add(dot);dots.push(dot);owned.push(dot.geometry);
      }
    }
    owned.push(dotMaterial);
  }
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));
  const visualRoot=actor.visualRoot || actor.wrapper;
  // P9 — 머리 위 1.0머리 → 0.35머리(화면 밖으로 안 잘리게) · P8 크기 0.35 → 0.70배
  // 2256 — 친구마다 **머리 꼭대기 높이를 실제로 재서** 그 위로 띄운다(모자·새싹·돋보기 포함).
  // visualRoot 기준 높이라 깡충 뛰어도 머리와의 틈이 그대로 유지된다.
  const headBox = new THREE.Box3().setFromObject(actor.model);
  const headTop = isFinite(headBox.max.y) ? headBox.max.y : 1.0;
  const SPRITE_HALF = .23, HEAD_GAP = .30;          // 머리와 '!' 사이에 보이는 틈
  const spriteBaseY = headTop + HEAD_GAP + SPRITE_HALF;
  sprite.position.set(0,spriteBaseY,0);sprite.scale.set(.46,.46,1);sprite.visible=false;
  // 어떤 것에도 가려지지 않게 맨 앞에 그린다(자기 몸·다른 친구·책상·모니터·바주카).
  sprite.material.depthTest=false;sprite.material.depthWrite=false;sprite.renderOrder=999;
  visualRoot.add(sprite);
  // P11 — 땀방울은 머리 옆에 따로.
  const sweat=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,map:effectTexture('sweat')}));
  // 0206 ⑨ — 땀방울이 눈 바로 밑에 있어 '우는 것'처럼 보였다. 머리 **옆 위**로 옮긴다.
  // 땀방울도 같은 규칙 — 얼굴·몸에 박히지 않게 머리 꼭대기 옆에서 흐르고, 가려지지 않는다.
  const sweatTop = headTop + .02;
  sweat.position.set(.56,sweatTop,.06);sweat.scale.set(.34,.34,1);sweat.visible=false;
  sweat.material.depthTest=false;sweat.material.depthWrite=false;sweat.renderOrder=998;
  visualRoot.add(sweat);
  let previous;
  return {
    dispose(){owned.forEach(o=>o.dispose());dots.forEach(d=>d.parent&&d.parent.remove(d));sprite.material.dispose();visualRoot.remove(sprite);
      sweat.material.dispose();visualRoot.remove(sweat);},
    spriteBaseY,                       // 0152 — 생각 말풍선도 '!' 와 같은 머리 위 높이를 쓴다
    eyes:centers.length,eyeMeshes:eyeMeshes.length,
    update(name,t,active=false,effectOverride=null){
      const e=EMOTIONS[name] || EMOTIONS.working;
      const effect=effectOverride || e.effect;
      let open=e.open;
      // 2216 — 친구별 놀람 눈뜸 보정도 없앤다(해바라기씨 1.05 → 1.02 → 없음).
      // 7바퀴 영상분석 ⑥ — 땅콩은 평소 반달이라 놀라도 얼굴이 그대로였다. 놀랄 때만 동그랗게.
      // 2216 — 땅콩도 놀랄 때 **반달눈 그대로**(1.55 → 1.18 → 없음).
      if(actor.key==='bam' && name==='working')open=.7;
      if(name==='working' && (t+actor.phase)%4.8<.12)open=.08;
      // P3 — 놀란 순간 눈이 1.6배까지 커졌다가 1.15배로만 돌아온다.
      const panic=THREE.MathUtils.clamp(actor.panic||0,0,1);
      // 2137 — 눈을 1.6배로 부풀리던 것이 '징그러운 눈'의 원인이었다. 1.18배까지만 커진다.
      // 2216 — 눈 부풀림 **0**(1.6배 → 1.18배 → 1.0배). 놀란 것은 몸(깡충·늘어남·'!'·땀)으로만 보인다.
      uniforms.size.value=THREE.MathUtils.lerp(uniforms.size.value,tune.size,panic>(uniforms.lastPanic||0)?.42:.14);
      // 7바퀴 영상분석 ⑤ — `fix` 는 **바깥 눈꼬리를 내리는** 값이다. 평소엔 정본 모양을 만들지만
      // 놀랄 때까지 내려가 있으면 '놀람'이 아니라 '시무룩·울상'으로 읽힌다 → 놀랄수록 0 으로.
      uniforms.lastPanic=panic;uniforms.fix.value=tune.fix*(1-panic);open*=tune.open;
      if(name==='surprised')uniforms.fix.value=0;
      uniforms.open.value=THREE.MathUtils.lerp(uniforms.open.value,open,.28);
      uniforms.slant.value=THREE.MathUtils.lerp(uniforms.slant.value,e.slant,.25);
      uniforms.curve.value=THREE.MathUtils.lerp(uniforms.curve.value,e.curve,.25);
      // 1241 ③ — 옮기고 줄여도 **모양이 초승달 그대로**였다(6바퀴 지적).
      // 원래 하이라이트 메시는 **끄고**, 아래에서 만든 **둥근 점 2개**만 쓴다.
      for(const h of highlights)h.visible=false;
      const dotsOn=uniforms.open.value>.48;
      // 17바퀴 — 반짝이 점을 **눈 메시와 똑같은 식**으로 움직인다(위 셰이더와 같은 줄).
      // 전에는 점이 제자리에 남아, 눈이 놀라서 1.6배로 커지면 점만 눈 밖(뺨 위)에 떨어져 나왔다.
      {
        const sz=uniforms.size.value, op=uniforms.open.value, sl=uniforms.slant.value,
              cv=uniforms.curve.value, fx=uniforms.fix.value;
        for(const d of dots){
          const b=d.userData.base; if(!b)continue;
          const dx=b.x-b.cx, side=Math.sign(b.cx)||1;
          const nx=THREE.MathUtils.clamp(dx/Math.max(b.w,1e-4),-1,1);
          let y=b.cy+(b.y-b.cy)*op*sz+dx*side*sl;
          y-=dx*side*fx*sz;
          y+=cv*b.w*(1-nx*nx);
          d.position.set(b.cx+dx*sz, y, b.z);
          d.scale.set(sz,sz*Math.max(.25,op),sz);
        }
      }
      for(const d of dots)d.visible=dotsOn;
      for(const arm of arms)arm.node.rotation.z=arm.z+(active?Math.sin(t*8+actor.phase)*.35:Math.sin(t*4+actor.phase)*.05);
      for(const prop of props)prop.node.rotation.z=prop.z+(name==='excited'?Math.sin(t*8+actor.phase)*.02:0);
      sprite.visible=!!effect;
      if(effect && previous!==effect){sprite.material.map=effectTexture(effect);sprite.material.needsUpdate=true;previous=effect;}
      // P10 — 뻥 튀어나왔다가(0.10초 1.4배) 1.0배로 가라앉는다.
      const age=actor.effectAge=(effect&&previous===effect)?(actor.effectAge||0)+1/60:0;
      const pop=age<.10?(age/.10)*1.4:age<.18?1.4-(age-.10)/.08*.4:1;
      sprite.scale.set(.46*pop,.46*pop,1);
      sprite.position.y=spriteBaseY+Math.sin(t*3+actor.phase)*.03;   // 2256 — 머리 위 기준으로 살짝 둥둥
      sprite.material.opacity=.95;
      // P11 — 놀란 뒤 땀방울. 1.2초마다 한 방울씩 흘러내린다.
      const panicNow=THREE.MathUtils.clamp(actor.panic||0,0,1);
      sweat.visible=panicNow>.05 && active;
      if(sweat.visible){
        const fall=((t*(1/1.2))%1);
        sweat.position.set(.56,sweatTop+.06-fall*.30,.06);   // 0206 ⑨ 머리 **옆 위**에서 흐른다(2256 — 머리 높이 기준)
        sweat.material.opacity=.85*panicNow*(1-fall*.5);
        sweat.scale.setScalar(.34*(.7+.3*panicNow));
      }
      actor.emotion=name;
    },
  };
}
