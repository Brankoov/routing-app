import { API_BASE_URL } from "./config";

// --- TYPER ---
export interface StopRequest {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface OrderedStop extends StopRequest {
  order: number;
}

export interface RouteOptimizationResponse {
  orderedStops: OrderedStop[];
  totalStops: number;
  geometry?: string;
  totalDuration?: number; // Sekunder
}

export interface SaveRouteRequest {
  name: string;
  description?: string;
  startAddress?: string;
  endAddress?: string;
  stops: OrderedStop[];
  geometry?: string;
  totalDuration?: number;
  averageStopDuration?: number;
}

export interface SavedRoute {
  id: number;
  name: string;
  description?: string;
  startAddress?: string;
  endAddress?: string;
  createdAt: string;
  geometry?: string;
  totalDuration?: number;
  averageStopDuration?: number;
  stops: {
    id: number;
    address: string;
    latitude: number;
    longitude: number;
    orderIndex: number;
  }[];
}

// --- HJÄLPFUNKTIONER ---
function getAuthHeaders() {
  const token = localStorage.getItem("jwt_token");
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

// --- API ANROP ---

export async function optimizeRoute(params: {
  startAddress: string;
  endAddress: string;
  stops: string[];
}): Promise<RouteOptimizationResponse> {
  const body = {
    startAddress: params.startAddress,
    endAddress: params.endAddress,
    stops: params.stops.map((address, index) => ({
      id: String(index + 1),
      label: `Stop ${index + 1}`,
      address,
      latitude: null,
      longitude: null,
    })),
  };

  const response = await fetch(`${API_BASE_URL}/api/routes/optimize`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Route optimization failed with status ${response.status}`);
  }

  return response.json() as Promise<RouteOptimizationResponse>;
}

export async function saveRoute(data: SaveRouteRequest): Promise<SavedRoute> {
  const response = await fetch(`${API_BASE_URL}/api/routes/save`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to save route. Status: ${response.status}`);
  }
  
  return response.json() as Promise<SavedRoute>;
}

// NAMNÄNDRING: fetchAllRoutes -> getSavedRoutes (för att matcha SavedRoutesList)
export async function getSavedRoutes(): Promise<SavedRoute[]> {
  const response = await fetch(`${API_BASE_URL}/api/routes`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 403) {
    localStorage.removeItem("jwt_token");
    window.location.reload();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch routes. Status: ${response.status}`);
  }

  return response.json() as Promise<SavedRoute[]>;
}

export async function deleteRoute(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/routes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete route. Status: ${response.status}`);
  }
}