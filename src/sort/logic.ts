/**
 * Sort rules and a solver. A level is built by undoing legal pours
 * from a finished board, then the solver has to find a way back.
 */
import { mulberry32 } from "../match/logic.ts";

export const LEVEL_COUNT = 110;
export const STACK = 4;

export type Move = { from: number; to: number };

export type Slot = { color: number; hidden: boolean };

export type Jar = {
  cap: number;
  slots: Slot[];
};

export type SortLevel = {
  id: number;
  colors: number;
  seed: number;
  twists: Array<"hidden" | "narrow" | "tall">;
  jars: Jar[];
};

export type SortStep =
  | { kind: "pour"; from: number; to: number }
  | { kind: "extra" };

type Tube = { cap: number; stack: number[] };

export function cloneJars(jars: Jar[]): Jar[] {
  return jars.map((jar) => ({ cap: jar.cap, slots: jar.slots.map((slot) => ({ ...slot })) }));
}

export function topRun(stack: number[]): { color: number; count: number } | null {
  if (!stack.length) return null;
  const color = stack[stack.length - 1] ?? 0;
  let count = 0;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i] !== color) break;
    count += 1;
  }
  return { color, count };
}

export function pourAmount(jars: Jar[], from: number, to: number): number {
  if (from === to) return 0;
  const source = jars[from];
  const dest = jars[to];
  if (!source || !dest) return 0;
  const run = topRun(source.slots.map((slot) => slot.color));
  if (!run) return 0;
  const space = dest.cap - dest.slots.length;
  if (space < 1) return 0;
  const destTop = dest.slots[dest.slots.length - 1];
  if (destTop && destTop.color !== run.color) return 0;
  return Math.min(run.count, space);
}

export function pour(jars: Jar[], from: number, to: number): Jar[] | null {
  const amount = pourAmount(jars, from, to);
  if (!amount) return null;
  const next = cloneJars(jars);
  const source = next[from];
  const dest = next[to];
  if (!source || !dest) return null;
  const moving = source.slots.splice(source.slots.length - amount, amount);
  for (const slot of moving) dest.slots.push({ color: slot.color, hidden: false });
  reveal(next);
  return next;
}

/** The top item of every jar is visible. A hidden item stays hidden until it is on top. */
export function reveal(jars: Jar[]): void {
  for (const jar of jars) {
    const top = jar.slots[jar.slots.length - 1];
    if (top?.hidden) top.hidden = false;
  }
}

export function isWon(jars: Jar[]): boolean {
  return jars.every((jar) => {
    if (!jar.slots.length) return true;
    const color = jar.slots[0]?.color;
    return jar.slots.every((slot) => slot.color === color);
  });
}

export function isCompleteJar(jar: Jar): boolean {
  if (!jar.slots.length) return false;
  const color = jar.slots[0]?.color;
  if (!jar.slots.every((slot) => slot.color === color)) return false;
  return jar.slots.length === jar.cap || jar.slots.length >= STACK;
}

export function boundaries(stacks: number[][]): number {
  let count = 0;
  for (const stack of stacks) {
    for (let i = 1; i < stack.length; i += 1) {
      if (stack[i] !== stack[i - 1]) count += 1;
    }
  }
  return count;
}

/** Replay pours and added vases from the level's opening. Null if a step is illegal. */
export function replay(base: Jar[], history: SortStep[]): Jar[] | null {
  let jars = cloneJars(base);
  for (const step of history) {
    if (step.kind === "extra") {
      jars = [...jars, { cap: STACK, slots: [] }];
      continue;
    }
    const next = pour(jars, step.from, step.to);
    if (!next) return null;
    jars = next;
  }
  return jars;
}

export function solveMove(jars: Jar[], nodeLimit = 80_000): Move | null {
  if (isWon(jars)) return null;
  const indexed = jars.map((jar, index) => ({ jar, index }));
  indexed.sort((a, b) => compareTube(tubeOf(a.jar), tubeOf(b.jar)));
  const sorted = indexed.map((entry) => tubeOf(entry.jar));
  const found = search(sorted, nodeLimit);
  if (!found) return null;
  const from = indexed[found.from]?.index;
  const to = indexed[found.to]?.index;
  if (from === undefined || to === undefined) return null;
  return { from, to };
}

function tubeOf(jar: Jar): Tube {
  return { cap: jar.cap, stack: jar.slots.map((slot) => slot.color) };
}

function compareTube(a: Tube, b: Tube): number {
  if (a.cap !== b.cap) return a.cap - b.cap;
  if (a.stack.length !== b.stack.length) return a.stack.length - b.stack.length;
  for (let i = 0; i < a.stack.length; i += 1) {
    const delta = (a.stack[i] ?? 0) - (b.stack[i] ?? 0);
    if (delta) return delta;
  }
  return 0;
}

