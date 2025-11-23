import { useState } from "react";
import { loginUser } from "../api/authClient";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setToken(null);

    try {
      const jwt = await loginUser({ username, password });
      
      // Sparar token och laddar om - precis som förut!
      localStorage.setItem("jwt_token", jwt);
      setToken(jwt);
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (err) {
      setError("Inloggning misslyckades. Fel användarnamn eller lösenord?");
    }
  }

  return (
    <div className="card" style={{ maxWidth: "300px", margin: "0 auto", textAlign: "left" }}>
      <h3 style={{marginTop: 0}}>🔑 Logga in</h3>
      <form onSubmit={handleLogin} style={{ display: "grid", gap: "1rem" }}>
        <label>
          Användarnamn
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            style={{ marginTop: "0.25rem" }}
          />
        </label>
        
        <label>
          Lösenord
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={{ marginTop: "0.25rem" }}
          />
        </label>

        <button type="submit" className="primary-btn">
          Logga in
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {token && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ color: "green", fontWeight: "bold" }}>Inloggad! ✅</p>
        </div>
      )}
    </div>
  );
}