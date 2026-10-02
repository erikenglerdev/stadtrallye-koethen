'use client';
import Attribution from '@/components/Attribution/Attribution';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {ChatMessage, DashboardView} from '@/rally/types';
import styles from './Dashboard.module.css';
const url=`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/dashboard`;
const duration=(ms:number)=>{const s=Math.max(0,Math.floor(ms/1000));return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');};
const labels={ready:'Noch nicht gestartet',running:'Unterwegs',finished:'Im Ziel',abandoned:'Runde verlassen',outdated:'Alte Route'};
const date=(stamp:number)=>new Date(stamp).toLocaleString('de-DE');
export default function Dashboard({simulation=false}:{simulation?:boolean}) {
 const [data,setData]=useState<DashboardView|null>(null),[loggedIn,setLoggedIn]=useState<boolean|null>(null),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[tick,setTick]=useState(0);
 const [selectedChat,setSelectedChat]=useState<number|null>(null),[messages,setMessages]=useState<ChatMessage[]>([]),[reply,setReply]=useState(''),[replyBusy,setReplyBusy]=useState(false),[chatError,setChatError]=useState('');
 const [synced,setSynced]=useState(0);
 const active=useRef(true),sessionVersion=useRef(0);
 const query=simulation?'?simulation=1':'';
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  const version=sessionVersion.current;
  try {
   const res=await fetch(url+query,{cache:'no-store',signal:signal ?? AbortSignal.timeout(10000)});
   const value=await res.json().catch(()=>{throw new Error('Der Server liefert gerade keine gültige Antwort. Bitte kurz warten.');});if(!active.current || signal?.aborted || version!==sessionVersion.current)return;
   if(res.status===401){setLoggedIn(false);setData(null);setSelectedChat(null);return;}
   if(!res.ok)throw new Error(value.error);
   setSynced(performance.now());setData(value);setLoggedIn(true);setError('');
   if(selectedChat!==null){
    const chatUrl=`${url}?${simulation?'simulation=1&':''}chat=${selectedChat}`;
    const chatRes=await fetch(chatUrl,{cache:'no-store',signal:signal ?? AbortSignal.timeout(10000)});
    const chat=await chatRes.json();if(!active.current || signal?.aborted || version!==sessionVersion.current)return;
    if(!chatRes.ok)throw new Error(chat.error);
    setMessages(previous=>chat.messages.at(-1)?.id >= (previous.at(-1)?.id ?? 0) ? chat.messages : previous);
    setChatError('');
   }
  } catch(e){if(active.current && !signal?.aborted)setError(e instanceof Error?e.message:'Verbindung unterbrochen.');}
 },[query,selectedChat,simulation]);
 useEffect(()=>{
  active.current=true;let timeout:ReturnType<typeof setTimeout>;const controller=new AbortController();
  const poll=async()=>{await refresh(AbortSignal.any([controller.signal,AbortSignal.timeout(10000)]));if(!controller.signal.aborted)timeout=setTimeout(poll,5000);};
  void poll();const timer=setInterval(()=>setTick(performance.now()),1000);
  return()=>{active.current=false;controller.abort();clearTimeout(timeout);clearInterval(timer);};
 },[refresh]);
 async function session(action:'login'|'logout') {
  sessionVersion.current++;setBusy(true);setError('');
  try {
   const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='login'?{action,password}:{action}),signal:AbortSignal.timeout(10000)});
   const value=await res.json().catch(()=>{throw new Error('Der Server liefert gerade keine gültige Antwort. Bitte kurz warten.');});if(!res.ok)throw new Error(value.error);
   sessionVersion.current++;setPassword('');if(action==='logout'){setLoggedIn(false);setData(null);setSelectedChat(null);setMessages([]);}else await refresh();
  } catch(e){setError(e instanceof Error?e.message:'Verbindungsfehler.');}finally{setBusy(false);}
 }
 async function sendReply() {
  const message=reply.trim();if(selectedChat===null || !message || replyBusy)return;
  setReplyBusy(true);setChatError('');
  try {
   const res=await fetch(url+query,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reply',teamId:selectedChat,message}),signal:AbortSignal.timeout(15000)});
   const value=await res.json();if(!res.ok)throw new Error(value.error || 'Antwort konnte nicht gesendet werden.');
   setMessages(value.messages);setReply('');await refresh();
  } catch(e){setChatError(e instanceof Error?e.message:'Antwort konnte nicht gesendet werden.');}
  finally{setReplyBusy(false);}
 }
 const groups=['running','finished','ready','abandoned','outdated'] as const;
 const requests=data?.helpRequests ?? [];
 const selected=requests.find(item=>item.teamId===selectedChat);
 const openCount=requests.filter(item=>item.lastSender==='team').length;
 return <main className={styles.page}><header><p>KÖTHENER STADTRALLYE</p><h1>Live-Dashboard</h1><p>{simulation?'TESTMODUS · Nur simulierte Runden':'Teams, Zeiten und Hilfeanfragen'} · Keine GPS-Verläufe</p></header>
 {error && <p role="alert" className={styles.error}>{error} {data && 'Die Anzeige ist nicht aktuell; laufende Zeiten werden bis zur nächsten Verbindung eingefroren.'}</p>}
 {loggedIn!==true ? <section className={styles.card}><h2>Zugang für die Organisation</h2><form onSubmit={e=>{e.preventDefault();void session('login');}}><label htmlFor="dashboard-password">Passwort</label><input id="dashboard-password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={busy}>{busy?'Wird geprüft …':'Dashboard öffnen'}</button></form></section> : <>
 <div className={styles.summary}><strong>{openCount} offene Hilfeanfragen</strong><strong>{data?.teams.filter(t=>t.status==='running').length ?? 0} unterwegs</strong><strong>{data?.teams.filter(t=>t.status==='finished').length ?? 0} im Ziel</strong><button onClick={()=>void session('logout')} disabled={busy}>Abmelden</button></div>
 <p>Automatische Aktualisierung alle 5 Sekunden. Stand: {data ? new Date(data.serverNow).toLocaleTimeString('de-DE') : '–'}. Gesamtzeit = Laufzeit + Strafzeit.</p>
 <section className={styles.card} aria-label="Hilfeanfragen"><h2>Hilfeanfragen ({openCount} offen)</h2>
  {requests.length===0?<p>Noch keine Nachrichten.</p>:<div className={styles.helpLayout}><div className={styles.requestList}>{requests.map(item=><button type="button" key={item.teamId} className={`${styles.request} ${selectedChat===item.teamId?styles.selected:''}`} aria-pressed={selectedChat===item.teamId} onClick={()=>{setSelectedChat(item.teamId);setMessages([]);setReply('');setChatError('');}}><span className={styles.requestTop}><strong>{item.teamName} · {item.code}</strong><em className={item.lastSender==='team'?styles.openStatus:styles.answeredStatus}>{item.lastSender==='team'?'Antwort offen':'Beantwortet'}</em></span><span className={styles.preview}>{item.lastMessage}</span><small>{date(item.lastMessageAt)} · {item.messageCount} Nachricht{item.messageCount===1?'':'en'}</small></button>)}</div>
   <div className={styles.conversation}>{selected?<><h3>Chat mit {selected.teamName}</h3><div className={styles.messages} role="log" aria-live="polite">{messages.length===0?<p>Nachrichten werden geladen …</p>:messages.map(message=><div key={message.id} className={message.sender==='organizer'?styles.own:styles.incoming}><small>{message.sender==='organizer'?'Organisation':'Team'} · {date(message.createdAt)}</small><p>{message.body}</p></div>)}</div>{chatError && <p role="alert" className={styles.error}>{chatError}</p>}<form onSubmit={event=>{event.preventDefault();void sendReply();}}><label htmlFor="dashboard-reply">Antwort an das Team</label><textarea id="dashboard-reply" rows={3} maxLength={1000} value={reply} onChange={event=>setReply(event.target.value)} placeholder="Antwort schreiben …"/><button disabled={replyBusy || !reply.trim()}>{replyBusy?'Wird gesendet …':'Antwort senden'}</button></form></>:<p>Wählt eine Anfrage aus, um den Verlauf zu sehen und zu antworten.</p>}</div></div>}
 </section>
 {groups.map(status=>{const teams=(data?.teams.filter(t=>t.status===status) ?? []).sort((a,b)=>status==='finished'?a.elapsedMs-b.elapsedMs:a.id-b.id);return <section className={styles.card} key={status}><h2>{labels[status]} ({teams.length})</h2>{teams.length===0?<p>Keine Teams.</p>:<div className={styles.table}><table><thead><tr><th>Kennung</th><th>Team</th><th>Gesamtzeit</th><th>Strafzeit</th><th>Start</th><th>Zieleinlauf</th></tr></thead><tbody>{teams.map(team=><tr key={team.id}><td>{team.code}</td><td>{team.teamName}</td><td className={styles.time}>{status==='outdated'?'–':duration(team.elapsedMs+(status==='running'&&!error?Math.max(0,tick-synced):0))}</td><td>{duration(team.penaltyMs)}</td><td>{team.startedAt===null?'–':date(team.startedAt)}</td><td>{team.finishedAt===null?'–':date(team.finishedAt)}</td></tr>)}</tbody></table></div>}</section>;})}
 </>}
 <Attribution/>
 </main>;
}
