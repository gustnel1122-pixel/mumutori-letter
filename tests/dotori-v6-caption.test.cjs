const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.join(__dirname,'..');
const current=fs.readFileSync(path.join(root,'dotori/widget_v6.js'),'utf8').replace(/\r\n/g,'\n');
const previous=execFileSync('git',['show','b8ea52f:dotori/widget_v6.js'],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');
const helper=current.slice(current.indexOf('    function captionSpot('),current.indexOf('    function placeCaption('));
const spot=vm.runInNewContext(helper+';captionSpot',{clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v))});

test('this caption fix preserves the v4 dispatcher, chat, routes and original reaction lists',()=>{
  const dispatcher=fs.readFileSync(path.join(root,'dotori/widget.js'),'utf8').replace(/\r\n/g,'\n');
  assert.equal(dispatcher,execFileSync('git',['show','b8ea52f:dotori/widget.js'],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n'));
  for(const [start,end] of [
    ["/* 무무토리 자사몰 '도토리 상담원' 위젯 core",'  function DotoriWander('],
    ['    var LINES =','    function goTour('],
    ['    var lane =','    var REACT ='],
    ['  async function ask(','  if (document.readyState']
  ])assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),previous.slice(previous.indexOf(start),previous.indexOf(end)),start);
});

test('screen edges, visual viewport offsets, animation sizes and moving anchors retain 8px padding and 4–8px distance',()=>{
  let checked=0;
  for(const width of [360,390,1280])for(const offset of [0,37]){
    const view={left:offset,top:offset,right:offset+width-15,bottom:offset+800};
    for(const side of ['left','right','top','bottom'])for(let step=0;step<32;step++)for(const phase of [0,.16,.3,.78,.99]){
      const size=width>760?40:32;
      let x=side==='left'?view.left+2:side==='right'?view.right-size-2:(view.left+view.right-size)/2;
      let y=side==='top'?view.top+2:side==='bottom'?view.bottom-size-2:(view.top+view.bottom-size)/2;
      x+=Math.sin(step)*1.5;y+=Math.cos(step)*1.5;
      const anchor={left:x,right:x+size,top:y,bottom:y+size};
      const text={width:45+(step%10)*7+Math.sin(phase*Math.PI)*9,height:15+phase*9};
      const result=spot(anchor,text,view,step%2?'right':'left',{x:0,y:-7+phase*12});
      assert.ok(result,JSON.stringify({width,side,step,phase}));
      assert.ok(result.left>=view.left+8&&result.left+text.width<=view.right-8);
      assert.ok(result.top>=view.top+8&&result.top+text.height<=view.bottom-8);
      const dx=Math.max(anchor.left-(result.left+text.width),result.left-anchor.right,0);
      const dy=Math.max(anchor.top-(result.top+text.height),result.top-anchor.bottom,0);
      const distance=Math.hypot(dx,dy);assert.ok(distance>=4&&distance<=8);
      checked++;
    }
  }
  assert.equal(checked,3840);
});

test('placement can switch left, above and below, and fully offscreen anchors do not leave detached text',()=>{
  const view={left:0,top:0,right:180,bottom:180},text={width:115,height:20};
  assert.equal(spot({left:140,right:170,top:80,bottom:110},text,view,'right',{x:0,y:0}).side,'left');
  assert.equal(spot({left:75,right:105,top:80,bottom:110},text,view,'right',{x:0,y:0}).side,'above');
  assert.equal(spot({left:75,right:105,top:2,bottom:32},text,view,'right',{x:0,y:0}).side,'below');
  assert.equal(spot({left:80,right:110,top:-80,bottom:-50},text,view,'right',{x:0,y:0}),null);
});
