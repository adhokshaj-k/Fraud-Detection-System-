export default function AIReportModal({ report, loading, onClose, onDownload }) {
  if (!report && !loading) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-xl border border-gray-700 bg-panel p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">AI Incident Report</h3>
          <button onClick={onClose} className="rounded bg-gray-800 px-2 py-1">Close</button>
        </div>
        {loading ? (
          <div className="py-12 text-center text-cyan-300">AI is analysing behaviour patterns...</div>
        ) : (
          <div className="space-y-3 mt-3 text-sm">
            <Section title="Executive Summary" content={report.executive_summary} />
            <Section title="Risk Assessment" content={report.risk_assessment} />
            <Section title="Flagged Activities" content={(report.flagged_activities || []).join("\n")} />
            <Section title="ML Explanation" content={report.ml_explanation} />
            <Section title="Peer Comparison" content={report.peer_comparison} />
            <Section title="Recommended Actions" content={(report.recommended_actions || []).map((x, i) => `${i + 1}. ${x}`).join("\n")} />
            <Section title="Severity Verdict" content={report.severity_verdict} />
            <button className="rounded bg-cyan-700 hover:bg-cyan-600 px-3 py-2" onClick={onDownload}>Download as PDF</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, content }) {
  return (
    <div className="rounded border border-gray-800 bg-gray-900/40 p-3 whitespace-pre-wrap">
      <div className="font-semibold text-cyan-300 mb-1">{title}</div>
      <div className="text-gray-200">{content || "-"}</div>
    </div>
  );
}
