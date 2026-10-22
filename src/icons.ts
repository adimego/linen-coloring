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
};

export function icon(name: keyof typeof paths): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}
