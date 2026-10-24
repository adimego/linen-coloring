import { maskFor, type LevelDef } from "./levels.ts";
import type { Grid } from "./logic.ts";

export type Snapshot = {
  pieces: number[];
  covers: number[];
  ids: number[];
  nextId: number;
  moves: number;
  seed: number;
};

export type LevelSave = {
  won: boolean;
  bestMoves: number | null;
  pendingReveal: boolean;
  snapshot: Snapshot | null;
};

export type MatchSave = {
  version: 1;
  levels: Record<string, LevelSave>;
};

const KEY = "linen.match.v1";

export function blankMatch(): MatchSave {
  return { version: 1, levels: {} };
}

export function loadMatch(): MatchSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankMatch();
    const parsed = JSON.parse(raw) as Partial<MatchSave>;
    if (parsed.version !== 1 || !parsed.levels || typeof parsed.levels !== "object") return blankMatch();
    return { version: 1, levels: parsed.levels };
  } catch {
    return blankMatch();
  }
}

export function writeMatch(save: MatchSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* Private mode or a full disk. The session still works. */
  }
}

function asSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== "object") return null;
  const snap = value as Snapshot;
  if (!Array.isArray(snap.pieces) || !Array.isArray(snap.covers) || !Array.isArray(snap.ids)) return null;
  if (!Number.isInteger(snap.nextId) || !Number.isInteger(snap.moves) || !Number.isInteger(snap.seed)) return null;
  return snap;
}

export function getLevel(save: MatchSave, id: number): LevelSave {
  const found = save.levels[String(id)];
  if (!found) return { won: false, bestMoves: null, pendingReveal: false, snapshot: null };
  return {
    won: Boolean(found.won),
    bestMoves: typeof found.bestMoves === "number" ? found.bestMoves : null,
    pendingReveal: Boolean(found.pendingReveal),
    snapshot: asSnapshot(found.snapshot),
  };
}

export function putLevel(id: number, level: LevelSave): void {
  const save = loadMatch();
  save.levels[String(id)] = level;
  writeMatch(save);
}

/** Every level is playable from the start. Clear seals still come from the save. */
export function isUnlocked(_save: MatchSave, _id: number): boolean {
  return true;
}

export function snapshotFromGrid(grid: Grid, moves: number, seed: number): Snapshot {
  const pieces: number[] = [];
  const covers: number[] = [];
  const ids: number[] = [];
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      pieces.push(grid.piece[r]?.[c] ?? -1);
      covers.push(grid.cover[r]?.[c] ?? 0);
      ids.push(grid.id[r]?.[c] ?? -1);
    }
  }
  return { pieces, covers, ids, nextId: grid.nextId, moves, seed };
}

export function applySnapshot(grid: Grid, snap: Snapshot): boolean {
  const count = grid.rows * grid.cols;
  if (snap.pieces.length !== count || snap.covers.length !== count || snap.ids.length !== count) return false;
  let index = 0;
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      if (!grid.mask[r]?.[c]) {
        grid.piece[r][c] = -1;
        grid.cover[r][c] = 0;
        grid.id[r][c] = -1;
      } else {
        const kind = snap.pieces[index] ?? -1;
        const id = snap.ids[index] ?? -1;
        const cover = snap.covers[index] ?? 1;
        if (kind < 0 || kind >= grid.kinds || id < 0 || cover < 0 || cover > 2) return false;
        grid.piece[r][c] = kind;
        grid.cover[r][c] = cover;
        grid.id[r][c] = id;
      }
      index += 1;
    }
  }
  grid.nextId = Math.max(snap.nextId, grid.nextId);
  return true;
}

export function snapshotProgress(level: LevelDef, snap: Snapshot | null, won: boolean): { clear: number; total: number } {
  const mask = maskFor(level);
  let total = 0;
  let clear = 0;
  let index = 0;
  for (const row of mask) {
    for (const on of row) {
      if (on) {
        total += 1;
        if (won && !snap) clear += 1;
        else if (snap && (snap.covers[index] ?? 1) <= 0) clear += 1;
      }
      index += 1;
    }
  }
  return { clear, total };
}
