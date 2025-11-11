// frontend/src/components/RoutePlanner.tsx

import { FormEvent, useState } from 'react';
import {
  optimizeRoute,
  type RouteOptimizationResponse,
} from '../api/routeClient';

type LoadState = 'idle' | 'loading' | 'ok' | 'error';

export function RoutePlanner() {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [stopA, setStopA] = useState('');
  const [stopB, setStopB] = useState('');
  const [result, setResult] = useState<RouteOptimizationResponse | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  const hasEnoughData =
    startAddress.trim().length > 0 &&
    endAddress.trim().length > 0 &&
    (stopA.trim().length > 0 || stopB.trim().length > 0);

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
      const stops = [stopA.trim(), stopB.trim()].filter(
        (s) => s.length > 0,
      );

      const response = await optimizeRoute({
        startAddress: startAddress.trim(),
        endAddress: endAddress.trim(),
        stops,
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

        <label>
          Stop 1
          <input
            type="text"
            value={stopA}
            onChange={(e) => setStopA(e.target.value)}
            placeholder="Adress A"
            style={{ width: '100%' }}
          />
        </label>

        <label>
          Stop 2
          <input
            type="text"
            value={stopB}
            onChange={(e) => setStopB(e.target.value)}
            placeholder="Adress B (optional)"
            style={{ width: '100%' }}
          />
        </label>

        <button
          type="submit"
          disabled={!hasEnoughData || state === 'loading'}
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
        </div>
      )}
    </section>
  );
}
