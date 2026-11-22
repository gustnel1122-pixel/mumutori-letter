import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const names=['desk','chairDesk','computerScreen','computerKeyboard','computerMouse','pottedPlant','plantSmall1','books','bookcaseClosed','cardboardBoxOpen','cardboardBoxClosed','sideTableDrawers','lampRoundTable','mug'];
export function loadOfficeAssets({renderer,scene}){
  const templates=new Map(),loader=new GLTFLoader(),info={models:[],hdr:'loading',errors:[]},anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  function textures(root){root.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;for(const m of [o.material].flat()){
    m.roughness=Math.max(.46,m.roughness??.65);m.envMapIntensity=.32;
    for(const value of Object.values(m))if(value?.isTexture)value.anisotropy=anisotropy;
  }});}
  const ready=Promise.all([
    ...names.map(async name=>{try{const {scene:root}=await loader.loadAsync(new URL('./assets/kenney/'+name+'.glb',import.meta.url).href);textures(root);templates.set(name,root);info.models.push(name);}catch(e){info.errors.push(name+': '+e.message);}}),
  ]);
  info.hdr='v8e: baked static lighting; no runtime HDR';
  function model(name,size){
    const template=templates.get(name);if(!template)return null;
    const copy=template.clone(true);copy.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});
    const bounds=new THREE.Box3().setFromObject(copy),actual=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const holder=new THREE.Group();copy.position.set(-center.x,-bounds.min.y,-center.z);holder.add(copy);
    holder.scale.set(size[0]/actual.x,size[1]/actual.y,size[2]/actual.z);holder.userData.cc0Model=name;return holder;
  }
  return {ready,model,info,anisotropy};
}
