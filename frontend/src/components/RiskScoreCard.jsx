import { useEffect, useRef, useState } from "react";

const cardStyles = [
  "from-cyan-500/20 to-blue-500/10",
  "from-yellow-500/20 to-orange-500/10",
  "from-red-500/20 to-rose-500/10",
  "from-violet-500/20 to-indigo-500/10"
];

export default function RiskScoreCard({ title, value, index, dramaticPulse = false }) {
  const [displayValue, setDisplayValue] = useState(Number(value) || 0);
  const frameRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const start = displayValue;
    const delta = target - start;
    const duration = dramaticPulse ? 2000 : 800;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + delta * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, dramaticPulse]);

  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${cardStyles[index % cardStyles.length]} border border-gray-800 p-4 ${
        dramaticPulse ? "animate-pulse" : ""
      }`}
    >
      <p className="text-xs uppercase text-gray-400 tracking-wider">{title}</p>
      <p className="mt-3 text-3xl font-bold text-white">{displayValue}</p>
    </div>
  );
}
