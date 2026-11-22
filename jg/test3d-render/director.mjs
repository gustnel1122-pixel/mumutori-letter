export class Director {
  constructor(){this.state='idle';this.present=false;this.lastSeen=-Infinity;this.positives=0;this.transitions=[];this.holdAt=18.8;this.reactionAt=0;}
  transition(state,now){if(state===this.state)return;this.transitions.push({from:this.state,to:state,at:now});if(this.transitions.length>80)this.transitions.shift();this.state=state;}
  observe(found,now){this.positives=found?this.positives+1:0;if(found){this.lastSeen=now;if(this.positives>=2){if(!this.present)this.confirmationAt=now;this.present=true;}}else if(now-this.lastSeen>=1500)this.present=false;}
  trigger(now){this.present=true;this.lastSeen=now;this.confirmationAt=now;this.positives=2;}
  leave(now){this.present=false;this.lastSeen=-Infinity;this.positives=0;}
  update(now,time,ended){
    if(this.state==='idle' && this.present){this.reactionAt=this.confirmationAt??now;this.transition('prepare',now);return 'start';}
    if(this.state==='prepare' && time>=5)this.transition('attack',now);
    if(this.state==='attack' && time>=17)this.transition('retreat',now);
    if(this.state==='retreat' && time>=this.holdAt && this.present){this.transition('hidden',now);return 'hold';}
    if(this.state==='hidden' && !this.present){this.transition('return',now);return 'resume';}
    if(this.state==='retreat' && time>=this.holdAt && !this.present)this.transition('return',now);
    if(ended && this.state!=='idle'){this.transition('idle',now);return 'idle';}
    return null;
  }
}
