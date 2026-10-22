const paths: Record<string, string> = {
  back: `<path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  undo: `<path d="M8 8H4.5V4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5.2 8.2A7 7 0 1 1 6 16.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  redo: `<path d="M16 8h3.5V4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18.8 8.2A7 7 0 1 0 18 16.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  download: `<path d="M12 4.5v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m8.2 10.8 3.8 3.8 3.8-3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 18.5h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  sound: `<path d="M8 10H5.5v4H8l4 3V7L8 10Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15 9.5a3.2 3.2 0 0 1 0 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16.8 7.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  mute: `<path d="M8 10H5.5v4H8l4 3V7L8 10Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m16 10 4 4M20 10l-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  eraser: `<path d="m14.8 5.2 4 4a1.5 1.5 0 0 1 0 2.1L11 19.2H6.2l-1.6-1.6a1.5 1.5 0 0 1 0-2.1l8.1-10.3a1.5 1.5 0 0 1 2.1 0Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.2 13.8 12.6 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  hint: `<path d="M9 8.2a3 3 0 0 1 5.2 2c0 2-3.2 2.2-3.2 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="11" cy="17.2" r="0.9" fill="currentColor"/>`,
  minus: `<path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  plus: `<path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  fit: `<path d="M8 4.5H4.5V8M16 4.5h3.5V8M8 19.5H4.5V16M16 19.5h3.5V16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
  find: `<circle cx="10.5" cy="10.5" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m13.8 13.8 4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  sun: `<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 4.5v1.8M12 17.7v1.8M4.5 12h1.8M17.7 12h1.8M6.7 6.7l1.3 1.3M16 16l1.3 1.3M17.3 6.7 16 8M8 16l-1.3 1.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  moon: `<path d="M16 15.2A6.2 6.2 0 0 1 8.6 6.2 6.4 6.4 0 1 0 16 15.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`,
  monitor: `<rect x="4.5" y="6" width="15" height="10" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 19.5h6M12 16v3.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  pause: `<path d="M8 6.5v11M16 6.5v11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  image: `<rect x="4.5" y="6" width="15" height="12" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="9" cy="10.2" r="1.2" fill="currentColor"/><path d="m6.5 16 3.2-3.2 2.2 2.1L15 11l2.5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  waves: `<path d="M4 15.5c2-2 3.2-2 5.2 0s3.2 2 5.2 0 3.2-2 5.2 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4 10c2-2 3.2-2 5.2 0s3.2 2 5.2 0 3.2-2 5.2 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  refresh: `<path d="M18.5 12a6.5 6.5 0 1 1-1.7-4.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18.6 4.6V8h-3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
};

export function icon(name: keyof typeof paths): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}
