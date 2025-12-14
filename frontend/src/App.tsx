import { useEffect, useState } from 'react';
import './App.css';
import { RoutePlanner } from './components/RoutePlanner';
import { SavedRoutesList } from './components/SavedRoutesList';
import { AuthPage } from './components/AuthPage';
import { CurrentUser } from './components/CurrentUser';
import { DriveView } from './components/DriveView';
import AdminPanel from './components/AdminPanel';
import { type SavedRoute } from './api/routeClient';

const ICON_TRUCK = "🚛";
const ICON_PIN = "📍";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<SavedRoute | null>(null);
  
  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'drive' | 'admin'>('plan');
  
  // DARK MODE STATE
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? '#121212' : '#e8eaed';
  }, [isDarkMode]);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    setIsLoggedIn(!!token);
    
    if (localStorage.getItem("active_route")) {
        setActiveTab('drive');
    }
  }, []);

  // --- HELPER FÖR ATT KOLLA ADMIN-ROLL ---
  const isAdmin = () => {
    const token = localStorage.getItem("jwt_token");
    if (!token) return false;
    try {
      // Avkoda tokenet (delen mellan punkterna)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Debug: Se vad som faktiskt finns i tokenet i webbläsarens konsol
      // console.log("Token Payload:", payload); 

      // Kollar om rollen är ADMIN
      return payload.role === 'ADMIN' || payload.roles?.includes('ADMIN') || payload.scope?.includes('ROLE_ADMIN');
    } catch (e) {
      return false;
    }
  };

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

  // APP STYLES
  const appStyles = {
      backgroundColor: isDarkMode ? '#121212' : '#ffffff',
      color: isDarkMode ? '#ffffff' : '#000000',
      minHeight: '100vh',
      transition: 'background-color 0.3s, color 0.3s',
      overflowX: 'hidden' as const
  };

  const navStyles = {
      backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
      borderTop: isDarkMode ? '1px solid #333' : '1px solid #ddd',
      color: isDarkMode ? '#fff' : '#000'
  };

  return (
    <div className="app-container" style={appStyles}>
      
      {isLoggedIn && (
        <CurrentUser 
            isDarkMode={isDarkMode} 
            toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
        />
      )}

      {!isLoggedIn ? (
        <AuthPage />
      ) : (
        <div style={{ padding: activeTab === 'drive' ? '0' : '1rem', paddingBottom: '80px' }}>
          
          {activeTab === 'plan' && (
            <div>
              <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Planera rutt</h2>
              <RoutePlanner 
                routeToLoad={routeToEdit} 
                onStartDrive={handleStartDrive} 
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Historik</h2>
              <SavedRoutesList 
                onEdit={handleEditRoute} 
                onStartDrive={handleStartDrive}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {activeTab === 'drive' && (
             <DriveView 
                onEdit={handleEditRoute} 
                isAppDarkMode={isDarkMode} 
             />
          )}

          {/* --- ADMIN PANEL VY --- */}
            {activeTab === 'admin' && isAdmin() && (
              <div>
               <AdminPanel onEditRoute={handleEditRoute} isDarkMode={isDarkMode} />
              </div>
            )}

          <nav className="bottom-nav" style={navStyles}>
            <button 
                className={`nav-item ${activeTab === 'plan' ? 'active' : ''}`} 
                onClick={() => setActiveTab('plan')}
                style={{ color: activeTab === 'plan' ? '#646cff' : (isDarkMode ? '#aaa' : '#666') }}
            >
              {ICON_TRUCK} <span style={{fontSize:'0.6em', display:'block'}}>Planera</span>
            </button>
            
            <button 
                className={`nav-item ${activeTab === 'drive' ? 'active' : ''}`} 
                onClick={() => setActiveTab('drive')}
                style={{ color: activeTab === 'drive' ? '#646cff' : (isDarkMode ? '#aaa' : '#666') }}
            >
              🏎️ <span style={{fontSize:'0.6em', display:'block'}}>Kör</span>
            </button>
            
            <button 
                className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} 
                onClick={() => setActiveTab('history')}
                style={{ color: activeTab === 'history' ? '#646cff' : (isDarkMode ? '#aaa' : '#666') }}
            >
              {ICON_PIN} <span style={{fontSize:'0.6em', display:'block'}}>Historik</span>
            </button>

            {/* --- ADMIN KNAPP --- */}
            {isAdmin() && (
              <button 
                  className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('admin')}
                  style={{ color: activeTab === 'admin' ? '#646cff' : (isDarkMode ? '#aaa' : '#666') }}
              >
                🛡️ <span style={{fontSize:'0.6em', display:'block'}}>Admin</span>
              </button>
            )}
          </nav>

        </div>
      )}
    </div>
  );
}

export default App;