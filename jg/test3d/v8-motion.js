// Pure XZ navigation: inflated furniture rectangles, A* routes and bounded
// substeps. A blocked actor waits/replans; it never teleports through a body.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function rectangleGap(p,o){return Math.hypot(Math.max(o.minX-p.x,0,p.x-o.maxX),Math.max(o.minZ-p.z,0,p.z-o.maxZ));}
function pointSegment(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz || 1)));return Math.hypot(p.x-a.x-dx*u,p.z-a.z-dz*u);}
function segmentRectangle(a,b,o){
  let low=0,high=1;
  for(const [axis,min,max] of [['x',o.minX,o.maxX],['z',o.minZ,o.maxZ]]){
    const delta=b[axis]-a[axis];
    if(Math.abs(delta)<1e-12){if(a[axis]<min || a[axis]>max){low=2;break;}}
    else{const one=(min-a[axis])/delta,two=(max-a[axis])/delta;low=Math.max(low,Math.min(one,two));high=Math.min(high,Math.max(one,two));}
  }
  if(low<=high)return 0;
  let gap=Math.min(rectangleGap(a,o),rectangleGap(b,o));
  for(const x of [o.minX,o.maxX])for(const z of [o.minZ,o.maxZ])gap=Math.min(gap,pointSegment({x,z},a,b));
  return gap;
}
export class MotionWorld{
  constructor({minX=-12.4,maxX=12.4,minZ=-8.9,maxZ=6.5,cell=.4}={}){
    Object.assign(this,{minX,maxX,minZ,maxZ,cell});this.agents=new Map();this.obstacles=[];this.frames=0;this.overlapFrames=0;this.replans=0;this.minGap=Infinity;this.planCursor=0;this.maxPlanningMS=0;
  }
  setObstacles(obstacles){this.obstacles=obstacles;for(const a of this.agents.values()){a.path=[];a.search=null;}}
  add(key,position,radius){this.agents.set(key,{key,position:{x:position.x,z:position.z},radius,goal:null,path:[],wait:0,arrived:true});}
  remove(key){this.agents.delete(key);}
  clear(){this.agents.clear();this.frames=this.overlapFrames=this.replans=this.planCursor=0;this.minGap=Infinity;this.maxPlanningMS=0;}
  free(p,r,key,dynamic=false){
    if(p.x-r<this.minX||p.x+r>this.maxX||p.z-r<this.minZ||p.z+r>this.maxZ)return false;
    if(this.obstacles.some(o=>!o.ignoreKeys?.includes(key) && rectangleGap(p,o)<r+.035))return false;
    if(dynamic)for(const a of this.agents.values())if(a.key!==key && distance(p,a.position)<r+a.radius+.06)return false;
    return true;
  }
  segment(a,b,r,key,dynamic=false){
    if(!this.free(b,r,key,false))return false;
    // Exact swept-disc clearance. Sampling a long route can miss a short
    // corner intersection and leave its actor permanently stuck on that path.
    if(this.obstacles.some(o=>!o.ignoreKeys?.includes(key) && segmentRectangle(a,b,o)<r+.035))return false;
    if(dynamic)for(const other of this.agents.values())if(other.key!==key && pointSegment(other.position,a,b)<r+other.radius+.06)return false;
    return true;
  }
  nearest(point,r,key,dynamic=false){
    if(this.free(point,r,key,dynamic))return {x:point.x,z:point.z};
    for(let ring=1;ring<=16;ring++)for(let i=0;i<ring*12;i++){
      const angle=i/(ring*12)*Math.PI*2,p={x:point.x+Math.cos(angle)*ring*this.cell,z:point.z+Math.sin(angle)*ring*this.cell};
      if(this.free(p,r,key,dynamic))return p;
    }
    return null;
  }
  route(agent,requested,dynamic=false){const search=this.findRoute(agent,requested,dynamic);let result;do{result=search.next();}while(!result.done);return result.value;}
  *findRoute(agent,requested,dynamic=false){
    const start=agent.position,goal=this.nearest(requested,agent.radius,agent.key,dynamic);this.replans++;
    if(!goal)return [];
    agent.resolvedGoal=goal;
    if(this.segment(start,goal,agent.radius,agent.key,dynamic))return [goal];
    const columns=Math.floor((this.maxX-this.minX)/this.cell)+1,rows=Math.floor((this.maxZ-this.minZ)/this.cell)+1;
    const point=id=>({x:this.minX+(id%columns)*this.cell,z:this.minZ+Math.floor(id/columns)*this.cell});
    const idOf=p=>Math.round((p.x-this.minX)/this.cell)+Math.round((p.z-this.minZ)/this.cell)*columns;
    const first=idOf(start),last=idOf(goal),open=new Set([first]),cost=new Map([[first,0]]),score=new Map([[first,distance(start,goal)]]),parent=new Map(),closed=new Set();
    while(open.size){
      let id=-1,best=Infinity;for(const next of open)if(score.get(next)<best){id=next;best=score.get(next);}
      if(id===last || distance(point(id),goal)<this.cell*.8 && this.segment(point(id),goal,agent.radius,agent.key,dynamic)){
        const path=[goal];let cursor=id;while(cursor!==first){path.push(point(cursor));cursor=parent.get(cursor);if(cursor===undefined)return [];}
        path.reverse();
        // String pulling retains swept clearance, including diagonal corners.
        const result=[];let anchor=start,index=0;
        while(index<path.length){let far=index;while(far+1<path.length && this.segment(anchor,path[far+1],agent.radius,agent.key,dynamic))far++;result.push(path[far]);anchor=path[far];index=far+1;}
        return result;
      }
      open.delete(id);closed.add(id);const x=id%columns,z=Math.floor(id/columns),p=id===first?start:point(id);
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
        if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=columns||nz>=rows)continue;
        const next=nx+nz*columns;if(closed.has(next))continue;const candidate=point(next);
        if(!this.segment(p,candidate,agent.radius,agent.key,dynamic))continue;
        const tentative=cost.get(id)+distance(p,candidate);
        if(tentative<(cost.get(next)??Infinity)){parent.set(next,id);cost.set(next,tentative);score.set(next,tentative+distance(candidate,goal));open.add(next);}
      }
      yield;
    }
    if(this.cell>.2){
      const fine=new MotionWorld({minX:this.minX,maxX:this.maxX,minZ:this.minZ,maxZ:this.maxZ,cell:.2});
      fine.obstacles=this.obstacles;fine.agents=this.agents;const path=yield* fine.findRoute(agent,requested,dynamic);this.replans+=fine.replans;return path;
    }
    return [];
  }
  step(goals,dt){
    const substeps=Math.max(1,Math.ceil(dt*5/.10)),delta=dt/substeps;
    for(const [key,goal] of goals){
      const a=this.agents.get(key);if(!a)continue;
      if(!a.goal || distance(a.goal,goal)>.15){a.goal={x:goal.x,z:goal.z};a.resolvedGoal=null;a.path=[];a.search=this.findRoute(a,a.goal);a.wait=0;}
      a.speed=goal.speed??2.6;
    }
    // Share A* work across frames. Animated characters keep rendering while a
    // difficult route is planned; collision checks still guard every move.
    const started=performance.now(),jobs=[...this.agents.values()].filter(a=>a.search);
    let cursor=this.planCursor++,work=0;
    while(jobs.length && work<64 && performance.now()-started<2){
      const index=cursor%jobs.length,a=jobs[index],result=a.search.next();work++;
      if(result.done){a.path=result.value;a.search=null;jobs.splice(index,1);}else cursor++;
    }
    this.maxPlanningMS=Math.max(this.maxPlanningMS,performance.now()-started);
    for(let step=0;step<substeps;step++)for(const a of this.agents.values()){
      if(!a.goal)continue;
      while(a.path.length && distance(a.position,a.path[0])<.015)a.path.shift();
      a.arrived=distance(a.position,a.resolvedGoal || a.goal)<.12;
      if(!a.path.length){if(!a.arrived && !a.search){a.wait+=delta;if(a.wait>.65){a.search=this.findRoute(a,a.goal,true);a.wait=0;}}continue;}
      const target=a.path[0],length=distance(a.position,target),ratio=Math.min(1,a.speed*delta/Math.max(length,1e-9));
      const next={x:a.position.x+(target.x-a.position.x)*ratio,z:a.position.z+(target.z-a.position.z)*ratio};
      if(this.segment(a.position,next,a.radius,a.key,true)){a.position=next;a.wait=0;}
      else{a.wait+=delta;if(a.wait>.65 && !a.search){a.path=[];a.search=this.findRoute(a,a.goal,true);a.wait=0;}}
    }
    this.frames++;const overlaps=this.overlaps();if(overlaps.length)this.overlapFrames++;
    return overlaps;
  }
  overlaps(){
    const errors=[],agents=[...this.agents.values()];
    for(let i=0;i<agents.length;i++){
      const a=agents[i];
      for(const o of this.obstacles){if(o.ignoreKeys?.includes(a.key))continue;const gap=rectangleGap(a.position,o)-a.radius;this.minGap=Math.min(this.minGap,gap);if(gap<-.001)errors.push({a:a.key,b:o.key,gap});}
      for(const b of agents.slice(i+1)){const gap=distance(a.position,b.position)-a.radius-b.radius;this.minGap=Math.min(this.minGap,gap);if(gap<-.001)errors.push({a:a.key,b:b.key,gap});}
    }
    return errors;
  }
  inspect(){return {frames:this.frames,overlapFrames:this.overlapFrames,minGap:Number.isFinite(this.minGap)?this.minGap:null,replans:this.replans,obstacles:this.obstacles.length,planningBudgetMS:2,maxPlanningMS:this.maxPlanningMS,
    agents:[...this.agents.values()].map(a=>({key:a.key,position:{...a.position},goal:a.goal,radius:a.radius,arrived:a.arrived,remaining:a.path.length,planning:!!a.search,wait:a.wait})),overlaps:this.overlaps()};}
}
