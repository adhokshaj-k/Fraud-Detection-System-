import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Star, CheckCircle, Archive, Trash2, AlertTriangle, Search } from "lucide-react";
import { formatIstTime } from "../utils";

function severityDot(color) {
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />;
}

function largeSeverityBadge(sev) {
  const up = String(sev || "").toUpperCase();
  const map = {
    CRITICAL: { bg: "#3D1010", color: "#F85149", border: "#6B1A1A" },
    HIGH: { bg: "#2D1B0E", color: "#DB6D28", border: "#5A3010" },
    MEDIUM: { bg: "#2D2610", color: "#D29922", border: "#5A4A10" },
    LOW: { bg: "#0E2D1A", color: "#3FB950", border: "#1A5A2A" }
  };
  const st = map[up] || { bg: "#21262D", color: "#8B949E", border: "#30363D" };
  return (
    <span
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        padding: "4px 8px",
        borderRadius: 3,
        border: `1px solid ${st.border}`,
        background: st.bg,
        color: st.color,
        fontWeight: 700
      }}
      title={up}
    >
      {up}
    </span>
  );
}

export default function Inbox({ role }) {
  const navigate = useNavigate();
  const inboxReadOnly = String(role || "").toUpperCase() === "AUDITOR";
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [folderCounts, setFolderCounts] = useState({
    inbox: 0,
    important: 0,
    critical: 0,
    resolved: 0,
    archived: 0
  });

  const folders = [
    { id: "inbox", label: "Inbox", icon: Mail, count: folderCounts.inbox },
    { id: "important", label: "Important", icon: Star, count: folderCounts.important },
    { id: "critical", label: "Critical Only", icon: AlertTriangle, count: folderCounts.critical },
    { id: "resolved", label: "Resolved", icon: CheckCircle, count: folderCounts.resolved },
    { id: "archived", label: "Archived", icon: Archive, count: folderCounts.archived }
  ];

  const getSeverityColors = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return "#F85149";
      case "HIGH":
        return "#DB6D28";
      case "MEDIUM":
        return "#D29922";
      case "LOW":
        return "#3FB950";
      default:
        return "#8B949E";
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  const formatFullDate = (timestamp) => formatIstTime(timestamp);

  useEffect(() => {
    const fetchEmails = async () => {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:8000/api/inbox");
        const data = await response.json();

        const counts = {
          inbox: data.filter((e) => !e.is_read && !e.is_archived).length,
          important: data.filter((e) => e.is_important && !e.is_archived).length,
          critical: data.filter((e) => e.severity === "CRITICAL" && !e.is_archived).length,
          resolved: data.filter((e) => e.is_resolved && !e.is_archived).length,
          archived: data.filter((e) => e.is_archived).length
        };

        setFolderCounts(counts);
        setEmails(data);
      } catch (error) {
        console.error("Failed to fetch emails:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

  const filteredEmails = emails.filter((email) => {
    const matchesFolder =
      selectedFolder === "inbox"
        ? !email.is_read && !email.is_archived
        : selectedFolder === "important"
          ? email.is_important && !email.is_archived
          : selectedFolder === "critical"
            ? email.severity === "CRITICAL" && !email.is_archived
            : selectedFolder === "resolved"
              ? email.is_resolved && !email.is_archived
              : selectedFolder === "archived"
                ? email.is_archived
                : true;

    const matchesSearch =
      searchQuery === "" ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.user_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFolder && matchesSearch;
  });

  const handleEmailAction = async (emailId, action) => {
    try {
      await fetch(`http://localhost:8000/api/inbox/${emailId}/${action}`, {
        method: "POST"
      });

      const response = await fetch("http://localhost:8000/api/inbox");
      const data = await response.json();
      setEmails(data);

      if (selectedEmail && selectedEmail.id === emailId) {
        const next = data.find((e) => e.id === emailId);
        setSelectedEmail(next || null);
      }
    } catch (error) {
      console.error(`Failed to ${action} email:`, error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("http://localhost:8000/api/inbox/mark-all-read", {
        method: "POST"
      });

      const response = await fetch("http://localhost:8000/api/inbox");
      const data = await response.json();
      setEmails(data);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const riskHue = (v) => {
    const score = Number(v) || 0;
    if (score > 80) return "#F85149";
    if (score > 60) return "#DB6D28";
    if (score > 40) return "#D29922";
    return "#3FB950";
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "calc(100vh - 80px)",
          color: "#8B949E"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              margin: "0 auto 12px",
              border: "3px solid #30363D",
              borderTopColor: "#388BFD",
              animation: "spin 0.8s linear infinite"
            }}
          />
          <p style={{ margin: 0 }}>Loading inbox…</p>
        </div>
      </div>
    );
  }

  const seclabel = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#E6EDF3",
    fontWeight: 600,
    margin: "0 0 8px 0",
    paddingBottom: 8,
    borderBottom: "1px solid #30363D"
  };

  return (
    <>
      <style>{`
              .inbox-act {
                width: 28px;
                height: 28px;
                display: grid;
                place-items: center;
                border: 1px solid #30363D;
                border-radius: 4px;
                background: transparent;
                color: #8b949e;
                cursor: pointer;
                padding: 0;
                transition: background 0.1s ease, color 0.1s ease;
              }
              .inbox-act:hover {
                background: #1c2128;
                color: #e6edf3;
              }
            `}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          height: "calc(100vh - 80px)",
          boxSizing: "border-box",
          border: "1px solid #30363D",
          borderRadius: 6,
          overflow: "hidden",
          background: "#0D1117"
        }}
      >
      {/* LEFT */}
      <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid #30363D", padding: "12px 0" }}>
        <p style={{ padding: "0 16px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, color: "#484F58" }}>
          Folders
        </p>
        <div style={{ marginBottom: 8 }}>
          {folders.map((folder) => {
            const Icon = folder.icon;
            const active = selectedFolder === folder.id;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolder(folder.id)}
                style={{
                  width: "calc(100% - 16px)",
                  margin: "1px 8px",
                  height: 32,
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  padding: "0 12px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "space-between",
                  background: active ? "#1F3358" : "transparent",
                  color: active ? "#388BFD" : "#8B949E",
                  transition: "background 0.1s ease, color 0.1s ease"
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "#1C2128";
                    e.currentTarget.style.color = "#E6EDF3";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#8B949E";
                  }
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icon size={15} aria-hidden />
                  <span style={{ fontSize: 13 }}>{folder.label}</span>
                </span>
                {folder.count > 0 ? (
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      background: folder.id === "inbox" && active ? "#388BFD" : "#21262D",
                      color: folder.id === "inbox" && active ? "#FFFFFF" : "#8B949E",
                      borderRadius: 10,
                      padding: "1px 6px",
                      flexShrink: 0
                    }}
                  >
                    {folder.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "0 8px" }}>
          <div style={{ position: "relative", marginTop: 8 }}>
            <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#484F58" }} />
            <input
              style={{
                margin: 0,
                height: 28,
                width: "100%",
                padding: "0 8px 0 28px",
                background: "#21262D",
                border: "1px solid #30363D",
                borderRadius: 4,
                fontSize: 12,
                color: "#E6EDF3",
                boxSizing: "border-box"
              }}
              value={searchQuery}
              placeholder="Search"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!inboxReadOnly ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              style={{
                marginTop: 8,
                height: 28,
                width: "100%",
                border: "1px solid #30363D",
                background: "transparent",
                borderRadius: 4,
                color: "#8B949E",
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              Mark All Read
            </button>
          ) : null}
        </div>
      </div>

      {/* MIDDLE */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          overflowY: "auto",
          borderRight: "1px solid #30363D",
          background: "#0D1117"
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #30363D",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "baseline",
            boxSizing: "border-box",
            background: "#0D1117"
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#E6EDF3", textTransform: "capitalize" }}>
            {folders.find((f) => f.id === selectedFolder)?.label}
          </span>
          <span style={{ fontSize: 12, color: "#8B949E" }}>
            {filteredEmails.length}{" "}
            {filteredEmails.length === 1 ? "conversation" : "conversations"}
          </span>
        </div>

        {filteredEmails.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#8B949E", fontSize: 13 }}>
            No messages in this view.
          </div>
        ) : (
          filteredEmails.map((email) => {
            const selected = selectedEmail?.id === email.id;
            const sevCol = getSeverityColors(email.severity);
            return (
              <div
                key={email.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEmail(email)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedEmail(email)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #21262D",
                  background: selected ? "#1F3358" : "transparent",
                  borderLeft: selected || !email.is_read ? "2px solid #388BFD" : "2px solid transparent",
                  transition: "background 0.1s ease"
                }}
                onMouseEnter={(e) => (!selected ? (e.currentTarget.style.background = "#1C2128") : undefined)}
                onMouseLeave={(e) => (!selected ? (e.currentTarget.style.background = "transparent") : undefined)}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {severityDot(sevCol)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 13,
                          color: "#E6EDF3",
                          fontWeight: !email.is_read ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {email.subject || "Untitled"}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: "#8B949E", flexShrink: 0 }}>
                        {formatTimeAgo(email.created_at)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "6px 0 8px",
                        fontSize: 12,
                        color: "#8B949E",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        fontWeight: !email.is_read ? 600 : 400
                      }}
                    >
                      {email.preview}
                    </p>
                    {email.user_name ? (
                      <span
                        style={{
                          fontSize: 10,
                          background: "#21262D",
                          borderRadius: 3,
                          padding: "2px 6px",
                          color: "#E6EDF3"
                        }}
                      >
                        {email.user_name}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RIGHT */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "#0D1117", display: "flex", flexDirection: "column" }}>
        {!selectedEmail ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#8B949E", padding: 16 }}>
            <Mail size={48} color="#484F58" strokeWidth={1.25} aria-hidden />
            <div style={{ fontSize: 14, marginTop: 14 }}>Select an email to read</div>
          </div>
        ) : (
          <>
            {!inboxReadOnly ? (
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #30363D",
                  display: "flex",
                  flexDirection: "row",
                  gap: 6,
                  flexWrap: "wrap"
                }}
              >
                <button type="button" title="Archive" onClick={() => handleEmailAction(selectedEmail.id, "archive")} className="inbox-act">
                  <Archive size={14} aria-hidden />
                </button>
                <button type="button" title="Star" onClick={() => handleEmailAction(selectedEmail.id, "important")} className="inbox-act">
                  <Star size={14} aria-hidden />
                </button>
                <button type="button" title="Resolve" onClick={() => handleEmailAction(selectedEmail.id, "resolve")} className="inbox-act">
                  <CheckCircle size={14} aria-hidden />
                </button>
                <button type="button" title="Archive" onClick={() => handleEmailAction(selectedEmail.id, "archive")} className="inbox-act">
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            ) : null}

            <div style={{ padding: 16, borderBottom: "1px solid #30363D", boxSizing: "border-box", background: "#0D1117" }}>
              <div style={{ marginBottom: 10 }}>{largeSeverityBadge(selectedEmail.severity)}</div>
              <h2 style={{ margin: "8px 0", fontSize: 16, fontWeight: 600, color: "#E6EDF3" }}>{selectedEmail.subject}</h2>

              <div style={{ display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", columnGap: 12, rowGap: 4, marginBottom: 12 }}>
                {[
                  ["From", "security-ai@securebank.in"],
                  ["To", "investigator@securebank.in"],
                  ["Date", formatFullDate(selectedEmail.created_at)],
                  ["User", selectedEmail.user_name || "—"]
                ].map(([k, val]) => (
                  <Fragment key={k}>
                    <span style={{ fontSize: 11, color: "#484F58", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</span>
                    <span style={{ color: "#E6EDF3", fontSize: 12 }}>{val}</span>
                  </Fragment>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: 8,
                  background: "#1C2128",
                  borderRadius: 4,
                  flexWrap: "wrap"
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: riskHue(selectedEmail.user_risk_score),
                    color: "#0D1117",
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0
                  }}
                >
                  {(selectedEmail.user_name || "?").charAt(0)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#E6EDF3" }}>{selectedEmail.user_name}</div>
                  <span style={{ fontSize: 10, background: "#21262D", borderRadius: 3, padding: "2px 6px", color: "#8B949E" }}>
                    {selectedEmail.user_role || "ROLE"}
                  </span>
                </div>
                <span
                  className="mono"
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: `1px solid ${riskHue(selectedEmail.user_risk_score)}`,
                    fontSize: 12,
                    fontWeight: 700,
                    background: "#21262D",
                    color: riskHue(selectedEmail.user_risk_score)
                  }}
                >
                  {Math.round(selectedEmail.user_risk_score || 0)}
                </span>
              </div>
            </div>

            <div style={{ padding: 16, flex: 1, boxSizing: "border-box" }}>
              <h3 style={{ ...seclabel }}>Incident summary</h3>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#E6EDF3", lineHeight: 1.6 }}>
                {typeof selectedEmail.body_html === "string"
                  ? selectedEmail.body_html.replace(/<[^>]*>/g, "")
                  : selectedEmail.preview}
              </p>

              <h3 style={{ ...seclabel }}>Risk breakdown</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "6px 10px",
                        textAlign: "left",
                        borderBottom: "2px solid #30363D",
                        fontSize: 11,
                        color: "#8B949E",
                        textTransform: "uppercase"
                      }}
                    >
                      Factor
                    </th>
                    <th
                      style={{
                        padding: "6px 10px",
                        textAlign: "center",
                        borderBottom: "2px solid #30363D",
                        fontSize: 11,
                        color: "#8B949E",
                        textTransform: "uppercase"
                      }}
                    >
                      Score
                    </th>
                    <th
                      style={{
                        padding: "6px 10px",
                        textAlign: "right",
                        borderBottom: "2px solid #30363D",
                        fontSize: 11,
                        color: "#8B949E",
                        textTransform: "uppercase"
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody style={{ color: "#E6EDF3" }}>
                  <tr style={{ borderBottom: "1px solid #21262D" }}>
                    <td style={{ padding: "6px 10px" }}>ML anomaly detection</td>
                    <td className="mono" style={{ padding: "6px 10px", textAlign: "center", color: "#F85149" }}>
                      {(selectedEmail.user_risk_score || 0)}/100
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: "#F85149", fontWeight: 600 }}>
                      Elevated
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #21262D" }}>
                    <td style={{ padding: "6px 10px" }}>Rule-based triggers</td>
                    <td className="mono" style={{ padding: "6px 10px", textAlign: "center", color: "#DB6D28" }}>
                      {Math.max(55, Math.min(92, Number(selectedEmail.user_risk_score || 0) - 12))}/100
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: "#DB6D28", fontWeight: 600 }}>
                      Watch
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 10px" }}>Historical pattern</td>
                    <td className="mono" style={{ padding: "6px 10px", textAlign: "center", color: "#D29922" }}>
                      {Math.max(34, Number(selectedEmail.user_risk_score || 0) - 38)}/100
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: "#D29922", fontWeight: 600 }}>
                      Monitor
                    </td>
                  </tr>
                </tbody>
              </table>

              <h3 style={{ ...seclabel }}>Recommended actions</h3>
              {[
                "Coordinate with departmental security liaison for behavioural validation.",
                "Review sensitive module access trails for overlapping sessions.",
                "Prepare regulatory narrative referencing AI risk drivers."
              ].map((text, i) => (
                <div key={`rec-${text.slice(0, 8)}-${i}`} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                  <span
                    className="mono"
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#21262D",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      color: "#8B949E"
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13, color: "#E6EDF3", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}

              <h3 style={{ ...seclabel }}>Quick actions</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={() => {
                    navigate("/dashboard");
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent("openUser", { detail: selectedEmail?.user_id }));
                    }, 300);
                  }}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    background: "transparent",
                    border: "1px solid #388BFD",
                    color: "#388BFD",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.12s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#1F3358";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "transparent";
                  }}
                >
                  View User Profile
                </button>
                {!inboxReadOnly ? (
                  <>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedEmail?.user_id) return;
                    if (!window.confirm("Freeze " + selectedEmail.user_name + "?")) return;
                    try {
                      await fetch(`http://localhost:8000/api/users/${selectedEmail.user_id}/freeze`, {
                        method: "POST"
                      });
                      alert("Account frozen for " + selectedEmail.user_name);
                    } catch (e) {
                      alert("Error: " + e.message);
                    }
                  }}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    background: "transparent",
                    border: "1px solid #F85149",
                    color: "#F85149",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.12s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#3D1010";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "transparent";
                  }}
                >
                  Freeze Account
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedEmail?.user_id) return;
                    try {
                      await fetch(`http://localhost:8000/api/reports/generate/${selectedEmail.user_id}`, {
                        method: "POST"
                      });
                      alert("Report generated!");
                      navigate("/reports");
                    } catch (e) {
                      alert("Error: " + e.message);
                    }
                  }}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    background: "transparent",
                    border: "1px solid #3FB950",
                    color: "#3FB950",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.12s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#0E2D1A";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "transparent";
                  }}
                >
                  Generate Full Report
                </button>
                  </>
                ) : null}
              </div>

              <footer
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: "1px solid #21262D",
                  fontSize: 11,
                  color: "#484F58",
                  textAlign: "center",
                  lineHeight: 1.5
                }}
              >
                This is an automated alert from SecureBank AI Fraud Detection System. Do not reply.
              </footer>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
