import { FormEvent, useEffect, useState } from "react"; // <--- Importera useEffect
import {
  optimizeRoute,
  saveRoute,
  type RouteOptimizationResponse,
  type SavedRoute, // <--- Import
} from "../api/routeClient";
import RouteMap from "./RouteMap";
import AutoAddressInput from "./AutoAddressInput";

// ... (buildGoogleMapsUrl funktionen är kvar) ...
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

const MAX_STOPS = 10;

// NYTT: Ta emot props
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

  // --- NYTT: Lyssna på routeToLoad och fyll i formuläret ---
  useEffect(() => {
    if (routeToLoad) {
        // 1. Fyll i Start och Slut
        setStartAddress(routeToLoad.startAddress || "");
        setEndAddress(routeToLoad.endAddress || "");
        
        // 2. Fyll i namnet (och lägg till " - kopia" kanske?)
        setRouteName(routeToLoad.name + " (Redigerad)");

        // 3. Konvertera sparade stops till formulär-format
        // Vi sorterar på orderIndex så de hamnar i rätt ordning
        const formStops = [...routeToLoad.stops]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(s => ({
                id: String(Date.now() + Math.random()), // Skapa nytt unikt ID för React
                address: s.address
            }));
        
        setStops(formStops);
        
        // Nollställ gamla resultat
        setResult(null);
        setSuccessMsg(null);
        setState("idle");
    }
  }, [routeToLoad]);
  // -------------------------------------------------------

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
        endAddress: endAddress
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
    <section style={{ marginTop: "2rem" }}>
      <h2>Planera rutt</h2>
      <p>Fyll i adresser, optimera och spara.</p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "0.75rem",
          maxWidth: "500px",
          marginTop: "1rem",
          textAlign: "left",
          marginInline: "auto",
        }}
      >
        <AutoAddressInput
          label="Start address"
          value={startAddress}
          onChange={setStartAddress}
        />

        <AutoAddressInput
          label="End address"
          value={endAddress}
          onChange={setEndAddress}
        />

        <div style={{ marginTop: "0.5rem" }}>
          <strong>Stops</strong>
          
          {stops.map((stop, index) => (
            <div 
              key={stop.id} 
              style={{ 
                marginTop: "0.5rem", 
                display: "flex", 
                alignItems: "flex-end", 
                gap: "0.5rem" 
              }}
            >
              <div style={{ flex: 1 }}>
                <AutoAddressInput
                  label={`Stop ${index + 1}`}
                  value={stop.address}
                  onChange={(v) => handleStopChange(stop.id, v)}
                />
              </div>
              
              <button
                type="button"
                onClick={() => removeStop(stop.id)}
                title="Ta bort stopp"
                style={{
                  background: "#aa2222",
                  color: "white",
                  border: "none",
                  height: "38px",
                  padding: "0 12px",
                  marginBottom: "2px"
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {stops.length < MAX_STOPS && (
            <button
              type="button"
              onClick={addStop}
              style={{ marginTop: "0.5rem" }}
            >
              + Add stop
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!hasEnoughData || state === "loading" || state === "saving"}
          style={{ marginTop: "1rem" }}
        >
          {state === "loading" ? "Optimerar…" : "1. Optimera Rutt"}
        </button>
      </form>

      {state === "error" && error && (
        <p style={{ color: "red", marginTop: "0.5rem" }}>Fel: {error}</p>
      )}

      {successMsg && (
        <p style={{ color: "lightgreen", marginTop: "0.5rem", fontWeight: "bold" }}>
          {successMsg}
        </p>
      )}

      {result && (
        <div style={{ marginTop: "2rem", borderTop: "1px solid #444", paddingTop: "1rem" }}>
          <h3>Resultat</h3>
          <p>Total stops: {result.totalStops}</p>

          <div
            style={{
              background: "#333",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              display: "flex",
              gap: "1rem",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em" }}>
                Namn på rutten (t.ex. "Måndagsrundan")
              </label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Ange namn..."
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!routeName.trim() || state === "saving"}
              style={{ background: "green", color: "white", border: "none" }}
            >
              {state === "saving" ? "Sparar..." : "2. Spara Rutt 💾"}
            </button>
          </div>

          <div style={{ textAlign: "left", marginBottom: "1rem" }}>
            <ul style={{ paddingLeft: "1.5rem" }}>
              {result.orderedStops.map((stop) => (
                <li key={stop.id} style={{ marginBottom: "0.5rem" }}>
                  <strong>#{stop.order}</strong> – {stop.address}{" "}
                  <a
                    href={buildGoogleMapsUrl(stop)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.85rem", marginLeft: "0.5rem", color: "#646cff" }}
                  >
                    (Karta ↗)
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <RouteMap
            startAddress={startAddress}
            endAddress={endAddress}
            stops={result.orderedStops}
          />
        </div>
      )}
    </section>
  );
}