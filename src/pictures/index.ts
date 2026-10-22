import balloonsFile from "./art/balloon-valley.json";
import hutsFile from "./art/beach-huts.json";
import tartFile from "./art/berry-tart.json";
import blueWingFile from "./art/blue-wing.json";
import canalFile from "./art/canal-bridge.json";
import catFile from "./art/cat-nap.json";
import coastFile from "./art/coast-path.json";
import skylineFile from "./art/dusk-skyline.json";
import fallsFile from "./art/forest-falls.json";
import foxFile from "./art/garden-fox.json";
import robinFile from "./art/garden-robin.json";
import lakeFile from "./art/lake-evening.json";
import lavenderFile from "./art/lavender-rows.json";
import teaFile from "./art/lemon-tea.json";
import lightFile from "./art/lighthouse-cove.json";
import monarchFile from "./art/monarch.json";
import cityFile from "./art/night-windows.json";
import roseFile from "./art/open-rose.json";
import palmFile from "./art/palm-sunset.json";
import petalFile from "./art/petal-mandala.json";
import rainFile from "./art/rainy-lights.json";
import nookFile from "./art/reading-nook.json";
import cottageFile from "./art/rose-cottage.json";
import cabinFile from "./art/snow-cabin.json";
import starFile from "./art/star-mandala.json";
import swanFile from "./art/still-swan.json";
import cafeFile from "./art/street-cafe.json";
import sunflowerFile from "./art/sunflower.json";
import tideFile from "./art/tide-pool.json";
import zenFile from "./art/zen-garden.json";
import { categories, type CategoryId, type Picture, type Region } from "./types.ts";

type ArtFile = {
  id: string;
  category: CategoryId;
  title: string;
  caption: string;
  viewBox: string;
  colors: string[];
  regions: Region[];
  outline: string;
  ink: Picture["ink"];
};

function art(file: ArtFile): Picture {
  return {
    id: file.id,
    category: file.category,
    title: file.title,
    caption: file.caption,
    viewBox: file.viewBox,
    colors: file.colors,
    regions: file.regions,
    outline: file.outline,
    ink: file.ink ?? [],
  };
}

export const pictures: Picture[] = [
  art(catFile as unknown as ArtFile),
  art(foxFile as unknown as ArtFile),
  art(roseFile as unknown as ArtFile),
  art(sunflowerFile as unknown as ArtFile),
  art(starFile as unknown as ArtFile),
  art(petalFile as unknown as ArtFile),
  art(lakeFile as unknown as ArtFile),
  art(coastFile as unknown as ArtFile),
  art(tartFile as unknown as ArtFile),
  art(teaFile as unknown as ArtFile),
  art(monarchFile as unknown as ArtFile),
  art(blueWingFile as unknown as ArtFile),
  art(robinFile as unknown as ArtFile),
  art(swanFile as unknown as ArtFile),
  art(cottageFile as unknown as ArtFile),
  art(cityFile as unknown as ArtFile),
  art(palmFile as unknown as ArtFile),
  art(tideFile as unknown as ArtFile),
  art(lightFile as unknown as ArtFile),
  art(hutsFile as unknown as ArtFile),
  art(skylineFile as unknown as ArtFile),
  art(cafeFile as unknown as ArtFile),
  art(canalFile as unknown as ArtFile),
  art(rainFile as unknown as ArtFile),
  art(zenFile as unknown as ArtFile),
  art(cabinFile as unknown as ArtFile),
  art(lavenderFile as unknown as ArtFile),
  art(fallsFile as unknown as ArtFile),
  art(balloonsFile as unknown as ArtFile),
  art(nookFile as unknown as ArtFile),
];

function assertPictures(list: Picture[]): void {
  if (list.length < 30) throw new Error(`Need at least 30 pictures, found ${list.length}`);
  const ids = new Set<string>();
  for (const picture of list) {
    if (ids.has(picture.id)) throw new Error(`Duplicate picture ${picture.id}`);
    ids.add(picture.id);
    const count = picture.regions.length;
    if (count < 100 || count > 300) throw new Error(`${picture.id} has ${count} regions; want 100–300`);
    if (picture.colors.length < 6 || picture.colors.length > 24) {
      throw new Error(`${picture.id} has ${picture.colors.length} colors`);
    }
    const seen = new Set<string>();
    const used = new Set<number>();
    for (const region of picture.regions) {
      if (seen.has(region.id)) throw new Error(`${picture.id} repeats ${region.id}`);
      seen.add(region.id);
      if (!region.d.trim()) throw new Error(`${picture.id} ${region.id} is empty`);
      if (region.n < 1 || region.n > picture.colors.length) throw new Error(`${picture.id} ${region.id} has a bad number`);
      if (!/^#[0-9a-fA-F]{6}$/.test(picture.colors[region.n - 1] ?? "")) {
        throw new Error(`${picture.id} color ${region.n} is not hex`);
      }
      used.add(region.n);
      if (region.label && region.label.length !== 2) throw new Error(`${picture.id} ${region.id} has a bad label`);
    }
    for (let n = 1; n <= picture.colors.length; n += 1) {
      if (!used.has(n)) throw new Error(`${picture.id} never uses color ${n}`);
    }
  }
  const minimums: Partial<Record<CategoryId, number>> = { beach: 4, city: 4, peaceful: 6 };
  for (const category of categories) {
    const count = list.filter((picture) => picture.category === category.id).length;
    const need = minimums[category.id] ?? 2;
    if (count < need) throw new Error(`${category.name} needs at least ${need} pictures`);
  }
}

assertPictures(pictures);

export function picturesIn(category: CategoryId | "all"): Picture[] {
  if (category === "all") return pictures;
  return pictures.filter((picture) => picture.category === category);
}

export function getPicture(id: string): Picture | undefined {
  return pictures.find((picture) => picture.id === id);
}
