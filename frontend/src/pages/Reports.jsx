import { useMemo, useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";
import { formatIstTime } from "../utils";

function severityBadge(sev) {
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
        textTransform: "uppercase",
        padding: "2px 6px",
        borderRadius: 3,
        border: `1px solid ${st.border}`,
        background: st.bg,
        color: st.color,
        fontWeight: 700
      }}
    >
      {up}
    </span>
  );
}

function riskTone(score) {
  const v = Number(score) || 0;
  if (v > 80) return "#F85149";
  if (v > 60) return "#DB6D28";
  if (v > 40) return "#D29922";
  return "#3FB950";
}

const SectionLabel = ({ children }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "#8B949E",
      marginBottom: 0,
      marginTop: 0
    }}
  >
    {children}
  </p>
);

export default function Reports({ reports: initialReports, onDownload }) {
  const [reports, setReports] = useState(initialReports || []);
  const [severity, setSeverity] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [viewReport, setViewReport] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/reports/all");
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } catch {
        setReports([]);
      }
    };
    fetchReports();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = reports.filter((r) => {
      if (severity !== "ALL" && r.severity !== severity) return false;
      const nm = `${r.user_name || r.name || ""}`.toLowerCase();
      if (term && !nm.includes(term)) return false;
      return true;
    });
    if (sortBy === "risk") {
      list.sort((a, b) => (Number(b.risk_score) || 0) - (Number(a.risk_score) || 0));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [reports, severity, search, sortBy]);

  const inputStyle = {
    height: 28,
    background: "#21262D",
    border: "1px solid #30363D",
    borderRadius: 4,
    padding: "0 8px",
    fontSize: 12,
    color: "#E6EDF3",
    boxSizing: "border-box",
    outline: "none"
  };

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <SectionLabel>Generated reports</SectionLabel>
          <span className="mono" style={{ fontSize: 11, background: "#21262D", padding: "2px 8px", borderRadius: 10 }}>
            {filtered.length}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <input
            style={{ ...inputStyle, width: 200 }}
            placeholder="Search by user"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select style={{ ...inputStyle }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select style={{ ...inputStyle }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Sort: date</option>
            <option value="risk">Sort: risk</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {filtered.map((r) => {
          let content = {};
          try {
            content =
              typeof r.content_json === "string" ? JSON.parse(r.content_json) : r.content_json || {};
          } catch {
            content = {};
          }
          const summary = content.executive_summary || "";
          const displayName = r.user_name || r.name || "Unknown";
          const score = Number(r.risk_score) || 0;
          const clr = riskTone(score);

          return (
            <div
              key={r.id}
              style={{
                background: "#161B22",
                border: "1px solid #30363D",
                borderRadius: 6,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.15s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#388BFD")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#30363D")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                {severityBadge(r.severity)}
                <span className="mono" style={{ fontSize: 11, color: "#8B949E", flexShrink: 0 }}>
                  {formatIstTime(r.created_at)}
                </span>
              </div>

              <div style={{ margin: "10px 0", display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: clr,
                    color: "#0D1117",
                    fontWeight: 700,
                    fontSize: 13,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0
                  }}
                >
                  {displayName.charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#E6EDF3" }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: "#8B949E" }}>{r.role || ""}</div>
                </div>
              </div>

              <div>
                <p style={{ margin: "0 0 4px", fontSize: 10, color: "#8B949E", textTransform: "uppercase", fontWeight: 600 }}>
                  Risk score
                </p>
                <span className="mono" style={{ fontSize: 24, fontWeight: 700, color: clr }}>
                  {Math.round(score)}
                </span>
                <div style={{ width: "100%", height: 4, background: "#21262D", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ width: `${Math.min(score, 100)}%`, height: "100%", background: clr }} />
                </div>
              </div>

              <div style={{ height: 1, background: "#30363D", margin: "10px 0" }} />

              <p
                style={{
                  margin: 0,
                  flex: 1,
                  fontSize: 12,
                  color: "#8B949E",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}
              >
                {summary ? summary : "(No executive summary captured)"}
              </p>

              <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() =>
                    setViewReport({
                      title: displayName,
                      body: summary || JSON.stringify(content, null, 2)
                    })
                  }
                  style={{
                    flex: 1,
                    height: 28,
                    background: "transparent",
                    border: "1px solid #388BFD",
                    borderRadius: 4,
                    color: "#388BFD",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.12s ease"
                  }}
                  onMouseEnter={(e) => (e.target.style.background = "#1F3358")}
                  onMouseLeave={(e) => (e.target.style.background = "transparent")}
                >
                  View report
                </button>
                <button
                  type="button"
                  onClick={() => onDownload(r.user_id)}
                  aria-label="Download"
                  title="Download"
                  style={{
                    width: 28,
                    height: 28,
                    background: "transparent",
                    border: "1px solid #30363D",
                    borderRadius: 4,
                    color: "#8B949E",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center"
                  }}
                  onMouseEnter={(e) => (e.target.style.background = "#1C2128")}
                  onMouseLeave={(e) => (e.target.style.background = "transparent")}
                >
                  <Download size={13} aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!filtered.length && (
        <div style={{ padding: "60px 0", textAlign: "center", color: "#8B949E" }}>
          <FileText style={{ margin: "0 auto", width: 48, height: 48, opacity: 0.6 }} color="#484F58" strokeWidth={1.25} />
          <div style={{ fontSize: 14, marginTop: 12, color: "#8B949E" }}>No reports generated yet.</div>
          <div style={{ fontSize: 12, marginTop: 6, color: "#484F58" }}>
            Generate reports from the Dashboard user table.
          </div>
          <button
            type="button"
            style={{
              height: 28,
              border: "1px solid #30363D",
              background: "transparent",
              color: "#8B949E",
              borderRadius: 4,
              padding: "0 16px",
              marginTop: 12,
              cursor: "pointer"
            }}
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      )}

      {viewReport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              background: "#161B22",
              border: "1px solid #30363D",
              borderRadius: 6,
              maxWidth: 720,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: 20,
              boxSizing: "border-box"
            }}
          >
            <h3 style={{ marginTop: 0, color: "#E6EDF3", fontSize: 17 }}>{viewReport.title}</h3>
            <pre style={{ margin: "12px 0 0", whiteSpace: "pre-wrap", color: "#8B949E", fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>
              {viewReport.body}
            </pre>
            <button
              type="button"
              onClick={() => setViewReport(null)}
              style={{
                marginTop: 16,
                height: 32,
                padding: "0 16px",
                background: "#21262D",
                border: "1px solid #30363D",
                borderRadius: 4,
                color: "#E6EDF3",
                cursor: "pointer",
                fontSize: 13
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
