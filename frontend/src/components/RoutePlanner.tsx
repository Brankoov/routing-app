import { FormEvent, useEffect, useState } from "react";
import {
  optimizeRoute,
  saveRoute,
  searchAddress,
  type RouteOptimizationResponse,
  type SavedRoute,
  formatDuration,
} from "../api/routeClient";
import RouteMap from "./RouteMap";
import AutoAddressInput from "./AutoAddressInput";
import { DEMO_ROUTES } from "../data/demoRoute";
import { BulkImportModal } from "./BulkImportModal";

// --- NYA IMPORTER FÖR DRAG AND DROP ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function buildGoogleMapsUrl(stop: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  const baseUrl = "https://www.google.com/maps/dir/?api=1&destination=";
  const driveMode = "&travelmode=driving";

  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    return `${baseUrl}${stop.latitude},${stop.longitude}${driveMode}`;
  }
  const q = encodeURIComponent(stop.address);
  return `${baseUrl}${q}${driveMode}`;
}

// --- TYPE DEFINITIONS ---
type LoadState = "idle" | "loading" | "ok" | "error" | "saving" | "fetching_coords";

type StopInput = {
  id: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

const MAX_STOPS = 48;

type Props = {
  routeToLoad: SavedRoute | null;
  onStartDrive: (route: SavedRoute) => void;
  isDarkMode: boolean;
};

// --- HJÄLPKOMPONENT: GÖR EN RAD DRAGBAR ---
function SortableStopItem({
  stop,
  index,
  isDarkMode,
  onChange,
  onRemove,
  hasCoords
}: {
  stop: StopInput;
  index: number;
  isDarkMode: boolean;
  onChange: (val: string) => void;
  onRemove: () => void;
  hasCoords: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 5 : "auto",
    opacity: isDragging ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.8rem",
    touchAction: "none"
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          color: isDarkMode ? "#aaa" : "#888",
          fontSize: "1.2rem",
          padding: "5px",
          display: "flex",
          alignItems: "center"
        }}
        title="Dra för att flytta"
      >
        ☰
      </div>

      <span style={{ fontWeight: "bold", color: isDarkMode ? "#aaa" : "#888", width: "20px", textAlign: "center" }}>
        {index + 1}
      </span>
      
      <div style={{ flex: 1 }}>
        <AutoAddressInput 
          label="" 
          value={stop.address} 
          onChange={onChange} 
        />
      </div>

      {hasCoords && <span title="Har koordinater" style={{color: 'green', fontSize: '0.8rem'}}>📍</span>}
      
      <button 
        type="button" 
        onClick={onRemove} 
        style={{ 
          background: isDarkMode ? "#3e2727" : "#ffebee", 
          color: "#c62828", 
          borderRadius: "50%", 
          width: "40px", 
          height: "40px", 
          padding: 0, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          fontSize: "1.2rem", 
          border: "none",
          cursor: "pointer"
        }}
      >
        ×
      </button>
    </div>
  );
}

