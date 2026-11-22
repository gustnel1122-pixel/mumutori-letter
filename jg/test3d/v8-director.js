// Durations are seconds. The encounter is latched, so a very near face cannot
// skip the attack by immediately changing the old detector level from 2 to 3.
export const SCENES = Object.freeze([
  {id:'notice',emotion:'surprised',duration:1.5,label:'손님 발견'},
  {id:'equip',emotion:'determined',duration:1.5,label:'씨앗 장난감 준비'},
  {id:'throw',emotion:'excited',duration:3,label:'씨앗 던지기'},
  {id:'gun',emotion:'excited',duration:4.5,label:'완두콩 깍지 총'},
  {id:'bazooka',emotion:'excited',duration:5,label:'도토리 바주카'},
  {id:'mess',emotion:'proud',duration:2,label:'창문이 엉망!'},
  {id:'celebrate',emotion:'proud',duration:2.5,label:'뿌듯한 인사'},
  {id:'recover',emotion:'tired',duration:4,label:'정리하고 다시 일하기'},
]);
export const ATTACK_SECONDS = SCENES.filter(s=>['throw','gun','bazooka'].includes(s.id)).reduce((n,s)=>n+s.duration,0);
export const ENCOUNTER_SECONDS = SCENES.reduce((n,s)=>n+s.duration,0);

export class SceneDirector {
  constructor(){this.elapsed=0;this.active=false;this.armed=true;this.absent=0;this.encounters=0;}
  begin(){if(this.active)return false;this.active=true;this.armed=false;this.elapsed=0;this.encounters++;return true;}
  update(dt,level){
    if(level===0)this.absent+=dt;else this.absent=0;
    if(!this.active && this.absent>=2)this.armed=true;
    if(!this.active && this.armed && level>=2)this.begin();
    if(this.active){this.elapsed+=dt;if(this.elapsed>=ENCOUNTER_SECONDS){this.elapsed=0;this.active=false;}}
    return this.snapshot(level);
  }
  snapshot(level=0){
    if(!this.active)return {id:level===1?'lookup':'work',emotion:level===1?'surprised':'working',age:0,progress:0,elapsed:0,active:false,clean:1,encounters:this.encounters};
    let start=0;
    for(const scene of SCENES){
      if(this.elapsed<start+scene.duration)return {...scene,age:this.elapsed-start,progress:(this.elapsed-start)/scene.duration,
        elapsed:this.elapsed,active:true,clean:scene.id==='recover'?(this.elapsed-start)/scene.duration:0,encounters:this.encounters};
      start+=scene.duration;
    }
    return {id:'work',emotion:'working',active:false,age:0,progress:0,clean:1};
  }
}

export const QUALITY = Object.freeze([
  {id:'low',label:'가벼움',scale:0.65,shadow:0,transmission:0},
  {id:'medium',label:'균형',scale:0.85,shadow:512,transmission:0},
  {id:'high',label:'선명함',scale:1,shadow:1024,transmission:0.16},
]);
export class AdaptiveQuality {
  constructor(initial=2){this.level=initial;this.mode='auto';this.seconds=0;this.frames=0;this.slow=0;this.fast=0;this.extraScale=1;}
  sample(dt){
    if(this.mode!=='auto' || dt<=0)return false;
    this.seconds+=dt;this.frames++;
    if(this.seconds<3)return false;
    const fps=this.frames/this.seconds;this.seconds=0;this.frames=0;
    this.slow=fps<34?this.slow+1:0;this.fast=fps>54?this.fast+1:0;
    if(this.slow>=2){
      this.slow=0;this.fast=0;
      if(this.level>0){this.level--;return true;}
      if(this.extraScale>0.77){this.extraScale=0.77;return true;}
    }
    if(this.fast>=5 && this.level<2){this.fast=0;this.level++;this.extraScale=1;return true;}
    return false;
  }
  choose(mode){this.mode=mode;if(mode!=='auto')this.level=Math.max(0,QUALITY.findIndex(q=>q.id===mode));this.extraScale=1;this.slow=this.fast=0;this.seconds=this.frames=0;}
  get current(){return {...QUALITY[this.level],scale:QUALITY[this.level].scale*this.extraScale};}
}
