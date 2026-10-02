import {DatabaseSync} from 'node:sqlite';
import {randomBytes, createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {acceptedTeamCode} from './team-codes';
import {identitySchema} from './identity';
import {route, routeVersion} from './route';
import {advance, expectedIndex, verifySamples} from './rules';
import type {ChatMessage, HelpRequest, RallyView, Run, Sample} from './types';
export class RallyError extends Error { constructor(message: string, public status = 400) { super(message); } }
const tokenHash = (s: string) => createHash('sha256').update(s).digest('hex');
export class RallyStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), {recursive: true});
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, routeVersion TEXT NOT NULL, startIndex INTEGER NOT NULL, confirmed INTEGER NOT NULL, startedAt INTEGER, finishedAt INTEGER, challenge TEXT, challengeAt INTEGER);
      CREATE TABLE IF NOT EXISTS sessions (tokenHash TEXT PRIMARY KEY, runId TEXT NOT NULL, nonce TEXT, nonceAt INTEGER, step INTEGER, revokedAt INTEGER);
      CREATE INDEX IF NOT EXISTS sessions_run ON sessions(runId);
      INSERT OR IGNORE INTO sessions SELECT id, id, NULL, NULL, NULL, NULL FROM runs;
      CREATE TABLE IF NOT EXISTS teams (runId TEXT PRIMARY KEY, code TEXT NOT NULL, teamName TEXT NOT NULL, abandonedAt INTEGER);
      CREATE TABLE IF NOT EXISTS reveals (runId TEXT NOT NULL, step INTEGER NOT NULL, revealedAt INTEGER NOT NULL, PRIMARY KEY(runId, step));
      CREATE TABLE IF NOT EXISTS confirmations (runId TEXT NOT NULL, step INTEGER NOT NULL, stationId TEXT NOT NULL, confirmedAt INTEGER NOT NULL, PRIMARY KEY(runId, step));
      CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, runId TEXT NOT NULL, sender TEXT NOT NULL CHECK(sender IN ('team', 'organizer')), body TEXT NOT NULL, createdAt INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS chat_messages_run ON chat_messages(runId, id);`);
  }
  close() { this.db.close(); }
  get(token: string | undefined): Run | null {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return this.db.prepare('SELECT r.* FROM runs r JOIN sessions s ON s.runId=r.id WHERE s.tokenHash=? AND s.revokedAt IS NULL').get(tokenHash(token)) as Run | undefined ?? null;
  }
  private require(token: string): Run {
    const run = this.get(token);
    if (!run) throw new RallyError('Diese Runde wurde nicht gefunden. Bitte die Startseite neu laden.', 404);
    if (run.routeVersion !== routeVersion) throw new RallyError('Die Route wurde geändert. Bitte eine neue Runde beginnen.', 409);
    if(this.db.prepare('SELECT 1 FROM teams WHERE runId=? AND abandonedAt IS NOT NULL').get(run.id)) throw new RallyError('Diese Runde wurde verlassen. Bitte eine neue Runde beginnen.',409);
    return run;
  }
  create(startNumber: number, identity?: {code: string; teamName: string}) {
    if (!Number.isInteger(startNumber) || startNumber < 1 || startNumber > route.stations.length) throw new RallyError('Bitte eine gültige Stationsnummer eingeben.');
    const token = randomBytes(32).toString('hex');
    const team = identity ? identitySchema.parse(identity) : null;
    if(team && !acceptedTeamCode(team.code)) throw new RallyError('Diese Kennung ist nicht gültig. Bitte verwendet eine Kennung der Organisation.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (team && this.db.prepare('SELECT 1 FROM teams t JOIN runs r ON r.id=t.runId WHERE t.code=? AND r.startedAt IS NOT NULL').get(team.code))
        throw new RallyError('Diese Kennung wurde bereits gestartet und kann keine neue Runde erstellen. Bitte bestehender Runde beitreten.',409);
      if (team && this.db.prepare('SELECT 1 FROM teams t JOIN runs r ON r.id=t.runId WHERE t.code=? AND t.abandonedAt IS NULL AND r.finishedAt IS NULL AND r.routeVersion=?').get(team.code, routeVersion))
        throw new RallyError('Für diese Kennung gibt es bereits eine Runde. Bitte bestehender Runde beitreten.', 409);
      this.db.prepare('INSERT INTO runs VALUES (?, ?, ?, 0, NULL, NULL, NULL, NULL)').run(tokenHash(token), routeVersion, startNumber - 1);
      this.db.prepare('INSERT INTO sessions VALUES (?, ?, NULL, NULL, NULL, NULL)').run(tokenHash(token),tokenHash(token));
      if (team) this.db.prepare('INSERT INTO teams VALUES (?, ?, ?, NULL)').run(tokenHash(token), team.code, team.teamName);
      this.db.exec('COMMIT');
    } catch(error) { if(this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
    return token;
  }
  join(rawCode: string) {
    const code=identitySchema.shape.code.parse(rawCode);
    if(!acceptedTeamCode(code)) throw new RallyError('Diese Kennung ist nicht gültig.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const run=this.db.prepare(`SELECT r.* FROM runs r JOIN teams t ON t.runId=r.id
        WHERE t.code=? AND t.abandonedAt IS NULL ORDER BY (r.startedAt IS NOT NULL) DESC, r.rowid DESC LIMIT 1`).get(code) as Run | undefined;
      if(!run) throw new RallyError('Für diese Kennung gibt es noch keine beitretbare Runde.',404);
      if(run.finishedAt !== null) throw new RallyError('Diese Runde ist bereits abgeschlossen. Die Kennung bleibt verbraucht.',409);
      if(run.routeVersion !== routeVersion) throw new RallyError('Diese Runde gehört zu einer älteren Route und kann nicht fortgesetzt werden.',409);
      const token=randomBytes(32).toString('hex');
      this.db.prepare('INSERT INTO sessions VALUES (?, ?, NULL, NULL, NULL, NULL)').run(tokenHash(token),run.id);
      this.db.exec('COMMIT');return token;
    } catch(error) {if(this.db.isTransaction)this.db.exec('ROLLBACK');throw error;}
  }
  view(token?: string, now = Date.now()): RallyView {
    const run = this.get(token);
    const base = {title: route.title, total: route.stations.length, serverNow: now};
    if (!run) return {...base, run: null};
    this.require(token!);
    const team = this.db.prepare('SELECT code, teamName FROM teams WHERE runId=?').get(run.id) as {code: string; teamName: string} | undefined;
    const start = route.stations[run.startIndex];
    const reveals = this.db.prepare('SELECT step FROM reveals WHERE runId = ?').all(run.id) as {step: number}[];
    const penaltyMs = reveals.length * 60000;
    const target = route.stations[expectedIndex(run, route.stations.length)];
    const revealedTarget = run.finishedAt === null && reveals.some(r => r.step === run.confirmed)
      ? {number: target.number, name: target.name, lat: target.lat, lng: target.lng} : null;
    return {...base, run: {code: team?.code ?? null, teamName: team?.teamName ?? null, status: run.finishedAt !== null ? 'finished' : run.startedAt !== null ? 'running' : 'ready', startNumber: start.number, startName: start.name, confirmed: run.confirmed, startedAt: run.startedAt, finishedAt: run.finishedAt, penaltyMs, revealedTarget, ...(run.startedAt !== null && run.finishedAt === null ? {hintParts: target.hintParts, hintImage: target.hintImage, hintLayout: target.hintLayout} : {}), elapsedMs: run.startedAt === null ? 0 : (run.finishedAt ?? now) - run.startedAt + penaltyMs, returning: run.confirmed === route.stations.length, hint: run.finishedAt !== null ? 'Geschafft! Ihr habt alle Stationen besucht und seid wieder an eurem Startpunkt.' : run.confirmed === 0 ? `Geht zu eurer Startstation ${start.number}: ${start.name}. Bestätigt dort euren Standort, um die Zeit zu starten.` : route.stations[expectedIndex(run, route.stations.length)].hint}};
  }
  leave(token?: string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const run=this.get(token);
      if(run && token) {
        const now=Date.now();
        this.db.prepare('UPDATE sessions SET revokedAt=?, nonce=NULL WHERE tokenHash=?').run(now,tokenHash(token));
        // Leaving a device never ends a started team round. Unstarted reservations
        // can be released only when no other device is still attached.
        if(run.startedAt === null && !this.db.prepare('SELECT 1 FROM sessions WHERE runId=? AND revokedAt IS NULL').get(run.id))
          this.db.prepare("INSERT INTO teams VALUES (?, '–', 'Ohne Teamname (Altbestand)', ?) ON CONFLICT(runId) DO UPDATE SET abandonedAt=excluded.abandonedAt").run(run.id,now);
      }
      this.db.exec('COMMIT');
    } catch(error) {if(this.db.isTransaction)this.db.exec('ROLLBACK');throw error;}
  }
  private chatMessages(runId: string): ChatMessage[] {
    const rows = this.db.prepare('SELECT id, sender, body, createdAt FROM chat_messages WHERE runId=? ORDER BY id DESC LIMIT 100').all(runId) as ChatMessage[];
    return rows.reverse();
  }
  teamChat(token: string) { return {messages: this.chatMessages(this.require(token).id)}; }
  sendTeamMessage(token: string, message: string, now = Date.now()) {
    const run = this.require(token);
    const body = message.trim();
    if (!body || body.length > 1000) throw new RallyError('Bitte eine Nachricht mit höchstens 1000 Zeichen eingeben.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const last = this.db.prepare("SELECT createdAt FROM chat_messages WHERE runId=? AND sender='team' ORDER BY id DESC LIMIT 1").get(run.id) as {createdAt: number} | undefined;
      if (last && now - last.createdAt < 2000) throw new RallyError('Bitte kurz warten, bevor ihr eine weitere Nachricht sendet.', 429);
      this.db.prepare("INSERT INTO chat_messages (runId, sender, body, createdAt) VALUES (?, 'team', ?, ?)").run(run.id, body, now);
      this.db.exec('COMMIT');
    } catch (error) { if (this.db.isTransaction) this.db.exec('ROLLBACK'); throw error; }
    return this.teamChat(token);
  }
  dashboardChat(teamId: number) {
    const row = this.db.prepare('SELECT id FROM runs WHERE rowid=?').get(teamId) as {id: string} | undefined;
    if (!row) throw new RallyError('Dieses Team wurde nicht gefunden.', 404);
    return {messages: this.chatMessages(row.id)};
  }
  sendDashboardMessage(teamId: number, message: string, now = Date.now()) {
    const body = message.trim();
    if (!body || body.length > 1000) throw new RallyError('Bitte eine Nachricht mit höchstens 1000 Zeichen eingeben.');
    const row = this.db.prepare('SELECT id FROM runs WHERE rowid=?').get(teamId) as {id: string} | undefined;
    if (!row) throw new RallyError('Dieses Team wurde nicht gefunden.', 404);
    this.db.prepare("INSERT INTO chat_messages (runId, sender, body, createdAt) VALUES (?, 'organizer', ?, ?)").run(row.id, body, now);
    return this.dashboardChat(teamId);
  }
  dashboard(now = Date.now()) {
    // Only timing and team identity leave the server; no station IDs or locations.
    const rows = this.db.prepare(`SELECT r.rowid AS id, t.code, t.teamName, t.abandonedAt,
      r.routeVersion, r.startedAt, r.finishedAt,
      (SELECT COUNT(*) FROM reveals v WHERE v.runId=r.id)*60000 AS penaltyMs
      FROM runs r LEFT JOIN teams t ON t.runId=r.id ORDER BY r.rowid DESC`).all() as unknown as {
        id: number; code: string | null; teamName: string | null; abandonedAt: number | null;
        routeVersion: string; startedAt: number | null; finishedAt: number | null; penaltyMs: number;
      }[];
    const helpRequests = this.db.prepare(`SELECT r.rowid AS teamId, COALESCE(t.code, '–') AS code,
      COALESCE(t.teamName, 'Ohne Teamname (Altbestand)') AS teamName,
      m.body AS lastMessage, m.createdAt AS lastMessageAt, m.sender AS lastSender,
      (SELECT COUNT(*) FROM chat_messages WHERE runId=r.id) AS messageCount
      FROM runs r JOIN chat_messages m ON m.id=(SELECT MAX(id) FROM chat_messages WHERE runId=r.id)
      LEFT JOIN teams t ON t.runId=r.id ORDER BY (m.sender='team') DESC, m.id DESC`).all() as HelpRequest[];
    return {serverNow: now, helpRequests, teams: rows.map(r=>({id:r.id, code:r.code ?? '–', teamName:r.teamName ?? 'Ohne Teamname (Altbestand)',
      status: r.finishedAt !== null ? 'finished' as const : r.abandonedAt !== null ? 'abandoned' as const : r.routeVersion !== routeVersion ? 'outdated' as const : r.startedAt !== null ? 'running' as const : 'ready' as const,
      startedAt:r.startedAt, finishedAt:r.finishedAt, penaltyMs:r.penaltyMs,
      elapsedMs:r.startedAt === null ? 0 : Math.max(0,(r.finishedAt ?? r.abandonedAt ?? now)-r.startedAt)+r.penaltyMs}))};
  }
  reveal(token: string, step: number, now = Date.now()) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const run = this.require(token);
      if (run.finishedAt !== null || run.startedAt === null || run.confirmed === route.stations.length)
        throw new RallyError('Für diese Station ist keine kostenpflichtige Hilfe nötig.');
      if (run.confirmed !== step) throw new RallyError('Die Station hat sich geändert. Bitte den Stand aktualisieren.', 409);
      this.db.prepare('INSERT OR IGNORE INTO reveals VALUES (?, ?, ?)').run(run.id, step, now);
      this.db.exec('COMMIT');
      return this.view(token, now);
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }
  simulationTarget(token: string) {
    const run = this.require(token);
    if (run.finishedAt !== null) return null;
    const {number, name, lat, lng} = route.stations[expectedIndex(run, route.stations.length)];
    return {number, name, lat, lng};
  }
  challenge(token: string, now = Date.now()) {
    const run = this.require(token);
    if (run.finishedAt !== null) throw new RallyError('Diese Runde ist bereits abgeschlossen.');
    const nonce = randomBytes(24).toString('hex');
    this.db.prepare('UPDATE sessions SET nonce=?, nonceAt=?, step=? WHERE tokenHash=? AND revokedAt IS NULL').run(nonce,now,run.confirmed,tokenHash(token));
    return {nonce, serverNow: now};
  }
  confirm(token: string, nonce: string, samples: Sample[], now = Date.now()) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const run = this.require(token);
      const session=this.db.prepare('SELECT nonce, nonceAt, step FROM sessions WHERE tokenHash=? AND revokedAt IS NULL').get(tokenHash(token)) as {nonce: string | null; nonceAt: number | null; step: number};
      if (!session?.nonce || session.nonce !== nonce || session.step !== run.confirmed) throw new RallyError('Der Teamfortschritt hat sich geändert oder die Prüfung ist abgelaufen. Bitte erneut prüfen.', 409);
      const error = verifySamples({...run,challenge:session.nonce,challengeAt:session.nonceAt}, samples, route.stations, now);
      // Consume each challenge even when GPS validation fails.
      this.db.prepare('UPDATE sessions SET nonce=NULL, nonceAt=NULL WHERE tokenHash=?').run(tokenHash(token));
      if (error) { this.db.exec('COMMIT'); throw new RallyError(error); }
      if(run.startedAt === null && this.db.prepare(`SELECT 1 FROM teams t JOIN teams other ON other.code=t.code
        JOIN runs r ON r.id=other.runId WHERE t.runId=? AND r.id<>? AND r.startedAt IS NOT NULL`).get(run.id,run.id))
        throw new RallyError('Diese Kennung wurde bereits für eine andere Runde gestartet.',409);
      const next = advance(run, route.stations.length, now);
      this.db.prepare('UPDATE runs SET confirmed = ?, startedAt = ?, finishedAt = ? WHERE id = ?').run(next.confirmed, next.startedAt, next.finishedAt, run.id);
      this.db.prepare('INSERT INTO confirmations VALUES (?, ?, ?, ?)').run(run.id, next.confirmed, route.stations[expectedIndex(run, route.stations.length)].id, now);
      this.db.exec('COMMIT');
      return this.view(token, now);
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
let store: RallyStore | undefined;
export function getStore() {
  return store ??= new RallyStore(resolve(process.env.RALLY_DATA_DIR || '.data', 'rally.sqlite'));
}

let simulationStore: RallyStore | undefined;
export function getSimulationStore() {
  if (process.env.NODE_ENV !== 'development') throw new RallyError('Testmodus nicht verfügbar.', 404);
  return simulationStore ??= new RallyStore(resolve(process.env.RALLY_DATA_DIR || '.data', 'rally-simulation.sqlite'));
}
