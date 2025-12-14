import { useState, useEffect, useRef } from 'react';

type Props = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

// Hjälpfunktion för att avkoda JWT och extrahera data
function decodeJwt(token: string): { username: string; role: string } | null {
  try {
    // 1. Splitta och välj payload (index 1)
    const base64Url = token.split('.')[1];
    // 2. Ersätt ogiltiga tecken
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    // 3. Avkoda Bas64 till JSON-sträng
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);
    
    // KORRIGERING: Rollen ligger under claimen 'role' i din Backend (JwtUtil.java)
    const decodedRole = payload.role || 'USER';
    
    return {
      username: payload.sub, // 'sub' är standardfältet för subject/användarnamn
      role: decodedRole 
    };

  } catch (e) {
    console.error("Kunde inte avkoda JWT:", e);
    return null;
  }
}

export function CurrentUser({ isDarkMode, toggleDarkMode }: Props) {
  const [username, setUsername] = useState("Användare");
  const [role, setRole] = useState("USER");
  const [isOpen, setIsOpen] = useState(false);
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    const storedUser = localStorage.getItem("username"); 

    if (token) {
        const decoded = decodeJwt(token);
        if (decoded) {
            setUsername(decoded.username);
            setRole(decoded.role);
            localStorage.setItem("username", decoded.username); 
        } else {
            setUsername(storedUser || "Felaktig token"); 
            setRole("GÄST");
        }
    } else {
        setUsername("Gäst");
        setRole("GÄST");
    }

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setIsOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("active_route");
    localStorage.removeItem("username");
    window.location.reload();
  };

  // Färger och Roller
  const isUserAdmin = role === 'ADMIN';
  const bgColor = isDarkMode ? '#333' : 'white';
  const textColor = isDarkMode ? 'white' : '#333';
  const borderColor = isDarkMode ? '#555' : '#eee';
  const shadow = isDarkMode ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)';

  return (
    <>
      <div 
        ref={menuRef}
        style={{
            position: 'fixed',
            top: '15px',
            right: '15px',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
        }}
      >
        {/* AVATAR */}
        <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                border: `2px solid ${isDarkMode ? (isUserAdmin ? '#ffcc00' : '#646cff') : '#fff'}`,
                backgroundColor: isUserAdmin ? '#d32f2f' : '#646cff',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s',
                transform: isOpen ? 'scale(1.05)' : 'scale(1)'
            }}
        >
            {username.charAt(0).toUpperCase()}
        </button>

        {/* DROPDOWN MENY */}
        {isOpen && (
            <div style={{
                marginTop: '10px',
                backgroundColor: bgColor,
                color: textColor,
                borderRadius: '12px',
                boxShadow: shadow,
                border: `1px solid ${borderColor}`,
                minWidth: '220px',
                overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                <div style={{
                    padding: '16px',
                    borderBottom: `1px solid ${borderColor}`,
                    backgroundColor: isDarkMode ? '#2a2a2a' : '#fafafa'
                }}>
                    <p style={{margin: 0, fontSize: '0.8rem', color: isDarkMode ? '#aaa' : '#888', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                        Inloggad som
                    </p>
                    <p style={{margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem'}}>
                        {username}
                    </p>
                    <p style={{margin: '4px 0 0 0', fontSize: '0.9rem', color: isUserAdmin ? '#ffcc00' : (isDarkMode ? '#81c784' : '#4caf50')}}>
                        Behörighet: {isUserAdmin ? 'Admin 👑' : 'Användare'}
                    </p>
                </div>

                <div style={{padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    
                    {/* TEMA-KNAPP */}
                    <button
                        onClick={toggleDarkMode}
                        style={{
                            width: '100%',
                            padding: '12px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: textColor,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#444' : '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <span>{isDarkMode ? '☀️' : '🌙'}</span>
                        {isDarkMode ? 'Ljust tema' : 'Mörkt tema'}
                    </button>

                    {/* LOGGA UT KNAPP (Öppnar nu mod rutan) */}
                    <button 
                        onClick={handleLogoutClick}
                        style={{
                            width: '100%',
                            padding: '12px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: '#d32f2f',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#3f2020' : '#ffebee'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        🚪 Logga ut
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* --- BEKRÄFTELSE-RUTAN (MODAL) --- */}
      {showLogoutModal && (
          <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0,0,0,0.5)', // Mörk bakgrund
              zIndex: 9999, // Ligger över allt annat
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(3px)'
          }}>
              <div style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  padding: '25px',
                  borderRadius: '12px',
                  boxShadow: '0 5px 20px rgba(0,0,0,0.3)',
                  maxWidth: '400px',
                  width: '90%',
                  textAlign: 'center',
                  border: `1px solid ${borderColor}`,
                  animation: 'fadeIn 0.2s ease-out'
              }}>
                  <h3 style={{marginTop: 0, marginBottom: '10px'}}>Logga ut?</h3>
                  <p style={{marginBottom: '20px', color: isDarkMode ? '#aaa' : '#666'}}>
                      Är du säker på att du vill logga ut från systemet?
                  </p>
                  
                  <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                      <button 
                          onClick={() => setShowLogoutModal(false)}
                          style={{
                              padding: '10px 20px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              backgroundColor: isDarkMode ? '#444' : '#eee',
                              color: textColor
                          }}
                      >
                          Avbryt
                      </button>
                      <button 
                          onClick={confirmLogout}
                          style={{
                              padding: '10px 20px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              backgroundColor: '#d32f2f',
                              color: 'white',
                              fontWeight: 'bold'
                          }}
                      >
                          Logga ut
                      </button>
                  </div>
              </div>
          </div>
      )}

      <style>
      {`
          @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
          }
      `}
      </style>
    </>
  );
}