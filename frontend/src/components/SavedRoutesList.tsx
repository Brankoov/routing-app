import { useEffect, useState } from "react";
import { fetchAllRoutes, deleteRoute, type SavedRoute } from "../api/routeClient";
import RouteMap from "./RouteMap";

// FIXAD: Google Maps-länk (Universal Link)
function buildGoogleMapsUrl(stop: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  const baseUrl = "https://www.google.com/maps/search/?api=1&query=";

  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    return `${baseUrl}${stop.latitude},${stop.longitude}`;
  }
  
  const q = encodeURIComponent(stop.address);
  return `${baseUrl}${q}`;
}

// UPPDATERADE PROPS
type Props = {
  onEdit: (route: SavedRoute) => void;
  onStartDrive: (route: SavedRoute) => void; // <--- NY PROP
};

export function SavedRoutesList({ onEdit, onStartDrive }: Props) { // <--- Ta emot den här
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // State för avbockade stopp i historiken (endast visuellt här)
  const [completedStops, setCompletedStops] = useState<Set<number>>(new Set());

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

  function handleEditClick(route: SavedRoute, e: React.MouseEvent) {
    e.stopPropagation();
    onEdit(route);
  }

  // Funktion för att toggla (bocka av/på)
  const toggleStopCompletion = (stopId: number) => {
    setCompletedStops(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stopId)) {
        newSet.delete(stopId);
      } else {
        newSet.add(stopId);
      }
      return newSet;
    });
  };

  if (loading) return <p style={{textAlign: 'center', color: '#666'}}>Laddar historik...</p>;
  if (error) return <p style={{ color: "red", textAlign: 'center' }}>{error}</p>;

  return (
    <section>
      {routes.length === 0 ? (
        <p style={{textAlign: 'center', color: '#999', marginTop: '2rem'}}>Inga sparade rutter än.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {routes.map((route) => {
            const isExpanded = expandedId === route.id;
            
            return (
              <div
                key={route.id}
                onClick={() => toggleExpand(route.id)}
                className="card"
                style={{
                  textAlign: "left",
                  border: isExpanded ? "2px solid #646cff" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 0.25rem 0", fontSize: '1.1rem' }}>
                      {route.name}
                    </h3>
                    <small style={{ color: "#666" }}>
                      {new Date(route.createdAt).toLocaleDateString()} • {route.stops.length} stopp
                    </small>
                  </div>
                  
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    {/* --- NY KNAPP: STARTA KÖRNING --- */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartDrive(route);
                        }}
                        style={{ background: "#2196f3", color: "white", padding: "8px", borderRadius: "50%", minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Kör denna rutt"
                    >
                        🏎️
                    </button>
                    {/* -------------------------------- */}

                    <button 
                      onClick={(e) => handleEditClick(route, e)}
                      style={{ background: "#e0f2f1", color: "#00695c", padding: "8px", borderRadius: "50%", minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Redigera"
                    >
                      ✏️
                    </button>

                    <button 
                      onClick={(e) => handleDelete(route.id, e)}
                      style={{ background: "#ffebee", color: "#c62828", padding: "8px", borderRadius: "50%", minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Ta bort"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Start och Slut */}
                <div style={{ marginTop: '0.75rem', fontSize: '0.9em', color: '#555', background: '#f9f9f9', padding: '8px', borderRadius: '8px' }}>
                    {route.startAddress && <div style={{marginBottom: '4px'}}>🏁 <strong>Start:</strong> {route.startAddress}</div>}
                    {route.endAddress && <div>🏁 <strong>Slut:</strong> {route.endAddress}</div>}
                </div>

                {/* EXPANDERAD DEL */}
                {isExpanded && (
                  <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "1rem", cursor: "default" }} onClick={e => e.stopPropagation()}>
                    
                    {route.description && <p style={{fontStyle: 'italic', color: '#666', marginBottom: '1rem'}}>{route.description}</p>}
                    
                    <ul style={{ paddingLeft: "0", listStyle: 'none', marginBottom: '1.5rem' }}>
                      {route.stops.map((stop) => {
                        const isCompleted = completedStops.has(stop.id);

                        return (
                          <li key={stop.id} style={{
                              marginBottom: '0.75rem', 
                              padding: '12px', 
                              background: isCompleted ? '#f0f0f0' : '#fff', 
                              border: isCompleted ? '1px solid #eee' : '1px solid #eee', 
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              opacity: isCompleted ? 0.6 : 1,
                              transition: 'all 0.2s'
                          }}>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                              
                              <div 
                                onClick={() => toggleStopCompletion(stop.id)}
                                style={{
                                  minWidth: '28px', height: '28px', borderRadius: '50%',
                                  border: isCompleted ? '2px solid #4caf50' : '2px solid #ccc',
                                  background: isCompleted ? '#4caf50' : 'transparent',
                                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', fontSize: '1.1rem'
                                }}
                              >
                                {isCompleted && '✓'}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{
                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                    fontWeight: '500', color: isCompleted ? '#888' : '#333', fontSize: '0.95em'
                                }}>
                                  {stop.address}
                                </span>
                                <span style={{fontSize: '0.8em', color: '#999'}}>
                                   Stopp #{stop.orderIndex + 1}
                                </span>
                              </div>
                            </div>
                            
                            <a
                              href={buildGoogleMapsUrl(stop)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                  fontSize: "1.4rem", textDecoration: 'none', padding: '8px',
                                  filter: isCompleted ? 'grayscale(100%)' : 'none', opacity: isCompleted ? 0.5 : 1
                              }}
                              title="Navigera med Google Maps"
                            >
                              🗺️
                            </a>
                          </li>
                        );
                      })}
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
                        geometry={route.geometry}
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