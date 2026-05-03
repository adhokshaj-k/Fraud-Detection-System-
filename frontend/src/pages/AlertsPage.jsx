import { useEffect, useState } from "react";

export default function AlertsPage({ role }) {
  const [alerts, setAlerts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [severity, setSeverity] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/alerts");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    let result = [...alerts];
    if (severity !== "ALL") result = result.filter((a) => a.severity === severity);
    if (search)
      result = result.filter(
        (a) =>
          a.message?.toLowerCase().includes(search.toLowerCase()) ||
          a.natural_language?.toLowerCase().includes(search.toLowerCase())
      );
    setFiltered(result);
  }, [alerts, severity, search]);

  const severityStyle = (s) => {
    const map = {
      CRITICAL: { bg: "#3D1010", text: "#F85149", border: "#6B1A1A" },
      HIGH: { bg: "#2D1B0E", text: "#DB6D28", border: "#5A3010" },
      MEDIUM: { bg: "#2D2610", text: "#D29922", border: "#5A4A10" },
      LOW: { bg: "#0E2D1A", text: "#3FB950", border: "#1A5A2A" }
    };
    return map[s] || map.LOW;
  };

  const counts = {
    ALL: alerts.length,
    CRITICAL: alerts.filter((a) => a.severity === "CRITICAL").length,
    HIGH: alerts.filter((a) => a.severity === "HIGH").length,
    MEDIUM: alerts.filter((a) => a.severity === "MEDIUM").length,
    LOW: alerts.filter((a) => a.severity === "LOW").length
  };

  const renderDetail = () => {
    if (!selected) return null;
    const sStyle = severityStyle(selected.severity);
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <span
            style={{
              fontSize: 12,
              padding: "4px 12px",
              background: sStyle.bg,
              border: `1px solid ${sStyle.border}`,
              borderRadius: 3,
              color: sStyle.text,
              fontWeight: 700,
              letterSpacing: "0.05em"
            }}
          >
            {selected.severity} ALERT
          </span>
          <span style={{ fontSize: 12, color: "#484F58", fontFamily: "JetBrains Mono, monospace" }}>
            {new Date(selected.created_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata"
            })}
          </span>
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, color: "#E6EDF3", lineHeight: 1.6, marginBottom: 20 }}>
          {selected.natural_language || selected.message}
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 20,
            padding: "12px 16px",
            background: "#1C2128",
            borderRadius: 6
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                color: "#8B949E",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4
              }}
            >
              RISK SCORE
            </p>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 28, fontWeight: 700, color: sStyle.text, margin: 0 }}>
              {(selected.risk_score || 0).toFixed(1)}
            </p>
          </div>
          <div style={{ width: 1, background: "#30363D" }} />
          <div>
            <p
              style={{
                fontSize: 10,
                color: "#8B949E",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4
              }}
            >
              SEVERITY
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: sStyle.text, margin: 0 }}>{selected.severity}</p>
          </div>
        </div>

        {selected.recommended_action ? (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8B949E", marginBottom: 8 }}>
              RECOMMENDED ACTION
            </p>
            <p style={{ fontSize: 13, color: "#E6EDF3", padding: "10px 14px", background: "#1C2128", borderRadius: 4, borderLeft: "3px solid #388BFD", margin: 0 }}>
              {selected.recommended_action}
            </p>
          </div>
        ) : null}

        {role !== "AUDITOR" && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8B949E", marginBottom: 8 }}>
              ACTIONS
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={async () => {
                  if (!selected.user_id) return;
                  if (!window.confirm("Freeze this user's account?")) return;
                  await fetch(`http://localhost:8000/api/users/${selected.user_id}/freeze`, { method: "POST" });
                  alert("Account frozen.");
                }}
                style={{
                  height: 32,
                  padding: "0 14px",
                  background: "transparent",
                  border: "1px solid #F85149",
                  borderRadius: 4,
                  color: "#F85149",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                🔒 Freeze Account
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!selected.user_id) return;
                  await fetch(`http://localhost:8000/api/reports/generate/${selected.user_id}`, { method: "POST" });
                  alert("Report generated! Check Reports page.");
                }}
                style={{
                  height: 32,
                  padding: "0 14px",
                  background: "transparent",
                  border: "1px solid #3FB950",
                  borderRadius: 4,
                  color: "#3FB950",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                📄 Generate Report
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", gap: 12, height: "calc(100vh - 80px)" }}>
      <div
        style={{
          width: 380,
          flexShrink: 0,
          background: "#161B22",
          border: "1px solid #30363D",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #30363D" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#8B949E",
              marginBottom: 10
            }}
          >
            SECURITY ALERTS
          </p>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts..."
            style={{
              width: "100%",
              height: 28,
              padding: "0 10px",
              background: "#21262D",
              border: "1px solid #30363D",
              borderRadius: 4,
              color: "#E6EDF3",
              fontSize: 12,
              marginBottom: 8,
              boxSizing: "border-box"
            }}
          />

          <div style={{ display: "flex", gap: 4 }}>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                style={{
                  flex: 1,
                  height: 24,
                  background: severity === s ? "#1F3358" : "transparent",
                  border: `1px solid ${severity === s ? "#388BFD" : "#30363D"}`,
                  borderRadius: 3,
                  color: severity === s ? "#388BFD" : "#484F58",
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {s === "ALL" ? `ALL ${counts.ALL}` : `${s.slice(0, 4)} ${counts[s]}`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <p style={{ padding: 20, color: "#484F58", fontSize: 13, textAlign: "center" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: 20, color: "#484F58", fontSize: 13, textAlign: "center" }}>No alerts found</p>
          ) : (
            filtered.map((alert) => {
              const sStyle = severityStyle(alert.severity);
              return (
                <div
                  key={alert.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(alert)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(alert)}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #21262D",
                    cursor: "pointer",
                    background: selected?.id === alert.id ? "#1F3358" : "transparent",
                    borderLeft: selected?.id === alert.id ? "2px solid #388BFD" : "2px solid transparent"
                  }}
                  onMouseEnter={(e) => {
                    if (selected?.id !== alert.id) e.currentTarget.style.background = "#1C2128";
                  }}
                  onMouseLeave={(e) => {
                    if (selected?.id !== alert.id) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        background: sStyle.bg,
                        border: `1px solid ${sStyle.border}`,
                        borderRadius: 3,
                        color: sStyle.text,
                        fontWeight: 600
                      }}
                    >
                      {alert.severity}
                    </span>
                    <span style={{ fontSize: 11, color: "#484F58", fontFamily: "JetBrains Mono, monospace" }}>
                      {new Date(alert.created_at).toLocaleTimeString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#E6EDF3",
                      margin: "0 0 4px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {alert.natural_language || alert.message}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#484F58",
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    Risk Score: {(alert.risk_score || 0).toFixed(1)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background: "#161B22",
          border: "1px solid #30363D",
          borderRadius: 6,
          overflow: "auto"
        }}
      >
        {!selected ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 48 }}>🚨</span>
            <p style={{ color: "#8B949E", fontSize: 14 }}>Select an alert to view details</p>
            <p style={{ color: "#484F58", fontSize: 12 }}>{filtered.length} alerts total</p>
          </div>
        ) : (
          renderDetail()
        )}
      </div>
    </div>
  );
}
