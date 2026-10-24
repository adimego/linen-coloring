export const PAGE = { w: 320, h: 460, viewBox: "0 0 320 460" } as const;

export const categories = [
  { id: "intricate", name: "Intricate" },
  { id: "tulips", name: "Tulips" },
  { id: "pink", name: "Pink" },
  { id: "jewelry", name: "Jewelry" },
  { id: "fun-designs", name: "Fun Designs" },
  { id: "music", name: "Music" },
  { id: "relaxing-landscapes", name: "Relaxing Landscapes" },
  { id: "beach", name: "Beach" },
  { id: "city", name: "City" },
  { id: "peaceful", name: "Peaceful Places" },
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

export type Credit = {
  work: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
};

export type Picture = {
  id: string;
  category: CategoryId | "daily" | "photo";
  title: string;
  caption: string;
  viewBox: string;
  colors: string[];
  regions: Region[];
  outline: string;
  ink: Ink[];
  credits?: Credit[];
};
