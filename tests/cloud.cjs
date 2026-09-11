/* Client contract tests with a fake HTTP transport. Run: node tests/cloud.cjs */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),memory=new Map(),calls=[];
let response={ok:true,data:{revision:1,updated_at:'2026-09-11T17:00:00Z'}},networkError=null;
const context=vm.createContext({console,Intl,Date,Math,Map,Set,Object,Array,Number,JSON,Uint8Array,crypto:webcrypto,AbortController,setTimeout,clearTimeout,
  localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},
  fetch:async(url,options)=>{calls.push({url,...options});if(networkError)throw networkError;return {ok:response.ok,json:async()=>response.data};}
});
for(const file of ['js/world-data.js','js/locale.js','js/config.js','js/satellites.js','js/contracts.js','js/save.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
vm.runInContext('const CLOUD_CONFIG={url:"https://test.supabase.co",publishableKey:"sb_publishable_test"};',context);
vm.runInContext(fs.readFileSync(path.join(root,'js/cloud.js'),'utf8'),context,{filename:'js/cloud.js'});
const run=source=>vm.runInContext(source,context);
run('const testState=saveSystem.fresh();testState.satellites.push(satelliteSystem.create(testState,"Scout-1"));contractSystem.generate(testState);');
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
(async()=>{
  await test('Creating cloud storage retains a random private code before uploading',async()=>{
    await run('cloudSystem.create(testState)');
    assert.match(run('cloudSystem.connection.code'),/^[a-f0-9]{64}$/);
    assert.equal(run('cloudSystem.connection.revision'),1);
    const request=JSON.parse(calls[0].body);assert.equal(request.p_revision,0);assert.equal(request.p_code,run('cloudSystem.connection.code'));
    assert.equal(JSON.stringify(request.p_state).includes(request.p_code),false);
    assert.equal(calls[0].headers.apikey,'sb_publishable_test');assert.equal('Authorization' in calls[0].headers,false);
    assert.equal(run('new CloudSaveSystem(CLOUD_CONFIG).connection.code'),request.p_code);
  });
  await test('A stale upload keeps local state and the known cloud revision intact',async()=>{
    const before=run('JSON.stringify(testState)'),connection=run('JSON.stringify(cloudSystem.connection)');
    response={ok:false,data:{code:'PT409',message:'Cloud save changed. Load it before uploading again.'}};
    await assert.rejects(run('cloudSystem.upload(testState)'),e=>e.code==='PT409');
    assert.equal(run('JSON.stringify(testState)'),before);assert.equal(run('JSON.stringify(cloudSystem.connection)'),connection);assert.equal(run('cloudSystem.busy'),false);
  });
  await test('A failed or timed-out upload preserves the recovery code for retry',async()=>{
    networkError=Object.assign(new Error('aborted'),{name:'AbortError'});
    await assert.rejects(run('cloudSystem.upload(testState)'),/timed out/);
    assert.equal(run('cloudSystem.connection.revision'),1);assert.equal(run('cloudSystem.busy'),false);networkError=null;
  });
  await test('Reading another save is a preview until the player confirms',async()=>{
    const prior=run('JSON.stringify(cloudSystem.connection)'),state=JSON.parse(run('JSON.stringify(testState)'));state.money=45678;
    response={ok:true,data:{revision:7,updated_at:'2026-09-11T17:01:00Z',state}};
    run('const otherCode="b".repeat(64);');const snapshot=await run('cloudSystem.read(otherCode)');
    assert.equal(snapshot.state.money,45678);assert.equal(run('JSON.stringify(cloudSystem.connection)'),prior);
    context.snapshot=snapshot;
    assert.equal(run('cloudSystem.loadIntoGame({importSave:()=>false},snapshot)'),false);assert.equal(run('JSON.stringify(cloudSystem.connection)'),prior);
    assert.equal(run('cloudSystem.loadIntoGame({importSave:()=>true},snapshot)'),true);assert.equal(run('cloudSystem.connection.revision'),7);
  });
  await test('Unknown, malformed and corrupt cloud saves never replace local progress',async()=>{
    const prior=run('JSON.stringify(cloudSystem.connection)'),beforeCalls=calls.length;
    await assert.rejects(run('cloudSystem.read("short")'),/64-character/);assert.equal(calls.length,beforeCalls);
    response={ok:true,data:null};await assert.rejects(run('cloudSystem.read()'),/No cloud save/);
    response={ok:true,data:{revision:1,state:{version:9}}};await assert.rejects(run('cloudSystem.read()'),/supported/);
    assert.equal(run('JSON.stringify(cloudSystem.connection)'),prior);
  });
  await test('Unavailable local storage prevents creating an unrecoverable online save',async()=>{
    run('const isolated=new CloudSaveSystem(CLOUD_CONFIG);isolated.remember(null);const originalWriter=localStorage.setItem;localStorage.setItem=()=>{throw new Error("Storage full")};');
    const beforeCalls=calls.length;await assert.rejects(run('isolated.create(testState)'),/Storage full/);assert.equal(calls.length,beforeCalls);
    run('localStorage.setItem=originalWriter;');
  });
  await test('Invalid local state releases the busy flag after a rejected upload',async()=>{
    await assert.rejects(run('cloudSystem.upload({version:9})'),/supported/);assert.equal(run('cloudSystem.busy'),false);
  });
  console.log(`\n${checks} cloud client checks passed. HTTP calls were mocked.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
