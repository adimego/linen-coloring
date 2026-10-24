/**
 * The twenty gallery drawings a daily picture can be built from.
 * Import attributes keep the same files loadable from the daily test.
 */
import type { Ink, Region } from "../pictures/types.ts";
import balloonValley from "../pictures/art/balloon-valley.json" with { type: "json" };
import beachHuts from "../pictures/art/beach-huts.json" with { type: "json" };
import canalBridge from "../pictures/art/canal-bridge.json" with { type: "json" };
import catNap from "../pictures/art/cat-nap.json" with { type: "json" };
import cherryBlossoms from "../pictures/art/cherry-blossoms.json" with { type: "json" };
import flamingo from "../pictures/art/flamingo.json" with { type: "json" };
import gardenFox from "../pictures/art/garden-fox.json" with { type: "json" };
import gardenRobin from "../pictures/art/garden-robin.json" with { type: "json" };
import lemonTea from "../pictures/art/lemon-tea.json" with { type: "json" };
import lighthouseCove from "../pictures/art/lighthouse-cove.json" with { type: "json" };
import monarch from "../pictures/art/monarch.json" with { type: "json" };
import openRose from "../pictures/art/open-rose.json" with { type: "json" };
import peony from "../pictures/art/peony.json" with { type: "json" };
import pinkCupcakes from "../pictures/art/pink-cupcakes.json" with { type: "json" };
import roseCottage from "../pictures/art/rose-cottage.json" with { type: "json" };
import snowCabin from "../pictures/art/snow-cabin.json" with { type: "json" };
import stillSwan from "../pictures/art/still-swan.json" with { type: "json" };
import sunflower from "../pictures/art/sunflower.json" with { type: "json" };
import tidePool from "../pictures/art/tide-pool.json" with { type: "json" };
import tulipField from "../pictures/art/tulip-field.json" with { type: "json" };

export type GallerySource = {
  id: string;
  title: string;
  colors: string[];
  regions: Region[];
  outline: string;
  ink: Ink[];
  viewBox?: string;
};

const files = [
  monarch,
  catNap,
  lemonTea,
  flamingo,
  peony,
  cherryBlossoms,
  sunflower,
  tulipField,
  stillSwan,
  gardenRobin,
  gardenFox,
  roseCottage,
  lighthouseCove,
  canalBridge,
  snowCabin,
  balloonValley,
  pinkCupcakes,
  openRose,
  tidePool,
  beachHuts,
];

const sources: GallerySource[] = files.map((file) => ({
  id: file.id,
  title: file.title,
  colors: file.colors,
  outline: file.outline,
  ink: file.ink,
  viewBox: file.viewBox,
  regions: file.regions.map((region) => ({
    id: region.id,
    d: region.d,
    n: region.n,
    label: region.label.length >= 2 ? [region.label[0] ?? 0, region.label[1] ?? 0] : null,
    hintSize: region.hintSize,
    ...(region.evenodd ? { evenodd: true } : {}),
  })),
}));

const byId = new Map(sources.map((picture) => [picture.id, picture]));

export function gallerySource(id: string): GallerySource | undefined {
  return byId.get(id);
}
