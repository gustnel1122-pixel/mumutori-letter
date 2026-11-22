import * as THREE from 'three';

function mat(color,roughness=.65,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function box(parent,w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;}
const pots=mat(0xf3e4c9),leaf=mat(0x4c8b45),wood=mat(0xbd8d5c,.68),paper=mat(0xf5eddb,.95),metal=mat(0xadb6b5,.3,.65),ink=mat(0x4d493e,.85);
function grainTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle='#fffaf1';x.fillRect(0,0,128,128);x.strokeStyle='rgba(107,71,39,.15)';x.lineWidth=.65;
  for(let i=0;i<30;i++){x.beginPath();for(let y=0;y<=128;y+=4){const px=i*4.5+Math.sin(y*.035+i)*1.7;x.lineTo(px,y);}x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// Authored HDR radiance values (up to 9.0), converted once to a small PMREM.
// No downloaded HDR image or third-party scene assets are used.
function environment(renderer){
  const w=128,h=64,data=new Float32Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w,v=y/h,i=(y*w+x)*4;
    const sun=Math.exp(-((u-.22)**2/.004+(v-.30)**2/.012))*8;
    const window=(u>.55 && u<.8 && v>.25 && v<.58)?2.4:0;
    const sky=.20+.7*Math.max(0,1-v*1.5);
    data[i]=sky*.95+sun+window;data[i+1]=sky+sun*.88+window*.94;data[i+2]=sky*1.1+sun*.67+window*.83;data[i+3]=1;
  }
  const texture=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,THREE.FloatType);
  texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(texture);
  pmrem.dispose();texture.dispose();return target;
}

function plant(parent,x,z,scale=1){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.23,.17,.37,12),pots);pot.position.y=.185;g.add(pot);
  for(let i=0;i<8;i++){
    const a=i*2.4,m=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),leaf);
    m.scale.set(.6,2.7,.35);m.position.set(Math.cos(a)*.17,.52+i%3*.13,Math.sin(a)*.17);m.rotation.z=Math.sin(a)*.7;g.add(m);
  }
}

