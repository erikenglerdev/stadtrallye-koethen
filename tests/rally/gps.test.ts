import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectPositionSamples} from '../../src/rally/gps';

test('GPS collector waits for stable fresh fixes and cleans up success, denial and cancellation',async t=>{
 let success: PositionCallback=()=>{}; let failure: PositionErrorCallback=()=>{}; let cleared=0; let now=100000;
 t.mock.method(Date,'now',()=>now); t.mock.method(performance,'now',()=>now);
 const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:true}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{watchPosition:(ok:PositionCallback,err:PositionErrorCallback)=>{success=ok;failure=err;return 5;},clearWatch:()=>{cleared++;}}}});
 t.after(()=>{if(originalWindow) Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');if(originalNavigator) Object.defineProperty(globalThis,'navigator',originalNavigator);else Reflect.deleteProperty(globalThis,'navigator');});
 const emit=(timestamp=now,accuracy=8)=>success({timestamp,coords:{latitude:51,longitude:12,accuracy}} as GeolocationPosition);
 const check=collectPositionSamples(1000,new AbortController().signal,()=>{});
 emit(); now+=2500;emit(); now+=3000;emit();
 const samples=await check;assert.equal(samples.length,3);assert.equal(samples[2].timestamp-samples[0].timestamp,5500);assert.equal(cleared,1);
 const denied=collectPositionSamples(2000,new AbortController().signal,()=>{});failure({code:1} as GeolocationPositionError);await assert.rejects(denied,/nicht erlaubt/);assert.equal(cleared,2);
 const control=new AbortController();const canceled=collectPositionSamples(3000,control.signal,()=>{});control.abort();await assert.rejects(canceled,/abgebrochen/);assert.equal(cleared,3);
 const stale=collectPositionSamples(4000,new AbortController().signal,()=>{});emit(now-10000);now+=2500;emit();now+=2500;emit(now,100);now+=1000;emit();now+=2500;emit();now+=3000;emit();const fresh=await stale;assert.equal(fresh.length,3);assert.ok(fresh.every(s=>s.accuracy===8));assert.equal(cleared,4);
});
