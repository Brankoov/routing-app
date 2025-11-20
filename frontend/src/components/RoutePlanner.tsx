// frontend/src/components/RoutePlanner.tsx

import { FormEvent, useState } from "react";
import {
  optimizeRoute,
  type RouteOptimizationResponse,
} from "../api/routeClient";
import RouteMap from "./RouteMap";
import AutoAddressInput from "./AutoAddressInput";

function buildGoogleMapsUrl(stop: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`;
  }
  const q = encodeURIComponent(stop.address);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

type LoadState = "idle" | "loading" | "ok" | "error";

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
  const [result, setResult] = useState<RouteOptimizationResponse | null>(null);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!hasEnoughData) {
      setError("Fyll i start, slut och minst ett stopp.");
      setState("error");
      return;
    }

    setState("loading");
    setError(null);

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

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2>Route planner (mock backend)</h2>
      <p>Testa att skicka en riktig request till POST /api/routes/optimize.</p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "0.75rem",
          maxWidth: "400px",
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
          disabled={!hasEnoughData || state === "loading"}
          style={{ marginTop: "1rem" }}
        >
          {state === "loading" ? "Optimerar…" : "Optimize route"}
        </button>
      </form>

      {state === "error" && error && (
        <p style={{ color: "red", marginTop: "0.5rem" }}>
          Något gick fel: {error}
        </p>
      )}

      {result && state === "ok" && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Result</h3>
          <p>Total stops: {result.totalStops}</p>

          <ul>
            {result.orderedStops.map((stop) => (
              <li key={stop.id} style={{ marginBottom: "0.25rem" }}>
                #{stop.order} – {stop.address}{" "}
                <a
                  href={buildGoogleMapsUrl(stop)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.85rem" }}
                >
                  (Open in Google Maps)
                </a>
              </li>
            ))}
          </ul>

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
