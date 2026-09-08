'use client';
import {Circle, Popup, Polyline, MapContainer, TileLayer, useMap} from 'react-leaflet';
import {useEffect} from 'react';
import 'leaflet/dist/leaflet.css';
function Center({position}: {position: {lat: number; lng: number} | null}) {
  const map = useMap();
  useEffect(() => { if (position) map.setView(position, 17); }, [map, position]);
  return null;
}
export default function RallyMap({position, track, target}: {target?: {lat: number; lng: number; name: string} | null; track?: {lat: number; lng: number}[]; position: {lat: number; lng: number; accuracy: number} | null}) {
  return <div style={{height: 330}}><MapContainer center={[51.7517, 11.9744]} zoom={16} style={{height: 330, width: '100%', borderRadius: 18}}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Center position={target ?? position} />
    {target && <Circle center={target} radius={10} pathOptions={{color: '#a35218'}}><Popup>{target.name}</Popup></Circle>}
    {track && <Polyline positions={track} pathOptions={{color: '#275b47', weight: 4}} />}
    {position && <Circle center={position} radius={position.accuracy} pathOptions={{color: '#275b47'}} />}
  </MapContainer></div>;
}
