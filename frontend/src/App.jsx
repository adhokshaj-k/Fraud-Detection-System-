import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AIReportModal from "./components/AIReportModal";
import AuditLogPage from "./components/AuditLogPage";
import AttackTimeline from "./components/AttackTimeline";
import Dashboard from "./components/Dashboard";
import EmailAlertToast from "./components/EmailAlertToast";
import UserDetailModal from "./components/UserDetailModal";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Inbox from "./pages/Inbox";
import UsersPage from "./pages/UsersPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";

const API_BASE = "http://localhost:8000";

function parseAuthUser() {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "null");
  } catch {
    return null;
  }
}

function LoginRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    if (parseAuthUser()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <Login
      onLogin={(payload) => {
        localStorage.setItem("authUser", JSON.stringify(payload));
        navigate("/dashboard");
      }}
    />
  );
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        setCurrentUser({ name: "Investigator", role: "INVESTIGATOR" });
      }
    }
  }, []);

  const authSession = parseAuthUser();
  const userRole = String((currentUser || authSession)?.role || "AUDITOR").toUpperCase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.getAttribute("data-theme") !== "light");

  useEffect(() => {
    const t = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", t);
    setIsDarkMode(t !== "light");
  }, []);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    total_users: 25,
    active_alerts: 0,
    high_risk_users: 0,
    transactions_today: 0
  });
  const [behaviour, setBehaviour] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [attackTypes, setAttackTypes] = useState([]);
  const [attackType, setAttackType] = useState("off_hours_bulk_transfer");
  const [injecting, setInjecting] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [modalUser, setModalUser] = useState(null);
  const [modalHistory, setModalHistory] = useState([]);
  const [dramaticPulse, setDramaticPulse] = useState(false);
  const [dramaticUserId, setDramaticUserId] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [heatmap, setHeatmap] = useState([]);
  const [departmentRisk, setDepartmentRisk] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [reports, setReports] = useState([]);
  const [timeline, setTimeline] = useState(null);
  const [toastAlert, setToastAlert] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [riskHistory, setRiskHistory] = useState([]);
  const [peerComparison, setPeerComparison] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const prevAlerts = useRef([]);

  const topUsers = useMemo(() => users.slice().sort((a, b) => b.risk_score - a.risk_score).slice(0, 5), [users]);

  async function fetchJson(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`Failed ${path}`);
    return res.json();
  }

  async function loadInitial() {
    setLoading(true);
    setError("");
    try {
      const [u, a, t, s, at, logs, hm, dr, rp] = await Promise.all([
        fetchJson("/api/users"),
        fetchJson("/api/alerts"),
        fetchJson("/api/transactions"),
        fetchJson("/api/dashboard/stats"),
        fetchJson("/api/attack/types"),
        fetchJson("/api/audit/logs"),
        fetchJson("/api/heatmap"),
        fetchJson("/api/departments/risk"),
        fetchJson("/api/reports/all")
      ]);
      setUsers(u);
      setAlerts(a);
      setTransactions(t);
      setStats(s);
      setAttackTypes(at);
      setAuditLogs(logs);
      setHeatmap(hm);
      setDepartmentRisk(dr);
      setReports(rp);
      const initialUser = u[0]?.id;
      setSelectedUserId(initialUser || null);
      if (initialUser) {
        const b = await fetchJson(`/api/users/${initialUser}/behaviour`);
        setBehaviour(b);
      }
    } catch (e) {
      setError(e.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    fetchJson(`/api/users/${selectedUserId}/behaviour`)
      .then(setBehaviour)
      .catch(() => {});
    fetchJson(`/api/users/${selectedUserId}/risk-history?days=7`).then(setRiskHistory).catch(() => setRiskHistory([]));
    fetchJson(`/api/users/${selectedUserId}/peer-comparison`).then(setPeerComparison).catch(() => setPeerComparison(null));
  }, [selectedUserId]);

  const [wsStatus, setWsStatus] = useState("connecting");

  useEffect(() => {
    let ws;
    let reconnectAttempts = 0;
    const maxAttempts = 10;

    function connect() {
      if (reconnectAttempts > 0) {
        console.log(`WebSocket reconnection attempt ${reconnectAttempts}/${maxAttempts}`);
        setWsStatus("reconnecting");
      } else {
        setWsStatus("connecting");
      }

      ws = new WebSocket("ws://localhost:8000/ws/live");

      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (!payload) return;
        if (payload.stats) setStats(payload.stats);
        if (payload.latest_transaction) {
          setTransactions((prev) => [payload.latest_transaction, ...prev].slice(0, 200));
        }
        if (payload.latest_alert) {
          setAlerts((prev) => [payload.latest_alert, ...prev].slice(0, 100));
        }
        if (payload.audit_log) {
          setAuditLogs((prev) => [payload.audit_log, ...prev].slice(0, 500));
        }
        if (payload.top_users) {
          setUsers((prev) => {
            const byId = Object.fromEntries(prev.map((u) => [u.id, u]));
            payload.top_users.forEach((u) => {
              byId[u.id] = { ...byId[u.id], ...u };
            });
            return Object.values(byId);
          });
        }
      };

      ws.onopen = () => {
        console.log("WebSocket connected");
        setWsStatus("connected");
        reconnectAttempts = 0;
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        if (reconnectAttempts < maxAttempts) {
          reconnectAttempts++;
          setTimeout(connect, 2000 * reconnectAttempts);
        } else {
          console.log("Max reconnection attempts reached");
          setWsStatus("failed");
          setError("WebSocket connection failed. Showing last known data.");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    const latest = alerts[0];
    if (!latest || prevAlerts.current[0]?.id === latest.id) return;
    prevAlerts.current = alerts;
    if (latest.severity === "CRITICAL") {
      setToastAlert(latest);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.start();
      setTimeout(() => osc.stop(), 180);
    }
  }, [alerts]);

  async function onInjectAttack() {
    setInjecting(true);
    try {
      for (const c of [3, 2, 1]) {
        setCountdown(c);
        await new Promise((r) => setTimeout(r, 700));
      }
      setCountdown(0);
      setDramaticPulse(true);
      const res = await fetch(`${API_BASE}/api/attack/inject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attack_type: attackType })
      });
      const data = await res.json();
      setDramaticUserId(data.user_id || null);
      const scenario = attackTypes.find((a) => a.key === attackType)?.label || "Attack";
      setTimeline([
        { time: "02:00 AM", icon: "L", description: `${scenario}: User logged in`, suspicious: true },
        { time: "02:03 AM", icon: "D", description: "Sensitive records accessed", suspicious: true },
        { time: "02:07 AM", icon: "M", description: "High-value action executed", suspicious: true },
        { time: "02:09 AM", icon: "A", description: "Flagged by AI model", suspicious: true },
        { time: "02:09 AM", icon: "E", description: "Security team notified", suspicious: true }
      ]);
      await new Promise((r) => setTimeout(r, 3500));
      await loadInitial();
      setTimeout(() => {
        setDramaticPulse(false);
        setDramaticUserId(null);
      }, 2500);
    } catch (e) {
      setError("Failed to inject attack");
      setDramaticPulse(false);
      setDramaticUserId(null);
    } finally {
      setInjecting(false);
    }
  }

  async function onUserClick(user) {
    setModalUser(user);
    setSelectedUserId(user.id);
    try {
      const history = await fetchJson(`/api/users/${user.id}/behaviour?limit=500`);
      setModalHistory(history);
    } catch {
      setModalHistory([]);
    }
  }

  function onGenerateReport(userId) {
    window.open(`${API_BASE}/api/reports/${userId}`, "_blank");
  }

  async function performFreeze(user) {
    await fetch(`${API_BASE}/api/users/${user.id}/freeze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: userRole, reason: "Manual freeze from dashboard" })
    });
    loadInitial();
  }

  async function onFreeze(user) {
    if (!confirm(`Are you sure you want to freeze ${user.name}? This will immediately suspend all their access.`)) return;
    await performFreeze(user);
  }

  async function performUnfreeze(user) {
    await fetch(`${API_BASE}/api/users/${user.id}/unfreeze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: userRole })
    });
    loadInitial();
  }

  async function onUnfreeze(user) {
    await performUnfreeze(user);
  }

  async function onGenerateAIReport(userId) {
    setAiLoading(true);
    setAiReport(null);
    try {
      const res = await fetchJson(`/api/reports/generate/${userId}`);
      setAiReport(res.content);
      await loadInitial();
    } catch {
      setError("AI report generation failed.");
    } finally {
      setAiLoading(false);
    }
  }

  async function onRetrainModel() {
    await fetch(`${API_BASE}/api/model/retrain`, { method: "POST" });
    loadInitial();
  }

  if (!authSession) {
    return <Navigate to="/" replace />;
  }

  if (userRole !== "ADMIN" && location.pathname === "/settings") {
    return <Navigate to="/dashboard" replace />;
  }

  if (userRole === "AUDITOR" && (location.pathname === "/inbox" || location.pathname === "/users")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0D1117",
          color: "#388BFD"
        }}
      >
        Loading Early Warning Dashboard...
      </div>
    );
  }

  const getPageTitle = (path) => {
    const titles = {
      "/dashboard": "Dashboard",
      "/users": "Users",
      "/alerts": "Alerts",
      "/inbox": "Inbox",
      "/reports": "Reports",
      "/audit": "Audit Log",
      "/settings": "Settings"
    };
    return titles[path] || "Dashboard";
  };

  const getBreadcrumb = (path) => {
    const crumbs = {
      "/dashboard": "Home / Dashboard",
      "/users": "Home / Users",
      "/alerts": "Home / Alerts",
      "/inbox": "Home / Inbox",
      "/reports": "Home / Reports",
      "/audit": "Home / Audit Log",
      "/settings": "Home / Settings"
    };
    return crumbs[path] || "Home / Dashboard";
  };

  const dashboardSharedProps = {
    transactions,
    behaviour,
    alerts,
    topUsers,
    users,
    role: userRole,
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
  };

  return (
    <>
      <Sidebar user={currentUser} role={userRole} />
      <TopBar
        user={currentUser}
        pageTitle={getPageTitle(location.pathname)}
        breadcrumb={getBreadcrumb(location.pathname)}
        onThemeToggle={(isLight) => setIsDarkMode(!isLight)}
        isDarkMode={isDarkMode}
      />
      <main
        style={{
          marginLeft: "220px",
          paddingTop: "48px",
          minHeight: "100vh",
          backgroundColor: "#0D1117"
        }}
      >
        {error && (
          <div
            style={{
              position: "fixed",
              top: 56,
              left: 228,
              right: 16,
              zIndex: 30,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #6B1A1A",
              background: "rgba(248,81,73,0.12)",
              color: "#F85149",
              fontSize: 13
            }}
          >
            {error}
          </div>
        )}
        <div style={{ padding: "16px" }}>
          {location.pathname === "/dashboard" && <Dashboard {...dashboardSharedProps} />}
          {location.pathname === "/users" && (
            <UsersPage
              role={userRole}
              onViewUser={onUserClick}
              onFreeze={(userId) => {
                const u = users.find((x) => x.id === userId);
                if (u) performFreeze(u);
              }}
              onUnfreeze={(userId) => {
                const u = users.find((x) => x.id === userId);
                if (u) performUnfreeze(u);
              }}
              onGenerateReport={onGenerateReport}
            />
          )}
          {location.pathname === "/alerts" && <AlertsPage role={userRole} />}
          {location.pathname === "/inbox" && <Inbox role={userRole} />}
          {location.pathname === "/reports" && <Reports reports={reports} onDownload={onGenerateReport} />}
          {location.pathname === "/audit" && <AuditLogPage logs={auditLogs} />}
          {location.pathname === "/settings" && userRole === "ADMIN" ? <SettingsPage /> : null}
        </div>
      </main>

      <UserDetailModal
        user={modalUser}
        history={modalHistory}
        riskHistory={riskHistory}
        peerComparison={peerComparison}
        role={userRole}
        onFreeze={onFreeze}
        onUnfreeze={onUnfreeze}
        onClose={() => setModalUser(null)}
      />

      <AttackTimeline timeline={timeline} onClose={() => setTimeline(null)} />

      <EmailAlertToast alert={toastAlert} onDismiss={() => setToastAlert(null)} onView={() => setEmailModal(toastAlert)} />

      {emailModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#1E2330] bg-[#0F1117] p-4">
            <h3 className="text-lg font-semibold mb-2 text-white">SecureBank Security Operations</h3>
            <p className="text-sm mb-2 text-gray-300">Subject: CRITICAL - {emailModal.name}</p>
            <p className="text-sm text-gray-400">{emailModal.natural_language || emailModal.message}</p>
            <p className="text-xs text-gray-500 mt-4">This is an automated alert from SecureBank AI Fraud Detection System.</p>
            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors"
                onClick={async () => {
                  if (!emailModal?.user_id) return;
                  try {
                    await fetch(`http://localhost:8000/api/users/${emailModal.user_id}/freeze`, { method: "POST" });
                    setEmailModal(null);
                    window.dispatchEvent(new CustomEvent("refreshUsers"));
                  } catch (err) {
                    console.error("Freeze failed:", err);
                  }
                }}
              >
                Freeze Account
              </button>
              <button className="mt-3 rounded bg-gray-800 hover:bg-gray-700 px-3 py-1 text-white" onClick={() => setEmailModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AIReportModal
        report={aiReport}
        loading={aiLoading}
        onClose={() => {
          setAiLoading(false);
          setAiReport(null);
        }}
        onDownload={() => modalUser && onGenerateReport(modalUser.id)}
      />

      {modalUser && userRole !== "AUDITOR" && (
        <button
          onClick={() => onGenerateAIReport(modalUser.id)}
          className="fixed bottom-4 right-4 z-40 rounded bg-violet-700 hover:bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Generate AI Report
        </button>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginRoute />} />
        <Route path="/dashboard" element={<AppShell />} />
        <Route path="/users" element={<AppShell />} />
        <Route path="/alerts" element={<AppShell />} />
        <Route path="/inbox" element={<AppShell />} />
        <Route path="/reports" element={<AppShell />} />
        <Route path="/audit" element={<AppShell />} />
        <Route path="/settings" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
