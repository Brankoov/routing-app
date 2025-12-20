import { useState, useEffect, useRef } from 'react';
import { Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';

export function UserLocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [heading, setHeading] = useState<number | null>(null);
  
  const [tracking, setTracking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const map = useMap();
  // Använder 'any' för att undvika TS-fel om webbläsaren saknar WakeLock-typer
  const wakeLockRef = useRef<any>(null);

  // Lyssna på om användaren drar i kartan -> Sluta följa automatiskt
  useMapEvents({
    dragstart: () => {
      if (isFollowing) {
        setIsFollowing(false);
        // console.log("Användaren drog i kartan -> Slutar följa");
      }
    }
  });

  const createTruckIcon = (rotation: number | null) => {
    const angle = rotation ?? 0;
    return L.divIcon({
      className: 'truck-location-icon',
      html: `<div style="
        font-size: 30px; 
        line-height: 1; 
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: rotate(${angle}deg); /* Tog bort scaleX(-1) då lastbils-emoji oftast pekar rätt */
        transition: transform 0.5s ease; /* Mjukare rotation */
        display: flex;
        justify-content: center;
        align-items: center;
      ">🚚</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15] 
    });
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        // @ts-ignore
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Kunde inte aktivera Wake Lock (kanske ingen HTTPS?):', err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn('Fel vid release av Wake Lock', err);
      }
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!tracking) {
      // 1. Starta GPS
      setTracking(true);
      setIsFollowing(true);
      requestWakeLock();
      
      map.locate({ 
        setView: false,
        maxZoom: 18,     // Zoomar in lite närmare för "kör-känsla"
        watch: true,     // Viktigt: Lyssna kontinuerligt
        enableHighAccuracy: true, // VIKTIGT: Tvingar fram GPS-chipet
        maximumAge: 1000,         // VIKTIGT: Acceptera inte gamla positioner (>1s)
        timeout: 10000            // Vänta max 10s på fix
      });
    } 
    else {
      if (!isFollowing) {
        // 2. Återcentrera
        setIsFollowing(true);
        if (position) {
            map.flyTo(position, 17, { animate: true, duration: 1.0 });
        }
      } else {
        // 3. Stäng av
        setTracking(false);
        setIsFollowing(false);
        setPosition(null);
        setAccuracy(0);
        setHeading(null);
        map.stopLocate();
        releaseWakeLock();
      }
    }
  };

  useEffect(() => {
    if (!tracking) return;

    const handleLocationFound = (e: L.LocationEvent) => {
      setPosition([e.latlng.lat, e.latlng.lng]);
      setAccuracy(e.accuracy);
      
      // Leaflet ger heading (riktning) på mobila enheter
      if (e.heading !== null && !isNaN(e.heading)) {
        setHeading(e.heading);
      }

      // Följ mjukt om läget är aktivt
      if (isFollowing) {
        map.panTo(e.latlng, { animate: true, duration: 0.8 });
      }
    };

    const handleLocationError = (e: L.ErrorEvent) => {
      console.warn("GPS Fel:", e.message);
    };

    map.on('locationfound', handleLocationFound);
    map.on('locationerror', handleLocationError);

    return () => {
      map.off('locationfound', handleLocationFound);
      map.off('locationerror', handleLocationError);
    };
  }, [map, tracking, isFollowing]);

  // UI
  let btnColor = 'white';
  let btnIcon = '📍';
  let btnTitle = "Hitta min plats";

  if (tracking) {
      if (isFollowing) {
          btnColor = '#4caf50'; // GRÖN
          btnIcon = '🚚'; 
          btnTitle = "Följer din plats (Tryck för att stänga av)";
      } else {
          btnColor = '#ff9800'; // ORANGE
          btnIcon = '🎯'; 
          btnTitle = "Återcentrera till min plats";
      }
  }

  return (
    <>
      <div className="leaflet-top leaflet-right" style={{ marginTop: '80px', marginRight: '10px', pointerEvents: 'auto' }}>
        <div className="leaflet-control leaflet-bar">
          <button
            onClick={handleButtonClick}
            style={{
              backgroundColor: btnColor,
              color: tracking ? 'white' : 'black',
              border: 'none',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              borderRadius: '4px',
              boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
              transition: 'background-color 0.3s'
            }}
            title={btnTitle}
          >
            {btnIcon}
          </button>
        </div>
      </div>

      {position && (
        <>
            <Marker 
                position={position} 
                icon={createTruckIcon(heading)} 
                zIndexOffset={1000}
            >
            </Marker>
            
            {/* Visar bara cirkeln om noggrannheten är sämre än 20m, annars stör den */}
            {accuracy > 20 && (
                <Circle 
                    center={position} 
                    radius={accuracy} 
                    pathOptions={{ color: '#2196f3', fillColor: '#2196f3', fillOpacity: 0.1, weight: 1, stroke: false }}
                />
            )}
        </>
      )}
    </>
  );
}