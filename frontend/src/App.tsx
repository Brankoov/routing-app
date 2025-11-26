import { useEffect, useState } from 'react';
import './App.css';
import { HealthStatus } from './components/HealthStatus';
import { RoutePlanner } from './components/RoutePlanner';
import { SavedRoutesList } from './components/SavedRoutesList';
import { RegisterForm } from './components/RegisterForm';
import { LoginForm } from './components/LoginForm';
import { CurrentUser } from './components/CurrentUser';
import { DriveView } from './components/DriveView'; // <--- NY IMPORT
import { type SavedRoute } from './api/routeClient';

const ICON_TRUCK = "🚛";
const ICON_PIN = "📍";
const ICON_WHEEL = "steering_wheel"; // Vi använder text eller emoji

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<SavedRoute | null>(null);
  
  // "drive" är den nya tabben
  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'drive'>('plan'); 

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    setIsLoggedIn(!!token);
    
    // Om vi har en aktiv rutt sparad, gå direkt till kör-läget!
    if (localStorage.getItem("active_route")) {
        setActiveTab('drive');
    }
  }, []);

  const handleEditRoute = (route: SavedRoute) => {
    setRouteToEdit(route);
    setActiveTab('plan');
  };

  // Funktion för att starta körning (anropas från Planner/History)
  const handleStartDrive = (route: SavedRoute) => {
      // Spara hela rutten i LS
      localStorage.setItem("active_route", JSON.stringify(route));
      // Nollställ gamla framsteg
      localStorage.removeItem("active_route_progress");
      
      setActiveTab('drive');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      
      {isLoggedIn && <div style={{padding: '10px'}}><CurrentUser /></div>}

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
        <div style={{ padding: activeTab === 'drive' ? '0' : '1rem', paddingBottom: '80px' }}>
          
          {/* VY 1: PLANERA */}
          {activeTab === 'plan' && (
            <div>
              <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Planera rutt</h2>
              <RoutePlanner 
                routeToLoad={routeToEdit} 
                onStartDrive={handleStartDrive} // <--- Skicka ner funktionen
              />
            </div>
          )}

          {/* VY 2: HISTORIK */}
          {activeTab === 'history' && (
            <div>
              <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Historik</h2>
              <SavedRoutesList 
                onEdit={handleEditRoute} 
                onStartDrive={handleStartDrive} // <--- Skicka ner funktionen
              />
            </div>
          )}

          {/* VY 3: KÖR-LÄGE (NY) */}
          {activeTab === 'drive' && (
             <DriveView onEdit={handleEditRoute} />
          )}

          {/* MENY */}
          <nav className="bottom-nav">
            <button className={`nav-item ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>
              {ICON_TRUCK} <span style={{fontSize:'0.6em', display:'block'}}>Planera</span>
            </button>
            
            <button className={`nav-item ${activeTab === 'drive' ? 'active' : ''}`} onClick={() => setActiveTab('drive')}>
              🏎️ <span style={{fontSize:'0.6em', display:'block'}}>Kör</span> // Trigger deploy
            </button>
            
            <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              {ICON_PIN} <span style={{fontSize:'0.6em', display:'block'}}>Historik</span>
            </button>
          </nav> 

        </div>
      )}
    </div>
  );
}

export default App;