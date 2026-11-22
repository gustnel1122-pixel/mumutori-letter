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
  // Grade display colors after the single ACES/sRGB conversion. Lower HDR fill
  // restores shape; this small contrast adjustment keeps the original GLB hues.
  const grade=new ShaderPass({
    uniforms:{tDiffuse:{value:null},contrast:{value:1.12},saturation:{value:1.10}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform float contrast;uniform float saturation;varying vec2 vUv;
      void main(){vec4 c=texture2D(tDiffuse,vUv);float luma=dot(c.rgb,vec3(.2126,.7152,.0722));
      c.rgb=mix(vec3(luma),c.rgb,saturation);c.rgb=clamp((c.rgb-.5)*contrast+.5,0.0,1.0);gl_FragColor=c;}`,
  });
  const output=new OutputPass(),fxaa=new ShaderPass(FXAAShader);
  [beauty,ao,bloom,output,grade,fxaa].forEach(pass=>composer.addPass(pass));
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
      canvas:[renderer.domElement.width,renderer.domElement.height],ssao:!!current?.ao,bloom:!!current?.bloom,shadow:current?.shadow,toneMapping:'ACESFilmic',output:'sRGB',
      contrast:grade.uniforms.contrast.value,saturation:grade.uniforms.saturation.value};},
  };
}
