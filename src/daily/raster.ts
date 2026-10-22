/**
 * Raster painter and contour tracer for generated coloring pages.
 * Coordinates passed to Canvas are viewBox units (320×460). The buffer
 * is binary — no antialiasing — so region edges stay crisp.
 */
import { PAGE, type Picture, type Region } from "../pictures/types.ts";

export const SCALE = 2;
export const VW = PAGE.w;
export const VH = PAGE.h;

export const GATE = {
  minRegions: 40,
  maxRegions: 280,
  minRadiusVu: 5.4,
  minAreaVu: 100,
  maxFraction: 0.17,
  minMixedCells: 14,
  cellCols: 4,
  cellRows: 6,
  minFocalFraction: 0.05,
  minFocalRadiusVu: 14,
  minColorDistance: 28,
  minLightSpan: 0.34,
  minColors: 8,
  maxColors: 26,
  maxHueClusters: 8,
} as const;

/** Photo pages keep the older, slightly larger tidy floor. */
const PHOTO_AREA = 150;
const PHOTO_RADIUS = 6.2;

export type QualityReport = {
  ok: boolean;
  reasons: string[];
  regions: number;
  colors: number;
  minRadiusVu: number;
  minAreaVu: number;
  maxFraction: number;
  uncovered: number;
  slivers: number;
  mixedCells: number;
  focalFraction: number;
  focalRadiusVu: number;
  minColorDistance: number;
  lightSpan: number;
  hueClusters: number;
};

type Loop = { pts: Array<[number, number]>; area: number };

type CompStat = {
  color: number;
  area: number;
  maxDist: number;
  lx: number;
  ly: number;
};

export class Canvas {
  readonly scale = SCALE;
  readonly w = VW * SCALE;
  readonly h = VH * SCALE;
  readonly buf = new Uint8Array(this.w * this.h);
  /** 1-based. Index 0 is unused. */
  readonly colors: string[] = [""];
  readonly focal = new Set<number>();

  add(hex: string, focal = false): number {
    const n = this.colors.length;
    this.colors.push(hex.toLowerCase());
    if (focal) this.focal.add(n);
    return n;
  }

  rect(n: number, x: number, y: number, w: number, h: number): void {
    const x0 = clamp(Math.floor(x * this.scale), 0, this.w);
    const y0 = clamp(Math.floor(y * this.scale), 0, this.h);
    const x1 = clamp(Math.ceil((x + w) * this.scale), 0, this.w);
    const y1 = clamp(Math.ceil((y + h) * this.scale), 0, this.h);
    for (let yy = y0; yy < y1; yy += 1) {
      this.buf.fill(n, yy * this.w + x0, yy * this.w + x1);
    }
  }

  ellipse(n: number, cx: number, cy: number, rx: number, ry: number, rot = 0): void {
    if (rx <= 0 || ry <= 0) return;
    const s = this.scale;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const pad = Math.hypot(rx, ry) + 1;
    const x0 = clamp(Math.floor((cx - pad) * s), 0, this.w);
    const y0 = clamp(Math.floor((cy - pad) * s), 0, this.h);
    const x1 = clamp(Math.ceil((cx + pad) * s), 0, this.w);
    const y1 = clamp(Math.ceil((cy + pad) * s), 0, this.h);
    const invRx = 1 / rx;
    const invRy = 1 / ry;
    for (let yy = y0; yy < y1; yy += 1) {
      const py = (yy + 0.5) / s - cy;
      const row = yy * this.w;
      for (let xx = x0; xx < x1; xx += 1) {
        const px = (xx + 0.5) / s - cx;
        const lx = px * cos + py * sin;
        const ly = -px * sin + py * cos;
        if (lx * lx * invRx * invRx + ly * ly * invRy * invRy <= 1) this.buf[row + xx] = n;
      }
    }
  }

