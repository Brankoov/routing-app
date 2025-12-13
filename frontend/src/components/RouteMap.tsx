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

// ... (Behåll din befintliga kod för Ikoner och decodePolyline här) ...
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { RouteArrows } from './RouteArrows';
import { UserLocation } from './UserLocation';

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

// ... (Behåll createNumberedIcon här) ...
function createNumberedIcon(label: string | number, isCompleted: boolean = false) {
    let bgColor = '#333'; 
    let opacity = '1';

    if (isCompleted) {
        bgColor = '#ccc';
        opacity = '0.6';
    } 
    else if (label === 'S') {
        bgColor = '#2e7d32'; 
    } else if (label === 'M') {
        bgColor = '#c62828'; 
    }

    return L.divIcon({
        className: 'custom-marker-icon', 
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

function MapUpdater({ center, trigger }: { center: [number, number], trigger?: string }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [trigger]);
    return null;
}

type Props = {
    startAddress: string;
    endAddress: string;
    stops: OrderedStop[];
    geometry?: string;
    completedStops?: Set<number>;
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
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                    
                    {/* 1. RENARE KARTA (Stadia/Alidade Smooth eller Carto Light är bra) */}
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='© OpenStreetMap & CARTO'
                    />

                    <MapUpdater center={center} trigger={geometry} />

                    {routePath.length > 1 && (
                        <>
                            {/* 1. KONTUR (Tunnare vit kant för kontrast) */}
                            <Polyline 
                                key={`outline-${geometry}`} 
                                positions={routePath} 
                                pathOptions={{ 
                                    color: 'white',  // Vit kant separerar blått från kartan
                                    weight: 5,       // Sänkt från 10 till 5
                                    opacity: 0.8,
                                    lineJoin: 'round',
                                    lineCap: 'round'
                                }}
                            />
                            
                            {/* 2. VÄGEN (Smalare blå linje) */}
                            <Polyline 
                                key={`road-${geometry}`}
                                positions={routePath} 
                                pathOptions={{ 
                                    color: '#2979ff', 
                                    weight: 3,       // Sänkt från 6 till 3 (ser mer ut som Google Maps)
                                    opacity: 1,
                                    lineJoin: 'round',
                                    lineCap: 'round'
                                }}
                            />

                            {/* 3. PILAR */}
                            <RouteArrows positions={routePath} />
                        </>
                    )}

                    {startCoords && (
                        <Marker position={startCoords} icon={createNumberedIcon('S')}>
                            <Popup><strong>Start:</strong> {startAddress}</Popup>
                        </Marker>
                    )}

                    {stops.map((s) => {
                        const isDone = completedStops ? completedStops.has(Number(s.id)) : false;
                        return s.latitude && s.longitude && (
                            <Marker
                                key={s.id}
                                position={[s.latitude, s.longitude]}
                                icon={createNumberedIcon(s.order + 1, isDone)}
                                zIndexOffset={isDone ? -100 : 100}
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

                    {/* --- NYTT: LÄGG TILL SPÅRNING HÄR --- */}
                    <UserLocation />
                    {/* ------------------------------------ */}

                </MapContainer>
            </div>
        </div>
    );
}