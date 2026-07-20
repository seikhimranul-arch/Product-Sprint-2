import { memo } from "react";

function SparklineChart({ data = [], color = "var(--color-halo-indigo)" }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-full w-full relative">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Flat spending trend chart">
          <path d="M0 50 L 100 50" fill="none" stroke="var(--color-border)" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  const max = data.reduce((currentMax, value) => Math.max(currentMax, value), -Infinity);
  const min = data.reduce((currentMin, value) => Math.min(currentMin, value), Infinity);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 90 - ((val - min) / range) * 80;
    return `${x} ${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // Create fill path (closed at bottom)
  const fillD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div className="h-full w-full relative">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Spending trend chart">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#chartGradient)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" style={{ filter: `drop-shadow(0 0 4px ${color}40)` }} />
      </svg>
    </div>
  );
}

export default memo(SparklineChart);
