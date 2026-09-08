import {createHmac, randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';
const lifetime = 12 * 60 * 60 * 1000;
export const dashboardCookie = 'rally_dashboard';
function config() {
  const password=process.env.RALLY_DASHBOARD_PASSWORD, secret=process.env.RALLY_DASHBOARD_SESSION_SECRET;
  if(!password || !secret || secret.length<32) throw new Error('Dashboard-Zugang ist noch nicht konfiguriert.');
  return {password,secret};
}
export function validPassword(password: string) {
  const settings=config();
  return timingSafeEqual(scryptSync(password,settings.secret,64),scryptSync(settings.password,settings.secret,64));
}
function signature(value: string) { return createHmac('sha256',config().secret).update(config().password).update('\0').update(value).digest('hex'); }
export function dashboardSession(now=Date.now()) {
  const value=`${now+lifetime}.${randomBytes(16).toString('hex')}`;
  return `${value}.${signature(value)}`;
}
export function authenticated(token?: string, now=Date.now()) {
  config();
  if(!token || !/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires,nonce,sig]=token.split('.');
  return Number(expires)>now && Number(expires)<=now+lifetime && timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(signature(`${expires}.${nonce}`),'hex'));
}
// Bounded, process-wide throttle; never trust client-supplied proxy IP headers.
let windowStart=0, attempts=0;
export function allowLogin(now=Date.now()) {
  if(now-windowStart>=60000) {windowStart=now;attempts=0;}
  return ++attempts<=30;
}