function keyOf(tubes: Tube[]): string {
  return tubes.map((tube) => `${tube.cap}:${tube.stack.join(".")}`).join("/");
}

function canon(tubes: Tube[]): Tube[] {
  return tubes.map((tube) => ({ cap: tube.cap, stack: tube.stack.slice() })).sort(compareTube);
}

type HeapNode = { f: number; g: number; tubes: Tube[]; move: Move | null };

function search(start: Tube[], nodeLimit: number): Move | null {
  const open: HeapNode[] = [{ f: boundaries(start.map((tube) => tube.stack)), g: 0, tubes: start, move: null }];
  const seen = new Set<string>([keyOf(start)]);
  let expanded = 0;
  while (open.length && expanded < nodeLimit) {
    const node = pop(open);
    if (!node) break;
    if (boundaries(node.tubes.map((tube) => tube.stack)) === 0) return node.move;
    expanded += 1;
    for (const move of legalMoves(node.tubes)) {
      const next = applyTube(node.tubes, move);
      const canonical = canon(next);
      const key = keyOf(canonical);
      if (seen.has(key)) continue;
      seen.add(key);
      const g = node.g + 1;
      const h = boundaries(canonical.map((tube) => tube.stack));
      push(open, { f: g + h, g, tubes: canonical, move: node.move ?? move });
    }
  }
  return null;
}

function legalMoves(tubes: Tube[]): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < tubes.length; from += 1) {
    for (let to = 0; to < tubes.length; to += 1) {
      if (from === to) continue;
      if (tubePour(tubes, from, to) > 0) moves.push({ from, to });
    }
  }
  return moves;
}

function tubePour(tubes: Tube[], from: number, to: number): number {
  const source = tubes[from];
  const dest = tubes[to];
  if (!source || !dest) return 0;
  const run = topRun(source.stack);
  if (!run) return 0;
  const space = dest.cap - dest.stack.length;
  if (space < 1) return 0;
  const destTop = dest.stack[dest.stack.length - 1];
  if (destTop !== undefined && destTop !== run.color) return 0;
  // Moving a finished stack onto an empty jar of the same size does not help.
  if (dest.stack.length === 0 && run.count === source.stack.length && source.cap === dest.cap && run.count === source.cap) return 0;
  return Math.min(run.count, space);
}

function applyTube(tubes: Tube[], move: Move): Tube[] {
  const amount = tubePour(tubes, move.from, move.to);
  const next = tubes.map((tube) => ({ cap: tube.cap, stack: tube.stack.slice() }));
  const source = next[move.from];
  const dest = next[move.to];
  if (!source || !dest || !amount) return next;
  const moving = source.stack.splice(source.stack.length - amount, amount);
  dest.stack.push(...moving);
  return next;
}

function push(heap: HeapNode[], node: HeapNode): void {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    const above = heap[parent];
    const here = heap[i];
    if (!above || !here || above.f < here.f || (above.f === here.f && above.g <= here.g)) break;
    heap[parent] = here;
    heap[i] = above;
    i = parent;
  }
}

function pop(heap: HeapNode[]): HeapNode | null {
  const top = heap[0];
  if (!top) return null;
  const last = heap.pop();
  if (!last || heap.length === 0) return top;
  heap[0] = last;
  let i = 0;
  for (;;) {
    const left = i * 2 + 1;
    const right = left + 1;
    let best = i;
    if (left < heap.length && (heap[left]?.f ?? Infinity) < (heap[best]?.f ?? Infinity)) best = left;
    if (right < heap.length && (heap[right]?.f ?? Infinity) < (heap[best]?.f ?? Infinity)) best = right;
    if (best === i) break;
    const a = heap[i];
    const b = heap[best];
    if (!a || !b) break;
    heap[i] = b;
    heap[best] = a;
    i = best;
  }
  return top;
}

export function specFor(level: number): { colors: number; spares: number; hidden: boolean; narrow: boolean; tall: boolean; depth: number; seed: number } {
  const colors = Math.min(12, 4 + Math.floor((level - 1) / 12));
  let spares = 2;
  if (level <= 10) spares = 3;
  else if (level >= 96) spares = 1;
  const hidden = level >= 40 && level % 5 === 0;
  const narrow = level >= 48 && level % 6 === 0;
  const tall = level >= 54 && level % 8 === 0;
  const depth = 8 + colors * 2 + Math.floor(level / 6);
  return { colors, spares, hidden, narrow, tall, depth, seed: (0x51e7 + level * 997) >>> 0 };
}