  capsule(n: number, x0: number, y0: number, x1: number, y1: number, r: number): void {
    if (r <= 0) return;
    const s = this.scale;
    const pad = r + 1;
    const minX = Math.min(x0, x1) - pad;
    const maxX = Math.max(x0, x1) + pad;
    const minY = Math.min(y0, y1) - pad;
    const maxY = Math.max(y0, y1) + pad;
    const xa = clamp(Math.floor(minX * s), 0, this.w);
    const ya = clamp(Math.floor(minY * s), 0, this.h);
    const xb = clamp(Math.ceil(maxX * s), 0, this.w);
    const yb = clamp(Math.ceil(maxY * s), 0, this.h);
    const abx = x1 - x0;
    const aby = y1 - y0;
    const ab2 = abx * abx + aby * aby;
    const r2 = r * r;
    for (let yy = ya; yy < yb; yy += 1) {
      const py = (yy + 0.5) / s;
      const row = yy * this.w;
      for (let xx = xa; xx < xb; xx += 1) {
        const px = (xx + 0.5) / s;
        let dx: number;
        let dy: number;
        if (ab2 < 1e-6) {
          dx = px - x0;
          dy = py - y0;
        } else {
          let t = ((px - x0) * abx + (py - y0) * aby) / ab2;
          if (t < 0) t = 0;
          else if (t > 1) t = 1;
          dx = px - (x0 + abx * t);
          dy = py - (y0 + aby * t);
        }
        if (dx * dx + dy * dy <= r2) this.buf[row + xx] = n;
      }
    }
  }

  poly(n: number, pts: Array<[number, number]>): void {
    if (pts.length < 3) return;
    const s = this.scale;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const x0 = clamp(Math.floor(minX * s), 0, this.w);
    const y0 = clamp(Math.floor(minY * s), 0, this.h);
    const x1 = clamp(Math.ceil(maxX * s), 0, this.w);
    const y1 = clamp(Math.ceil(maxY * s), 0, this.h);
    for (let yy = y0; yy < y1; yy += 1) {
      const py = (yy + 0.5) / s;
      const row = yy * this.w;
      for (let xx = x0; xx < x1; xx += 1) {
        if (inside(pts, (xx + 0.5) / s, py)) this.buf[row + xx] = n;
      }
    }
  }
}

export type PageMeta = {
  id: string;
  title: string;
  caption: string;
  category: Picture["category"];
};

/** Merge undersized components, then measure. Does not build paths. */
export function measureCanvas(canvas: Canvas, merge = true): QualityReport {
  if (merge) tidy(canvas);
  return measure(canvas);
}

/** Build a page from a full-frame indexed buffer (1-based color indices, no zeros). */
export function pictureFromIndexed(
  indexed: Uint8Array,
  palette: string[],
  meta: PageMeta,
  maxRegions = 240,
): { picture: Picture; report: QualityReport } {
  const canvas = new Canvas();
  if (indexed.length !== canvas.buf.length) throw new Error("Photo buffer is the wrong size.");
  for (const hex of palette) canvas.add(hex);
  for (let i = 0; i < indexed.length; i += 1) {
    const value = indexed[i] ?? 0;
    if (value < 1 || value > palette.length) throw new Error("Photo color index is out of range.");
  }
  canvas.buf.set(indexed);
  tidy(canvas, PHOTO_AREA, PHOTO_RADIUS);
  let area = PHOTO_AREA;
  for (let step = 0; step < 8; step += 1) {
    const report = measure(canvas);
    if (report.regions <= maxRegions) break;
    area *= 1.55;
    tidy(canvas, area, PHOTO_RADIUS);
  }
  return pictureFromCanvas(canvas, meta, false);
}

export function pictureFromCanvas(canvas: Canvas, meta: PageMeta, merge = true): { picture: Picture; report: QualityReport } {
  if (merge) tidy(canvas);
  const report = measure(canvas);
  const picture = tracePicture(canvas, meta);
  report.regions = picture.regions.length;
  report.colors = picture.colors.length;
  return { picture, report };
}

function tidy(canvas: Canvas, minAreaVu: number = GATE.minAreaVu, minRadiusVu: number = GATE.minRadiusVu): void {
  const minArea = minAreaVu * SCALE * SCALE;
  const minRadiusPx = minRadiusVu * SCALE;
  for (let pass = 0; pass < 5; pass += 1) {
    const labeled = label(canvas.buf, canvas.w, canvas.h);
    if (!labeled.count) return;
    const dist = pass === 0 || pass === 4 ? distanceToEdge(labeled.labels, labeled.count, canvas.w, canvas.h) : null;
    const stats = compStats(labeled.labels, canvas.buf, dist, canvas.w, canvas.h, labeled.count);
    const bad = new Set<number>();
    for (let id = 1; id <= labeled.count; id += 1) {
      const stat = stats[id];
      if (!stat) continue;
      const thin = dist ? stat.maxDist < minRadiusPx : false;
      if (stat.area < minArea || thin) bad.add(id);
    }
    if (!bad.size) return;
    const borders = adjacency(labeled.labels, canvas.w, canvas.h, labeled.count);
    const map = planMerge(stats, borders, bad, labeled.count);
    if (!map) return;
    applyMerge(canvas, labeled.labels, stats, map);
  }
}

