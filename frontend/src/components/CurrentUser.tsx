import { useState, useEffect, useRef } from 'react';

type Props = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

export function CurrentUser({ isDarkMode, toggleDarkMode }: Props) {
  const [username, setUsername] = useState("Användare");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("username"); 
    if (storedUser) setUsername(storedUser);
    else setUsername("Admin");

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (confirm("Vill du logga ut?")) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("active_route");
      window.location.reload();
    }
  };

  // Färger för menyn
  const bgColor = isDarkMode ? '#333' : 'white';
  const textColor = isDarkMode ? 'white' : '#333';
  const borderColor = isDarkMode ? '#555' : '#eee';
  const shadow = isDarkMode ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)';

  return (
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
            border: `2px solid ${isDarkMode ? '#646cff' : '#fff'}`,
            backgroundColor: '#646cff',
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

      {/* DROPDOWN */}
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
                <p style={{margin: 0, fontSize: '0.8rem', color: isDarkMode ? '#aaa' : '#888', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Inloggad som</p>
                <p style={{margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem'}}>{username}</p>
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

                {/* LOGGA UT */}
                <button 
                    onClick={handleLogout}
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
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}