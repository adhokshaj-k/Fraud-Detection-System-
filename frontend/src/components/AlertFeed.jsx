import { useState } from "react";
import { formatIstTime, severityColor } from "../utils";

export default function AlertFeed({ alerts }) {
  const [expanded, setExpanded] = useState({});
  return (
    <div className="rounded-xl border border-gray-800 bg-panel p-4 h-[360px] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-3">Alert Feed</h3>
      <div className="space-y-2">
        {alerts.slice(0, 20).map((alert) => (
          <div key={alert.id} className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <span className={`inline-block text-xs px-2 py-1 rounded border ${severityColor(alert.severity)}`}>
              {alert.severity}
            </span>
            <p className="text-sm mt-2">{alert.natural_language || alert.message}</p>
            <button
              className="text-xs text-cyan-300 mt-1"
              onClick={() => setExpanded((p) => ({ ...p, [alert.id]: !p[alert.id] }))}
            >
              Technical Details
            </button>
            {expanded[alert.id] && (
              <pre className="text-[11px] mt-1 p-2 rounded bg-gray-950 border border-gray-800 whitespace-pre-wrap">{alert.message}</pre>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatIstTime(alert.created_at)}</p>
            <p className="text-xs text-cyan-300 mt-1">{alert.recommended_action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
