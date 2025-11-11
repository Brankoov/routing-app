export interface StopRequest {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface RouteOptimizationRequest {
  startAddress: string;
  endAddress: string;
  stops: StopRequest[];
}

export interface StopResponse {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  order: number;
}

export interface RouteOptimizationResponse {
  orderedStops: StopResponse[];
  totalStops: number;
}

export async function optimizeRoute(
  payload: RouteOptimizationRequest
): Promise<RouteOptimizationResponse> {
  const response = await fetch('http://localhost:8080/api/routes/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Route optimization failed with status ${response.status}`);
  }

  return response.json() as Promise<RouteOptimizationResponse>;
}
