import type {Run, Sample, Station} from './types';
export const MAX_ACCURACY = 25;
export const MIN_SAMPLE_SPAN = 4000;
export const CHALLENGE_TTL = 60000;
export function distanceMeters(a: {lat: number; lng: number}, b: {lat: number; lng: number}) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function expectedIndex(run: Run, count: number) { return (run.startIndex + run.confirmed) % count; }
export function verifySamples(run: Run, samples: Sample[], stations: Station[], now: number): string | null {
  if (run.finishedAt !== null) return 'Diese Runde ist bereits abgeschlossen.';
  if (run.challengeAt === null || now - run.challengeAt > CHALLENGE_TTL || now - run.challengeAt < MIN_SAMPLE_SPAN)
    return 'Die Standortprüfung ist abgelaufen oder noch nicht abgeschlossen. Bitte erneut versuchen.';
  if (samples.length < 3 || samples.length > 20) return 'Für die Bestätigung fehlen mehrere aktuelle Standortmessungen.';
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (![s.lat, s.lng, s.accuracy, s.timestamp].every(Number.isFinite) || Math.abs(s.lat) > 90 || Math.abs(s.lng) > 180 || s.accuracy <= 0)
      return 'Die Standortdaten sind ungültig.';
    if (s.accuracy > MAX_ACCURACY) return 'Euer Standort ist noch zu ungenau. Wartet kurz unter freiem Himmel und versucht es erneut.';
    if (s.timestamp < run.challengeAt || s.timestamp > now + 2000 || now - s.timestamp > 30000 || (i > 0 && s.timestamp <= samples[i - 1].timestamp))
      return 'Die Standortdaten sind nicht aktuell. Bitte erneut prüfen.';
  }
  if (samples.at(-1)!.timestamp - samples[0].timestamp < MIN_SAMPLE_SPAN) return 'Bitte wartet einige Sekunden auf einen stabilen Standort.';
  const target = stations[expectedIndex(run, stations.length)];
  if (samples.some(s => distanceMeters(s, target) > target.radiusMeters)) return 'Ihr seid noch nicht an der gesuchten Station. Sucht weiter!';
  if (run.confirmed > 0) {
    const previous = stations[(run.startIndex + run.confirmed - 1) % stations.length];
    if (samples.some(s => distanceMeters(s, previous) <= previous.radiusMeters + 5))
      return 'Ihr seid noch zu nah an der vorherigen Station. Geht weiter zur nächsten Station.';
  }
  return null;
}
export function advance(run: Run, stationCount: number, now: number): Run {
  if (run.finishedAt !== null) throw new Error('Run already finished');
  const confirmed = run.confirmed + 1;
  return {...run, confirmed, startedAt: run.startedAt ?? now, finishedAt: confirmed === stationCount + 1 ? now : null, challenge: null, challengeAt: null};
}
