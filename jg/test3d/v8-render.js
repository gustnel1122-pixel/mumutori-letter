import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

export function createRenderPipeline(renderer,scene,camera){
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
  if(renderer.capabilities.isWebGL2)target.samples=4;
  const composer=new EffectComposer(renderer,target),beauty=new RenderPass(scene,camera);
  const ao=new SSAOPass(scene,camera,1,1,24);
  ao.kernelRadius=1.1;ao.minDistance=.001;ao.maxDistance=.025;
  ao.ssaoMaterial.fragmentShader=ao.ssaoMaterial.fragmentShader.replace('1.0 - occlusion','1.0 - occlusion * 0.32');
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.075,.22,1.25);
  const output=new OutputPass(),fxaa=new ShaderPass(FXAAShader);
  [beauty,ao,bloom,output,fxaa].forEach(pass=>composer.addPass(pass));
  let current;
  function resize(){
    const canvas=renderer.domElement,w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),dpr=renderer.getPixelRatio();
    composer.setPixelRatio(dpr);composer.setSize(w,h);
    fxaa.material.uniforms.resolution.value.set(1/(w*dpr),1/(h*dpr));
  }
  return {
    resize,
    quality(q){current=q;ao.enabled=q.ao;bloom.enabled=q.bloom;resize();},
    render(){composer.render();},
    inspect(){return {antialias:renderer.getContext().getContextAttributes().antialias,msaa:target.samples,pixelRatio:renderer.getPixelRatio(),devicePixelRatio:devicePixelRatio,
      canvas:[renderer.domElement.width,renderer.domElement.height],ssao:!!current?.ao,bloom:!!current?.bloom,shadow:current?.shadow,toneMapping:'ACESFilmic',output:'sRGB'};},
  };
}
