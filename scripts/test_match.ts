import { assertClearable, coverStats, findMove, fingerprint, hasMatch, isWon, mulberry32, reshuffle, trySwap, type Grid } from "../src/match/logic.ts";
import { createLevelGrid, levels, maskFor } from "../src/match/levels.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(levels.length === 20, "expected 20 levels");
const ids = new Set<number>();
for (const level of levels) {
  assert(!ids.has(level.id), `duplicate level ${level.id}`);
  ids.add(level.id);
  assert(level.kinds >= 4 && level.kinds <= 6, `${level.id} kinds`);
  assertClearable(maskFor(level));
  const grid = createLevelGrid(level);
  assert(!hasMatch(grid), `level ${level.id} starts with a match`);
  assert(findMove(grid) !== null, `level ${level.id} has no move`);
  let doubles = 0;
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      if (!grid.mask[r]?.[c]) {
        assert(grid.piece[r]?.[c] === -1, `level ${level.id} hole has a piece`);
        assert(grid.cover[r]?.[c] === 0, `level ${level.id} hole is covered`);
        continue;
      }
      const kind = grid.piece[r]?.[c] ?? -1;
      assert(kind >= 0 && kind < level.kinds, `level ${level.id} bad kind`);
      const cover = grid.cover[r]?.[c] ?? 0;
      assert(cover === 1 || cover === 2, `level ${level.id} bad cover`);
      if (cover === 2) doubles += 1;
    }
  }
  assert(doubles === level.doubles, `level ${level.id} has ${doubles} double covers`);
  assert(fingerprint(grid) === fingerprint(createLevelGrid(level)), `level ${level.id} is not stable`);
  const stats = coverStats(grid);
  assert(stats.clear === 0 && stats.total > 0, `level ${level.id} should start covered`);
}

function hand(): Grid {
  return {
    cols: 3,
    rows: 3,
    kinds: 8,
    mask: [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ],
    piece: [
      [0, 0, 1],
      [2, 3, 0],
      [5, 6, 7],
    ],
    cover: [
      [2, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    id: [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    nextId: 10,
  };
}

const invalid = hand();
const before = fingerprint(invalid);
assert(trySwap(invalid, { r: 0, c: 2 }, { r: 1, c: 0 }, mulberry32(1)) === null, "diagonal swap should be ignored");
assert(fingerprint(invalid) === before, "rejected swap changed the board");
const miss = hand();
const missBefore = fingerprint(miss);
assert(trySwap(miss, { r: 0, c: 2 }, { r: 1, c: 1 }, mulberry32(1)) === null, "swap without a line should return");
assert(fingerprint(miss) === missBefore, "undone swap changed the board");

let step = 0;
const seq = (): number => [0.5, 0.63, 0.8][step++] ?? 0.1;
const board = hand();
const frames = trySwap(board, { r: 0, c: 2 }, { r: 1, c: 2 }, seq);
assert(frames !== null && frames.length === 1, "one cascade step");
assert(board.cover[0]?.[0] === 1, "double cover should lose one layer");
assert(board.cover[0]?.[1] === 0 && board.cover[0]?.[2] === 0, "matched tiles should uncover");
assert(board.cover[1]?.[0] === 1, "unmatched tile should stay covered");
assert(board.piece[1]?.[0] === 2, "the piece under the match should stay put");
assert(board.piece[0]?.[0] === 4, "a new piece should fall in");
assert(!isWon(board), "one layer should remain");

const almost = hand();
almost.cover = almost.cover.map((row) => row.map(() => 0));
almost.cover[0] = [1, 1, 1];
step = 0;
assert(trySwap(almost, { r: 0, c: 2 }, { r: 1, c: 2 }, seq) !== null, "last match should clear");
assert(isWon(almost), "clearing the last covers should win");

function quietBoard(seed: number): Grid {
  const size = 4;
  const kinds = 5;
  const rng = mulberry32(seed);
  const mask = Array.from({ length: size }, () => Array.from({ length: size }, () => true));
  const grid: Grid = {
    cols: size,
    rows: size,
    kinds,
    mask,
    piece: mask.map((row) => row.map(() => -1)),
    cover: mask.map((row) => row.map(() => 1)),
    id: mask.map((row) => row.map(() => -1)),
    nextId: 1,
  };
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const banned = new Set<number>();
      const left = grid.piece[r]?.[c - 1];
      const left2 = grid.piece[r]?.[c - 2];
      const up = grid.piece[r - 1]?.[c];
      const up2 = grid.piece[r - 2]?.[c];
      if (c >= 2 && left !== undefined && left >= 0 && left === left2) banned.add(left);
      if (r >= 2 && up !== undefined && up >= 0 && up === up2) banned.add(up);
      const options = [0, 1, 2, 3, 4].filter((kind) => !banned.has(kind));
      const kind = options[Math.floor(rng() * options.length)] ?? 0;
      grid.piece[r][c] = kind;
      grid.id[r][c] = grid.nextId;
      grid.nextId += 1;
    }
  }
  return grid;
}

let stuck: Grid | null = null;
for (let seed = 1; seed < 4000 && !stuck; seed += 1) {
  const candidate = quietBoard(seed);
  if (!hasMatch(candidate) && findMove(candidate) === null) stuck = candidate;
}
assert(stuck !== null, "expected to find a board with no swaps");
assert(reshuffle(stuck, mulberry32(99)), "reshuffle should find a layout");
assert(!hasMatch(stuck) && findMove(stuck) !== null, "reshuffle should leave a quiet move");

const round = levels.find((level) => level.shape === "round");
assert(Boolean(round) && createLevelGrid(round ?? levels[0]).mask[0]?.[0] === false, "rounded boards drop the corner");

console.log(`match logic ok (${levels.length} levels)`);
