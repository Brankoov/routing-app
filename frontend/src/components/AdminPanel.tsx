import { useEffect, useState } from "react";
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
}

export default function AdminPanel({ onEditRoute }: AdminPanelProps) {
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
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | "ACTIVE" | "BANNED">("ALL");
  const [roleFilter, setRoleFilter] =
    useState<"ALL" | "USER" | "ADMIN">("ALL");

  useEffect(() => {
    fetchUsers();
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
      prev.map((u) =>
        u.id === userToConfirmBan.id ? { ...u, enabled: !u.enabled } : u
      )
    );
    setUserToConfirmBan(null);
  };

  const filteredUsers = users.filter((u) => {
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

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500 animate-pulse">
        Laddar adminpanel…
      </div>
    );

  if (error)
    return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 pb-28">
      {/* HEADER */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Adminpanel 👁️
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Överblick och hantering av användare
        </p>
      </div>

      {/* SEARCH / FILTER */}
      <div className="mb-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Sök namn eller ID"
            className="md:col-span-2 px-4 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="ALL">Alla statusar</option>
            <option value="ACTIVE">Aktiva</option>
            <option value="BANNED">Bannade</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="ALL">Alla roller</option>
            <option value="USER">Users</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Visar {filteredUsers.length} av {users.length} användare
        </p>
      </div>

      {/* USERS */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className={`rounded-2xl border bg-white dark:bg-gray-900 shadow-sm
              ${
                user.enabled
                  ? "border-gray-200 dark:border-gray-800"
                  : "border-red-300 dark:border-red-800"
              }`}
          >
            <div
              className={`h-1.5 rounded-t-2xl ${
                user.role === "ADMIN"
                  ? "bg-purple-600"
                  : user.enabled
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />

            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-extrabold">
                    {user.username}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-bold ${
                      user.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : user.enabled
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.role === "ADMIN"
                      ? "ADMIN"
                      : user.enabled
                      ? "AKTIV"
                      : "BANNAD"}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  ID: {user.id} • Roll: {user.role}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewRoutes(user)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
                >
                  📂 Rutter
                </button>

                {user.role !== "ADMIN" && (
                  <button
                    onClick={() => setUserToConfirmBan(user)}
                    className={`px-4 py-2 rounded-xl font-bold text-white ${
                      user.enabled
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
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

      {/* ROUTES MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
            <div className="p-5 border-b flex justify-between">
              <h2 className="text-xl font-extrabold">
                {selectedUser.username}s rutter
              </h2>
              <button onClick={() => setSelectedUser(null)}>✖</button>
            </div>

            <div className="p-5 overflow-y-auto">
              {loadingRoutes ? (
                <p className="text-center">⏳ Laddar…</p>
              ) : userRoutes.length === 0 ? (
                <p className="text-center text-gray-500">
                  Inga sparade rutter
                </p>
              ) : (
                <div className="space-y-3">
                  {userRoutes.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 border rounded-xl flex justify-between"
                    >
                      <div>
                        <p className="font-bold">{r.name}</p>
                        <p className="text-xs text-gray-500">
                          {r.stops?.length || 0} stopp •{" "}
                          {r.totalDuration
                            ? formatDuration(r.totalDuration)
                            : "N/A"}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          onEditRoute(r);
                        }}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white font-bold"
                      >
                        ✏️ Redigera
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t text-right">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAN MODAL */}
      {userToConfirmBan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-sm w-full p-6">
            <h3 className="font-extrabold text-lg mb-4">
              Bekräfta åtgärd
            </h3>
            <p className="mb-6 text-sm">
              Ändra status för{" "}
              <strong>{userToConfirmBan.username}</strong>?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToConfirmBan(null)}
                className="px-4 py-2 rounded bg-gray-300"
              >
                Avbryt
              </button>
              <button
                onClick={confirmBanExecution}
                className="px-4 py-2 rounded bg-red-600 text-white font-bold"
              >
                Bekräfta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
