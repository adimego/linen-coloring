export type ThemeChoice = "light" | "night" | "system";
export type ScapeId = "linen" | "rain" | "ocean" | "birds" | "piano" | "forest";

export type Settings = {
  version: 1;
  theme: ThemeChoice;
  scape: ScapeId;
  volume: number;
};

const KEY = "linen.settings.v1";

export const SCAPES: Array<{ id: ScapeId; name: string; note: string }> = [
  { id: "linen", name: "Linen", note: "The soft drone that has always been here" },
  { id: "rain", name: "Rain", note: "Drops on a quiet roof" },
  { id: "ocean", name: "Ocean", note: "A slow wash of waves" },
  { id: "birds", name: "Birdsong", note: "A few calls in open air" },
  { id: "piano", name: "Piano", note: "Soft pentatonic pads" },
  { id: "forest", name: "Forest", note: "Wind in the leaves, and a bird" },
];

const THEMES: ThemeChoice[] = ["light", "night", "system"];
const SCAPE_IDS = new Set<string>(SCAPES.map((item) => item.id));

export function blankSettings(): Settings {
  return { version: 1, theme: "light", scape: "linen", volume: 1 };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankSettings();
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const theme = parsed.theme;
    const scape = parsed.scape;
    const volume = typeof parsed.volume === "number" ? parsed.volume : 1;
    return {
      version: 1,
      theme: theme === "night" || theme === "system" || theme === "light" ? theme : "light",
      scape: scape && SCAPE_IDS.has(scape) ? scape : "linen",
      volume: Math.min(1, Math.max(0, volume)),
    };
  } catch {
    return blankSettings();
  }
}

export function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* The choice still applies for this visit. */
  }
}

export function cycleTheme(theme: ThemeChoice): ThemeChoice {
  const index = THEMES.indexOf(theme);
  return THEMES[(index + 1) % THEMES.length] ?? "light";
}

export function themeLabel(theme: ThemeChoice): string {
  if (theme === "night") return "Night";
  if (theme === "system") return "System";
  return "Light";
}

export function nightActive(theme: ThemeChoice = loadSettings().theme): boolean {
  if (theme === "night") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: ThemeChoice = loadSettings().theme): void {
  document.documentElement.dataset.theme = nightActive(theme) ? "night" : "light";
  document.documentElement.dataset.themeChoice = theme;
  window.dispatchEvent(new Event("linen-theme"));
}

let listening = false;

export function applyStoredTheme(): void {
  applyTheme(loadSettings().theme);
  if (listening) return;
  listening = true;
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (loadSettings().theme === "system") applyTheme("system");
  });
}
