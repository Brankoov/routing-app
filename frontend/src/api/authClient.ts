export interface RegisterRequest {
  username: string;
  password: string;
}

export async function registerUser(data: RegisterRequest): Promise<string> {
  const response = await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Registration failed: ${response.status}`);
  }

  const result = await response.json();
  return result.message;
}
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export async function loginUser(data: LoginRequest): Promise<string> {
  const response = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const result = await response.json() as LoginResponse;
  return result.token;
}