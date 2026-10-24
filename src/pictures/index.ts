import beslerFile from "./art/besler-tulips.json";
import bouquetFile from "./art/tulip-bouquet.json";
import canFile from "./art/watering-can.json";
import closeupFile from "./art/tulip-closeup.json";
import fieldFile from "./art/tulip-field.json";
import mandalaTulipFile from "./art/tulip-mandala.json";
import pathFile from "./art/tulip-path.json";
import redouteFile from "./art/redoute-tulip.json";
import bedroomFile from "./art/pink-bedroom.json";
import blossomsFile from "./art/cherry-blossoms.json";
import boxFile from "./art/jewelry-box.json";
import broochFile from "./art/gem-brooch.json";
import cupcakesFile from "./art/pink-cupcakes.json";
import doodleFile from "./art/doodle-collage.json";
import earringsFile from "./art/drop-earrings.json";
import flamingoFile from "./art/flamingo.json";
import glassFile from "./art/stained-glass.json";
import heartsFile from "./art/hearts-and-stars.json";
import kaleidoscopeFile from "./art/kaleidoscope.json";
import necklaceFile from "./art/pendant-necklace.json";
import pearlsFile from "./art/pearl-strand.json";
import peonyFile from "./art/peony.json";
import quiltFile from "./art/quilt-blocks.json";
import ringFile from "./art/gem-ring.json";
import swirlsFile from "./art/retro-swirls.json";
import vanityFile from "./art/vanity-table.json";
import balloonsFile from "./art/balloon-valley.json";
import hutsFile from "./art/beach-huts.json";
import tartFile from "./art/berry-tart.json";
import blueWingFile from "./art/blue-wing.json";
import canalFile from "./art/canal-bridge.json";
import catFile from "./art/cat-nap.json";
import harpFile from "./art/at-the-harp.json";
import pianoFile from "./art/at-the-piano.json";
import musicFile from "./art/arts-music.json";
import morningFile from "./art/clear-morning.json";
import coastFile from "./art/coast-path.json";
import fieldsFile from "./art/ejiri-fields.json";
import skylineFile from "./art/dusk-skyline.json";
import fluteFile from "./art/flute-player.json";
import fallsFile from "./art/forest-falls.json";
import foxFile from "./art/garden-fox.json";
import hakoneFile from "./art/hakone-lake.json";
import passFile from "./art/inume-pass.json";
import kusatsuFile from "./art/kusatsu-village.json";
import robinFile from "./art/garden-robin.json";
import lakeFile from "./art/lake-evening.json";
import lavenderFile from "./art/lavender-rows.json";
import teaFile from "./art/lemon-tea.json";
import lightFile from "./art/lighthouse-cove.json";
import sunsetFile from "./art/meguro-sunset.json";
import pinesFile from "./art/mishima-pines.json";
import shamisenFile from "./art/maple-shamisen.json";
import monarchFile from "./art/monarch.json";
import cityFile from "./art/night-windows.json";
import roseFile from "./art/open-rose.json";
import palmFile from "./art/palm-sunset.json";
import petalFile from "./art/petal-mandala.json";
import rainFile from "./art/rainy-lights.json";
import nookFile from "./art/reading-nook.json";
import cottageFile from "./art/rose-cottage.json";
import cliffsFile from "./art/satta-cliffs.json";
import guitarFile from "./art/still-guitar.json";
import cabinFile from "./art/snow-cabin.json";
import starFile from "./art/star-mandala.json";
import swanFile from "./art/still-swan.json";
import cafeFile from "./art/street-cafe.json";
import sunflowerFile from "./art/sunflower.json";
import scoreFile from "./art/violin-score.json";
import tideFile from "./art/tide-pool.json";
import kotoFile from "./art/with-a-koto.json";
import zenFile from "./art/zen-garden.json";
import morningGloriesFile from "./art/morning-glories.json";
import peonyGardenFile from "./art/peony-garden.json";
import koiPondFile from "./art/koi-pond.json";
import floweringOwlFile from "./art/flowering-owl.json";
import mandalaBloomFile from "./art/mandala-bloom.json";
import trumpetFile from "./art/trumpet-hummingbird.json";
import autumnFoxFile from "./art/autumn-fox.json";
import coralShellFile from "./art/coral-shell.json";
import wisteriaFile from "./art/wisteria-arch.json";
import sunflowerBeesFile from "./art/sunflower-bees.json";
import peacockFanFile from "./art/peacock-fan.json";
import lanternGardenFile from "./art/lantern-garden.json";
import { categories, type CategoryId, type Credit, type Picture, type Region } from "./types.ts";

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
  credits?: Credit[];
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
    credits: file.credits,
  };
}