function planMerge(stats: CompStat[], borders: Map<number, number>[], bad: Set<number>, count: number): Int32Array | null {
  const map = new Int32Array(count + 1);
  for (let id = 1; id <= count; id += 1) map[id] = id;
  let any = false;
  const order = [...bad].sort((a, b) => (stats[a]?.area ?? 0) - (stats[b]?.area ?? 0));
  for (const id of order) {
    const area = stats[id]?.area ?? 0;
    let best = 0;
    let bestScore = -1;
    const neigh = borders[id];
    if (!neigh) continue;
    for (const [other, weight] of neigh) {
      const otherArea = stats[other]?.area ?? 0;
      const surviving = !bad.has(other) || otherArea > area || (otherArea === area && other > id);
      if (!surviving && bad.has(other)) continue;
      const score = weight * 10 + otherArea / 1000 + (bad.has(other) ? 0 : 1_000_000);
      if (score > bestScore) {
        bestScore = score;
        best = other;
      }
    }
    if (!best) continue;
    map[id] = best;
    any = true;
  }
  if (!any) return null;
  for (let id = 1; id <= count; id += 1) {
    let guard = 0;
    while (map[id] !== map[map[id]] && guard < count) {
      map[id] = map[map[id]];
      guard += 1;
    }
  }
  return map;
}

function applyMerge(canvas: Canvas, labels: Int32Array, stats: CompStat[], map: Int32Array): void {
  const buf = canvas.buf;
  for (let i = 0; i < buf.length; i += 1) {
    const id = labels[i];
    if (!id) continue;
    const to = map[id] ?? id;
    if (to !== id) buf[i] = stats[to]?.color ?? buf[i];
  }
}

function measure(canvas: Canvas): QualityReport {
  const { buf, w, h, colors, focal } = canvas;
  const labeled = label(buf, w, h);
  const dist = distanceToEdge(labeled.labels, labeled.count, w, h);
  const stats = compStats(labeled.labels, buf, dist, w, h, labeled.count);
  const reasons: string[] = [];
  let uncovered = 0;
  for (let i = 0; i < buf.length; i += 1) if (buf[i] === 0) uncovered += 1;

  let minRadius = Infinity;
  let minArea = Infinity;
  let maxArea = 0;
  let slivers = 0;
  let focalArea = 0;
  let focalRadius = 0;
  const used = new Set<number>();
  const areaByColor = new Map<number, number>();
  for (let id = 1; id <= labeled.count; id += 1) {
    const stat = stats[id];
    if (!stat || stat.area <= 0) continue;
    used.add(stat.color);
    areaByColor.set(stat.color, (areaByColor.get(stat.color) ?? 0) + stat.area);
    const radiusVu = stat.maxDist / SCALE;
    const areaVu = stat.area / (SCALE * SCALE);
    if (radiusVu < minRadius) minRadius = radiusVu;
    if (areaVu < minArea) minArea = areaVu;
    if (stat.area > maxArea) maxArea = stat.area;
    if (radiusVu < GATE.minRadiusVu || areaVu < GATE.minAreaVu) slivers += 1;
    if (focal.has(stat.color)) {
      focalArea += stat.area;
      if (radiusVu > focalRadius) focalRadius = radiusVu;
    }
  }
  if (!Number.isFinite(minRadius)) minRadius = 0;
  if (!Number.isFinite(minArea)) minArea = 0;

  const palette = compactColors(colors, used);
  const regions = labeled.count;
  const maxFraction = maxArea / buf.length;
  const focalFraction = focalArea / buf.length;
  const mixedCells = countMixed(buf, w, h);
  const minColorDistance = palette.length ? pairwiseMin(palette) : 0;
  const lightSpan = palette.length ? luminanceSpan(palette) : 0;
  const hueClusters = palette.length ? clusterHues(palette) : 0;

  if (uncovered > 0) reasons.push(`uncovered ${uncovered}`);
  if (regions < GATE.minRegions || regions > GATE.maxRegions) reasons.push(`regions ${regions}`);
  if (palette.length < GATE.minColors || palette.length > GATE.maxColors) reasons.push(`colors ${palette.length}`);
  if (minRadius < GATE.minRadiusVu) reasons.push(`radius ${minRadius.toFixed(2)}`);
  if (minArea < GATE.minAreaVu) reasons.push(`area ${minArea.toFixed(1)}`);
  if (slivers > 0) reasons.push(`slivers ${slivers}`);
  if (maxFraction > GATE.maxFraction) reasons.push(`max ${(maxFraction * 100).toFixed(1)}%`);
  if (mixedCells < GATE.minMixedCells) reasons.push(`mixed cells ${mixedCells}`);
  if (focal.size && focalFraction < GATE.minFocalFraction) reasons.push(`focal area ${(focalFraction * 100).toFixed(1)}%`);
  if (focal.size && focalRadius < GATE.minFocalRadiusVu) reasons.push(`focal radius ${focalRadius.toFixed(1)}`);
  if (minColorDistance < GATE.minColorDistance) reasons.push(`contrast ${minColorDistance.toFixed(1)}`);
  if (lightSpan < GATE.minLightSpan) reasons.push(`light span ${lightSpan.toFixed(2)}`);
  if (hueClusters > GATE.maxHueClusters) reasons.push(`hue clusters ${hueClusters}`);

  return {
    ok: reasons.length === 0,
    reasons,
    regions,
    colors: palette.length,
    minRadiusVu: minRadius,
    minAreaVu: minArea,
    maxFraction,
    uncovered,
    slivers,
    mixedCells,
    focalFraction,
    focalRadiusVu: focalRadius,
    minColorDistance,
    lightSpan,
    hueClusters,
  };
}

