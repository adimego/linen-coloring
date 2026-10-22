import { mulberry32 } from "../match/logic.ts";
import type { Picture } from "../pictures/types.ts";
import { fingerprint, fingerprintDistance, measureCanvas, pictureFromCanvas, type QualityReport } from "./raster.ts";
import { MOODS, TEMPLATES, type Painted } from "./scenes.ts";

export const LAUNCH_DATE = "2026-10-22";
const MAX_VARIANTS = 8;
const LOOKBACK = 30;
const PERCEPTUAL_GAP = 18;

export type DailyResult = {
  picture: Picture;
  report: QualityReport;
  template: string;
  variant: number;
  fingerprint: number[];
};

const cache = new Map<string, DailyResult>();

export function hashDate(iso: string): number {
  let h = 2166136261;
  for (let i = 0; i < iso.length; i += 1) {
    h ^= iso.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  if (!year || !month || !day) throw new Error(`Bad date ${iso}`);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function localDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
}

/** Dates from today back to launch, newest first. Empty before launch. */
export function archiveDates(today = localDateISO()): string[] {
  if (!isIsoDate(today) || today < LAUNCH_DATE) return [];
  const dates: string[] = [];
  for (let iso = today; iso >= LAUNCH_DATE; iso = addDays(iso, -1)) dates.push(iso);
  return dates;
}

export function dailyId(iso: string): string {
  return `daily-${iso}`;
}

/** Days from launch to `iso`. Launch itself is 0. */
export function dayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  const [startYear, startMonth, startDay] = LAUNCH_DATE.split("-").map((part) => Number(part));
  const start = Date.UTC(startYear ?? 2026, (startMonth ?? 1) - 1, startDay ?? 1);
  const end = Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1);
  return Math.round((end - start) / 86_400_000);
}

export function formatDailyLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function priorFingerprints(iso: string): number[][] {
  const prints: number[][] = [];
  for (let back = 1; back <= LOOKBACK; back += 1) {
    const prev = addDays(iso, -back);
    if (prev < LAUNCH_DATE) break;
    prints.push(buildDaily(prev).fingerprint);
  }
  return prints;
}

export function buildDaily(iso: string): DailyResult {
  if (!isIsoDate(iso)) throw new Error(`Bad date ${iso}`);
  const cached = cache.get(iso);
  if (cached) return cached;
  const index = dayNumber(iso);
  if (index < 0) throw new Error(`${iso} is before launch`);
  const template = TEMPLATES[index % TEMPLATES.length];
  if (!template) throw new Error("No daily templates");
  const cycle = Math.floor(index / TEMPLATES.length);
  const seed = hashDate(iso);
  const prior = priorFingerprints(iso);
  let last = "no variant";
  for (let variant = 0; variant < MAX_VARIANTS; variant += 1) {
    const mood = MOODS[(cycle + variant) % MOODS.length] ?? "day";
    const rng = mulberry32((seed + Math.imul(variant + 1, 0x85ebca6b)) >>> 0);
    const painted: Painted = template(rng, mood);
    const report = measureCanvas(painted.canvas, true);
    if (!report.ok) {
      last = `${painted.id} v${variant}: ${report.reasons.join(", ")}`;
      continue;
    }
    const print = fingerprint(painted.canvas);
    const similar = prior.some((other) => fingerprintDistance(print, other) < PERCEPTUAL_GAP);
    if (similar) {
      last = `${painted.id} v${variant}: too similar`;
      continue;
    }
    const { picture, report: traced } = pictureFromCanvas(painted.canvas, {
      id: dailyId(iso),
      title: painted.title,
      caption: painted.caption,
      category: "daily",
    }, false);
    const result: DailyResult = {
      picture,
      report: traced.ok ? traced : report,
      template: painted.id,
      variant,
      fingerprint: print,
    };
    if (!result.report.ok) {
      last = `${painted.id} v${variant} trace: ${result.report.reasons.join(", ")}`;
      continue;
    }
    cache.set(iso, result);
    return result;
  }
  throw new Error(`${iso} failed every variant (${last})`);
}

export function dailyPicture(iso: string): Picture {
  return buildDaily(iso).picture;
}

export function clearDailyCache(): void {
  cache.clear();
}
