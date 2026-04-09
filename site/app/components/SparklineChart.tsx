"use client";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  showArea?: boolean;
  labels?: string[];
}

export default function SparklineChart({
  data,
  width = 400,
  height = 120,
  className = "",
  showArea = true,
  labels,
}: SparklineChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className={`flex items-center justify-center text-zinc-600 text-xs ${className}`} style={{ width, height }}>
        No chart data
      </div>
    );
  }

  const padding = { top: 10, right: 10, bottom: labels ? 24 : 10, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(Math.abs), 0.01);
  const minVal = Math.min(...data, 0);
  const range = Math.max(maxVal - minVal, 0.01);

  const points = data.map((v, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((v - minVal) / range) * chartH;
    return { x, y, v };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;

  // Zero line position
  const zeroY = minVal < 0 ? padding.top + chartH - ((0 - minVal) / range) * chartH : padding.top + chartH;

  const isPositive = data[data.length - 1] >= data[0];
  const strokeColor = isPositive ? "#22c55e" : "#ef4444";
  const fillColor = isPositive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      {/* Zero line */}
      {minVal < 0 && (
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
      )}

      {/* Area fill */}
      {showArea && <path d={areaPath} fill={fillColor} />}

      {/* Line */}
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={data.length <= 14 ? 3 : 0}
          fill={p.v >= 0 ? "#22c55e" : "#ef4444"}
          stroke={p.v >= 0 ? "#166534" : "#991b1b"}
          strokeWidth="1"
        />
      ))}

      {/* End dot with glow */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={strokeColor} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="8" fill={strokeColor} opacity="0.2">
        <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Labels */}
      {labels &&
        labels.map((label, i) => {
          const x = padding.left + (i / (labels.length - 1)) * chartW;
          return (
            <text
              key={i}
              x={x}
              y={height - 4}
              textAnchor="middle"
              className="fill-zinc-700 text-[9px]"
              fontFamily="monospace"
            >
              {label}
            </text>
          );
        })}
    </svg>
  );
}
