// The live key's byte arithmetic, including alpha rounding and green spill cap.
const LO = 65, HI = 170;
const VERTEX = `attribute vec2 position;
varying vec2 uv;
void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.0,1.0);}`;
const KEY = `precision highp float;
varying vec2 uv;
uniform sampler2D source;
void main(){
  vec3 c=floor(texture2D(source,uv).rgb*255.0+0.5);
  float diff=c.g-max(c.r,c.b);
  float a=floor(255.0*(1.0-clamp((diff-65.0)/105.0,0.0,1.0))+0.5);
  if(a<255.0){
    float spill=min(c.g,max(c.r,c.b)*1.05+10.0);
    float whole=floor(spill),fraction=spill-whole;
    c.g=whole+(fraction>0.5 ? 1.0 : fraction==0.5 ? mod(whole,2.0) : 0.0);
  }
  gl_FragColor=vec4(c/255.0,a/255.0);
}`;
const COMPOSITE = `precision highp float;
varying vec2 uv;
uniform sampler2D office;
uniform sampler2D camera;
uniform vec2 cameraScale;
uniform float cameraReady;
uniform float damage;
float hash(float n){return fract(sin(n*12.9898)*43758.5453);}
float segment(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.0,1.0));}
void main(){
  vec2 p=(uv-0.5)*cameraScale+0.5;
  p.x=1.0-p.x;
  vec3 bg=mix(vec3(.83,.90,.94),texture2D(camera,p).rgb,cameraReady);
  vec4 fg=texture2D(office,uv);
  if(damage>0.0 && fg.a<.995){
  for(int i=0;i<18;i++){
    float fi=float(i), enabled=step((fi+1.0)/18.0,damage);
    if(enabled<.5)continue;
    vec2 c=vec2(.22+hash(fi+1.0)*.56,.60+hash(fi+31.0)*.22);
    vec2 d=(uv-c)*vec2(1.7778,1.0);
    float stain=(1.0-smoothstep(.015,.047,length(d)))*.30;
    float seed=1.0-smoothstep(.007,.010,length(d*vec2(.7,1.45)));
    vec3 color=mix(vec3(.62,.36,.16),vec3(.96,.86,.65),seed);
    float alpha=max(stain,seed*.94);
    if(i>11){
      float crack=0.0;
      for(int j=0;j<4;j++){
        float angle=float(j)*1.57+fi;vec2 end=c+vec2(cos(angle)*.045,sin(angle)*.055);
        crack=max(crack,1.0-smoothstep(.0005,.0014,segment(uv,c,end)));
      }
      alpha=max(alpha,crack*.78);color=mix(color,vec3(.34,.25,.17),crack);
    }
    bg=mix(bg,color,alpha*enabled);
  }
  }
  gl_FragColor=vec4(fg.rgb*fg.a+bg*(1.0-fg.a),1.0);
}`;

function gpuRenderer(canvas){
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false, depth:false, stencil:false, premultipliedAlpha:false});
  if (!gl) throw new Error('WebGL unavailable');
  const resources = [];
  const sizes = new Map();
  function program(fragment){
    const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type,i) => {
      const s=gl.createShader(type); gl.shaderSource(s,i ? fragment : VERTEX); gl.compileShader(s);
      if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      resources.push(['Shader',s]); return s;
    });
    const p=gl.createProgram(); shaders.forEach(s=>gl.attachShader(p,s)); gl.linkProgram(p);
    resources.push(['Program',p]);
    if (!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function texture(w=1,h=1){
    const t=gl.createTexture(); resources.push(['Texture',t]); gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    return t;
  }
  function upload(t,source){
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    const w=source.videoWidth || source.width,h=source.videoHeight || source.height;
    const size=sizes.get(t);
    if(!size || size[0]!==w || size[1]!==h){
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);sizes.set(t,[w,h]);
    }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
  }
  const keyProgram=program(KEY), compositeProgram=program(COMPOSITE);
  const buffer=gl.createBuffer(); resources.push(['Buffer',buffer]);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const videoTexture=texture(), cameraTexture=texture(), keyedTexture=texture(canvas.width,canvas.height);
  const fbo=gl.createFramebuffer(); resources.push(['Framebuffer',fbo]);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,keyedTexture,0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete key framebuffer');
  gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.disable(gl.BLEND); gl.disable(gl.DITHER);
  function draw(p){
    gl.useProgram(p); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    const loc=gl.getAttribLocation(p,'position'); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  let cameraReady=false, scale=[1,1],damage=0;
  return {
    mode:'GPU', width:canvas.width, height:canvas.height,
    damage(value){damage=value;},
    key(source){
      upload(videoTexture,source); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
      gl.viewport(0,0,canvas.width,canvas.height); gl.useProgram(keyProgram);
      gl.uniform1i(gl.getUniformLocation(keyProgram,'source'),0); draw(keyProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    },
    render(camera,changed){
      if(!camera?.srcObject)cameraReady=false;
      if (camera?.readyState>=2 && changed){
        upload(cameraTexture,camera); cameraReady=true;
        const vw=camera.videoWidth, vh=camera.videoHeight;
        const cover=Math.max(canvas.width/vw,canvas.height/vh);
        scale=[canvas.width/(vw*cover),canvas.height/(vh*cover)];
      }
      gl.viewport(0,0,canvas.width,canvas.height); gl.useProgram(compositeProgram);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,keyedTexture);
      gl.uniform1i(gl.getUniformLocation(compositeProgram,'office'),0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,cameraTexture);
      gl.uniform1i(gl.getUniformLocation(compositeProgram,'camera'),1);
      gl.uniform2f(gl.getUniformLocation(compositeProgram,'cameraScale'),...scale);
      gl.uniform1f(gl.getUniformLocation(compositeProgram,'cameraReady'),cameraReady ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(compositeProgram,'damage'),damage);
      draw(compositeProgram);
    },
    dispose(){for(const [type,value] of resources)gl['delete'+type](value);},
  };
}

