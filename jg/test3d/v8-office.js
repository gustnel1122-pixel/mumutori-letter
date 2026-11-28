import * as THREE from 'three';
import {loadOfficeAssets} from './v8-assets.js?v=20261123-8e';
import {gradeMaterial,createStaticBake} from './v8-lighting.js?v=20261123-8e';
import {SEED_STYLES,seedGeometry} from './v8-effects.js?v=20261128-seed-basket';

function mat(color){return gradeMaterial(new THREE.MeshLambertMaterial({color}));}
function box(parent,w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;}
const pots=mat(0xf3e4c9),wood=mat(0xbd8d5c),paper=mat(0xf5eddb),metal=mat(0xadb6b5),ink=mat(0x4d493e);
function grainTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  x.fillStyle='#fffaf1';x.fillRect(0,0,512,512);x.strokeStyle='rgba(107,71,39,.12)';x.lineWidth=.8;
  for(let i=0;i<100;i++){x.beginPath();for(let y=0;y<=512;y+=4){const px=i*5.5+Math.sin(y*.035+i)*1.7;x.lineTo(px,y);}x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

export function furnishOffice({scene,renderer,dirLight,floor,windowMesh,windowZ,windowWidth,windowHeight,windowBottom}){
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  let env=null;
  scene.environment=null;
  wood.map=grainTexture();wood.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());wood.needsUpdate=true;
  const assets=loadOfficeAssets({renderer,scene});
  const cache=new WeakMap();
  const upgrade=original=>{
    if(!original)return original;
    if(original.isMeshBasicMaterial || original.isSpriteMaterial)return gradeMaterial(original);
    if(cache.has(original))return cache.get(original);
    const m=gradeMaterial(new THREE.MeshLambertMaterial({color:original.color?.clone() || 0xffffff,map:original.map || null,
      transparent:original.transparent,opacity:original.opacity,alphaTest:original.alphaTest,side:original.side,
      }));cache.set(original,m);return m;
  };
  function upgradeTree(root){root.traverse(o=>{
    if(!o.isMesh)return;
    o.material=Array.isArray(o.material)?o.material.map(upgrade):upgrade(o.material);
    o.receiveShadow=true;
    if(/Body|Cap$/.test(o.name))o.castShadow=true;
    else if(!/^Eye/.test(o.name) && o.geometry){
      o.geometry.computeBoundingBox();const s=o.geometry.boundingBox.getSize(new THREE.Vector3());o.castShadow=Math.max(s.x,s.y,s.z)>.25;
    }
  });}
  upgradeTree(scene);
  floor.material=gradeMaterial(new THREE.MeshBasicMaterial({color:0xdde2e2}));
  scene.children.filter(o=>o.isAmbientLight).forEach(o=>o.intensity=.55);
  dirLight.color.set(0xfff5e8);dirLight.intensity=1.7;dirLight.position.set(-3,9,5);
  dirLight.target.position.set(0,.3,-2);scene.add(dirLight.target);
  dirLight.shadow.camera.left=-8;dirLight.shadow.camera.right=8;dirLight.shadow.camera.top=8;dirLight.shadow.camera.bottom=-8;
  dirLight.shadow.camera.near=.1;dirLight.shadow.camera.far=26;dirLight.shadow.bias=-.0004;dirLight.shadow.normalBias=.025;
  dirLight.shadow.radius=3;dirLight.shadow.blurSamples=8;
  scene.add(new THREE.HemisphereLight(0xe6f3ff,0x8c775e,.65));
  const furnishings=new THREE.Group();furnishings.name='v8-authored-office-props';scene.add(furnishings);
  // The imported side bookcases below replace the old duplicate shelving.
  // Whiteboard, marker tray and abstract work diagrams; no customer letter text.
  const board=new THREE.Group();board.position.set(-11.3,1.9,-1.0);board.rotation.y=.18;furnishings.add(board);
  box(board,1.4,.88,.06,0,0,0,metal);box(board,1.3,.78,.065,0,0,.01,mat(0xf5f8eb,.35));
  box(board,1.42,.05,.18,0,-.47,.08,metal);
  for(let i=0;i<3;i++){
    box(board,.27,.16,.009,-.38+i*.37,.14,.05,mat([0xa9c9bd,0xe8bf77,0xc6bdce][i]));
    box(board,.25,.012,.01,-.38+i*.37,-.13,.05,ink);
  }
  for(const dx of [-.48,.48])box(board,.04,1.6,.04,dx,-.66,-.03,metal);
  // Recycling bins, file cabinet, small parcels and a reading lamp.
  for(const side of [-1,1]){
    const bin=new THREE.Mesh(new THREE.CylinderGeometry(.20,.17,.42,12,1,true),mat(side<0?0x8d9c8b:0xbca98b));
    // 0206 10바퀴 — 바주카 쏘는 자리(통나무가 서는 칸)가 휴지통을 통째로 가렸다.
    // 휴지통·종이를 그 칸 **바깥·앞쪽**으로 비킨다.
    bin.position.set(side*12.5,.21,2.7);furnishings.add(bin);
    const pages=box(furnishings,.16,.025,.12,side*12.5,.36,2.7,paper);pages.rotation.z=.24;
  }
  const cabinet=new THREE.Group();cabinet.position.set(11.3,0,-.8);furnishings.add(cabinet);
  box(cabinet,1.05,1.15,.65,0,.575,0,mat(0xdbccad));
  for(let i=0;i<3;i++){box(cabinet,.96,.32,.025,0,.22+i*.35,.34,pots);box(cabinet,.22,.025,.04,0,.22+i*.35,.37,metal);}
  for(let i=0;i<4;i++)box(cabinet,.46,.035,.34,(i%2)*.1-.05,1.2+i*.037,0,paper);
  // Fine floor seams supply depth without adding geometry-heavy furniture.
  const seams=[];
  for(let x=-8;x<=8;x+=1.3)seams.push(x,.004,-7,x,.004,4);
  for(let z=-7;z<=4;z+=1.3)seams.push(-8,.004,z,8,.004,z);
  const seamGeometry=new THREE.BufferGeometry();seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seams,3));
  furnishings.add(new THREE.LineSegments(seamGeometry,new THREE.LineBasicMaterial({color:0xb7b0a5,transparent:true,opacity:.25})));
  // A light glass tint over the sky pane, without transmission/reflection passes.
  const glassMaterial=gradeMaterial(new THREE.MeshBasicMaterial({color:0xdceefa,transparent:true,opacity:.08,depthWrite:false}));
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(windowWidth,windowHeight),glassMaterial);
  glass.position.copy(windowMesh.position);glass.position.z=windowZ+.018;glass.renderOrder=1;scene.add(glass);
  upgradeTree(furnishings);
  function quality(q){
    renderer.shadowMap.enabled=false;dirLight.castShadow=false;
    renderer.setPixelRatio(q.scale);
  }
  function place(parent,name,size,position,yaw=0){const obj=assets.model(name,size);if(!obj)return null;obj.position.copy(position);obj.rotation.y=yaw;parent.add(obj);return obj;}
  // v8g: 친구가 **자기 의자에 앉아** 책상·화면을 보게 한다(2206 ①-1 · 2208 ①-1).
  // 자리(친구가 앉는 점)를 원점으로 잡고 local 좌표로 만든 뒤 통째로 키우고 돌려 놓는다.
  // local +z = 친구가 바라보는 쪽(자기 책상). 의자는 원점, 책상은 그 앞.
  function desk({pos,yaw,bonus,key,deskScale,seated=true}){
    if(!assets.info.models.includes('desk'))return null;
    if(!seated)return deskV8f({pos,yaw,bonus,key,deskScale});   // ?ver=f 되돌리기 — v8f 배치 그대로
    const g=new THREE.Group();g.userData.isDesk=true;
    const inner=new THREE.Group();
    const V=(x,y,z)=>new THREE.Vector3(x,y,z);
    place(inner,'desk',[1.16,.42,.60],V(0,0,.90));
    // 화면은 친구를 마주 본다. 완두콩은 키가 작아 화면을 낮추고 옆으로 더 비켜 둔다
    // (안 그러면 자기 화면이 자기 눈을 가린다 — 실측 65점 중 21점 가림).
    const small=key==='wandukong3';
    place(inner,'computerScreen',[.34,small?.24:.34,.07],V(small?.30:.12,.42,small?.92:.98),Math.PI);
    place(inner,'computerKeyboard',[.28,.015,.11],V(.02,.425,.76));
    place(inner,'computerMouse',[.055,.023,.08],V(.23,.425,.77));
    // 의자는 친구보다 조금 넉넉하게 — 동글동글한 친구 뒤로 완전히 숨으면 '앉아 있다'가 안 읽힌다.
    const chair=place(inner,'chairDesk',[.62,.74,.60],V(0,0,-.05));
    if(chair){chair.userData.isOfficeChair=true;g.userData.chair=chair;}
    place(inner,'books',[.17,.06,.17],V(-.36,.42,.92));
    if(bonus==='plant')place(inner,'plantSmall1',[.13,.20,.13],V(-.36,.42,1.05));
    if(bonus==='mug')place(inner,'mug',[.09,.075,.065],V(-.34,.42,.74));
    inner.scale.setScalar(deskScale);
    g.add(inner);g.userData.deskContents=inner;
    g.position.set(pos.x,0,pos.z);g.rotation.y=yaw;
    g.updateMatrixWorld(true);
    // 앉는 높이는 짐작하지 않고 의자 위로 광선을 쏴서 실제 앉는 면을 잰다.
    g.userData.seatY=.30*deskScale;
    if(chair){
      const ray=new THREE.Raycaster(new THREE.Vector3(pos.x,4,pos.z),new THREE.Vector3(0,-1,0));
      const hit=ray.intersectObject(chair,true)[0];
      if(hit)g.userData.seatY=hit.point.y;
    }
    g.userData.deskTopY=.42*deskScale;
    return g;
  }
  // v8f(66cd66a) 의 책상 배치 그대로 — `?ver=f` 로 되돌려 볼 때만 쓴다. 고치지 않는다.
  function deskV8f({pos,yaw,bonus,key,deskScale}){
    const g=new THREE.Group();g.userData.isDesk=true;
    const dir=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),side=new THREE.Vector3(dir.z,0,-dir.x);
    const center=pos.clone().addScaledVector(dir,.3).addScaledVector(side,1.85);center.y=0;
    place(g,'desk',[1.16,.42,.60],center,yaw);
    const monitor=center.clone().addScaledVector(dir,.08).addScaledVector(side,key==='wandukong3'?.46:.30);monitor.y=.42;
    place(g,'computerScreen',[.34,key==='wandukong3'?.26:.34,.07],monitor,yaw+Math.PI);
    const keyboard=center.clone().addScaledVector(dir,-.13);keyboard.y=.425;place(g,'computerKeyboard',[.28,.015,.11],keyboard,yaw);
    const mouse=keyboard.clone().addScaledVector(side,.21);place(g,'computerMouse',[.055,.023,.08],mouse,yaw);
    const chair=place(g,'chairDesk',[.46,.60,.48],pos.clone().addScaledVector(dir,.65).addScaledVector(side,1.85),yaw+Math.PI);
    if(chair){chair.userData.isOfficeChair=true;g.userData.chair=chair;}
    const books=center.clone().addScaledVector(side,-.35);books.y=.42;place(g,'books',[.17,.06,.17],books,yaw);
    if(bonus==='plant'){const pp=center.clone().addScaledVector(side,-.35).addScaledVector(dir,.15);pp.y=.42;place(g,'plantSmall1',[.13,.20,.13],pp);}
    if(bonus==='mug'){const pp=center.clone().addScaledVector(side,-.35).addScaledVector(dir,.16);pp.y=.42;place(g,'mug',[.09,.075,.065],pp,yaw);}
    const sx=deskScale*.78,sz=deskScale*.82;g.scale.set(sx,deskScale,sz);g.position.set(pos.x*(1-sx),0,pos.z*(1-sz));
    g.userData.seatY=0;g.userData.deskTopY=.42*deskScale;
    return g;
  }
  const covers=[];
  const ready=assets.ready.then(()=>{
    // The shelves serve as real opaque cover during the retreat. They sit
    // beside, rather than across, the seven friends' resting sight lines.
    for(const side of [-1,1]){
      // 13바퀴 — 3.0배에서 완두콩(세계 x 7.1 · 몸 반지름 1.71)이 이 책장 안에 박혀 있었다.
      // 책장을 뒤로(z -3.5 → **-4.1**) 물려 앉은 친구와 안 겹치게. -4.6 까지 물렸더니 이번엔
      // **숨는 자리(z -5.0)가 책장 안**이 되어 도토리·밤이 도망을 아예 못 갔다 — 사이로 맞춘다.
      const cover=place(furnishings,'bookcaseClosed',[3.4,3.2,.85],new THREE.Vector3(side*8.3,0,-4.1));if(cover)covers.push(cover);
      const base=place(furnishings,'cardboardBoxClosed',[2.5,.30,.85],new THREE.Vector3(side*8.3,0,-4.1));if(base)covers.push(base);
      place(furnishings,'pottedPlant',[.65,1.25,.65],new THREE.Vector3(side*11.3,0,-2.5));
      // 0152 — 책이 책장 **앞 허공**(z −3.4 · 책장 앞면 −3.68)에 떠 있었다 → 칸 안으로 넣는다.
      for(let i=0;i<3;i++)place(furnishings,'books',[.7,.3,.32],new THREE.Vector3(side*8.3,.3+i*.65,-4.1));
    }
    // 0050 ② — 이 책장이 **왼쪽 도망 통로**를 막고 있었다(땅콩이 x −10.4 에서 끼어 34px).
    // 카메라 쪽으로 0.6칸 당겨 통로를 넓힌다.
    const extra=place(furnishings,'bookcaseClosed',[2.1,3.2,.85],new THREE.Vector3(-10.8,0,-3.5));if(extra)covers.push(extra);
    // 13바퀴 4차 — 완두콩이 숨을 가구로 오른쪽에도 책장을 하나 세워 봤으나(x 12.0),
    // `coverBlocked` 는 그대로(0.042)였고 **도망 길만 막아** 미끄럼이 땅콩 1 → 78 ·
    // 해바라기씨 13 → 40 으로 늘었다. 되돌린다 — 완두콩 가릴 것 없음은 남은 것으로 적는다.
    cabinet.visible=false;
    place(furnishings,'sideTableDrawers',[1.05,1.15,.65],new THREE.Vector3(11.3,0,-.8));
    place(furnishings,'lampRoundTable',[.4,.65,.4],new THREE.Vector3(11.3,1.15,-.8));
  });
  // 1135 — 창틀(isWindowFrame)은 유리창이 커지면 같이 움직여야 하므로 굽기에서 뺀다.
  const fixed=scene.children.filter(o=>o!==floor && o!==windowMesh && o!==glass && !o.userData.isWindowFrame && !o.isLight);
  const bake=createStaticBake(scene,floor);
  let obstacles=[];
  function rebuild(desks,crates){
    const roots=[...fixed,...desks,...crates];obstacles=[];scene.updateMatrixWorld(true);
    for(const root of roots)root.traverse(o=>{
      if(!o.isMesh || Array.isArray(o.material) || o.material.transparent)return;
      const b=new THREE.Box3().setFromObject(o);
      if(b.min.y>1.8 || b.max.y<.12)return;
      // v8g: 자기 책상·자기 상자는 그 친구에게만 막힘이 아니다 — 앉아서 쓰는 물건이다.
      // 남들에게는 그대로 피해 갈 가구다.
      obstacles.push({key:root.userData.isDesk?'desk-'+root.userData.slotIndex:(root.userData.ownerKey?'crate-'+root.userData.ownerKey:(o.name || 'furniture')),
        minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,
        ignoreKeys:root.userData.ownerKey?[root.userData.ownerKey]:undefined});
    });
    // Keep the same occupied region while dropping duplicate/contained mesh
    // rectangles (chair parts and cupboard panels often repeat a footprint).
    obstacles=[...new Map(obstacles.map(o=>[[o.minX,o.maxX,o.minZ,o.maxZ,(o.ignoreKeys||[]).join('|')].join(','),o])).values()];
    obstacles=obstacles.filter((o,i,list)=>!list.some((b,j)=>i!==j && b.minX<=o.minX && b.maxX>=o.maxX && b.minZ<=o.minZ && b.maxZ>=o.maxZ
      && (b.ignoreKeys||[]).join('|')===(o.ignoreKeys||[]).join('|')));
    // 2350 ⑴ — 책상·의자·모니터는 **굽기에서 뺀다**. 구워 붙이면(merge) 원본을 옮겨도
    // 화면이 한 픽셀도 안 바뀌어서(2345 실측) 책상을 치우는 모습을 만들 수 없었다.
    // 다른 가구(책장·화분·창틀·바닥 소품)는 그대로 구워 둔다 — 렉은 전/후로 잰다.
    // 0152 — 씨앗 상자도 책상 위에 놓인 물건이라 **같이 살아 있어야** 한다.
    // 구워 두면 책상이 밀려 나간 자리에 상자만 남아 공중에 뜬 것처럼 보였다(사장님 01:51).
    for(const d of [...desks,...crates]){
      d.visible=true;d.userData.bakedSource=false;
      d.traverse(o=>{if(o.isMesh)for(const m of [o.material].flat())if(m)gradeMaterial(m);});
    }
    bake.rebuild([...fixed]);
  }
  return {quality,upgradeTree,glass,props:furnishings,environment:env,ready,desk,assets,place,covers,rebuild,get obstacles(){return obstacles;},bake,
    get info(){return {...assets.info,anisotropy:assets.anisotropy,props:['CC0 책상·회전의자·모니터·키보드·마우스·책·화분·책장·상자·머그','직접 만든 종이·씨앗 바구니']};}};
}

