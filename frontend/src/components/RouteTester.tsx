import { useState } from 'react';
import {
  optimizeRoute,
  type RouteOptimizationRequest,
  type RouteOptimizationResponse,
} from '../api/routeClient';

type LoadState = 'idle' | 'loading' | 'ok' | 'error';

export function RouteTester() {
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RouteOptimizationResponse | null>(null);

  async function handleClick() {
    setState('loading');
    setError(null);
    setData(null);

    const payload: RouteOptimizationRequest = {
      startAddress: 'Startgatan 1',
      endAddress: 'Slutgatan 2',
      stops: [
        {
          id: '2',
          label: 'Kund B',
          address: 'Adress B',
          latitude: null,
          longitude: null,
        },
        {
          id: '1',
          label: 'Kund A',
          address: 'Adress A',
          latitude: null,
          longitude: null,
        },
      ],
    };

    try {
      const result = await optimizeRoute(payload);
      setData(result);
      setState('ok');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  }

  return (
    <div
      style={{
        marginTop: '2rem',
        padding: '1rem',
        border: '1px solid #444',
        borderRadius: '8px',
      }}
    >
      <h2>Route optimization tester</h2>
      <p>Send a hard-coded test request to POST /api/routes/optimize.</p>

      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        style={{
          padding: '0.5rem 1rem',
          cursor: state === 'loading' ? 'wait' : 'pointer',
          marginBottom: '1rem',
        }}
      >
        {state === 'loading' ? 'Optimizing…' : 'Test route optimization'}
      </button>

      {state === 'error' && (
        <p style={{ color: 'red' }}>Request failed: {error}</p>
      )}

      {state === 'ok' && data && (
        <div>
          <p>
            <strong>Total stops:</strong> {data.totalStops}
          </p>
          <ol>
            {data.orderedStops.map((stop) => (
              <li key={stop.id}>
                #{stop.order} – {stop.label} ({stop.address})
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
