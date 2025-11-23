import { useEffect, useState } from 'react';
import './App.css';
import { RoutePlanner } from './components/RoutePlanner';
import { SavedRoutesList } from './components/SavedRoutesList';
import { RegisterForm } from './components/RegisterForm';
import { LoginForm } from './components/LoginForm';
import { CurrentUser } from './components/CurrentUser';
import { type SavedRoute } from './api/routeClient';

// Enkla ikoner (vi kan byta till SVG sen)
const ICON_TRUCK = "🚛";
const ICON_PIN = "📍";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<SavedRoute | null>(null);
  
  // NYTT: Håller koll på vilken flik vi är på
  const [activeTab, setActiveTab] = useState<'plan' | 'history'>('plan');

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    setIsLoggedIn(!!token);
  }, []);

  // Om man klickar "Redigera" i historiken, byt flik till planering
  const handleEditRoute = (route: SavedRoute) => {
    setRouteToEdit(route);
    setActiveTab('plan');
  };

  return (
    <div className="app-container">
      
      {/* Header-område (kan stylas snyggare sen) */}
      {isLoggedIn && <div style={{padding: '10px'}}><CurrentUser /></div>}

      {/* --- LOGIN FLOW --- */}
      {!isLoggedIn ? (
        <div style={{ padding: '2rem', paddingTop: '4rem' }}>
          <h1 style={{marginBottom: '2rem'}}>Välkommen</h1>
          <div style={{ display: "flex", flexDirection: 'column', gap: "2rem" }}>
            <LoginForm />
            <div style={{textAlign: 'center', opacity: 0.5}}>- eller -</div>
            <RegisterForm />
          </div>
        </div>
      ) : (
        /* --- HUVUD-APPEN --- */
        <div style={{ padding: '1rem', paddingBottom: '80px' }}>
          
          {/* VY 1: PLANERA (Lastbilen) */}
          {activeTab === 'plan' && (
            <div>
              <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Planera rutt</h2>
              {/* RoutePlanner sköter "Address 1...", "Välj bil" osv */}
              <RoutePlanner routeToLoad={routeToEdit} />
            </div>
          )}

          {/* VY 2: HISTORIK (Kartnålen) */}
          {activeTab === 'history' && (
            <div>
              <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Historik</h2>
              <SavedRoutesList onEdit={handleEditRoute} />
            </div>
          )}

          {/* --- BOTTOM NAVIGATION BAR --- */}
          <nav className="bottom-nav">
            <button 
              className={`nav-item ${activeTab === 'plan' ? 'active' : ''}`}
              onClick={() => setActiveTab('plan')}
            >
              {ICON_TRUCK}
            </button>
            
            <button 
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              {ICON_PIN}
            </button>
          </nav>

        </div>
      )}
    </div>
  );
}

export default App;