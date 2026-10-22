export const PAGE = { w: 320, h: 460, viewBox: "0 0 320 460" } as const;

export type PackId = "swift" | "dominion";

export type Region = {
  id: string;
  d: string;
  /** Color-by-number slot, 1 through 8. */
  n: number;
  label: [number, number] | null;
  evenodd?: boolean;
  transform?: string;
  clipId?: string;
  hintSize?: number;
};

export type Stroke = {
  d: string;
  w: number;
  transform?: string;
  /** Ink-filled decoration such as an eye. Omit for a plain line. */
  fill?: string;
  layer: "under" | "over";
};

export type Clip = {
  id: string;
  d: string;
};

export type Credit = {
  work: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
};

export type Picture = {
  id: string;
  pack: PackId;
  title: string;
  caption: string;
  viewBox: string;
  /** Outline thickness in viewBox units. Zero keeps the traced ink overlay as the only line. */
  regionStroke: number;
  credits: Credit[];
  regions: Region[];
  strokes: Stroke[];
  clips: Clip[];
};

export type Palette = {
  id: string;
  name: string;
  colors: string[];
};
