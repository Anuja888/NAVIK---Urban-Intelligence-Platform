// ── Sparkline — tiny inline SVG trend line ─────────────────
interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

export function Sparkline({ data, color, width = 56, height = 22, strokeWidth = 1.5 }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Area fill path
  const areaPoints =
    `${pad},${height - pad} ` +
    points +
    ` ${(width - pad).toFixed(1)},${height - pad}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline-svg"
      aria-hidden="true"
    >
      <polyline
        points={areaPoints}
        fill={color}
        fillOpacity={0.12}
        stroke="none"
      />
      <polyline
        points={points}
        className="sparkline-line"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Endpoint dot */}
      {(() => {
        const last = data[data.length - 1];
        const x = (width - pad).toFixed(1);
        const y = (pad + (1 - (last - min) / range) * (height - pad * 2)).toFixed(1);
        return <circle cx={x} cy={y} r={2.5} fill={color} />;
      })()}
    </svg>
  );
}
