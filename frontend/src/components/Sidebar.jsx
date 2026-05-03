import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Users, AlertTriangle, Inbox, FileText, ClipboardList, Settings, LogOut, Shield } from "lucide-react";

const getNavItems = (role) => {
  const roleKey = String(role || "").toUpperCase();
  const all = [
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/users", label: "Users", icon: Users, hidden: roleKey === "AUDITOR" },
    { path: "/alerts", label: "Alerts", icon: AlertTriangle },
    { path: "/inbox", label: "Inbox", icon: Inbox, hidden: roleKey === "AUDITOR" },
    { path: "/reports", label: "Reports", icon: FileText },
    { path: "/audit", label: "Audit Log", icon: ClipboardList }
  ];
  return all.filter((item) => !item.hidden);
};

const getBottomItems = (role) => {
  const roleKey = String(role || "").toUpperCase();
  return [
    { path: "/settings", label: "Settings", icon: Settings, hidden: roleKey !== "ADMIN" },
    { path: "/", label: "Logout", icon: LogOut, action: "logout" }
  ].filter((item) => !item.hidden);
};

export default function Sidebar({ user, role }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    navigate("/");
  };

  const handleNavigation = (item) => {
    if (item.action === "logout") {
      handleLogout();
    } else {
      navigate(item.path);
    }
  };

  const getInitials = (name) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";
  };

  const avatarBg = (name) => {
    const i = name ? name.charCodeAt(0) : 0;
    const palettes = ["#388BFD", "#3FB950", "#BC8CFF", "#DB6D28", "#D29922"];
    return palettes[Math.abs(i) % palettes.length];
  };

  const isNavActive = (item) => location.pathname === item.path;

  const navigationItems = getNavItems(role);
  const bottomItems = getBottomItems(role);

  const roleKey = String(role || user?.role || "").toUpperCase();
  const roleBadgeMeta =
    roleKey.includes("ADMIN")
      ? { color: "#BC8CFF", label: roleKey }
      : roleKey.includes("AUDIT")
      ? { color: "#3FB950", label: roleKey }
      : { color: "#388BFD", label: roleKey.includes("INVEST") ? roleKey : "INVESTIGATOR" };

  const navBtnBase = {
    height: 32,
    margin: "1px 8px",
    borderRadius: 4,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: "0 12px",
    border: "none",
    cursor: "pointer",
    width: "calc(100% - 16px)",
    boxSizing: "border-box",
    fontSize: 13,
    fontWeight: 500,
    transition: "background 0.12s ease, color 0.12s ease"
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 220,
        height: "100vh",
        background: "#0D1117",
        borderRight: "1px solid #30363D",
        zIndex: 50,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          height: 48,
          borderBottom: "1px solid #30363D",
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}
      >
        <Shield size={16} color="#388BFD" aria-hidden />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#E6EDF3" }}>SecureBank</span>
      </div>

      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        <p
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#484F58",
            padding: "12px 16px 4px",
            margin: 0,
            fontWeight: 600
          }}
        >
          Main menu
        </p>

        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item);
          const activeStyle =
            active
              ? {
                  background: "#1F3358",
                  color: "#388BFD",
                  borderLeft: "2px solid #388BFD",
                  marginLeft: 8,
                  paddingLeft: 10,
                  paddingRight: 12
                }
              : {
                  background: "transparent",
                  color: "#8B949E"
                };

          return (
            <button
              key={`${item.path}-${item.label}`}
              type="button"
              onClick={() => handleNavigation(item)}
              style={{
                ...navBtnBase,
                ...activeStyle
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "#1C2128";
                  e.currentTarget.style.color = "#E6EDF3";
                  e.currentTarget.style.borderLeftColor = "transparent";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#8B949E";
                } else {
                  e.currentTarget.style.background = "#1F3358";
                  e.currentTarget.style.color = "#388BFD";
                }
              }}
            >
              <Icon size={15} style={{ color: active ? "#388BFD" : undefined }} aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div style={{ height: 1, background: "#30363D", margin: "8px 0" }} />

        {bottomItems.map((item) => {
          const Icon = item.icon;
          const logout = item.action === "logout";
          const active = !logout && location.pathname === item.path;
          const iconColor = logout ? "#F85149" : active ? "#388BFD" : "#8B949E";

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNavigation(item)}
              style={{
                ...navBtnBase,
                ...(logout
                  ? {
                      background: "transparent",
                      color: "#8B949E"
                    }
                  : active
                  ? {
                      background: "#1F3358",
                      color: "#388BFD",
                      borderLeft: "2px solid #388BFD",
                      marginLeft: 8,
                      paddingLeft: 10,
                      paddingRight: 12
                    }
                  : {
                      background: "transparent",
                      color: "#8B949E"
                    })
              }}
              onMouseEnter={(e) => {
                if (logout) {
                  e.currentTarget.style.background = "#161B22";
                  e.currentTarget.style.color = "#F85149";
                } else if (!active) {
                  e.currentTarget.style.background = "#1C2128";
                  e.currentTarget.style.color = "#E6EDF3";
                }
              }}
              onMouseLeave={(e) => {
                if (logout) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#8B949E";
                } else if (active) {
                  e.currentTarget.style.background = "#1F3358";
                  e.currentTarget.style.color = "#388BFD";
                } else {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#8B949E";
                }
              }}
            >
              <Icon size={15} style={{ color: logout ? undefined : iconColor }} aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ borderTop: "1px solid #30363D", padding: "10px 12px" }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: avatarBg(user?.name),
              color: "#0D1117",
              fontSize: 11,
              fontWeight: 600,
              display: "grid",
              placeItems: "center",
              flexShrink: 0
            }}
          >
            {getInitials(user?.name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: "#E6EDF3",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {user?.name || "User"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: 3,
                  border: `1px solid ${roleBadgeMeta.color}`,
                  color: roleBadgeMeta.color,
                  background: "transparent",
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap"
                }}
              >
                {roleBadgeMeta.label}
              </span>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3FB950", flexShrink: 0 }} title="Online" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
