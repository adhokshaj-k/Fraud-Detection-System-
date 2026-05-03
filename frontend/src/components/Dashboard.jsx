import { useEffect, useState } from "react";
import {
  Shield,
  AlertTriangle,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Play,
  RefreshCw,
  Eye,
  Lock,
  FileText
} from "lucide-react";
import ActivityHeatmap from "./ActivityHeatmap";
import BehaviourChart from "./BehaviourChart";
import { formatInr, formatIstTime } from "../utils";

const Panel = ({ children, style }) => (
  <div
    style={{
      background: "#161B22",
      border: "1px solid #30363D",
      borderRadius: 6,
      ...style
    }}
  >
    {children}
  </div>
);

const SectionLabel = ({ children, style }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "#8B949E",
      marginBottom: 8,
      marginTop: 0,
      ...(style || {})
    }}
  >
    {children}
  </p>
);

function MetricPulseCard({
  sectionLabel,
  value,
  icon: Icon,
  accent,
  trend,
  trendValue,
  subtle,
  isPulsing,
  subtitle
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const targetValue = typeof value === "number" ? value : 0;

  useEffect(() => {
    let startTime;
    let raf;
    const duration = 1200;
    const tick = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - (1 - progress) ** 4;
      setDisplayValue(Math.round(targetValue * easeOutQuart));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetValue]);

  const pos = trend === "up";
  return (
    <div
      style={{
        boxSizing: "border-box",
        background: "#161B22",
        border: "1px solid #30363D",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        padding: "14px 16px",
        position: "relative",
        ...(isPulsing
          ? { animation: "alertPulseBorder 1.8s ease-in-out infinite", boxSizing: "border-box" }
          : {})
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <SectionLabel style={{ marginBottom: 4 }}>{sectionLabel}</SectionLabel>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: pos ? "#3FB950" : "#F85149",
            display: "inline-flex",
            alignItems: "center",
            gap: 4
          }}
        >
          {pos ? <TrendingUp size={13} aria-hidden /> : <TrendingDown size={13} aria-hidden />}
          {trendValue}
        </span>
      </div>
      <p className="mono" style={{ fontSize: 28, fontWeight: 700, color: "#E6EDF3", margin: "0 0 8px" }}>
        {displayValue.toLocaleString()}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={16} color={accent} aria-hidden />
        <span style={{ fontSize: 12, color: "#8B949E" }}>{subtle}</span>
      </div>
    </div>
  );
}

function severityChip(sev) {
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
        display: "inline-block",
        fontSize: 10,
        padding: "2px 6px",
        borderRadius: 3,
        border: `1px solid ${st.border}`,
        background: st.bg,
        color: st.color,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        verticalAlign: "middle"
      }}
    >
      {up || "?"}
    </span>
  );
}

