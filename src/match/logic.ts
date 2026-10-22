/** Pure match-3 rules. No DOM, no timers, no fail state. */

export type CellPos = { r: number; c: number };

export type PieceAt = CellPos & { id: number; kind: number };

export type Frame = {
  cleared: PieceAt[];
  pieces: PieceAt[];
  covers: number[][];
};

export type Grid = {
  cols: number;
  rows: number;
  kinds: number;
  mask: boolean[][];
  piece: number[][];
  cover: number[][];
  id: number[][];
  nextId: number;
};

export type BoardSpec = {
  mask: boolean[][];
  cover: number[][];
  kinds: number;
};

export type Move = [CellPos, CellPos];

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function assertClearable(mask: boolean[][]): void {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const run = (r: number, c: number, dr: number, dc: number): number => {
    let n = 1;
    for (let step = 1; step < cols + rows; step += 1) {
      const rr = r + dr * step;
      const cc = c + dc * step;
      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols || !mask[rr]?.[cc]) break;
      n += 1;
    }
    for (let step = 1; step < cols + rows; step += 1) {
      const rr = r - dr * step;
      const cc = c - dc * step;
      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols || !mask[rr]?.[cc]) break;
      n += 1;
    }
    return n;
  };
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (!mask[r]?.[c]) continue;
      if (run(r, c, 0, 1) < 3 && run(r, c, 1, 0) < 3) {
        throw new Error(`Cell ${r},${c} can never be part of a line of three`);
      }
    }
  }
}

export function createBoard(spec: BoardSpec, rng: () => number): Grid {
  const rows = spec.mask.length;
  const cols = spec.mask[0]?.length ?? 0;
  if (!rows || !cols) throw new Error("Empty board");
  const grid: Grid = {
    cols,
    rows,
    kinds: spec.kinds,
    mask: spec.mask,
    piece: spec.mask.map((row) => row.map(() => -1)),
    cover: spec.cover.map((row) => row.slice()),
    id: spec.mask.map((row) => row.map(() => -1)),
    nextId: 1,
  };
  fillNoMatches(grid, rng);
  if (!findMove(grid)) reshuffle(grid, rng);
  return grid;
}

export function listPieces(grid: Grid): PieceAt[] {
  const out: PieceAt[] = [];
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      const id = grid.id[r]?.[c] ?? -1;
      if (id < 0) continue;
      out.push({ r, c, id, kind: grid.piece[r]?.[c] ?? 0 });
    }
  }
  return out;
}

export function hasMatch(grid: Grid): boolean {
  return matchedPieces(grid).length > 0;
}

export function isWon(grid: Grid): boolean {
  const stats = coverStats(grid);
  return stats.total > 0 && stats.clear === stats.total;
}

export function coverStats(grid: Grid): { clear: number; total: number } {
  let clear = 0;
  let total = 0;
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      if (!grid.mask[r]?.[c]) continue;
      total += 1;
      if ((grid.cover[r]?.[c] ?? 1) <= 0) clear += 1;
    }
  }
  return { clear, total };
}

export function findMove(grid: Grid): Move | null {
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      if (!playable(grid, r, c)) continue;
      const neighbors: CellPos[] = [];
      if (playable(grid, r, c + 1)) neighbors.push({ r, c: c + 1 });
      if (playable(grid, r + 1, c)) neighbors.push({ r: r + 1, c });
      for (const next of neighbors) {
        exchange(grid, { r, c }, next);
        const ok = hasMatch(grid);
        exchange(grid, { r, c }, next);
        if (ok) return [{ r, c }, next];
      }
    }
  }
  return null;
}

/** Swap two neighbors. Returns false and leaves the grid unchanged when the swap makes no line. */
export function swapOnly(grid: Grid, a: CellPos, b: CellPos): boolean {
  if (!adjacent(a, b) || !playable(grid, a.r, a.c) || !playable(grid, b.r, b.c)) return false;
  exchange(grid, a, b);
  if (hasMatch(grid)) return true;
  exchange(grid, a, b);
  return false;
}

export function resolveAll(grid: Grid, rng: () => number): Frame[] {
  const frames: Frame[] = [];
  for (let guard = 0; guard < 48; guard += 1) {
    const cleared = matchedPieces(grid);
    if (!cleared.length) break;
    for (const cell of cleared) {
      grid.piece[cell.r][cell.c] = -1;
      grid.id[cell.r][cell.c] = -1;
      if (grid.cover[cell.r][cell.c] > 0) grid.cover[cell.r][cell.c] -= 1;
    }
    collapse(grid, rng);
    frames.push({
      cleared,
      pieces: listPieces(grid),
      covers: grid.cover.map((row) => row.slice()),
    });
  }
  return frames;
}

export function trySwap(grid: Grid, a: CellPos, b: CellPos, rng: () => number): Frame[] | null {
  if (!swapOnly(grid, a, b)) return null;
  return resolveAll(grid, rng);
}

export function reshuffle(grid: Grid, rng: () => number): boolean {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    fillNoMatches(grid, rng);
    if (findMove(grid)) return true;
  }
  forceMove(grid);
  return findMove(grid) !== null;
}

export function fingerprint(grid: Grid): string {
  return JSON.stringify({ piece: grid.piece, cover: grid.cover, id: grid.id });
}

function playable(grid: Grid, r: number, c: number): boolean {
  return Boolean(grid.mask[r]?.[c]) && (grid.piece[r]?.[c] ?? -1) >= 0;
}

