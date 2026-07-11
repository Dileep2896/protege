// Loader — a pencil line drawing itself. Every waiting moment in the app is a
// sketch in progress, not a spinner.
export default function Loader({ label = "sketching…" }) {
  return (
    <div className="loader" role="status" aria-label={label}>
      <svg viewBox="0 0 140 30" width="140" height="30" aria-hidden="true">
        <path
          className="loader-path"
          d="M5 19 C 20 5, 34 27, 50 15 S 78 5, 94 17 S 122 23, 135 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="loader-label">{label}</span>
    </div>
  );
}
