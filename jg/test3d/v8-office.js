import * as THREE from 'three';
import {loadOfficeAssets} from './v8-assets.js?v=20261123-8e';
import {gradeMaterial,createStaticBake} from './v8-lighting.js?v=20261123-8e';

function mat(color){return gradeMaterial(new THREE.MeshLambertMaterial({color}));}
function box(parent,w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;}
const pots=mat(0xf3e4c9),wood=mat(0xbd8d5c),paper=mat(0xf5eddb),metal=mat(0xadb6b5),ink=mat(0x4d493e);
function grainTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  x.fillStyle='#fffaf1';x.fillRect(0,0,512,512);x.strokeStyle='rgba(107,71,39,.12)';x.lineWidth=.8;
  for(let i=0;i<100;i++){x.beginPath();for(let y=0;y<=512;y+=4){const px=i*5.5+Math.sin(y*.035+i)*1.7;x.lineTo(px,y);}x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

export function furnishOffice({scene,renderer,dirLight,floor,windowMesh,windowZ,windowWidth,windowHeight,windowBottom,bazookaGroup}){
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
    bin.position.set(side*11.3,.21,.75);furnishings.add(bin);
    const pages=box(furnishings,.16,.025,.12,side*11.3,.36,.75,paper);pages.rotation.z=.24;
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
  function desk({pos,yaw,bonus,key,deskScale}){
    if(!assets.info.models.includes('desk'))return null;
    const g=new THREE.Group();g.userData.isDesk=true;
    const dir=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),side=new THREE.Vector3(dir.z,0,-dir.x);
    const center=pos.clone().addScaledVector(dir,.3).addScaledVector(side,1.85);center.y=0;
    place(g,'desk',[1.16,.42,.60],center,yaw);
    const monitor=center.clone().addScaledVector(dir,.08).addScaledVector(side,key==='wandukong3'?.46:.30);monitor.y=.42;
    place(g,'computerScreen',[.34,key==='wandukong3'?.26:.34,.07],monitor,yaw+Math.PI);
    const keyboard=center.clone().addScaledVector(dir,-.13);keyboard.y=.425;place(g,'computerKeyboard',[.28,.015,.11],keyboard,yaw);
    const mouse=keyboard.clone().addScaledVector(side,.21);place(g,'computerMouse',[.055,.023,.08],mouse,yaw);
    const chair=place(g,'chairDesk',[.46,.60,.48],pos.clone().addScaledVector(dir,.65).addScaledVector(side,1.85),yaw+Math.PI);
    if(chair)chair.userData.isOfficeChair=true;
    const books=center.clone().addScaledVector(side,-.35);books.y=.42;place(g,'books',[.17,.06,.17],books,yaw);
    if(bonus==='plant'){const pp=center.clone().addScaledVector(side,-.35).addScaledVector(dir,.15);pp.y=.42;place(g,'plantSmall1',[.13,.20,.13],pp);}
    if(bonus==='mug'){
      const pp=center.clone().addScaledVector(side,-.35).addScaledVector(dir,.16);pp.y=.42;
      place(g,'mug',[.09,.075,.065],pp,yaw);
    }
    const sx=deskScale*.78,sz=deskScale*.82;g.scale.set(sx,deskScale,sz);g.position.set(pos.x*(1-sx),0,pos.z*(1-sz));
    return g;
  }
  const covers=[];
  const ready=assets.ready.then(()=>{
    // The shelves serve as real opaque cover during the retreat. They sit
    // beside, rather than across, the seven friends' resting sight lines.
    for(const side of [-1,1]){
      const cover=place(furnishings,'bookcaseClosed',[3.4,3.2,.85],new THREE.Vector3(side*8.3,0,-3.5));if(cover)covers.push(cover);
      const base=place(furnishings,'cardboardBoxClosed',[2.5,.30,.85],new THREE.Vector3(side*8.3,0,-3.5));if(base)covers.push(base);
      place(furnishings,'pottedPlant',[.65,1.25,.65],new THREE.Vector3(side*11.3,0,-2.5));
      for(let i=0;i<3;i++)place(furnishings,'books',[.7,.3,.32],new THREE.Vector3(side*8.3,.3+i*.65,-3.4));
    }
    const extra=place(furnishings,'bookcaseClosed',[2.1,3.2,.85],new THREE.Vector3(-10.8,0,-3.5));if(extra)covers.push(extra);
    cabinet.visible=false;
    place(furnishings,'sideTableDrawers',[1.05,1.15,.65],new THREE.Vector3(11.3,0,-.8));
    place(furnishings,'lampRoundTable',[.4,.65,.4],new THREE.Vector3(11.3,1.15,-.8));
  });
  const fixed=scene.children.filter(o=>o!==floor && o!==windowMesh && o!==glass && o!==bazookaGroup && !o.isLight);
  const bake=createStaticBake(scene,floor);
  let obstacles=[];
  function rebuild(desks,crates){
    const roots=[...fixed,...desks,...crates];obstacles=[];scene.updateMatrixWorld(true);
    for(const root of roots)root.traverse(o=>{
      if(!o.isMesh || Array.isArray(o.material) || o.material.transparent)return;
      const b=new THREE.Box3().setFromObject(o);
      if(b.min.y>1.8 || b.max.y<.12)return;
      obstacles.push({key:root.userData.isDesk?'desk-'+root.userData.slotIndex:o.name || 'furniture',minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z});
    });
    // Keep the same occupied region while dropping duplicate/contained mesh
    // rectangles (chair parts and cupboard panels often repeat a footprint).
    obstacles=[...new Map(obstacles.map(o=>[[o.minX,o.maxX,o.minZ,o.maxZ].join(','),o])).values()];
    obstacles=obstacles.filter((o,i,list)=>!list.some((b,j)=>i!==j && b.minX<=o.minX && b.maxX>=o.maxX && b.minZ<=o.minZ && b.maxZ>=o.maxZ));
    bake.rebuild(roots);
  }
  return {quality,upgradeTree,glass,props:furnishings,environment:env,ready,desk,assets,place,covers,rebuild,get obstacles(){return obstacles;},bake,
    get info(){return {...assets.info,anisotropy:assets.anisotropy,props:['CC0 책상·회전의자·모니터·키보드·마우스·책·화분·책장·상자·머그','직접 만든 종이·장난감']};}};
}

