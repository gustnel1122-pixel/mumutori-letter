const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.join(__dirname,'..');
const current=fs.readFileSync(path.join(root,'dotori/widget.js'),'utf8').replace(/\r\n/g,'\n');
const v6=fs.readFileSync(path.join(root,'dotori/widget_v6.js'),'utf8');
const original=execFileSync('git',['show','a6918a8:dotori/widget.js'],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');

test('v4 remains byte-for-byte equivalent after exactly one opt-in dispatcher line',()=>{
  assert.equal(current.slice(current.indexOf('\n')+1),original);
});

test('only the exact dotori=v6 query opts in; regular visitors execute v4',()=>{
  for(const query of ['', '?dotori=1', '?dotori=v60', '?foo=dotori%3Dv6', '?dotori=v6', '?x=1&dotori=v6']){
    const appended=[];let v4Guards=0;
    const win={};Object.defineProperty(win,'__dotoriLoaded',{get(){v4Guards++;return true;}});
    vm.runInNewContext(current,{URLSearchParams,location:{search:query},window:win,
      sessionStorage:{getItem(){return null;},setItem(){}},
      document:{createElement(){return {};},head:{appendChild(e){appended.push(e);}}}});
    const optIn=new URLSearchParams(query).get('dotori')==='v6';
    assert.equal(appended.length,optIn?1:0,query);
    assert.equal(v4Guards,optIn?0:1,query);
    if(optIn)assert.equal(appended[0].src,'https://letter.mumutori.com/dotori/widget_v6.js');
  }
});

test('v6 preserves the full chat core and v4 lane geometry helpers',()=>{
  function chat(s){return s.slice(s.indexOf('/* 무무토리 자사몰 \'도토리 상담원\' 위젯 core'),s.indexOf('  function DotoriWander('));}
  assert.equal(chat(v6),chat(original));
  function geometry(s){return s.slice(s.indexOf('    var lane ='),s.indexOf('    var REACT ='));}
  assert.equal(geometry(v6),geometry(original));
  function ask(s){return s.slice(s.indexOf('  async function ask('),s.indexOf('\n  // 상품 한 줄'));}
  assert.ok(v6.includes(ask(original).trim()));
});

test('all 32 product reactions are short and contain no commercial or child claims',()=>{
  const start=v6.indexOf('    var LINES =');
  const stop=v6.indexOf('    var POSES =',start);
  const reactions=vm.runInNewContext(v6.slice(start,stop)+';({LINES,NAMED_LINES,nextLine})');
  const all=[...reactions.LINES,...reactions.NAMED_LINES.flatMap(g=>g.lines)];
  assert.equal(reactions.LINES.length,20);assert.equal(all.length,32);
  assert.equal(new Set(all).size,all.length);
  for(const s of all){assert.ok(s.length>=2&&s.length<=10,s);assert.doesNotMatch(s,/가격|할인|재고|배송|최고|1위|어린이|아이들|무료|원\b/);}
  assert.equal(reactions.nextLine('카피바라'),'이거 귀여움 ㅋㅋ');
  assert.equal(reactions.nextLine('감자'),'이거 하찮은거임!!');
  for(const name of ['빵','감자','카피바라','채소']){
    const samples=Array.from({length:12},()=>reactions.nextLine(name));
    assert.ok(samples.some(s=>s.includes(name)||/느긋/.test(s)),name);
  }
});

test('six distinct poses cycle without adjacent repeats and v6 makes no blurb/event requests',()=>{
  const poseList=v6.match(/var POSES = (\[[^;]+\]);/)[1];
  const poses=vm.runInNewContext(poseList);
  assert.equal(new Set(poses).size,6);
  const product={name:'감자',el:{getBoundingClientRect(){return {left:200,width:100};}}};
  const st={poseIndex:-1,x:100,tour:{c:product}};
  const btn={dataset:{}};
  const arriveSource=v6.slice(v6.indexOf('    function arriveTour('),v6.indexOf('    function endTour('));
  const arrive=vm.runInNewContext('var POSES='+poseList+';'+arriveSource+';arriveTour',
    {st,btn,W_:40,face(){},speak(){},nextLine(){return '감자 좀 보셈';}});
  const sequence=[];for(let i=0;i<18;i++){arrive(i*2000);sequence.push(btn.dataset.pose);}
  assert.equal(new Set(sequence.slice(0,6)).size,6);
  for(let i=1;i<sequence.length;i++)assert.notEqual(sequence[i],sequence[i-1]);
  assert.doesNotMatch(v6,/opts\.blurbs|loadBlurbs|sendBeacon|op: 'blurbs'|op: 'ev'/);
  assert.equal((v6.match(/await fetch\(/g)||[]).length,1);
  assert.match(v6,/W_ = BIG \? 40 : 32/);
  assert.match(v6,/44px \/ var\(--dw-scale,1\)/);
});
