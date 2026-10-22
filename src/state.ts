import { paletteById } from "./pictures/palettes.ts";
import type { PackId, Picture } from "./pictures/types.ts";

export type Tool = "fill" | "erase";
export type Filter = "all" | "finished";

export type Action = {
  regionId: string;
  from: string | null;
  to: string | null;
};

export type PictureSave = {
  fills: Record<string, string>;
  undo: Action[];
  redo: Action[];
};

export type SaveData = {
  version: 1;
  pack: PackId;
  filter: Filter;
  paletteId: string;
  colorIndex: number;
  tool: Tool;
  hints: boolean;
  sound: boolean;
  pictures: Record<string, PictureSave>;
};

const KEY = "linen.coloring.v1";
const UNDO_LIMIT = 60;

export function blankSave(): SaveData {
  return {
    version: 1,
    pack: "swift",
    filter: "all",
    paletteId: "petal",
    colorIndex: 0,
    tool: "fill",
    hints: false,
    sound: false,
    pictures: {},
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1) return blankSave();
    const base = blankSave();
    return {
      ...base,
      ...parsed,
      pictures: parsed.pictures ?? {},
      version: 1,
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
  return save.pictures[id] ?? { fills: {}, undo: [], redo: [] };
}

export function filledCount(picture: Picture, save: SaveData): number {
  const fills = pictureSave(save, picture.id).fills;
  return picture.regions.filter((region) => Boolean(fills[region.id])).length;
}

export function isComplete(picture: Picture, save: SaveData): boolean {
  return filledCount(picture, save) === picture.regions.length;
}

export function selectedColor(save: SaveData): string {
  const palette = paletteById(save.paletteId);
  return palette.colors[save.colorIndex] ?? palette.colors[0];
}

export function applyFill(save: SaveData, picture: Picture, regionId: string, color: string | null): SaveData {
  const current = pictureSave(save, picture.id);
  const from = current.fills[regionId] ?? null;
  if (from === color) return save;
  const fills = { ...current.fills };
  if (color) fills[regionId] = color;
  else delete fills[regionId];
  const undo = [...current.undo, { regionId, from, to: color }];
  if (undo.length > UNDO_LIMIT) undo.shift();
  return {
    ...save,
    pictures: {
      ...save.pictures,
      [picture.id]: { fills, undo, redo: [] },
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
      },
    },
  };
}
