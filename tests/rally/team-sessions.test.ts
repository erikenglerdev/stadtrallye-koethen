import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import codes from '../../data/team-codes.json';
import {RallyStore} from '../../src/rally/store';
import {route,routeVersion} from '../../src/rally/route';
const fixes=(index:number,now:number)=>[0,2500,5000].map(dt=>({...route.stations[index],accuracy:5,timestamp:now+dt}));
test('multiple devices share one round, independent checks, penalties and permanently consumed code',()=>{
 const dir=mkdtempSync(join(tmpdir(),'team-session-'));const path=join(dir,'rally.sqlite');let store=new RallyStore(path);
 try {
  const a=store.create(1,{code:codes[0],teamName:'Shared team'}),b=store.join(codes[0].toLowerCase());
  assert.notEqual(a,b);assert.equal(store.get(a)!.id,store.get(b)!.id);
  const ca=store.challenge(a,1000),cb=store.challenge(b,1000);
  store.confirm(a,ca.nonce,fixes(0,1000),7000);
  assert.throws(()=>store.confirm(b,cb.nonce,fixes(0,1000),7000),/Teamfortschritt/);
  assert.equal(store.view(b,7000).run!.confirmed,1);
  store.reveal(a,1,8000);assert.equal(store.reveal(b,1,8000).run!.penaltyMs,60000);
  store.leave(a);assert.equal(store.get(a),null);assert.equal(store.view(b).run!.status,'running');
  assert.throws(()=>store.create(2,{code:codes[0],teamName:'Reuse'}),/bereits gestartet/);
  const c=store.join(codes[0]);const bad=store.challenge(b,10000),good=store.challenge(c,10000);
  assert.throws(()=>store.confirm(b,bad.nonce,fixes(20,10000),16000));
  store.confirm(c,good.nonce,fixes(1,10000),16000);
  store.leave(b);store.leave(c);
  assert.equal(store.dashboard().teams[0].status,'running');
  store.close();store=new RallyStore(path);assert.equal(store.get(a),null);assert.equal(store.get(b),null);
  const d=store.join(codes[0]);assert.equal(store.view(d).run!.confirmed,2);
  for(let step=2;step<=route.stations.length;step++) {
   const now=20000+step*10000,ch=store.challenge(d,now);
   store.confirm(d,ch.nonce,fixes(step%route.stations.length,now),now+6000);
  }
  const finish=store.view(d,1000000).run!;assert.equal(finish.status,'finished');
  store.leave(d);store.close();store=new RallyStore(path);
  assert.throws(()=>store.create(1,{code:codes[0],teamName:'After finish'}),/bereits gestartet/);
  assert.throws(()=>store.join(codes[0]),/abgeschlossen/);
  assert.equal(store.dashboard(99999999).teams[0].elapsedMs,finish.elapsedMs);
  assert.equal(store.dashboard().teams.length,1);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('only unstarted reservations with no attached devices can be reused',()=>{
 const store=new RallyStore(':memory:');try {
  const a=store.create(3,{code:codes[1],teamName:'Pending'}),b=store.join(codes[1]);
  store.leave(a);assert.equal(store.view(b).run!.status,'ready');
  assert.throws(()=>store.create(4,{code:codes[1],teamName:'Duplicate'}));
  store.leave(b);assert.doesNotThrow(()=>store.create(4,{code:codes[1],teamName:'New reservation'}));
  assert.throws(()=>store.join(codes[2]),/noch keine/);
 }finally{store.close();}
});
test('existing single-device sessions migrate and started legacy codes remain consumed across route changes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'team-migration-')),path=join(dir,'rally.sqlite');
 const token='a'.repeat(64),id=createHash('sha256').update(token).digest('hex');
 const db=new DatabaseSync(path);
 db.exec('CREATE TABLE runs (id TEXT PRIMARY KEY, routeVersion TEXT, startIndex INTEGER, confirmed INTEGER, startedAt INTEGER, finishedAt INTEGER, challenge TEXT, challengeAt INTEGER); CREATE TABLE teams (runId TEXT PRIMARY KEY,code TEXT,teamName TEXT,abandonedAt INTEGER)');
 db.prepare('INSERT INTO runs VALUES (?,?,0,1,1000,NULL,NULL,NULL)').run(id,routeVersion);
 db.prepare('INSERT INTO teams VALUES (?,?,?,NULL)').run(id,codes[3],'Existing team');db.close();
 let store=new RallyStore(path);
 try {
  assert.equal(store.view(token).run!.teamName,'Existing team');assert.equal(store.get(store.join(codes[3]))!.id,id);
  store.leave(token);store.close();
  const update=new DatabaseSync(path);update.prepare('UPDATE runs SET routeVersion=?').run('old-route');update.close();
  store=new RallyStore(path);assert.equal(store.get(token),null);
  assert.throws(()=>store.create(5,{code:codes[3],teamName:'After route change'}),/bereits gestartet/);
  assert.throws(()=>store.join(codes[3]),/älteren Route/);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
