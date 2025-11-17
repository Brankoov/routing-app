// frontend/src/components/RouteMap.tsx
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
} from 'react-leaflet';
import type { OrderedStop } from '../api/routeClient';
import 'leaflet/dist/leaflet.css';

type Props = {
  startAddress: string;
  endAddress: string;
  stops: OrderedStop[];
};

export default function RouteMap({ startAddress, endAddress, stops }: Props) {
  const stopsWithCoords = stops.filter(
    (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number',
  );

  const defaultCenter: [number, number] = [59.334591, 18.06324];

  const center: [number, number] =
    stopsWithCoords.length > 0
      ? [stopsWithCoords[0].latitude as number, stopsWithCoords[0].longitude as number]
      : defaultCenter;

  const polyline: [number, number][] = stopsWithCoords.map((s) => [
    s.latitude as number,
    s.longitude as number,
  ]);

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
        <div>
          <strong>Start:</strong> {startAddress}
        </div>
        <div>
          <strong>End:</strong> {endAddress}
        </div>
      </div>

      <div
        style={{
          height: 400,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #333',
        }}
      >
        <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {polyline.length > 1 && <Polyline positions={polyline} />}

          {stopsWithCoords.map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.latitude as number, s.longitude as number]}
              radius={8}
              stroke={true}
            >
              <Popup>
                #{s.order} – {s.address}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