function compactColors(colors: string[], used: Set<number>): string[] {
  const out: string[] = [];
  for (let n = 1; n < colors.length; n += 1) {
    if (used.has(n)) out.push(colors[n] ?? "#000000");
  }
  return out;
}

function tracePicture(canvas: Canvas, meta: PageMeta): Picture {
  const labeled = label(canvas.buf, canvas.w, canvas.h);
  const dist = distanceToEdge(labeled.labels, labeled.count, canvas.w, canvas.h);
  const stats = compStats(labeled.labels, canvas.buf, dist, canvas.w, canvas.h, labeled.count);
  const loops = traceAll(labeled.labels, labeled.count, canvas.w, canvas.h);
  const used: number[] = [];
  const remap = new Map<number, number>();
  for (let id = 1; id <= labeled.count; id += 1) {
    const color = stats[id]?.color ?? 0;
    if (!color || !stats[id]?.area) continue;
    if (!remap.has(color)) {
      remap.set(color, used.length + 1);
      used.push(color);
    }
  }
  const palette = used.map((n) => canvas.colors[n] ?? "#888888");
  const regions: Region[] = [];
  let index = 0;
  for (let id = 1; id <= labeled.count; id += 1) {
    const stat = stats[id];
    const regionLoops = loops[id];
    if (!stat?.area || !regionLoops?.length) continue;
    const n = remap.get(stat.color) ?? 1;
    index += 1;
    const radiusVu = stat.maxDist / SCALE;
    const hint = clamp(Math.round(radiusVu * 0.72), 7, 14);
    regions.push({
      id: `r${index}`,
      d: loopsToPath(regionLoops),
      n,
      label: [round1(stat.lx), round1(stat.ly)],
      hintSize: hint,
      evenodd: regionLoops.length > 1 ? true : undefined,
    });
  }
  return {
    id: meta.id,
    category: meta.category,
    title: meta.title,
    caption: meta.caption,
    viewBox: PAGE.viewBox,
    colors: palette,
    regions,
    outline: "",
    ink: [],
    credits: [
      {
        work: meta.title,
        author: "Linen",
        sourceUrl: "",
        license: "Original work, created for Linen",
        licenseUrl: "",
      },
    ],
  };
}

