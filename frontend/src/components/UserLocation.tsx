import { useState, useEffect, useRef } from 'react';
import { Marker, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';

export function UserLocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [heading, setHeading] = useState<number | null>(null);
  
  const [tracking, setTracking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const map = useMap();
  const wakeLockRef = useRef<any>(null);
  const watchId = useRef<number | null>(null); // Håller koll på GPS-processen

  // 1. Hantera Wake Lock (Håll skärmen tänd)
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        // @ts-ignore
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn('Wake Lock release error:', err);
      }
    }
  };

  // 2. Om användaren drar i kartan -> Sluta följa
  useMapEvents({
    dragstart: () => {
      if (isFollowing) {
        setIsFollowing(false);
      }
    }
  });

  // 3. Ikon
  const createTruckIcon = (rotation: number | null) => {
    const angle = rotation ?? 0;
    return L.divIcon({
      className: 'truck-location-icon',
      html: `<div style="
        font-size: 30px; 
        line-height: 1; 
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: rotate(${angle}deg);
        transition: transform 0.3s ease;
        display: flex;
        justify-content: center;
        align-items: center;
      ">🚚</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15] 
    });
  };

  // 4. Starta / Stoppa tracking
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!tracking) {
      // STARTA
      setTracking(true);
      setIsFollowing(true);
      requestWakeLock();
    } 
    else {
      if (!isFollowing) {
        // ÅTERCENTRERA
        setIsFollowing(true);
        if (position) {
            map.flyTo(position, 17, { animate: true, duration: 0.8 });
        }
      } else {
        // STÄNG AV
        setTracking(false);
        setIsFollowing(false);
        setPosition(null);
        
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        
        releaseWakeLock();
      }
    }
  };

  // 5. GPS-effekten (Rå Navigator API)
  useEffect(() => {
    if (!tracking) return;

    if (!navigator.geolocation) {
        alert("Din webbläsare stödjer inte Geolocation.");
        setTracking(false);
        return;
    }

    const success = (pos: GeolocationPosition) => {
        const { latitude, longitude, accuracy, heading } = pos.coords;
        const newPos: [number, number] = [latitude, longitude];

        setPosition(newPos);
        setAccuracy(accuracy);
        if (heading !== null && !isNaN(heading)) {
            setHeading(heading);
        }

        // Flytta kartan om vi följer
        if (isFollowing) {
            map.flyTo(newPos, 17, { animate: true, duration: 1 });
        }
    };

    const error = (err: GeolocationPositionError) => {
        console.error("GPS Error:", err);
        if (err.code === 1) {
            alert("Du måste tillåta platsåtkomst för att se din position.");
            setTracking(false);
        }
    };

    // Starta lyssning
    watchId.current = navigator.geolocation.watchPosition(success, error, {
        enableHighAccuracy: true, // Viktigt för körning
        timeout: 10000,
        maximumAge: 0
    });

    return () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
        }
    };
  }, [tracking, isFollowing, map]); // Körs bara när tracking slås på/av

  // 6. UI
  let btnColor = 'white';
  let btnIcon = '📍';
  
  if (tracking) {
      if (isFollowing) {
          btnColor = '#4caf50'; // GRÖN
          btnIcon = '🚚'; 
      } else {
          btnColor = '#ff9800'; // ORANGE
          btnIcon = '🎯'; 
      }
  }

  return (
    <>
      <div className="leaflet-top leaflet-right" style={{ marginTop: '80px', marginRight: '10px', pointerEvents: 'auto' }}>
        <div className="leaflet-control leaflet-bar" style={{ border: 'none' }}>
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
            title={tracking ? "Klicka för att centrera/stänga av" : "Hitta min plats"}
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
            />
            {accuracy > 30 && (
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