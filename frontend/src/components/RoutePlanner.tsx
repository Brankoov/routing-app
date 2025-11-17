// frontend/src/components/RoutePlanner.tsx

import { FormEvent, useState } from 'react';
import {
  optimizeRoute,
  type RouteOptimizationResponse,
} from '../api/routeClient';
import RouteMap from './RouteMap';

type LoadState = 'idle' | 'loading' | 'ok' | 'error';

type StopInput = {
  id: string;
  label: string;
  address: string;
};

const MAX_STOPS = 10;

export function RoutePlanner() {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [stops, setStops] = useState<StopInput[]>([
    { id: '1', label: 'Stop 1', address: '' },
    { id: '2', label: 'Stop 2', address: '' },
  ]);
  const [result, setResult] = useState<RouteOptimizationResponse | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  const hasEnoughData =
    startAddress.trim().length > 0 &&
    endAddress.trim().length > 0 &&
    stops.some((s) => s.address.trim().length > 0);

  const handleStopChange = (id: string, value: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, address: value } : s)),
    );
  };

  const addStop = () => {
    setStops((prev) => {
      if (prev.length >= MAX_STOPS) return prev;
      const nextIndex = prev.length + 1;
      return [
        ...prev,
        { id: String(nextIndex), label: `Stop ${nextIndex}`, address: '' },
      ];
    });
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!hasEnoughData) {
      setError('Fyll i start, slut och minst ett stopp.');
      setState('error');
      return;
    }

    setState('loading');
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
      setState('ok');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Okänt fel');
      setState('error');
    }
  }

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2>Route planner (mock backend)</h2>
      <p>Testa att skicka en riktig request till POST /api/routes/optimize.</p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gap: '0.75rem',
          maxWidth: '400px',
          marginTop: '1rem',
          textAlign: 'left',
          marginInline: 'auto',
        }}
      >
        <label>
          Start address
          <input
            type="text"
            value={startAddress}
            onChange={(e) => setStartAddress(e.target.value)}
            placeholder="Första gatan 1"
            style={{ width: '100%' }}
          />
        </label>

        <label>
          End address
          <input
            type="text"
            value={endAddress}
            onChange={(e) => setEndAddress(e.target.value)}
            placeholder="Sista gatan 2"
            style={{ width: '100%' }}
          />
        </label>

        <div style={{ marginTop: '0.5rem' }}>
          <strong>Stops</strong>
          {stops.map((stop) => (
            <label key={stop.id} style={{ display: 'block', marginTop: '0.5rem' }}>
              {stop.label}
              <input
                type="text"
                value={stop.address}
                onChange={(e) => handleStopChange(stop.id, e.target.value)}
                placeholder="Adress"
                style={{ width: '100%' }}
              />
            </label>
          ))}

          {stops.length < MAX_STOPS && (
            <button
              type="button"
              onClick={addStop}
              style={{ marginTop: '0.5rem' }}
            >
              + Add stop
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!hasEnoughData || state === 'loading'}
          style={{ marginTop: '1rem' }}
        >
          {state === 'loading' ? 'Optimerar…' : 'Optimize route'}
        </button>
      </form>

      {state === 'error' && error && (
        <p style={{ color: 'red', marginTop: '0.5rem' }}>
          Något gick fel: {error}
        </p>
      )}

      {result && state === 'ok' && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Result</h3>
          <p>Total stops: {result.totalStops}</p>
          <ul>
            {result.orderedStops.map((stop) => (
              <li key={stop.id}>
                #{stop.order} – {stop.address}
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
