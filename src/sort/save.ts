import type { SortStep } from "./logic.ts";

export type SortLevelSave = {
  won: boolean;
  bestMoves: number | null;
  history: SortStep[];
};

export type ZenSave = {
  seed: number;
  index: number;
  history: SortStep[];
  won: boolean;
};

export type SortSave = {
  version: 1;
  levels: Record<string, SortLevelSave>;
  zen: ZenSave | null;
};

const KEY = "linen.sort.v1";

export function blankSort(): SortSave {
  return { version: 1, levels: {}, zen: null };
}

export function loadSort(): SortSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankSort();
    const parsed = JSON.parse(raw) as Partial<SortSave>;
    if (parsed.version !== 1 || !parsed.levels || typeof parsed.levels !== "object") return blankSort();
    return { version: 1, levels: parsed.levels, zen: asZen(parsed.zen) };
  } catch {
    return blankSort();
  }
}

export function writeSort(save: SortSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* Private mode or a full disk. The session still works. */
  }
}

export function getSortLevel(id: number): SortLevelSave {
  const found = loadSort().levels[String(id)];
  if (!found) return { won: false, bestMoves: null, history: [] };
  return {
    won: Boolean(found.won),
    bestMoves: typeof found.bestMoves === "number" ? found.bestMoves : null,
    history: asHistory(found.history),
  };
}

export function putSortLevel(id: number, level: SortLevelSave): void {
  const save = loadSort();
  save.levels[String(id)] = level;
  writeSort(save);
}

export function putZen(zen: ZenSave | null): void {
  const save = loadSort();
  save.zen = zen;
  writeSort(save);
}

export function isSortUnlocked(id: number): boolean {
  if (id <= 1) return true;
  return getSortLevel(id - 1).won;
}

function asHistory(value: unknown): SortStep[] {
  if (!Array.isArray(value)) return [];
  const steps: SortStep[] = [];
  for (const step of value) {
    if (!step || typeof step !== "object") return [];
    const record = step as { kind?: unknown; from?: unknown; to?: unknown };
    if (record.kind === "extra") {
      steps.push({ kind: "extra" });
      continue;
    }
    if (record.kind === "pour" && Number.isInteger(record.from) && Number.isInteger(record.to)) {
      steps.push({ kind: "pour", from: record.from as number, to: record.to as number });
      continue;
    }
    return [];
  }
  return steps;
}

function asZen(value: unknown): ZenSave | null {
  if (!value || typeof value !== "object") return null;
  const zen = value as Partial<ZenSave>;
  if (!Number.isInteger(zen.seed) || !Number.isInteger(zen.index)) return null;
  return {
    seed: zen.seed as number,
    index: zen.index as number,
    history: asHistory(zen.history),
    won: Boolean(zen.won),
  };
}
