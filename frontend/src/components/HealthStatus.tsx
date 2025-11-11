import { useEffect, useState } from 'react';
import { fetchHealth, type HealthResponse } from '../api/healthClient';

type LoadState = 'idle' | 'loading' | 'ok' | 'error';

export function HealthStatus() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setState('loading');
      setError(null);

      try {
        const result = await fetchHealth();
        setData(result);
        setState('ok');
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setState('error');
      }
    }

    load();
  }, []);

  if (state === 'loading' || state === 'idle') {
    return <p>Checking backend health…</p>;
  }

  if (state === 'error') {
    return <p style={{ color: 'red' }}>Backend health check failed: {error}</p>;
  }

  return (
    <div style={{ padding: '1rem', border: '1px solid #444', borderRadius: '8px' }}>
      <h2>Backend status</h2>
      <p>
        <strong>Status:</strong> {data?.status}
      </p>
      <p>
        <strong>Service:</strong> {data?.service}
      </p>
      <p>
        <strong>Timestamp:</strong> {data?.timestamp}
      </p>
    </div>
  );
}
