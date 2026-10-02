import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {simulationAllowed} from '@/rally/development';
import {getSimulationStore, getStore, RallyError} from '@/rally/store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'no-store'}});
function context(req: NextRequest) {
  const simulation = req.nextUrl.searchParams.get('simulation') === '1';
  if (simulation && !simulationAllowed(req)) throw new RallyError('Testmodus nicht verfügbar.', 404);
  return {store: simulation ? getSimulationStore() : getStore(), token: req.cookies.get(simulation ? 'rally_simulation_session' : 'rally_session')?.value};
}
function failure(error: unknown) {
  if (error instanceof RallyError) return json({error: error.message}, error.status);
  if (error instanceof z.ZodError || error instanceof SyntaxError) return json({error: 'Die Anfrage ist ungültig.'}, 400);
  return json({error: 'Der Chat ist gerade nicht erreichbar. Bitte erneut versuchen.'}, 500);
}
export async function GET(req: NextRequest) {
  try {
    const {store, token} = context(req);
    if (!token) return json({error: 'Bitte zuerst ein Team anmelden.'}, 401);
    return json(store.teamChat(token));
  } catch (error) { return failure(error); }
}
export async function POST(req: NextRequest) {
  try {
    const origin = process.env.APP_ORIGIN || `${req.nextUrl.protocol}//${req.headers.get('host') || req.nextUrl.host}`;
    if (req.headers.get('origin') !== origin || req.headers.get('sec-fetch-site') === 'cross-site') return json({error: 'Diese Anfrage ist nicht erlaubt.'}, 403);
    if (!req.headers.get('content-type')?.startsWith('application/json')) return json({error: 'JSON erforderlich.'}, 415);
    const raw = await req.text();
    if (raw.length > 1500) return json({error: 'Anfrage zu groß.'}, 413);
    const body = z.object({message: z.string().trim().min(1).max(1000)}).strict().parse(JSON.parse(raw));
    const {store, token} = context(req);
    if (!token) return json({error: 'Bitte zuerst ein Team anmelden.'}, 401);
    return json(store.sendTeamMessage(token, body.message));
  } catch (error) { return failure(error); }
}
