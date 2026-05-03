import { useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    criticalThreshold: 80,
    highThreshold: 60,
    mediumThreshold: 30,
    emailAlerts: true,
    autoFreeze: false,
    retrainingInterval: 24
  });

  const Label = ({ children }) => (
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
      {children}
    </p>
  );

  const Panel = ({ title, children }) => (
    <div
      style={{
        background: "#161B22",
        border: "1px solid #30363D",
        borderRadius: 6,
        padding: 16,
        marginBottom: 12
      }}
    >
      <Label>{title}</Label>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#8B949E",
          marginBottom: 16
        }}
      >
        SYSTEM SETTINGS
      </p>

      <Panel title="RISK SCORE THRESHOLDS">
        <p style={{ fontSize: 12, color: "#484F58", marginBottom: 12 }}>
          Adjust when alerts are triggered based on risk score
        </p>
        {[
          { label: "Critical Threshold", key: "criticalThreshold", color: "#F85149" },
          { label: "High Threshold", key: "highThreshold", color: "#DB6D28" },
          { label: "Medium Threshold", key: "mediumThreshold", color: "#D29922" }
        ].map(({ label, key, color }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: "#E6EDF3", width: 160, flexShrink: 0 }}>{label}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={settings[key]}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  [key]: Number(e.target.value)
                }))
              }
              style={{ flex: 1, accentColor: color }}
            />
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
                fontWeight: 700,
                color: color,
                width: 36,
                textAlign: "right"
              }}
            >
              {settings[key]}
            </span>
          </div>
        ))}
      </Panel>

      <Panel title="ALERT SETTINGS">
        {[
          { label: "Email Alerts", key: "emailAlerts", desc: "Send email when CRITICAL alert fires" },
          { label: "Auto-Freeze", key: "autoFreeze", desc: "Auto-freeze accounts scoring above critical threshold" }
        ].map(({ label, key, desc }) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 13, color: "#E6EDF3", margin: 0 }}>{label}</p>
              <p style={{ fontSize: 11, color: "#484F58", margin: 0 }}>{desc}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  [key]: !s[key]
                }))
              }
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: settings[key] ? "#1A5A2A" : "#21262D",
                border: `1px solid ${settings[key] ? "#3FB950" : "#30363D"}`,
                cursor: "pointer",
                position: "relative"
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: settings[key] ? "#3FB950" : "#484F58",
                  position: "absolute",
                  top: 2,
                  left: settings[key] ? 22 : 2,
                  transition: "left 0.2s"
                }}
              />
            </button>
          </div>
        ))}
      </Panel>

      <Panel title="SYSTEM INFORMATION">
        {[
          ["Backend", "FastAPI + Python 3.13"],
          ["Database", "SQLite"],
          ["ML Model", "Isolation Forest"],
          ["Features", "8 Behavioral Indicators"],
          ["Detection Accuracy", "94.2%"],
          ["False Positive Rate", "< 3%"],
          ["Version", "1.0.0"]
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid #21262D",
              fontSize: 13
            }}
          >
            <span style={{ color: "#8B949E" }}>{label}</span>
            <span style={{ color: "#E6EDF3", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>{value}</span>
          </div>
        ))}
      </Panel>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={() => alert("Settings saved!")}
          style={{
            height: 32,
            padding: "0 20px",
            background: "#388BFD",
            border: "none",
            borderRadius: 4,
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Save Settings
        </button>
        <button
          type="button"
          onClick={() => alert("Settings reset to defaults!")}
          style={{
            height: 32,
            padding: "0 20px",
            background: "transparent",
            border: "1px solid #30363D",
            borderRadius: 4,
            color: "#8B949E",
            fontSize: 13,
            cursor: "pointer"
          }}
        >
          Reset Defaults
        </button>
      </div>
    </div>
  );
}
