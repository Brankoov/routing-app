import { useState, useEffect } from "react";
import { getAllUsers, assignRouteToUser, User } from "../api/routeClient";

type Props = {
  routeId: number;
  routeName: string;
  onClose: () => void;
};

export function AssignRouteModal({ routeId, routeName, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    getAllUsers().then(setUsers).catch(console.error);
  }, []);

  const handleAssign = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await assignRouteToUser(routeId, selectedUser);
      setStatus("success");
      setTimeout(onClose, 1500); // Stäng automatiskt efter 1.5 sek
    } catch (err) {
      setStatus("error");
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000
    }}>
      <div style={{
        background: "white", padding: "25px", borderRadius: "12px", width: "350px", maxWidth: "90%",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
      }}>
        <h3 style={{marginTop: 0, marginBottom: '10px'}}>📲 Skicka rutt</h3>
        
        {status === "success" ? (
          <div style={{textAlign: 'center', color: 'green', padding: '20px'}}>
            <span style={{fontSize: '2rem'}}>✅</span>
            <p>Rutten skickad!</p>
          </div>
        ) : (
          <>
            <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '15px'}}>
              Kopiera <strong>"{routeName}"</strong> till:
            </p>

            <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
                style={{width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #ccc'}}
            >
                <option value="">-- Välj förare --</option>
                {users
                  .filter(u => u.username !== localStorage.getItem("username")) // Visa inte dig själv
                  .map(u => (
                    <option key={u.id} value={u.username}>
                        {u.username}
                    </option>
                ))}
            </select>

            {status === "error" && <p style={{color: 'red', fontSize: '0.8rem'}}>Något gick fel.</p>}

            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button onClick={onClose} style={{padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>Avbryt</button>
                <button 
                    onClick={handleAssign} 
                    disabled={!selectedUser || loading}
                    style={{padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!selectedUser || loading) ? 0.5 : 1}}
                >
                    {loading ? "Skickar..." : "Skicka"}
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}