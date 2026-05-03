import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Sun, Moon, User, Settings, LogOut } from "lucide-react";

export default function TopBar({ user, pageTitle, breadcrumb, onThemeToggle, isDarkMode }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [systemHealth, setSystemHealth] = useState({
    backend: "healthy",
    model: "loaded",
    database: "connected"
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const searchRef = useRef(null);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const d = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(now);
      const t = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(now);
      setCurrentTime(`${d.replace(/,/g, "").trim()}  ${t}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/health");
        const data = await response.json();
        setSystemHealth({
          backend: data.backend || "healthy",
          model: data.model || "loaded",
          database: data.database || "connected"
        });
      } catch (_error) {
        setSystemHealth({
          backend: "error",
          model: "error",
          database: "error"
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const performSearch = async () => {
        setSearchLoading(true);
        try {
          const res = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          setSearchResults(data);
        } catch (_err) {
          console.error("Search failed:", _err);
          setSearchResults(null);
        } finally {
          setSearchLoading(false);
        }
      };

      const timeoutId = setTimeout(performSearch, 300);
      return () => clearTimeout(timeoutId);
    }
    setSearchResults(null);
    setSearchLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [countRes, notifRes] = await Promise.all([
          fetch("http://localhost:8000/api/inbox/unread-count"),
          fetch("http://localhost:8000/api/inbox?limit=5")
        ]);

        const count = await countRes.json();
        const notifs = await notifRes.json();

        setUnreadCount(count.count || 0);
        setNotifications(notifs || []);
      } catch (_error) {
        console.error("Failed to fetch notifications:", _error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchLoading(true);
      const timeoutId = setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          setSearchResults(data);
        } catch (_error) {
          setSearchResults({ users: [], alerts: [], transactions: [] });
        } finally {
          setSearchLoading(false);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
    setSearchResults(null);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchResultClick = (type, item) => {
    setShowSearchDropdown(false);
    setSearchQuery("");
    if (type === "user") {
      navigate("/dashboard");
      setTimeout(
        () =>
          window.dispatchEvent(
            new CustomEvent("openUser", {
              detail: item.id
            })
          ),
        100
      );
    } else if (type === "alert") {
      navigate("/alerts");
    } else if (type === "transaction") {
      navigate("/dashboard");
    }
  };

  const dotColor = (status) =>
    status === "healthy" || status === "loaded" || status === "connected" ? "#3FB950" : "#F85149";

  const formatTimeForNotif = (timestamp) =>
    typeof timestamp === "string" ? timestamp.slice(11, 19) || formatTimeRelative(timestamp) : "";

  function formatTimeRelative(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  }

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch("http://localhost:8000/api/inbox/mark-all-read", { method: "POST" });
      setUnreadCount(0);
      const notifRes = await fetch("http://localhost:8000/api/inbox?limit=5");
      const notifs = await notifRes.json();
      setNotifications(notifs || []);
    } catch (_e) {
      /* ignore */
    }
  };

  const getInitials = (name) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";
  };

  const avatarHue = (name) => {
    const i = name ? name.charCodeAt(0) : 0;
    const palettes = ["#388BFD", "#3FB950", "#BC8CFF", "#DB6D28", "#D29922"];
    return palettes[Math.abs(i) % palettes.length];
  };

  const divider = <div style={{ width: 1, height: 20, background: "#30363D", flexShrink: 0 }} />;

  const sectionHeaderStyle = {
    borderTop: "1px solid #30363D",
    padding: "8px 12px 4px",
    fontSize: 11,
    textTransform: "uppercase",
    color: "#484F58",
    margin: 0
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 220,
        right: 0,
        height: 48,
        background: "#0D1117",
        borderBottom: "1px solid #30363D",
        zIndex: 40,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        boxSizing: "border-box"
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#E6EDF3" }}>{pageTitle}</h1>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#484F58" }}>{breadcrumb}</p>
      </div>

      <div ref={searchRef} style={{ flex: 1, maxWidth: 320, margin: "0 auto", position: "relative" }}>
        <div
          style={{
            height: 28,
            background: "#21262D",
            border: "1px solid #30363D",
            borderRadius: 6,
            padding: "0 10px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            boxSizing: "border-box"
          }}
        >
          <Search size={13} color="#484F58" aria-hidden />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(e.target.value.length > 1);
              if (e.target.value.length <= 1) setSearchResults(null);
            }}
            onFocus={() => searchQuery.length > 1 && setShowSearchDropdown(true)}
            onKeyDown={(e) => e.key === "Escape" && setShowSearchDropdown(false)}
            placeholder="Search... (Ctrl+K)"
            style={{
              flex: 1,
              fontSize: 12,
              color: "#8B949E",
              background: "transparent",
              border: "none",
              outline: "none",
              minWidth: 0
            }}
          />
        </div>

        {showSearchDropdown && searchQuery.length > 1 && (
          <div
            style={{
              position: "absolute",
              top: 32,
              left: 0,
              width: 360,
              background: "#161B22",
              border: "1px solid #30363D",
              borderRadius: 6,
              zIndex: 200,
              maxHeight: 320,
              overflowY: "auto"
            }}
          >
            {searchLoading && (
              <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#8B949E" }}>
                Searching...
              </div>
            )}
            {searchResults && (
              <>
                {searchResults.users?.length > 0 && (
                  <div>
                    <div style={{ ...sectionHeaderStyle, borderTop: "none" }}>Users</div>
                    {searchResults.users.map((uRow) => (
                      <button
                        key={`u-${uRow.id}`}
                        type="button"
                        onClick={() => handleSearchResultClick("user", uRow)}
                        style={{
                          width: "100%",
                          padding: "6px 12px",
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          border: "none",
                          cursor: "pointer",
                          background: "transparent",
                          textAlign: "left"
                        }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.background = "#1C2128")}
                        onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: avatarHue(uRow.name),
                            color: "#0D1117",
                            fontSize: 11,
                            fontWeight: 700,
                            display: "grid",
                            placeItems: "center"
                          }}
                        >
                          {uRow.name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "#E6EDF3" }}>{uRow.name}</div>
                          <div style={{ fontSize: 11, color: "#8B949E" }}>{uRow.role}</div>
                        </div>
                        <span
                          className="mono"
                          style={{
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 3,
                            border:
                              uRow.risk_score > 60 ? "1px solid #6B1A1A" : "1px solid #1A5A2A",
                            background: uRow.risk_score > 60 ? "#3D1010" : "#0E2D1A",
                            color: uRow.risk_score > 60 ? "#F85149" : "#3FB950",
                            flexShrink: 0
                          }}
                        >
                          {uRow.risk_score != null ? uRow.risk_score.toFixed(0) : "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.alerts?.length > 0 && (
                  <div>
                    <div style={sectionHeaderStyle}>Alerts</div>
                    {searchResults.alerts.map((alert) => (
                      <button
                        key={`a-${alert.id}`}
                        type="button"
                        onClick={() => handleSearchResultClick("alert", alert)}
                        style={{
                          width: "100%",
                          padding: "6px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          border: "none",
                          cursor: "pointer",
                          background: "transparent",
                          textAlign: "left"
                        }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.background = "#1C2128")}
                        onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background:
                              alert.severity === "CRITICAL"
                                ? "#F85149"
                                : alert.severity === "HIGH"
                                  ? "#DB6D28"
                                  : alert.severity === "MEDIUM"
                                    ? "#D29922"
                                    : "#3FB950"
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "#E6EDF3" }} className="truncate">
                            {alert.description || alert.subject}
                          </div>
                          <div style={{ fontSize: 11, color: "#8B949E" }}>{alert.created_at}</div>
                        </div>
                        <span className="mono" style={{ fontSize: 10, color: "#8B949E", flexShrink: 0 }}>
                          {alert.severity}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.transactions?.length > 0 && (
                  <div>
                    <div style={sectionHeaderStyle}>Transactions</div>
                    {searchResults.transactions.map((tx) => (
                      <button
                        key={`t-${tx.id}`}
                        type="button"
                        onClick={() => handleSearchResultClick("transaction", tx)}
                        style={{
                          width: "100%",
                          padding: "6px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          border: "none",
                          cursor: "pointer",
                          background: "transparent",
                          textAlign: "left"
                        }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.background = "#1C2128")}
                        onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "#E6EDF3" }} className="mono">
                            ₹{Number(tx.amount).toLocaleString("en-IN")}
                          </div>
                          <div style={{ fontSize: 11, color: "#8B949E" }}>{tx.user_name}</div>
                        </div>
                        <span style={{ fontSize: 11, color: "#8B949E" }}>{tx.module}</span>
                      </button>
                    ))}
                  </div>
                )}
                {(!searchResults.users || searchResults.users.length === 0) &&
                  (!searchResults.alerts || searchResults.alerts.length === 0) &&
                  (!searchResults.transactions || searchResults.transactions.length === 0) &&
                  !searchLoading && (
                    <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#8B949E" }}>No results</div>
                  )}
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: "auto" }}>
        <span className="mono" style={{ fontSize: 11, color: "#484F58", whiteSpace: "nowrap" }}>
          {currentTime}
        </span>
        {divider}
        <div style={{ display: "flex", flexDirection: "row", gap: 4, alignItems: "center" }}>
          <div
            title="Backend"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: dotColor(systemHealth.backend)
            }}
          />
          <div
            title="Model"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: dotColor(systemHealth.model)
            }}
          />
          <div
            title="Database"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: dotColor(systemHealth.database)
            }}
          />
        </div>
        {divider}
        <div ref={notificationRef} style={{ position: "relative" }}>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              padding: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              position: "relative",
              color: "#8B949E"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#E6EDF3")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8B949E")}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                className="mono"
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  background: "#F85149",
                  borderRadius: 8,
                  fontSize: 9,
                  color: "#FFFFFF",
                  display: "grid",
                  placeItems: "center",
                  padding: "0 4px",
                  boxSizing: "border-box"
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 36,
                width: 320,
                background: "#161B22",
                border: "1px solid #30363D",
                borderRadius: 6,
                zIndex: 200,
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid #30363D",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#E6EDF3" }}>Notifications</span>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "#388BFD",
                    padding: 0
                  }}
                  onClick={handleMarkNotificationsRead}
                >
                  Mark all read
                </button>
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid #21262D",
                        cursor: "pointer",
                        transition: "background 0.1s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#1C2128")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            marginTop: 4,
                            flexShrink: 0,
                            background:
                              notif.severity === "CRITICAL"
                                ? "#F85149"
                                : notif.severity === "HIGH"
                                  ? "#DB6D28"
                                  : notif.severity === "MEDIUM"
                                    ? "#D29922"
                                    : "#3FB950"
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#E6EDF3", flex: 1 }}>
                              {notif.subject || "Alert"}
                            </span>
                            <span className="mono" style={{ fontSize: 11, color: "#8B949E", flexShrink: 0 }}>
                              {formatTimeForNotif(notif.created_at) || formatTimeRelative(notif.created_at)}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#8B949E",
                              marginTop: 4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {notif.preview || notif.body_plain || ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 16, fontSize: 12, color: "#8B949E", textAlign: "center" }}>No new notifications</div>
                )}
              </div>
              <button
                type="button"
                style={{
                  width: "100%",
                  padding: 8,
                  border: "none",
                  borderTop: "1px solid #30363D",
                  background: "transparent",
                  fontSize: 12,
                  color: "#388BFD",
                  cursor: "pointer",
                  fontWeight: 500
                }}
                onClick={() => {
                  navigate("/inbox");
                  setShowNotifications(false);
                }}
              >
                View all in Inbox
              </button>
            </div>
          )}
        </div>

        {divider}

        <button
          type="button"
          aria-label="Toggle theme"
          style={{
            padding: 4,
            border: "none",
            cursor: "pointer",
            borderRadius: 4,
            background: "transparent",
            color: "#8B949E"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#E6EDF3")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8B949E")}
          onClick={() => {
            const html = document.documentElement;
            const next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
            html.setAttribute("data-theme", next);
            localStorage.setItem("theme", next);
            if (onThemeToggle) onThemeToggle(next !== "dark");
          }}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div ref={userMenuRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: avatarHue(user?.name),
              color: "#0D1117",
              fontSize: 11,
              fontWeight: 600,
              display: "grid",
              placeItems: "center"
            }}
          >
            {getInitials(user?.name)}
          </button>

          {showUserMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 36,
                width: 160,
                background: "#161B22",
                border: "1px solid #30363D",
                borderRadius: 6,
                padding: "4px 0",
                zIndex: 200
              }}
            >
              {[
                {
                  label: "Profile",
                  Icon: User,
                  onClick: () => {
                    setShowUserMenu(false);
                    navigate("/settings");
                  }
                },
                {
                  label: "Settings",
                  Icon: Settings,
                  onClick: () => {
                    setShowUserMenu(false);
                    navigate("/settings");
                  }
                }
              ].map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={row.onClick}
                  style={{
                    width: "100%",
                    height: 32,
                    padding: "0 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#8B949E"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1C2128";
                    e.currentTarget.style.color = "#E6EDF3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#8B949E";
                  }}
                >
                  <row.Icon size={14} aria-hidden /> {row.label}
                </button>
              ))}
              <div style={{ height: 1, background: "#30363D", margin: "4px 0" }} />
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  localStorage.removeItem("authUser");
                  navigate("/");
                }}
                style={{
                  width: "100%",
                  height: 32,
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#F85149"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1C2128")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={14} aria-hidden /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
