import { useEffect, useMemo, useState } from "react";
import {
  getAllUsers,
  toggleUserBan,
  getUserRoutesAdmin,
  User,
  SavedRoute,
  formatDuration,
} from "../api/routeClient";

interface AdminPanelProps {
  onEditRoute: (route: SavedRoute) => void;
  isDarkMode: boolean;
}

export default function AdminPanel({ onEditRoute, isDarkMode }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modaler
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoutes, setUserRoutes] = useState<SavedRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [userToConfirmBan, setUserToConfirmBan] = useState<User | null>(null);

  // Search / Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "BANNED">("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "USER" | "ADMIN">("ALL");

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data.sort((a, b) => b.id - a.id));
    } catch {
      setError("Endast för Gudar ⚡");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoutes = async (user: User) => {
    setSelectedUser(user);
    setLoadingRoutes(true);
    setUserRoutes([]);
    try {
      const routes = await getUserRoutesAdmin(user.username);
      setUserRoutes(routes);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const confirmBanExecution = async () => {
    if (!userToConfirmBan) return;
    await toggleUserBan(userToConfirmBan.id);
    setUsers((prev) =>
      prev.map((u) => (u.id === userToConfirmBan.id ? { ...u, enabled: !u.enabled } : u))
    );
    setUserToConfirmBan(null);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        String(u.id).includes(search);

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.enabled) ||
        (statusFilter === "BANNED" && !u.enabled);

      const matchRole = roleFilter === "ALL" || u.role === roleFilter;

      return matchSearch && matchStatus && matchRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  // --- FÄRGPALETT (mörkgrå, som din bild 1) ---
  const colors = {
    cardBg: isDarkMode ? "#1f2937" : "white", // gray-800
    cardBgRaised: isDarkMode ? "#111827" : "#ffffff", // gray-900 (för inner panels)
    inputBg: isDarkMode ? "#111827" : "white",
    border: isDarkMode ? "#374151" : "#e5e7eb",
    textMain: isDarkMode ? "#f3f4f6" : "#1f2937",
    textSub: isDarkMode ? "#9ca3af" : "#6b7280",
    bgLight: "#f9fafb",
  };

  // Gemensam stil för kort
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.cardBg,
    color: colors.textMain,
    border: `1px solid ${colors.border}`,
    boxShadow: isDarkMode
      ? "0 10px 25px rgba(0,0,0,0.55)"
      : "0 4px 12px rgba(0,0,0,0.1)",
    borderRadius: "18px",
    marginBottom: "20px",
    transition: "all 0.3s ease",
  };

  // Gemensam stil för inputs
  const inputStyle: React.CSSProperties = {
    backgroundColor: colors.inputBg,
    color: colors.textMain,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    padding: "12px 16px",
    width: "100%",
    outline: "none",
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl font-semibold text-gray-400 animate-pulse">
          Laddar adminpanel...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-10 text-center">
        <div className="inline-block p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold border border-red-200 dark:border-red-800">
          {error}
        </div>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingBottom: "100px",
        background: isDarkMode
          ? "radial-gradient(1200px 600px at 50% -10%, rgba(99,102,241,0.16), transparent 60%), radial-gradient(900px 500px at 85% 20%, rgba(34,197,94,0.08), transparent 60%), #0b0f19"
          : colors.bgLight,
      }}
    >
      {/* Fix för dropdown options i dark mode (vissa browsers) */}
      {isDarkMode && (
        <style>{`
          select option { background-color: #111827; color: #f3f4f6; }
        `}</style>
      )}

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* HEADER */}
        <div
          className="mb-10 text-center sm:text-left border-b pb-6"
          style={{ borderColor: colors.border }}
        >
          <h1 className="text-4xl font-extrabold" style={{ color: colors.textMain }}>
            Adminpanel <span className="text-3xl">👁️</span>
          </h1>
          <p className="text-base mt-2 font-medium" style={{ color: colors.textSub }}>
            Överblick och hantering av användare
          </p>
        </div>

        {/* SÖK / FILTER KORT */}
        <div style={{ ...cardStyle, padding: "24px" }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Sök namn eller ID"
                style={inputStyle}
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="ALL">Alla statusar</option>
                <option value="ACTIVE">✅ Aktiva</option>
                <option value="BANNED">🚫 Bannade</option>
              </select>
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="ALL">Alla roller</option>
                <option value="USER">👤 Users</option>
                <option value="ADMIN">👑 Admins</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center text-sm">
            <p style={{ color: colors.textSub, fontWeight: 500 }}>
              Visar{" "}
              <span style={{ color: "#60a5fa", fontWeight: "bold" }}>
                {filteredUsers.length}
              </span>{" "}
              av {users.length} användare
            </p>
          </div>
        </div>

        {/* USER CARDS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="group relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{
                ...cardStyle,
                border: user.enabled ? `1px solid ${colors.border}` : "1px solid #7f1d1d",
                backgroundColor: user.enabled
                  ? colors.cardBg
                  : isDarkMode
                  ? "#2a1c1c"
                  : "#fff5f5",
                overflow: "hidden",
              }}
            >
              {/* Accent Line */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  user.role === "ADMIN"
                    ? "bg-gradient-to-r from-purple-500 to-indigo-600"
                    : user.enabled
                    ? "bg-gradient-to-r from-green-400 to-emerald-600"
                    : "bg-gradient-to-r from-red-500 to-orange-500"
                }`}
              />

              <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mt-1">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.textMain }}>
                      {user.username}
                    </h3>

                    {/* Badges */}
                    <div className="flex gap-2">
                      {user.role === "ADMIN" && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          ADMIN
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                          user.enabled
                            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                            : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                        }`}
                      >
                        {user.enabled ? "AKTIV" : "BANNAD"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-3 mt-2 text-sm font-mono"
                    style={{ color: colors.textSub }}
                  >
                    <span
                      style={{
                        backgroundColor: colors.cardBgRaised,
                        padding: "2px 6px",
                        borderRadius: "6px",
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      ID: {user.id}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleViewRoutes(user)}
                    style={{
                      backgroundColor: colors.cardBgRaised,
                      color: colors.textMain,
                      border: `1px solid ${colors.border}`,
                      padding: "10px 16px",
                      borderRadius: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    className="hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    📂 Rutter
                  </button>

                  {user.role !== "ADMIN" && (
                    <button
                      onClick={() => setUserToConfirmBan(user)}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-white shadow-md transition-transform active:scale-95 ${
                        user.enabled
                          ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                          : "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      }`}
                    >
                      {user.enabled ? "Banna" : "Aktivera"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div
            className="text-center py-12 mt-6 rounded-2xl border border-dashed"
            style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
          >
            <p className="text-lg" style={{ color: colors.textSub }}>
              Inga användare matchade din sökning.
            </p>
          </div>
        )}

        {/* ROUTES MODAL (POPUP) */}
        {selectedUser && (
          <div
            className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          >
            <div
              className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl"
              style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.border}` }}
            >
              {/* Modal Header */}
              <div
                className="p-5 border-b flex justify-between items-center rounded-t-2xl"
                style={{ borderColor: colors.border, backgroundColor: colors.cardBgRaised }}
              >
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: colors.textMain }}>
                  📂 Rutter för <span style={{ color: "#60a5fa" }}>{selectedUser.username}</span>
                </h2>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 rounded-full transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                  style={{ color: colors.textSub }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar" style={{ backgroundColor: colors.cardBg }}>
                {loadingRoutes ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : userRoutes.length === 0 ? (
                  <div className="text-center py-10" style={{ color: colors.textSub }}>
                    <p className="text-4xl mb-2">📭</p>
                    <p>Denna användare har inga sparade rutter.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userRoutes.map((r) => (
                      <div
                        key={r.id}
                        className="group p-4 rounded-xl flex justify-between items-center transition-colors"
                        style={{
                          backgroundColor: colors.cardBgRaised,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        <div>
                          <p
                            className="font-bold group-hover:text-blue-400 transition-colors"
                            style={{ color: colors.textMain }}
                          >
                            {r.name}
                          </p>

                          <div className="flex gap-3 text-xs mt-1" style={{ color: colors.textSub }}>
                            <span
                              style={{
                                backgroundColor: isDarkMode ? "#1f2937" : "#eee",
                                padding: "2px 6px",
                                borderRadius: "6px",
                              }}
                            >
                              📍 {r.stops?.length || 0} stopp
                            </span>
                            <span
                              style={{
                                backgroundColor: isDarkMode ? "#1f2937" : "#eee",
                                padding: "2px 6px",
                                borderRadius: "6px",
                              }}
                            >
                              ⏱️ {r.totalDuration ? formatDuration(r.totalDuration) : "N/A"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedUser(null);
                            onEditRoute(r);
                          }}
                          className="px-4 py-2 rounded-lg font-bold transition-all text-sm"
                          style={{
                            backgroundColor: isDarkMode ? "#1e3a8a" : "#e0f2fe",
                            color: isDarkMode ? "#93c5fd" : "#0369a1",
                          }}
                        >
                          Redigera
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                className="p-4 border-t rounded-b-2xl text-right"
                style={{ borderColor: colors.border, backgroundColor: colors.cardBgRaised }}
              >
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-5 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                  style={{
                    backgroundColor: isDarkMode ? "#374151" : "#e5e7eb",
                    color: colors.textMain,
                  }}
                >
                  Stäng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BAN CONFIRM MODAL */}
        {userToConfirmBan && (
          <div
            className="fixed inset-0 flex items-center justify-center z-[100] p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          >
            <div
              className="rounded-2xl shadow-2xl max-w-md w-full p-6 transform scale-100 transition-transform"
              style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.border}` }}
            >
              <div className="text-center mb-6">
                <div
                  className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    userToConfirmBan.enabled
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                      : "bg-green-100 dark:bg-green-900/30 text-green-600"
                  }`}
                >
                  <span className="text-3xl">{userToConfirmBan.enabled ? "🛑" : "✅"}</span>
                </div>

                <h3 className="text-2xl font-bold mb-2" style={{ color: colors.textMain }}>
                  Bekräfta åtgärd
                </h3>
                <p style={{ color: colors.textSub }}>
                  Är du säker på att du vill {userToConfirmBan.enabled ? "banna" : "aktivera"}{" "}
                  <span className="font-bold" style={{ color: colors.textMain }}>
                    {userToConfirmBan.username}
                  </span>
                  ?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUserToConfirmBan(null)}
                  className="px-4 py-3 rounded-xl font-bold transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                  style={{
                    backgroundColor: isDarkMode ? "#374151" : "#e5e7eb",
                    color: colors.textMain,
                  }}
                >
                  Avbryt
                </button>
                <button
                  onClick={confirmBanExecution}
                  className={`px-4 py-3 rounded-xl text-white font-bold shadow-lg transition-transform active:scale-95 ${
                    userToConfirmBan.enabled ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {userToConfirmBan.enabled ? "Ja, Banna" : "Ja, Aktivera"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
