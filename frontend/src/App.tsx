import './App.css';
import { HealthStatus } from './components/HealthStatus';
import { RoutePlanner } from './components/RoutePlanner';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Routing app – dev UI</h1>
      <p>Simple health check to verify backend ↔ frontend integration.</p>

      <HealthStatus />

      <hr style={{ margin: '2rem 0' }} />

      <RoutePlanner />
    </div>
  );
}

export default App;
