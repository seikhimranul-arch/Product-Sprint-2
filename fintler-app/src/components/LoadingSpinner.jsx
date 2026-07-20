export default function LoadingSpinner({ text = "Syncing transactions..." }) {
  return (
    <div className="halo-spinner on">
      <svg viewBox="0 0 48 48">
        <polyline id="back" points="4,24 12,24 16,14 24,34 32,14 36,24 44,24" />
        <polyline id="front" points="4,24 12,24 16,14 24,34 32,14 36,24 44,24" />
      </svg>
      <span className="text-[11px]" style={{ color: "var(--color-halo-text3)" }}>{text}</span>
    </div>
  );
}
