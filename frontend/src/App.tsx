import './App.css';
import { HealthStatus } from './components/HealthStatus';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Routing app – dev UI</h1>
      <p>Simple health check to verify backend ↔ frontend integration.</p>

      <HealthStatus />
    </div>
  );
}

export default App;