function adjacent(a: CellPos, b: CellPos): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

function exchange(grid: Grid, a: CellPos, b: CellPos): void {
  const piece = grid.piece[a.r][a.c];
  grid.piece[a.r][a.c] = grid.piece[b.r][b.c];
  grid.piece[b.r][b.c] = piece;
  const id = grid.id[a.r][a.c];
  grid.id[a.r][a.c] = grid.id[b.r][b.c];
  grid.id[b.r][b.c] = id;
}

function matchedPieces(grid: Grid): PieceAt[] {
  const cells = new Map<string, PieceAt>();
  const take = (r: number, c: number, len: number, dr: number, dc: number): void => {
    if (len < 3) return;
    for (let i = 0; i < len; i += 1) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const key = `${rr},${cc}`;
      if (cells.has(key)) continue;
      cells.set(key, { r: rr, c: cc, id: grid.id[rr][cc], kind: grid.piece[rr][cc] });
    }
  };
  for (let r = 0; r < grid.rows; r += 1) {
    let c = 0;
    while (c < grid.cols) {
      if (!playable(grid, r, c)) {
        c += 1;
        continue;
      }
      const kind = grid.piece[r][c];
      let end = c + 1;
      while (end < grid.cols && grid.mask[r]?.[end] && grid.piece[r]?.[end] === kind) end += 1;
      take(r, c, end - c, 0, 1);
      c = end;
    }
  }
  for (let c = 0; c < grid.cols; c += 1) {
    let r = 0;
    while (r < grid.rows) {
      if (!playable(grid, r, c)) {
        r += 1;
        continue;
      }
      const kind = grid.piece[r][c];
      let end = r + 1;
      while (end < grid.rows && grid.mask[end]?.[c] && grid.piece[end]?.[c] === kind) end += 1;
      take(r, c, end - r, 1, 0);
      r = end;
    }
  }
  return [...cells.values()];
}

function collapse(grid: Grid, rng: () => number): void {
  for (let c = 0; c < grid.cols; c += 1) {
    const rows: number[] = [];
    for (let r = 0; r < grid.rows; r += 1) if (grid.mask[r]?.[c]) rows.push(r);
    const kept: { id: number; kind: number }[] = [];
    for (const r of rows) {
      const kind = grid.piece[r]?.[c] ?? -1;
      if (kind >= 0) kept.push({ id: grid.id[r][c], kind });
    }
    const missing = rows.length - kept.length;
    const next: { id: number; kind: number }[] = [];
    for (let i = 0; i < missing; i += 1) {
      const id = grid.nextId;
      grid.nextId += 1;
      next.push({ id, kind: Math.floor(rng() * grid.kinds) });
    }
    next.push(...kept);
    for (const r of rows) {
      grid.piece[r][c] = -1;
      grid.id[r][c] = -1;
    }
    for (let i = 0; i < rows.length; i += 1) {
      const item = next[i];
      const r = rows[i];
      if (!item || r === undefined) continue;
      grid.piece[r][c] = item.kind;
      grid.id[r][c] = item.id;
    }
  }
}

function fillNoMatches(grid: Grid, rng: () => number): void {
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      if (!grid.mask[r]?.[c]) {
        grid.piece[r][c] = -1;
        grid.id[r][c] = -1;
        continue;
      }
      const banned = new Set<number>();
      if (
        c >= 2 &&
        grid.mask[r]?.[c - 1] &&
        grid.mask[r]?.[c - 2] &&
        grid.piece[r][c - 1] >= 0 &&
        grid.piece[r][c - 1] === grid.piece[r][c - 2]
      ) {
        banned.add(grid.piece[r][c - 1]);
      }
      if (
        r >= 2 &&
        grid.mask[r - 1]?.[c] &&
        grid.mask[r - 2]?.[c] &&
        grid.piece[r - 1][c] >= 0 &&
        grid.piece[r - 1][c] === grid.piece[r - 2][c]
      ) {
        banned.add(grid.piece[r - 1][c]);
      }
      const options: number[] = [];
      for (let kind = 0; kind < grid.kinds; kind += 1) if (!banned.has(kind)) options.push(kind);
      const pick = options[Math.floor(rng() * options.length)] ?? 0;
      grid.piece[r][c] = pick;
      grid.id[r][c] = grid.nextId;
      grid.nextId += 1;
    }
  }
}

function forceMove(grid: Grid): void {
  const saved = grid.piece.map((row) => row.slice());
  const restore = (): void => {
    for (let r = 0; r < saved.length; r += 1) {
      for (let c = 0; c < (saved[r]?.length ?? 0); c += 1) grid.piece[r][c] = saved[r][c] ?? -1;
    }
  };
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols - 2; c += 1) {
      if (!grid.mask[r]?.[c] || !grid.mask[r]?.[c + 1] || !grid.mask[r]?.[c + 2]) continue;
      const neighbors: CellPos[] = [
        { r: r + 1, c: c + 2 },
        { r: r - 1, c: c + 2 },
        { r, c: c + 3 },
      ];
      for (const next of neighbors) {
        if (!grid.mask[next.r]?.[next.c]) continue;
        if (next.r === r && next.c >= c && next.c <= c + 2) continue;
        grid.piece[r][c] = 0;
        grid.piece[r][c + 1] = 0;
        grid.piece[r][c + 2] = 1;
        grid.piece[next.r][next.c] = 0;
        if (!hasMatch(grid) && findMove(grid)) return;
        restore();
      }
    }
  }
}
