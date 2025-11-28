import { useState } from "react";
import { loginUser } from "../api/authClient";

// NYTT: Ta emot en funktion för att öppna registrering
type Props = {
  onOpenRegister: () => void;
};

export function LoginForm({ onOpenRegister }: Props) {
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
      
      localStorage.setItem("jwt_token", jwt);
      setToken(jwt);
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (err) {
      setError("Inloggning misslyckades. Fel användarnamn eller lösenord?");
    }
  }

  return (
    <div className="card" style={{ maxWidth: "350px", margin: "0 auto", textAlign: "left" }}>
      <h3 style={{marginTop: 0, marginBottom: '1.5rem', textAlign: 'center'}}>Välkommen tillbaka 👋</h3>
      
      <form onSubmit={handleLogin} style={{ display: "grid", gap: "1.2rem" }}>
        <div>
          <label style={{marginLeft: '4px'}}>Användarnamn</label>
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            placeholder="Ditt användarnamn"
          />
        </div>
        
        <div>
          <label style={{marginLeft: '4px'}}>Lösenord</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className="primary-btn" style={{marginTop: '0.5rem'}}>
          Logga in
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: "1rem", textAlign: 'center' }}>{error}</p>}

      {token && (
        <div style={{ marginTop: "1rem", textAlign: 'center' }}>
          <p style={{ color: "green", fontWeight: "bold" }}>Inloggad! ✅</p>
        </div>
      )}

      {/* --- NYTT: LÄNK TILL REGISTRERING --- */}
      <div style={{marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1rem'}}>
        <span style={{color: '#666', fontSize: '0.9rem'}}>Har du inget konto? </span>
        <button 
            onClick={onOpenRegister}
            style={{
                background: 'none', 
                border: 'none', 
                color: '#646cff', 
                fontWeight: 'bold', 
                padding: '0 4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
            }}
        >
            Skapa ett här!
        </button>
      </div>
    </div>
  );
}