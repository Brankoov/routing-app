
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
}

export async function optimizeRoute(params: {
  startAddress: string;
  endAddress: string;
  stops: string[]; // bara adresser i UI:t
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

  const response = await fetch('http://localhost:8080/api/routes/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Route optimization failed with status ${response.status}`);
  }

  return response.json() as Promise<RouteOptimizationResponse>;
}
export type OptimizedStop = {
  id: string;
  order: number;
  address: string;
  longitude: number | null;
  latitude: number | null;
};

