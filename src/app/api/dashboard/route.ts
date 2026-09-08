import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {authenticated, allowLogin, dashboardCookie, dashboardSession, validPassword} from '@/rally/dashboard-auth';
import {getStore, getSimulationStore} from '@/rally/store';
import {simulationAllowed} from '@/rally/development';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
const cookieOptions=()=>({httpOnly:true, sameSite:'strict' as const, secure:process.env.NODE_ENV==='production',path:`${process.env.BASE_PATH || ''}/api/dashboard`,maxAge:12*60*60});
function error(e:unknown) {
  if(e instanceof z.ZodError || e instanceof SyntaxError) return json({error:'Ungültige Anfrage.'},400);
  return json({error:'Dashboard ist derzeit nicht verfügbar. Bitte Serverkonfiguration prüfen.'},503);
}
export async function GET(req:NextRequest) {
  try {
    if(!authenticated(req.cookies.get(dashboardCookie)?.value)) return json({error:'Bitte anmelden.'},401);
    const simulation=req.nextUrl.searchParams.get('simulation')==='1';
    if(simulation && !simulationAllowed(req)) return json({error:'Testmodus nicht verfügbar.'},404);
    return json({... (simulation ? getSimulationStore() : getStore()).dashboard(),simulation});
  } catch(e) {return error(e);}
}
export async function POST(req:NextRequest) {
  try {
    const origin=process.env.APP_ORIGIN || `${req.nextUrl.protocol}//${req.headers.get('host') || req.nextUrl.host}`;
    if(req.headers.get('origin')!==origin || req.headers.get('sec-fetch-site')==='cross-site') return json({error:'Anfrage nicht erlaubt.'},403);
    if(!req.headers.get('content-type')?.startsWith('application/json')) return json({error:'JSON erforderlich.'},415);
    const raw=await req.text();if(raw.length>2048) return json({error:'Anfrage zu groß.'},413);
    const body=z.discriminatedUnion('action',[
      z.object({action:z.literal('login'),password:z.string().min(1).max(256)}).strict(),
      z.object({action:z.literal('logout')}).strict(),
    ]).parse(JSON.parse(raw));
    if(body.action==='logout') {
      const res=json({ok:true});res.cookies.set(dashboardCookie,'',{...cookieOptions(),maxAge:0});return res;
    }
    if(!allowLogin()) return json({error:'Zu viele Anmeldeversuche. Bitte eine Minute warten.'},429);
    if(!validPassword(body.password)) return json({error:'Das Passwort ist nicht korrekt.'},401);
    const res=json({ok:true});res.cookies.set(dashboardCookie,dashboardSession(),cookieOptions());return res;
  } catch(e) {return error(e);}
}
