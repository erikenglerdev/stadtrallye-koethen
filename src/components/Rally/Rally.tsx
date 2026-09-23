'use client';
import Attribution from '@/components/Attribution/Attribution';
import {useCallback, useEffect, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import {ConnectionError, requestRally} from '@/rally/client-api';
import type {RallyView} from '@/rally/types';
import {simulatePositionSamples} from '@/rally/simulation';
import {collectPositionSamples} from '@/rally/gps';
import styles from './Rally.module.css';
import RallyHint from './RallyHint';
const RallyMap = dynamic(() => import('./RallyMap'), {ssr: false, loading: () => <p>Karte wird geladen …</p>});
function duration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
}
export default function Rally({simulation = false}: {simulation?: boolean}) {
  const [connected,setConnected]=useState(true);
  const api=useCallback(async(body?:unknown)=>{
    try {const result=await requestRally(body,simulation);setConnected(navigator.onLine);return result;}
    catch(e){if(e instanceof ConnectionError)setConnected(false);throw e;}
  },[simulation]);
  const [view, setView] = useState<RallyView | null>(null);
  const [entryMode, setEntryMode] = useState<'create' | 'join'>('create');
  const [code, setCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [station, setStation] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab] = useState<'hint' | 'map'>('hint');
  const [helpStep, setHelpStep] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [position, setPosition] = useState<{lat: number; lng: number; accuracy: number} | null>(null);
  const checkController = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const revision = useRef(0);
  const refreshing = useRef(false);
  const clock = useRef({elapsed: 0, at: 0, running: false});
  const apply = useCallback((data: RallyView) => {
    clock.current = {elapsed: data.run?.elapsedMs ?? 0, at: performance.now(), running: data.run?.status === 'running'};
    setElapsed(clock.current.elapsed); setView(data);
  }, []);
  const refresh = useCallback(async () => {
    if(refreshing.current || inFlight.current) return;
    refreshing.current=true;const version=revision.current;
    try {const data=await api();if(version===revision.current && !inFlight.current){apply(data);setError('');}}
    catch(e) {if(version===revision.current && !(e instanceof ConnectionError))setError(e instanceof Error?e.message:'Verbindungsfehler.');}
    finally {refreshing.current=false;}
  },[apply,api]);
  const invalidate=useCallback(()=>{revision.current++;},[]);
  useEffect(() => {
    const initial=setTimeout(()=>{if(!navigator.onLine)setConnected(false);void refresh();},0);
    const timer=setInterval(()=>setElapsed(clock.current.elapsed+(clock.current.running?performance.now()-clock.current.at:0)),500);
    const poll=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},3000);
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    const offline=()=>setConnected(false);
    const online=()=>{void refresh();};
    window.addEventListener('offline',offline);window.addEventListener('online',online);
    document.addEventListener('visibilitychange',visible);
    return()=>{invalidate();clearTimeout(initial);clearInterval(timer);clearInterval(poll);document.removeEventListener('visibilitychange',visible);window.removeEventListener('offline',offline);window.removeEventListener('online',online);checkController.current?.abort();};
  },[refresh,invalidate]);
  async function start() {
    if (inFlight.current || !connected) return;
    revision.current++;inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try { apply(await api(entryMode==='join'?{action:'join',code}:{action:'start', stationNumber:Number(station), code, teamName})); } catch(e) { setError((e as Error).message); } finally { inFlight.current = false; setBusy(false); }
  }
  async function check() {
    if (inFlight.current) return;
    if (!connected || !navigator.onLine) {setConnected(false);setNotice('');setError('Keine Internetverbindung zum Server. Die Station konnte nicht freigeschaltet werden. Bitte versucht es erneut, sobald die Verbindung wieder da ist.');return;}
    revision.current++;inFlight.current = true; setBusy(true); setChecking(true); setAccuracy(null); setError(''); setNotice('');
    const controller = new AbortController(); checkController.current = controller;
    try {
      const challenge = await api({action:'challenge'});
      if (controller.signal.aborted) throw new Error('Die Standortprüfung wurde abgebrochen.');
      const samples = simulation
        ? await simulatePositionSamples(challenge.position, challenge.serverNow, controller.signal)
        : await collectPositionSamples(challenge.serverNow, controller.signal, setAccuracy);
      setPosition(samples.at(-1)!);
      const data: RallyView = await api({action:'confirm', nonce:challenge.nonce, samples});
      apply(data); setNotice(data.run?.status === 'finished' ? 'Runde abgeschlossen. Eure Gesamtzeit steht fest!' : 'Station bestätigt!'); setTab('hint');
    } catch(e) {
      const message = e instanceof ConnectionError ? 'Die Verbindung wurde während der Prüfung unterbrochen. Ob die Station bestätigt wurde, prüfen wir automatisch, sobald der Server wieder erreichbar ist.' : (e as Error).message;
      // A lost response may have committed; reload authoritative progress before offering another check.
      try { apply(await api()); } catch { /* Keep the last known state and show the error. */ }
      setError(message);
    } finally { inFlight.current = false; checkController.current = null; setBusy(false); setChecking(false); }
  }
  async function reveal() {
    if (inFlight.current || !connected || helpStep === null) return;
    revision.current++;inFlight.current = true; setBusy(true); setError('');
    try { apply(await api({action:'reveal', step:helpStep})); setTab('map'); }
    catch(e) { setError((e as Error).message); try { apply(await api()); } catch { /* Retry via refresh. */ } }
    finally { setHelpStep(null); inFlight.current = false; setBusy(false); }
  }
  async function reset() {
    if (inFlight.current || !connected) return;
    revision.current++;inFlight.current = true; setBusy(true);
    try { await api({action:'reset'}); setPosition(null); setNotice(''); setResetting(false);setHelpStep(null);setCode('');setTeamName('');setStation('');apply(await api());setError(''); } catch(e) { setError((e as Error).message); } finally { inFlight.current = false; setBusy(false); }
  }
  const run = view?.run;
  return <main className={styles.page}>
    <header className={styles.header}><span className={styles.eyebrow}>KÖTHEN · ZU FUSS ENTDECKEN</span><h1>{view?.title ?? 'Köthener Stadtrallye'}</h1><p>Eine Stadt. {view?.total ?? 24} Stationen. Eure gemeinsame Runde.</p></header>
    {process.env.NODE_ENV === 'development' && <section className={styles.simulation} aria-label="Lokaler Testmodus">
      <strong>{simulation ? 'TESTMODUS AKTIV · GPS wird simuliert' : 'Lokal ausprobieren'}</strong>
      <p>{simulation ? 'Jeder Klick setzt euch an die richtige nächste Station. Die Prüfung dauert etwa fünf Sekunden. Diese Testrunde ist von echten Runden getrennt.' : 'Spielt alle Stationen ohne echten Standortzugriff durch.'}</p>
      <a href={simulation ? '?' : '?simulation=1'}>{simulation ? 'Zum echten GPS-Modus wechseln' : 'Testmodus aktivieren'}</a>
    </section>}
    {!connected && <section className={styles.offline} role="status"><strong>Verbindung unterbrochen</strong><p>{view?.run ? 'Euer letzter Hinweis und Teamstand bleiben sichtbar. Die laufende Uhr ist bis zum Abgleich vorläufig; andere Teamgeräte können inzwischen weiter sein.' : 'Für Anmeldung und Beitritt braucht ihr eine Verbindung zum Server.'} Wir gleichen alles automatisch ab, sobald der Server wieder erreichbar ist.</p><p>Stationen bestätigen und kostenpflichtige Hilfe sind erst wieder mit Verbindung möglich. Bereits bestätigte Stationen bleiben auf dem Server gespeichert.</p><button className={styles.link} onClick={()=>void refresh()} disabled={busy}>Verbindung erneut prüfen</button></section>}
    {error && <div role="alert" className={styles.error}>{error}<button className={styles.link} onClick={() => void refresh()} disabled={busy}>Stand aktualisieren</button></div>}
    {notice && <p role="status" className={styles.success}>{notice}</p>}
    {!view ? <section className={styles.card}><p>Runde wird geladen …</p><button onClick={() => void refresh()}>Erneut laden</button>{error && <button className={styles.link} onClick={() => setResetting(true)}>Zur Anmeldung</button>}</section> : !run ? <section className={styles.card}>
      <nav className={styles.tabs} aria-label="Anmeldung"><button type="button" aria-pressed={entryMode==='create'} disabled={busy} onClick={()=>{setEntryMode('create');setError('');}}>Neue Runde anlegen</button><button type="button" aria-pressed={entryMode==='join'} disabled={busy} onClick={()=>{setEntryMode('join');setError('');}}>Bestehender Runde beitreten</button></nav>
      <h2>{entryMode==='join'?'Eurem Team beitreten':'Euer Team startet hier'}</h2><p>{entryMode==='join'?'Gebt nur eure Teamkennung ein. Ihr übernehmt den Teamnamen, die Startstation, den aktuellen Fortschritt und die gemeinsame Zeit.':'Gebt eure Kennung, euren Teamnamen und eine frei gewählte Startnummer ein. Sobald ihr an der Startstation startet, ist die Kennung dauerhaft für diese Runde verbraucht – auch nach dem Zieleinlauf.'}</p>
      <form onSubmit={e => {e.preventDefault(); void start();}}><label htmlFor="team-code">Eure Teamkennung</label><input id="team-code" type="text" autoCapitalize="characters" autoComplete="off" maxLength={32} pattern="[a-zA-Z0-9_-]+" required value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/>{entryMode==='create' && <><label htmlFor="team-name">Teamname</label><input id="team-name" type="text" maxLength={80} required value={teamName} onChange={e=>setTeamName(e.target.value)} disabled={busy}/><label htmlFor="station">Startnummer (1–{view.total})</label><input id="station" type="number" min="1" max={view.total} step="1" inputMode="numeric" required value={station} onChange={e=>setStation(e.target.value)} disabled={busy}/></>}<button type="submit" disabled={busy || !connected}>{busy ? 'Wird geladen …' : entryMode==='join' ? 'Runde beitreten' : 'Team anmelden'}</button></form>
      <p className={styles.muted}>{entryMode==='join' ? 'Beim Beitritt wird die gemeinsame Zeit nicht neu gestartet.' : 'Die Zeit startet erst, wenn ihr euren Standort an der Startstation bestätigt.'} {simulation ? 'Im Testmodus ist keine Standortfreigabe nötig.' : 'Eine Internetverbindung und freigegebener Standortzugriff sind erforderlich.'}</p>
    </section> : <>
      {run.teamName && <p className={styles.start}><strong>{run.teamName}</strong> · Kennung {run.code}<br/>Gemeinsamer Teamstand · automatische Aktualisierung alle 3 Sekunden</p>}
      <section className={styles.stats} aria-label="Rundenfortschritt"><div><span>GESAMTZEIT</span><strong aria-label="Gesamtzeit">{duration(elapsed)}</strong></div><div><span>STATIONEN</span><strong>{Math.min(run.confirmed, view.total)} / {view.total}</strong></div></section>
      <p className={styles.muted}>Enthaltene Strafzeit: {duration(run.penaltyMs ?? 0)} · Gesamtzeit = Laufzeit + Strafzeit</p>
      <p className={styles.start}>Start und Ziel: <strong>{run.startNumber} · {run.startName}</strong></p>
      <nav className={styles.tabs} aria-label="Spielansicht"><button aria-pressed={tab==='hint'} onClick={()=>setTab('hint')}>Hinweis</button><button aria-pressed={tab==='map'} onClick={()=>setTab('map')}>Karte</button></nav>
      {tab === 'map' ? <section className={styles.card}><RallyMap position={position} track={simulation ? view?.simulationTrack : undefined} target={run.revealedTarget}/><p className={styles.muted}>{simulation ? 'Die Linie zeigt euren vorgegebenen GPX-Rundweg. ' : ''}Die Karte dient zur Orientierung. {run.revealedTarget ? `Euer aufgedecktes Ziel: ${run.revealedTarget.number} · ${run.revealedTarget.name}. Es ist orange markiert.` : 'Zielstationen werden erst nach Nutzung der Hilfe markiert.'} Euer letzter geprüfter Standort erscheint nach einer Standortmessung. Neue Kartenausschnitte benötigen Internet.</p></section> : <section className={styles.card}>
        <span className={styles.eyebrow}>{run.status === 'finished' ? 'RUNDE GESCHAFFT' : run.status === 'ready' ? 'BEREIT FÜR DEN START' : run.returning ? 'ZURÜCK ZUM START' : `HINWEIS ${run.confirmed} · WEITER GEHT’S`}</span>
        <h2>{run.status === 'finished' ? 'Wieder am Ziel!' : run.returning ? 'Schließt eure Runde ab.' : run.status === 'ready' ? 'Seid ihr am Startpunkt?' : 'Findet eure nächste Station.'}</h2>
        <RallyHint text={run.hint} parts={run.hintParts} image={run.hintImage} layout={run.hintLayout}/>
        {run.status === 'finished' && <p>Alle {view.total} Stationen und die Rückkehr zum Start wurden bestätigt. Eure Gesamtzeit: <strong>{duration(elapsed)}</strong>.</p>}
      </section>}
      {run.status === 'running' && !run.returning && <section className={styles.card}>
        {run.revealedTarget ? <><p>Aufgedecktes Ziel: <strong>{run.revealedTarget.number} · {run.revealedTarget.name}</strong></p><button onClick={()=>setTab('map')}>Ziel auf Karte anzeigen</button><p className={styles.muted}>Die Minute Strafzeit wurde bereits berechnet. Erneutes Anzeigen ist kostenlos.</p></> : <><button disabled={busy || !connected} onClick={()=>setHelpStep(run.confirmed)}>Keine Ahnung? Ort anzeigen (+1 Minute)</button><p className={styles.muted}>Die Hilfe verrät Name und Kartenposition. Ihr müsst trotzdem dorthin laufen und euren Standort bestätigen.</p></>}
      </section>}
      {helpStep !== null && <section className={styles.card} role="alertdialog" aria-labelledby="help-title"><h2 id="help-title">Nächsten Ort aufdecken?</h2><p>Der Name und die Kartenposition werden angezeigt. Dafür kommt einmalig für diese Station eine Minute zu eurer Gesamtzeit hinzu.</p><button disabled={busy || !connected} onClick={()=>void reveal()}>Ort aufdecken – 1 Minute Strafzeit</button><button className={styles.link} disabled={busy || !connected} onClick={()=>setHelpStep(null)}>Abbrechen</button></section>}
      {run.status !== 'finished' && <section className={styles.check}>
        <button className={styles.primary} onClick={()=>void check()} disabled={busy}>{checking ? (simulation ? 'GPS wird simuliert …' : 'Standort wird geprüft …') : simulation ? (run.status === 'ready' ? 'Startstation simulieren' : run.returning ? 'Rückkehr zum Start simulieren' : 'Nächste Station simulieren') : run.status === 'ready' ? 'Wir sind da – Runde starten' : run.returning ? 'Wir sind da – Runde abschließen' : 'Wir sind da'}</button>
        {checking ? <><p role="status">{simulation ? 'Simulierte GPS-Messungen werden geprüft …' : accuracy === null ? 'Wartet auf euren aktuellen Standort …' : `Gemeldete Genauigkeit: etwa ${Math.round(accuracy)} m. Bitte kurz stehen bleiben.`}</p><button className={styles.link} onClick={()=>checkController.current?.abort()}>Prüfung abbrechen</button></> : <p>Die App prüft mehrere aktuelle Messungen. Bei schlechtem Empfang wird keine Station übersprungen.</p>}
      </section>}
      <button className={styles.link} onClick={()=>setResetting(true)} disabled={busy}>Auf diesem Gerät abmelden</button>
    </>}
    {resetting && <section className={styles.card} role="alertdialog" aria-labelledby="restart-title"><h2 id="restart-title">Auf diesem Gerät abmelden?</h2><p>Eine gestartete Teamrunde läuft auf dem Server und den anderen Handys weiter. Ihr könnt ihr mit eurer Kennung wieder beitreten, solange sie läuft. Eine noch nicht gestartete Anmeldung wird nur dann freigegeben, wenn kein anderes Handy mehr angemeldet ist.</p><button onClick={()=>void reset()} disabled={busy || !connected}>Abmelden</button><button className={styles.link} onClick={()=>setResetting(false)}>Abbrechen</button></section>}
    <footer className={styles.footer}>Der Server speichert Kennung, Teamname, Startzeit, Stationsbestätigungen und Endzeit inklusive Strafzeit. Teamname und Zeiten sind für die Organisation im passwortgeschützten Dashboard sichtbar. GPS-Koordinaten werden nur für die Prüfung verarbeitet, nicht als Bewegungsverlauf gespeichert. Die Zeit läuft auch bei geschlossenem Bildschirm weiter.</footer>
    <Attribution/>
  </main>;
}
