export const PAGE = { w: 320, h: 460, viewBox: "0 0 320 460" } as const;

export const categories = [
  { id: "animals", name: "Animals" },
  { id: "flowers", name: "Flowers" },
  { id: "mandalas", name: "Mandalas" },
  { id: "landscapes", name: "Landscapes" },
  { id: "food", name: "Food" },
  { id: "butterflies", name: "Butterflies" },
  { id: "birds", name: "Birds" },
  { id: "places", name: "Places" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export type Region = {
  id: string;
  d: string;
  /** 1-based index into the picture palette. */
  n: number;
  label: [number, number] | null;
  hintSize?: number;
  evenodd?: boolean;
};

export type Ink = {
  d: string;
  w: number;
};

export type Picture = {
  id: string;
  category: CategoryId;
  title: string;
  caption: string;
  viewBox: string;
  colors: string[];
  regions: Region[];
  outline: string;
  ink: Ink[];
};
