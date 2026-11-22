// Classic worker: the pinned MediaPipe WASM loader uses importScripts.
importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.js');
let vision, face, body, faceDelegate, bodyDelegate='-', options, confidence;
async function create(Model,url,extra){
  async function make(delegate){
    return Model.createFromOptions(vision,{
      canvas:new OffscreenCanvas(1,1),baseOptions:{modelAssetPath:url,delegate},runningMode:'VIDEO',...extra,
    });
  }
  if(!options.forceCPU)try{return {model:await make('GPU'),delegate:'GPU'};}catch(e){/* CPU fallback below */}
  return {model:await make('CPU'),delegate:'CPU'};
}
async function ensureBody(){
  if(body)return;
  const result=await create(Vision.ObjectDetector,options.bodyURL,{maxResults:5,scoreThreshold:options.bodyScore,categoryAllowlist:['person']});
  body=result.model;bodyDelegate=result.delegate;
}
const crop=new OffscreenCanvas(1,1), cropCtx=crop.getContext('2d');
async function handle(msg){
  const {id,type}=msg;
  let bitmap=msg.bitmap;
  try{
    let result;
    if(type==='init'){
      options=msg.options;confidence=options.confidence;
      vision=await Vision.FilesetResolver.forVisionTasks(options.wasmBase);
      const created=await create(Vision.FaceDetector,options.faceURL,{minDetectionConfidence:confidence});
      face=created.model;faceDelegate=created.delegate;result={faceDelegate,bodyDelegate};
    }else if(type==='body'){
      await ensureBody();result={faceDelegate,bodyDelegate};
    }else if(type==='detect'){
      if(msg.confidence!==confidence){await face.setOptions({minDetectionConfidence:msg.confidence});confidence=msg.confidence;}
      const w=bitmap.width,h=bitmap.height;
      let source=bitmap,x=0,y=0,sx=1,sy=1;
      if(msg.crop){
        const cw=w*0.6,ch=h*0.6;x=(w-cw)/2;y=(h-ch)/2;
        crop.width=Math.round(cw);crop.height=Math.round(ch);
        cropCtx.drawImage(bitmap,x,y,cw,ch,0,0,crop.width,crop.height);
        source=crop;sx=cw/crop.width;sy=ch/crop.height;
      }
      const start=performance.now();
      const faces=face.detectForVideo(source,msg.timestamp).detections;
      const faceMs=performance.now()-start;
      if(msg.crop)for(const d of faces){const b=d.boundingBox;if(b)d.boundingBox={...b,originX:x+b.originX*sx,originY:y+b.originY*sy,width:b.width*sx,height:b.height*sy};}
      let bodies=null,bodyMs=0;
      if(msg.body && body){const t=performance.now();bodies=body.detectForVideo(bitmap,msg.timestamp).detections;bodyMs=performance.now()-t;}
      result={faces,bodies,faceMs,bodyMs,faceDelegate,bodyDelegate};
    }else throw new Error('Unknown detector operation');
    self.postMessage({id,result});
  }catch(e){self.postMessage({id,error:String(e)});}
  finally{bitmap?.close();}
}
// Serialize model setup and options as well as inference; never retain a frame queue.
let chain=Promise.resolve();
self.onmessage=({data})=>{chain=chain.then(()=>handle(data));};
