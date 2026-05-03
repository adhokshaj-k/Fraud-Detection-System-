import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export default function BehaviourChart({ behaviour }) {
  const dataPoints = behaviour.slice(0, 20).reverse();
  const data = dataPoints.map((b, idx) => ({
    i: `${idx + 1}`,
    final_score: b.final_score,
    ml_score: b.ml_score
  }));

  return (
    <div style={{ height: 280, padding: "4px 0 0", boxSizing: "border-box", background: "transparent" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#21262D" strokeDasharray="0" />
          <XAxis dataKey="i" tick={{ fill: "#484F58", fontSize: 11 }} axisLine={{ stroke: "#30363D" }} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#484F58", fontSize: 11 }}
            axisLine={{ stroke: "#30363D" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#1C2128",
              border: "1px solid #30363D",
              borderRadius: 6,
              color: "#E6EDF3",
              fontSize: 12
            }}
          />
          <Line type="monotone" dataKey="final_score" name="Risk" stroke="#F85149" strokeWidth={2} dot={false} />
          <Line
            type="monotone"
            dataKey="ml_score"
            name="ML Score"
            stroke="#388BFD"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
