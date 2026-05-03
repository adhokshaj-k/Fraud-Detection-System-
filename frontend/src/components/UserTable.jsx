import { useEffect, useRef, useState } from "react";
import { formatIstTime } from "../utils";

function rowColor(score) {
  if (score > 80) return "bg-red-950/60";
  if (score > 60) return "bg-red-900/30";
  if (score > 30) return "bg-yellow-900/20";
  return "bg-emerald-900/10";
}

export default function UserTable({
  users,
  role,
  onGenerateReport,
  onUserClick,
  dramaticUserId,
  onFreeze,
  onUnfreeze
}) {
  const r = typeof role === "string" ? role.toUpperCase() : "";
  const canAct = r === "INVESTIGATOR" || r === "ADMIN";
  const [displayRisk, setDisplayRisk] = useState({});
  const frameRef = useRef(null);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    const initial = Object.fromEntries(users.map((u) => [u.id, Math.round(u.risk_score)]));
    const target = { ...initial };
    const start = Object.fromEntries(users.map((u) => [u.id, Math.round(displayRisk[u.id] ?? u.risk_score)]));
    const isDramatic = Boolean(dramaticUserId);
    const duration = isDramatic ? 2200 : 700;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = {};
      users.forEach((u) => {
        const s = start[u.id] ?? 0;
        const t = target[u.id] ?? 0;
        next[u.id] = Math.round(s + (t - s) * eased);
      });
      setDisplayRisk(next);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [users, dramaticUserId]);

  return (
    <div className="rounded-xl border border-gray-800 bg-panel p-4 overflow-x-auto">
      <h3 className="text-lg font-semibold mb-3">All Monitored Users</h3>
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-800">
            <th className="py-2">Name</th>
            <th>Role</th>
            <th>Department</th>
            <th>Risk</th>
            <th>Last Login</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className={`border-b border-gray-900 ${rowColor(u.risk_score)} ${
                dramaticUserId === u.id ? "animate-pulse ring-1 ring-red-600" : ""
              } ${u.frozen ? "border-l-4 border-l-red-600 opacity-70" : ""}`}
            >
              <td className="py-2">
                <button className="text-cyan-300 hover:underline" onClick={() => onUserClick(u)}>
                  {u.name}
                </button>
              </td>
              <td>{u.role}</td>
              <td>{u.department}</td>
              <td className="font-semibold">{displayRisk[u.id] ?? Math.round(u.risk_score)}</td>
              <td>{formatIstTime(u.last_login)}</td>
              <td>{u.frozen ? <span className="text-xs px-2 py-1 rounded bg-red-900/60 border border-red-700">FROZEN</span> : u.status}</td>
              <td>
                <div className="flex gap-1">
                  {role !== "Auditor" && (
                    <button
                      onClick={() => onGenerateReport(u.id)}
                      className="rounded px-2 py-1 bg-cyan-700 hover:bg-cyan-600"
                    >
                      Generate Report
                    </button>
                  )}
                  {canAct && (
                    u.frozen ? (
                      <button onClick={() => onUnfreeze(u)} className="rounded px-2 py-1 bg-emerald-700 hover:bg-emerald-600">Unfreeze</button>
                    ) : (
                      <button onClick={() => onFreeze(u)} className="rounded px-2 py-1 bg-red-700 hover:bg-red-600">Freeze</button>
                    )
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