function label(buf: Uint8Array, w: number, h: number): { labels: Int32Array; count: number } {
  const labels = new Int32Array(w * h);
  const stack = new Int32Array(w * h);
  let count = 0;
  for (let i = 0; i < buf.length; i += 1) {
    if (labels[i] || buf[i] === 0) continue;
    count += 1;
    const color = buf[i];
    let sp = 0;
    stack[sp++] = i;
    labels[i] = count;
    while (sp) {
      const p = stack[--sp] as number;
      const x = p % w;
      if (x > 0 && !labels[p - 1] && buf[p - 1] === color) {
        labels[p - 1] = count;
        stack[sp++] = p - 1;
      }
      if (x + 1 < w && !labels[p + 1] && buf[p + 1] === color) {
        labels[p + 1] = count;
        stack[sp++] = p + 1;
      }
      if (p >= w && !labels[p - w] && buf[p - w] === color) {
        labels[p - w] = count;
        stack[sp++] = p - w;
      }
      if (p + w < buf.length && !labels[p + w] && buf[p + w] === color) {
        labels[p + w] = count;
        stack[sp++] = p + w;
      }
    }
  }
  return { labels, count };
}

function compStats(
  labels: Int32Array,
  buf: Uint8Array,
  dist: Float32Array | null,
  w: number,
  h: number,
  count: number,
): CompStat[] {
  const stats: CompStat[] = Array.from({ length: count + 1 }, () => ({
    color: 0,
    area: 0,
    maxDist: 0,
    lx: 0,
    ly: 0,
  }));
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const id = labels[row + x] ?? 0;
      if (!id) continue;
      const stat = stats[id];
      if (!stat) continue;
      if (!stat.color) stat.color = buf[row + x] ?? 0;
      stat.area += 1;
      const d = dist ? dist[row + x] ?? 0 : 0;
      if (d >= stat.maxDist) {
        stat.maxDist = d;
        stat.lx = (x + 0.5) / SCALE;
        stat.ly = (y + 0.5) / SCALE;
      }
    }
  }
  return stats;
}

function adjacency(labels: Int32Array, w: number, h: number, count: number): Map<number, number>[] {
  const maps: Map<number, number>[] = Array.from({ length: count + 1 }, () => new Map());
  const add = (a: number, b: number) => {
    if (!a || !b || a === b) return;
    const ma = maps[a];
    const mb = maps[b];
    if (!ma || !mb) return;
    ma.set(b, (ma.get(b) ?? 0) + 1);
    mb.set(a, (mb.get(a) ?? 0) + 1);
  };
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const id = labels[row + x] ?? 0;
      if (!id) continue;
      if (x + 1 < w) add(id, labels[row + x + 1] ?? 0);
      if (y + 1 < h) add(id, labels[row + w + x] ?? 0);
    }
  }
  return maps;
}

/** Euclidean distance from each labeled pixel to the nearest pixel of another label (or the frame edge). */
function distanceToEdge(labels: Int32Array, count: number, w: number, h: number): Float32Array {
  const feature = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const id = labels[row + x] ?? 0;
      if (!id) {
        feature[row + x] = 1;
        continue;
      }
      if (x === 0 || y === 0 || x + 1 === w || y + 1 === h) {
        feature[row + x] = 1;
        continue;
      }
      if (
        labels[row + x - 1] !== id ||
        labels[row + x + 1] !== id ||
        labels[row - w + x] !== id ||
        labels[row + w + x] !== id
      ) {
        feature[row + x] = 1;
      }
    }
  }
  void count;
  return edt(feature, w, h);
}

function edt(feature: Uint8Array, w: number, h: number): Float32Array {
  const inf = 1e15;
  const g = new Float64Array(w * h);
  for (let i = 0; i < g.length; i += 1) g[i] = feature[i] ? 0 : inf;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const transform = (len: number) => {
    let k = 0;
    v[0] = 0;
    z[0] = -inf;
    z[1] = inf;
    for (let q = 1; q < len; q += 1) {
      let s = (f[q] + q * q - (f[v[k]!] + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      while (s <= z[k]!) {
        k -= 1;
        s = (f[q] + q * q - (f[v[k]!] + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      }
      k += 1;
      v[k] = q;
      z[k] = s;
      z[k + 1] = inf;
    }
    k = 0;
    for (let q = 0; q < len; q += 1) {
      while (z[k + 1]! < q) k += 1;
      const dx = q - v[k]!;
      d[q] = dx * dx + f[v[k]!]!;
    }
  };
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) f[x] = g[row + x]!;
    transform(w);
    for (let x = 0; x < w; x += 1) g[row + x] = d[x]!;
  }
  const out = new Float32Array(w * h);
  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h; y += 1) f[y] = g[y * w + x]!;
    transform(h);
    for (let y = 0; y < h; y += 1) out[y * w + x] = Math.sqrt(d[y]!);
  }
  return out;
}

