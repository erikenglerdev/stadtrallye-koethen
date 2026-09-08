import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {route} from '@/rally/route';
import {identitySchema} from '@/rally/identity';
import {getStore, getSimulationStore, RallyError} from '@/rally/store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import {simulationAllowed} from '@/rally/development';
function context(req: NextRequest) {
  const simulation = req.nextUrl.searchParams.get('simulation') === '1';
  if (simulation && !simulationAllowed(req)) throw new RallyError('Testmodus nicht verfügbar.', 404);
  return {simulation, store: simulation ? getSimulationStore() : getStore(), cookie: simulation ? 'rally_simulation_session' : 'rally_session'};
}
const sample = z.object({lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy: z.number().positive(), timestamp: z.number().finite()}).strict();
const bodySchema = z.discriminatedUnion('action', [
  z.object({action: z.literal('start'), stationNumber: z.number().int().positive(), ...identitySchema.shape}).strict(),
  z.object({action: z.literal('join'), code: identitySchema.shape.code}).strict(),
  z.object({action: z.literal('challenge')}).strict(),
  z.object({action: z.literal('confirm'), nonce: z.string().regex(/^[a-f0-9]{48}$/), samples: z.array(sample).min(3).max(20)}).strict(),
  z.object({action: z.literal('reveal'), step: z.number().int().nonnegative()}).strict(),
  z.object({action: z.literal('reset')}).strict(),
]);
const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'no-store'}});
function failure(error: unknown) {
  if (error instanceof RallyError) return json({error: error.message}, error.status);
  if (error instanceof z.ZodError || error instanceof SyntaxError) return json({error: 'Die Anfrage ist ungültig.'}, 400);
  console.error('Rally request failed:', error instanceof Error ? error.message : 'Unknown error');
  return json({error: 'Der Server ist gerade nicht erreichbar. Bitte erneut versuchen.'}, 500);
}
export async function GET(req: NextRequest) {
  try {
    const {store, cookie, simulation} = context(req);
    const token = req.cookies.get(cookie)?.value;
    return json({...store.view(token), ...(simulation ? {simulationTrack: route.track, simulationTarget: token && store.get(token) ? store.simulationTarget(token) : null} : {})});
  } catch (e) { return failure(e); }
}
export async function POST(req: NextRequest) {
  try {
    const {store, cookie, simulation} = context(req);
    const origin = req.headers.get('origin');
    const expectedOrigin = process.env.APP_ORIGIN || `${req.nextUrl.protocol}//${req.headers.get('host') || req.nextUrl.host}`;
    if (origin !== expectedOrigin || req.headers.get('sec-fetch-site') === 'cross-site') return json({error: 'Diese Anfrage ist nicht erlaubt.'}, 403);
    if (!req.headers.get('content-type')?.startsWith('application/json')) return json({error: 'JSON erforderlich.'}, 415);
    const raw = await req.text();
    if (raw.length > 12000) return json({error: 'Anfrage zu groß.'}, 413);
    const body = bodySchema.parse(JSON.parse(raw));
    const token = req.cookies.get(cookie)?.value;
    if (body.action === 'reset') {
      store.leave(token);
      const res = json({ok: true}); res.cookies.set(cookie, '', {maxAge: 0, path: process.env.BASE_PATH || '/'}); return res;
    }
    if (body.action === 'start' || body.action === 'join') {
      if (token && store.get(token)) throw new RallyError('Es gibt bereits eine Runde. Bitte zuerst ausdrücklich eine neue Runde wählen.', 409);
      const newToken = body.action === 'join' ? store.join(body.code) : store.create(body.stationNumber, {code:body.code, teamName:body.teamName});
      const res = json({...store.view(newToken), ...(simulation ? {simulationTrack: route.track} : {})});
      res.cookies.set(cookie, newToken, {httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30, path: process.env.BASE_PATH || '/'});
      return res;
    }
    if (!token) return json({error: 'Bitte zuerst eine Startnummer eingeben.'}, 401);
    if (body.action === 'challenge') return json({...store.challenge(token), ...(simulation ? {position: store.simulationTarget(token)} : {})});
    if (body.action === 'reveal') return json({...store.reveal(token, body.step), ...(simulation ? {simulationTrack: route.track} : {})});
    return json({...store.confirm(token, body.nonce, body.samples), ...(simulation ? {simulationTrack: route.track} : {})});
  } catch (e) { return failure(e); }
}
