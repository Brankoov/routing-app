export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('http://localhost:8080/api/health');

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
