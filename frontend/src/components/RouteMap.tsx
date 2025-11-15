// frontend/src/components/RouteMap.tsx
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import type { OrderedStop } from '../api/routeClient';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vite-friendly ikoner
const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString();
const iconUrl       = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString();
const shadowUrl     = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString();

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

type Props = {
  startAddress: string;
  endAddress: string;
  // 👉 Använd OrderedStop så vi får med lat/lng när de väl finns
  stops: OrderedStop[];
};

// Tillfälligt: två fasta punkter (Sthlm → Gbg) för demo
const START_COORD: [number, number] = [59.334591, 18.06324];
const END_COORD: [number, number]   = [57.70887, 11.97456];

function interpolate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// Välj antingen riktiga coords (om finns) eller fallback-interpolering
function coordForStop(
  stopIndex: number,
  totalStops: number,
  lat: number | null,
  lng: number | null
): [number, number] {
  if (typeof lat === 'number' && typeof lng === 'number') {
    return [lat, lng];
  }
  // fallback: sprid ut mellan start och end
  const t = (stopIndex + 1) / (totalStops + 1);
  return interpolate(START_COORD, END_COORD, t);
}

export default function RouteMap({ startAddress, endAddress, stops }: Props) {
  // Start → stops (i redan optimerad ordning) → End
  const ordered = [
    { label: `Start: ${startAddress}`, coord: START_COORD },
    ...stops.map((s, i) => ({
      label: `#${s.order} – ${s.address}`,
      coord: coordForStop(i, stops.length, s.latitude, s.longitude),
    })),
    { label: `End: ${endAddress}`, coord: END_COORD },
  ];

  const center = ordered[0]?.coord ?? START_COORD;
  const polyline: [number, number][] = ordered.map(p => p.coord);

  return (
    <div style={{ height: 400, marginTop: '1rem', borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Polyline positions={polyline} />
        {ordered.map((p, idx) => (
          <Marker key={idx} position={p.coord}>
            <Popup>{p.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
