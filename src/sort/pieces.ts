/** Original pastel pieces for Sort. One shape per color, drawn for Linen. */

export type Tone = { name: string; fill: string; deep: string; light: string };

export const TONES: Tone[] = [
  { name: "Sea glass", fill: "#6ec4bc", deep: "#3c8f88", light: "#e5faf6" },
  { name: "Rose bead", fill: "#e8889c", deep: "#b4546c", light: "#ffe0e7" },
  { name: "Petal", fill: "#f3b4d0", deep: "#c56d93", light: "#ffe8f2" },
  { name: "Lemon candy", fill: "#f2c84e", deep: "#c4921e", light: "#fff3c8" },
  { name: "Lilac gem", fill: "#b09adf", deep: "#7058a8", light: "#efe8ff" },
  { name: "Shell", fill: "#f0a87c", deep: "#c46d42", light: "#ffe6d4" },
  { name: "Button", fill: "#7eb6ea", deep: "#3d78b4", light: "#e7f3ff" },
  { name: "Macaron", fill: "#f0b0a4", deep: "#c47064", light: "#ffece7" },
  { name: "Pebble", fill: "#8fbf9a", deep: "#4d8a5c", light: "#e7f7ea" },
  { name: "Star", fill: "#f0a04a", deep: "#c46a1c", light: "#ffe7c6" },
  { name: "Leaf", fill: "#6aaa72", deep: "#3d7a48", light: "#e3f6e4" },
  { name: "Pearl", fill: "#f7f1e8", deep: "#c8b6a4", light: "#ffffff" },
];

export function toneName(color: number): string {
  return TONES[color]?.name ?? "Piece";
}

export function bitMarkup(color: number, hidden: boolean): string {
  if (hidden) return hiddenMarkup();
  const tone = TONES[color] ?? TONES[0];
  const shape = SHAPES[color] ?? SHAPES[0];
  if (!tone || !shape) return hiddenMarkup();
  return shape(tone);
}

function hiddenMarkup(): string {
  return svg(
    `<rect x="9" y="9" width="22" height="22" rx="7" fill="#e4d2c6" stroke="#c4aa9c" stroke-width="1.5"/>
    <path d="M16.2 16.4a3.8 3.8 0 0 1 6.6 1.5c0 2.3-2.6 2.7-2.6 4.6" fill="none" stroke="#a88b7c" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="20.2" cy="26.4" r="1.15" fill="#a88b7c"/>`,
  );
}

type Draw = (tone: Tone) => string;

function svg(body: string): string {
  return `<svg viewBox="0 0 40 40" aria-hidden="true">${body}</svg>`;
}

