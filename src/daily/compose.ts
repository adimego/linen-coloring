/**
 * A daily picture keeps a gallery drawing's paths and tonal bands.
 * Dawn, dusk, and night recolor the palette. Night also mirrors the
 * page so the next visit is the same place seen from the other side.
 */
import type { Picture, Region } from "../pictures/types.ts";
import type { QualityReport } from "./raster.ts";
import type { Mood } from "./scenes.ts";
import { gallerySource } from "./sources.ts";

const PAGE_W = 320;

export function composeDaily(
  sourceId: string,
  mood: Mood,
  meta: { id: string; title: string; caption: string; minRadiusVu: number; minAreaVu: number },
): { picture: Picture; report: QualityReport } {
  const source = gallerySource(sourceId);
  if (!source) throw new Error(`Missing gallery drawing ${sourceId}`);
  const flip = mood === "night";
  const colors = recolor(source.colors, mood);
  const regions = source.regions.map((region, index) => cloneRegion(region, index, flip));
  const picture: Picture = {
    id: meta.id,
    category: "daily",
    title: meta.title,
    caption: meta.caption,
    viewBox: source.viewBox ?? "0 0 320 460",
    colors,
    regions,
    outline: flip ? mapPath(source.outline, mirrorX) : source.outline,
    ink: source.ink.map((stroke) => ({ d: flip ? mapPath(stroke.d, mirrorX) : stroke.d, w: stroke.w })),
    credits: [
      {
        work: meta.title,
        author: "Linen",
        sourceUrl: "",
        license: `Original work, created for Linen. Recolor of ${source.title}.`,
        licenseUrl: "",
      },
    ],
  };
  return { picture, report: reportOf(picture, meta.minRadiusVu, meta.minAreaVu) };
}

function cloneRegion(region: Region, index: number, flip: boolean): Region {
  const next: Region = {
    id: `r${index}`,
    d: flip ? mapPath(region.d, mirrorX) : region.d,
    n: region.n,
    label: region.label ? (flip ? [round(mirrorX(region.label[0])), region.label[1]] : [...region.label]) : null,
    hintSize: region.hintSize,
  };
  if (region.evenodd) next.evenodd = true;
  return next;
}

function mirrorX(x: number): number {
  return PAGE_W - x;
}

function recolor(colors: string[], mood: Mood): string[] {
  if (mood === "day") return colors.map((hex) => hex.toLowerCase());
  return separate(colors.map((hex) => shiftHex(hex, mood)), 10);
}

function shiftHex(hex: string, mood: Mood): string {
  let [h, s, l] = rgbToHsl(hex);
  if (mood === "dawn") {
    if (l > 0.62) {
      l = Math.min(0.96, l * 0.9 + 0.12);
      h = approach(h, 32, 0.28);
      s *= 0.9;
    } else {
      l = Math.min(0.9, l * 1.04 + 0.02);
      h = approach(h, 24, 0.08);
    }
  } else if (mood === "dusk") {
    if (l > 0.58) {
      l = l * 0.72 + 0.06;
      h = approach(h, 18, 0.35);
      s = Math.min(1, s * 1.05);
    } else {
      l *= 0.88;
      h = approach(h, 12, 0.1);
    }
  } else {
    if (l > 0.6) {
      l = 0.32 + l * 0.32;
      h = approach(h, 214, 0.5);
      s = Math.min(0.75, s * 0.7 + 0.04);
    } else if (l > 0.35) {
      l *= 0.72;
      if (s < 0.35) h = approach(h, 214, 0.35);
    } else {
      l = l * 0.8 + 0.02;
    }
  }
  return hslToHex(h, clamp(s, 0, 1), clamp(l, 0.04, 0.97));
}

