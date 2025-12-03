import { useEffect, useState } from 'react';
import './App.css';
import { RoutePlanner } from './components/RoutePlanner';
import { SavedRoutesList } from './components/SavedRoutesList';
import { AuthPage } from './components/AuthPage'; // <--- Vi använder BARA denna nu
import { CurrentUser } from './components/CurrentUser';
import { DriveView } from './components/DriveView';
import { type SavedRoute } from './api/routeClient';

const ICON_TRUCK = "🚛";
const ICON_PIN = "📍";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<SavedRoute | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'drive'>('plan');
  
  // Vi behöver inte längre "showRegisterModal" här, AuthPage sköter det!

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    setIsLoggedIn(!!token);
    
    if (localStorage.getItem("active_route")) {
        setActiveTab('drive');
    }
  }, []);

  const handleEditRoute = (route: SavedRoute) => {
    setRouteToEdit(route);
    setActiveTab('plan');
  };

  const handleStartDrive = (route: SavedRoute) => {
      localStorage.setItem("active_route", JSON.stringify(route));
      localStorage.removeItem("active_route_progress");
      setActiveTab('drive');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      
      {/* Om inloggad: Visa inloggad användare högst upp */}
      {isLoggedIn && <div style={{padding: '10px'}}><CurrentUser /></div>}

      {/* --- LOGIN FLOW --- */}
      {!isLoggedIn ? (
        
        // HÄR ÄR ENDA RADEN SOM BEHÖVS FÖR LOGIN/REGISTER NU:
        <AuthPage />

      ) : (
        /* --- HUVUD-APPEN (Visas när man är inloggad) --- */
        <div style={{ padding: activeTab === 'drive' ? '0' : '1rem', paddingBottom: '80px' }}>
          
          {activeTab === 'plan' && (
            <div>
              <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Planera rutt</h2>
              <RoutePlanner 
                routeToLoad={routeToEdit} 
                onStartDrive={handleStartDrive} 
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Historik</h2>
              <SavedRoutesList 
                onEdit={handleEditRoute} 
                onStartDrive={handleStartDrive} 
              />
            </div>
          )}

          {activeTab === 'drive' && (
             <DriveView onEdit={handleEditRoute} />
          )}

          <nav className="bottom-nav">
            <button className={`nav-item ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>
              {ICON_TRUCK} <span style={{fontSize:'0.6em', display:'block'}}>Planera</span>
            </button>
            
            <button className={`nav-item ${activeTab === 'drive' ? 'active' : ''}`} onClick={() => setActiveTab('drive')}>
              🏎️ <span style={{fontSize:'0.6em', display:'block'}}>Kör</span>
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