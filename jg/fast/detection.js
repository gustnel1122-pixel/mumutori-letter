export class WorkerDetector {
  constructor(){
    this.worker=new Worker(new URL('./detect-worker.js?v=2026-11-22-fast-1',import.meta.url));
    this.pending=new Map();this.serial=0;this.busy=false;
    this.worker.onmessage=({data})=>{
      const p=this.pending.get(data.id);if(!p)return;
      clearTimeout(p.timer);this.pending.delete(data.id);
      if(data.error)p.reject(new Error(data.error));else p.resolve(data.result);
    };
    this.worker.onerror=e=>{e.preventDefault();this.close(new Error(e.message || 'Detector worker failed'));};
    this.worker.onmessageerror=()=>this.close(new Error('Detector worker message failed'));
  }
  request(type,payload={},transfer=[]){
    return new Promise((resolve,reject)=>{
      const id=++this.serial;
      const timer=setTimeout(()=>this.close(new Error('Detector worker timed out')),30000);
      this.pending.set(id,{resolve,reject,timer});
      try{this.worker.postMessage({id,type,...payload},transfer);}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}
    });
  }
  init(options){return this.request('init',{options});}
  ensureBody(){return this.request('body');}
  async detect(source,options){
    if(this.busy)return null;
    this.busy=true;
    let bitmap;
    try{
      bitmap=await createImageBitmap(source);
      return await this.request('detect',{...options,bitmap},[bitmap]);
    }finally{bitmap?.close();this.busy=false;}
  }
  close(reason=new Error('Detector worker closed')){
    this.worker.terminate();
    for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(reason);}
    this.pending.clear();
  }
}

// A timer task after rAF lets the browser finish that rendering opportunity first.
export function afterPaint(){return new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));}
