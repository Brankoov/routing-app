import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import type { OrderedStop } from '../api/routeClient';
import 'leaflet/dist/leaflet.css';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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

function MapUpdater({ center, trigger }: { center: [number, number], trigger?: string }) {
  const map = useMap();
  
  useEffect(() => {
    // Nu körs detta BARA om "trigger" (geometrin) ändras.
    // Inte varje gång komponenten ritas om.
    map.setView(center, map.getZoom());
  }, [trigger]); // <--- HÄR ÄR MAGIN
  
  return null;
}

// --- UPPDATERAD IKON-FUNKTION ---
function createNumberedIcon(label: string | number, isCompleted: boolean = false) {
  // Standardfärger
  let bgColor = '#333'; // Svart
  let opacity = '1';

  // Om klar -> Grå och lite genomskinlig
  if (isCompleted) {
    bgColor = '#ccc';
    opacity = '0.6';
  } 
  // Om inte klar, kolla om det är Start/Mål
  else if (label === 'S') {
    bgColor = '#2e7d32'; // Grön
  } else if (label === 'M') {
    bgColor = '#c62828'; // Röd
  }

  return L.divIcon({
    className: 'custom-marker-icon', 
    // Vi injicerar stilen direkt här
    html: `<span style="
      background-color: ${bgColor}; 
      opacity: ${opacity};
      width: 100%; 
      height: 100%; 
      border-radius: 50%; 
      border: 2px solid white; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      color: white;
      font-weight: bold;
      font-size: 14px;
    ">${label}</span>`,
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
  completedStops?: Set<number>; // <--- NY PROP: Lista på klara IDn
};

export default function RouteMap({ startAddress, endAddress, stops, geometry, completedStops }: Props) {
  const routePath: [number, number][] = geometry 
    ? decodePolyline(geometry)
    : stops
        .filter(s => s.latitude && s.longitude)
        .map(s => [s.latitude!, s.longitude!]);

  const defaultCenter: [number, number] = [59.334591, 18.06324];
  const center: [number, number] = routePath.length > 0 ? routePath[0] : defaultCenter;

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
          
          {/* Skicka med geometry som trigger */}
          <MapUpdater center={center} trigger={geometry} />

          {routePath.length > 1 && <Polyline positions={routePath} color="#646cff" weight={5} opacity={0.8} />}

          {startCoords && (
            <Marker position={startCoords} icon={createNumberedIcon('S')}>
               <Popup><strong>Start:</strong> {startAddress}</Popup>
            </Marker>
          )}

          {stops.map((s) => {
             // Kolla om stoppet är klart
             // Vi konverterar ID till Number för säkerhets skull eftersom Set<number> används
             const isDone = completedStops ? completedStops.has(Number(s.id)) : false;

             return s.latitude && s.longitude && (
              <Marker
                key={s.id}
                position={[s.latitude, s.longitude]}
                // Skicka med isDone till ikonen
                icon={createNumberedIcon(s.order + 1, isDone)}
                zIndexOffset={isDone ? -100 : 100} // Lägg klara stopp bakom aktiva
              >
                <Popup>
                  <strong>#{s.order + 1}</strong> {isDone ? "(Klar)" : ""}<br/>
                  {s.address}
                </Popup>
              </Marker>
            );
          })}

          {endCoords && (
            <Marker position={endCoords} icon={createNumberedIcon('M')}>
               <Popup><strong>Mål:</strong> {endAddress}</Popup>
            </Marker>
          )}

        </MapContainer>
      </div>
    </div>
  );
}