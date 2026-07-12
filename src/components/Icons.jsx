// Icons — professional 2px-stroke marks matching the worksheet ink. No emojis.
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

const I = ({ children, size = 16, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...base} {...rest}>{children}</svg>
);

export const IconBook = p => (
  <I {...p}><path d="M4 5.5C4 4.7 4.7 4 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 17.5Z" /><path d="M4 17.5C4 16.7 4.7 16 5.5 16H20" /><path d="M8 8h8M8 11h5" /></I>
);
export const IconMap = p => (
  <I {...p}><path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" /><path d="M9 4v14M15 6v14" /></I>
);
export const IconCap = p => (
  <I {...p}><path d="m12 4 9 4.5-9 4.5-9-4.5L12 4Z" /><path d="M6.5 11v4.5c0 1 2.5 2.5 5.5 2.5s5.5-1.5 5.5-2.5V11" /><path d="M21 8.5V14" /></I>
);
export const IconFolder = p => (
  <I {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></I>
);
export const IconPlus = p => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const IconChart = p => (
  <I {...p}><path d="M4 4v15a1 1 0 0 0 1 1h15" /><path d="M8 16v-5M12.5 16V7.5M17 16v-8" /></I>
);
export const IconFlame = p => (
  <I {...p}><path d="M12 3.5c1 2.5-.5 4 .8 5.8 1-.7 1.4-1.5 1.5-2.8 2 1.8 3.2 4 3.2 6.3A5.7 5.7 0 0 1 12 18.5a5.7 5.7 0 0 1-5.5-5.7c0-3.5 3.3-5.4 5.5-9.3Z" /><path d="M12 18.5c-1.4 0-2.4-1-2.4-2.4 0-1.5 1.2-2.3 2.4-4 1.2 1.7 2.4 2.5 2.4 4 0 1.4-1 2.4-2.4 2.4Z" /></I>
);
export const IconTrophy = p => (
  <I {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4" /><path d="M12 13v3M9 19h6M10 16h4v3h-4z" /></I>
);
export const IconSparkle = p => (
  <I {...p}><path d="M12 4c.6 3.4 2 4.8 5.5 5.5C14 10.2 12.6 11.6 12 15c-.6-3.4-2-4.8-5.5-5.5C10 8.8 11.4 7.4 12 4Z" /><path d="M18.5 15c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7Z" /></I>
);
export const IconChevron = p => <I {...p}><path d="m8 10 4 4.5 4-4.5" /></I>;
export const IconQuote = p => (
  <I {...p}><path d="M5 15c0-4 1.7-6.7 5-8-1.4 1.8-1.8 3-1.7 4.5C9.9 11.6 11 12.7 11 14.2A2.8 2.8 0 0 1 8.2 17C6.3 17 5 16.2 5 15ZM13.5 15c0-4 1.7-6.7 5-8-1.4 1.8-1.8 3-1.7 4.5 1.6.1 2.7 1.2 2.7 2.7A2.8 2.8 0 0 1 16.7 17c-1.9 0-3.2-.8-3.2-2Z" /></I>
);
export const IconTarget = p => (
  <I {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.2" /><circle cx="12" cy="12" r="0.8" /></I>
);
export const IconMic = p => (
  <I {...p}><rect x="9.2" y="4" width="5.6" height="10" rx="2.8" /><path d="M6 12a6 6 0 0 0 12 0M12 18v2.5" /></I>
);
export const IconChat = p => (
  <I {...p}><path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16H10l-4.5 3.7V16A2.5 2.5 0 0 1 4.5 13.5Z" /><path d="M8.5 8.5h7M8.5 11.5h4.5" /></I>
);
export const IconSpeaker = p => (
  <I {...p}><path d="M4.5 9.5v5H8l4.5 3.5v-12L8 9.5Z" /><path d="M15.5 9.5a4 4 0 0 1 0 5M17.8 7.5a7 7 0 0 1 0 9" /></I>
);
export const IconCalendar = p => (
  <I {...p}><rect x="4" y="5.5" width="16" height="14" rx="1.6" /><path d="M4 10h16M8.5 3.8v3.4M15.5 3.8v3.4" /></I>
);
export const IconPin = p => (
  <I {...p}><path d="M12 20.5s6.2-6.1 6.2-10.3a6.2 6.2 0 1 0-12.4 0C5.8 14.4 12 20.5 12 20.5Z" /><circle cx="12" cy="10" r="2.2" /></I>
);
export const IconStudent = p => (
  <I {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></I>
);
export const IconApple = p => (
  <I {...p}><path d="M12 7.5c-1-.8-2.6-1.2-4-.5-2.2 1.1-2.9 4.2-1.5 7.2 1.2 2.7 3.3 4.6 5.5 4.6s4.3-1.9 5.5-4.6c1.4-3 .7-6.1-1.5-7.2-1.4-.7-3-.3-4 .5Z" /><path d="M12 7.5c0-1.8.8-3 2.5-3.7" /></I>
);
export const IconCards = p => (
  <I {...p}><rect x="4" y="6.5" width="11" height="14" rx="1.6" transform="rotate(-8 9.5 13.5)" /><path d="M10 4.5 18.6 6a1.6 1.6 0 0 1 1.3 1.9L18.2 17" /></I>
);
export const IconFilm = p => (
  <I {...p}><rect x="4" y="5" width="16" height="14" rx="1.6" /><path d="M8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4" /></I>
);
export const IconPlay = p => (
  <I {...p}><path d="M8.5 5.8v12.4L18 12 8.5 5.8Z" /></I>
);
export const IconVideo = p => (
  <I {...p}><rect x="3.5" y="7" width="12" height="10" rx="1.8" /><path d="m15.5 11 5-3v8l-5-3" /></I>
);
export const IconSpeakerOff = p => (
  <I {...p}><path d="M4.5 9.5v5H8l4.5 3.5v-12L8 9.5Z" /><path d="m15.5 10 5 5M20.5 10l-5 5" /></I>
);
export const IconPen = p => (
  <I {...p}><path d="m14.5 5 4.5 4.5L8 20.5l-5 1 1-5L14.5 5Z" /><path d="m12.5 7 4.5 4.5" /></I>
);
export const IconHangup = p => (
  <I {...p}><path d="M4 14.5c4.7-4.4 11.3-4.4 16 0l-2.4 2.9c-.5.6-1.3.7-2 .3l-2-1.2a1.6 1.6 0 0 1-.8-1.4v-1.4a11 11 0 0 0-5.6 0v1.4c0 .57-.3 1.1-.8 1.4l-2 1.2c-.7.4-1.5.3-2-.3L4 14.5Z" /></I>
);
