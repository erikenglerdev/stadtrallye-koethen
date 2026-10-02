import codes from '../../data/team-codes.json';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST} from '../../src/app/api/dashboard/route';
import {RallyStore,getStore,getSimulationStore} from '../../src/rally/store';
import {route} from '../../src/rally/route';
import {authenticated,dashboardSession} from '../../src/rally/dashboard-auth';
function req(body?:unknown,cookie='',origin='http://localhost:3000',simulation=false) {
 return new NextRequest('http://localhost:3000/api/dashboard'+(simulation?'?simulation=1':''),{method:body?'POST':'GET',headers:{cookie,origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
}
test('dashboard persists identified finish times and penalties without exposing locations',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rally-dashboard-'));const path=join(dir,'runs.sqlite');let store=new RallyStore(path);
 try {
  const token=store.create(1,{code:codes[0].toLowerCase(),teamName:'Team Alpha'});
  const joined=store.join(codes[0]);
  assert.throws(()=>store.create(2,{code:codes[0],teamName:'Duplicate'}));
  assert.throws(()=>store.create(1,{code:'',teamName:'No code'}));
  assert.equal(store.dashboard().teams[0].status,'ready');
  for(let step=0;step<=route.stations.length;step++) {
   const now=1000+step*10000,c=store.challenge(token,now),target=route.stations[step%route.stations.length];
   if(step===1) {store.reveal(token,step,now);assert.equal(store.dashboard(now).teams[0].status,'running');}
   store.confirm(token,c.nonce,[0,2500,5000].map(dt=>({lat:target.lat,lng:target.lng,accuracy:5,timestamp:now+dt})),now+6000);
  }
  store.close();store=new RallyStore(path);
  const team=store.dashboard(999999).teams[0];
  assert.equal(team.status,'finished');assert.equal(team.code,codes[0]);assert.equal(team.teamName,'Team Alpha');
  assert.equal(team.elapsedMs,route.stations.length*10000+60000);assert.equal(team.penaltyMs,60000);
  assert.equal(store.dashboard(99999999).teams[0].elapsedMs,team.elapsedMs);
  assert.deepEqual(Object.keys(team).sort(),['code','elapsedMs','finishedAt','id','penaltyMs','startedAt','status','teamName']);
  store.sendTeamMessage(token,'Wir brauchen Hilfe.',100000000);
  assert.equal(store.dashboard().helpRequests[0].lastSender,'team');
  assert.equal(store.dashboard().helpRequests[0].teamId,team.id);
  assert.equal(store.dashboardChat(team.id).messages[0].body,'Wir brauchen Hilfe.');
  store.sendDashboardMessage(team.id,'Wir kommen zu euch.',100000001);
  assert.equal(store.dashboard().helpRequests[0].lastSender,'organizer');
  assert.deepEqual(store.teamChat(token).messages.map(m=>m.body),['Wir brauchen Hilfe.','Wir kommen zu euch.']);
  assert.equal(store.teamChat(joined).messages.length,2);
  store.close();store=new RallyStore(path);
  assert.equal(store.teamChat(joined).messages[1].body,'Wir kommen zu euch.');
  assert.equal(store.dashboard().helpRequests[0].lastSender,'organizer');
  const abandoned=store.create(2,{code:codes[1],teamName:'New team'});store.leave(abandoned);
  assert.equal(store.dashboard().teams[0].status,'abandoned');
  assert.throws(()=>store.challenge(abandoned));
  assert.doesNotThrow(()=>store.create(2,{code:codes[1],teamName:'Restart'}));
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('dashboard requires server authentication, isolates simulation and has no editing action',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'dashboard-api-'));const password=randomBytes(20).toString('hex');
 const saved={...process.env};Object.assign(process.env,{NODE_ENV:'development',RALLY_DATA_DIR:dir,RALLY_DASHBOARD_PASSWORD:password,RALLY_DASHBOARD_SESSION_SECRET:randomBytes(32).toString('hex')});
 const realStore=getStore(),simStore=getSimulationStore();
 t.after(()=>{realStore.close();simStore.close();rmSync(dir,{recursive:true,force:true});for(const key of ['NODE_ENV','RALLY_DATA_DIR','RALLY_DASHBOARD_PASSWORD','RALLY_DASHBOARD_SESSION_SECRET']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}});
 const realToken=getStore().create(1,{code:codes[0],teamName:'Real team'});const simToken=getSimulationStore().create(2,{code:codes[1],teamName:'Simulated team'});
 getStore().sendTeamMessage(realToken,'Echte Anfrage');getSimulationStore().sendTeamMessage(simToken,'Simulierte Anfrage');
 assert.equal((await GET(req())).status,401);
 assert.equal((await POST(req({action:'login',password:'wrong'}))).status,401);
 assert.equal((await POST(req({action:'login',password},'','https://other.invalid'))).status,403);
 const login=await POST(req({action:'login',password}));assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie')!;assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=strict/i);
 const session=cookie.split(';')[0];
 const real=await (await GET(req(undefined,session))).json();assert.deepEqual(real.teams.map((r:{code:string})=>r.code),[codes[0]]);
 assert.equal(real.helpRequests[0].lastMessage,'Echte Anfrage');
 const sim=await (await GET(req(undefined,session,undefined,true))).json();assert.deepEqual(sim.teams.map((r:{code:string})=>r.code),[codes[1]]);
 assert.equal(sim.helpRequests[0].lastMessage,'Simulierte Anfrage');
 assert.equal((await POST(req({action:'reply',teamId:real.teams[0].id,message:'Antwort'}))).status,401);
 assert.equal((await POST(req({action:'reply',teamId:real.teams[0].id,message:'Antwort'},session,'https://other.invalid'))).status,403);
 assert.equal((await POST(req({action:'reply',teamId:real.teams[0].id,message:' '},session))).status,400);
 const reply=await POST(req({action:'reply',teamId:real.teams[0].id,message:'Antwort'},session));assert.equal(reply.status,200);
 assert.deepEqual((await reply.json()).messages.map((m:{body:string})=>m.body),['Echte Anfrage','Antwort']);
 assert.equal(getStore().teamChat(realToken).messages[1].body,'Antwort');
 const chat=await GET(new NextRequest('http://localhost:3000/api/dashboard?chat='+real.teams[0].id,{headers:{cookie:session}}));
 assert.equal((await chat.json()).messages.length,2);
 const simChat=await GET(new NextRequest('http://localhost:3000/api/dashboard?simulation=1&chat='+sim.teams[0].id,{headers:{cookie:session}}));
 assert.equal((await simChat.json()).messages[0].body,'Simulierte Anfrage');
 assert.equal((await GET(new NextRequest('http://localhost:3000/api/dashboard?chat=invalid',{headers:{cookie:session}}))).status,400);
 assert.equal(getSimulationStore().teamChat(simToken).messages.length,1);
 assert.equal((await POST(req({action:'delete'},session))).status,400);
 assert.equal(authenticated(dashboardSession(1700000000000),1700000000001),true);
 assert.equal(authenticated(dashboardSession(1700000000000),1700000000000+13*60*60*1000),false);
 assert.equal(authenticated(dashboardSession().slice(0,-1)+'x'),false);
 const logout=await POST(req({action:'logout'},session));assert.match(logout.headers.get('set-cookie')!,/Max-Age=0/);
 Object.assign(process.env,{NODE_ENV:'production'});
 assert.equal((await GET(req(undefined,session,undefined,true))).status,404);
 const secure=await POST(req({action:'login',password}));assert.match(secure.headers.get('set-cookie')!,/Secure/);
 delete process.env.RALLY_DASHBOARD_PASSWORD;assert.equal((await GET(req(undefined,session))).status,503);
});

test('100 configured team codes are unique and independent of starting station',()=>{
 assert.equal(codes.length,100);assert.equal(new Set(codes).size,100);
 const store=new RallyStore(':memory:');
 try{for(let i=0;i<codes.length;i++){const station=i%route.stations.length+1;const token=store.create(station,{code:codes[i],teamName:'Team '+i});assert.equal(store.view(token).run!.startNumber,station);}}finally{store.close();}
});
