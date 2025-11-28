import { useEffect, useState } from 'react';
import './App.css';
import { HealthStatus } from './components/HealthStatus';
import { RoutePlanner } from './components/RoutePlanner';
import { SavedRoutesList } from './components/SavedRoutesList';
import { RegisterForm } from './components/RegisterForm';
import { LoginForm } from './components/LoginForm';
import { CurrentUser } from './components/CurrentUser';
import { DriveView } from './components/DriveView';
import { type SavedRoute } from './api/routeClient';

const ICON_TRUCK = "🚛";
const ICON_PIN = "📍";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<SavedRoute | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'drive'>('plan');
  
  // NYTT: State för att visa registrerings-popupen
  const [showRegisterModal, setShowRegisterModal] = useState(false);

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
      
      {isLoggedIn && <div style={{padding: '10px'}}><CurrentUser /></div>}

      {/* --- LOGIN FLOW (NY LOGIK) --- */}
      {!isLoggedIn ? (
        <div style={{ padding: '2rem', paddingTop: '4rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{marginBottom: '2rem', fontSize: '2.5rem'}}>Routing App 🚛</h1>
          
          {/* Visa bara inloggning först */}
          <LoginForm onOpenRegister={() => setShowRegisterModal(true)} />

          {/* --- REGISTRERINGS-MODAL --- */}
          {showRegisterModal && (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', // Mörkare bakgrund
                backdropFilter: 'blur(5px)',    // Snygg blur
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3000
            }}>
                <RegisterForm onClose={() => setShowRegisterModal(false)} />
            </div>
          )}
          {/* --------------------------- */}

        </div>
      ) : (
        /* --- HUVUD-APPEN (Samma som förut) --- */
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