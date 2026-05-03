import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatInr, formatIstTime } from "../utils";

export default function UserDetailModal({
  user,
  history,
  riskHistory,
  peerComparison,
  role,
  onFreeze,
  onUnfreeze,
  onClose
}) {
  if (!user) return null;
  const [tab, setTab] = useState("history");
  const stats = useMemo(() => {
    const values = (riskHistory || []).map((x) => Number(x.score || 0));
    if (!values.length) return { min: 0, max: 0, avg: 0 };
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    };
  }, [riskHistory]);
  const r = typeof role === "string" ? role.toUpperCase() : "";
  const canAct = r === "INVESTIGATOR" || r === "ADMIN";
  const peerData = peerComparison
    ? Object.keys(peerComparison.user || {}).map((k) => ({
        metric: k,
        user: Number(peerComparison.user[k] || 0),
        peer: Number(peerComparison.peer_avg?.[k] || 0)
      }))
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl rounded-xl border border-gray-700 bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div>
            <h3 className="text-xl font-bold">{user.name}</h3>
            <p className="text-sm text-gray-400">
              {user.role} | {user.department} | IFSC: {user.ifsc_code}
            </p>
          </div>
          <button onClick={onClose} className="rounded px-3 py-1 bg-gray-800 hover:bg-gray-700">
            Close
          </button>
        </div>
        <div className="p-4">
          <div className="flex gap-2 mb-3">
            <button className={`px-3 py-1 rounded ${tab === "history" ? "bg-cyan-700" : "bg-gray-800"}`} onClick={() => setTab("history")}>History</button>
            <button className={`px-3 py-1 rounded ${tab === "risk" ? "bg-cyan-700" : "bg-gray-800"}`} onClick={() => setTab("risk")}>Risk Timeline</button>
            <button className={`px-3 py-1 rounded ${tab === "peer" ? "bg-cyan-700" : "bg-gray-800"}`} onClick={() => setTab("peer")}>Peer Comparison</button>
            {canAct && (
              user.frozen ? (
                <button className="ml-auto px-3 py-1 rounded bg-emerald-700" onClick={() => onUnfreeze(user)}>Unfreeze</button>
              ) : (
                <button className="ml-auto px-3 py-1 rounded bg-red-700" onClick={() => onFreeze(user)}>Freeze Account</button>
              )
            )}
          </div>
          {tab === "history" && (
            <div className="max-h-[65vh] overflow-y-auto border border-gray-800 rounded-lg">
              <table className="w-full text-sm min-w-[1200px]">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="text-left text-gray-300 border-b border-gray-800">
                    <th className="p-2">Time</th>
                    <th className="p-2">Login Hour</th>
                    <th className="p-2">Tx Count</th>
                    <th className="p-2">Avg Amount</th>
                    <th className="p-2">Location Changes</th>
                    <th className="p-2">Records</th>
                    <th className="p-2">Failed Logins</th>
                    <th className="p-2">After Hours</th>
                    <th className="p-2">Privilege Attempts</th>
                    <th className="p-2">ML</th>
                    <th className="p-2">Rule</th>
                    <th className="p-2">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-gray-900/80">
                      <td className="p-2">{formatIstTime(h.created_at)}</td>
                      <td className="p-2">{h.login_hour}</td>
                      <td className="p-2">{h.transaction_count}</td>
                      <td className="p-2">{formatInr(h.avg_amount)}</td>
                      <td className="p-2">{h.location_changes}</td>
                      <td className="p-2">{h.records_accessed}</td>
                      <td className="p-2">{h.failed_logins}</td>
                      <td className="p-2">{h.access_after_hours ? "Yes" : "No"}</td>
                      <td className="p-2">{h.privilege_escalation_attempts}</td>
                      <td className="p-2">{Math.round(h.ml_score)}</td>
                      <td className="p-2">{Math.round(h.rule_score)}</td>
                      <td className="p-2 font-semibold text-red-300">{Math.round(h.final_score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "risk" && (
            <div>
              <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                <div className="rounded bg-gray-900 p-2">Min: {Math.round(stats.min)}</div>
                <div className="rounded bg-gray-900 p-2">Max: {Math.round(stats.max)}</div>
                <div className="rounded bg-gray-900 p-2">Avg: {Math.round(stats.avg)}</div>
              </div>
              <div className="h-[280px] bg-gray-950/40 rounded p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={riskHistory || []}>
                    <CartesianGrid stroke="#1f2937" />
                    <XAxis dataKey="timestamp" tickFormatter={(v) => formatIstTime(v)} hide />
                    <YAxis domain={[0, 100]} />
                    <Tooltip labelFormatter={(v) => formatIstTime(v)} />
                    <Area type="monotone" dataKey="score" stroke="#ef4444" fill="rgba(239,68,68,0.3)" isAnimationActive />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {tab === "peer" && (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peerData}>
                  <CartesianGrid stroke="#1f2937" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="user" fill="#ef4444" name="This User" />
                  <Bar dataKey="peer" fill="#22d3ee" name="Role Average" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
