export default function AttackTimeline({ timeline, onClose }) {
  if (!timeline?.length) return null;
  const summary = timeline.map((t) => `${t.time} - ${t.description}`).join("\n");

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    alert("Timeline summary copied");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl border border-red-800 bg-panel p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-red-300">Attack Timeline</h3>
          <button onClick={onClose} className="rounded px-2 py-1 bg-gray-800">Close</button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {timeline.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className={`w-7 h-7 rounded-full grid place-items-center ${step.suspicious ? "bg-red-700" : "bg-gray-700"}`}>{step.icon}</div>
              <div>
                <div className="text-xs text-gray-400">{step.time}</div>
                <div className={step.suspicious ? "text-red-200" : "text-gray-200"}>{step.description}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={copySummary} className="mt-4 rounded bg-cyan-700 hover:bg-cyan-600 px-3 py-2 text-sm">Share Timeline</button>
      </div>
    </div>
  );
}
