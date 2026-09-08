import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ConnectionError,requestRally} from '../../src/rally/client-api';
test('network interruption never replays a station write and recovery reads authoritative team state',async t=>{
 let requests=0;
 t.mock.method(globalThis,'fetch',async()=>{requests++;throw new TypeError('offline');});
 await assert.rejects(requestRally({action:'confirm'}),ConnectionError);
 assert.equal(requests,1);
 t.mock.restoreAll();
 const recovered={run:{confirmed:3,elapsedMs:90000,penaltyMs:60000}};
 t.mock.method(globalThis,'fetch',async(_url:unknown,options?:RequestInit)=>{
  assert.equal(options?.method,undefined);assert.equal(options?.cache,'no-store');return Response.json(recovered);
 });
 assert.deepEqual(await requestRally(),recovered);
});
test('server outages and unreadable responses differ from normal gameplay rejection',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('Unavailable',{status:503}));
 await assert.rejects(requestRally(),ConnectionError);t.mock.restoreAll();
 t.mock.method(globalThis,'fetch',async()=>new Response(''));
 await assert.rejects(requestRally(),ConnectionError);t.mock.restoreAll();
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Noch nicht an der Station.'},{status:400}));
 await assert.rejects(requestRally({action:'confirm'}),e=>e instanceof Error && !(e instanceof ConnectionError) && e.message==='Noch nicht an der Station.');
});
