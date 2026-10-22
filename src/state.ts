import type { CategoryId, Picture } from "./pictures/types.ts";

export type Filter = "all" | "finished";
export type CategoryFilter = CategoryId | "all";

export type Action = {
  regionId: string;
  from: string | null;
  to: string | null;
};

export type PictureSave = {
  fills: Record<string, string>;
  undo: Action[];
  redo: Action[];
  colorIndex: number;
};

export type SaveData = {
  version: 2;
  category: CategoryFilter;
  filter: Filter;
  sound: boolean;
  pictures: Record<string, PictureSave>;
};

const KEY = "linen.coloring.v2";
const UNDO_LIMIT = 80;

export function blankSave(): SaveData {
  return {
    version: 2,
    category: "all",
    filter: "all",
    sound: false,
    pictures: {},
  };
}

function blankPicture(): PictureSave {
  return { fills: {}, undo: [], redo: [], colorIndex: 0 };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 2) return blankSave();
    const base = blankSave();
    return {
      ...base,
      category: parsed.category ?? "all",
      filter: parsed.filter === "finished" ? "finished" : "all",
      sound: Boolean(parsed.sound),
      pictures: parsed.pictures ?? {},
      version: 2,
    };
  } catch {
    return blankSave();
  }
}

export function writeSave(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* Private mode or a full disk. The session still works. */
  }
}

export function pictureSave(save: SaveData, id: string): PictureSave {
  const found = save.pictures[id];
  if (!found) return blankPicture();
  return {
    fills: found.fills ?? {},
    undo: Array.isArray(found.undo) ? found.undo : [],
    redo: Array.isArray(found.redo) ? found.redo : [],
    colorIndex: Number.isInteger(found.colorIndex) ? found.colorIndex : 0,
  };
}

export function filledCount(picture: Picture, save: SaveData): number {
  const fills = pictureSave(save, picture.id).fills;
  return picture.regions.filter((region) => Boolean(fills[region.id])).length;
}

export function isComplete(picture: Picture, save: SaveData): boolean {
  return picture.regions.length > 0 && filledCount(picture, save) === picture.regions.length;
}

export function colorProgress(picture: Picture, save: SaveData, n: number): { done: number; total: number } {
  const fills = pictureSave(save, picture.id).fills;
  const regions = picture.regions.filter((region) => region.n === n);
  return { done: regions.filter((region) => Boolean(fills[region.id])).length, total: regions.length };
}

export function firstOpenIndex(picture: Picture, save: SaveData, prefer: number): number {
  const fills = pictureSave(save, picture.id).fills;
  const count = picture.colors.length;
  for (let step = 0; step < count; step += 1) {
    const index = (prefer + step + count) % count;
    const n = index + 1;
    if (picture.regions.some((region) => region.n === n && !fills[region.id])) return index;
  }
  return Math.min(Math.max(prefer, 0), Math.max(0, count - 1));
}

export function withColor(save: SaveData, pictureId: string, colorIndex: number): SaveData {
  const current = pictureSave(save, pictureId);
  return {
    ...save,
    pictures: {
      ...save.pictures,
      [pictureId]: { ...current, colorIndex },
    },
  };
}

export function applyFill(save: SaveData, picture: Picture, regionId: string, color: string): SaveData {
  const current = pictureSave(save, picture.id);
  const from = current.fills[regionId] ?? null;
  if (from === color) return save;
  const fills = { ...current.fills, [regionId]: color };
  const undo = [...current.undo, { regionId, from, to: color }];
  if (undo.length > UNDO_LIMIT) undo.shift();
  return {
    ...save,
    pictures: {
      ...save.pictures,
      [picture.id]: { fills, undo, redo: [], colorIndex: current.colorIndex },
    },
  };
}

export function applyUndo(save: SaveData, pictureId: string): SaveData {
  const current = pictureSave(save, pictureId);
  const action = current.undo[current.undo.length - 1];
  if (!action) return save;
  const fills = { ...current.fills };
  if (action.from) fills[action.regionId] = action.from;
  else delete fills[action.regionId];
  return {
    ...save,
    pictures: {
      ...save.pictures,
      [pictureId]: {
        fills,
        undo: current.undo.slice(0, -1),
        redo: [...current.redo, action],
        colorIndex: current.colorIndex,
      },
    },
  };
}

export function applyRedo(save: SaveData, pictureId: string): SaveData {
  const current = pictureSave(save, pictureId);
  const action = current.redo[current.redo.length - 1];
  if (!action) return save;
  const fills = { ...current.fills };
  if (action.to) fills[action.regionId] = action.to;
  else delete fills[action.regionId];
  return {
    ...save,
    pictures: {
      ...save.pictures,
      [pictureId]: {
        fills,
        undo: [...current.undo, action],
        redo: current.redo.slice(0, -1),
        colorIndex: current.colorIndex,
      },
    },
  };
}
