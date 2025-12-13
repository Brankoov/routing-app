import { useEffect, useState } from "react";
import { type SavedRoute } from "../api/routeClient";
import RouteMap from "./RouteMap";

function buildGoogleMapsUrl(stop: { latitude: number | null; longitude: number | null; address: string }) {
  const baseUrl = "http://googleusercontent.com/maps.google.com/maps?daddr=";
  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    return `${baseUrl}${stop.latitude},${stop.longitude}&dirflg=d`;
  }
  const q = encodeURIComponent(stop.address);
  return `${baseUrl}${q}&dirflg=d`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "Klar!";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
}

type Props = {
  onEdit: (route: SavedRoute) => void;
  isAppDarkMode: boolean; // Tar emot appens tema för listan
};

export function DriveView({ onEdit, isAppDarkMode }: Props) {
  const [route, setRoute] = useState<SavedRoute | null>(null);
  const [completedStops, setCompletedStops] = useState<Set<number>>(new Set());
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  
  // EGET STATE FÖR KARTAN (Oberoende av appens tema)
  const [mapDarkMode, setMapDarkMode] = useState(false);

  useEffect(() => {
    const storedRoute = localStorage.getItem("active_route");
    const storedProgress = localStorage.getItem("active_route_progress");

    if (storedRoute) {
      setRoute(JSON.parse(storedRoute));
    }
    if (storedProgress) {
      setCompletedStops(new Set(JSON.parse(storedProgress)));
    }
  }, []);

  const toggleStop = (id: number) => {
    setCompletedStops((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      localStorage.setItem("active_route_progress", JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const confirmFinish = () => {
    localStorage.removeItem("active_route");
    localStorage.removeItem("active_route_progress");
    setRoute(null);
    window.location.reload();
  };

  const handleEdit = () => {
    if (route) onEdit(route);
  };

  if (!route) {
    return (
      <div style={{ textAlign: "center", marginTop: "4rem", padding: "2rem" }}>
        <h3>Ingen aktiv rutt 😴</h3>
        <p style={{ color: "#666" }}>Gå till Planera eller Historik.</p>
      </div>
    );
  }

  const totalStops = route.stops.length;
  const stopsLeft = totalStops - completedStops.size;
  const baseDrivingSeconds = route.totalDuration || 0;
  const savedStopMinutes = route.averageStopDuration || 5; 
  const WORK_TIME_PER_STOP = savedStopMinutes * 60; 
  const drivingSecondsLeft = Math.round(baseDrivingSeconds * (stopsLeft / totalStops));
  const workSecondsLeft = stopsLeft * WORK_TIME_PER_STOP;
  const totalSecondsLeft = drivingSecondsLeft + workSecondsLeft;

  // Färger för LISTAN (baserat på Appens tema)
  const bgMain = isAppDarkMode ? "#121212" : "transparent"; 
  const bgList = isAppDarkMode ? "#1e1e1e" : "#f5f5f7";     
  const bgItem = isAppDarkMode ? "#2c2c2c" : "white";       
  const textMain = isAppDarkMode ? "#ffffff" : "#000000";   
  const textSub = isAppDarkMode ? "#aaaaaa" : "#888888";    

  return (
    <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        height: "calc(100vh - 80px)", 
        position: 'relative',
        background: bgMain 
    }}>
      
      {showFinishModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
        }}>
            <div className="card" style={{ width: '300px', textAlign: 'center', padding: '2rem', background: isAppDarkMode ? '#333' : 'white', color: isAppDarkMode ? 'white' : 'black' }}>
                <h3 style={{marginTop: 0}}>Avsluta körning?</h3>
                <p style={{color: isAppDarkMode ? '#aaa' : '#666', marginBottom: '1.5rem'}}>Dina framsteg nollställs och du återgår till startsidan.</p>
                <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                    <button onClick={() => setShowFinishModal(false)} style={{background: '#e0e0e0', color: '#333'}}>Avbryt</button>
                    <button onClick={confirmFinish} style={{background: '#c62828', color: 'white'}}>Avsluta</button>
                </div>
            </div>
        </div>
      )}

      <div style={{ flex: isMapFullscreen ? "1" : "0 0 40%", position: "relative", zIndex: 0 }}>
         <RouteMap 
            startAddress={route.startAddress || "Start"}
            endAddress={route.endAddress || "Slut"}
            stops={route.stops.map(s => ({
                ...s, id: s.id, order: s.orderIndex, label: `Stop ${s.orderIndex + 1}`
            }))}
            geometry={route.geometry} 
            completedStops={completedStops}
            isFullscreen={isMapFullscreen}
            toggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
            onStopComplete={(id) => toggleStop(Number(id))} 
            // KARTAN FÅR SITT EGET STATE HÄR
            isDarkMode={mapDarkMode} 
         />
      </div>

      {!isMapFullscreen && (
        <>
          {/* INFO BAR - Följer appens tema */}
          <div style={{ 
              background: isAppDarkMode ? "#252525" : "#1a1a1a", 
              color: "white", padding: "12px 16px", 
              display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)", gap: "10px",
              borderTop: "1px solid #333"
          }}>
            <div style={{textAlign: 'left'}}>
                 <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: 'white'}}>{stopsLeft} <span style={{fontSize: '0.8rem', fontWeight: 'normal', color: '#aaa'}}>stopp kvar</span></div>
                 <div style={{fontSize: '0.75rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px'}}>{route.name}</div>
            </div>

            <div style={{ textAlign: 'center', background: '#333', padding: '5px 15px', borderRadius: '16px', border: '1px solid #444' }}>
                 <div style={{fontSize: '0.6rem', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Kvar</div>
                 <div style={{fontWeight: '800', color: '#4caf50', fontSize: '1.4rem', lineHeight: '1.1'}}>{stopsLeft === 0 ? "✓" : formatDuration(totalSecondsLeft)}</div>
            </div>

            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                {/* KNAPP FÖR ATT BYTA ENDAST KART-TEMA */}
                <button 
                    onClick={() => setMapDarkMode(!mapDarkMode)}
                    style={{
                        background: mapDarkMode ? "#fb8c00" : "#333", 
                        color: "white", borderRadius: "50%", width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #555', fontSize: '1.2rem'
                    }} 
                    title={mapDarkMode ? "Ljus karta" : "Mörk karta"}
                >
                    {mapDarkMode ? "☀️" : "🌙"}
                </button>

                <button onClick={handleEdit} style={{background: "#333", color: "white", borderRadius: "50%", width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #555', fontSize: '1rem'}}>✏️</button>
                <button onClick={() => setShowFinishModal(true)} style={{background: "#d32f2f", color: "white", borderRadius: "50%", width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', fontSize: '1rem', fontWeight: 'bold'}}>✕</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", background: bgList, padding: "10px", transition: 'background 0.3s' }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {route.stops.map((stop) => {
                const isDone = completedStops.has(stop.id);
                return (
                  <li key={stop.id} style={{
                      background: isDone ? (isAppDarkMode ? "#222" : "#e0e0e0") : bgItem,
                      marginBottom: "8px", padding: "12px", borderRadius: "12px",
                      display: "flex", alignItems: "center", gap: "12px",
                      opacity: isDone ? 0.6 : 1,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      border: isDone ? (isAppDarkMode ? "1px solid #444" : "1px solid #ccc") : "1px solid transparent",
                      color: textMain,
                      transition: "all 0.2s"
                  }}>
                    <div onClick={() => toggleStop(stop.id)} style={{
                        minWidth: "32px", height: "32px", borderRadius: "50%",
                        border: isDone ? "none" : (isAppDarkMode ? "2px solid #555" : "2px solid #ccc"),
                        background: isDone ? (isAppDarkMode ? "#388e3c" : "#4caf50") : (isAppDarkMode ? "#333" : "white"),
                        color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.2rem", cursor: "pointer"
                    }}>
                      {isDone && "✓"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", textDecoration: isDone ? "line-through" : "none", fontSize: '0.95rem' }}>{stop.address}</div>
                      <small style={{ color: textSub }}>Stopp #{stop.orderIndex + 1}</small>
                    </div>
                    <a href={buildGoogleMapsUrl(stop)} target="_blank" rel="noreferrer" style={{ fontSize: "1.5rem", textDecoration: "none", filter: isDone ? "grayscale(1)" : "none" }}>🗺️</a>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}