export const pictures: Picture[] = [
  art(morningGloriesFile as unknown as ArtFile),
  art(peonyGardenFile as unknown as ArtFile),
  art(koiPondFile as unknown as ArtFile),
  art(floweringOwlFile as unknown as ArtFile),
  art(mandalaBloomFile as unknown as ArtFile),
  art(trumpetFile as unknown as ArtFile),
  art(autumnFoxFile as unknown as ArtFile),
  art(coralShellFile as unknown as ArtFile),
  art(wisteriaFile as unknown as ArtFile),
  art(sunflowerBeesFile as unknown as ArtFile),
  art(peacockFanFile as unknown as ArtFile),
  art(lanternGardenFile as unknown as ArtFile),
  art(fieldFile as unknown as ArtFile),
  art(bouquetFile as unknown as ArtFile),
  art(closeupFile as unknown as ArtFile),
  art(mandalaTulipFile as unknown as ArtFile),
  art(pathFile as unknown as ArtFile),
  art(canFile as unknown as ArtFile),
  art(redouteFile as unknown as ArtFile),
  art(beslerFile as unknown as ArtFile),
  art(blossomsFile as unknown as ArtFile),
  art(flamingoFile as unknown as ArtFile),
  art(peonyFile as unknown as ArtFile),
  art(cupcakesFile as unknown as ArtFile),
  art(vanityFile as unknown as ArtFile),
  art(bedroomFile as unknown as ArtFile),
  art(ringFile as unknown as ArtFile),
  art(pearlsFile as unknown as ArtFile),
  art(earringsFile as unknown as ArtFile),
  art(broochFile as unknown as ArtFile),
  art(necklaceFile as unknown as ArtFile),
  art(boxFile as unknown as ArtFile),
  art(kaleidoscopeFile as unknown as ArtFile),
  art(heartsFile as unknown as ArtFile),
  art(swirlsFile as unknown as ArtFile),
  art(doodleFile as unknown as ArtFile),
  art(glassFile as unknown as ArtFile),
  art(quiltFile as unknown as ArtFile),
  art(musicFile as unknown as ArtFile),
  art(scoreFile as unknown as ArtFile),
  art(guitarFile as unknown as ArtFile),
  art(harpFile as unknown as ArtFile),
  art(pianoFile as unknown as ArtFile),
  art(shamisenFile as unknown as ArtFile),
  art(kotoFile as unknown as ArtFile),
  art(fluteFile as unknown as ArtFile),
  art(hakoneFile as unknown as ArtFile),
  art(cliffsFile as unknown as ArtFile),
  art(morningFile as unknown as ArtFile),
  art(fieldsFile as unknown as ArtFile),
  art(passFile as unknown as ArtFile),
  art(pinesFile as unknown as ArtFile),
  art(sunsetFile as unknown as ArtFile),
  art(kusatsuFile as unknown as ArtFile),
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
    const intricate = picture.category === "intricate";
    if (intricate) {
      if (count < 250 || count > 450) throw new Error(`${picture.id} has ${count} regions; want 250–450`);
      if (picture.colors.length < 10 || picture.colors.length > 16) {
        throw new Error(`${picture.id} has ${picture.colors.length} colors; want 10–16`);
      }
    } else if (count < 110 || count > 280) {
      throw new Error(`${picture.id} has ${count} regions; want 110–280`);
    } else if (picture.colors.length < 8 || picture.colors.length > 28) {
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
  const minimums: Partial<Record<CategoryId, number>> = {
    intricate: 12,
    tulips: 8,
    pink: 6,
    jewelry: 6,
    "fun-designs": 6,
    music: 8,
    "relaxing-landscapes": 8,
    beach: 4,
    city: 4,
    peaceful: 6,
  };
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
