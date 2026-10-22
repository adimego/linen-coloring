import { dominionPictures } from "./dominion.ts";
import { swiftPictures } from "./swift.ts";
import type { PackId, Picture } from "./types.ts";

export const packs: { id: PackId; name: string; blurb: string }[] = [
  {
    id: "swift",
    name: "Taylor Swift",
    blurb: "Lights, keepsakes, and soft sparkle.",
  },
  {
    id: "dominion",
    name: "Old Dominion",
    blurb: "Roads, porches, and late sun.",
  },
];

export const pictures: Picture[] = [...swiftPictures(), ...dominionPictures()];

function assertPictures(list: Picture[]): void {
  const ids = new Set<string>();
  for (const picture of list) {
    if (ids.has(picture.id)) throw new Error(`Duplicate picture ${picture.id}`);
    ids.add(picture.id);
    const regions = new Set<string>();
    if (picture.regions.length < 8) throw new Error(`${picture.id} needs more regions`);
    for (const region of picture.regions) {
      if (regions.has(region.id)) throw new Error(`${picture.id} repeats region ${region.id}`);
      regions.add(region.id);
      if (region.n < 1 || region.n > 8) throw new Error(`${picture.id} ${region.id} has a bad number`);
      if (!region.d.trim()) throw new Error(`${picture.id} ${region.id} is empty`);
    }
  }
  for (const pack of packs) {
    const count = list.filter((picture) => picture.pack === pack.id).length;
    if (count < 6) throw new Error(`${pack.name} needs at least 6 pictures`);
  }
}

assertPictures(pictures);

export function picturesIn(pack: PackId): Picture[] {
  return pictures.filter((picture) => picture.pack === pack);
}

export function getPicture(id: string): Picture | undefined {
  return pictures.find((picture) => picture.id === id);
}
