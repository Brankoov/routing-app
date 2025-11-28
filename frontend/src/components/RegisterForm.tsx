import { useState } from "react";
import { registerUser } from "../api/authClient";

// NYTT: Ta emot onClose för att stänga modalen
type Props = {
  onClose: () => void;
};

export function RegisterForm({ onClose }: Props) {
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
    <div className="card" style={{ width: "300px", margin: "0 auto", textAlign: "left", position: 'relative' }}>
      
      {/* Stäng-knapp (Kryss) */}
      <button 
        onClick={onClose}
        style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            color: '#999',
            padding: '0 8px'
        }}
      >
        &times;
      </button>

      <h3 style={{marginTop: 0, textAlign: 'center'}}>Ny Användare</h3>
      
      <form onSubmit={handleRegister} style={{ display: "grid", gap: "1rem", marginTop: '1rem' }}>
        <div>
            <label>Välj Användarnamn</label>
            <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
            />
        </div>
        
        <div>
            <label>Välj Lösenord</label>
            <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                minLength={4}
            />
        </div>

        <button type="submit" className="primary-btn" disabled={loading} style={{background: loading ? '#ccc' : '#333'}}>
          {loading ? "Skapar..." : "Registrera"}
        </button>
      </form>

      {msg && (
        <div style={{textAlign: 'center', marginTop: '1rem'}}>
            <p style={{ 
            color: msg.isError ? "red" : "green",
            fontWeight: "bold",
            marginBottom: '0.5rem'
            }}>
            {msg.text}
            </p>
            {/* Om det gick bra, visa en knapp för att gå till login */}
            {!msg.isError && (
                <button onClick={onClose} style={{background: '#e0f2f1', color: '#00695c', width: '100%'}}>
                    Gå till inloggning
                </button>
            )}
        </div>
      )}
    </div>
  );
}