export default function SparklineChart({ data = [] }) {
  // If not enough data, just draw a flat line
  if (!data || data.length < 2) {
    return (
      <div className="mt-8 h-16 w-full relative">
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 50 L 100 50" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-bright" />
        </svg>
      </div>
    );
  }

  // Normalize data for SVG coordinates (0-100)
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1; // avoid division by zero

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    // Invert Y axis (SVG 0 is at top) and scale between 10 and 90 to give padding
    const y = 90 - ((val - min) / range) * 80;
    return `${x} ${y}`;
  });

  // Create smooth bezier curves or just lines
  // A simple line path is "M x1 y1 L x2 y2 L x3 y3"
  const pathD = `M ${points.join(" L ")}`;

  return (
    <div className="mt-8 h-16 w-full relative">
      <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-tertiary transition-all duration-1000"
          style={{ filter: "drop-shadow(0px 0px 4px rgba(0, 223, 193, 0.5))" }}
        />
      </svg>
    </div>
  );
}