type Edge = { ax: number; ay: number; bx: number; by: number };

function traceAll(labels: Int32Array, count: number, w: number, h: number): Loop[][] {
  const buckets: Edge[][] = Array.from({ length: count + 1 }, () => []);
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const id = labels[row + x] ?? 0;
      if (!id) continue;
      const bucket = buckets[id];
      if (!bucket) continue;
      if (y === 0 || labels[row - w + x] !== id) bucket.push({ ax: x + 1, ay: y, bx: x, by: y });
      if (y + 1 === h || labels[row + w + x] !== id) bucket.push({ ax: x, ay: y + 1, bx: x + 1, by: y + 1 });
      if (x === 0 || labels[row + x - 1] !== id) bucket.push({ ax: x, ay: y, bx: x, by: y + 1 });
      if (x + 1 === w || labels[row + x + 1] !== id) bucket.push({ ax: x + 1, ay: y + 1, bx: x + 1, by: y });
    }
  }
  return buckets.map((edges) => (edges.length ? stitch(edges) : []));
}

function stitch(edges: Edge[]): Loop[] {
  const from = new Map<number, number[]>();
  for (let i = 0; i < edges.length; i += 1) {
    const e = edges[i];
    if (!e) continue;
    const k = e.ax * 2048 + e.ay;
    const list = from.get(k);
    if (list) list.push(i);
    else from.set(k, [i]);
  }
  const used = new Uint8Array(edges.length);
  const loops: Loop[] = [];
  for (let i = 0; i < edges.length; i += 1) {
    if (used[i]) continue;
    const pts: Array<[number, number]> = [];
    let cur = i;
    let guard = 0;
    while (guard <= edges.length) {
      const edge = edges[cur];
      if (!edge || used[cur]) break;
      used[cur] = 1;
      if (!pts.length) pts.push([edge.ax, edge.ay]);
      pts.push([edge.bx, edge.by]);
      if (edge.bx === pts[0]?.[0] && edge.by === pts[0]?.[1] && pts.length > 2) break;
      const options = from.get(edge.bx * 2048 + edge.by);
      if (!options) break;
      const next = leftmost(edge, options, edges, used);
      if (next < 0) break;
      cur = next;
      guard += 1;
    }
    if (pts.length >= 4) loops.push({ pts, area: polygonArea(pts) });
  }
  return loops;
}

function leftmost(incoming: Edge, options: number[], edges: Edge[], used: Uint8Array): number {
  const hx = incoming.bx - incoming.ax;
  const hy = incoming.by - incoming.ay;
  const hang = Math.atan2(hy, hx);
  let best = -1;
  let bestTurn = -Infinity;
  for (const index of options) {
    if (used[index]) continue;
    const edge = edges[index];
    if (!edge) continue;
    const ox = edge.bx - edge.ax;
    const oy = edge.by - edge.ay;
    let turn = Math.atan2(oy, ox) - hang;
    while (turn <= -Math.PI) turn += Math.PI * 2;
    while (turn > Math.PI) turn -= Math.PI * 2;
    if (turn > bestTurn) {
      bestTurn = turn;
      best = index;
    }
  }
  return best;
}

function loopsToPath(loops: Loop[]): string {
  const ordered = [...loops].sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
  return ordered
    .map((loop) => {
      const simplified = rdp(dropColinear(loop.pts), 0.7 * SCALE);
      const body = simplified
        .map(([x, y], index) => `${index === 0 ? "M" : "L"}${round1(x / SCALE)} ${round1(y / SCALE)}`)
        .join("");
      return `${body}Z`;
    })
    .join("");
}

function dropColinear(pts: Array<[number, number]>): Array<[number, number]> {
  if (pts.length < 3) return pts;
  const out: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i += 1) {
    const prev = pts[(i + pts.length - 1) % pts.length];
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    if (!prev || !cur || !next) continue;
    const cross = (cur[0] - prev[0]) * (next[1] - cur[1]) - (cur[1] - prev[1]) * (next[0] - cur[0]);
    if (cross !== 0) out.push(cur);
  }
  return out.length >= 3 ? out : pts;
}

