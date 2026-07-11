// Milo's face — hand-drawn SVG, expression follows mood from the turn result.
export default function MiloFace({ mood = "confused", size = 44 }) {
  const eyes = {
    confused: <>
      <circle cx="13" cy="17" r="1.8" fill="#22252A" />
      <circle cx="27" cy="16" r="1.8" fill="#22252A" />
      <path d="M9.5 12.5 Q13 10.5 16.5 12" stroke="#22252A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M23.5 10.5 Q27 13 30.5 11" stroke="#22252A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>,
    thinking: <>
      <circle cx="13" cy="15.5" r="1.8" fill="#22252A" />
      <circle cx="27" cy="15.5" r="1.8" fill="#22252A" />
      <path d="M9.5 11.5 Q13 10 16.5 11.5" stroke="#22252A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M23.5 11.5 Q27 10 30.5 11.5" stroke="#22252A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>,
    clicking: <>
      <circle cx="13" cy="16.5" r="2.4" fill="#22252A" />
      <circle cx="27" cy="16.5" r="2.4" fill="#22252A" />
    </>,
    aha: <>
      <path d="M10.5 16.5 Q13 13.5 15.5 16.5" stroke="#22252A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M24.5 16.5 Q27 13.5 29.5 16.5" stroke="#22252A" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  };
  const mouth = {
    confused: <path d="M14 28 Q17 26.5 20 28 Q23 29.5 26 27.5" stroke="#22252A" strokeWidth="1.8" fill="none" strokeLinecap="round" />,
    thinking: <path d="M15.5 28.5 L24.5 28.5" stroke="#22252A" strokeWidth="1.8" strokeLinecap="round" />,
    clicking: <ellipse cx="20" cy="28.5" rx="3" ry="4" stroke="#22252A" strokeWidth="1.8" fill="none" />,
    aha: <path d="M13 26 Q20 33.5 27 26" stroke="#22252A" strokeWidth="2" fill="none" strokeLinecap="round" />
  };
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={`milo-face mood-${mood}`} aria-label={`Milo feeling ${mood}`}>
      <path
        d="M20 3.5 C29 3 36.5 9.5 36.5 19.5 C36.5 30 30 36.5 20.5 36.5 C10.5 36.5 3.5 30.5 3.5 20 C3.5 10 11 4 20 3.5 Z"
        fill="#FDFCF8" stroke="#22252A" strokeWidth="1.8"
      />
      <path d="M12 6.5 Q16 1.5 19 5.5 Q22 1 25 5 Q27.5 2.5 29 6" stroke="#22252A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {eyes[mood] || eyes.confused}
      {mouth[mood] || mouth.confused}
    </svg>
  );
}