const SHAPES: Draw[] = [
  (tone) =>
    svg(
      `<path d="M9 17c.4-6 7.2-10 13.4-8.2 5.2 1.4 9.2 6.4 8.2 12.4-1.2 7.2-6.6 12.2-13.6 11.2-6.4-.8-10.2-6.4-8-15.4z" fill="${tone.fill}"/>
      <path d="M14 15c2.2-1.2 5.2-.2 6.4 2.2" fill="none" stroke="${tone.light}" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M16 24c3 2 7 1.2 9-1" fill="none" stroke="${tone.deep}" stroke-width="1.2" stroke-linecap="round" opacity="0.45"/>`,
    ),
  (tone) =>
    svg(
      `<circle cx="20" cy="20" r="12.5" fill="${tone.fill}"/>
      <circle cx="20" cy="20" r="4.2" fill="${tone.light}"/>
      <ellipse cx="15" cy="14.5" rx="3.2" ry="1.8" fill="${tone.light}" opacity="0.85"/>`,
    ),
  (tone) =>
    svg(
      `<path d="M20 34c-1.6-7.5-8.5-13-8.5-20C11.5 8.2 15.2 4.5 20 4.5S28.5 8.2 28.5 14C28.5 21 21.6 26.5 20 34z" fill="${tone.fill}"/>
      <path d="M20 30c.2-7 3.2-13 3.4-17.5" fill="none" stroke="${tone.deep}" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>
      <ellipse cx="16.5" cy="13" rx="2.2" ry="1.3" fill="${tone.light}" opacity="0.8"/>`,
    ),
  (tone) =>
    svg(
      `<path d="M5 20 11 14.5h18L35 20l-6 5.5H11z" fill="${tone.fill}"/>
      <path d="M5 20 11 14.5v11z" fill="${tone.deep}"/>
      <path d="M35 20 29 14.5v11z" fill="${tone.deep}"/>
      <path d="M15 18.2h10" stroke="${tone.light}" stroke-width="1.5" stroke-linecap="round"/>`,
    ),
  (tone) =>
    svg(
      `<path d="M20 5.5 31 14.5 20 34.5 9 14.5z" fill="${tone.fill}"/>
      <path d="M9 14.5h22" stroke="${tone.light}" stroke-width="1.3"/>
      <path d="M20 5.5 15.2 14.5h9.6z" fill="${tone.light}" opacity="0.55"/>
      <path d="M20 34.5 15.2 14.5h9.6" fill="none" stroke="${tone.deep}" stroke-width="1" opacity="0.35"/>`,
    ),
  (tone) =>
    svg(
      `<path d="M7.5 26.5C9 14 15 8 20 8s11 6 12.5 18.5c-3.6 4-8 6-12.5 6s-8.8-2-12.5-6z" fill="${tone.fill}"/>
      <path d="M20 9.5v20.5M14.2 14c2 4.2 4 10 5.8 16M25.8 14c-2 4.2-4 10-5.8 16" fill="none" stroke="${tone.deep}" stroke-width="1.15" opacity="0.4" stroke-linecap="round"/>`,
    ),
  (tone) =>
    svg(
      `<circle cx="20" cy="20" r="13" fill="${tone.fill}"/>
      <circle cx="20" cy="20" r="8.5" fill="none" stroke="${tone.deep}" stroke-width="1.2" opacity="0.35"/>
      <circle cx="16.2" cy="16.2" r="1.5" fill="${tone.deep}"/>
      <circle cx="23.8" cy="16.2" r="1.5" fill="${tone.deep}"/>
      <circle cx="16.2" cy="23.8" r="1.5" fill="${tone.deep}"/>
      <circle cx="23.8" cy="23.8" r="1.5" fill="${tone.deep}"/>
      <ellipse cx="15" cy="12.5" rx="3" ry="1.5" fill="${tone.light}" opacity="0.7"/>`,
    ),
  (tone) =>
    svg(
      `<ellipse cx="20" cy="15.5" rx="12" ry="6.5" fill="${tone.fill}"/>
      <path d="M8 16.5h24v5.2H8z" fill="${tone.light}"/>
      <ellipse cx="20" cy="24" rx="12" ry="6.5" fill="${tone.deep}"/>
      <ellipse cx="15.5" cy="13.5" rx="3" ry="1.4" fill="#fff" opacity="0.6"/>`,
    ),
  (tone) =>
    svg(
      `<ellipse cx="20" cy="21" rx="13" ry="10" fill="${tone.fill}" transform="rotate(-14 20 21)"/>
      <ellipse cx="15" cy="17" rx="4" ry="2" fill="${tone.light}" opacity="0.75" transform="rotate(-14 15 17)"/>`,
    ),
  (tone) =>
    svg(
      `<path d="M20 5.5 23.4 14.2H32.6L25.2 19.6 28 28.4 20 23.2 12 28.4 14.8 19.6 7.4 14.2h9.2z" fill="${tone.fill}"/>
      <path d="M20 10.5 21.4 14.8" stroke="${tone.light}" stroke-width="1.4" stroke-linecap="round"/>`,
    ),
  (tone) =>
    svg(
      `<path d="M20 34.5C11 26 8.5 16.5 14 10c6.5-4.2 14-.6 16.5 7.5C33 27 26.5 33 20 34.5z" fill="${tone.fill}"/>
      <path d="M16.5 26.5c3.6-4.2 7.2-9.5 11-15.5" fill="none" stroke="${tone.deep}" stroke-width="1.25" stroke-linecap="round"/>
      <ellipse cx="16" cy="14" rx="2.2" ry="1.2" fill="${tone.light}" opacity="0.75"/>`,
    ),
  (tone) =>
    svg(
      `<circle cx="20" cy="21" r="12" fill="${tone.fill}"/>
      <circle cx="20" cy="21" r="12" fill="none" stroke="${tone.deep}" stroke-width="1.3"/>
      <ellipse cx="15.2" cy="16" rx="4" ry="2.3" fill="${tone.light}" opacity="0.9"/>`,
    ),
];
