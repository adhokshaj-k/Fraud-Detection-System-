export default function EmailAlertToast({ alert, onView, onDismiss }) {
  if (!alert) return null;
  return (
    <div className="fixed top-4 right-4 z-50 w-[340px] rounded-lg border border-red-700 bg-gray-950 p-3 shadow-xl">
      <div className="font-semibold text-red-300">Security Alert Email Sent</div>
      <div className="text-xs text-gray-300 mt-1">To: security@securebank.in</div>
      <div className="text-xs text-gray-300">Subject: CRITICAL - {alert.name}</div>
      <div className="text-xs text-gray-400 mt-1">Immediate action required...</div>
      <div className="mt-3 flex gap-2">
        <button onClick={onView} className="rounded bg-cyan-700 px-2 py-1 text-xs">View Email</button>
        <button onClick={onDismiss} className="rounded bg-gray-700 px-2 py-1 text-xs">Dismiss</button>
      </div>
    </div>
  );
}
