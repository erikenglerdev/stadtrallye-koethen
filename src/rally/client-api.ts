export class ConnectionError extends Error {
  constructor() { super('Keine Verbindung zum Server. Der letzte Teamstand bleibt sichtbar. Die App versucht es automatisch erneut.'); }
}
/** Writes are never retried or queued: after uncertain delivery, fetch server state. */
export async function requestRally(body?: unknown, simulation = false) {
  const url=`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/rally/`+(simulation?'?simulation=1':'');
  let response:Response;
  try {
    response=await fetch(url,{signal:AbortSignal.timeout(15000),cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  } catch {throw new ConnectionError();}
  if(response.status>=500) throw new ConnectionError();
  let result;
  try {result=await response.json();}catch{throw new ConnectionError();}
  if(!response.ok)throw new Error(result.error || 'Die Anfrage konnte nicht ausgeführt werden.');
  return result;
}
