import { useEffect, useState } from "react";
import { getSavedRoutes, deleteRoute, type SavedRoute } from "../api/routeClient";

type Props = {
  onEdit: (route: SavedRoute) => void;
  onStartDrive: (route: SavedRoute) => void;
  isDarkMode: boolean; 
};

export function SavedRoutesList({ onEdit, onStartDrive, isDarkMode }: Props) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  async function fetchRoutes() {
    try {
      setLoading(true);
      // Nu finns denna funktion i routeClient.ts!
      const data = await getSavedRoutes();
      setRoutes(data);
    } catch (err) {
      console.error(err);
      setError("Kunde inte hämta sparade rutter.");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Är du säker på att du vill ta bort denna rutt?")) return;
    try {
      await deleteRoute(id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Kunde inte ta bort rutt");
    }
  };

  if (loading) return <p>Laddar...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (routes.length === 0) return <p>Inga sparade rutter än.</p>;

  // Stilar för korten
  const cardStyle = {
      backgroundColor: isDarkMode ? '#1e1e1e' : 'white',
      color: isDarkMode ? 'white' : 'black',
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1rem',
      boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)',
      border: isDarkMode ? '1px solid #333' : '1px solid transparent'
  };

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {routes.map((route) => (
        <li
          key={route.id}
          style={cardStyle}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{route.name}</h3>
            <span style={{ fontSize: "0.8rem", color: "#888" }}>
              {new Date(route.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          <div style={{fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '1rem'}}>
             <p style={{margin: '4px 0'}}>🏁 Start: {route.startAddress}</p>
             <p style={{margin: '4px 0'}}>🛑 Slut: {route.endAddress}</p>
             <p style={{margin: '4px 0'}}>📦 Stopp: {route.stops.length} st</p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button 
                onClick={() => onStartDrive(route)} 
                style={{
                    padding: '8px 16px', 
                    background: '#2196f3', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer'
                }}
            >
                Starta
            </button>
            <button 
                onClick={() => onEdit(route)}
                style={{
                    padding: '8px 16px', 
                    background: isDarkMode ? '#333' : '#e0e0e0', 
                    color: isDarkMode ? 'white' : 'black', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer'
                }}
            >
                Redigera
            </button>
            <button 
                onClick={() => handleDelete(route.id)}
                style={{
                    padding: '8px 16px', 
                    background: '#ffebee', 
                    color: '#c62828', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    marginLeft: 'auto'
                }}
            >
                Ta bort
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}