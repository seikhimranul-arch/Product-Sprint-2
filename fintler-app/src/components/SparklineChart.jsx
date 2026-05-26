export default function SparklineChart() {
  return (
    <div className="mt-8 h-16 w-full relative">
      <svg
        className="absolute bottom-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0 80 Q 20 70, 40 90 T 80 40 T 100 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-tertiary"
          style={{
            filter: "drop-shadow(0px 0px 4px rgba(0, 223, 193, 0.5))",
          }}
        />
      </svg>
    </div>
  );
}