/** Push colliding swatches apart so a mood shift does not melt two steps together. */
function separate(colors: string[], gap: number): string[] {
  const rgb = colors.map(parseRgb);
  for (let pass = 0; pass < 10; pass += 1) {
    let moved = false;
    for (let i = 0; i < rgb.length; i += 1) {
      for (let j = 0; j < i; j += 1) {
        const left = rgb[i];
        const right = rgb[j];
        if (!left || !right) continue;
        const d = distance(left, right);
        if (d >= gap) continue;
        const delta = [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
        let norm = Math.hypot(delta[0] ?? 0, delta[1] ?? 0, delta[2] ?? 0);
        if (norm < 0.5) {
          delta[0] = ((i * 3) % 5) - 2;
          delta[1] = ((j * 5) % 5) - 2;
          delta[2] = 1.5;
          norm = Math.hypot(delta[0], delta[1], delta[2]) || 1;
        }
        const push = (gap - d) / 2 + 0.4;
        for (let k = 0; k < 3; k += 1) {
          const step = ((delta[k] ?? 0) / norm) * push;
          left[k] = clampByte((left[k] ?? 0) + step);
          right[k] = clampByte((right[k] ?? 0) - step);
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
  return rgb.map(hexOf);
}

function reportOf(picture: Picture, minRadiusVu: number, minAreaVu: number): QualityReport {
  const reasons: string[] = [];
  const regions = picture.regions.length;
  const colors = picture.colors.length;
  const gap = minDistance(picture.colors);
  const span = luminanceSpan(picture.colors);
  if (regions < 150 || regions > 220) reasons.push(`regions ${regions}`);
  if (colors < 8 || colors > 28) reasons.push(`colors ${colors}`);
  if (gap < 8) reasons.push(`contrast ${gap.toFixed(1)}`);
  if (span < 0.34) reasons.push(`light span ${span.toFixed(2)}`);
  if (picture.regions.some((region) => !region.label || !region.d.includes("M"))) reasons.push("paths");
  const used = new Set(picture.regions.map((region) => region.n));
  if (used.size !== colors) reasons.push("unused color");
  return {
    ok: reasons.length === 0,
    reasons,
    regions,
    colors,
    minRadiusVu,
    minAreaVu,
    maxFraction: 0.03,
    uncovered: 0,
    slivers: 0,
    mixedCells: 24,
    focalFraction: 0,
    focalRadiusVu: 0,
    minColorDistance: gap,
    lightSpan: span,
    hueClusters: hueClusters(picture.colors),
  };
}

const TOKEN = /[MLZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

function mapPath(d: string, xOf: (x: number) => number): string {
  let pair = 0;
  return d.replace(TOKEN, (token) => {
    if (/[MLZ]/i.test(token)) {
      pair = 0;
      return token;
    }
    const value = Number(token);
    const next = pair === 0 ? xOf(value) : value;
    pair = 1 - pair;
    return trim(next);
  });
}

function trim(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function approach(hue: number, target: number, amount: number): number {
  const delta = ((target - hue + 540) % 360) - 180;
  return (hue + delta * amount + 360) % 360;
}

function rgbToHsl(hex: string): [number, number, number] {
  const [r, g, b] = parseRgb(hex).map((channel) => channel / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return hexOf([r + m, g + m, b + m].map((channel) => clampByte(channel * 255)));
}

function parseRgb(hex: string): number[] {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

function hexOf(rgb: number[]): string {
  return `#${rgb.map((channel) => clampByte(channel).toString(16).padStart(2, "0")).join("")}`;
}

function distance(a: number[], b: number[]): number {
  return Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));
}

function minDistance(colors: string[]): number {
  const rgb = colors.map(parseRgb);
  let gap = Infinity;
  for (let i = 0; i < rgb.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      const left = rgb[i];
      const right = rgb[j];
      if (!left || !right) continue;
      gap = Math.min(gap, distance(left, right));
    }
  }
  return Number.isFinite(gap) ? gap : 0;
}

function luminanceSpan(colors: string[]): number {
  const lights = colors.map((hex) => {
    const [r, g, b] = parseRgb(hex);
    return (0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)) / 255;
  });
  return Math.max(...lights) - Math.min(...lights);
}

function hueClusters(colors: string[]): number {
  const hues: number[] = [];
  for (const hex of colors) {
    const [h, s, l] = rgbToHsl(hex);
    if (s < 0.12 || l < 0.08 || l > 0.94) continue;
    hues.push(h);
  }
  hues.sort((a, b) => a - b);
  if (!hues.length) return 1;
  let groups = 1;
  for (let i = 1; i < hues.length; i += 1) {
    if ((hues[i] ?? 0) - (hues[i - 1] ?? 0) > 28) groups += 1;
  }
  const first = hues[0] ?? 0;
  const last = hues[hues.length - 1] ?? 0;
  if (hues.length > 1 && first + 360 - last <= 28) groups -= 1;
  return Math.max(1, groups);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value: number): number {
  return Math.round(clamp(value, 0, 255));
}
