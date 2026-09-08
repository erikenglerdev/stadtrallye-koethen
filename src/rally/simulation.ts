import type {Sample} from './types';
/** Produce fresh fixes over real elapsed time; normal server validation still applies. */
export function simulatePositionSamples(position: {lat: number; lng: number}, serverNow: number, signal: AbortSignal): Promise<Sample[]> {
  return new Promise((resolve, reject) => {
    const began = performance.now();
    const samples: Sample[] = [{lat: position.lat, lng: position.lng, accuracy: 5, timestamp: serverNow}];
    const abort = () => { clearInterval(timer); signal.removeEventListener('abort', abort); reject(new Error('Die Simulation wurde abgebrochen.')); };
    const timer = setInterval(() => {
      const elapsed = performance.now() - began;
      samples.push({lat: position.lat, lng: position.lng, accuracy: 5, timestamp: serverNow + elapsed});
      if (elapsed >= 5000) {
        clearInterval(timer); signal.removeEventListener('abort', abort); resolve(samples);
      }
    }, 2500);
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) abort();
  });
}
