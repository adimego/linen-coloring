import bonfireFile from "./art/od-bonfire.json";
import hatFile from "./art/od-hat.json";
import instrumentsFile from "./art/od-instruments.json";
import sailFile from "./art/od-sail.json";
import towerFile from "./art/od-tower.json";
import truckFile from "./art/od-truck.json";
import braceletsFile from "./art/swift-bracelets.json";
import cardiganFile from "./art/swift-cardigan.json";
import catsFile from "./art/swift-cats.json";
import guitarFile from "./art/swift-guitar.json";
import mirrorballFile from "./art/swift-mirrorball.json";
import snakeFile from "./art/swift-snake.json";
import stageFile from "./art/swift-stage.json";
import type { Credit, PackId, Picture, Region, Stroke } from "./types.ts";

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

type ArtFile = {
  id: string;
  pack: PackId;
  title: string;
  caption: string;
  viewBox: string;
  regionStroke: number;
  credits: Credit[];
  regions: Region[];
  strokes: Stroke[];
  clips: Picture["clips"];
};

function art(file: ArtFile): Picture {
  return {
    id: file.id,
    pack: file.pack,
    title: file.title,
    caption: file.caption,
    viewBox: file.viewBox,
    regionStroke: file.regionStroke,
    credits: file.credits,
    regions: file.regions,
    strokes: file.strokes,
    clips: file.clips ?? [],
  };
}

export const pictures: Picture[] = [
  art(stageFile as unknown as ArtFile),
  art(guitarFile as unknown as ArtFile),
  art(braceletsFile as unknown as ArtFile),
  art(catsFile as unknown as ArtFile),
  art(snakeFile as unknown as ArtFile),
  art(cardiganFile as unknown as ArtFile),
  art(mirrorballFile as unknown as ArtFile),
  art(truckFile as unknown as ArtFile),
  art(hatFile as unknown as ArtFile),
  art(instrumentsFile as unknown as ArtFile),
  art(towerFile as unknown as ArtFile),
  art(bonfireFile as unknown as ArtFile),
  art(sailFile as unknown as ArtFile),
];

function assertPictures(list: Picture[]): void {
  const ids = new Set<string>();
  for (const picture of list) {
    if (ids.has(picture.id)) throw new Error(`Duplicate picture ${picture.id}`);
    ids.add(picture.id);
    if (!picture.credits.length) throw new Error(`${picture.id} is missing credits`);
    for (const credit of picture.credits) {
      if (!credit.sourceUrl.startsWith("https://")) throw new Error(`${picture.id} has a bad source`);
      if (!credit.license || !credit.author || !credit.licenseUrl.startsWith("https://")) {
        throw new Error(`${picture.id} has an incomplete credit`);
      }
    }
    const regions = new Set<string>();
    const count = picture.regions.length;
    if (count < 8 || count > 700) {
      throw new Error(`${picture.id} has ${count} regions; want 8–700`);
    }
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
