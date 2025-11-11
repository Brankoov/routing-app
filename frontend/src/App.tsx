import './App.css';
import { HealthStatus } from './components/HealthStatus';
import { RouteTester } from './components/RouteTester';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Routing app – dev UI</h1>
      <p>Simple health check to verify backend ↔ frontend integration.</p>

      <HealthStatus />
      <RouteTester />
    </div>
  );
}

export default App;
