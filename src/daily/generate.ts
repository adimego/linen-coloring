import type { Picture } from "../pictures/types.ts";
import { composeDaily } from "./compose.ts";
import type { QualityReport } from "./raster.ts";
import { MOODS, TEMPLATES } from "./scenes.ts";

export const LAUNCH_DATE = "2026-10-22";

export function dayNumber(iso: string): number {
  const ms = Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${LAUNCH_DATE}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

export type DailyResult = {
  picture: Picture;
  report: QualityReport;
  template: string;
  variant: number;
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

export function buildDaily(iso: string): DailyResult {
  if (!isIsoDate(iso)) throw new Error(`Bad date ${iso}`);
  const cached = cache.get(iso);
  if (cached) return cached;
  const index = dayNumber(iso);
  const template = TEMPLATES[((index % TEMPLATES.length) + TEMPLATES.length) % TEMPLATES.length];
  const mood = MOODS[((Math.floor(index / TEMPLATES.length) % MOODS.length) + MOODS.length) % MOODS.length] ?? "day";
  if (!template) throw new Error(`${iso} has no scene`);
  const { picture, report } = composeDaily(template.source, mood, {
    id: dailyId(iso),
    title: template.titles[mood],
    caption: template.caption,
    minRadiusVu: template.minRadiusVu,
    minAreaVu: template.minAreaVu,
  });
  if (!report.ok) throw new Error(`${iso} ${template.id} ${report.reasons.join(", ")}`);
  const result: DailyResult = { picture, report, template: template.id, variant: 0 };
  cache.set(iso, result);
  return result;
}

export function dailyPicture(iso: string): Picture {
  return buildDaily(iso).picture;
}

export function clearDailyCache(): void {
  cache.clear();
}
