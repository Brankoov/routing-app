import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// --- HJÄLPFUNKTIONER ---

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

function getGoogleMapsLink(lat: number, lng: number) {
    return `http://googleusercontent.com/maps.google.com/maps?daddr=${lat},${lng}&dirflg=d`;
}

// --- KOMPONENTER ---

function MapResizer({ isFullscreen }: { isFullscreen: boolean }) {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
    }, [isFullscreen, map]);
    return null;
}

function MapUpdater({ center, trigger }: { center: [number, number], trigger?: string }) {
    const map = useMap();
    const prevTrigger = useRef(trigger);

    useEffect(() => {
        if (trigger !== prevTrigger.current) {
            map.setView(center, map.getZoom());
            prevTrigger.current = trigger;
        }
    }, [trigger, center, map]);
    return null;
}

type MapStop = {
    id: string | number;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    order?: number; 
    orderIndex?: number;
};

type Props = {
    startAddress: string;
    endAddress: string;
    stops: MapStop[];
    geometry?: string;
    completedStops?: Set<number>;
    onStopComplete?: (id: string | number) => void; 
    isFullscreen?: boolean;
    toggleFullscreen?: () => void;
    isDarkMode?: boolean;
};

export default function RouteMap({ 
    startAddress, 
    endAddress, 
    stops, 
    geometry, 
    completedStops,
    onStopComplete,
    isFullscreen = false,
    toggleFullscreen,
    isDarkMode = false
}: Props) {
    
    const [showPolyline, setShowPolyline] = useState(true);

    const routePath: [number, number][] = geometry 
        ? decodePolyline(geometry)
        : stops
            .filter(s => s.latitude && s.longitude)
            .map(s => [s.latitude!, s.longitude!]);

    const defaultCenter: [number, number] = [59.334591, 18.06324];
    const center: [number, number] = routePath.length > 0 ? routePath[0] : defaultCenter;

    const startCoords = routePath.length > 0 ? routePath[0] : null;
    const endCoords = routePath.length > 0 ? routePath[routePath.length - 1] : null;

    const tilesUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    return (
        <div style={{ marginTop: isFullscreen ? 0 : '1rem' }}>
            <style>
                {`
                    .dark-mode-tiles {
                        filter: invert(90%) hue-rotate(180deg) brightness(150%) contrast(130%) grayscale(20%) !important;
                        -webkit-filter: invert(90%) hue-rotate(180deg) brightness(150%) contrast(130%) grayscale(20%) !important;
                    }
                `}
            </style>

            <div style={{ 
                height: isFullscreen ? '100vh' : 350, 
                // FIX: Ändrat från 100vw till 100% för att undvika scroll i sidled
                width: '100%', 
                maxWidth: '100%',
                position: isFullscreen ? 'fixed' : 'relative',
                top: isFullscreen ? 0 : 'auto',
                left: isFullscreen ? 0 : 'auto',
                zIndex: isFullscreen ? 9999 : 1,
                borderRadius: isFullscreen ? 0 : 16, 
                overflow: 'hidden', 
                border: isFullscreen ? 'none' : '1px solid #ddd', 
                boxShadow: isFullscreen ? 'none' : '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'height 0.3s ease',
                background: isDarkMode ? '#222' : '#eee'
            }}>
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                    
                    <MapResizer isFullscreen={isFullscreen} />
                    <MapUpdater center={center} trigger={geometry} />

                    <TileLayer
                        key={isDarkMode ? 'dark' : 'light'}
                        url={tilesUrl}
                        attribution='© OpenStreetMap & CARTO'
                        className={isDarkMode ? 'dark-mode-tiles' : ''} 
                    />

                    <div className="leaflet-top leaflet-right" style={{ marginTop: '130px', marginRight: '10px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        
                        <div className="leaflet-control leaflet-bar" style={{border: 'none'}}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPolyline(!showPolyline);
                                }}
                                style={{
                                    backgroundColor: isDarkMode ? '#333' : 'white',
                                    color: isDarkMode ? 'white' : 'black',
                                    border: 'none',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem',
                                    borderRadius: '4px'
                                }}
                                title={showPolyline ? "Dölj ruttlinje" : "Visa ruttlinje"}
                            >
                                {showPolyline ? '🛣️' : '🙈'}
                            </button>
                        </div>

                        {toggleFullscreen && (
                            <div className="leaflet-control leaflet-bar" style={{border: 'none'}}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFullscreen();
                                    }}
                                    style={{
                                        backgroundColor: isDarkMode ? '#333' : 'white',
                                        color: isDarkMode ? 'white' : 'black',
                                        border: 'none',
                                        width: '40px',
                                        height: '40px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        borderRadius: '4px'
                                    }}
                                    title={isFullscreen ? "Avsluta helskärm" : "Helskärm"}
                                >
                                    {isFullscreen ? '🔽' : '⛶'}
                                </button>
                            </div>
                        )}
                    </div>

                    {showPolyline && routePath.length > 1 && (
                        <>
                            <Polyline 
                                key={`outline-${geometry}`} 
                                positions={routePath} 
                                pathOptions={{ 
                                    color: isDarkMode ? '#000' : 'white', 
                                    weight: 5, 
                                    opacity: 0.8,
                                    lineJoin: 'round',
                                    lineCap: 'round'
                                }}
                            />
                            <Polyline 
                                key={`road-${geometry}`}
                                positions={routePath} 
                                pathOptions={{ 
                                    color: isDarkMode ? '#64b5f6' : '#2979ff', 
                                    weight: 3, 
                                    opacity: 1,
                                    lineJoin: 'round',
                                    lineCap: 'round'
                                }}
                            />
                            <RouteArrows positions={routePath} />
                        </>
                    )}

                    {startCoords && (
                        <Marker position={startCoords} icon={createNumberedIcon('S')}>
                            <Popup><strong>Start:</strong> {startAddress}</Popup>
                        </Marker>
                    )}

                    {stops.map((s) => {
                        const sIdNum = Number(s.id);
                        const isDone = completedStops ? completedStops.has(sIdNum) : false;
                        const orderNum = (s.order ?? s.orderIndex ?? 0) + 1;

                        return s.latitude && s.longitude && (
                            <Marker
                                key={s.id}
                                position={[s.latitude, s.longitude]}
                                icon={createNumberedIcon(orderNum, isDone)}
                                zIndexOffset={isDone ? -100 : 100}
                            >
                                <Popup>
                                    <div style={{textAlign: 'center', minWidth: '160px'}}>
                                        <strong style={{fontSize: '1.1rem'}}>#{orderNum}</strong> {isDone ? "(Klar)" : ""}<br/>
                                        <p style={{margin: '5px 0 10px 0'}}>{s.address}</p>
                                        
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                            <a 
                                                href={getGoogleMapsLink(s.latitude, s.longitude)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    background: '#4285F4',
                                                    color: 'white',
                                                    textDecoration: 'none',
                                                    padding: '8px 12px',
                                                    borderRadius: '4px',
                                                    fontWeight: 'bold',
                                                    display: 'block',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                🗺️ Navigera hit
                                            </a>

                                            {onStopComplete && (
                                                <button
                                                    onClick={() => onStopComplete(s.id)}
                                                    style={{
                                                        background: isDone ? '#e0e0e0' : '#4caf50',
                                                        color: isDone ? '#333' : 'white',
                                                        border: isDone ? '1px solid #ccc' : 'none',
                                                        padding: '8px 12px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {isDone ? '↩️ Ångra' : '✅ Markera klar'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {endCoords && (
                        <Marker position={endCoords} icon={createNumberedIcon('M')}>
                            <Popup><strong>Mål:</strong> {endAddress}</Popup>
                        </Marker>
                    )}

                    <UserLocation />

                </MapContainer>
            </div>
        </div>
    );
}