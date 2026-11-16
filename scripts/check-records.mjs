import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/assets/record-store.js','utf8');
const key='zhishui-inspection-ledger-v1';
function browser(workspace, cache=new Map(), snapshot=null) {
 const events=[];const writes=[];let active=workspace, reloads=0;
 const document={baseURI:'http://localhost:5188/',readyState:'loading',addEventListener(){},dispatchEvent(e){events.push(e.detail)},querySelectorAll(){return []}};
 const window={localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},addEventListener(){}};
 const context={window,document,location:{protocol:'http:',pathname:'/',hostname:'localhost',reload(){reloads++}},URL,AbortController,CustomEvent:class{constructor(type,options){this.detail=options.detail}},setTimeout,clearTimeout,
 fetch:async(url,options)=>{if(options?.method==='PUT'){writes.push(JSON.parse(options.body));return {ok:true,json:async()=>({revision:2})}};return {ok:true,json:async()=>({workspace:active,collections:snapshot?{ledger:{revision:1,snapshot}}:{}})}}};
 vm.runInNewContext(source,context);
 return {api:window.HydroRecords,events,writes,cache,setActive:id=>active=id,reloads:()=>reloads};
}
const secret=JSON.stringify({version:1,records:[{id:'private'}]});
const cache=new Map([[key+':database:alice',JSON.stringify({data:secret,revision:1,pending:false})]]);
const bob=browser('bob',cache);
assert.equal(bob.api.storage.getItem(key),null);
await bob.api.start();assert.equal(bob.api.storage.getItem(key),null);
const alice=browser('alice',cache,{version:1,records:[{id:'private'}]});
await alice.api.start();assert.equal(alice.api.storage.getItem(key),secret);
assert.ok(alice.events.some(e=>e.domain==='ledger'&&e.restore));
assert.equal(alice.api.storage.getItem('zhishui-water-journey-v1'),null);
alice.setActive('bob');await alice.api.start();
// An already connected sync does not pull; a subsequent reconnect is covered by the HTTP workspace guard.
assert.equal(bob.writes.length,0);
assert.equal(bob.api.backup().collections.ledger,null);
console.log('PASS: startup privacy, per-user cache isolation, cache hydration and legacy isolation');
