import { useState, useEffect } from "react";
import { loginUser, registerUser } from "../api/authClient";
import "./AuthPage.css";

export function AuthPage() {
  const [isRegisterActive, setIsRegisterActive] = useState(false);

  // Login States
  const [loginUserStr, setLoginUserStr] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Register States
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");

  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Lås scrollen när denna sida visas
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Hantera Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      // liten konstgjord delay så trucken syns 😄
      await new Promise((r) => setTimeout(r, 800));

      const jwt = await loginUser({ username: loginUserStr, password: loginPass });
      localStorage.setItem("jwt_token", jwt);
      window.location.reload();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Fel inloggning!";
      setMsg({ text, isError: true });
      setLoading(false);
    }
  }

  // Hantera Registrering
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      await registerUser({ username: regUser, password: regPass });
      setMsg({ text: "Konto skapat! Logga in nu.", isError: false });

      setTimeout(() => {
        setIsRegisterActive(false);
        setMsg(null);
      }, 1500);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Kunde inte skapa konto.";
      setMsg({ text, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-body">
      <div className={`container ${isRegisterActive ? "right-panel-active" : ""}`} id="container">
        {/* --- LADDNINGS-RUTAN --- */}
        {loading && (
          <div className="loading-overlay">
            <div className="truck-anim">🚛💨</div>
            <div className="loading-text">{isRegisterActive ? "Skapar konto..." : "Loggar in..."}</div>
          </div>
        )}

        {/* --- REGISTRERINGS-FORMULÄR --- */}
        <div className="form-container sign-up-container">
          <form onSubmit={handleRegister}>
            <h1>Skapa konto</h1>
            <div className="social-container">
              <span style={{ fontSize: "2rem" }}>📝</span>
            </div>
            <span>Använd ditt användarnamn för registrering</span>

            <input
              type="text"
              placeholder="Användarnamn"
              value={regUser}
              onChange={(e) => setRegUser(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Lösenord"
              value={regPass}
              onChange={(e) => setRegPass(e.target.value)}
              required
            />

            <p
              className="mobile-only-link"
              onClick={() => setIsRegisterActive(false)}
              style={{ cursor: "pointer" }}
            >
              Har du redan ett konto? Logga in
            </p>

            <button type="submit" disabled={loading}>
              {loading ? "Laddar..." : "Registrera"}
            </button>

            {msg && <p className={msg.isError ? "error" : "success"}>{msg.text}</p>}
          </form>
        </div>

        {/* --- INLOGGNINGS-FORMULÄR --- */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleLogin}>
            <h1>Logga in</h1>
            <div className="social-container">
              <span style={{ fontSize: "2rem" }}>👋</span>
            </div>
            <span>Använd ditt konto</span>

            <input
              type="text"
              placeholder="Användarnamn"
              value={loginUserStr}
              onChange={(e) => setLoginUserStr(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Lösenord"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              required
            />

            <p
              className="mobile-only-link"
              onClick={() => setIsRegisterActive(true)}
              style={{ cursor: "pointer" }}
            >
              Ny här? Skapa konto
            </p>

            <button type="submit" disabled={loading}>
              Logga in
            </button>

            {msg && <p className={msg.isError ? "error" : "success"}>{msg.text}</p>}
          </form>
        </div>

        {/* --- OVERLAY --- */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>Redan medlem?</h1>
              <p>Logga in med dina uppgifter för att fortsätta köra.</p>
              <button className="ghost" onClick={() => setIsRegisterActive(false)}>
                Logga in
              </button>
            </div>

            <div className="overlay-panel overlay-right">
              <h1>Ny chaufför?</h1>
              <p>Registrera dig snabbt för att börja planera rutter.</p>
              <button className="ghost" onClick={() => setIsRegisterActive(true)}>
                Skapa konto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