function rdp(pts: Array<[number, number]>, epsilon: number): Array<[number, number]> {
  if (pts.length < 4) return pts;
  const open = pts[0]?.[0] === pts[pts.length - 1]?.[0] && pts[0]?.[1] === pts[pts.length - 1]?.[1] ? pts.slice(0, -1) : pts.slice();
  const keep = new Uint8Array(open.length);
  keep[0] = 1;
  keep[open.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, open.length - 1]];
  while (stack.length) {
    const range = stack.pop();
    if (!range) break;
    const [a, b] = range;
    const start = open[a];
    const end = open[b];
    if (!start || !end) continue;
    let max = 0;
    let index = -1;
    for (let i = a + 1; i < b; i += 1) {
      const p = open[i];
      if (!p) continue;
      const dist = pointLine(p, start, end);
      if (dist > max) {
        max = dist;
        index = i;
      }
    }
    if (index >= 0 && max > epsilon) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  const out: Array<[number, number]> = [];
  for (let i = 0; i < open.length; i += 1) if (keep[i]) out.push(open[i]!);
  return out;
}

function pointLine(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len;
}

function polygonArea(pts: Array<[number, number]>): number {
  let sum = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

function countMixed(buf: Uint8Array, w: number, h: number): number {
  let mixed = 0;
  for (let cy = 0; cy < GATE.cellRows; cy += 1) {
    const y0 = Math.floor((cy * h) / GATE.cellRows);
    const y1 = Math.floor(((cy + 1) * h) / GATE.cellRows);
    for (let cx = 0; cx < GATE.cellCols; cx += 1) {
      const x0 = Math.floor((cx * w) / GATE.cellCols);
      const x1 = Math.floor(((cx + 1) * w) / GATE.cellCols);
      let first = -1;
      let isMixed = false;
      for (let y = y0; y < y1 && !isMixed; y += 1) {
        const row = y * w;
        for (let x = x0; x < x1; x += 1) {
          const v = buf[row + x] ?? 0;
          if (first < 0) first = v;
          else if (v !== first) {
            isMixed = true;
            break;
          }
        }
      }
      if (isMixed) mixed += 1;
    }
  }
  return mixed;
}

function pairwiseMin(colors: string[]): number {
  let min = Infinity;
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      const d = rgbDist(colors[i] ?? "", colors[j] ?? "");
      if (d < min) min = d;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

function luminanceSpan(colors: string[]): number {
  let min = 1;
  let max = 0;
  for (const color of colors) {
    const y = luminance(color);
    if (y < min) min = y;
    if (y > max) max = y;
  }
  return max - min;
}

function clusterHues(colors: string[]): number {
  const hues: number[] = [];
  for (const color of colors) {
    const { h, s } = hsl(color);
    if (s > 0.14) hues.push(h);
  }
  if (!hues.length) return 1;
  hues.sort((a, b) => a - b);
  const assigned: number[] = [];
  for (const hue of hues) {
    let placed = false;
    for (let i = 0; i < assigned.length; i += 1) {
      const center = assigned[i] ?? hue;
      const d = hueDelta(hue, center);
      if (d <= 26) {
        assigned[i] = center + (hue - center) * 0.35;
        placed = true;
        break;
      }
    }
    if (!placed) assigned.push(hue);
  }
  return assigned.length;
}

function rgbDist(a: string, b: string): number {
  const A = rgb(a);
  const B = rgb(b);
  const dr = A[0] - B[0];
  const dg = A[1] - B[1];
  const db = A[2] - B[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function hsl(hex: string): { h: number; s: number; l: number } {
  const [r0, g0, b0] = rgb(hex);
  const r = r0 / 255;
  const g = g0 / 255;
  const b = b0 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-6) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  return { h, s, l };
}

function hueDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function rgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  return [
    Number.parseInt(raw.slice(0, 2), 16) || 0,
    Number.parseInt(raw.slice(2, 4), 16) || 0,
    Number.parseInt(raw.slice(4, 6), 16) || 0,
  ];
}

function inside(pts: Array<[number, number]>, x: number, y: number): boolean {
  let winding = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const pi = pts[i];
    const pj = pts[j];
    if (!pi || !pj) continue;
    if (pi[1] > y !== pj[1] > y) {
      const xint = ((pj[0] - pi[0]) * (y - pi[1])) / (pj[1] - pi[1]) + pi[0];
      if (x < xint) winding = !winding;
    }
  }
  return winding;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
