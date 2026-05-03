const HOURS = Array.from({ length: 24 }, (_, i) => i);

function intensityClass(count) {
  if (count >= 4) return "bg-red-600";
  if (count >= 3) return "bg-orange-500";
  if (count >= 2) return "bg-yellow-500";
  if (count >= 1) return "bg-yellow-200";
  return "bg-white/20";
}

export default function ActivityHeatmap({ data }) {
  const departments = Array.from(new Set((data || []).map((d) => d.department)));
  const map = new Map(data.map((d) => [`${d.department}-${d.hour}`, d]));

  return (
    <div className="rounded-xl border border-gray-800 bg-panel p-4 overflow-x-auto">
      <h3 className="text-lg font-semibold mb-3">Activity Heatmap</h3>
      <div className="min-w-[900px]">
        <div className="grid" style={{ gridTemplateColumns: "180px repeat(24, minmax(24px, 1fr))" }}>
          <div />
          {HOURS.map((h) => (
            <div key={h} className="text-[10px] text-center text-gray-400">{h}</div>
          ))}
          {departments.map((dep) => (
            <div key={dep} className="contents">
              <div key={`${dep}-name`} className="text-xs text-gray-300 py-1">{dep}</div>
              {HOURS.map((h) => {
                const cell = map.get(`${dep}-${h}`) || { anomaly_count: 0, avg_risk: 0 };
                return (
                  <div
                    key={`${dep}-${h}`}
                    className={`h-6 m-[1px] rounded ${intensityClass(cell.anomaly_count)}`}
                    title={`${dep} - ${h}:00: ${cell.anomaly_count} anomalies, avg risk ${Math.round(cell.avg_risk || 0)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
