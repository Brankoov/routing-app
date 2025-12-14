import { FormEvent, useEffect, useState } from "react";
import {
  optimizeRoute,
  saveRoute,
  type RouteOptimizationResponse,
  type SavedRoute,
  formatDuration,
  type SaveRouteRequest,
} from "../api/routeClient";
import RouteMap from "./RouteMap";
import AutoAddressInput from "./AutoAddressInput";
import { DEMO_ROUTES } from "../data/demoRoute";
import { BulkImportModal } from "./BulkImportModal";

function buildGoogleMapsUrl(stop: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  const baseUrl = "https://www.google.com/maps/search/?api=1&query=";

  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    return `${baseUrl}${stop.latitude},${stop.longitude}`;
  }
  const q = encodeURIComponent(stop.address);
  return `${baseUrl}${q}`;
}

type LoadState = "idle" | "loading" | "ok" | "error" | "saving";

type StopInput = {
  id: string;
  address: string;
};

const MAX_STOPS = 48; 

type Props = {
  routeToLoad: SavedRoute | null;
  onStartDrive: (route: SavedRoute) => void;
  isDarkMode: boolean; // VIKTIGT: Tar emot temat
};

export function RoutePlanner({ routeToLoad, onStartDrive, isDarkMode }: Props) {
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [stops, setStops] = useState<StopInput[]>([
    { id: String(Date.now()), address: "" },
  ]);

  const [result, setResult] = useState<RouteOptimizationResponse | null>(null);
  const [routeName, setRouteName] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stopTime, setStopTime] = useState(5);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // --- Hanterar laddning av rutt för Redigering/Admin ---
  useEffect(() => {
    if (routeToLoad) {
        setStartAddress(routeToLoad.startAddress || "");
        setEndAddress(routeToLoad.endAddress || "");
        
        // Sätt ruttens namn. Om det är en redigering från Admin/Historik,
        // behåll namnet (ingen "Kopia" om du redigerar originalet).
        setRouteName(routeToLoad.name || ""); 

        const formStops = (routeToLoad.stops || [])
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(s => ({
                id: String(Date.now() + Math.random()),
                address: s.address
            }));
        
        setStops(formStops.length > 0 ? formStops : [{ id: String(Date.now()), address: "" }]);

        if (routeToLoad.stops && routeToLoad.stops.length > 0) {
            const reconstructedResult: RouteOptimizationResponse = {
                orderedStops: routeToLoad.stops.map(s => ({
                    id: String(s.id),
                    label: `Stop ${s.orderIndex + 1}`,
                    address: s.address,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    order: s.orderIndex
                })).sort((a, b) => a.order - b.order),
                totalStops: routeToLoad.stops.length,
                geometry: routeToLoad.geometry || "",
                totalDuration: routeToLoad.totalDuration || 0
            };
            setResult(reconstructedResult);
        }
        
        setSuccessMsg(null);
        setState("idle");
    }
  }, [routeToLoad]);

  const loadDemoRoute = (addresses: string[], nameDescription: string) => {
    if (!addresses || addresses.length < 2) return;
    setStartAddress(addresses[0]);
    setEndAddress(addresses[addresses.length - 1]);
    const middlePoints = addresses.slice(1, -1);
    const newStops = middlePoints.map((addr) => ({
      id: crypto.randomUUID(), 
      address: addr
    }));
    setStops(newStops);
    setResult(null);
    setRouteName(nameDescription);
    setSuccessMsg(null);
  };
  
  const handleBulkImport = (addresses: string[]) => {
    const newStops = addresses.map(addr => ({
      id: String(Date.now() + Math.random()),
      address: addr
    }));
    setStops(prev => {
        if (prev.length === 1 && prev[0].address === "") {
            return newStops;
        }
        return [...prev, ...newStops];
    });
  };

  const hasEnoughData =
    startAddress.trim().length > 0 &&
    endAddress.trim().length > 0 &&
    stops.some((s) => s.address.trim().length > 0);

  const handleStopChange = (id: string, value: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, address: value } : s))
    );
  };

  const addStop = () => {
    setStops((prev) => {
      if (prev.length >= MAX_STOPS) return prev;
      return [...prev, { id: String(Date.now()), address: "" }];
    });
  };

  const removeStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hasEnoughData) {
      setError("Fyll i start, slut och minst ett stopp.");
      setState("error");
      return;
    }
    setState("loading");
    setError(null);
    setSuccessMsg(null);
    setResult(null);

    try {
      const stopAddresses = stops.map((s) => s.address.trim()).filter((s) => s.length > 0);
      const response = await optimizeRoute({
        startAddress: startAddress.trim(),
        endAddress: endAddress.trim(),
        stops: stopAddresses,
      });
      setResult(response);
      setState("ok");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Okänt fel");
      setState("error");
    }
  }

  async function handleSave() {
    if (!result || !routeName.trim()) return;
    
    // Bestäm ID: Om vi laddade en rutt (via Admin eller Historik), använd dess ID.
    const routeIdToSave = routeToLoad ? routeToLoad.id : undefined;

    try {
      setState("saving");
      await saveRoute({
        id: routeIdToSave, // SKICKA MED ID TILL BACKEND FÖR UPPDATERING
        name: routeName,
        stops: result.orderedStops,
        description: "Created via Frontend",
        startAddress: startAddress,
        endAddress: endAddress,
        geometry: result.geometry,
        totalDuration: result.totalDuration,
        averageStopDuration: stopTime,
      });
      setSuccessMsg("Rutt sparad! ✅");
      setState("ok");
      
      // Efter spara: behåll namnet och tillståndet om det var en redigering
      if (!routeToLoad) {
          setRouteName("");
      }
    } catch (err) {
      console.error(err);
      setError("Kunde inte spara rutten.");
      setState("error");
    }
  }

  // --- STYLING ---
  const cardStyle = {
      backgroundColor: isDarkMode ? '#1e1e1e' : 'white', 
      color: isDarkMode ? 'white' : 'black',
      border: isDarkMode ? '1px solid #333' : 'none',
      boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
      padding: '20px',
      borderRadius: '16px',
      marginBottom: '20px',
      transition: 'background-color 0.3s'
  };

  return (
    <section>
      {/* CSS-trick: Injektion för Dark Mode Inputs */}
      {isDarkMode && (
        <style>{`
           input[type="text"], input[type="number"], .address-input {
             background-color: #2c2c2c !important;
             color: white !important;
             border: 1px solid #444 !important;
           }
           input::placeholder {
             color: #888 !important;
           }
           .suggestions-list {
             background-color: #2c2c2c !important;
             color: white !important;
             border: 1px solid #444 !important;
           }
           .suggestion-item:hover {
             background-color: #444 !important;
           }
        `}</style>
      )}

      {showBulkImport && (
        <BulkImportModal 
            onImport={handleBulkImport} 
            onClose={() => setShowBulkImport(false)} 
        />
      )}

      {/* Kortet för inmatning */}
      <div className="card" style={cardStyle}>
        
        {state === "loading" && (
          <div className="loading-overlay" style={{background: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}}>
            <div className="spinner"></div>
            <p style={{fontWeight: '600', color: isDarkMode ? 'white' : '#333'}}>Beräknar rutt...</p>
          </div>
        )}

        {/* Rubrik för redigeringsläge */}
        {routeToLoad && (
            <div style={{marginBottom: '1rem', paddingBottom: '1rem', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #ddd'}}>
                <h3 style={{marginTop: 0, color: isDarkMode ? '#81c784' : '#4caf50'}}>
                    ✏️ Redigerar {routeToLoad.name}
                </h3>
                {/* Nu fungerar ownerUsername! */}
                <p style={{fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666'}}>Ägare: {routeToLoad.ownerUsername || "Okänd"}</p>
            </div>
        )}

        {/* Demo-knappar sektionen */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', background: isDarkMode ? '#252525' : '#f5f5f5', padding: '10px', borderRadius: '8px' }}>
            <span style={{fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666', fontWeight: 'bold'}}>🧪 Ladda Demo:</span>
            <button type="button" onClick={() => loadDemoRoute(DEMO_ROUTES.del1, "City Rundan")} style={{background: '#e0f7fa', color: '#006064', border: '1px solid #0097a7', padding: '6px 12px', fontSize: '0.8rem'}}>Del 1</button>
            <button type="button" onClick={() => loadDemoRoute(DEMO_ROUTES.del2, "Vasastan Rundan")} style={{background: '#e0f7fa', color: '#006064', border: '1px solid #0097a7', padding: '6px 12px', fontSize: '0.8rem'}}>Del 2</button>
            <button type="button" onClick={() => loadDemoRoute(DEMO_ROUTES.del3, "Birkastan Rundan")} style={{background: '#e0f7fa', color: '#006064', border: '1px solid #0097a7', padding: '6px 12px', fontSize: '0.8rem'}}>Del 3</button>
            <button type="button" onClick={() => setShowBulkImport(true)} style={{background: '#333', color: 'white', border: '1px solid #333', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto'}}>📋 Klistra in lista</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.2rem", textAlign: "left" }}>
          <AutoAddressInput label="Startadress" value={startAddress} onChange={setStartAddress} />

          {/* MELLANSTOP SEKTION MED FIELDSET FÖR TYDLIGHET */}
          <fieldset style={{border: isDarkMode ? '1px solid #333' : '1px solid #ccc', padding: '15px', borderRadius: '8px', marginTop: '0.5rem'}}>
            <legend style={{fontSize: '1rem', fontWeight: 'bold', padding: '0 8px', color: isDarkMode ? '#aaa' : '#666'}}>Mellanstop ({stops.length})</legend>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
              {stops.map((stop, index) => (
                <div key={stop.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{fontWeight: 'bold', color: isDarkMode ? '#aaa' : '#888', width: '20px', textAlign: 'center'}}>{index + 1}</span>
                  <div style={{ flex: 1 }}>
                    <AutoAddressInput label="" value={stop.address} onChange={(v) => handleStopChange(stop.id, v)} />
                  </div>
                  <button type="button" onClick={() => removeStop(stop.id)} style={{background: isDarkMode ? "#3e2727" : "#ffebee", color: "#c62828", borderRadius: "50%", width: "40px", height: "40px", padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: 'none'}}>×</button>
                </div>
              ))}
            </div>
            {stops.length < MAX_STOPS && (
              <button type="button" onClick={addStop} style={{ marginTop: "1rem", background: 'transparent', border: isDarkMode ? '2px dashed #444' : '2px dashed #ccc', color: isDarkMode ? '#aaa' : '#666', width: '100%' }}>+ Lägg till stopp</button>
            )}
          </fieldset>

          <AutoAddressInput label="Slutadress" value={endAddress} onChange={setEndAddress} />

          <button type="submit" className="primary-btn" disabled={!hasEnoughData || state === "loading" || state === "saving"} style={{ marginTop: "0.5rem", padding: '16px', background: state === "loading" ? '#999' : '#646cff', boxShadow: state === "loading" ? 'none' : '0 4px 8px rgba(100, 108, 255, 0.4)' }}>
            {state === "loading" ? "Beräknar rutt..." : "Optimera Rutt 🚀"}
          </button>
        </form>

        {state === "error" && error && <p style={{ color: "red", marginTop: "1rem", textAlign: 'center' }}>⚠️ {error}</p>}
      </div>

      {/* RESULTATKORTET (Uppdaterad stil) */}
      {result && (
        <div className="card" style={{...cardStyle, marginTop: '1rem', border: '2px solid #4caf50'}}>
          
          <h3 className="text-xl font-bold mb-4" style={{ color: isDarkMode ? '#81c784' : '#4caf50', borderBottom: isDarkMode ? '2px solid #333' : '2px solid #eee', paddingBottom: '10px' }}>
              ✅ Optimeringsresultat
          </h3>
          <p style={{color: isDarkMode ? '#aaa' : '#666'}}>Totalt antal stopp: {result.totalStops}</p>

          <div style={{background: isDarkMode ? '#2c3e50' : '#e3f2fd', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: isDarkMode ? '1px solid #34495e' : '1px solid #bbdefb'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <span style={{color: isDarkMode ? '#ddd' : '#333'}}>🚗 Ren körtid:</span>
                <strong>{result.totalDuration ? formatDuration(result.totalDuration) : "-"}</strong>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem'}}>
                <span style={{color: isDarkMode ? '#ddd' : '#333'}}>📦 Tid per stopp:</span>
                <input type="number" value={stopTime} onChange={e => setStopTime(Number(e.target.value))} style={{width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', background: isDarkMode ? '#222' : 'white', color: isDarkMode ? 'white' : 'black'}} />
                <span style={{color: isDarkMode ? '#ddd' : '#333'}}>min</span>
            </div>
            <div style={{borderTop: '1px solid #ccc', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', color: isDarkMode ? '#64b5f6' : '#0d47a1'}}>
                <span>⏱️ Total arbetstid:</span>
                <span>{result.totalDuration ? formatDuration(result.totalDuration + (result.totalStops * stopTime * 60)) : "-"}</span>
            </div>
          </div>

          <button
            onClick={() => {
                const tempRoute: any = {
                    id: 0, 
                    name: "Nuvarande körning",
                    stops: result.orderedStops.map(s => ({...s, orderIndex: s.order})),
                    geometry: result.geometry,
                    startAddress: startAddress,
                    endAddress: endAddress
                };
                onStartDrive(tempRoute);
            }}
            style={{width: '100%', padding: '16px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '1rem', marginBottom: '1.5rem', boxShadow: '0 4px 8px rgba(33, 150, 243, 0.3)'}}
          >
            🏎️ Starta Körning Nu
          </button>

          <div style={{background: isDarkMode ? "#252525" : "#f9f9f9", padding: "1rem", borderRadius: "12px", marginBottom: "1.5rem", border: isDarkMode ? '1px solid #333' : '1px solid #eee'}}>
            <label>Spara som:</label>
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                <input type="text" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="T.ex. Måndagsrundan..." style={{ flex: 1, background: isDarkMode ? '#333' : 'white', color: isDarkMode ? 'white' : 'black', border: '1px solid #555' }} />
                <button onClick={handleSave} disabled={!routeName.trim() || state === "saving"} style={{ background: "green", color: "white", whiteSpace: 'nowrap' }}>{state === "saving" ? "..." : "Spara"}</button>
            </div>
            {successMsg && <p style={{ color: "green", marginTop: "0.5rem", textAlign: 'center', fontWeight: 'bold' }}>{successMsg}</p>}
          </div>

          <div style={{ textAlign: "left", marginBottom: "1rem" }}>
            <h4 style={{borderBottom: isDarkMode ? '1px solid #333' : '1px solid #eee', paddingBottom: '5px', marginBottom: '10px', fontSize: '1.1rem', fontWeight: 'bold', color: isDarkMode ? '#ddd' : '#333'}}>Optimerad ordning:</h4>
            <ul style={{ paddingLeft: "0", listStyle: 'none' }}>
              {result.orderedStops.map((stop) => (
                <li key={stop.id} style={{ marginBottom: "0.5rem", padding: '10px', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDarkMode ? '#222' : 'white', borderRadius: '4px' }}>
                  <div><strong style={{marginRight: '8px', color: '#646cff'}}>#{stop.order + 1}</strong> {stop.address}</div>
                  <a href={buildGoogleMapsUrl(stop)} target="_blank" rel="noopener noreferrer" style={{ fontSize: "1.2rem", textDecoration: 'none' }}>🗺️</a>
                </li>
              ))}
            </ul>
          </div>

          <RouteMap
            startAddress={startAddress}
            endAddress={endAddress}
            stops={result.orderedStops}
            geometry={result.geometry}
            isFullscreen={isMapFullscreen}
            toggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
            onStopComplete={(id) => {
                setResult(prev => prev ? {
                    ...prev,
                    orderedStops: prev.orderedStops.filter(s => s.id !== id),
                    totalStops: prev.totalStops - 1
                } : null);
            }}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
    </section>
  );
}