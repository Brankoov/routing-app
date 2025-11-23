import { useEffect, useState } from "react";

export function CurrentUser() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const jsonString = atob(payloadBase64);
        const data = JSON.parse(jsonString);
        setUsername(data.sub);
      } catch (e) {
        console.error("Kunde inte läsa token", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    window.location.reload();
  };

  if (!username) return null;

  return (
    <div style={{ 
      position: 'absolute', 
      top: '1rem', 
      right: '1rem', 
      background: 'white', // Vit bakgrund för att matcha temat
      padding: '0.5rem 1rem', 
      borderRadius: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      fontSize: '0.9rem',
      zIndex: 2000
    }}>
      <span style={{color: '#333'}}>👤 <strong style={{color: '#646cff'}}>{username}</strong></span>
      <button 
        onClick={handleLogout}
        style={{
          background: '#ffebee', 
          color: '#c62828', 
          border: 'none', 
          padding: '4px 10px', 
          fontSize: '0.8rem',
          cursor: 'pointer',
          borderRadius: '12px'
        }}
      >
        Logga ut
      </button>
    </div>
  );
}