import { useEffect, useState } from "react";

export function CurrentUser() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      try {
        // JWT består av tre delar: Header.Payload.Signature
        // Vi tar del 2 (Payload) och avkodar den.
        const payloadBase64 = token.split('.')[1];
        const jsonString = atob(payloadBase64);
        const data = JSON.parse(jsonString);
        
        // "sub" (subject) är standardfältet för användarnamnet i JWT
        setUsername(data.sub);
      } catch (e) {
        console.error("Kunde inte läsa token", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    window.location.reload(); // Ladda om sidan för att nollställa allt
  };

  if (!username) return null; // Visa inget om man inte är inloggad

  return (
    <div style={{ 
      position: 'absolute', 
      top: '1rem', 
      right: '1rem', 
      background: '#333', 
      padding: '0.5rem 1rem', 
      borderRadius: '20px',
      border: '1px solid #555',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      fontSize: '0.9rem'
    }}>
      <span>👤 Inloggad som: <strong style={{color: '#646cff'}}>{username}</strong></span>
      <button 
        onClick={handleLogout}
        style={{
          background: 'transparent', 
          border: '1px solid #666', 
          padding: '2px 8px', 
          fontSize: '0.8rem',
          cursor: 'pointer'
        }}
      >
        Logga ut
      </button>
    </div>
  );
}