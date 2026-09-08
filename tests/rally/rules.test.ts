import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advance, distanceMeters, expectedIndex, verifySamples} from '../../src/rally/rules';
import {route} from '../../src/rally/route';
import {RallyStore} from '../../src/rally/store';
import type {Run, Sample} from '../../src/rally/types';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const points = route.stations;
const run: Run = {id:'test', routeVersion:'test', startIndex:0, confirmed:0, startedAt:null, finishedAt:null, challenge:'test', challengeAt:1000};
function fixes(index = 0, t = 1000): Sample[] { return [1, 2501, 5001].map(dt=>({lat:points[index].lat,lng:points[index].lng,accuracy:8,timestamp:t+dt})); }
test('all 25 active stations occur exactly once and have fictional clues', () => {
 assert.equal(points.length,25); assert.equal(new Set(points.map(p=>p.id)).size,25);
 assert.ok(!points.some(p=>p.id==='place-08'));
 assert.equal(points[14].name,'Gartenstraße');
 assert.equal(points[13].radiusMeters,30);
 assert.ok(points.every((p,i)=>p.number===i+1 && p.hint.startsWith('Platzhalterhinweis:')));
});
test('distances are measured in meters',()=>{ assert.equal(distanceMeters(points[0],points[0]),0); assert.ok(Math.abs(distanceMeters({lat:0,lng:0},{lat:0,lng:0.001})-111.195)<0.1); });
test('every start visits every station and returns to start before finishing',()=>{
 for(let start=0; start<points.length; start++) {
  let r={...run,startIndex:start}; const visited=[];
  for(let step=0; step<=points.length; step++) {
   assert.equal(r.finishedAt,null); visited.push(expectedIndex(r,points.length));
   assert.equal(verifySamples({...r,challengeAt:1000},fixes(expectedIndex(r,points.length)),points,6500),null);
   r=advance(r,points.length,10000+step*1000);
  }
  assert.equal(new Set(visited.slice(0,-1)).size,points.length); assert.equal(visited[0],visited.at(-1));
  assert.equal(r.startedAt,10000); assert.equal(r.finishedAt,10000+points.length*1000); assert.throws(()=>advance(r,points.length,50000));
 }
});
test('GPS accepts accurate fresh samples and rejects outside, stale, inaccurate, duplicated and short samples',()=>{
 assert.equal(verifySamples(run,fixes(),points,6500),null);
 for(const samples of [fixes(20), fixes().map(s=>({...s,accuracy:100})), fixes().map(s=>({...s,timestamp:100})), fixes().map(s=>({...s,timestamp:2000})), fixes().slice(0,2), fixes().map(s=>({...s,lat:NaN}))]) assert.notEqual(verifySamples(run,samples,points,6500),null);
 assert.notEqual(verifySamples(run,fixes(),points,70000),null);
});
test('standing in overlapping station circles does not advance',()=>{
 const nearby=[{...points[0],lat:51,lng:12},{...points[1],lat:51.0001,lng:12}];
 const samples=fixes().map(s=>({...s,lat:51.0001,lng:12}));
 assert.match(verifySamples({...run,confirmed:1},samples,nearby,6500)!,/vorherigen/);
});
test('server rejects replay, invalid start and future station, preserving progress',()=>{
 const store=new RallyStore(':memory:');
 try {
  assert.throws(()=>store.create(0)); assert.throws(()=>store.create(points.length+1)); assert.throws(()=>store.create(1.5));
  const token=store.create(1); const c=store.challenge(token,1000);
  assert.throws(()=>store.confirm(token,c.nonce,fixes(20),6500)); assert.equal(store.view(token,6500).run!.confirmed,0);
  assert.throws(()=>store.confirm(token,c.nonce,fixes(),6500));
  const c2=store.challenge(token,10000); const v=store.confirm(token,c2.nonce,fixes(0,10000),16000);
  assert.equal(v.run!.confirmed,1); assert.equal(v.run!.startedAt,16000);
  assert.throws(()=>store.confirm(token,c2.nonce,fixes(0,10000),16000));
  assert.equal(store.view(token,17000).run!.elapsedMs,1000);
  assert.ok(!JSON.stringify(v).includes('radiusMeters')); assert.ok(!JSON.stringify(v).includes('51.751'));
 } finally {store.close();}
});
test('complete round persists across server restart with frozen finish time',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rally-test-')); const path=join(dir,'test.sqlite');
 let store=new RallyStore(path);
 try {
  const token=store.create(17); let now=1000;
  for(let step=0;step<=points.length;step++) {
   const c=store.challenge(token,now); const index=(16+step)%points.length;
   store.confirm(token,c.nonce,fixes(index,now),now+6000); now+=60000;
  }
  const before=store.view(token,now); assert.equal(before.run!.status,'finished'); assert.equal(before.run!.confirmed,points.length+1);
  store.close(); store=new RallyStore(path);
  assert.equal(store.view(token,now+900000).run!.elapsedMs,before.run!.elapsedMs);
  assert.throws(()=>store.challenge(token,now));
 } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});

test('paid reveals persist, charge once per step, reject stale requests and preserve GPS progression',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rally-help-')); const path=join(dir,'test.sqlite');
 let store=new RallyStore(path);
 try {
  const token=store.create(1);
  assert.throws(()=>store.reveal(token,0));
  for(let step=0;step<=points.length;step++) {
   const now=1000+step*10000;
   if(step===1 || step===2) {
    const before=store.view(token,now);
    assert.equal(before.run!.revealedTarget,null);
    const shown=store.reveal(token,step,now);
    assert.equal(shown.run!.confirmed,step);
    assert.equal(shown.run!.revealedTarget!.name,points[step].name);
    assert.equal(shown.run!.elapsedMs,before.run!.elapsedMs+60000);
    assert.equal(store.reveal(token,step,now).run!.penaltyMs,step*60000);
    assert.throws(()=>store.reveal(token,step-1,now));
    store.close();store=new RallyStore(path);
    assert.equal(store.view(token,now).run!.revealedTarget!.name,points[step].name);
    const bad=store.challenge(token,now);
    assert.throws(()=>store.confirm(token,bad.nonce,fixes(20,now),now+6000));
    assert.equal(store.view(token,now).run!.confirmed,step);
   }
   if(step===points.length) assert.throws(()=>store.reveal(token,step,now));
   const c=store.challenge(token,now);
   store.confirm(token,c.nonce,fixes(step%points.length,now),now+6000);
  }
  const end=store.view(token,9999999).run!;
  assert.equal(end.penaltyMs,120000);
  assert.equal(end.elapsedMs,points.length*10000+120000);
  assert.equal(end.revealedTarget,null);
  assert.equal(end.status,'finished');
  assert.throws(()=>store.reveal(token,points.length+1));
 } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
