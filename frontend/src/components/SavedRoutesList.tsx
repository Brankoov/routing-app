import { useEffect, useState } from "react";
import { fetchAllRoutes, deleteRoute, type SavedRoute } from "../api/routeClient";
import RouteMap from "./RouteMap";

// FIXAD: Google Maps-länk som fungerar bra på både mobil och desktop
function buildGoogleMapsUrl(stop: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    // Denna länkform öppnar Google Maps-appen direkt på mobilen
    return `http://googleusercontent.com/maps.google.com/maps?q=${stop.latitude},${stop.longitude}`;
  }
  const q = encodeURIComponent(stop.address);
  return `http://googleusercontent.com/maps.google.com/maps?q=${q}`;
}

type Props = {
  onEdit: (route: SavedRoute) => void;
};

export function SavedRoutesList({ onEdit }: Props) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // NYTT: Håller koll på vilka stopp-IDn som är klara
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

  // NYTT: Funktion för att toggla (bocka av/på)
  const toggleStopCompletion = (stopId: number) => {
    setCompletedStops(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stopId)) {
        newSet.delete(stopId); // Ångra (ta bort kryss)
      } else {
        newSet.add(stopId); // Kryssa i
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

                {/* Start och Slut - Syns alltid */}
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
                        const isCompleted = completedStops.has(stop.id); // Kolla om stoppet är klart

                        return (
                          <li key={stop.id} style={{
                              marginBottom: '0.75rem', 
                              padding: '12px', 
                              // Byt färg om klart
                              background: isCompleted ? '#f0f0f0' : '#fff', 
                              border: isCompleted ? '1px solid #eee' : '1px solid #eee', 
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              // Gör hela raden lite genomskinlig om klar
                              opacity: isCompleted ? 0.6 : 1,
                              transition: 'all 0.2s'
                          }}>
                            
                            {/* Vänster sida: Checkbox + Text */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                              
                              {/* STOR CHECKBOX / KNAPP */}
                              <div 
                                onClick={() => toggleStopCompletion(stop.id)}
                                style={{
                                  minWidth: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  border: isCompleted ? '2px solid #4caf50' : '2px solid #ccc',
                                  background: isCompleted ? '#4caf50' : 'transparent',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontSize: '1.1rem'
                                }}
                              >
                                {isCompleted && '✓'}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{
                                    // Stryk över texten om klar
                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                    fontWeight: '500',
                                    color: isCompleted ? '#888' : '#333',
                                    fontSize: '0.95em'
                                }}>
                                  {stop.address}
                                </span>
                                {/* Visa ordningsnummer snyggt under */}
                                <span style={{fontSize: '0.8em', color: '#999'}}>
                                   Stopp #{stop.orderIndex + 1}
                                </span>
                              </div>
                            </div>
                            
                            {/* Höger sida: Google Maps länk */}
                            <a
                              href={buildGoogleMapsUrl(stop)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                  fontSize: "1.4rem", // Större ikon för feta fingrar
                                  textDecoration: 'none',
                                  padding: '8px',
                                  filter: isCompleted ? 'grayscale(100%)' : 'none', // Gråa ut kartan om klar
                                  opacity: isCompleted ? 0.5 : 1
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