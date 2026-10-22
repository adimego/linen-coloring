export type PieceArt = {
  name: string;
  disc: string;
  svg: string;
};

const shell = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 31c2 9 13 12 17 12s15-3 17-12c1-7-5-11-9-10 0 5-4 7-8 7s-8-2-8-7c-4-1-10 3-9 10Z" fill="#e9896a"/><path d="M24 34V18" stroke="#fff7f2" stroke-width="2.2" stroke-linecap="round"/><path d="M17 32c1-5 2-9 2-13M31 32c-1-5-2-9-2-13" fill="none" stroke="#f8d7c8" stroke-width="1.8" stroke-linecap="round"/></svg>`;

const flower = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="13" r="6.2" fill="#f7a8c4"/><circle cx="34.2" cy="20.2" r="6.2" fill="#f7a8c4"/><circle cx="30.4" cy="32.2" r="6.2" fill="#f29db8"/><circle cx="17.6" cy="32.2" r="6.2" fill="#f29db8"/><circle cx="13.8" cy="20.2" r="6.2" fill="#f7a8c4"/><circle cx="24" cy="23.2" r="5" fill="#ffe7b8"/></svg>`;

const tulip = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 18c-7 0-11 7-9 14 2 5 6 7 9 7s7-2 9-7c2-7-2-14-9-14Z" fill="#f4729a"/><path d="M24 18c-3-7-1-12 0-16 1 4 3 9 0 16Z" fill="#f7a8c0"/><path d="M24 39v6" stroke="#7eae78" stroke-width="2.6" stroke-linecap="round"/><path d="M24 43c-7 2-9 0-11-3" fill="none" stroke="#7eae78" stroke-width="2.2" stroke-linecap="round"/></svg>`;

const gem = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 16h20l6 9-16 16L8 25Z" fill="#cbb6f0"/><path d="M14 16 24 41 34 16" fill="#e6dcfa"/><path d="M8 25h32" stroke="#f8f4ff" stroke-width="1.8" stroke-linecap="round"/><path d="M18 16 14 25l10 16 10-16-4-9" fill="none" stroke="#f8f4ff" stroke-width="1.2"/></svg>`;

const leaf = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 42C11 33 9 16 13 8c12 2 24 13 22 30-4 2-8 4-11 4Z" fill="#8fc584"/><path d="M16 31c7-2 13-9 16-17" fill="none" stroke="#f3fff1" stroke-width="1.8" stroke-linecap="round"/></svg>`;

const heart = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 40C13 32 6 25 6 17a8.5 8.5 0 0 1 16-4 8.5 8.5 0 0 1 16 4c0 8-7 15-14 23Z" fill="#f08aa6"/></svg>`;

export const PIECES: PieceArt[] = [
  { name: "shell", disc: "#fde6da", svg: shell },
  { name: "flower", disc: "#ffe3ee", svg: flower },
  { name: "tulip", disc: "#ffd6e6", svg: tulip },
  { name: "gem", disc: "#efe7ff", svg: gem },
  { name: "leaf", disc: "#e5f6df", svg: leaf },
  { name: "heart", disc: "#ffe0e8", svg: heart },
];

const LEAF = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 34c8-16 22-20 32-18-6 14-16 24-30 24-1 0-2-2-2-6Z" fill="#d7e8cf" stroke="#b7cbb0" stroke-width="1"/></svg>`;

export function pieceByKind(kind: number): PieceArt {
  return PIECES[kind] ?? PIECES[0];
}

export function veilMarkup(cover: number): string {
  if (cover <= 0) return "";
  if (cover === 1) return `<span class="sprig sprig-a">${LEAF}</span>`;
  return `<span class="sprig sprig-a">${LEAF}</span><span class="sprig sprig-b">${LEAF}</span>`;
}
