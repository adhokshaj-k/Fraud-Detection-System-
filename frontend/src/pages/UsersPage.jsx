import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";

export default function UsersPage({ role, onViewUser, onFreeze, onUnfreeze, onGenerateReport }) {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("risk_score");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = [...users];

    if (search) {
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.role?.toLowerCase().includes(search.toLowerCase()) ||
          u.department?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (roleFilter !== "ALL") {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (statusFilter !== "ALL") {
      result = result.filter((u) => (statusFilter === "FROZEN" ? u.frozen === 1 : u.status === statusFilter));
    }
    result.sort((a, b) => {
      if (sortBy === "risk_score") return (b.risk_score || 0) - (a.risk_score || 0);
      if (sortBy === "name") return a.name?.localeCompare(b.name);
      return 0;
    });

    setFiltered(result);
    setPage(1);
  }, [users, search, roleFilter, statusFilter, sortBy]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const getRiskColor = (score) => {
    if (score >= 80) return "#F85149";
    if (score >= 60) return "#DB6D28";
    if (score >= 30) return "#D29922";
    return "#3FB950";
  };

  const getInitials = (name) => name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?";

  const getAvatarColor = (name) => {
    const colors = ["#388BFD", "#3FB950", "#BC8CFF", "#DB6D28", "#F85149", "#39C5CF"];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const uniqueRoles = [...new Set(users.map((u) => u.role))];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#8B949E",
              marginBottom: 4
            }}
          >
            USER MANAGEMENT
          </p>
          <p style={{ fontSize: 12, color: "#484F58" }}>
            {filtered.length} of {users.length} users
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          style={{
            height: 28,
            padding: "0 12px",
            background: "transparent",
            border: "1px solid #30363D",
            borderRadius: 4,
            color: "#8B949E",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap"
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#484F58"
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, department..."
            style={{
              width: "100%",
              height: 32,
              paddingLeft: 28,
              paddingRight: 10,
              background: "#21262D",
              border: "1px solid #30363D",
              borderRadius: 4,
              color: "#E6EDF3",
              fontSize: 13,
              boxSizing: "border-box"
            }}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            height: 32,
            padding: "0 10px",
            background: "#21262D",
            border: "1px solid #30363D",
            borderRadius: 4,
            color: "#E6EDF3",
            fontSize: 12,
            cursor: "pointer"
          }}
        >
          <option value="ALL">All Roles</option>
          {uniqueRoles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: 32,
            padding: "0 10px",
            background: "#21262D",
            border: "1px solid #30363D",
            borderRadius: 4,
            color: "#E6EDF3",
            fontSize: 12,
            cursor: "pointer"
          }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="FROZEN">Frozen</option>
          <option value="MONITORING">Monitoring</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            height: 32,
            padding: "0 10px",
            background: "#21262D",
            border: "1px solid #30363D",
            borderRadius: 4,
            color: "#E6EDF3",
            fontSize: 12,
            cursor: "pointer"
          }}
        >
          <option value="risk_score">Sort: Risk Score</option>
          <option value="name">Sort: Name A-Z</option>
        </select>
      </div>

      <div
        style={{
          background: "#161B22",
          border: "1px solid #30363D",
          borderRadius: 6,
          overflow: "hidden"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0D1117" }}>
              {["User", "Department", "Role", "Risk Score", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#8B949E",
                    borderBottom: "2px solid #30363D"
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} style={{ padding: "12px" }}>
                      <div
                        style={{
                          height: 16,
                          background: "#21262D",
                          borderRadius: 3,
                          animation: "pulse 1.5s infinite"
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              paginated.map((user) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: "1px solid #21262D",
                    cursor: "pointer",
                    background: user.frozen === 1 ? "rgba(248,81,73,0.03)" : "transparent"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1C2128")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = user.frozen === 1 ? "rgba(248,81,73,0.03)" : "transparent")
                  }
                >
                  <td style={{ padding: "0 12px", height: 48 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: getAvatarColor(user.name),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "white",
                          flexShrink: 0,
                          textTransform: "uppercase"
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#E6EDF3", margin: 0 }}>{user.name}</p>
                        <p style={{ fontSize: 11, color: "#484F58", margin: 0 }}>{user.city || "—"}</p>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: "0 12px", fontSize: 13, color: "#8B949E" }}>{user.department || "—"}</td>

                  <td style={{ padding: "0 12px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: "#21262D",
                        border: "1px solid #30363D",
                        borderRadius: 3,
                        color: "#8B949E"
                      }}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td style={{ padding: "0 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 80, height: 4, background: "#21262D", borderRadius: 2 }}>
                        <div
                          style={{
                            width: `${Math.min(user.risk_score || 0, 100)}%`,
                            height: "100%",
                            borderRadius: 2,
                            background: getRiskColor(user.risk_score || 0)
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 13,
                          fontWeight: 600,
                          color: getRiskColor(user.risk_score || 0)
                        }}
                      >
                        {(user.risk_score || 0).toFixed(1)}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0 12px" }}>
                    {user.frozen === 1 ? (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          background: "#3D1010",
                          border: "1px solid #6B1A1A",
                          borderRadius: 3,
                          color: "#F85149",
                          textTransform: "uppercase"
                        }}
                      >
                        FROZEN
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          background: "#0E2D1A",
                          border: "1px solid #1A5A2A",
                          borderRadius: 3,
                          color: "#3FB950",
                          textTransform: "uppercase"
                        }}
                      >
                        {user.status || "ACTIVE"}
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "0 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewUser && onViewUser(user);
                        }}
                        title="View Details"
                        style={{
                          width: 28,
                          height: 28,
                          background: "transparent",
                          border: "1px solid #30363D",
                          borderRadius: 4,
                          cursor: "pointer",
                          color: "#8B949E",
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        👁
                      </button>

                      {role !== "AUDITOR" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (user.frozen === 1) {
                              onUnfreeze && onUnfreeze(user.id);
                            } else if (window.confirm(`Freeze ${user.name}?`)) {
                              onFreeze && onFreeze(user.id);
                            }
                          }}
                          title={user.frozen ? "Unfreeze" : "Freeze"}
                          style={{
                            width: 28,
                            height: 28,
                            background: "transparent",
                            border: `1px solid ${user.frozen ? "#3FB950" : "#30363D"}`,
                            borderRadius: 4,
                            cursor: "pointer",
                            color: user.frozen ? "#3FB950" : "#8B949E",
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          {user.frozen ? "🔓" : "🔒"}
                        </button>
                      )}

                      {role !== "AUDITOR" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onGenerateReport && onGenerateReport(user.id);
                          }}
                          title="Generate Report"
                          style={{
                            width: 28,
                            height: 28,
                            background: "transparent",
                            border: "1px solid #30363D",
                            borderRadius: 4,
                            cursor: "pointer",
                            color: "#8B949E",
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          📄
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderTop: "1px solid #21262D"
            }}
          >
            <span style={{ fontSize: 12, color: "#484F58" }}>
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  height: 28,
                  padding: "0 10px",
                  background: "transparent",
                  border: "1px solid #30363D",
                  borderRadius: 4,
                  color: "#8B949E",
                  fontSize: 12,
                  cursor: "pointer",
                  opacity: page === 1 ? 0.4 : 1
                }}
              >
                ← Prev
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i + 1)}
                  style={{
                    width: 28,
                    height: 28,
                    background: page === i + 1 ? "#1F3358" : "transparent",
                    border: `1px solid ${page === i + 1 ? "#388BFD" : "#30363D"}`,
                    borderRadius: 4,
                    color: page === i + 1 ? "#388BFD" : "#8B949E",
                    fontSize: 12,
                    cursor: "pointer"
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  height: 28,
                  padding: "0 10px",
                  background: "transparent",
                  border: "1px solid #30363D",
                  borderRadius: 4,
                  color: "#8B949E",
                  fontSize: 12,
                  cursor: "pointer",
                  opacity: page === totalPages ? 0.4 : 1
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
