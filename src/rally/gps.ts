import type {Sample} from './types';
/** Read only while the participant explicitly requests a check. */
export function collectPositionSamples(serverNow: number, signal: AbortSignal, onAccuracy: (meters: number) => void): Promise<Sample[]> {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) { reject(new Error('Die Standortprüfung benötigt HTTPS oder localhost.')); return; }
    if (!navigator.geolocation) { reject(new Error('Dieser Browser unterstützt keine Standortprüfung.')); return; }
    const began = performance.now();
    const samples: Sample[] = [];
    let settled = false;
    const watch: {id?: number} = {};
    let lastPositionTimestamp = 0;
    const cleanup = () => { if (watch.id !== undefined) navigator.geolocation.clearWatch(watch.id); clearTimeout(timeout); signal.removeEventListener('abort', abort); };
    const fail = (message: string) => { if (!settled) { settled = true; cleanup(); reject(new Error(message)); } };
    const abort = () => fail('Die Standortprüfung wurde abgebrochen.');
    const timeout = setTimeout(() => fail('Kein ausreichend genauer Standort gefunden. Geht unter freien Himmel und versucht es erneut.'), 25000);
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) { abort(); return; }
    watch.id = navigator.geolocation.watchPosition(pos => {
      if (settled) return;
      const {latitude: lat, longitude: lng, accuracy} = pos.coords;
      onAccuracy(accuracy);
      // Reject cached fixes; use elapsed monotonic time for server-relative timestamps.
      if (Math.abs(Date.now() - pos.timestamp) > 5000 || accuracy > 25 || accuracy <= 0) { samples.length = 0; return; }
      if (samples.length && pos.timestamp - lastPositionTimestamp < 1000) return;
      lastPositionTimestamp = pos.timestamp;
      const timestamp = serverNow + performance.now() - began;
      samples.push({lat, lng, accuracy, timestamp});
      if (samples.length > 20) samples.shift();
      if (samples.length >= 3 && timestamp - samples[0].timestamp >= 5000) {
        settled = true; cleanup(); resolve(samples);
      }
    }, err => {
      fail(err.code === 1 ? 'Der Standortzugriff ist nicht erlaubt. Bitte gebt ihn in den Browser-Einstellungen frei.' : err.code === 2 ? 'Euer Standort ist gerade nicht verfügbar. Bitte versucht es unter freiem Himmel erneut.' : 'Die Standortabfrage hat zu lange gedauert. Bitte erneut versuchen.');
    }, {enableHighAccuracy: true, maximumAge: 0, timeout: 15000});
  });
}
