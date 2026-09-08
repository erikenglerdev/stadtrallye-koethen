import type {NextRequest} from 'next/server';
/** Fail closed: no simulator on production, LAN hosts, or forwarded/tunnel requests. */
export function simulationAllowed(req: NextRequest, environment = process.env.NODE_ENV): boolean {
  if (environment !== 'development') return false;
  if (req.headers.has('forwarded')) return false;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded && forwarded.split(',').some(ip => !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip.trim()))) return false;
  const local = (host: string) => {
    try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${host}`).hostname); } catch { return false; }
  };
  return local(req.headers.get('host') || req.nextUrl.host)
    && (!req.headers.has('x-forwarded-host') || local(req.headers.get('x-forwarded-host')!));
}
