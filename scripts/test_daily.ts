import { addDays, buildDaily, clearDailyCache, LAUNCH_DATE } from "../src/daily/generate.ts";
import { Canvas, GATE, pictureFromCanvas } from "../src/daily/raster.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function geometry(): void {
  const full = new Canvas();
  const n = full.add("#336699");
  full.focal.add(n);
  full.rect(n, 0, 0, 320, 460);
  const report = pictureFromCanvas(full, {
    id: "full",
    title: "Full",
    caption: "A full page.",
    category: "daily",
  });
  assert(report.picture.regions.length === 1, `full page regions ${report.picture.regions.length}`);
  assert(report.report.uncovered === 0, "full page has a gap");

  const band = new Canvas();
  const a = band.add("#112233");
  const b = band.add("#eeddcc");
  band.rect(a, 0, 0, 320, 230);
  band.rect(b, 0, 230, 320, 230);
  const bands = pictureFromCanvas(band, {
    id: "bands",
    title: "Bands",
    caption: "Two bands.",
    category: "daily",
  });
  assert(bands.picture.regions.length === 2, `bands ${bands.picture.regions.length}`);

  const dot = new Canvas();
  const ground = dot.add("#224433");
  const speck = dot.add("#ffcc00");
  dot.rect(ground, 0, 0, 320, 460);
  dot.ellipse(speck, 40, 40, 2, 2);
  const merged = pictureFromCanvas(dot, {
    id: "dot",
    title: "Dot",
    caption: "A speck merges away.",
    category: "daily",
  });
  assert(merged.picture.regions.length === 1, `speck survived as ${merged.picture.regions.length}`);
  assert(!merged.picture.colors.includes("#ffcc00"), "speck color remained");

  const ring = new Canvas();
  const outer = ring.add("#885522");
  const hole = ring.add("#ddccbb");
  ring.rect(outer, 40, 40, 120, 120);
  ring.rect(hole, 70, 70, 50, 50);
  const holed = pictureFromCanvas(ring, {
    id: "ring",
    title: "Ring",
    caption: "A window in a wall.",
    category: "daily",
  });
  const wall = holed.picture.regions.find((region) => region.n === holed.picture.colors.indexOf("#885522") + 1);
  assert(Boolean(wall?.evenodd), "punched wall should carry a hole");
  assert((wall?.d.match(/Z/g) ?? []).length >= 2, "punched wall should have two loops");
}

function year(): void {
  clearDailyCache();
  const days = 365;
  const templates = new Map<string, number>();
  const order: string[] = [];
  const variants = new Map<number, number>();
  let minRegions = Infinity;
  let maxRegions = 0;
  let minRadius = Infinity;
  const started = Date.now();
  for (let i = 0; i < days; i += 1) {
    const iso = addDays(LAUNCH_DATE, i);
    const result = buildDaily(iso);
    const { picture, report, template, variant } = result;
    assert(report.ok, `${iso} ${template} v${variant} ${report.reasons.join(", ")}`);
    assert(picture.id === `daily-${iso}`, `${iso} id`);
    assert(picture.regions.length >= GATE.minRegions && picture.regions.length <= GATE.maxRegions, `${iso} count`);
    assert(picture.regions.every((region) => region.label && region.d.includes("M")), `${iso} paths`);
    const used = new Set(picture.regions.map((region) => region.n));
    assert(used.size === picture.colors.length, `${iso} unused color`);
    templates.set(template, (templates.get(template) ?? 0) + 1);
    order.push(template);
    variants.set(variant, (variants.get(variant) ?? 0) + 1);
    if (picture.regions.length < minRegions) minRegions = picture.regions.length;
    if (picture.regions.length > maxRegions) maxRegions = picture.regions.length;
    if (report.minRadiusVu < minRadius) minRadius = report.minRadiusVu;
    const again = buildDaily(iso);
    assert(again.picture.title === picture.title && again.picture.regions.length === picture.regions.length, `${iso} not stable`);
    assert(again.picture.regions[0]?.d === picture.regions[0]?.d, `${iso} path changed`);
  }
  const samples = [0, 40, 100, 200, 364].map((offset) => addDays(LAUNCH_DATE, offset));
  const frozen = samples.map((iso) => buildDaily(iso).picture.regions.map((region) => region.d).join("|"));
  clearDailyCache();
  samples.forEach((iso, index) => {
    const again = buildDaily(iso);
    assert(again.picture.regions.map((region) => region.d).join("|") === frozen[index], `${iso} recomputed differently`);
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`365 days in ${seconds}s`);
  console.log(`regions ${minRegions}–${maxRegions}, smallest radius ${minRadius.toFixed(2)} vu`);
  for (let i = 0; i <= order.length - 7; i += 1) {
    const window = new Set(order.slice(i, i + 7));
    assert(window.size === 7, `templates repeat inside the week starting ${addDays(LAUNCH_DATE, i)}`);
  }
  assert(templates.size >= 16, `only ${templates.size} templates`);
  console.log("templates", Object.fromEntries(templates));
  console.log("variants", Object.fromEntries(variants));
}

geometry();
year();
console.log("daily gate ok");