export function generateLevel(level: number): SortLevel {
  const spec = specFor(level);
  let depth = spec.depth;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const rng = mulberry32((spec.seed + attempt * 17) >>> 0);
    const tubes = solvedTubes(spec.colors, spec.spares, spec.narrow, spec.tall);
    scramble(tubes, rng, depth);
    shuffleTubes(tubes, rng);
    const jars = tubes.map((tube) => ({
      cap: tube.cap,
      slots: tube.stack.map((color) => ({ color, hidden: false })),
    }));
    if (spec.hidden) hideBuried(jars);
    reveal(jars);
    if (isWon(jars)) {
      depth += 4;
      continue;
    }
    if (solveMove(jars)) {
      const twists: SortLevel["twists"] = [];
      if (spec.hidden) twists.push("hidden");
      if (spec.narrow) twists.push("narrow");
      if (spec.tall) twists.push("tall");
      return { id: level, colors: spec.colors, seed: spec.seed, twists, jars };
    }
    depth = Math.max(6, depth - 4);
  }
  throw new Error(`Level ${level} has no solvable layout`);
}

function solvedTubes(colors: number, spares: number, narrow: boolean, tall: boolean): Tube[] {
  const tubes: Tube[] = [];
  for (let color = 0; color < colors; color += 1) {
    const cap = tall && color === 0 ? STACK + 2 : STACK;
    tubes.push({ cap, stack: Array.from({ length: STACK }, () => color) });
  }
  for (let spare = 0; spare < spares; spare += 1) {
    const cap = narrow && spare === 0 ? STACK - 1 : STACK;
    tubes.push({ cap, stack: [] });
  }
  return tubes;
}

function scramble(tubes: Tube[], rng: () => number, steps: number): void {
  for (let step = 0; step < steps; step += 1) {
    const options = reverseOptions(tubes);
    if (!options.length) return;
    const pick = options[Math.floor(rng() * options.length)];
    if (!pick) return;
    const k = 1 + Math.floor(rng() * pick.k);
    moveTop(tubes, pick.src, pick.dst, k);
  }
}

function reverseOptions(tubes: Tube[]): Array<{ src: number; dst: number; k: number }> {
  const options: Array<{ src: number; dst: number; k: number }> = [];
  for (let src = 0; src < tubes.length; src += 1) {
    const source = tubes[src];
    if (!source) continue;
    const run = topRun(source.stack);
    if (!run) continue;
    const whole = run.count === source.stack.length;
    const upper = whole ? run.count : run.count - 1;
    if (upper < 1) continue;
    for (let dst = 0; dst < tubes.length; dst += 1) {
      if (dst === src) continue;
      const dest = tubes[dst];
      if (!dest) continue;
      const space = dest.cap - dest.stack.length;
      if (space < 1) continue;
      const destTop = dest.stack[dest.stack.length - 1];
      if (destTop === run.color) continue;
      options.push({ src, dst, k: Math.min(upper, space) });
    }
  }
  return options;
}

function moveTop(tubes: Tube[], src: number, dst: number, k: number): void {
  const source = tubes[src];
  const dest = tubes[dst];
  if (!source || !dest) return;
  const moving = source.stack.splice(source.stack.length - k, k);
  dest.stack.push(...moving);
}

function shuffleTubes(tubes: Tube[], rng: () => number): void {
  for (let i = tubes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = tubes[i];
    const b = tubes[j];
    if (!a || !b) continue;
    tubes[i] = b;
    tubes[j] = a;
  }
}

function hideBuried(jars: Jar[]): void {
  for (const jar of jars) {
    const colors = jar.slots.map((slot) => slot.color);
    const run = topRun(colors);
    const visible = run?.count ?? 0;
    for (let i = 0; i < jar.slots.length - visible; i += 1) {
      const slot = jar.slots[i];
      if (slot) slot.hidden = true;
    }
  }
}

let cache: SortLevel[] | null = null;

export function levelById(id: number): SortLevel {
  if (!cache) cache = [];
  const found = cache[id];
  if (found) return found;
  const level = generateLevel(id);
  cache[id] = level;
  return level;
}

export function zenSpec(index: number, seed: number): SortLevel {
  const colors = 5 + (index % 6);
  let depth = 12 + colors * 2;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const local = mulberry32((seed + attempt * 29) >>> 0);
    const tubes = solvedTubes(colors, 2, index % 4 === 3, index % 5 === 4);
    scramble(tubes, local, depth);
    shuffleTubes(tubes, local);
    const jars = tubes.map((tube) => ({
      cap: tube.cap,
      slots: tube.stack.map((color) => ({ color, hidden: false })),
    }));
    if (index % 3 === 2) hideBuried(jars);
    reveal(jars);
    if (!isWon(jars) && solveMove(jars, 40_000)) {
      const twists: SortLevel["twists"] = [];
      if (index % 3 === 2) twists.push("hidden");
      if (index % 4 === 3) twists.push("narrow");
      if (index % 5 === 4) twists.push("tall");
      return { id: 0, colors, seed, twists, jars };
    }
    depth = Math.max(8, depth - 3);
  }
  return generateLevel(Math.min(LEVEL_COUNT, 12 + (index % 20)));
}
