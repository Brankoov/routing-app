import { FormEvent, useEffect, useState } from "react";
import {
  optimizeRoute,
  saveRoute,
  type RouteOptimizationResponse,
  type SavedRoute,
} from "../api/routeClient";
import RouteMap from "./RouteMap";
import AutoAddressInput from "./AutoAddressInput";

function buildGoogleMapsUrl(stop: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    return `http://googleusercontent.com/maps.google.com/maps?q=${stop.latitude},${stop.longitude}`;
  }
  const q = encodeURIComponent(stop.address);
  return `http://googleusercontent.com/maps.google.com/maps?q=${q}`;
}

type LoadState = "idle" | "loading" | "ok" | "error" | "saving";

type StopInput = {
  id: string;
  address: string;
};

const MAX_STOPS = 48;

type Props = {
  routeToLoad: SavedRoute | null;
};

export function RoutePlanner({ routeToLoad }: Props) {
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

  useEffect(() => {
    if (routeToLoad) {
        setStartAddress(routeToLoad.startAddress || "");
        setEndAddress(routeToLoad.endAddress || "");
        setRouteName(routeToLoad.name + " (Kopia)");

        const formStops = [...routeToLoad.stops]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(s => ({
                id: String(Date.now() + Math.random()),
                address: s.address
            }));
        
        setStops(formStops);
        setResult(null);
        setSuccessMsg(null);
        setState("idle");
    }
  }, [routeToLoad]);

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
        geometry: result.geometry
      });

      setSuccessMsg("Rutt sparad i databasen! ✅");
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
      {/* WRAPPAR FORMULÄRET I ETT KORT (.card) FÖR SNYGGARE DESIGN */}
      <div className="card">
        {/* --- NYTT: SPINNER OVERLAY --- */}
        {state === "loading" && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p style={{fontWeight: '600', color: '#333'}}>Beräknar rutt...</p>
            <small style={{color: '#666'}}>Hämtar trafikdata & optimerar</small>
          </div>
        )}
        {/* ----------------------------- */}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "1.2rem", // Lite mer luft mellan fälten
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
                    alignItems: "center", // Centrera krysset vertikalt
                    gap: "0.5rem" 
                  }}
                >
                  {/* En siffra till vänster ser proffsigt ut */}
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
                      label="" // Vi gömmer labeln här för renare look
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

        {successMsg && (
          <p style={{ color: "green", marginTop: "1rem", textAlign: 'center', fontWeight: 'bold' }}>
            {successMsg}
          </p>
        )}
      </div>

      {/* RESULTAT-DELEN */}
      {result && (
        <div className="card" style={{marginTop: '1rem', border: '2px solid #4caf50'}}>
          <h3 style={{marginTop: 0}}>✅ Optimerat!</h3>
          <p style={{color: '#666'}}>Totalt antal stopp: {result.totalStops}</p>

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