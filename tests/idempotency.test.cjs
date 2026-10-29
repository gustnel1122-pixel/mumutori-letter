'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const {webcrypto} = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../letter-submit.js'), 'utf8');
const config = {enabled:true, databaseURL:'https://example-test.firebaseio.com', rulesVersion:'letter-v1-20261026', gatePath:'letterIntake', timeoutMs:1000};
const gate = {enabled:true, rulesVersion:config.rulesVersion, verifiedAt:1};
const response = (data, status=200) => new Response(JSON.stringify(data), {status});
function boot(fetch) { const context={LETTER_INTAKE_CONFIG:config,fetch,crypto:webcrypto,URL,AbortController,TextEncoder,setTimeout,clearTimeout}; context.window=context; vm.runInNewContext(source,context); return context.LetterIntake; }
function payload(){return {type:'print',order:{name:'시험주문자',phone4:'0000'},letter:{to:'시험받는분',from:'시험보내는분',body:'고마운 마음을 편지에 담아 보냅니다.'},envelope:{id:'basic',writeName:false},consent:{privacy:true,at:'2026-10-29T00:00:00.000Z'},spec:{lineChars:33,maxLines:20,paper:'A5'}}}
function backend(){
  let saved=null, creates=0, notifications=0, first=true, confirmFailures=0;
  const calls=[];
  async function fetch(url,opt){
    const parsed=new URL(url), path=parsed.pathname;
    calls.push({path,method:opt.method,query:parsed.search,body:opt.body});
    if(path==='/letterIntake.json') return response(gate);
    if(path.startsWith('/letters/') && opt.method==='PUT'){
      if(saved) return response({error:'denied'},403);
      saved={...JSON.parse(opt.body),createdAt:100}; creates++; notifications++;
      if(first){first=false;throw new TypeError('synthetic response lost')}
      return response(saved);
    }
    const match=path.match(/^\/letterReceiptChecks\/(ltr_[a-f0-9]{32})\.json$/);
    if(match && opt.method==='PUT') {
      assert.equal(parsed.searchParams.get('print'),'silent');
      const hash=JSON.parse(opt.body);
      if(confirmFailures){confirmFailures--;throw new TypeError('synthetic connection lost')}
      return saved && saved.receiptHash===hash ? new Response(null,{status:204}) : response({error:'denied'},403);
    }
    return response({error:'denied'},403);
  }
  return {fetch,calls,failConfirm:()=>{confirmFailures++},counts:()=>({creates,notifications})};
}
test('저장 후 응답 유실과 새로고침 뒤 같은 접수만 성공 확인한다',async()=>{
  const server=backend(), p=payload(), id='ltr_'+'a'.repeat(32), salt='b'.repeat(64);
  await assert.rejects(boot(server.fetch).submit(p,id,salt),{code:'UNCERTAIN'});
  const restored=boot(server.fetch); assert.equal((await restored.submit(p,id,salt)).id,id);
  assert.deepEqual(server.counts(),{creates:1,notifications:1});
});
test('같은 ID에 다른 내용이나 다른 salt는 확인 성공하지 않는다',async()=>{
  const server=backend(),p=payload(),id='ltr_'+'c'.repeat(32),salt='d'.repeat(64);
  await assert.rejects(boot(server.fetch).submit(p,id,salt),{code:'UNCERTAIN'});
  const changed=structuredClone(p); changed.letter.body='다른 내용의 합성 편지를 보냅니다.';
  await assert.rejects(boot(server.fetch).submit(changed,id,salt),{code:'DENIED'});
  await assert.rejects(boot(server.fetch).submit(p,id,'e'.repeat(64)),{code:'DENIED'});
  assert.deepEqual(server.counts(),{creates:1,notifications:1});
});
test('확인 경로는 실제 접수 없으면 거부하고 고객 원문·salt를 보내거나 읽지 않는다',async()=>{
  const server=backend(),id='ltr_'+'f'.repeat(32),salt='1'.repeat(64),p=payload();
  const noReceipt=await server.fetch('https://example-test.firebaseio.com/letterReceiptChecks/'+id+'.json?print=silent',{method:'PUT',body:JSON.stringify('0'.repeat(64))});
  assert.equal(noReceipt.status,403);
  await assert.rejects(boot(server.fetch).submit(p,id,salt),{code:'UNCERTAIN'});
  await boot(server.fetch).submit(p,id,salt);
  const checks=server.calls.filter(c=>c.path.startsWith('/letterReceiptChecks/'));
  assert(checks.length>=2); assert(checks.every(c=>c.method==='PUT' && !c.path.includes(salt) && !c.query.includes(salt) && !c.body.includes(salt) && !c.body.includes(p.order.name) && !c.body.includes(p.letter.body)));
  assert(server.calls.filter(c=>c.method==='GET').every(c=>c.path==='/letterIntake.json'));
});
test('확인 응답 유실 뒤 같은 요청을 다시 확인해도 접수·알림은 한 번이다',async()=>{
  const server=backend(),p=payload(),id='ltr_'+'a'.repeat(32),salt='2'.repeat(64);
  await assert.rejects(boot(server.fetch).submit(p,id,salt),{code:'UNCERTAIN'}); server.failConfirm();
  await assert.rejects(boot(server.fetch).submit(p,id,salt),{code:'DENIED'});
  assert.equal((await boot(server.fetch).submit(p,id,salt)).id,id); assert.deepEqual(server.counts(),{creates:1,notifications:1});
});
test('기존 salt 없는 pending은 확인 성공을 추측하지 않는다',async()=>{
  const server=backend(),p=payload(),id='ltr_'+'b'.repeat(32);
  await assert.rejects(boot(server.fetch).submit(p,id),{code:'UNCERTAIN'});
  await assert.rejects(boot(server.fetch).submit(p,id),{code:'DENIED'});
  assert.equal(server.calls.filter(c=>c.path.startsWith('/letterReceiptChecks/')).length,0);
  assert.deepEqual(server.counts(),{creates:1,notifications:1});
});
