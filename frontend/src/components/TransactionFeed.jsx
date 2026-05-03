import { formatInr, formatIstTime } from "../utils";

export default function TransactionFeed({ transactions }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-panel p-4 h-[280px] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-3">Live Transaction Feed</h3>
      <div className="space-y-2">
        {transactions.slice(0, 20).map((tx) => (
          <div key={tx.id} className="rounded-lg bg-gray-900/60 p-3 text-sm border border-gray-800">
            <div className="flex justify-between gap-3">
              <span className="font-medium text-cyan-300">{tx.name}</span>
              <span>{formatInr(tx.amount)}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {tx.txn_type} | {tx.module} | {tx.location} | {formatIstTime(tx.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
