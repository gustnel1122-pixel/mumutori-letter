import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const grade=`#include <colorspace_fragment>
  float jgLuma=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));
  gl_FragColor.rgb=mix(vec3(jgLuma),gl_FragColor.rgb,1.10);
  gl_FragColor.rgb=clamp((gl_FragColor.rgb-.5)*1.12+.5,0.0,1.0);`;
export function gradeMaterial(material){
  if(material.userData.jgGraded)return material;
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,...args){previous.call(this,shader,...args);shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>',grade);};
  material.customProgramCacheKey=()=> 'jg-v8e-graded';material.userData.jgGraded=true;material.needsUpdate=true;return material;
}

// Static normals and colors are baked once into vertex colors, then opaque
// furniture sharing a texture is batched. No lights or shadows run on it.
export function createStaticBake(scene,floor){
  const group=new THREE.Group();group.name='v8e-baked-office';scene.add(group);
  const key=new THREE.Vector3(-3,9,5).normalize(),normal=new THREE.Vector3(),color=new THREE.Color();
  const c=document.createElement('canvas');c.width=2048;c.height=1536;
  const ctx=c.getContext('2d'),texture=new THREE.CanvasTexture(c);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(30,23),gradeMaterial(new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:.32})));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.008,-1);scene.add(shadow);
  let sources=[],batches=0;
  function rebuild(roots){
    sources.forEach(o=>{if(o.parent)o.visible=true;});sources=roots;
    for(const mesh of [...group.children]){group.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
    scene.updateMatrixWorld(true);const buckets=new Map();ctx.clearRect(0,0,c.width,c.height);
    roots.forEach(root=>{
      root.visible=true;root.updateMatrixWorld(true);
      root.traverse(mesh=>{
        if(!mesh.isMesh || !mesh.visible || Array.isArray(mesh.material) || mesh.material.transparent)return;
        let parent=mesh.parent;while(parent && parent!==root && parent.visible)parent=parent.parent;
        if(parent && parent!==root)return;
        const material=mesh.material;
        const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
        const p=geometry.attributes.position,n=geometry.attributes.normal,colors=new Float32Array(p.count*3);
        for(let i=0;i<p.count;i++){
          normal.fromBufferAttribute(n,i).normalize();
          const light=.55+.68*Math.max(0,normal.dot(key))+.10*Math.max(0,normal.y);
          color.copy(material.color || new THREE.Color(0xffffff)).multiplyScalar(light);
          if(geometry.attributes.color)color.multiply(new THREE.Color().fromBufferAttribute(geometry.attributes.color,i));
          colors.set([color.r,color.g,color.b],i*3);
        }
        const baked=new THREE.BufferGeometry();baked.setAttribute('position',p.clone());baked.setAttribute('color',new THREE.BufferAttribute(colors,3));
        if(material.map)baked.setAttribute('uv',geometry.attributes.uv?.clone() || new THREE.BufferAttribute(new Float32Array(p.count*2),2));
        const id=(material.map?.uuid || 'solid')+':'+material.side;
        if(!buckets.has(id))buckets.set(id,{geometries:[],map:material.map,side:material.side});
        buckets.get(id).geometries.push(baked);geometry.dispose();
      });
      const bounds=new THREE.Box3().setFromObject(root);
      if(root.userData.isDesk || root.userData.cc0Model){
        const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
        const x=(center.x/30+.5)*c.width,y=((center.z+1)/23+.5)*c.height;
        ctx.save();ctx.translate(x,y);ctx.scale(Math.max(.3,size.x)*c.width/30,Math.max(.3,size.z)*c.height/23);
        const g=ctx.createRadialGradient(0,0,.05,0,0,.75);g.addColorStop(0,'rgba(37,31,24,.65)');g.addColorStop(1,'rgba(37,31,24,0)');ctx.fillStyle=g;ctx.fillRect(-.8,-.8,1.6,1.6);ctx.restore();
      }
      root.visible=false;root.userData.bakedSource=true;
    });
    for(const {geometries,map,side} of buckets.values()){
      const combined=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
      group.add(new THREE.Mesh(combined,gradeMaterial(new THREE.MeshBasicMaterial({vertexColors:true,map,side}))));
    }
    texture.needsUpdate=true;batches=group.children.length;
  }
  gradeMaterial(floor.material);
  return {rebuild,inspect:()=>({batches,sources:sources.length,shadow:'authored floor texture + actor contact textures'})};
}