// --- HUVUDKOMPONENT ---
export function RoutePlanner({ routeToLoad, onStartDrive, isDarkMode }: Props) {
  const [startAddress, setStartAddress] = useState("");
  const [startCoords, setStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [endAddress, setEndAddress] = useState("");
  const [endCoords, setEndCoords] = useState<{lat: number, lng: number} | null>(null);

  const [stops, setStops] = useState<StopInput[]>([
    { id: String(Date.now()), address: "" },
  ]);

  const [result, setResult] = useState<RouteOptimizationResponse | null>(null);
  const [routeName, setRouteName] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stopTime, setStopTime] = useState(5);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setStops((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      
      if(result) {
          setResult(null); 
          setSuccessMsg(null);
      }
    }
  }

  useEffect(() => {
    if (routeToLoad) {
      setStartAddress(routeToLoad.startAddress || "");
      setEndAddress(routeToLoad.endAddress || "");
      setRouteName(routeToLoad.name || "");

      const formStops = (routeToLoad.stops || [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => ({
          id: String(Date.now() + Math.random()),
          address: s.address,
          latitude: s.latitude,   
          longitude: s.longitude  
        }));

      setStops(
        formStops.length > 0
          ? formStops
          : [{ id: String(Date.now()), address: "" }]
      );

      // Säkrare hantering av totalDuration här nere med (?? 0)
      if (routeToLoad.stops && routeToLoad.stops.length > 0 && routeToLoad.geometry) {
        const reconstructedResult: RouteOptimizationResponse = {
          orderedStops: routeToLoad.stops
            .map((s) => ({
              id: String(s.id),
              label: `Stop ${s.orderIndex + 1}`,
              address: s.address,
              latitude: s.latitude,
              longitude: s.longitude,
              order: s.orderIndex,
            }))
            .sort((a, b) => a.order - b.order),
          totalStops: routeToLoad.stops.length,
          geometry: routeToLoad.geometry || "",
          totalDuration: routeToLoad.totalDuration ?? 0, // FIX: Default till 0
        };
        setResult(reconstructedResult);
      } else {
        setResult(null);
      }
      setSuccessMsg(null);
      setState("idle");
    }
  }, [routeToLoad]);

  const loadDemoRoute = (addresses: string[], nameDescription: string) => {
    if (!addresses || addresses.length < 2) return;
    setStartAddress(addresses[0]);
    setEndAddress(addresses[addresses.length - 1]);
    const middlePoints = addresses.slice(1, -1);
    const newStops = middlePoints.map((addr) => ({
      id: crypto.randomUUID(),
      address: addr,
    }));
    setStops(newStops);
    setResult(null); 
    setRouteName(nameDescription);
    setSuccessMsg(null);
  };

  const handleBulkImport = (addresses: string[]) => {
    const newStops = addresses.map((addr) => ({
      id: String(Date.now() + Math.random()),
      address: addr,
    }));
    setStops((prev) => {
      if (prev.length === 1 && prev[0].address === "") {
        return newStops;
      }
      return [...prev, ...newStops];
    });
  };

  const hasEnoughData =
    startAddress.trim().length > 0 &&
    endAddress.trim().length > 0 &&
    stops.some((s) => s.address.trim().length > 0);

  const handleStopChange = (id: string, value: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, address: value } : s))
    );
    if (result) setResult(null); 
  };

  const addStop = () => {
    setStops((prev) => {
      if (prev.length >= MAX_STOPS) return prev;
      return [...prev, { id: String(Date.now()), address: "" }];
    });
  };

  const removeStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
    if (result) setResult(null);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  async function handleFetchMarkers() {
    if (!hasEnoughData) return;
    setState("fetching_coords");
    setError(null);

    try {
        if (!startCoords && startAddress) {
            const startRes = await searchAddress(startAddress);
            if (startRes) setStartCoords({ lat: startRes.lat, lng: startRes.lng });
        }

        if (!endCoords && endAddress) {
            const endRes = await searchAddress(endAddress);
            if (endRes) setEndCoords({ lat: endRes.lat, lng: endRes.lng });
        }

        const updatedStops = [...stops];
        let foundCount = 0;

        for (let i = 0; i < updatedStops.length; i++) {
            const s = updatedStops[i];
            if (s.latitude && s.longitude) continue;

            if (s.address.trim().length > 0) {
                await delay(400); 
                const res = await searchAddress(s.address);
                if (res) {
                    updatedStops[i] = { ...s, latitude: res.lat, longitude: res.lng };
                    foundCount++;
                }
            }
        }
        setStops(updatedStops);
        setState("idle");
        if (foundCount > 0) setSuccessMsg(`Hämtade positioner för ${foundCount} stopp!`);
    } catch (err) {
        console.error(err);
        setError("Ett fel uppstod när koordinater hämtades.");
        setState("error");
    }
  }

  // --- NY FUNKTION: Hanterar både Optimering och "Visa på karta" ---
  async function handleCalculate(shouldOptimize: boolean) {
    if (!hasEnoughData) {
      setError("Fyll i start, slut och minst ett stopp.");
      setState("error");
      return;
    }
    setState("loading");
    setError(null);
    setSuccessMsg(null);
    setResult(null);

    try {
      const stopAddresses = stops
        .map((s) => s.address.trim())
        .filter((s) => s.length > 0);
      
      const response = await optimizeRoute({
        startAddress: startAddress.trim(),
        endAddress: endAddress.trim(),
        stops: stopAddresses,
        optimize: shouldOptimize, // Skickar flaggan
      });
      
      setResult(response);

      // --- NYTT: Uppdatera input-listan så den matchar resultatet och får koordinater ---
      const sortedStops: StopInput[] = response.orderedStops.map((stop) => ({
        id: stop.id,
        address: stop.address,
        latitude: stop.latitude ?? undefined,
        longitude: stop.longitude ?? undefined
      }));
      setStops(sortedStops);
      // --------------------------------------------------------------------------------

      setState("ok");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Okänt fel");
      setState("error");
    }
  }

  // --- Ersätter handleSubmit för formuläret ---
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Vi använder handleCalculate istället via knapparna
  }

  // --- UPPDATERAD SPAR-FUNKTION (STÖDER "SAVE AS NEW") ---
  async function handleSave(saveAsNew: boolean = false) {
    if (!routeName.trim()) {
        setError("Ange ett namn på rutten för att spara.");
        setState("error");
        return;
    }
    if (!hasEnoughData) {
        setError("Du måste ha minst start, slut och ett stopp.");
        setState("error");
        return;
    }
    
    // OM saveAsNew är true = ID undefined (skapa ny)
    // OM saveAsNew är false och vi har routeToLoad = ID finns (uppdatera)
    const routeIdToSave = (routeToLoad && !saveAsNew) ? routeToLoad.id : undefined;

    let stopsToSave;
    let geometryToSave: string;
    let totalDurationToSave: number;

    if (result) {
        stopsToSave = result.orderedStops;
        geometryToSave = result.geometry ?? ""; 
        totalDurationToSave = result.totalDuration ?? 0;
    } else {
        stopsToSave = stops
            .filter(s => s.address.trim().length > 0)
            .map((s, index) => ({
                id: s.id,
                label: `Stop ${index + 1}`,
                address: s.address,
                latitude: s.latitude ?? 0,
                longitude: s.longitude ?? 0,
                order: index
            }));
        geometryToSave = ""; 
        totalDurationToSave = 0; 
    }

    try {
      setState("saving");
      await saveRoute({
        id: routeIdToSave,
        name: routeName,
        stops: stopsToSave,
        description: result ? "Optimized Route" : "Draft Route (Not optimized)",
        startAddress: startAddress,
        endAddress: endAddress,
        geometry: geometryToSave,
        totalDuration: totalDurationToSave,
        averageStopDuration: stopTime,
      });
      setSuccessMsg(saveAsNew ? "Sparad som ny rutt! ✅" : "Rutt uppdaterad! ✅");
      setState("ok");
      if (!routeToLoad) setRouteName("");
    } catch (err) {
      console.error(err);
      setError("Kunde inte spara rutten.");
      setState("error");
    }
  }

  const showMap = true; 
  const manualStopsWithCoords = stops
        .filter(s => s.address && s.latitude && s.longitude)
        .map((s, i) => ({
            id: s.id,
            label: `Stop ${i+1}`,
            address: s.address,
            latitude: s.latitude!,
            longitude: s.longitude!,
            order: i
        }));

  const cardStyle = {
    backgroundColor: isDarkMode ? "#1e1e1e" : "white",
    color: isDarkMode ? "white" : "black",
    border: isDarkMode ? "1px solid #333" : "none",
    boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.1)",
    padding: "20px",
    borderRadius: "16px",
    marginBottom: "20px",
    transition: "background-color 0.3s",
  };

  return (
    <section>
      {isDarkMode && (
        <style>{`
           input[type="text"], input[type="number"], .address-input {
             background-color: #2c2c2c !important;
             color: white !important;
             border: 1px solid #444 !important;
           }
           input::placeholder {
             color: #888 !important;
           }
           .suggestions-list {
             background-color: #2c2c2c !important;
             color: white !important;
             border: 1px solid #444 !important;
           }
           .suggestion-item:hover {
             background-color: #444 !important;
           }
        `}</style>
      )}

      {showBulkImport && (
        <BulkImportModal
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      <div className="card" style={cardStyle}>
        {state === "loading" && (
          <div className="loading-overlay" style={{ background: isDarkMode ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)" }}>
            <div className="spinner"></div>
            <p style={{ fontWeight: "600", color: isDarkMode ? "white" : "#333" }}>Beräknar rutt...</p>
          </div>
        )}
        
        {state === "fetching_coords" && (
          <div className="loading-overlay" style={{ background: isDarkMode ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)" }}>
            <div className="spinner"></div>
            <p style={{ fontWeight: "600", color: isDarkMode ? "white" : "#333" }}>Hämtar positioner...</p>
          </div>
        )}

        {routeToLoad && (
          <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: isDarkMode ? "1px solid #333" : "1px solid #ddd" }}>
            <h3 style={{ marginTop: 0, color: isDarkMode ? "#81c784" : "#4caf50" }}>✏️ Redigerar {routeToLoad.name}</h3>
            <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#aaa" : "#666" }}>Ägare: {routeToLoad.ownerUsername || "Okänd"}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center", background: isDarkMode ? "#252525" : "#f5f5f5", padding: "10px", borderRadius: "8px" }}>
          <span style={{ fontSize: "0.9rem", color: isDarkMode ? "#aaa" : "#666", fontWeight: "bold" }}>🧪 Ladda Demo:</span>
          <button type="button" onClick={() => loadDemoRoute(DEMO_ROUTES.del1, "City Rundan")} style={{ background: "#e0f7fa", color: "#006064", border: "1px solid #0097a7", padding: "6px 12px", fontSize: "0.8rem" }}>Del 1</button>
          <button type="button" onClick={() => loadDemoRoute(DEMO_ROUTES.del2, "Vasastan Rundan")} style={{ background: "#e0f7fa", color: "#006064", border: "1px solid #0097a7", padding: "6px 12px", fontSize: "0.8rem" }}>Del 2</button>
          <button type="button" onClick={() => loadDemoRoute(DEMO_ROUTES.del3, "Birkastan Rundan")} style={{ background: "#e0f7fa", color: "#006064", border: "1px solid #0097a7", padding: "6px 12px", fontSize: "0.8rem" }}>Del 3</button>
          <button type="button" onClick={() => setShowBulkImport(true)} style={{ background: "#333", color: "white", border: "1px solid #333", padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>📋 Klistra in lista</button>
        </div>

        {/* Prevent default submit on form to handle buttons individually */}
        <form onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gap: "1.2rem", textAlign: "left" }}>
          <AutoAddressInput label="Startadress" value={startAddress} onChange={setStartAddress} />

          <fieldset style={{ border: isDarkMode ? "1px solid #333" : "1px solid #ccc", padding: "15px", borderRadius: "8px", marginTop: "0.5rem" }}>
            <legend style={{ fontSize: "1rem", fontWeight: "bold", padding: "0 8px", color: isDarkMode ? "#aaa" : "#666" }}>Mellanstop ({stops.length})</legend>
            
            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={stops.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                    {stops.map((stop, index) => (
                        <SortableStopItem 
                            key={stop.id}
                            stop={stop}
                            index={index}
                            isDarkMode={isDarkMode}
                            onChange={(val) => handleStopChange(stop.id, val)}
                            onRemove={() => removeStop(stop.id)}
                            hasCoords={!!(stop.latitude && stop.longitude)}
                        />
                    ))}
                    </div>
                </SortableContext>
            </DndContext>

            {stops.length < MAX_STOPS && (
              <button type="button" onClick={addStop} style={{ marginTop: "1rem", background: "transparent", border: isDarkMode ? "2px dashed #444" : "2px dashed #ccc", color: isDarkMode ? "#aaa" : "#666", width: "100%" }}>+ Lägg till stopp</button>
            )}
          </fieldset>

          <AutoAddressInput label="Slutadress" value={endAddress} onChange={setEndAddress} />

          <div style={{display: 'flex', gap: '10px', marginTop: '0.5rem'}}>
            <button
                type="button"
                onClick={() => handleCalculate(false)} // false = Behåll ordning
                disabled={!hasEnoughData || state === "loading" || state === "saving"}
                style={{
                flex: 1,
                padding: "16px",
                background: isDarkMode ? "#444" : "#e0e0e0",
                color: isDarkMode ? "white" : "black",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
            >
                🗺️ Visa på karta
            </button>

            <button
                type="button"
                onClick={() => handleCalculate(true)} // true = Optimera
                disabled={!hasEnoughData || state === "loading" || state === "saving"}
                style={{
                flex: 1,
                padding: "16px",
                background: state === "loading" ? "#999" : "#646cff",
                boxShadow: state === "loading" ? "none" : "0 4px 8px rgba(100, 108, 255, 0.4)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer"
                }}
            >
                {state === "loading" ? "Beräknar..." : "🚀 Optimera Rutt"}
            </button>
          </div>
        </form>

        {state === "error" && error && <p style={{ color: "red", marginTop: "1rem", textAlign: "center" }}>⚠️ {error}</p>}
      </div>

      {hasEnoughData && (
        <div className="card" style={{ ...cardStyle, marginTop: "1rem", border: isDarkMode ? "1px solid #444" : "1px solid #ddd" }}>
            <h4 style={{marginTop: 0, color: isDarkMode ? '#81c784' : 'green'}}>💾 Spara Rutt</h4>
             <p style={{fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '1rem'}}>
                {result ? "Du kan spara den beräknade rutten." : "Du kan spara listan som ett utkast (utan beräkning)."}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
                <input type="text" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="T.ex. Måndagsrundan..." style={{ flex: 1, background: isDarkMode ? "#333" : "white", color: isDarkMode ? "white" : "black", border: "1px solid #555" }} />
                
                {/* UPPDATERAD SPAR-KNAPP LOGIK */}
                {routeToLoad ? (
                    <>
                        <button 
                            onClick={() => handleSave(false)} 
                            disabled={!routeName.trim() || state === "saving"} 
                            style={{ background: "#ff9800", color: "white", whiteSpace: "nowrap", border: "none", borderRadius: "4px", padding: "0 15px", cursor: "pointer" }}
                        >
                            {state === "saving" ? "Sparar..." : "💾 Uppdatera"}
                        </button>
                        <button 
                            onClick={() => handleSave(true)} 
                            disabled={!routeName.trim() || state === "saving"} 
                            style={{ background: "#4caf50", color: "white", whiteSpace: "nowrap", border: "none", borderRadius: "4px", padding: "0 15px", cursor: "pointer" }}
                        >
                            {state === "saving" ? "Sparar..." : "🆕 Spara som ny"}
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={() => handleSave(false)} 
                        disabled={!routeName.trim() || state === "saving"} 
                        style={{ background: "green", color: "white", whiteSpace: "nowrap", border: "none", borderRadius: "4px", padding: "0 20px", cursor: "pointer" }}
                    >
                        {state === "saving" ? "Sparar..." : "Spara"}
                    </button>
                )}

            </div>
            {successMsg && <p style={{ color: "green", marginTop: "0.5rem", textAlign: "center", fontWeight: "bold" }}>{successMsg}</p>}
        </div>
      )}

      {showMap && (
        <div className="card" style={{ ...cardStyle, marginTop: "1rem", border: result ? "2px solid #4caf50" : (isDarkMode ? "1px solid #444" : "1px solid #ddd") }}>
          {result ? (
            <>
                <h3 className="text-xl font-bold mb-4" style={{ color: isDarkMode ? '#81c784' : '#4caf50' }}>✅ Optimeringsresultat</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px", background: isDarkMode ? "#2c2c2c" : "#e8f5e9", padding: "15px", borderRadius: "10px" }}>
                  <div>
                    <span style={{ fontSize: "0.9rem", color: isDarkMode ? "#aaa" : "#555" }}>🏎️ Ren körtid:</span>
                    {/* FIX: Defaulta till 0 om undefined */}
                    <strong style={{ display: "block", fontSize: "1.2rem" }}>{formatDuration(result.totalDuration ?? 0)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.9rem", color: isDarkMode ? "#aaa" : "#555" }}>📦 Tid per stopp:</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                         <input type="number" min="0" max="60" value={stopTime} onChange={(e) => setStopTime(Number(e.target.value))} style={{width: '50px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc'}} />
                         <span>min</span>
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1", borderTop: isDarkMode ? "1px solid #444" : "1px solid #ccc", paddingTop: "10px", marginTop: "5px" }}>
                    <span style={{ fontSize: "0.9rem", color: isDarkMode ? "#aaa" : "#555" }}>⏱️ Total arbetstid:</span>
                    {/* FIX: Defaulta till 0 om undefined */}
                    <strong style={{ display: "block", fontSize: "1.4rem", color: "#1976d2" }}>
                      {formatDuration((result.totalDuration ?? 0) + (result.totalStops * stopTime * 60))}
                    </strong>
                  </div>
                </div>

                <button
                    onClick={() => {
                    const tempRoute: any = {
                        id: 0,
                        name: "Nuvarande körning",
                        stops: result.orderedStops.map((s) => ({ ...s, orderIndex: s.order })),
                        geometry: result.geometry,
                        startAddress: startAddress,
                        endAddress: endAddress,
                    };
                    onStartDrive(tempRoute);
                    }}
                    style={{ width: "100%", padding: "16px", background: "#2196f3", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1.1rem", marginBottom: "1.5rem" }}
                >
                    🏎️ Starta Körning Nu
                </button>
            </>
          ) : (
             <div style={{marginBottom: '10px'}}>
                 <h3 style={{marginTop: 0, color: isDarkMode ? '#aaa' : '#666'}}>🗺️ Karta (Utkast)</h3>
                 <p style={{fontSize: '0.8rem'}}>Om du inte ser nålar, klicka på "Visa på karta".</p>
             </div>
          )}

          <RouteMap
            startAddress={startAddress}
            endAddress={endAddress}
            stops={result ? result.orderedStops : manualStopsWithCoords} 
            geometry={result ? result.geometry : ""} 
            isFullscreen={isMapFullscreen}
            toggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
            onStopComplete={(id) => {
              if (result) {
                  setResult((prev) => prev ? { ...prev, orderedStops: prev.orderedStops.filter((s) => s.id !== id), totalStops: prev.totalStops - 1 } : null);
              } else {
                  setStops(prev => prev.filter(s => s.id !== id));
              }
            }}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
    </section>
  );
}