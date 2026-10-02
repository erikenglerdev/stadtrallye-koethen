'use client';
import {useEffect, useRef, useState} from 'react';
import type {ChatMessage} from '@/rally/types';
import styles from './HelpChat.module.css';
const time = (stamp: number) => new Date(stamp).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
export default function HelpChat({hasTeam, connected, simulation}: {hasTeam: boolean; connected: boolean; simulation: boolean}) {
  const [open,setOpen]=useState(false),[messages,setMessages]=useState<ChatMessage[]>([]),[draft,setDraft]=useState(''),[error,setError]=useState(''),[sending,setSending]=useState(false);
  const [seen,setSeen]=useState(0);
  const messageList=useRef<HTMLDivElement>(null);
  const url=`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/rally/chat${simulation?'?simulation=1':''}`;
  useEffect(()=>{
    if(!hasTeam) return;
    let alive=true;
    const controller=new AbortController();
    async function refresh() {
      try {
        const response=await fetch(url,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
        const result=await response.json();
        if(!response.ok) throw new Error(result.error || 'Chat nicht erreichbar.');
        if(alive) {
          setMessages(previous=>result.messages.at(-1)?.id >= (previous.at(-1)?.id ?? 0) ? result.messages : previous);
          if(open)setSeen(previous=>Math.max(previous,result.messages.at(-1)?.id ?? 0));
        }
      } catch { /* The next poll retries; sending reports its own errors. */ }
    }
    void refresh();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},5000);
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    document.addEventListener('visibilitychange',visible);
    return()=>{alive=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[hasTeam,open,url]);
  useEffect(()=>{if(open && messageList.current)messageList.current.scrollTop=messageList.current.scrollHeight;},[open,messages.length]);
  const latest=messages.at(-1)?.id ?? 0;
  const unread=!open && messages.some(message=>message.sender==='organizer' && message.id>seen);
  async function send() {
    const message=draft.trim();
    if(!message || sending || !hasTeam || !connected) return;
    setSending(true);setError('');
    try {
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || 'Nachricht konnte nicht gesendet werden.');
      setMessages(result.messages);setDraft('');
    } catch(e) {setError(e instanceof Error?e.message:'Nachricht konnte nicht gesendet werden.');}
    finally {setSending(false);}
  }
  return <div className={styles.widget}>
    {open && <section className={styles.panel} role="dialog" aria-label="Hilfe-Chat">
      <div className={styles.heading}><div><strong>Hilfe-Chat</strong><span>Nachricht an die Organisation</span></div><button className={styles.close} type="button" onClick={()=>setOpen(false)} aria-label="Hilfe-Chat schließen">×</button></div>
      <div className={styles.messages} role="log" aria-live="polite" aria-label="Chatverlauf" ref={messageList}>
        {!hasTeam?<p className={styles.empty}>Meldet zuerst euer Team an oder tretet eurer Runde bei. Danach könnt ihr hier jederzeit Hilfe anfordern.</p>:messages.length===0?<p className={styles.empty}>Beschreibt kurz, wobei ihr Hilfe braucht. Die Organisation sieht eure Nachricht im Dashboard und kann hier antworten.</p>:messages.map(message=><div key={message.id} className={message.sender==='team'?styles.own:styles.reply}><span>{message.sender==='team'?'Ihr':'Organisation'} · {time(message.createdAt)}</span><p>{message.body}</p></div>)}
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {hasTeam && <form onSubmit={event=>{event.preventDefault();void send();}}><label htmlFor="help-chat-message">Nachricht</label><textarea id="help-chat-message" rows={2} maxLength={1000} placeholder="Wie können wir euch helfen?" value={draft} onChange={event=>setDraft(event.target.value)}/><button type="submit" disabled={!connected || sending || !draft.trim()}>{sending?'Wird gesendet …':'Senden'}</button>{!connected && <p className={styles.offline}>Zum Senden ist eine Verbindung nötig.</p>}</form>}
    </section>}
    <button className={styles.launcher} type="button" onClick={()=>{setOpen(value=>!value);setSeen(latest);setError('');}} aria-label={unread?'Hilfe-Chat öffnen, neue Antwort':'Hilfe-Chat öffnen'} aria-expanded={open}>
      <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 3v-5.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11.5h9M8 15h5"/></svg>
      {unread && <span className={styles.badge} aria-hidden="true"/>}
    </button>
  </div>;
}
