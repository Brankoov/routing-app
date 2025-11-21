import { FormEvent, useState } from "react";
import {
  optimizeRoute,
  saveRoute,
  type RouteOptimizationResponse,
} from "../api/routeClient";
import RouteMap from "./RouteMap";
import AutoAddressInput from "./AutoAddressInput";

function buildGoogleMapsUrl(stop: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  // Om vi har koordinater, använd dem
  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`;
  }
  // Annars sök på texten
  const q = encodeURIComponent(stop.address);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

type LoadState = "idle" | "loading" | "ok" | "error" | "saving";

type StopInput = {
  id: string;
  label: string;
  address: string;
};

const MAX_STOPS = 10;

export function RoutePlanner() {
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [stops, setStops] = useState<StopInput[]>([
    { id: "1", label: "Stop 1", address: "" },
    { id: "2", label: "Stop 2", address: "" },
  ]);

  // Resultat från optimering
  const [result, setResult] = useState<RouteOptimizationResponse | null>(null);

  // State för att spara rutt
  const [routeName, setRouteName] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

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
      const nextIndex = prev.length + 1;
      return [
        ...prev,
        { id: String(nextIndex), label: `Stop ${nextIndex}`, address: "" },
      ];
    });
  };

  // 1. Optimera Rutt
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

  // 2. Spara Rutt
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
      setRouteName(""); // Rensa namnfältet
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
          {stops.map((stop) => (
            <div key={stop.id} style={{ marginTop: "0.5rem" }}>
              <AutoAddressInput
                label={stop.label}
                value={stop.address}
                onChange={(v) => handleStopChange(stop.id, v)}
              />
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
        <p style={{ color: "red", marginTop: "0.5rem" }}>
          Fel: {error}
        </p>
      )}

      {successMsg && (
        <p style={{ color: "lightgreen", marginTop: "0.5rem", fontWeight: "bold" }}>
          {successMsg}
        </p>
      )}

      {/* VISA RESULTAT OCH SPARA-KNAPP */}
      {result && (
        <div style={{ marginTop: "2rem", borderTop: "1px solid #444", paddingTop: "1rem" }}>
          <h3>Resultat</h3>
          <p>Total stops: {result.totalStops}</p>

          {/* --- NY DEL: SPARA --- */}
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
          {/* --------------------- */}

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