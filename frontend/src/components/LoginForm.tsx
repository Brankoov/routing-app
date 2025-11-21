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
      
      // NYTT: Spara token i webbläsaren så vi kommer åt den i API-klienten
      localStorage.setItem("jwt_token", jwt);
      
      setToken(jwt);
      
      // Ladda om sidan så att "Mina Rutter" och andra komponenter fattar att vi är inloggade
      // (I en större app använder man Context, men detta är enklast nu)
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (err) {
      setError("Inloggning misslyckades. Fel användarnamn eller lösenord?");
    }
  }

  return (
    <div style={{ 
      border: "1px solid #444", 
      padding: "1.5rem", 
      borderRadius: "8px", 
      maxWidth: "300px", 
      margin: "1rem auto",
      textAlign: "left",
      background: "#2a2a2a"
    }}>
      <h3>🔑 Logga in</h3>
      <form onSubmit={handleLogin} style={{ display: "grid", gap: "1rem" }}>
        <label>
          Användarnamn
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            style={{ width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        
        <label>
          Lösenord
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={{ width: "100%", marginTop: "0.25rem" }}
          />
        </label>

        <button type="submit" style={{ background: "#646cff", color: "white" }}>
          Logga in
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {token && (
        <div style={{ marginTop: "1rem", overflowWrap: "anywhere" }}>
          <p style={{ color: "lightgreen", fontWeight: "bold" }}>Inloggad! ✅</p>
          <small style={{ color: "#aaa" }}>Här är din JWT-token:</small>
          <div style={{ 
            background: "#111", 
            padding: "0.5rem", 
            fontSize: "0.7em", 
            border: "1px solid #555",
            marginTop: "0.25rem"
          }}>
            {token}
          </div>
        </div>
      )}
    </div>
  );
}