function cpuRenderer(canvas){
  const ctx=canvas.getContext('2d',{alpha:false});
  const key=document.createElement('canvas'); key.width=canvas.width/2; key.height=canvas.height/2;
  const kc=key.getContext('2d',{willReadFrequently:true});
  let damage=0;
  return {
    mode:'CPU (960×540)', width:key.width, height:key.height,
    damage(value){damage=value;},
    key(source){
      kc.drawImage(source,0,0,key.width,key.height);
      const frame=kc.getImageData(0,0,key.width,key.height), d=frame.data;
      for(let i=0;i<d.length;i+=4){
        const r=d[i], g=d[i+1], b=d[i+2], diff=g-Math.max(r,b);
        const a=diff<=LO ? 255 : diff>=HI ? 0 : Math.round(255*(1-(diff-LO)/(HI-LO)));
        d[i+3]=a;
        if(a<255)d[i+1]=Math.min(g,Math.max(r,b)*1.05+10);
      }
      kc.putImageData(frame,0,0);
    },
    render(camera){
      ctx.fillStyle='#d4e6ef';ctx.fillRect(0,0,canvas.width,canvas.height);
      if(camera?.readyState>=2){
        const scale=Math.max(canvas.width/camera.videoWidth,canvas.height/camera.videoHeight);
        const dw=camera.videoWidth*scale,dh=camera.videoHeight*scale;
        ctx.save();ctx.translate(canvas.width,0);ctx.scale(-1,1);
        ctx.drawImage(camera,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh);ctx.restore();
      }
      for(let i=0;i<Math.floor(damage*18);i++){
        const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
        const x=(.22+hash(i+1)*.56)*canvas.width,y=(.40-hash(i+31)*.22)*canvas.height;
        ctx.fillStyle='#9f552880';ctx.beginPath();ctx.ellipse(x,y,28,22,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#f7dcb7';ctx.beginPath();ctx.ellipse(x,y,12,8,.4,0,Math.PI*2);ctx.fill();
        if(i>11){ctx.strokeStyle='#682301b8';ctx.lineWidth=2;for(let j=0;j<4;j++){const a=j*1.57+i;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*85,y+Math.sin(a)*60);ctx.stroke();}}
      }
      ctx.drawImage(key,0,0,canvas.width,canvas.height);
    },
    dispose(){key.width=key.height=0;},
  };
}

export function createRenderer(canvas,{forceCPU=false,onFallback=()=>{}}={}){
  let current=canvas, renderer, lastSource,lastCamera,lastDamage=0;
  function fallback(reason){
    // Canvas context types cannot be changed after WebGL has been requested.
    renderer?.dispose();
    const replacement=current.cloneNode(false);
    current.replaceWith(replacement);current=replacement;
    renderer=cpuRenderer(current);renderer.damage(lastDamage);onFallback(reason);
  }
  if(forceCPU)renderer=cpuRenderer(current);
  else try{renderer=gpuRenderer(current);}catch(e){fallback(String(e));}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(renderer.mode==='GPU'){fallback('WebGL context lost');if(lastSource?.readyState>=2){renderer.key(lastSource);renderer.render(lastCamera,true);}}});
  return {
    get canvas(){return current;}, get mode(){return renderer.mode;},
    get width(){return renderer.width;},get height(){return renderer.height;},
    damage(value){lastDamage=value;renderer.damage(value);},
    dispose(){renderer.dispose();},
    key(source){
      lastSource=source;
      try{renderer.key(source);}catch(e){if(renderer.mode!=='GPU')throw e;fallback(String(e));renderer.key(source);}
    },
    render(camera,changed){
      lastCamera=camera;
      try{renderer.render(camera,changed);}catch(e){
        if(renderer.mode!=='GPU')throw e;fallback(String(e));if(lastSource)renderer.key(lastSource);renderer.render(camera,true);
      }
    },
  };
}

export function videoFrames(video){
  let dirty=true,lastTime=-1,id=null,stopped=false;
  const hasCallback=typeof video.requestVideoFrameCallback==='function';
  function next(){if(stopped)return;dirty=true;id=video.requestVideoFrameCallback(next);}
  if(hasCallback)id=video.requestVideoFrameCallback(next);
  const reset=()=>{
    dirty=true;lastTime=-1;
    if(hasCallback && !stopped){
      if(id!==null)video.cancelVideoFrameCallback(id);
      id=video.requestVideoFrameCallback(next);
    }
  };
  for(const event of ['loadeddata','seeked','emptied'])video.addEventListener(event,reset);
  return {
    take(){
      if(video.readyState<2)return false;
      if(!hasCallback && video.currentTime!==lastTime){dirty=true;lastTime=video.currentTime;}
      const changed=dirty;dirty=false;return changed;
    },
    reset,
    stop(){stopped=true;if(id!==null)video.cancelVideoFrameCallback(id);for(const event of ['loadeddata','seeked','emptied'])video.removeEventListener(event,reset);},
  };
}
