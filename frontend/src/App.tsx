import { useEffect, useState } from 'react';
import './App.css';
import { HealthStatus } from './components/HealthStatus';
import { RoutePlanner } from './components/RoutePlanner';
import { SavedRoutesList } from './components/SavedRoutesList';
import { RegisterForm } from './components/RegisterForm';
import { LoginForm } from './components/LoginForm';
import { CurrentUser } from './components/CurrentUser';
import { type SavedRoute } from './api/routeClient'; // <--- Import

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // NYTT: State för att hålla rutten vi vill redigera
  const [routeToEdit, setRouteToEdit] = useState<SavedRoute | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      
      {isLoggedIn && <CurrentUser />}

      <h1>Routing app – dev UI</h1>
      
      {!isLoggedIn ? (
        <section style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "3rem" }}>
          <RegisterForm />
          <LoginForm />
        </section>
      ) : (
        <>
          <p>Välkommen till ruttplaneraren!</p>
          <hr style={{ margin: '2rem 0' }} />
          
          {/* NYTT: Skicka med routeToEdit till planeraren */}
          <RoutePlanner routeToLoad={routeToEdit} />
          
          {/* NYTT: Skicka med setRouteToEdit till listan */}
          <SavedRoutesList onEdit={(route) => {
            setRouteToEdit(route);
            // Scrolla upp till toppen smidigt
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} />
        </>
      )}

      <div style={{marginTop: '4rem', opacity: 0.5, fontSize: '0.8rem'}}>
         <HealthStatus />
      </div>
      
    </div>
  );
}

export default App;