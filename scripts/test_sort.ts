import {
  LEVEL_COUNT,
  STACK,
  cloneJars,
  generateLevel,
  isCompleteJar,
  isWon,
  pour,
  pourAmount,
  replay,
  solveMove,
  specFor,
  zenSpec,
  type Jar,
} from "../src/sort/logic.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function jar(cap: number, colors: number[], hidden: boolean[] = []): Jar {
  return {
    cap,
    slots: colors.map((color, index) => ({ color, hidden: hidden[index] ?? false })),
  };
}

function counts(jars: Jar[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const one of jars) {
    for (const slot of one.slots) map.set(slot.color, (map.get(slot.color) ?? 0) + 1);
  }
  return map;
}

const empty = jar(4, []);
const rose = jar(4, [0, 0, 0]);
assert(pourAmount([rose, empty], 0, 1) === 3, "empty vase takes the whole run");
assert(pourAmount([rose, jar(4, [1])], 0, 1) === 0, "a different color does not pour");
assert(pourAmount([rose, jar(4, [0, 0, 0])], 0, 1) === 1, "a full-looking vase takes one when there is room");
assert(pourAmount([rose, jar(4, [0, 0, 0, 0])], 0, 1) === 0, "a full vase takes nothing");
assert(pour([rose, empty], 0, 0) === null, "a vase does not pour into itself");

const poured = pour([jar(4, [1, 0, 0]), empty], 0, 1);
assert(poured !== null && poured[1]?.slots.length === 2 && poured[0]?.slots.length === 1, "partial run moves");
assert(poured?.[0]?.slots[0]?.color === 1 && poured[0].slots[0].hidden === false, "the new top is revealed");

const buried = pour([jar(4, [2, 1], [true, false]), empty], 0, 1);
assert(buried?.[0]?.slots[0]?.hidden === false && buried[0].slots[0].color === 2, "uncovering a buried piece shows it");
assert(buried?.[1]?.slots.every((slot) => !slot.hidden), "poured pieces are visible");

const topped = pour([jar(4, [1, 2, 0, 0]), jar(4, [0])], 0, 1);
assert(topped !== null && topped[0]?.slots.map((slot) => slot.color).join() === "1,2", "a pour leaves the buried pieces");
assert(topped?.[1]?.slots.map((slot) => slot.color).join() === "0,0,0", "poured pieces land on the top of the stack");
assert(isWon([jar(4, [0, 0]), empty, jar(3, [1, 1, 1])]), "single colors and empty vases win");
assert(!isWon([jar(4, [0, 1])]), "a mixed vase is not won");
assert(isCompleteJar(jar(4, [3, 3, 3, 3])), "four of a color seal a vase");
assert(isCompleteJar(jar(6, [1, 1, 1, 1])), "a tall vase seals at four");
assert(isCompleteJar(jar(3, [2, 2, 2])), "a full narrow vase seals");
assert(!isCompleteJar(jar(4, [2, 2])), "two of a color stay open");
assert(!isCompleteJar(empty), "an empty vase has no lid");

const start = [jar(4, [1, 0, 0]), empty];
const mid = replay(start, [{ kind: "pour", from: 0, to: 1 }]);
assert(mid !== null && mid[1]?.slots.length === 2, "replay pours");
const undone = replay(start, []);
assert(undone !== null && undone[0]?.slots.map((slot) => slot.color).join() === "1,0,0", "dropping the pour undoes it");
const restored = pour(pour([jar(4, [0, 0, 0, 0]), empty], 0, 1) ?? [], 1, 0);
assert(restored !== null && restored[0]?.slots.length === 4 && restored[1]?.slots.length === 0, "a whole run pours back onto the empty vase");

assert(specFor(1).colors === 4 && specFor(1).spares === 3, "table 1 is four colors and three spares");
assert(specFor(12).colors === 4 && specFor(13).colors === 5, "colors step every twelve tables");
assert(specFor(97).colors === 12 && specFor(110).colors === 12, "the last tables use twelve colors");
assert(specFor(11).spares === 2 && specFor(96).spares === 1, "spare vases thin out");
assert(specFor(40).hidden && specFor(48).narrow && specFor(56).tall, "later tables add twists");
assert(LEVEL_COUNT >= 100, "at least 100 tables");

const started = performance.now();
let hardest = 0;
let slowest = 0;
for (let id = 1; id <= LEVEL_COUNT; id += 1) {
  const spec = specFor(id);
  const level = generateLevel(id);
  assert(level.colors === spec.colors, `${id} color count`);
  assert(!isWon(level.jars), `${id} is already sorted`);
  const tally = counts(level.jars);
  for (let color = 0; color < spec.colors; color += 1) {
    assert(tally.get(color) === STACK, `${id} color ${color} count`);
  }
  assert(level.jars.filter((one) => one.slots.length === 0).length <= spec.spares, `${id} spare count`);
  if (spec.hidden) assert(level.jars.some((one) => one.slots.some((slot) => slot.hidden)), `${id} hides buried pieces`);
  if (spec.narrow) assert(level.jars.some((one) => one.cap === STACK - 1), `${id} has a narrow vase`);
  if (spec.tall) assert(level.jars.some((one) => one.cap === STACK + 2), `${id} has a tall vase`);
  const twistSet = new Set(level.twists);
  assert(twistSet.has("hidden") === spec.hidden, `${id} hidden twist`);
  assert(twistSet.has("narrow") === spec.narrow, `${id} narrow twist`);
  assert(twistSet.has("tall") === spec.tall, `${id} tall twist`);

  let jars = cloneJars(level.jars);
  const history = [];
  const t0 = performance.now();
  while (!isWon(jars)) {
    const move = solveMove(jars);
    assert(move !== null, `${id} solver stopped after ${history.length}`);
    const next = pour(jars, move.from, move.to);
    assert(next !== null, `${id} solver poured illegally`);
    history.push({ kind: "pour" as const, from: move.from, to: move.to });
    jars = next;
    assert(history.length < 80, `${id} solution is too long`);
  }
  const elapsed = performance.now() - t0;
  if (elapsed > slowest) slowest = elapsed;
  if (history.length > hardest) hardest = history.length;
  const undone = replay(level.jars, history.slice(0, -1));
  assert(undone !== null && !isWon(undone), `${id} undo of the last pour`);
  const again = replay(level.jars, history);
  assert(again !== null && isWon(again), `${id} replay`);
  const withSpare = replay(level.jars, [{ kind: "extra" }]);
  assert(withSpare !== null && withSpare.length === level.jars.length + 1, `${id} extra vase`);
}
const zen = zenSpec(3, 99);
assert(!isWon(zen.jars) && solveMove(zen.jars, 40_000) !== null, "zen table is solvable");

console.log(
  `sort: ${LEVEL_COUNT} tables solved, longest ${hardest} pours, slowest ${Math.round(slowest)}ms, total ${Math.round(performance.now() - started)}ms`,
);
