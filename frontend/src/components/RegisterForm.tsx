import { useState } from "react";
import { registerUser } from "../api/authClient";

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const message = await registerUser({ username, password });
      setMsg({ text: "✅ " + message, isError: false });
      setUsername("");
      setPassword("");
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Registration failed";
      setMsg({ text: "❌ " + errorText, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: "300px", margin: "0 auto", textAlign: "left" }}>
      <h3 style={{marginTop: 0}}>Skapa Konto</h3>
      <form onSubmit={handleRegister} style={{ display: "grid", gap: "1rem" }}>
        <label>
          Användarnamn
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
            style={{ marginTop: "0.25rem" }}
          />
        </label>
        
        <label>
          Lösenord
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            minLength={4}
            style={{ marginTop: "0.25rem" }}
          />
        </label>

        <button type="submit" disabled={loading} style={{background: loading ? '#ccc' : '#333', color: 'white'}}>
          {loading ? "Skapar..." : "Registrera"}
        </button>
      </form>

      {msg && (
        <p style={{ 
          marginTop: "1rem", 
          color: msg.isError ? "red" : "green",
          fontWeight: "bold"
        }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}