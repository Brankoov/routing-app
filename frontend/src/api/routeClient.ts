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
  id?: number;
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
  ownerUsername: string; // <--- NYTT: Fixar felet i RoutePlanner

  stops: {
    id: number;
    address: string;
    latitude: number;
    longitude: number;
    orderIndex: number;
  }[];
}

// --- NY TYP FÖR ADMIN ---
export interface User {
  id: number;
  username: string;
  role: string;
  enabled: boolean;
  createdAt?: string;
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
  optimize: boolean; // <--- NY PARAMETER
}): Promise<RouteOptimizationResponse> {
  const body = {
    startAddress: params.startAddress,
    endAddress: params.endAddress,
    optimize: params.optimize, // <--- SKICKA MED DEN
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
    throw new Error(`Route calculation failed with status ${response.status}`);
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

  const routes = await response.json() as SavedRoute[];
  
  // NYTT: Sortera så att den nyaste (högsta ID:t eller senaste createdAt) kommer först.
  return routes.sort((a, b) => {
      // Jämför ID:t direkt för enkel och pålitlig sortering (högst ID = nyast)
      return b.id - a.id; 
      
      // ALTERNATIVT (Om du vill vara säker på tid):
      // return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
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

// --- NYA FUNKTIONER FÖR ADMIN ---

export const getAllUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Kunde inte hämta användare.");
  }
  return response.json();
};

export const toggleUserBan = async (userId: number): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/ban`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Kunde inte ändra status.");
  }
  return await response.text();
};

// Hämta en specifik användares rutter (ADMIN ONLY)
export const getUserRoutesAdmin = async (username: string): Promise<SavedRoute[]> => {
  const token = localStorage.getItem("jwt_token");
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${username}/routes`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Kunde inte hämta användarens rutter.");
  }
  return response.json();
};