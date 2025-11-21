import { useEffect, useState } from "react";
import { fetchAllRoutes, deleteRoute, type SavedRoute } from "../api/routeClient";

export function SavedRoutesList() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hämta rutter när komponenten laddas
  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    try {
      setLoading(true);
      const data = await fetchAllRoutes();
      // Sortera så nyaste kommer överst (om man vill)
      setRoutes(data.reverse());
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Kunde inte hämta rutter.");
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Är du säker på att du vill ta bort rutten?")) return;
    
    try {
      await deleteRoute(id);
      // Ladda om listan direkt så den försvinner
      loadRoutes(); 
    } catch (err) {
      alert("Kunde inte ta bort rutten");
    }
  }

  if (loading) return <p>Laddar sparade rutter...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <section style={{ marginTop: "3rem", borderTop: "1px solid #555", paddingTop: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>🗂️ Mina Sparade Rutter</h2>
        <button onClick={loadRoutes} style={{ padding: "5px 10px", fontSize: "0.8em" }}>
          🔄 Uppdatera
        </button>
      </div>

      {routes.length === 0 ? (
        <p>Inga sparade rutter än.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
          {routes.map((route) => (
            <div
              key={route.id}
              style={{
                background: "#333",
                padding: "1rem",
                borderRadius: "8px",
                textAlign: "left",
                border: "1px solid #444",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: "0 0 0.5rem 0", color: "#646cff" }}>{route.name}</h3>
                {/* RADERA-KNAPP HÄR */}
                    <button 
                    onClick={() => handleDelete(route.id)}
                    style={{ background: "red", color: "white", border: "none", padding: "2px 8px", height: "fit-content" }}
                    >
                    🗑️
                    </button>
                <small style={{ color: "#aaa" }}>
                  {new Date(route.createdAt).toLocaleDateString()}
                </small>
              </div>
              
              {route.description && <p style={{ margin: 0, fontStyle: "italic" }}>{route.description}</p>}
              
              <p style={{ margin: "0.5rem 0" }}>
                <strong>Antal stopp:</strong> {route.stops.length}
              </p>

              {/* Vi visar bara de 3 första stoppen som preview */}
              <ul style={{ paddingLeft: "1.2rem", fontSize: "0.9em", color: "#ccc" }}>
                {route.stops.slice(0, 3).map((stop) => (
                  <li key={stop.id}>
                    {stop.address}
                  </li>
                ))}
                {route.stops.length > 3 && <li>... (+{route.stops.length - 3} till)</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}