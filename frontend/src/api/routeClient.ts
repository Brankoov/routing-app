import { API_BASE_URL } from "./config";

// --- TYPER ---
export interface StopRequest {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  comment?: string; // <--- NYTT FÄLT
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
  ownerUsername: string;

  stops: {
    id: number;
    address: string;
    latitude: number;
    longitude: number;
    orderIndex: number;
    comment?: string; // <--- NYTT FÄLT I SPARAD RUTT
  }[];
}

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

export async function searchAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query || query.trim().length < 3) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/geocode/search?text=${encodeURIComponent(query)}`, {
       method: 'GET',
       headers: getAuthHeaders(),
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        return { lat, lng };
    }
    return null;
  } catch (err) {
    console.error("Kunde inte söka adress:", err);
    return null;
  }
}

// UPPDATERAD: Tar nu in objekt med address + comment istället för bara strings
export async function optimizeRoute(params: {
  startAddress: string;
  endAddress: string;
  stops: { address: string; comment?: string }[]; // <--- ÄNDRAT HÄR
  optimize: boolean;
}): Promise<RouteOptimizationResponse> {
  
  const body = {
    startAddress: params.startAddress,
    endAddress: params.endAddress,
    optimize: params.optimize,
    // Mappar om så att comment följer med till backend
    stops: params.stops.map((stop, index) => ({
      id: String(index + 1),
      label: `Stop ${index + 1}`,
      address: stop.address,
      latitude: null,
      longitude: null,
      comment: stop.comment || null // <--- SKICKAR KOMMENTAR
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
  
  return routes.sort((a, b) => {
      return b.id - a.id; 
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