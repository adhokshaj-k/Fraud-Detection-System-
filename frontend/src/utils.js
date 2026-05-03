export function formatInr(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function formatIstTime(iso) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Kolkata"
  }).format(new Date(iso));
}

export function severityColor(level) {
  const l = String(level || "").toUpperCase();
  if (l === "CRITICAL") return "text-red-300 bg-red-950 border-red-700";
  if (l === "HIGH") return "text-red-200 bg-red-900/70 border-red-800";
  if (l === "MEDIUM") return "text-yellow-200 bg-yellow-900/40 border-yellow-800";
  return "text-emerald-200 bg-emerald-900/40 border-emerald-800";
}

// Theme system
export function getTheme() {
  const saved = localStorage.getItem("theme");
  return saved || "dark";
}

export function setTheme(theme) {
  localStorage.setItem("theme", theme);
  updateThemeCSS(theme);
}

export function updateThemeCSS(theme) {
  const root = document.documentElement;
  
  if (theme === "light") {
    root.style.setProperty("--bg-primary", "#F8FAFC");
    root.style.setProperty("--bg-secondary", "#FFFFFF");
    root.style.setProperty("--bg-tertiary", "#F1F5F9");
    root.style.setProperty("--border-primary", "#E2E8F0");
    root.style.setProperty("--border-secondary", "#CBD5E1");
    root.style.setProperty("--text-primary", "#0F172A");
    root.style.setProperty("--text-secondary", "#64748B");
    root.style.setProperty("--text-tertiary", "#94A3B8");
    root.style.setProperty("--accent-blue", "#2563EB");
    root.style.setProperty("--accent-cyan", "#0891B2");
    root.style.setProperty("--accent-green", "#059669");
    root.style.setProperty("--accent-orange", "#EA580C");
    root.style.setProperty("--accent-red", "#DC2626");
    root.style.setProperty("--accent-purple", "#7C3AED");
  } else {
    // Dark theme (default)
    root.style.setProperty("--bg-primary", "#0A0C10");
    root.style.setProperty("--bg-secondary", "#0F1117");
    root.style.setProperty("--bg-tertiary", "#1A1F2E");
    root.style.setProperty("--border-primary", "#1E2330");
    root.style.setProperty("--border-secondary", "#2A2D3E");
    root.style.setProperty("--text-primary", "#F0F2F8");
    root.style.setProperty("--text-secondary", "#8B95A8");
    root.style.setProperty("--text-tertiary", "#6B7280");
    root.style.setProperty("--accent-blue", "#3B82F6");
    root.style.setProperty("--accent-cyan", "#06B6D4");
    root.style.setProperty("--accent-green", "#10B981");
    root.style.setProperty("--accent-orange", "#F97316");
    root.style.setProperty("--accent-red", "#EF4444");
    root.style.setProperty("--accent-purple", "#A855F7");
  }
}

// Initialize theme on load
export function initTheme() {
  const theme = getTheme();
  updateThemeCSS(theme);
  return theme;
}