export function makePeaGun(){
  const g=new THREE.Group();g.name='authored-pea-pod-toy';const pod=mat(0x6d9e48,.55),rim=mat(0xb5d675,.62),grip=mat(0xe0bc7b);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.29,3,8),pod);body.rotation.x=Math.PI/2;g.add(body);
  for(let i=0;i<4;i++){const pea=new THREE.Mesh(new THREE.SphereGeometry(.041,8,6),rim);pea.position.set(.025,.035,-.11+i*.075);g.add(pea);}
  box(g,.055,.11,.06,0,-.075,-.06,grip);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(.052,.013,5,10),rim);lip.position.z=.20;g.add(lip);
  return g;
}

export function makeAcornBazooka(){
  const g=new THREE.Group();g.name='authored-acorn-shell-toy';
  const shell=mat(0xd0a368,.53),cap=mat(0x8c5530,.72),rim=mat(0xe6d1a4,.48);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,.85,12,1,true),shell);body.rotation.x=Math.PI/2;g.add(body);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.185,.035,6,14),rim);ring.position.z=.43;g.add(ring);
  const back=new THREE.Mesh(new THREE.SphereGeometry(.23,12,8),cap);back.scale.set(1,1,.55);back.position.z=-.45;g.add(back);
  for(const x of [-.18,.18]){const foot=box(g,.06,.4,.08,x,-.28,-.08,wood);foot.rotation.z=x<0?-.3:.3;}
  return g;
}