export function furnishOffice({scene,renderer,dirLight,floor,windowMesh,windowZ,windowWidth,windowHeight,windowBottom}){
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
  let env=null;
  try{env=environment(renderer);scene.environment=env.texture;}catch(e){console.warn('HDR 환경맵 미지원 → 반구 조명 사용:',e);}
  wood.map=grainTexture();wood.needsUpdate=true;
  const cache=new WeakMap();
  const upgrade=original=>{
    if(!original || original.isMeshBasicMaterial || original.isSpriteMaterial)return original;
    if(cache.has(original))return cache.get(original);
    const m=new THREE.MeshStandardMaterial({color:original.color?.clone() || 0xffffff,map:original.map || null,
      transparent:original.transparent,opacity:original.opacity,alphaTest:original.alphaTest,side:original.side,
      roughness:.76,metalness:0,envMapIntensity:.6});cache.set(original,m);return m;
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
  floor.material=new THREE.MeshPhysicalMaterial({color:0xded6c6,roughness:.46,metalness:.08,clearcoat:.16,clearcoatRoughness:.5,envMapIntensity:.62});
  scene.children.filter(o=>o.isAmbientLight).forEach(o=>o.intensity=.35);
  dirLight.color.set(0xffebd0);dirLight.intensity=2.4;dirLight.position.set(-3,7,4);
  dirLight.target.position.set(0,.3,-2);scene.add(dirLight.target);
  dirLight.shadow.camera.left=-8;dirLight.shadow.camera.right=8;dirLight.shadow.camera.top=8;dirLight.shadow.camera.bottom=-8;
  dirLight.shadow.camera.near=.1;dirLight.shadow.camera.far=26;dirLight.shadow.bias=-.0004;dirLight.shadow.normalBias=.025;
  dirLight.shadow.radius=3;
  scene.add(new THREE.HemisphereLight(0xdcefff,0x9b7953,.55));
  const furnishings=new THREE.Group();furnishings.name='v8-authored-office-props';scene.add(furnishings);
  // Side shelving keeps the central window unobstructed.
  for(const side of [-1,1]){
    const x=side*5.15,z=-5.5;
    box(furnishings,1.3,.08,.48,x,.12,z,wood);
    for(const y of [.15,.85,1.55])box(furnishings,1.3,.06,.48,x,y,z,wood);
    for(const dx of [-.62,.62])box(furnishings,.06,1.65,.48,x+dx,.83,z,metal);
    for(let i=0;i<6;i++)box(furnishings,.11,.35+(i%3)*.04,.28,x-.47+i*.17,1.75+(i%3)*.02,z,mat([0xaec3b2,0xe5bd79,0xb8bfce][i%3]));
    box(furnishings,.38,.28,.34,x-.25,1.02,z,pots);box(furnishings,.35,.22,.31,x+.26,.99,z,wood);
    plant(furnishings,x,-4.7,.9);
  }
  // Whiteboard, marker tray and abstract work diagrams; no customer letter text.
  const board=new THREE.Group();board.position.set(-5.25,1.9,-5.45);board.rotation.y=.18;furnishings.add(board);
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
    bin.position.set(side*4.45,.21,.75);furnishings.add(bin);
    const pages=box(furnishings,.16,.025,.12,side*4.45,.36,.75,paper);pages.rotation.z=.24;
  }
  const cabinet=new THREE.Group();cabinet.position.set(5.25,0,-.8);furnishings.add(cabinet);
  box(cabinet,1.05,1.15,.65,0,.575,0,mat(0xdbccad));
  for(let i=0;i<3;i++){box(cabinet,.96,.32,.025,0,.22+i*.35,.34,pots);box(cabinet,.22,.025,.04,0,.22+i*.35,.37,metal);}
  for(let i=0;i<4;i++)box(cabinet,.46,.035,.34,(i%2)*.1-.05,1.2+i*.037,0,paper);
  // Fine floor seams supply depth without adding geometry-heavy furniture.
  const seams=[];
  for(let x=-8;x<=8;x+=1.3)seams.push(x,.004,-7,x,.004,4);
  for(let z=-7;z<=4;z+=1.3)seams.push(-8,.004,z,8,.004,z);
  const seamGeometry=new THREE.BufferGeometry();seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seams,3));
  furnishings.add(new THREE.LineSegments(seamGeometry,new THREE.LineBasicMaterial({color:0xb7b0a5,transparent:true,opacity:.25})));
  // PBR glass in front of the same sky pane. Transmission is disabled on lower tiers.
  const glassMaterial=new THREE.MeshPhysicalMaterial({color:0xdceefa,roughness:.08,metalness:0,transparent:true,opacity:.12,
    transmission:.16,thickness:.06,ior:1.45,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:.65,depthWrite:false});
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(windowWidth,windowHeight),glassMaterial);
  glass.position.copy(windowMesh.position);glass.position.z=windowZ+.018;glass.renderOrder=1;scene.add(glass);
  upgradeTree(furnishings);
  function quality(q){
    const enabled=q.shadow>0;
    renderer.shadowMap.enabled=enabled;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    dirLight.castShadow=enabled;
    if(dirLight.shadow.mapSize.x!==q.shadow && enabled){dirLight.shadow.map?.dispose();dirLight.shadow.map=null;dirLight.shadow.mapSize.set(q.shadow,q.shadow);}
    glassMaterial.transmission=q.transmission;glassMaterial.needsUpdate=true;
    renderer.setPixelRatio(q.scale);
  }
  return {quality,upgradeTree,glass,props:furnishings,environment:env,info:{hdr:env?'authored float radiance 128×64 → PMREM':'hemisphere fallback (HDR unavailable)',props:['책장','화이트보드','서류함','머그','책·서류','화분','재활용통','바닥 줄눈']}};
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
