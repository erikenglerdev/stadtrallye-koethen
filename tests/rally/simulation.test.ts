import codes from '../../data/team-codes.json';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {GET, POST} from '../../src/app/api/rally/route';
import {getStore, getSimulationStore} from '../../src/rally/store';
import {simulationAllowed} from '../../src/rally/development';
import {route} from '../../src/rally/route';
import {simulatePositionSamples} from '../../src/rally/simulation';
const base='http://localhost:3000/api/rally/';
function req(body?:unknown, cookie='', simulation=true) {
 return new NextRequest(base+(simulation?'?simulation=1':''),{method:body?'POST':'GET',headers:{origin:'http://localhost:3000','content-type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})});
}
test('simulator gate allows only development loopback and rejects production, LAN and forwarded remote clients',()=>{
 assert.equal(simulationAllowed(req(),'development'),true);
 assert.equal(simulationAllowed(req(),'production'),false);
 assert.equal(simulationAllowed(req(),'test'),false);
 assert.equal(simulationAllowed(new NextRequest('http://192.168.1.5:3000/api/rally/?simulation=1'),'development'),false);
 assert.equal(simulationAllowed(new NextRequest(base,{headers:{'x-forwarded-for':'203.0.113.10'}}),'development'),false);
 assert.equal(simulationAllowed(new NextRequest(base,{headers:{'x-forwarded-for':'127.0.0.1','x-forwarded-host':'localhost:3000'}}),'development'),true);
 assert.equal(simulationAllowed(new NextRequest(base,{headers:{host:'localhost.evil.invalid'}}),'development'),false);
});
test('simulation completes all active stations and return while preserving the real run; production rejects GET and POST',async t=>{
 const env=process.env.NODE_ENV, data=process.env.RALLY_DATA_DIR;
 const dir=mkdtempSync(join(tmpdir(),'rally-simulation-'));
 Object.assign(process.env,{NODE_ENV:'development',RALLY_DATA_DIR:dir});
 let now=100000; t.mock.method(Date,'now',()=>now);
 const real=getStore(), sim=getSimulationStore();
 t.after(()=>{real.close();sim.close();rmSync(dir,{recursive:true,force:true});if(env===undefined)Reflect.deleteProperty(process.env, 'NODE_ENV');else Object.assign(process.env,{NODE_ENV:env});if(data===undefined)delete process.env.RALLY_DATA_DIR;else process.env.RALLY_DATA_DIR=data;});
 const realResponse=await POST(req({action:'start',code:codes[0],teamName:'Test Team',stationNumber:1},'',false));
 const realCookie=realResponse.headers.get('set-cookie')!.split(';')[0];
 const start=await POST(req({action:'start',code:codes[0],teamName:'Test Team',stationNumber:route.stations.length}));assert.equal(start.status,200);
 const simCookie=start.headers.get('set-cookie')!.split(';')[0];assert.match(simCookie,/^rally_simulation_session=/);
 const cookies=realCookie+'; '+simCookie;
 for(let step=0;step<=route.stations.length;step++) {
  if(step===1) {
   const denied=await POST(req({action:'reveal',step:0},cookies));assert.equal(denied.status,409);
   for(let retry=0;retry<2;retry++) {
    const response=await POST(req({action:'reveal',step},cookies));assert.equal(response.status,200);
    const shown=await response.json();assert.equal(shown.run.penaltyMs,360000);assert.equal(shown.run.revealedTarget.number,1);
   }
  }
  const c=await (await POST(req({action:'challenge'},cookies))).json();
  assert.equal(c.position.number,(route.stations.length-1+step)%route.stations.length+1);
  now+=6000;
  const response=await POST(req({action:'confirm',nonce:c.nonce,samples:[0,2500,5000].map(dt=>({lat:c.position.lat,lng:c.position.lng,accuracy:5,timestamp:c.serverNow+dt}))},cookies));
  assert.equal(response.status,200);const value=await response.json();assert.equal(value.run.confirmed,step+1);
  assert.equal(value.run.status,step===route.stations.length?'finished':'running');now+=1000;
 }
 const finished=await (await GET(req(undefined,cookies))).json();assert.equal(finished.run.status,'finished');assert.equal(finished.run.elapsedMs,route.stations.length*7000+360000);
 const original=await (await GET(req(undefined,cookies,false))).json();assert.equal(original.simulationTrack,undefined);assert.equal(finished.simulationTrack.length,244);assert.equal(original.run.confirmed,0);assert.equal(original.run.startedAt,null);
 const reset=await POST(req({action:'reset'},cookies));assert.match(reset.headers.get('set-cookie')!,/^rally_simulation_session=/);
 Object.assign(process.env,{NODE_ENV:'production'});
 assert.equal((await GET(req(undefined,cookies))).status,404);
 assert.equal((await POST(req({action:'challenge'},cookies))).status,404);
 assert.throws(()=>getSimulationStore(),/nicht verfügbar/);
});
test('simulated GPS can be canceled without completing a check',async()=>{
 const c=new AbortController();const p=simulatePositionSamples({lat:51,lng:12},1000,c.signal);c.abort();await assert.rejects(p,/abgebrochen/);
});

test('simulated fixes contain only allowed GPS fields even when a target has station metadata', async () => {
 const target = {lat: 51.75, lng: 11.97, number: 27, name: 'Teststation'};
 const samples = await simulatePositionSamples(target, Date.now(), new AbortController().signal);
 assert.ok(samples.length >= 3);
 assert.ok(samples.at(-1)!.timestamp - samples[0].timestamp >= 5000);
 for (const sample of samples) assert.deepEqual(Object.keys(sample).sort(), ['accuracy', 'lat', 'lng', 'timestamp']);
});
