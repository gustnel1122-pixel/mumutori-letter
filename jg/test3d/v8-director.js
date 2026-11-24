// One shared encounter clock drives every friend's pose, expression and props.
export const SCENES = Object.freeze([
  // 1241 ②: 손님을 발견한 순간은 '결심(눈 0.58·기울기 0.35)' 이 아니라 **놀람**이어야 한다.
  // 0224 P30 "무서움을 눈 각도로 내지 말 것" — determined 가 눈을 가늘게·기울게 만들고 있었다.
  // 7바퀴 ③ — 0.5초면 반응 시차(0~0.45초)가 끝나기도 전에 장면이 넘어가 '일곱이 동시에' 놀란 것처럼 보였다.
  {id:'notice',emotion:'surprised',duration:1,label:'앗, 손님이다!'},
  {id:'equip',emotion:'determined',duration:5,label:'씨앗 보관함으로!'},
  {id:'ready',emotion:'determined',duration:1,label:'모두 자리 잡기'},
  {id:'throw',emotion:'excited',duration:4.5,label:'씨앗 던지기'},
  {id:'gun',emotion:'excited',duration:6,label:'완두콩 깍지 총'},
  {id:'fetch',emotion:'determined',duration:3.5,label:'도토리 바주카 가져오기'},
  {id:'bazooka',emotion:'excited',duration:6.5,label:'도토리 바주카'},   // 0224: 공격을 12.5초 → 17초로
  {id:'mess',emotion:'proud',duration:2,label:'창문이 엉망!'},
  {id:'escape',emotion:'surprised',duration:3,label:'들켰다, 다 같이 숨자!'},
  {id:'hide',emotion:'surprised',duration:2,label:'쉿… 손님이 지나가길 기다려요'},
  {id:'peek',emotion:'surprised',duration:3.5,label:'한 명씩 빼꼼'},
  {id:'recover',emotion:'working',duration:3,label:'유리창 닦고 다시 일하기'},
]);
export const ATTACK_SECONDS=SCENES.filter(s=>['throw','gun','bazooka'].includes(s.id)).reduce((n,s)=>n+s.duration,0);
export const ENCOUNTER_SECONDS=SCENES.reduce((n,s)=>n+s.duration,0);
const starts=Object.fromEntries(SCENES.map((s,i)=>[s.id,SCENES.slice(0,i).reduce((n,v)=>n+v.duration,0)]));

export class SceneDirector {
  constructor(){this.elapsed=0;this.active=false;this.armed=true;this.absent=0;this.encounters=0;this.demoMode=false;this.level=0;}
  begin(demo=false){if(this.active)return false;this.active=true;this.armed=false;this.elapsed=0;this.encounters++;this.demoMode=demo;return true;}
  update(dt,level){
    this.level=level;this.absent=level===0?this.absent+dt:0;
    if(!this.active && this.absent>=2)this.armed=true;
    if(!this.active && this.armed && level>=1)this.begin();
    if(this.active){
      const before=this.snapshot();this.elapsed+=dt;
      // Presence holds hiding until the visitor has been gone for two seconds.
      if(before.id==='hide' && !this.demoMode && (level>0 || this.absent<2))this.elapsed=Math.min(this.elapsed,starts.peek-.001);
      if(['peek','recover'].includes(before.id) && level>0 && !this.demoMode)this.elapsed=starts.escape;
      if(this.elapsed>=ENCOUNTER_SECONDS){this.elapsed=0;this.active=false;this.demoMode=false;}
    }
    return this.snapshot();
  }
  snapshot(){
    if(!this.active)return {id:'work',mode:'work',emotion:'working',age:0,progress:0,elapsed:0,active:false,clean:1,encounters:this.encounters};
    let start=0;
    for(const s of SCENES){
      if(this.elapsed<start+s.duration)return {...s,mode:['escape','hide','peek','recover'].includes(s.id)?s.id:'battle',age:this.elapsed-start,progress:(this.elapsed-start)/s.duration,
        elapsed:this.elapsed,active:true,clean:s.id==='recover'?(this.elapsed-start)/s.duration:0,encounters:this.encounters,demo:this.demoMode};
      start+=s.duration;
    }
    return {id:'work',mode:'work',emotion:'working',active:false,age:0,progress:0,clean:1};
  }
}

export const QUALITY=Object.freeze([
  {id:'low',label:'가벼움',scale:.85,shadow:0,transmission:0,ao:false,bloom:false},
  {id:'medium',label:'균형',scale:1,shadow:0,transmission:0,ao:false,bloom:false},
  {id:'high',label:'선명',scale:1,shadow:0,transmission:0,ao:false,bloom:false},
]);
export class AdaptiveQuality {
  constructor(){this.level=2;this.mode='auto';this.resetSamples();}
  resetSamples(){this.seconds=0;this.frames=0;this.slow=0;this.fast=0;this.lastSampleFPS=0;}
  sample(dt){
    if(this.mode!=='auto' || dt<=0 || dt>5)return false;
    this.seconds+=dt;this.frames++;
    if(this.seconds<1)return false;
    const seconds=this.seconds,fps=this.frames/seconds;this.lastSampleFPS=fps;this.seconds=0;this.frames=0;
    this.slow=fps<24?this.slow+seconds:0;this.fast=fps>=38?this.fast+seconds:0;
    if(this.slow>5 && this.level>0){this.level--;this.slow=this.fast=0;return true;}
    if(this.fast>=8 && this.level<2){this.level++;this.slow=this.fast=0;return true;}
    return false;
  }
  choose(mode){this.mode=mode;if(mode!=='auto')this.level=QUALITY.findIndex(q=>q.id===mode);else this.level=2;this.resetSamples();}
  get current(){return {...QUALITY[this.level]};}
}
