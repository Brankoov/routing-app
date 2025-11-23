import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker, // <--- BYTTE CircleMarker mot Marker
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet'; // <--- VIKTIG IMPORT
import type { OrderedStop } from '../api/routeClient';
import 'leaflet/dist/leaflet.css';

// Fix för Leaflets standard-ikoner som ibland strular i React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- AVKODNING AV POLYLINE (Samma som förut) ---
function decodePolyline(str: string, precision: number = 5): [number, number][] {
  let index = 0,
      lat = 0,
      lng = 0,
      coordinates: [number, number][] = [],
      shift = 0,
      result = 0,
      byte = null,
      latitude_change,
      longitude_change,
      factor = Math.pow(10, precision);

  while (index < str.length) {
      byte = null;
      shift = 0;
      result = 0;

      do {
          byte = str.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
      } while (byte >= 0x20);

      latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
      shift = result = 0;

      do {
          byte = str.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
      } while (byte >= 0x20);

      longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

      lat += latitude_change;
      lng += longitude_change;

      coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// --- SKAPA EN NUMRERAD IKON ---
function createNumberedIcon(label: string | number) {
  // Om det är S (Start) eller M (Mål), byt färg!
  let bgColor = '#333';
  if (label === 'S') bgColor = '#2e7d32'; // Grön
  if (label === 'M') bgColor = '#c62828'; // Röd

  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<span style="background-color: ${bgColor}; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
}

type Props = {
  startAddress: string;
  endAddress: string;
  stops: OrderedStop[];
  geometry?: string;
};

export default function RouteMap({ startAddress, endAddress, stops, geometry }: Props) {
  const routePath: [number, number][] = geometry 
    ? decodePolyline(geometry)
    : stops
        .filter(s => s.latitude && s.longitude)
        .map(s => [s.latitude!, s.longitude!]);

  const defaultCenter: [number, number] = [59.334591, 18.06324];
  const center: [number, number] = routePath.length > 0 ? routePath[0] : defaultCenter;

  // Hämta start- och slutkoordinater från väg-linjen
  const startCoords = routePath.length > 0 ? routePath[0] : null;
  const endCoords = routePath.length > 0 ? routePath[routePath.length - 1] : null;

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ height: 350, borderRadius: 16, overflow: 'hidden', border: '1px solid #ddd', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap & CARTO'
          />
          
          <MapUpdater center={center} />

          {/* Vägen */}
          {routePath.length > 1 && <Polyline positions={routePath} color="#646cff" weight={5} opacity={0.8} />}

          {/* START-MARKÖR (Grön) */}
          {startCoords && (
            <Marker position={startCoords} icon={createNumberedIcon('S')}> {/* 'S' för Start */}
               <Popup><strong>Start:</strong> {startAddress}</Popup>
            </Marker>
          )}

          {/* STOPP-MARKÖRER (Siffror) */}
          {stops.map((s) => (
            s.latitude && s.longitude && (
              <Marker
                key={s.id}
                position={[s.latitude, s.longitude]}
                icon={createNumberedIcon(s.order + 1)}
              >
                <Popup>
                  <strong>#{s.order + 1}</strong><br/>
                  {s.address}
                </Popup>
              </Marker>
            )
          ))}

          {/* SLUT-MARKÖR (Röd/Mål) */}
          {endCoords && (
            <Marker position={endCoords} icon={createNumberedIcon('M')}> {/* 'M' för Mål */}
               <Popup><strong>Mål:</strong> {endAddress}</Popup>
            </Marker>
          )}

        </MapContainer>
      </div>
    </div>
  );
}