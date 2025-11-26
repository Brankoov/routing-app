import { FormEvent, useEffect, useState } from "react";
import {
  optimizeRoute,
  saveRoute,
  type RouteOptimizationResponse,
  type SavedRoute,
} from "../api/routeClient";
import RouteMap from "./RouteMap";
import AutoAddressInput from "./AutoAddressInput";
import { DEMO_ROUTE } from "../data/demoRoute";
import { formatDuration } from "../api/routeClient";

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
  onStartDrive: (route: SavedRoute) => void; // <--- NY PROP
};

export function RoutePlanner({ routeToLoad, onStartDrive }: Props) { // <--- Ta emot den här
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

  useEffect(() => {
    if (routeToLoad) {
        setStartAddress(routeToLoad.startAddress || "");
        setEndAddress(routeToLoad.endAddress || "");
        setRouteName(routeToLoad.name + " (Kopia)");

        // 1. Fyll i formuläret (Övre kortet)
        const formStops = [...routeToLoad.stops]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(s => ({
                id: String(Date.now() + Math.random()), // Nya IDn för att inte krocka
                address: s.address
            }));
        
        setStops(formStops);

        // 2. Fyll i resultatet direkt! (Nedre kortet) <--- NYTT HÄR
        // Vi återskapar ett "resultat-objekt" från den sparade datan
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
            geometry: routeToLoad.geometry,
            totalDuration: routeToLoad.totalDuration
        };

        setResult(reconstructedResult); // Visa resultatet direkt!
        // setResult(null); <--- DENNA TOG VI BORT

        setSuccessMsg(null);
        setState("idle");
    }
  }, [routeToLoad]);

  const loadDemoData = () => {
    setStartAddress(DEMO_ROUTE.start);
    setEndAddress(DEMO_ROUTE.end);

    const demoStops = DEMO_ROUTE.stops.map((address, index) => ({
      id: String(Date.now() + index), 
      address: address
    }));

    setStops(demoStops);
    setResult(null);
    setRouteName("Stor Måndagsrunda (Demo)");
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
      const stopAddresses = stops
        .map((s) => s.address.trim())
        .filter((s) => s.length > 0);

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

    try {
      setState("saving");
      await saveRoute({
        name: routeName,
        stops: result.orderedStops,
        description: "Created via Frontend",
        startAddress: startAddress,
        endAddress: endAddress,
        geometry: result.geometry,
        totalDuration: result.totalDuration,
        averageStopDuration: stopTime
      });

      setSuccessMsg("Rutt sparad! ✅");
      setState("ok");
      setRouteName("");
    } catch (err) {
      console.error(err);
      setError("Kunde inte spara rutten.");
      setState("error");
    }
  }

  return (
    <section>
      <div className="card">
        
        {state === "loading" && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p style={{fontWeight: '600', color: '#333'}}>Beräknar rutt...</p>
            <small style={{color: '#666'}}>Hämtar trafikdata & optimerar</small>
          </div>
        )}

        <div style={{marginBottom: '1.5rem', textAlign: 'center'}}>
            <button 
                type="button" 
                onClick={loadDemoData}
                style={{
                    background: '#e0f7fa', 
                    color: '#006064', 
                    border: '1px dashed #0097a7',
                    width: '100%',
                    padding: '10px',
                    fontSize: '0.9rem'
                }}
            >
                🧪 Ladda 30-stopp Demo
            </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "1.2rem",
            textAlign: "left",
          }}
        >
          <AutoAddressInput
            label="Startadress"
            value={startAddress}
            onChange={setStartAddress}
          />

          <div style={{ marginTop: "0.5rem" }}>
            <label>Mellanstop</label>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
              {stops.map((stop, index) => (
                <div 
                  key={stop.id} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.5rem" 
                  }}
                >
                  <span style={{
                      fontWeight: 'bold', 
                      color: '#888', 
                      width: '20px', 
                      textAlign: 'center'
                  }}>
                      {index + 1}
                  </span>

                  <div style={{ flex: 1 }}>
                    <AutoAddressInput
                      label="" 
                      value={stop.address}
                      onChange={(v) => handleStopChange(stop.id, v)}
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeStop(stop.id)}
                    title="Ta bort stopp"
                    style={{
                      background: "#ffebee",
                      color: "#c62828",
                      borderRadius: "50%",
                      width: "40px",
                      height: "40px",
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {stops.length < MAX_STOPS && (
              <button
                type="button"
                onClick={addStop}
                style={{ 
                    marginTop: "1rem", 
                    background: 'transparent', 
                    border: '2px dashed #ccc', 
                    color: '#666',
                    width: '100%'
                }}
              >
                + Lägg till stopp
              </button>
            )}
          </div>

          <AutoAddressInput
            label="Slutadress"
            value={endAddress}
            onChange={setEndAddress}
          />

          <button
            type="submit"
            className="primary-btn"
            disabled={!hasEnoughData || state === "loading" || state === "saving"}
            style={{ marginTop: "0.5rem", padding: '16px' }}
          >
            {state === "loading" ? "Beräknar rutt..." : "Optimera Rutt 🚀"}
          </button>
        </form>

        {state === "error" && error && (
          <p style={{ color: "red", marginTop: "1rem", textAlign: 'center' }}>⚠️ {error}</p>
        )}
      </div>

      {result && (
        <div className="card" style={{marginTop: '1rem', border: '2px solid #4caf50'}}>
          <h3 style={{marginTop: 0}}>✅ Optimerat!</h3>
          <p style={{color: '#666'}}>Totalt antal stopp: {result.totalStops}</p>

          {/* --- TID-KALKYLATOR --- */}
          <div style={{background: '#e3f2fd', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #bbdefb'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <span style={{color: '#333'}}>🚗 Ren körtid:</span>
                <strong>{result.totalDuration ? formatDuration(result.totalDuration) : "-"}</strong>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem'}}>
                <span style={{color: '#333'}}>📦 Tid per stopp:</span>
                <input 
                    type="number" 
                    value={stopTime} 
                    onChange={e => setStopTime(Number(e.target.value))}
                    style={{width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold'}}
                />
                <span style={{color: '#333'}}>min</span>
            </div>

            <div style={{borderTop: '1px solid #ccc', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', color: '#0d47a1'}}>
                <span>⏱️ Total arbetstid:</span>
                <span>
                    {result.totalDuration 
                        ? formatDuration(result.totalDuration + (result.totalStops * stopTime * 60)) 
                        : "-"}
                </span>
            </div>
          </div>

          {/* --- NY KNAPP: STARTA KÖRNING --- */}
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
            style={{
                width: '100%', 
                padding: '16px', 
                background: '#2196f3', // Blå
                color: 'white', 
                border: 'none', 
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                marginTop: '1rem',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 8px rgba(33, 150, 243, 0.3)'
            }}
          >
            🏎️ Starta Körning Nu
          </button>
          {/* -------------------------------- */}

          {/* SPARA-SEKTIONEN */}
          <div
            style={{
              background: "#f9f9f9",
              padding: "1rem",
              borderRadius: "12px",
              marginBottom: "1.5rem",
              border: '1px solid #eee'
            }}
          >
            <label>Spara som:</label>
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                <input
                    type="text"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="T.ex. Måndagsrundan..."
                    style={{ flex: 1 }}
                />
                <button
                onClick={handleSave}
                disabled={!routeName.trim() || state === "saving"}
                style={{ background: "green", color: "white", whiteSpace: 'nowrap' }}
                >
                {state === "saving" ? "..." : "Spara"}
                </button>
            </div>

            {successMsg && (
                <p style={{ color: "green", marginTop: "0.5rem", textAlign: 'center', fontWeight: 'bold' }}>
                    {successMsg}
                </p>
            )}
          </div>

          <div style={{ textAlign: "left", marginBottom: "1rem" }}>
            <ul style={{ paddingLeft: "0", listStyle: 'none' }}>
              {result.orderedStops.map((stop) => (
                <li key={stop.id} style={{ 
                    marginBottom: "0.5rem", 
                    padding: '10px', 
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                  <div>
                      <strong style={{marginRight: '8px', color: '#646cff'}}>#{stop.order + 1}</strong> 
                      {stop.address}
                  </div>
                  <a
                    href={buildGoogleMapsUrl(stop)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "1.2rem", textDecoration: 'none' }}
                  >
                    🗺️
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <RouteMap
            startAddress={startAddress}
            endAddress={endAddress}
            stops={result.orderedStops}
            geometry={result.geometry}
          />
        </div>
      )}
    </section>
  );
}