export function makeSeedBasket(key){
  const basket=new THREE.Group();
  basket.name='seed-basket-'+key;
  basket.scale.z=.79;
  const reed=mat(0xbe823e),lightReed=mat(0xe2ad63),darkReed=mat(0x9a5b30);
  const profile=[[0,.015],[.34,.015],[.38,.06],[.45,.27],[.49,.47],
    [.49,.50],[.445,.50],[.414,.28],[.335,.07],[0,.07]];
  basket.add(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),32),reed));
  for(let row=0;row<8;row++){
    const u=row/7;
    const band=new THREE.Mesh(new THREE.TorusGeometry(.373+.115*u,row===7?.047:.021,7,32),
      row===0?darkReed:lightReed);
    band.rotation.x=Math.PI/2;band.position.y=.055+.445*u;basket.add(band);
  }
  const weave=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.019,.060,2,5),darkReed,28*7);
  const marker=new THREE.Object3D();
  for(let row=0;row<7;row++)for(let i=0;i<28;i++){
    const a=(i+(row%2)*.5)*Math.PI*2/28;
    const r=.380+row*.016;
    marker.position.set(r*Math.cos(a),.085+row*.063,r*Math.sin(a));
    marker.rotation.set(0,-a,.24*(row%2?1:-1));
    marker.updateMatrix();
    weave.setMatrixAt(row*28+i,marker.matrix);
  }
  basket.add(weave);
  const arch=new THREE.EllipseCurve(0,.46,.47,.43,0,Math.PI).getPoints(24)
    .map(p=>new THREE.Vector3(p.x,p.y,0));
  basket.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arch),24,.039,8,false),lightReed));

  const style=SEED_STYLES[key],shape=seedGeometry(style.shape);
  const seeds=new THREE.InstancedMesh(shape,mat(0xffffff),26);
  const color=new THREE.Color(style.color);
  for(let i=0;i<seeds.count;i++){
    const a=i*2.39996,r=Math.sqrt((i+.5)/seeds.count)*.407;
    marker.position.set(r*Math.cos(a),.48+.09*(1-r/.407)+.04*Math.sin(i*3.15),r*Math.sin(a));
    marker.rotation.set(1.15*Math.cos(i),a,.8*Math.sin(i));
    marker.scale.fromArray(style.scale).multiplyScalar(1.42+.36*(i%3)/2);
    marker.updateMatrix();
    seeds.setMatrixAt(i,marker.matrix);
    seeds.setColorAt(i,color.clone().multiplyScalar(.83+.08*(i%5)));
  }
  basket.add(seeds);
  const throwingSeed=new THREE.Mesh(shape,mat(style.color));
  throwingSeed.scale.fromArray(style.scale).multiplyScalar(2.4);
  return {basket,throwingSeed,seedPile:seeds,seedCapacity:seeds.count};
}
