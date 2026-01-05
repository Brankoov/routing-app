import { FormEvent, useEffect, useState } from "react";
import {
  optimizeRoute,
  saveRoute,
  type RouteOptimizationResponse,
  type SavedRoute,
  formatDuration,
} from "../api/routeClient";
import RouteMap from "./RouteMap";
import AutoAddressInput from "./AutoAddressInput";
import { DEMO_ROUTES } from "../data/demoRoute";
import { BulkImportModal } from "./BulkImportModal";
import { AssignRouteModal } from "./AssignRouteModal";

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

// --- TYPE DEFINITIONS ---
type LoadState = "idle" | "loading" | "ok" | "error" | "saving" | "fetching_coords" | "finishing";

type StopInput = {
  id: string;
  address: string;
  comment?: string;
  latitude?: number;
  longitude?: number;
};

const MAX_STOPS = 48;

type Props = {
  routeToLoad: SavedRoute | null;
  onStartDrive: (route: SavedRoute) => void;
  isDarkMode: boolean;
};

// --- SORTABLE ITEM KOMPONENT ---
function SortableStopItem({
  stop,
  index,
  isDarkMode,
  onChange,
  onCommentChange,
  onRemove,
  hasCoords
}: {
  stop: StopInput;
  index: number;
  isDarkMode: boolean;
  onChange: (val: string) => void;
  onCommentChange: (val: string) => void;
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
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <AutoAddressInput 
          label="" 
          value={stop.address} 
          onChange={onChange} 
        />
        
        <div style={{display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '2px'}}>
            <span style={{fontSize: '0.85rem', opacity: 0.7}}>🔑</span>
            <input 
                type="text" 
                placeholder="Nyckelkod / Info..." 
                value={stop.comment || ""}
                onChange={(e) => onCommentChange(e.target.value)}
                style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isDarkMode ? '1px solid #444' : '1px solid #ccc',
                    color: isDarkMode ? '#ccc' : '#666',
                    fontSize: '0.8rem',
                    padding: '2px 0',
                    outline: 'none'
                }}
            />
        </div>
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

