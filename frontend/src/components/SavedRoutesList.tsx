import { useEffect, useState } from "react";
import { fetchAllRoutes, deleteRoute, type SavedRoute } from "../api/routeClient";
import RouteMap from "./RouteMap";

function buildGoogleMapsUrl(stop: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    return `http://googleusercontent.com/maps.google.com/maps?q=${stop.latitude},${stop.longitude}`;
  }
  const q = encodeURIComponent(stop.address);
  return `http://googleusercontent.com/maps.google.com/maps?q=${q}`;
}

// NYTT: Props definition
type Props = {
  onEdit: (route: SavedRoute) => void;
};

// Ta emot props här
export function SavedRoutesList({ onEdit }: Props) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    try {
      setLoading(true);
      const data = await fetchAllRoutes();
      setRoutes(data.reverse());
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Kunde inte hämta rutter.");
      setLoading(false);
    }
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Är du säker på att du vill ta bort rutten?")) return;
    
    try {
      await deleteRoute(id);
      loadRoutes(); 
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      alert("Kunde inte ta bort rutten");
    }
  }

  function toggleExpand(id: number) {
    if (expandedId === id) setExpandedId(null);
    else setExpandedId(id);
  }

  // NYTT: Hantera redigering
  function handleEditClick(route: SavedRoute, e: React.MouseEvent) {
    e.stopPropagation(); // Så vi inte togglar expand
    onEdit(route);
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
          {routes.map((route) => {
            const isExpanded = expandedId === route.id;
            
            return (
              <div
                key={route.id}
                onClick={() => toggleExpand(route.id)}
                style={{
                  background: "#333",
                  padding: "1rem",
                  borderRadius: "8px",
                  textAlign: "left",
                  border: isExpanded ? "1px solid #646cff" : "1px solid #444",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h3 style={{ margin: "0 0 0.5rem 0", color: isExpanded ? "#646cff" : "white" }}>
                    {route.name} {isExpanded ? "🔼" : "🔽"}
                  </h3>
                  
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    {/* NY KNAPP: REDIGERA */}
                    <button 
                      onClick={(e) => handleEditClick(route, e)}
                      style={{ background: "#228822", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px" }}
                      title="Ladda upp i planeraren för att ändra"
                    >
                      ✏️ Redigera
                    </button>

                    <button 
                      onClick={(e) => handleDelete(route.id, e)}
                      style={{ background: "#aa2222", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px" }}
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
                
                <small style={{ color: "#aaa" }}>
                  Skapad: {new Date(route.createdAt).toLocaleDateString()} • {route.stops.length} stopp
                </small>

                <div style={{ marginTop: '0.5rem', fontSize: '0.9em', color: '#ddd' }}>
                    {route.startAddress && <div>🏁 <strong>Start:</strong> {route.startAddress}</div>}
                    {route.endAddress && <div>🏁 <strong>Slut:</strong> {route.endAddress}</div>}
                </div>

                {isExpanded && (
                  <div style={{ marginTop: "1.5rem", borderTop: "1px solid #555", paddingTop: "1rem", cursor: "default" }} onClick={e => e.stopPropagation()}>
                    <p style={{fontStyle: 'italic'}}>{route.description}</p>
                    
                    <ul style={{ paddingLeft: "1.2rem", marginBottom: '1.5rem' }}>
                      {route.stops.map((stop) => (
                        <li key={stop.id} style={{marginBottom: '0.5rem'}}>
                          <strong>#{stop.orderIndex}</strong> – {stop.address}
                          <a
                            href={buildGoogleMapsUrl(stop)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.85rem", marginLeft: "0.5rem", color: "#646cff" }}
                          >
                            (Öppna karta)
                          </a>
                        </li>
                      ))}
                    </ul>

                    <RouteMap 
                        startAddress={route.startAddress || "Start"} 
                        endAddress={route.endAddress || "Slut"}
                        stops={route.stops.map(s => ({
                            ...s,
                            id: String(s.id),
                            label: String(s.orderIndex),
                            order: s.orderIndex
                        }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}