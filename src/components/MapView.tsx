'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icon paths break under bundlers — patch with CDN URLs.
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type MapViewProps = {
  lat: number | null;
  lon: number | null;
  onPick: (lat: number, lon: number) => void;
};

const DEFAULT_CENTER: [number, number] = [38.7223, -9.1393]; // Lisbon, per PRD example.
const DEFAULT_ZOOM = 6;

function ClickHandler({ onPick }: { onPick: MapViewProps['onPick'] }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToConfirmed({ lat, lon }: { lat: number | null; lon: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lon !== null) {
      map.flyTo([lat, lon], Math.max(map.getZoom(), 10), { duration: 0.6 });
    }
  }, [lat, lon, map]);
  return null;
}

export function MapView({ lat, lon, onPick }: MapViewProps) {
  const center: [number, number] = lat !== null && lon !== null ? [lat, lon] : DEFAULT_CENTER;
  return (
    <div className="h-72 w-full overflow-hidden rounded-md border border-zinc-300 shadow-sm">
      <MapContainer
        center={center}
        zoom={lat !== null ? 10 : DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        <FlyToConfirmed lat={lat} lon={lon} />
        {lat !== null && lon !== null ? <Marker position={[lat, lon]} /> : null}
      </MapContainer>
    </div>
  );
}
