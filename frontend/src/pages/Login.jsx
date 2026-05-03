import { useEffect, useState } from "react";

const ROLES = [
  { role: "Investigator", username: "investigator", password: "invest123", desc: "Incident response & cases" },
  { role: "Admin", username: "admin", password: "admin123", desc: "Model & platform governance" },
  { role: "Auditor", username: "auditor", password: "audit123", desc: "Read-only forensic review" }
];

const roleCards = [
  {
    id: "investigator",
    label: "Investigator",
    desc: "Threat investigation",
    selectedBorder: "#388BFD",
    selectedBg: "#1F3358"
  },
  {
    id: "admin",
    label: "Admin",
    desc: "Platform operations",
    selectedBorder: "#BC8CFF",
    selectedBg: "#1E1B2E"
  },
  {
    id: "auditor",
    label: "Auditor",
    desc: "Read-only audit",
    selectedBorder: "#3FB950",
    selectedBg: "#152A1A"
  }
];

export default function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState("investigator");
  const [username, setUsername] = useState("investigator");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setUsername(selectedRole), [selectedRole]);

  function submit(e) {
    e.preventDefault();
    const selected = ROLES.find((r) => r.username === selectedRole);
    if (!selected) {
      setError("Invalid role selection.");
      return;
    }
    if (username === selected.username && password === selected.password) {
      const roleNames = {
        investigator: "Alex Investigator",
        admin: "Sam Admin",
        auditor: "Jordan Auditor"
      };
      const payload = {
        name: roleNames[selectedRole] || selectedRole,
        role: selected.role.toUpperCase(),
        username: selectedRole
      };
      if (onLogin) onLogin(payload);
      else localStorage.setItem("authUser", JSON.stringify(payload));
      return;
    }
    setError("Invalid credentials for selected role.");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0D1117",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box"
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 380,
          maxWidth: "100%",
          background: "#161B22",
          border: "1px solid #30363D",
          borderRadius: 8,
          padding: 24,
          boxSizing: "border-box"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", marginBottom: 8 }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3L4 6V12C4 17 7.5 21 12 22C16.5 21 20 17 20 12V6L12 3Z" stroke="#388BFD" strokeWidth="1.5" />
              <path d="M9.5 12.5L11.2 14.2L14.8 10.6" stroke="#388BFD" strokeWidth="1.5" />
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#E6EDF3" }}>SecureBank</div>
          <div style={{ fontSize: 12, color: "#8B949E", marginTop: 4 }}>AI Fraud Detection System</div>
        </div>

        <p
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#484F58",
            margin: "0 0 8px",
            fontWeight: 600
          }}
        >
          Select role
        </p>
        <div style={{ display: "flex", flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {roleCards.map((card) => {
            const sel = selectedRole === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedRole(card.id)}
                style={{
                  flex: 1,
                  height: 56,
                  background: sel ? card.selectedBg : "#21262D",
                  border: `1px solid ${sel ? card.selectedBorder : "#30363D"}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  transition: "all 0.15s ease",
                  padding: 4,
                  color: "#E6EDF3",
                  boxSizing: "border-box"
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "#E6EDF3" }}>{card.label}</span>
                <span style={{ fontSize: 10, color: "#8B949E", textAlign: "center", lineHeight: 1.2 }}>{card.desc}</span>
              </button>
            );
          })}
        </div>

        <p
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#484F58",
            margin: "0 0 8px",
            fontWeight: 600
          }}
        >
          Credentials
        </p>
        <input
          autoComplete="username"
          style={{
            width: "100%",
            height: 34,
            background: "#21262D",
            border: "1px solid #30363D",
            borderRadius: 4,
            padding: "0 10px",
            fontSize: 13,
            color: "#E6EDF3",
            marginBottom: 8,
            boxSizing: "border-box"
          }}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <input
          autoComplete="current-password"
          style={{
            width: "100%",
            height: 34,
            background: "#21262D",
            border: "1px solid #30363D",
            borderRadius: 4,
            padding: "0 10px",
            fontSize: 13,
            color: "#E6EDF3",
            marginBottom: 8,
            boxSizing: "border-box"
          }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />

        {error && (
          <p style={{ fontSize: 12, color: "#F85149", margin: "0 0 8px" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          style={{
            width: "100%",
            height: 34,
            background: "#388BFD",
            border: "none",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            color: "#FFFFFF",
            cursor: "pointer",
            marginTop: 4,
            transition: "background 0.15s ease"
          }}
          onMouseEnter={(e) => (e.target.style.background = "#58A6FF")}
          onMouseLeave={(e) => (e.target.style.background = "#388BFD")}
        >
          Sign In
        </button>

        <p style={{ fontSize: 12, color: "#484F58", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
          investigator / invest123 · admin / admin123 · auditor / audit123
        </p>
      </form>
    </div>
  );
}
