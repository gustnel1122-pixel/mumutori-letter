// v8e: one native-resolution draw, no HDR targets or screen-space passes.
export function createRenderPipeline(renderer,scene,camera){
  let frames=0,lastCPU=0;
  return {
    resize(){},quality(){},
    render(){const start=performance.now();renderer.render(scene,camera);lastCPU=performance.now()-start;frames++;},
    inspect(){const gl=renderer.getContext();return {antialias:gl.getContextAttributes().antialias,msaa:gl.getParameter(gl.SAMPLES),offscreenMSAA:0,pixelRatio:renderer.getPixelRatio(),devicePixelRatio,
      canvas:[renderer.domElement.width,renderer.domElement.height],ssao:false,bloom:false,shadow:0,transmission:0,
      toneMapping:'ACESFilmic',output:'sRGB',contrast:1.12,saturation:1.10,passes:1,frames,cpuSubmitMS:lastCPU,
      drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries};},
  };
}