export default function Dashboard({
  transactions,
  behaviour,
  alerts,
  topUsers,
  users,
  role,
  heatmap,
  departmentRisk,
  departmentFilter,
  setDepartmentFilter,
  onGenerateReport,
  onUserClick,
  dramaticUserId,
  countdown,
  onInjectAttack,
  onRetrainModel,
  attackType,
  setAttackType,
  attackTypes,
  injecting,
  onFreeze,
  onUnfreeze,
  stats,
  wsStatus
}) {
  const [selectedTimeRange, setSelectedTimeRange] = useState("24H");
  const [alertFilter, setAlertFilter] = useState("ALL");
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [hoverUserRow, setHoverUserRow] = useState(null);
  const filteredUsers = departmentFilter === "ALL" ? users : users.filter((u) => u.department === departmentFilter);

  const roleNorm = String(role || "").toUpperCase();
  const isAuditor = roleNorm === "AUDITOR";
  const canRetrain = roleNorm === "ADMIN";

  const highRiskUsers = users.filter((u) => u.risk_score > 60).length;

  const filteredAlerts =
    alertFilter === "ALL"
      ? alerts
      : alerts.filter((a) => {
          const s = String(a.severity || "").toUpperCase();
          if (alertFilter === "CRIT") return s === "CRITICAL";
          if (alertFilter === "HIGH") return s === "HIGH";
          if (alertFilter === "MED") return s === "MEDIUM";
          return true;
        });

  useEffect(() => {
    if (demoMode) {
      const demoSteps = [
        { delay: 0, action: () => setDemoStep(1) },
        { delay: 2000, action: () => setDemoStep(2) },
        { delay: 5000, action: () => setDemoStep(3) },
        {
          delay: 8000,
          action: () => {
            setAttackType("off_hours_bulk_transfer");
            setDemoStep(4);
          }
        },
        {
          delay: 10000,
          action: () => {
            onInjectAttack();
            setDemoStep(5);
          }
        },
        { delay: 13000, action: () => setDemoStep(6) },
        { delay: 16000, action: () => setDemoStep(7) },
        { delay: 19000, action: () => setDemoStep(8) },
        { delay: 22000, action: () => setDemoStep(9) },
        {
          delay: 25000,
          action: () => {
            setDemoMode(false);
            setDemoStep(0);
          }
        }
      ];

      const timers = demoSteps.map((step) => setTimeout(step.action, step.delay));
      return () => timers.forEach(clearTimeout);
    }
  }, [demoMode, onInjectAttack, setAttackType]);

  useEffect(() => {
    const handleRefresh = () => {
      window.location.reload();
    };
    window.addEventListener("refreshUsers", handleRefresh);
    return () => window.removeEventListener("refreshUsers", handleRefresh);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const id = e.detail;
      const numeric = typeof id === "number" ? id : Number(id);
      const uid = Number.isFinite(numeric) ? numeric : id;
      const u = users.find((x) => x.id === uid);
      if (u) onUserClick(u);
    };
    window.addEventListener("openUser", handler);
    return () => window.removeEventListener("openUser", handler);
  }, [users, onUserClick]);

  const getInitials = (name) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";
  };

  const getAvatarHue = (name) => {
    const i = name ? name.charCodeAt(0) : 0;
    const palettes = ["#388BFD", "#3FB950", "#BC8CFF", "#DB6D28", "#D29922"];
    return palettes[Math.abs(i) % palettes.length];
  };

  const riskFill = (score) => {
    if (score > 80) return "#F85149";
    if (score > 60) return "#DB6D28";
    if (score > 40) return "#D29922";
    return "#3FB950";
  };

  const getStatusBadge = (user) => {
    if (user.frozen) return { text: "FROZEN", color: "#F85149", border: "#6B1A1A", bg: "#3D1010" };
    if (user.risk_score > 80) return { text: "MONITORING", color: "#DB6D28", border: "#5A3010", bg: "#2D1B0E" };
    return { text: "ACTIVE", color: "#3FB950", border: "#1A5A2A", bg: "#0E2D1A" };
  };

  const connLabel =
    wsStatus === "connected" ? (
      <span style={{ fontSize: 11, color: "#3FB950" }}>Live</span>
    ) : wsStatus === "failed" ? (
      <span style={{ fontSize: 11, color: "#F85149" }}>Reconnecting failed</span>
    ) : (
      <span style={{ fontSize: 11, color: "#D29922" }}>Connecting…</span>
    );

  const chevronSvg =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%238B949E' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")";

  const slicedUsers = filteredUsers.slice(0, 10);

  const departments = [...new Set((users || []).map((u) => u.department).filter(Boolean))].sort();

  const chevronDept =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%238B949E' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")";

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {isAuditor ? (
        <div
          style={{
            padding: "6px 14px",
            background: "#2D2610",
            border: "1px solid #5A4A10",
            borderRadius: 4,
            fontSize: 12,
            color: "#D29922",
            marginBottom: 12,
            boxSizing: "border-box"
          }}
        >
          👁 Read-Only Mode — Auditor access
        </div>
      ) : null}
      {/* ROW 1 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 12,
          alignItems: "stretch"
        }}
      >
        <MetricPulseCard
          sectionLabel="Users monitored"
          value={stats.total_users}
          icon={Shield}
          accent="#388BFD"
          trend="up"
          trendValue="+12%"
          subtitle="Under continuous behaviour scoring"
        />
        <MetricPulseCard
          sectionLabel="Active alerts"
          value={stats.active_alerts}
          icon={AlertTriangle}
          accent="#F85149"
          trend="up"
          trendValue="+8%"
          subtitle="Unresolved security events"
          isPulsing={stats.active_alerts > 0}
        />
        <MetricPulseCard
          sectionLabel="High risk users"
          value={highRiskUsers}
          icon={AlertTriangle}
          accent="#DB6D28"
          trend="down"
          trendValue="-3%"
          subtitle={`Score above policy threshold`}
        />
        <MetricPulseCard
          sectionLabel="Transactions today"
          value={stats.transactions_today}
          icon={Activity}
          accent="#3FB950"
          trend="up"
          trendValue="+15%"
          subtitle="Synthetic + live feed volume"
        />
      </div>

      {/* ROW 2 Heatmap */}
      <Panel style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <SectionLabel style={{ marginBottom: 0 }}>Anomaly heatmap</SectionLabel>
          <span style={{ fontSize: 12, color: "#8B949E" }}>Department × Hour</span>
        </div>
        <ActivityHeatmap data={heatmap} />
      </Panel>

      {/* ROW 3 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 40%) minmax(0, 35%) minmax(0, 25%)",
          gap: 12,
          marginBottom: 12,
          alignItems: "stretch"
        }}
      >
        <Panel style={{ padding: "12px 0 0", minHeight: 320, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "0 12px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SectionLabel style={{ marginBottom: 0 }}>Live transactions</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3FB950" }} title="Streaming" />
              {connLabel}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 360 }}>
            {transactions.slice(0, 22).map((tx, idx) => {
              const flagged = !!(tx.is_attack || tx.failed_logins > 6);
              const name = tx.name || tx.user_name || "?";
              return (
                <div
                  key={tx.id}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderBottom: "1px solid #21262D",
                    cursor: "default",
                    background: flagged ? "rgba(248,81,73,0.06)" : "transparent",
                    borderLeft: flagged ? "2px solid #F85149" : "2px solid transparent",
                    animation: `txSlideIn 0.35s ease-out ${idx * 0.02}s both`
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = flagged ? "#1C2128" : "#1C2128")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = flagged ? "rgba(248,81,73,0.06)" : "transparent")
                  }
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      fontSize: 11,
                      fontWeight: 600,
                      background: getAvatarHue(name),
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      color: "#0D1117"
                    }}
                  >
                    {getInitials(name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#E6EDF3" }}>{name}</div>
                    <span
                      style={{
                        fontSize: 11,
                        background: "#21262D",
                        border: "1px solid #30363D",
                        borderRadius: 3,
                        padding: "2px 6px",
                        color: "#8B949E",
                        marginTop: 4,
                        display: "inline-block"
                      }}
                    >
                      {tx.module}
                    </span>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 13,
                      flexShrink: 0,
                      color: flagged ? "#F85149" : "#3FB950",
                      fontWeight: 600
                    }}
                  >
                    {formatInr(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel style={{ padding: "12px 12px 8px", minHeight: 320, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <SectionLabel style={{ marginBottom: 0 }}>Behaviour analysis</SectionLabel>
            <div style={{ display: "flex", gap: 6 }}>
              {["24H", "7D", "30D"].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setSelectedTimeRange(range)}
                  style={{
                    background: selectedTimeRange === range ? "transparent" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 0",
                    fontSize: 11,
                    marginLeft: 4,
                    borderBottom:
                      selectedTimeRange === range ? "2px solid #388BFD" : "2px solid transparent",
                    borderRadius: 0,
                    color: selectedTimeRange === range ? "#388BFD" : "#8B949E",
                    boxSizing: "border-box",
                    paddingBottom: 2
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#484F58", marginBottom: 6 }}>
            Showing {selectedTimeRange} behavioural scores for selected user ({behaviour?.length ?? 0} points)
          </div>
          <div style={{ flex: 1, minHeight: 240 }}>
            <BehaviourChart behaviour={behaviour || []} />
          </div>
        </Panel>

        <Panel style={{ padding: "12px 0 0", minHeight: 320, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "0 12px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SectionLabel style={{ marginBottom: 0 }}>Alerts</SectionLabel>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F85149", animation: "alertPulseBorder 2s infinite" }} />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["ALL", "CRIT", "HIGH", "MED"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAlertFilter(f)}
                  style={{
                    background: alertFilter === f ? "#1F3358" : "transparent",
                    border: alertFilter === f ? "1px solid #388BFD" : "1px solid #30363D",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: 3,
                    fontSize: 10,
                    color: alertFilter === f ? "#388BFD" : "#8B949E",
                    fontWeight: 600
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 340 }}>
            {filteredAlerts.slice(0, 25).map((alert) => {
              const strong = alert.severity === "CRITICAL" || alert.severity === "HIGH";
              return (
                <div
                  key={alert.id}
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #21262D",
                    cursor: "pointer",
                    transition: "background 0.1s ease",
                    borderLeft: strong ? "2px solid #388BFD" : "none"
                  }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.background = "#1C2128")}
                  onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    {severityChip(alert.severity)}
                    <span className="mono" style={{ fontSize: 11, color: "#8B949E" }}>
                      {formatIstTime(alert.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#E6EDF3", marginTop: 4 }}>
                    {(users.find((u) => u.id === alert.user_id) || {}).name || `User ${alert.user_id ?? ""}`}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#8B949E",
                      marginTop: 4,
                      lineHeight: 1.35,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    {alert.natural_language || alert.message || ""}
                  </div>
                  {alert.recommended_action ? (
                    <div style={{ fontSize: 11, color: "#388BFD", marginTop: 4 }}>{alert.recommended_action}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* ROW 4 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,65%) minmax(0,35%)",
          gap: 12,
          alignItems: "start",
          paddingBottom: 48
        }}
      >
        <Panel style={{ padding: 14, overflowX: "auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              flexWrap: "wrap",
              gap: 8
            }}
          >
            <SectionLabel style={{ marginBottom: 0 }}>User risk overview</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginLeft: "auto" }}>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{
                  height: 28,
                  padding: "0 28px 0 10px",
                  borderRadius: 4,
                  border: "1px solid #30363D",
                  background: "#21262D",
                  color: "#E6EDF3",
                  fontSize: 11,
                  cursor: "pointer",
                  appearance: "none",
                  backgroundImage: chevronDept,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 6px center"
                }}
              >
                <option value="ALL">All departments</option>
                {departmentRisk?.length > 0
                  ? [...new Map(departmentRisk.map((dr) => [dr.department, dr])).values()].map((dr) => (
                      <option key={dr.department} value={dr.department}>
                        {dr.department}
                      </option>
                    ))
                  : departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
              </select>
              <span className="mono" style={{ fontSize: 11, color: "#8B949E" }}>
                Showing {slicedUsers.length ? `1-${slicedUsers.length}` : "0"} of {filteredUsers.length}
              </span>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #30363D" }}>
                {["User", "Role", "Risk score", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      fontWeight: 600,
                      color: "#8B949E",
                      padding: "8px 12px",
                      textAlign: "left"
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slicedUsers.map((user) => {
                const status = getStatusBadge(user);
                const dramatic = dramaticUserId === user.id;
                const showAct = hoverUserRow === user.id;
                return (
                  <tr
                    key={user.id}
                    onMouseEnter={(ev) => {
                      setHoverUserRow(user.id);
                      if (!dramatic) ev.currentTarget.style.background = "#161B22";
                    }}
                    onMouseLeave={(ev) => {
                      setHoverUserRow(null);
                      ev.currentTarget.style.background = dramatic ? "rgba(248,81,73,0.08)" : "transparent";
                    }}
                    style={{
                      borderBottom: "1px solid #21262D",
                      background: dramatic ? "rgba(248,81,73,0.08)" : "transparent",
                      transition: "background 0.1s ease"
                    }}
                  >
                    <td style={{ padding: "0 12px", height: 44 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: getAvatarHue(user.name),
                            color: "#0D1117",
                            fontWeight: 600,
                            fontSize: 11,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0
                          }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#E6EDF3" }}>{user.name}</div>
                          <div style={{ fontSize: 11, color: "#8B949E" }}>{user.department || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "0 12px", height: 44 }}>
                      <span
                        style={{
                          fontSize: 12,
                          background: "#21262D",
                          border: "1px solid #30363D",
                          borderRadius: 3,
                          padding: "4px 8px",
                          color: "#E6EDF3"
                        }}
                      >
                        {user.role || "USER"}
                      </span>
                    </td>
                    <td style={{ padding: "0 12px", height: 44 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 80, height: 4, background: "#21262D", borderRadius: 2, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.min(100, user.risk_score)}%`,
                              height: "100%",
                              borderRadius: 2,
                              background: riskFill(user.risk_score)
                            }}
                          />
                        </div>
                        <span
                          className="mono"
                          style={{ fontSize: 13, fontWeight: 600, color: riskFill(user.risk_score), minWidth: 28 }}
                        >
                          {Math.round(user.risk_score)}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "0 12px", height: 44 }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 3,
                          border: `1px solid ${status.border}`,
                          background: status.bg,
                          color: status.color,
                          fontWeight: 600
                        }}
                      >
                        {status.text}
                      </span>
                    </td>
                    <td style={{ padding: "0 12px", height: 44, textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 4,
                          opacity: showAct || dramatic ? 1 : 0,
                          transition: "opacity 0.12s ease"
                        }}
                      >
                        {(isAuditor ? [{ Icon: Eye, ix: 0 }] : [{ Icon: Eye, ix: 0 }, { Icon: Lock, ix: 1 }, { Icon: FileText, ix: 2 }]).map(({ Icon: Ic, ix }) => (
                          <button
                            key={`${user.id}-${ix}`}
                            type="button"
                            title={["View details", user.frozen ? "Unfreeze" : "Freeze", "Open report"][ix]}
                            onClick={() => {
                              if (ix === 0) onUserClick(user);
                              else if (ix === 1) user.frozen ? onUnfreeze(user) : onFreeze(user);
                              else onGenerateReport(user.id);
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 4,
                              border: "1px solid #30363D",
                              background: "transparent",
                              color: "#8B949E",
                              cursor: "pointer",
                              display: "grid",
                              placeItems: "center",
                              padding: 0,
                              opacity: ix === 1 && user.frozen ? 0.4 : 1
                            }}
                          >
                            <Ic size={16} />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 6 }}>
            {["Previous", "1", "Next"].map((label, i) => (
              <button
                key={label}
                type="button"
                style={{
                  minWidth: 28,
                  height: 28,
                  borderRadius: 4,
                  border: "1px solid #30363D",
                  fontSize: 11,
                  color: i === 1 ? "#0D1117" : "#8B949E",
                  cursor: i === 1 ? "default" : "pointer",
                  background: i === 1 ? "#388BFD" : "transparent",
                  padding: i === 1 ? undefined : "0 8px"
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Panel style={{ padding: 14 }}>
            <SectionLabel>Attack simulator</SectionLabel>
            {isAuditor ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "#8B949E" }}>
                <Lock style={{ margin: "0 auto 8px", display: "block" }} size={28} strokeWidth={1.5} />
                Read-only for auditor roles
              </div>
            ) : (
              <>
                <select
                  value={attackType}
                  onChange={(e) => setAttackType(e.target.value)}
                  style={{
                    height: 32,
                    width: "100%",
                    backgroundColor: "#21262D",
                    border: "1px solid #30363D",
                    borderRadius: 4,
                    padding: "0 10px",
                    fontSize: 13,
                    color: "#E6EDF3",
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: chevronSvg,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center"
                  }}
                >
                  {(attackTypes || []).map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={injecting}
                  onClick={onInjectAttack}
                  style={{
                    width: "100%",
                    height: 34,
                    marginTop: 8,
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    cursor: injecting ? "not-allowed" : "pointer",
                    background: injecting ? "#30363D" : "linear-gradient(135deg, #F85149, #DB6D28)",
                    opacity: injecting ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => !injecting && (e.target.style.opacity = "0.9")}
                  onMouseLeave={(e) => !injecting && (e.target.style.opacity = "1")}
                >
                  {injecting ? countdown ? `Injecting attack in ${countdown}…` : "Injecting…" : (
                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
                      <Play size={16} aria-hidden /> Launch simulated attack
                    </span>
                  )}
                </button>
                {countdown > 0 && (
                  <div style={{ width: "100%", background: "#21262D", height: 4, borderRadius: 2, marginTop: 10 }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 2,
                        width: `${((3 - countdown + 1) / 3) * 100}%`,
                        background: "linear-gradient(90deg,#F85149,#DB6D28)"
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </Panel>

          <Panel style={{ padding: 14 }}>
            <SectionLabel>Top risk users</SectionLabel>
            <div>
              {(topUsers || []).slice(0, 5).map((user, rk) => (
                <div
                  key={user.id}
                  onClick={() => onUserClick(user)}
                  role="presentation"
                  style={{
                    height: 32,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 6,
                    cursor: "pointer"
                  }}
                >
                  <span className="mono" style={{ width: 22, fontSize: 11, color: "#484F58" }}>
                    {(rk + 1).toString().padStart(2, "0")}
                  </span>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: getAvatarHue(user.name),
                      color: "#0D1117",
                      fontWeight: 600,
                      fontSize: 9,
                      display: "grid",
                      placeItems: "center"
                    }}
                  >
                    {getInitials(user.name).slice(0, 2)}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: "#E6EDF3", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {user.name}
                  </span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: riskFill(user.risk_score) }}>
                    {Math.round(user.risk_score)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel style={{ padding: 14 }}>
            <SectionLabel>Model statistics</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 12px", rowGap: 6 }}>
              {[
                ["Model type", "Isolation Forest"],
                ["Accuracy", "94.2%"],
                ["False positive", "< 3%"],
                ["Features", "8 behavioral"],
                ["Anomalies today", String(alerts.length)],
                ["Last trained", formatIstTime(new Date(Date.now() - 2 * 3600 * 1000).toISOString()) || " recent"]
              ].map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", color: "#8B949E" }}>{k}</span>
                  <span className="mono" style={{ fontSize: 13, color: "#E6EDF3", textAlign: "right" }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
            {canRetrain && (
              <button
                type="button"
                onClick={onRetrainModel}
                style={{
                  height: 28,
                  width: "100%",
                  marginTop: 8,
                  background: "transparent",
                  border: "1px solid #30363D",
                  borderRadius: 4,
                  fontSize: 13,
                  color: "#8B949E",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
                onMouseEnter={(e) => (e.target.style.background = "#1C2128")}
                onMouseLeave={(e) => (e.target.style.background = "transparent")}
              >
                <RefreshCw size={14} /> Retrain model
              </button>
            )}
          </Panel>
        </div>
      </div>

      {/* Demo */}
      {!isAuditor ? (
        <button
          type="button"
          onClick={() => setDemoMode(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #30363D",
            background: "#161B22",
            color: "#E6EDF3",
            cursor: "pointer",
            fontSize: 13
          }}
        >
          Demo mode
        </button>
      ) : null}

      {demoMode ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            padding: 16,
            boxSizing: "border-box"
          }}
        >
          <Panel style={{ maxWidth: 420, padding: 20, width: "100%" }}>
            <h3 style={{ marginTop: 0, color: "#E6EDF3", fontSize: 17 }}>Demo sequence</h3>
            <p style={{ color: "#8B949E", fontSize: 14, marginBottom: 12 }}>
              {(demoStep === 1 || demoStep === 0) &&
                demoStep !== 10 &&
                "Monitoring stack initialised"}
              {demoStep === 2 && "Realtime transactions streaming"}
              {demoStep === 3 && "Heatmap updating behavioural baselines"}
              {demoStep === 4 && "Selecting off-hours bulk transfer scenario"}
              {demoStep === 5 && "Model scoring suspicious cluster"}
              {demoStep === 6 && "Incident routing to inbox"}
              {demoStep >= 7 && demoStep <= 9 && "Workflow guidance & reporting"}
              {demoStep >= 10 && "Completed"}
            </p>
            <div style={{ width: "100%", height: 6, borderRadius: 3, background: "#21262D", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min((demoStep / 9) * 100, 100)}%`, background: "#388BFD" }} />
            </div>
            <button
              type="button"
              onClick={() => {
                setDemoMode(false);
                setDemoStep(0);
              }}
              style={{
                marginTop: 14,
                width: "100%",
                height: 34,
                borderRadius: 4,
                border: "none",
                background: "#21262D",
                color: "#E6EDF3",
                cursor: "pointer"
              }}
            >
              Skip
            </button>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