// --- LOADING OVERLAY (Dual Mode: Complex or Simple) ---
const LoadingOverlay = ({ state, isDarkMode, progress }: { state: string, isDarkMode: boolean, progress: number }) => {
  
  // Avgör om vi ska visa den tunga spinnern (Optimering) eller den lätta (Spara/Hämta)
  const isComplexMode = state === "loading" || state === "finishing";

  return (
    <div className={`custom-loading-overlay ${!isComplexMode ? 'simple-mode' : ''}`}>
        <style>{`
            .custom-loading-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                width: 100vw;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                /* Default för Complex Mode */
                background: ${isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.7)"};
                backdrop-filter: blur(8px);
                transition: opacity 0.3s ease-out;
            }

            /* SIMPLE MODE overrides */
            .custom-loading-overlay.simple-mode {
                background: rgba(0,0,0,0.3); /* Bara mörka ner lite lätt */
                backdrop-filter: none;
            }

            /* --- GYROSCOPE SPINNER (För Optimering) --- */
            .spinner-box {
                position: relative;
                width: 80px;
                height: 80px;
                margin-bottom: 25px;
            }
            .gyro-ring {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 4px solid transparent;
                box-sizing: border-box;
            }
            .ring-1 {
                border-top: 4px solid #646cff;
                animation: spin 1s linear infinite;
            }
            .ring-2 {
                width: 70%;
                height: 70%;
                top: 15%;
                left: 15%;
                border-bottom: 4px solid #9c27b0;
                animation: spin 1.5s linear infinite reverse;
            }
            .ring-3 {
                width: 40%;
                height: 40%;
                top: 30%;
                left: 30%;
                border-top: 4px solid #00e676;
                animation: spin 2s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .progress-container {
                width: 80%;
                max-width: 300px;
                height: 8px;
                background: ${isDarkMode ? "#444" : "#ddd"};
                border-radius: 4px;
                overflow: hidden;
                margin-top: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #646cff, #00e676);
                transition: width 0.3s ease-out;
            }

            /* --- SIMPLE DOT SPINNER (För Spara/Hämta) --- */
            .simple-dots-container {
                display: flex;
                gap: 8px;
                background: ${isDarkMode ? "#333" : "white"};
                padding: 15px 25px;
                border-radius: 30px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                align-items: center;
            }
            .dot {
                width: 12px;
                height: 12px;
                background: #646cff;
                border-radius: 50%;
                animation: bounce 0.5s alternate infinite;
            }
            .dot:nth-child(2) { animation-delay: 0.15s; background: #9c27b0; }
            .dot:nth-child(3) { animation-delay: 0.3s; background: #00e676; }

            @keyframes bounce {
                0% { transform: translateY(0); opacity: 0.7; }
                100% { transform: translateY(-8px); opacity: 1; }
            }
            
            .simple-text {
                margin-left: 15px;
                font-weight: 600;
                color: ${isDarkMode ? "white" : "#333"};
            }
        `}</style>
      
      {isComplexMode ? (
        // --- COMPLEX UI (OPTIMIZATION) ---
        <>
            <div className="spinner-box">
                <div className="gyro-ring ring-1"></div>
                <div className="gyro-ring ring-2"></div>
                <div className="gyro-ring ring-3"></div>
            </div>

            <h3 style={{ margin: 0, fontSize: '1.4rem', color: isDarkMode ? "white" : "#333", textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                {state === "finishing" ? "Klar!" : "Optimerar rutt..."}
            </h3>
            
            <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <p style={{marginTop: '8px', fontSize: '0.9rem', color: isDarkMode ? "#ccc" : "#555", fontWeight: 'bold'}}>{Math.round(progress)}%</p>
        </>
      ) : (
        // --- SIMPLE UI (SAVING / FETCHING) ---
        <div className="simple-dots-container">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <span className="simple-text">
                {state === "saving" ? "Sparar..." : "Hämtar..."}
            </span>
        </div>
      )}
    </div>
  );
};

// --- HUVUDKOMPONENT ---
export function RoutePlanner({ routeToLoad, onStartDrive, isDarkMode }: Props) {
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");

  const [stops, setStops] = useState<StopInput[]>([
    { id: String(Date.now()), address: "", comment: "" },
  ]);

  const [result, setResult] = useState<RouteOptimizationResponse | null>(null);
  const [routeName, setRouteName] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stopTime, setStopTime] = useState(5);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [routeToAssign, setRouteToAssign] = useState<{id: number, name: string} | null>(null); 

  // --- PROGRESS BAR STATE ---
  const [progress, setProgress] = useState(0);

  // --- HÄMTA ROLL FRÅN TOKEN ---
  let isAdmin = false;
  try {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      isAdmin = payload.role === 'ADMIN';
    }
  } catch (e) {
    console.error("Kunde inte läsa token", e);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- SIMULERA PROGRESS BAR (BARA FÖR OPTIMERING) ---
  useEffect(() => {
    let interval: any;
    // Kör bara simulationen om vi är i "loading"-fas (optimering)
    if (state === "loading") {
        setProgress(10); 
        interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 85) return prev + 0.1; 
                if (prev >= 60) return prev + 0.5;
                return prev + Math.random() * 3;
            });
        }, 200);
    } 
    return () => clearInterval(interval);
  }, [state]);

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
          comment: s.comment,
          latitude: s.latitude,   
          longitude: s.longitude  
        }));

      setStops(
        formStops.length > 0
          ? formStops
          : [{ id: String(Date.now()), address: "" }]
      );

      if (routeToLoad.stops && routeToLoad.stops.length > 0 && routeToLoad.geometry) {
        const reconstructedResult: RouteOptimizationResponse = {
          orderedStops: routeToLoad.stops
            .map((s) => ({
              id: String(s.id),
              label: `Stop ${s.orderIndex + 1}`,
              address: s.address,
              comment: s.comment,
              latitude: s.latitude,
              longitude: s.longitude,
              order: s.orderIndex,
            }))
            .sort((a, b) => a.order - b.order),
          totalStops: routeToLoad.stops.length,
          geometry: routeToLoad.geometry || "",
          totalDuration: routeToLoad.totalDuration ?? 0,
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
      comment: ""
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
      comment: ""
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

  const handleCommentChange = (id: string, value: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, comment: value } : s))
    );

    if (result) {
        setResult((prev) => {
            if (!prev) return null;
            return {
                ...prev,
                orderedStops: prev.orderedStops.map((s) => 
                    s.id === id ? { ...s, comment: value } : s
                )
            };
        });
    }
  };

  const addStop = () => {
    setStops((prev) => {
      if (prev.length >= MAX_STOPS) return prev;
      return [...prev, { id: String(Date.now()), address: "", comment: "" }];
    });
  };

  const removeStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
    if (result) setResult(null);
  };

  async function handleCalculate(shouldOptimize: boolean) {
    if (!hasEnoughData) {
      setError("Fyll i start, slut och minst ett stopp.");
      setState("error");
      return;
    }
    setState("loading");
    setProgress(0);
    setError(null);
    setSuccessMsg(null);
    setResult(null);

    try {
      const validStops = stops
        .filter((s) => s.address.trim().length > 0)
        .map((s) => ({
            address: s.address.trim(),
            comment: s.comment
        }));
      
      const response = await optimizeRoute({
        startAddress: startAddress.trim(),
        endAddress: endAddress.trim(),
        stops: validStops,
        optimize: shouldOptimize, 
      });
      
      // Force 100% and wait for Smooth Finish ONLY for optimization
      setProgress(100);
      setState("finishing");
      await new Promise(resolve => setTimeout(resolve, 600));

      setResult(response);

      const sortedStops: StopInput[] = response.orderedStops.map((stop) => ({
        id: stop.id,
        address: stop.address,
        comment: stop.comment,
        latitude: stop.latitude ?? undefined,
        longitude: stop.longitude ?? undefined
      }));
      setStops(sortedStops);

      setState("ok");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Okänt fel");
      setState("error");
    }
  }

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
                comment: s.comment,
                latitude: s.latitude ?? 0,
                longitude: s.longitude ?? 0,
                order: index
            }));
        geometryToSave = ""; 
        totalDurationToSave = 0; 
    }

    try {
      setState("saving");
      // INGEN PROGRESS BAR HÄR, SÅ VI STRUNTAR I setProgress
      
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

      // DIREKT TILL OK (Ingen finishing delay behövs för den enkla spinnern)
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
            comment: s.comment,
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
    position: 'relative' as 'relative', 
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

      {routeToAssign && (
        <AssignRouteModal 
            routeId={routeToAssign.id}
            routeName={routeToAssign.name}
            onClose={() => setRouteToAssign(null)}
        />
      )}

      {/* --- Global Loading Overlay --- */}
      {(state === "loading" || state === "fetching_coords" || state === "saving" || state === "finishing") && (
        <LoadingOverlay state={state} isDarkMode={isDarkMode} progress={progress} />
      )}

      <div className="card" style={cardStyle}>
        
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
                            onCommentChange={(val) => handleCommentChange(stop.id, val)}
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
                onClick={() => handleCalculate(false)}
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
                onClick={() => handleCalculate(true)}
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
            
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <input 
                    type="text" 
                    value={routeName} 
                    onChange={(e) => setRouteName(e.target.value)} 
                    placeholder="T.ex. Måndagsrundan..." 
                    style={{ 
                        flex: "2 1 150px",
                        minWidth: "0",
                        background: isDarkMode ? "#333" : "white", 
                        color: isDarkMode ? "white" : "black", 
                        border: "1px solid #555",
                        padding: "10px",
                        borderRadius: "4px"
                    }} 
                />
                
                {routeToLoad ? (
                    <>
                        <button 
                            onClick={() => handleSave(false)} 
                            disabled={!routeName.trim() || state === "saving"} 
                            style={{ flex: "1 0 auto", minWidth: "100px", background: "#ff9800", color: "white", whiteSpace: "nowrap", border: "none", borderRadius: "4px", padding: "10px 15px", cursor: "pointer" }}
                        >
                            {state === "saving" ? "Sparar..." : "💾 Uppdatera"}
                        </button>
                        <button 
                            onClick={() => handleSave(true)} 
                            disabled={!routeName.trim() || state === "saving"} 
                            style={{ flex: "1 0 auto", minWidth: "120px", background: "#4caf50", color: "white", whiteSpace: "nowrap", border: "none", borderRadius: "4px", padding: "10px 15px", cursor: "pointer" }}
                        >
                            {state === "saving" ? "Sparar..." : "🆕 Spara som ny"}
                        </button>
                        
                        {isAdmin && (
                            <button 
                                onClick={() => setRouteToAssign({id: routeToLoad.id, name: routeToLoad.name})}
                                style={{ flex: "1 0 auto", minWidth: "90px", background: "#9c27b0", color: "white", whiteSpace: "nowrap", border: "none", borderRadius: "4px", padding: "10px 15px", cursor: "pointer" }}
                                title="Skicka kopia till annan förare"
                            >
                                📲 Skicka
                            </button>
                        )}
                    </>
                ) : (
                    <button 
                        onClick={() => handleSave(false)} 
                        disabled={!routeName.trim() || state === "saving"} 
                        style={{ flex: "1 0 auto", minWidth: "100px", background: "green", color: "white", whiteSpace: "nowrap", border: "none", borderRadius: "4px", padding: "10px 20px", cursor: "pointer" }}
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