import { formatIstTime } from "../utils";

function severityTiny(sev) {
  const up = String(sev || "").toUpperCase();
  const styles = {
    CRITICAL: { bg: "#3D1010", color: "#F85149", border: "#6B1A1A" },
    HIGH: { bg: "#2D1B0E", color: "#DB6D28", border: "#5A3010" },
    MEDIUM: { bg: "#2D2610", color: "#D29922", border: "#5A4A10" },
    LOW: { bg: "#0E2D1A", color: "#3FB950", border: "#1A5A2A" }
  };
  const st = styles[up] || { bg: "#21262D", color: "#8B949E", border: "#30363D" };
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 6px",
        borderRadius: 3,
        border: `1px solid ${st.border}`,
        background: st.bg,
        color: st.color,
        fontWeight: 600
      }}
    >
      {up}
    </span>
  );
}

function actionStyle(actionType) {
  const t = String(actionType || "").toUpperCase();
  switch (t) {
    case "TRANSACTION_PROCESSED":
      return "#8B949E";
    case "ALERT_FIRED":
      return "#DB6D28";
    case "USER_FROZEN":
      return "#F85149";
    case "MODEL_RETRAINED":
      return "#BC8CFF";
    case "ATTACK_INJECTED":
      return "#F85149";
    default:
      return "#E6EDF3";
  }
}

const SectionLabel = ({ children }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "#8B949E",
      marginBottom: 8,
      marginTop: 0
    }}
  >
    {children}
  </p>
);

export default function AuditLogPage({ logs }) {
  const table = logs || [];

  return (
    <div style={{ maxWidth: "calc(100vw - 220px - 32px)", overflowX: "auto", boxSizing: "border-box" }}>
      <div style={{ marginBottom: 16 }}>
        <SectionLabel>Audit log</SectionLabel>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8B949E" }}>Chronological system record</p>
      </div>

      <div style={{ minWidth: 900, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  width: 150,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "#0D1117",
                  fontSize: 11,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "#8B949E",
                  padding: "6px 12px",
                  textAlign: "left",
                  borderBottom: "2px solid #30363D"
                }}
              >
                Timestamp
              </th>
              <th
                style={{
                  width: 170,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "#0D1117",
                  fontSize: 11,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "#8B949E",
                  padding: "6px 12px",
                  textAlign: "left",
                  borderBottom: "2px solid #30363D"
                }}
              >
                Action
              </th>
              <th
                style={{
                  width: 110,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "#0D1117",
                  fontSize: 11,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "#8B949E",
                  padding: "6px 12px",
                  textAlign: "left",
                  borderBottom: "2px solid #30363D"
                }}
              >
                Actor
              </th>
              <th
                style={{
                  width: 150,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "#0D1117",
                  fontSize: 11,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "#8B949E",
                  padding: "6px 12px",
                  textAlign: "left",
                  borderBottom: "2px solid #30363D"
                }}
              >
                Target
              </th>
              <th
                style={{
                  width: 80,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "#0D1117",
                  fontSize: 11,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "#8B949E",
                  padding: "6px 12px",
                  textAlign: "left",
                  borderBottom: "2px solid #30363D"
                }}
              >
                Severity
              </th>
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "#0D1117",
                  fontSize: 11,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "#8B949E",
                  padding: "6px 12px",
                  textAlign: "left",
                  borderBottom: "2px solid #30363D"
                }}
              >
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {table.map((log) => (
              <tr
                key={log.id}
                style={{
                  borderBottom: "1px solid #21262D",
                  transition: "background 0.1s ease"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1C2128")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "0 12px", height: 36 }}>
                  <span className="mono" style={{ fontSize: 12, color: "#8B949E" }}>
                    {formatIstTime(log.created_at)}
                  </span>
                </td>
                <td
                  style={{
                    padding: "0 12px",
                    height: 36,
                    fontSize: 13,
                    color: actionStyle(log.action_type),
                    fontWeight: 600
                  }}
                >
                  {log.action_type}
                </td>
                <td style={{ padding: "0 12px", height: 36, fontSize: 13, color: "#E6EDF3" }}>{log.actor}</td>
                <td style={{ padding: "0 12px", height: 36, fontSize: 13, color: "#E6EDF3" }}>
                  {log.target_name ? `${log.target_name} (${log.target_role || "N/A"})` : "—"}
                </td>
                <td style={{ padding: "0 12px", height: 36 }}>{severityTiny(log.severity)}</td>
                <td style={{ padding: "0 12px", height: 36, fontSize: 13, color: "#8B949E", maxWidth: 360 }}>
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
