import { assertClearable, createBoard, mulberry32, type Grid } from "./logic.ts";

export type Shape = "full" | "round" | "arch" | "terrace" | "bay";

export type LevelDef = {
  id: number;
  name: string;
  pictureId: string;
  cols: number;
  rows: number;
  kinds: number;
  shape: Shape;
  doubles: number;
  seed: number;
};

export const levels: LevelDef[] = [
  { id: 1, name: "Morning Row", pictureId: "tulip-field", cols: 5, rows: 5, kinds: 4, shape: "full", doubles: 0, seed: 1101 },
  { id: 2, name: "Open Peony", pictureId: "peony", cols: 6, rows: 5, kinds: 4, shape: "full", doubles: 0, seed: 1207 },
  { id: 3, name: "Shallow Water", pictureId: "flamingo", cols: 6, rows: 6, kinds: 4, shape: "full", doubles: 0, seed: 1311 },
  { id: 4, name: "On the Branch", pictureId: "cherry-blossoms", cols: 6, rows: 6, kinds: 4, shape: "round", doubles: 3, seed: 1413 },
  { id: 5, name: "Sugar", pictureId: "pink-cupcakes", cols: 6, rows: 6, kinds: 4, shape: "terrace", doubles: 4, seed: 1519 },
  { id: 6, name: "Gold Band", pictureId: "gem-ring", cols: 7, rows: 6, kinds: 5, shape: "full", doubles: 4, seed: 1621 },
  { id: 7, name: "Soft Strand", pictureId: "pearl-strand", cols: 7, rows: 6, kinds: 5, shape: "round", doubles: 6, seed: 1723 },
  { id: 8, name: "Little Hearts", pictureId: "hearts-and-stars", cols: 7, rows: 6, kinds: 5, shape: "arch", doubles: 6, seed: 1829 },
  { id: 9, name: "Cut Glass", pictureId: "stained-glass", cols: 7, rows: 7, kinds: 5, shape: "full", doubles: 8, seed: 1931 },
  { id: 10, name: "Armful", pictureId: "tulip-bouquet", cols: 7, rows: 7, kinds: 5, shape: "round", doubles: 8, seed: 2039 },
  { id: 11, name: "One Tulip", pictureId: "tulip-closeup", cols: 7, rows: 7, kinds: 5, shape: "bay", doubles: 8, seed: 2141 },
  { id: 12, name: "After Rain", pictureId: "watering-can", cols: 7, rows: 7, kinds: 5, shape: "terrace", doubles: 10, seed: 2243 },
  { id: 13, name: "Low Tide", pictureId: "tide-pool", cols: 7, rows: 7, kinds: 6, shape: "arch", doubles: 10, seed: 2351 },
  { id: 14, name: "Robin", pictureId: "garden-robin", cols: 7, rows: 8, kinds: 6, shape: "full", doubles: 10, seed: 2453 },
  { id: 15, name: "Tall Sun", pictureId: "sunflower", cols: 7, rows: 8, kinds: 6, shape: "round", doubles: 12, seed: 2557 },
  { id: 16, name: "Migration", pictureId: "monarch", cols: 7, rows: 8, kinds: 6, shape: "bay", doubles: 12, seed: 2663 },
  { id: 17, name: "Petal Wheel", pictureId: "petal-mandala", cols: 7, rows: 8, kinds: 6, shape: "terrace", doubles: 14, seed: 2767 },
  { id: 18, name: "Second Cup", pictureId: "lemon-tea", cols: 7, rows: 8, kinds: 6, shape: "arch", doubles: 14, seed: 2873 },
  { id: 19, name: "The Gate", pictureId: "rose-cottage", cols: 7, rows: 8, kinds: 6, shape: "round", doubles: 16, seed: 2979 },
  { id: 20, name: "Evening Swan", pictureId: "still-swan", cols: 7, rows: 8, kinds: 6, shape: "bay", doubles: 18, seed: 3083 },
];

export function levelById(id: number): LevelDef | undefined {
  return levels.find((level) => level.id === id);
}

export function levelFromHash(hash: string): LevelDef | undefined {
  const match = /^#m=(\d+)$/.exec(hash);
  if (!match) return undefined;
  return levelById(Number(match[1]));
}

export function maskFor(level: LevelDef): boolean[][] {
  const mask = Array.from({ length: level.rows }, () => Array.from({ length: level.cols }, () => true));
  const { cols, rows, shape } = level;
  if (shape === "round") {
    mask[0][0] = false;
    mask[0][cols - 1] = false;
    mask[rows - 1][0] = false;
    mask[rows - 1][cols - 1] = false;
  } else if (shape === "arch") {
    const cut = Math.min(2, Math.floor((cols - 3) / 2));
    for (let c = 0; c < cut; c += 1) {
      mask[rows - 1][c] = false;
      mask[rows - 1][cols - 1 - c] = false;
    }
  } else if (shape === "terrace") {
    mask[0][0] = false;
    mask[0][cols - 1] = false;
  } else if (shape === "bay") {
    mask[0][Math.floor(cols / 2)] = false;
  }
  return mask;
}

export function coversFor(mask: boolean[][], doubles: number, rng: () => number): number[][] {
  const cover: number[][] = mask.map((row) => row.map((on) => (on ? 1 : 0)));
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < mask.length; r += 1) {
    for (let c = 0; c < (mask[r]?.length ?? 0); c += 1) if (mask[r]?.[c]) cells.push({ r, c });
  }
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = cells[i];
    cells[i] = cells[j] ?? cells[i];
    cells[j] = swap ?? cells[j];
  }
  for (let i = 0; i < doubles && i < cells.length; i += 1) {
    const cell = cells[i];
    if (cell) cover[cell.r][cell.c] = 2;
  }
  return cover;
}

export function createLevelGrid(level: LevelDef, seed = level.seed): Grid {
  const rng = mulberry32(seed >>> 0);
  const mask = maskFor(level);
  const cover = coversFor(mask, level.doubles, rng);
  return createBoard({ mask, cover, kinds: level.kinds }, rng);
}

for (const level of levels) {
  try {
    assertClearable(maskFor(level));
  } catch (error) {
    const message = error instanceof Error ? error.message : "bad shape";
    throw new Error(`Level ${level.id}: ${message}`);
  }
}
