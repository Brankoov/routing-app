import { useState, useEffect, useRef } from 'react';
import { Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';

export function UserLocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [heading, setHeading] = useState<number | null>(null);
  
  const [tracking, setTracking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false); // <--- NYTT: Håller koll på om vi ska följa efter

  const map = useMap();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // --- NYTT: Lyssna på om användaren drar i kartan ---
  useMapEvents({
    dragstart: () => {
      // Om användaren börjar dra i kartan, sluta följa automatiskt
      if (isFollowing) {
        setIsFollowing(false);
        console.log("Användaren drog i kartan -> Slutar följa");
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
        transform: rotate(${angle}deg) scaleX(-1);
        transition: transform 0.3s ease;
      ">🚚</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15] 
    });
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.error('Kunde inte aktivera Wake Lock:', err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!tracking) {
      // 1. Starta GPS
      setTracking(true);
      setIsFollowing(true); // Börja följa direkt
      requestWakeLock();
      
      map.locate({ 
        setView: false, // Vi sköter centreringen själva nu
        maxZoom: 16,
        watch: true,   
        enableHighAccuracy: false // Ändra till true på mobil!
      });
    } 
    else {
      // GPS är igång...
      if (!isFollowing) {
        // 2. Om vi tappat fokus -> Återcentrera (Följ igen)
        setIsFollowing(true);
        if (position) {
            map.flyTo(position, map.getZoom()); // Flyg tillbaka till bilen utan att ändra zoom för mycket
        }
      } else {
        // 3. Om vi redan följer -> Stäng av allt (Spara batteri)
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
      
      if (e.heading !== null && !isNaN(e.heading)) {
        setHeading(e.heading);
      }

      // --- MAGIN: Följ bara om isFollowing är sant ---
      if (isFollowing) {
        // panTo är mjukare än flyTo för små justeringar
        map.panTo(e.latlng, { animate: true, duration: 0.5 });
      }
    };

    const handleLocationError = (e: L.ErrorEvent) => {
      console.warn("GPS Fel:", e.message);
    };

    map.on('locationfound', handleLocationFound);
    map.on('locationerror', handleLocationError);

    return () => {
      map.stopLocate();
      map.off('locationfound', handleLocationFound);
      map.off('locationerror', handleLocationError);
      releaseWakeLock();
    };
  }, [map, tracking, isFollowing]); // Notera att isFollowing är med här

  // Bestäm färg och ikon på knappen baserat på läge
  let btnColor = 'white';
  let btnIcon = '📍';
  let btnTitle = "Hitta min plats";

  if (tracking) {
      if (isFollowing) {
          btnColor = '#4caf50'; // GRÖN = Följer aktivt
          btnIcon = '🚚';       // Ikon som visar att vi följer bilen
          btnTitle = "Följer din plats (Tryck för att stänga av)";
      } else {
          btnColor = '#ff9800'; // ORANGE = GPS igång, men följer ej (du tittar runt)
          btnIcon = '🎯';       // Ikon för att "Sikta" tillbaka
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
            <Popup>
                <strong>Här är du!</strong><br/>
                Noggrannhet: {Math.round(accuracy)} m
            </Popup>
            </Marker>
            
            <Circle 
                center={position} 
                radius={accuracy} 
                pathOptions={{ color: '#2196f3', fillColor: '#2196f3', fillOpacity: 0.1, weight: 1, stroke: false }}
            />
        </>
      )}
    </>
  );
}