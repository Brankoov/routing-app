import './App.css';
import { CurrentUser } from './components/CurrentUser';
import { HealthStatus } from './components/HealthStatus';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { RoutePlanner } from './components/RoutePlanner';
import { SavedRoutesList } from './components/SavedRoutesList';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <CurrentUser />
      <h1>Routing app – dev UI</h1>

      <section style={{ marginBottom: "3rem" }}>
        <RegisterForm />
        <LoginForm />
      </section>
      <p>Simple health check to verify backend ↔ frontend integration.</p>

      <HealthStatus />

      <hr style={{ margin: '2rem 0' }} />

      <RoutePlanner />

      <SavedRoutesList />
    </div>
  );
}

export default App;
