/**
 * Illustrated daily scenes. The calendar picks the scene, so a composition
 * cannot return inside a week. Dawn, day, dusk, and night repaint the same
 * drawing. Placement only jitters a few units.
 *
 * Shading is a handful of smooth bands. Detail is objects that belong in the
 * scene: petals, feathers, window panes, roof courses, reeds. No confetti.
 */
import { Canvas } from "./raster.ts";

export type Painted = {
  id: string;
  canvas: Canvas;
  title: string;
  caption: string;
};

export type Mood = "dawn" | "day" | "dusk" | "night";
type Rng = () => number;

export const MOODS: Mood[] = ["dawn", "day", "dusk", "night"];

const PALETTE: Record<Mood, string[]> = {
  day: ["#1e6cac", "#4e9ed4", "#8ec8ee", "#d4eefc", "#1a5c34", "#3e8d52", "#0e4e68", "#2b88a3", "#7ec8c8", "#f4b430", "#f7f4ee", "#3f8932", "#d2ec8a", "#143222", "#f6c6d6", "#e45b88", "#a82858", "#f8e2a4", "#dc9c30", "#1c1618", "#e0b07a", "#8a5434", "#7a2e38", "#d9d0c6"],
  night: ["#103b5e", "#276f9f", "#3ea1e2", "#7eccf6", "#07180d", "#224d2d", "#00102c", "#1f5b57", "#46a4a4", "#be830a", "#daccb0", "#1f410e", "#b4df3b", "#1c031c", "#e9779d", "#c32056", "#5e1631", "#f1c74f", "#976819", "#2c0000", "#ce8430", "#472b1b", "#3d0d1b", "#b4a38f"],
  dawn: ["#237cc6", "#67abda", "#a9d5f2", "#e2f4fd", "#217441", "#47a25e", "#126283", "#319cbb", "#93d1d1", "#f6bf4d", "#f9f1e6", "#499f3a", "#dcf0a4", "#1d4831", "#fecfe9", "#e8759b", "#c12e65", "#faebc0", "#dca44a", "#2d2327", "#e6bf93", "#a0623c", "#903642", "#e1dcd6"],
  dusk: ["#1a5e96", "#3993cf", "#78bdeb", "#bce5fa", "#144829", "#367b48", "#0b3d52", "#287c8d", "#6cc0c0", "#f3ab18", "#efe9dd", "#367525", "#cae874", "#0d2016", "#f3b0c6", "#e04578", "#93234d", "#f6da8c", "#cf8f23", "#14030b", "#dba465", "#77492d", "#67272f", "#cfc3b7"],
};

type Sw = {
  sky: number[];
  land: number[];
  water: number[];
  sun: number;
  cloud: number;
  leaf: number[];
  stem: number;
  pink: number[];
  gold: number[];
  ink: number;
  wood: number[];
  roof: number;
  stone: number;
};

function kit(canvas: Canvas, mood: Mood, extra: string[] = []): Sw {
  const hex = PALETTE[mood];
  const focal = new Set(["pink", "gold", ...extra]);
  const group = [
    "sky", "sky", "sky", "sky",
    "land", "land",
    "water", "water", "water",
    "sun", "cloud",
    "leaf", "leaf",
    "stem",
    "pink", "pink", "pink",
    "gold", "gold",
    "ink",
    "wood", "wood",
    "roof",
    "stone",
  ];
  const id = group.map((name, index) => canvas.add(hex[index] ?? "#888888", focal.has(name)));
  const take = (start: number, count: number) => id.slice(start, start + count);
  const sw: Sw = {
    sky: take(0, 4),
    land: take(4, 2),
    water: take(6, 3),
    sun: id[9] ?? 1,
    cloud: id[10] ?? 1,
    leaf: take(11, 2),
    stem: id[13] ?? 1,
    pink: take(14, 3),
    gold: take(17, 2),
    ink: id[19] ?? 1,
    wood: take(20, 2),
    roof: id[22] ?? 1,
    stone: id[23] ?? 1,
  };
  canvas.rect(sw.sky[0] ?? 1, 0, 0, 320, 460);
  return sw;
}

function rf(rng: Rng, a: number, b: number): number {
  return a + rng() * (b - a);
}

function edge(y: number, phase: number, amp: number, seal: boolean): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 8; i += 1) {
    const x = (320 * i) / 8;
    const wobble = seal ? 0 : amp * Math.sin((i / 8) * Math.PI * 2 + phase);
    pts.push([x, y + wobble]);
  }
  return pts;
}

function bands(canvas: Canvas, colors: number[], y0: number, y1: number, amp: number): void {
  const span = Math.max(1, y1 - y0);
  const count = Math.max(colors.length, Math.ceil(span / 62));
  const seq: number[] = [];
  for (let i = 0; i < count; i += 1) seq.push(colors[i % colors.length] ?? 1);
  colors = seq;
  const weights = [1.05, 0.92, 1.02, 0.96, 1.04, 0.94, 1.0, 0.98];
  const used = Array.from({ length: colors.length }, (_, i) => weights[i % weights.length] ?? 1);
  const sum = used.reduce((total, value) => total + value, 0);
  const cuts = [y0];
  let y = y0;
  for (let i = 0; i < colors.length - 1; i += 1) {
    y += ((y1 - y0) * (used[i] ?? 1)) / sum;
    cuts.push(y);
  }
  cuts.push(y1);
  colors.forEach((n, i) => {
    const top = edge(cuts[i] ?? y0, i * 0.7, amp, i === 0);
    const bot = edge((cuts[i + 1] ?? y1) + 1.4, (i + 1) * 0.7, amp, i === colors.length - 1);
    canvas.poly(n, [...top, ...[...bot].reverse()]);
  });
}

function cloud(canvas: Canvas, light: number, shade: number, x: number, y: number, s: number): void {
  canvas.ellipse(light, x, y, 28 * s, 14 * s);
  canvas.ellipse(light, x + 18 * s, y + 2, 16 * s, 11 * s);
  canvas.ellipse(shade, x + 4 * s, y + 6, 14 * s, 8 * s);
}

function sector(canvas: Canvas, n: number, cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): void {
  const pts: Array<[number, number]> = [];
  const steps = 5;
  for (let i = 0; i <= steps; i += 1) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]);
  }
  for (let i = steps; i >= 0; i -= 1) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]);
  }
  canvas.poly(n, pts);
}

function along(canvas: Canvas, n: number, pts: Array<[number, number]>, radius: number): void {
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    const steps = 4;
    for (let s = 0; s < steps; s += 1) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      canvas.capsule(
        n,
        a[0] + (b[0] - a[0]) * t0,
        a[1] + (b[1] - a[1]) * t0,
        a[0] + (b[0] - a[0]) * t1,
        a[1] + (b[1] - a[1]) * t1,
        radius,
      );
    }
  }
}

function tulip(canvas: Canvas, sw: Sw, x: number, y: number, lean: number): void {
  canvas.capsule(sw.stem, x, y + 8, x + lean, y + 36, 7);
  canvas.ellipse(sw.leaf[0] ?? sw.stem, x + 14, y + 22, 8, 16, 0.9);
  canvas.ellipse(sw.leaf[1] ?? sw.stem, x - 12, y + 26, 7, 14, -0.8);
  canvas.ellipse(sw.pink[0] ?? sw.sun, x - 6, y - 2, 10, 16, -0.3);
  canvas.ellipse(sw.pink[1] ?? sw.sun, x + 6, y, 10, 16, 0.25);
  canvas.ellipse(sw.gold[0] ?? sw.sun, x, y + 6, 6, 8);
}

function bloom(canvas: Canvas, sw: Sw, x: number, y: number, s: number): void {
  const scale = Math.max(1, s);
  canvas.ellipse(sw.leaf[0] ?? sw.stem, x - 12 * scale, y + 8, 8 * scale, 14 * scale, -0.6);
  canvas.ellipse(sw.leaf[1] ?? sw.stem, x + 12 * scale, y + 10, 8 * scale, 14 * scale, 0.7);
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const color = sw.pink[i % 3] ?? sw.sun;
    canvas.ellipse(color, x + Math.cos(a) * 12 * scale, y + Math.sin(a) * 12 * scale, 8 * scale, 12 * scale, a + Math.PI / 2);
  }
  canvas.ellipse(sw.gold[1] ?? sw.sun, x, y, 7 * scale, 7 * scale);
}

function lily(canvas: Canvas, sw: Sw, x: number, y: number): void {
  canvas.ellipse(sw.land[1] ?? sw.stem, x, y, 16, 11);
  canvas.ellipse(sw.pink[0] ?? sw.sun, x - 9, y - 4, 8, 11, -0.4);
  canvas.ellipse(sw.pink[1] ?? sw.sun, x + 9, y - 4, 8, 11, 0.4);
  canvas.ellipse(sw.gold[0] ?? sw.sun, x, y + 2, 7, 7);
}

function house(canvas: Canvas, sw: Sw, x: number, y: number, w: number, h: number): void {
  canvas.rect(sw.wood[0] ?? sw.stone, x, y, w * 0.38, h);
  canvas.rect(sw.wood[1] ?? sw.stone, x + w * 0.38, y, w * 0.62, h);
  canvas.poly(sw.roof, [
    [x - 8, y + 2],
    [x + w + 8, y + 2],
    [x + w / 2, y - 52],
  ]);
  shingles(canvas, sw, x + 10, y - 40, Math.max(36, w - 20));
  canvas.rect(sw.ink, x + w * 0.42, y + h * 0.4, Math.max(16, w * 0.16), h * 0.6);
  windowPane(canvas, sw, x + 8, y + h * 0.18);
  if (w >= 96) windowPane(canvas, sw, x + w - 40, y + h * 0.18);
}

/** Two courses of tiles with a gap, so each tile stays its own region. */
function shingles(canvas: Canvas, sw: Sw, x: number, y: number, w: number): void {
  const rows = [sw.roof, sw.gold[1] ?? sw.roof];
  for (let row = 0; row < 2; row += 1) {
    const yy = y + row * 18;
    const inset = row * 8;
    const span = w - inset * 2;
    const cols = Math.max(2, Math.floor(span / 22));
    const gap = 4;
    const tw = (span - gap * (cols - 1)) / cols;
    if (tw < 14) continue;
    for (let col = 0; col < cols; col += 1) {
      const color = (row + col) % 2 === 0 ? rows[0] ?? sw.roof : rows[1] ?? sw.roof;
      canvas.rect(color, x + inset + col * (tw + gap), yy, tw, 14);
    }
  }
}

/** Four panes with a wall-colored mullion between them. Each pane is tappable. */
function windowPane(canvas: Canvas, sw: Sw, x: number, y: number): void {
  const glass = [sw.sky[3] ?? sw.cloud, sw.gold[0] ?? sw.sun, sw.sky[2] ?? sw.cloud, sw.sky[1] ?? sw.sun];
  const pw = 14;
  const ph = 16;
  const gap = 4;
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      canvas.rect(glass[row * 2 + col] ?? sw.sun, x + col * (pw + gap), y + row * (ph + gap), pw, ph);
    }
  }
}

function tree(canvas: Canvas, sw: Sw, x: number, y: number): void {
  canvas.capsule(sw.wood[1] ?? sw.ink, x, y, x, y + 70, 8);
  canvas.ellipse(sw.leaf[1] ?? sw.stem, x - 16, y + 8, 22, 16);
  canvas.ellipse(sw.leaf[0] ?? sw.stem, x + 14, y - 4, 26, 20);
  canvas.ellipse(sw.land[1] ?? sw.stem, x, y - 16, 20, 16);
}

function pine(canvas: Canvas, sw: Sw, x: number, y: number): void {
  canvas.capsule(sw.wood[1] ?? sw.ink, x, y, x, y + 56, 8);
  canvas.poly(sw.leaf[0] ?? sw.stem, [[x, y - 70], [x - 26, y - 18], [x + 26, y - 18]]);
  canvas.poly(sw.leaf[1] ?? sw.stem, [[x, y - 40], [x - 34, y + 6], [x + 34, y + 6]]);
  canvas.poly(sw.land[0] ?? sw.stem, [[x, y - 12], [x - 22, y + 26], [x + 22, y + 26]]);
}

function sailboat(canvas: Canvas, sw: Sw, x: number, y: number): void {
  canvas.ellipse(sw.wood[1] ?? sw.ink, x, y, 46, 16);
  canvas.ellipse(sw.wood[0] ?? sw.stone, x + 8, y - 2, 22, 9);
  canvas.capsule(sw.ink, x + 4, y - 6, x + 4, y - 96, 7);
  canvas.poly(sw.cloud, [[x - 2, y - 90], [x - 2, y - 12], [x + 58, y - 22]]);
  canvas.poly(sw.pink[1] ?? sw.sun, [[x + 10, y - 78], [x + 10, y - 16], [x - 36, y - 24]]);
  canvas.rect(sw.gold[1] ?? sw.sun, x - 2, y - 108, 16, 14);
}

/** Soft concentric steps. Later ellipses punch the earlier ones into rings. */
function shadeDisc(canvas: Canvas, colors: number[], cx: number, cy: number, rx: number, ry: number): void {
  colors.forEach((n, i) => {
    const k = 1 - i * 0.3;
    if (Math.min(rx, ry) * k < 8) return;
    canvas.ellipse(n, cx, cy, rx * k, ry * k);
  });
}

function pond(canvas: Canvas, sw: Sw, x0: number, y0: number, cols: number, rows: number): void {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      lily(canvas, sw, x0 + col * 54 + (row % 2) * 16, y0 + row * 58);
    }
  }
}

function bed(canvas: Canvas, sw: Sw, x0: number, y0: number, cols: number, rows: number): void {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      tulip(canvas, sw, x0 + col * 48 + (row % 2) * 12, y0 + row * 50, col % 2 === 0 ? -2 : 2);
    }
  }
}

function finished(id: string, canvas: Canvas, title: string, caption: string): Painted {
  return { id, canvas, title, caption };
}

function tulipMeadow(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["land"]);
  const horizon = 168 + rf(rng, -3, 3);
  bands(canvas, sw.sky, 0, horizon, 6);
  canvas.ellipse(sw.sun, 70 + rf(rng, -4, 4), 52, 24, 24);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 210, 40, 1);
  cloud(canvas, sw.cloud, sw.sky[3] ?? sw.cloud, 270, 78, 0.75);
  bands(canvas, [...sw.land, sw.leaf[1] ?? sw.land[0] ?? 1, sw.land[0] ?? 1, sw.stem], horizon - 1, 460, 5);
  const mx = 250;
  canvas.rect(sw.wood[0] ?? sw.stone, mx - 16, horizon - 78, 34, 84);
  canvas.poly(sw.roof, [[mx - 26, horizon - 72], [mx + 28, horizon - 72], [mx + 1, horizon - 108]]);
  for (let b = 0; b < 4; b += 1) {
    const a = b * Math.PI / 2 + 0.4;
    canvas.capsule(sw.ink, mx + 1, horizon - 78, mx + 1 + Math.cos(a) * 36, horizon - 78 + Math.sin(a) * 36, 7);
  }
  canvas.rect(sw.gold[0] ?? sw.sun, mx - 6, horizon - 48, 14, 18);
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const x = 28 + col * 46 + (row % 2) * 10;
      const y = 214 + row * 48;
      if (x > 210 && y < 250) continue;
      tulip(canvas, sw, x + rf(rng, -2, 2), y, rf(rng, -3, 3));
    }
  }
  const names: Record<Mood, string> = { dawn: "Tulips at Dawn", day: "Tulip Windmill", dusk: "Tulips at Dusk", night: "Night Tulips" };
  return finished("tulips", canvas, names[mood], "A windmill behind rows of tulips.");
}

function flamingoLagoon(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["water"]);
  const horizon = 156;
  bands(canvas, sw.sky, 0, horizon, 6);
  canvas.ellipse(sw.sun, 64, 48, 22, 22);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 220, 42, 0.9);
  bands(canvas, [sw.water[2] ?? 1, sw.water[1] ?? 1, sw.water[0] ?? 1, sw.water[1] ?? 1, sw.sky[3] ?? 1], horizon - 1, 460, 8);
  pond(canvas, sw, 28, horizon + 20, 5, 4);
  const bx = 168 + rf(rng, -4, 4);
  const by = 300;
  shadeDisc(canvas, [sw.pink[1] ?? sw.sun, sw.pink[2] ?? sw.sun, sw.gold[0] ?? sw.sun], bx, by, 64, 34);
  canvas.ellipse(sw.pink[2] ?? sw.sun, bx + 22, by - 4, 26, 16, -0.2);
  for (let i = 0; i < 5; i += 1) {
    const a = -0.4 + i * 0.28;
    canvas.ellipse(sw.gold[0] ?? sw.sun, bx + 10 + Math.cos(a) * 18, by - 8 + Math.sin(a) * 10, 7, 14, a);
  }
  const neck: Array<[number, number]> = [
    [bx + 36, by - 8],
    [bx + 78, by - 48],
    [bx + 46, by - 96],
    [bx + 8, by - 132],
  ];
  along(canvas, sw.pink[0] ?? sw.sun, neck, 12);
  const head = neck[3] ?? [bx, by - 120];
  canvas.ellipse(sw.pink[0] ?? sw.sun, head[0], head[1], 16, 15);
  canvas.capsule(sw.gold[1] ?? sw.sun, head[0] - 8, head[1] + 2, head[0] - 36, head[1] + 8, 7);
  canvas.capsule(sw.ink, bx - 16, by + 20, bx - 22, by + 78, 7);
  canvas.capsule(sw.ink, bx + 10, by + 22, bx + 6, by + 80, 7);
  const names: Record<Mood, string> = { dawn: "Lagoon at Dawn", day: "Flamingo Lagoon", dusk: "Flamingo at Dusk", night: "Night Lagoon" };
  return finished("lagoon", canvas, names[mood], "A flamingo stands in a quiet lagoon.");
}

function roseWindow(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood);
  const cx = 160 + rf(rng, -2, 2);
  const cy = 214;
  bands(canvas, [sw.stone, sw.wood[0] ?? sw.stone, sw.gold[0] ?? sw.stone, sw.wood[1] ?? sw.stone], 0, 460, 4);
  const glass = [sw.sky[1] ?? 1, sw.pink[1] ?? 1, sw.gold[1] ?? 1, sw.leaf[0] ?? 1, sw.water[1] ?? 1, sw.pink[0] ?? 1];
  const rings = [
    { n: 16, r0: 128, r1: 150, stone: true },
    { n: 14, r0: 100, r1: 122, stone: false },
    { n: 12, r0: 74, r1: 94, stone: false },
    { n: 10, r0: 50, r1: 68, stone: false },
    { n: 8, r0: 28, r1: 44, stone: false },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i += 1) {
      const a0 = -Math.PI / 2 + (i * Math.PI * 2) / ring.n;
      const a1n = a0 + (Math.PI * 2) / ring.n + 0.012;
      const color = ring.stone
        ? (i % 2 ? sw.stone : sw.wood[1] ?? sw.stone)
        : (glass[i % glass.length] ?? sw.sun);
      sector(canvas, color, cx, cy, ring.r0, ring.r1, a0, a1n);
    }
  }
  canvas.ellipse(sw.gold[0] ?? sw.sun, cx, cy, 22, 22);
  canvas.ellipse(sw.pink[2] ?? sw.sun, cx, cy, 12, 12);
  for (let i = 0; i < 5; i += 1) {
    canvas.rect(i % 2 ? sw.stone : sw.wood[0] ?? sw.stone, 6, 24 + i * 86, 20, 48);
    canvas.rect(i % 2 ? sw.wood[0] ?? sw.stone : sw.stone, 294, 24 + i * 86, 20, 48);
  }
  for (let i = 0; i < 3; i += 1) windowPane(canvas, sw, 78 + i * 62, 404);
  for (const [x, y] of [[36, 36], [284, 36], [36, 420], [284, 420]] as Array<[number, number]>) {
    canvas.ellipse(sw.leaf[1] ?? sw.stem, x, y, 16, 22, 0.4);
    canvas.ellipse(sw.pink[0] ?? sw.sun, x, y - 8, 10, 10);
  }
  const names: Record<Mood, string> = { dawn: "Rose Window, Morning", day: "Rose Window", dusk: "Rose Window at Dusk", night: "Rose Window, Night" };
  return finished("window", canvas, names[mood], "A round rose window in a stone wall.");
}

function harbor(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["water"]);
  const horizon = 150 + rf(rng, -3, 3);
  bands(canvas, sw.sky, 0, horizon, 6);
  canvas.ellipse(sw.sun, 58, 46, 22, 22);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 200, 36, 1);
  cloud(canvas, sw.cloud, sw.sky[3] ?? sw.cloud, 270, 72, 0.7);
  bands(canvas, [sw.water[2] ?? 1, sw.water[1] ?? 1, sw.water[0] ?? 1, sw.water[1] ?? 1, sw.sky[2] ?? 1], horizon - 1, 460, 9);
  canvas.rect(sw.land[1] ?? sw.stem, 0, horizon - 8, 118, 36);
  canvas.rect(sw.land[0] ?? sw.stem, 210, horizon - 8, 110, 36);
  house(canvas, sw, 8, horizon - 78, 100, 74);
  house(canvas, sw, 214, horizon - 86, 96, 80);
  sailboat(canvas, sw, 150, horizon + 78);
  sailboat(canvas, sw, 78, horizon + 150);
  canvas.ellipse(sw.ink, 286, horizon + 8, 28, 14);
  for (let i = 0; i < 7; i += 1) {
    const y = horizon + 188 + i * 22;
    canvas.rect(i % 2 ? sw.wood[0] ?? sw.stone : sw.wood[1] ?? sw.stone, 24, y, 168, 16);
  }
  for (let i = 0; i < 4; i += 1) {
    canvas.ellipse(sw.cloud, 36 + i * 28, horizon + 36, 12, 8);
  }
  const names: Record<Mood, string> = { dawn: "Harbor Morning", day: "Sail Harbor", dusk: "Harbor at Dusk", night: "Harbor Moon" };
  return finished("harbor", canvas, names[mood], "A sailboat, a light, and a plank pier.");
}

function stillSwan(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["water"]);
  const horizon = 170;
  bands(canvas, sw.sky, 0, horizon, 6);
  canvas.ellipse(sw.sun, 240, 50, 20, 20);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 70, 46, 0.9);
  bands(canvas, [sw.water[2] ?? 1, sw.water[1] ?? 1, sw.water[0] ?? 1, sw.water[1] ?? 1, sw.sky[3] ?? 1], horizon - 1, 460, 7);
  tree(canvas, sw, 48, horizon - 20);
  const sx = 170 + rf(rng, -4, 4);
  const sy = 280;
  shadeDisc(canvas, [sw.cloud, sw.stone, sw.sky[3] ?? sw.cloud], sx, sy, 58, 28);
  canvas.ellipse(sw.stone, sx + 16, sy + 6, 30, 16);
  along(canvas, sw.cloud, [[sx + 40, sy - 6], [sx + 70, sy - 40], [sx + 48, sy - 78]], 11);
  canvas.ellipse(sw.cloud, sx + 46, sy - 86, 14, 12);
  canvas.capsule(sw.gold[1] ?? sw.sun, sx + 40, sy - 84, sx + 22, sy - 78, 6);
  canvas.ellipse(sw.ink, sx + 50, sy - 88, 7, 7);
  pond(canvas, sw, 36, horizon + 24, 5, 3);
  canvas.ellipse(sw.land[1] ?? sw.stem, 80, 360, 20, 12);
  canvas.ellipse(sw.pink[0] ?? sw.sun, 80, 350, 8, 8);
  const names: Record<Mood, string> = { dawn: "Swan at Dawn", day: "Still Swan", dusk: "Swan at Dusk", night: "Night Swan" };
  return finished("swan", canvas, names[mood], "A swan on flat water, with reeds.");
}

function gardenRobin(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["land"]);
  const horizon = 200;
  bands(canvas, sw.sky, 0, horizon, 5);
  canvas.ellipse(sw.sun, 60, 48, 20, 20);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 230, 50, 0.85);
  bands(canvas, [sw.leaf[1] ?? 1, sw.land[1] ?? 1, sw.land[0] ?? 1, sw.stem, sw.land[0] ?? 1], horizon - 1, 460, 4);
  canvas.capsule(sw.wood[1] ?? sw.ink, 40, 150, 280, 210, 10);
  const bx = 150 + rf(rng, -6, 6);
  canvas.ellipse(sw.roof, bx, 168, 22, 16);
  canvas.ellipse(sw.wood[0] ?? sw.stone, bx - 16, 160, 16, 12);
  canvas.ellipse(sw.ink, bx + 10, 150, 14, 12);
  canvas.capsule(sw.gold[1] ?? sw.sun, bx + 18, 154, bx + 36, 158, 7);
  for (let i = 0; i < 4; i += 1) bloom(canvas, sw, 40 + i * 72, 108, 1);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) tulip(canvas, sw, 36 + col * 72, 250 + row * 64, 0);
  }
  const names: Record<Mood, string> = { dawn: "Robin at Dawn", day: "Garden Robin", dusk: "Robin at Dusk", night: "Night Robin" };
  return finished("robin", canvas, names[mood], "A robin on a blossoming branch.");
}

function sunflower(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood);
  bands(canvas, sw.sky, 0, 250, 6);
  bands(canvas, [sw.leaf[1] ?? 1, sw.land[1] ?? 1, sw.land[0] ?? 1], 248, 460, 4);
  canvas.capsule(sw.stem, 160, 250, 160 + rf(rng, -4, 4), 430, 10);
  canvas.ellipse(sw.leaf[0] ?? sw.stem, 120, 300, 28, 16, -0.6);
  canvas.ellipse(sw.leaf[1] ?? sw.stem, 200, 340, 30, 16, 0.5);
  const cx = 168;
  const cy = 132;
  for (let i = 0; i < 14; i += 1) {
    const a = (i * Math.PI * 2) / 14;
    const color = i % 2 ? sw.gold[0] ?? sw.sun : sw.gold[1] ?? sw.sun;
    canvas.ellipse(color, cx + Math.cos(a) * 78, cy + Math.sin(a) * 72, 12, 22, a + Math.PI / 2);
  }
  for (let i = 0; i < 10; i += 1) {
    const a = (i * Math.PI * 2) / 10 + 0.2;
    const color = i % 2 ? sw.wood[0] ?? sw.sun : sw.roof;
    canvas.ellipse(color, cx + Math.cos(a) * 40, cy + Math.sin(a) * 36, 11, 14, a);
  }
  shadeDisc(canvas, [sw.roof, sw.ink, sw.gold[0] ?? sw.sun], cx, cy, 22, 22);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 48, 40, 0.7);
  for (let i = 0; i < 4; i += 1) bloom(canvas, sw, 40 + i * 78, 400, 1);
  bloom(canvas, sw, 70, 300, 1);
  const names: Record<Mood, string> = { dawn: "Sunflower Morning", day: "Sunflower", dusk: "Sunflower at Dusk", night: "Night Sunflower" };
  return finished("sunflower", canvas, names[mood], "One sunflower, petal by petal.");
}

function cottageGarden(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["land"]);
  const horizon = 150 + rf(rng, -2, 2);
  bands(canvas, sw.sky, 0, horizon, 5);
  canvas.ellipse(sw.sun, 56, 46, 20, 20);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 230, 40, 0.9);
  canvas.ellipse(sw.land[1] ?? sw.stem, 70, horizon + 6, 80, 28);
  canvas.ellipse(sw.land[0] ?? sw.stem, 250, horizon + 10, 90, 30);
  bands(canvas, [sw.leaf[1] ?? 1, sw.land[1] ?? 1, sw.land[0] ?? 1, sw.stem], horizon + 16, 460, 4);
  tree(canvas, sw, 52, horizon - 10);
  house(canvas, sw, 118, horizon + 8, 140, 96);
  canvas.rect(sw.stone, 168, horizon + 108, 28, 80);
  bed(canvas, sw, 16, 292, 6, 3);
  const names: Record<Mood, string> = { dawn: "Cottage Morning", day: "Rose Cottage", dusk: "Cottage at Dusk", night: "Cottage Lights" };
  return finished("cottage", canvas, names[mood], "A cottage, a tree, and beds of tulips.");
}

function lighthouseCove(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["water"]);
  const horizon = 168;
  bands(canvas, sw.sky, 0, horizon, 6);
  canvas.ellipse(sw.sun, 70 + rf(rng, -4, 4), 48, 22, 22);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 220, 44, 0.85);
  bands(canvas, [sw.water[2] ?? 1, sw.water[1] ?? 1, sw.water[0] ?? 1, sw.water[1] ?? 1, sw.sky[3] ?? 1], horizon - 1, 460, 8);
  canvas.ellipse(sw.stone, 70, horizon + 16, 70, 26);
  canvas.ellipse(sw.ink, 250, horizon + 20, 60, 22);
  canvas.rect(sw.stone, 196, horizon - 110, 36, 120);
  canvas.rect(sw.wood[0] ?? sw.stone, 190, horizon - 128, 48, 22);
  canvas.ellipse(sw.gold[0] ?? sw.sun, 214, horizon - 116, 12, 12);
  canvas.poly(sw.roof, [[188, horizon - 126], [240, horizon - 126], [214, horizon - 156]]);
  for (let i = 0; i < 4; i += 1) canvas.rect(sw.ink, 206, horizon - 90 + i * 26, 16, 12);
  pond(canvas, sw, 24, horizon + 36, 5, 4);
  sailboat(canvas, sw, 70, horizon + 120);
  const names: Record<Mood, string> = { dawn: "Cove at Dawn", day: "Lighthouse Cove", dusk: "Cove at Dusk", night: "Night Light" };
  return finished("lighthouse", canvas, names[mood], "A lighthouse above a rocky cove.");
}

function canalBridge(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["water"]);
  const horizon = 140 + rf(rng, -2, 2);
  bands(canvas, sw.sky, 0, horizon, 5);
  canvas.ellipse(sw.sun, 250, 42, 18, 18);
  bands(canvas, [sw.water[2] ?? 1, sw.water[1] ?? 1, sw.water[0] ?? 1, sw.water[1] ?? 1], 220, 460, 8);
  canvas.rect(sw.land[1] ?? sw.stem, 0, horizon, 320, 90);
  house(canvas, sw, 16, horizon - 20, 108, 86);
  house(canvas, sw, 206, horizon - 28, 104, 92);
  tree(canvas, sw, 160, horizon - 40);
  canvas.poly(sw.stone, [[30, 268], [290, 268], [258, 214], [62, 214]]);
  canvas.ellipse(sw.water[0] ?? sw.sky[0] ?? 1, 160, 318, 64, 24);
  for (let i = 0; i < 6; i += 1) canvas.rect(sw.ink, 48 + i * 38, 228, 16, 32);
  sailboat(canvas, sw, 90, 360);
  for (let i = 0; i < 4; i += 1) bloom(canvas, sw, 36 + i * 82, 168, 1);
  const names: Record<Mood, string> = { dawn: "Canal Morning", day: "Canal Bridge", dusk: "Canal at Dusk", night: "Night Canal" };
  return finished("canal", canvas, names[mood], "Houses, a bridge, and still canal water.");
}

function catNap(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood);
  bands(canvas, [sw.sky[2] ?? sw.cloud, sw.sky[3] ?? sw.cloud, sw.water[1] ?? sw.sky[1] ?? 1, sw.stone], 0, 460, 3);
  canvas.rect(sw.wood[0] ?? sw.stone, 56, 36, 208, 150);
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) windowPane(canvas, sw, 70 + col * 64, 48 + row * 68);
  }
  canvas.rect(sw.wood[1] ?? sw.ink, 56, 36, 14, 150);
  canvas.rect(sw.wood[1] ?? sw.ink, 250, 36, 14, 150);
  shadeDisc(canvas, [sw.roof, sw.wood[0] ?? sw.stone, sw.pink[2] ?? sw.sun], 148 + rf(rng, -4, 4), 270, 76, 38);
  canvas.ellipse(sw.ink, 190, 250, 16, 14);
  canvas.ellipse(sw.pink[1] ?? sw.sun, 108, 258, 16, 18);
  canvas.ellipse(sw.gold[0] ?? sw.sun, 128, 244, 8, 8);
  canvas.ellipse(sw.gold[0] ?? sw.sun, 158, 242, 8, 8);
  shadeDisc(canvas, [sw.pink[0] ?? sw.sun, sw.gold[1] ?? sw.sun], 72, 392, 48, 28);
  bloom(canvas, sw, 250, 330, 1);
  canvas.ellipse(sw.leaf[0] ?? sw.stem, 250, 390, 28, 18, 0.4);
  const names: Record<Mood, string> = { dawn: "Cat at Dawn", day: "Cat Nap", dusk: "Cat at Dusk", night: "Night Cat" };
  return finished("cat", canvas, names[mood], "A cat curled on a cushion by the window.");
}

function balloonDay(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["sky"]);
  const horizon = 250;
  bands(canvas, sw.sky, 0, horizon, 6);
  bands(canvas, [sw.land[1] ?? 1, sw.land[0] ?? 1, sw.stem], horizon - 1, 460, 4);
  const colors = [sw.pink[1] ?? 1, sw.gold[1] ?? 1, sw.sky[1] ?? 1, sw.leaf[0] ?? 1, sw.pink[0] ?? 1, sw.water[1] ?? 1];
  for (let i = 0; i < 6; i += 1) {
    const x = 40 + i * 46 + rf(rng, -2, 2);
    const y = 78 + (i % 2) * 48;
    const color = colors[i] ?? sw.sun;
    shadeDisc(canvas, [color, sw.cloud], x, y, 22, 28);
    canvas.rect(sw.wood[1] ?? sw.ink, x - 10, y + 30, 20, 12);
    canvas.capsule(sw.ink, x, y + 26, x, horizon - 20, 6);
  }
  house(canvas, sw, 30, horizon - 20, 80, 70);
  house(canvas, sw, 200, horizon - 10, 90, 64);
  tree(canvas, sw, 150, horizon - 16);
  for (let i = 0; i < 4; i += 1) bloom(canvas, sw, 40 + i * 70, horizon + 80, 0.75);
  const names: Record<Mood, string> = { dawn: "Balloons at Dawn", day: "Balloon Day", dusk: "Balloons at Dusk", night: "Night Balloons" };
  return finished("balloons", canvas, names[mood], "Six balloons over a small town.");
}

function snowCabin(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["land", "cloud"]);
  const horizon = 180;
  bands(canvas, sw.sky, 0, horizon, 5);
  canvas.ellipse(sw.sun, 250 + rf(rng, -4, 4), 48, 18, 18);
  bands(canvas, [sw.cloud, sw.stone, sw.sky[3] ?? sw.cloud, sw.stone], horizon - 1, 460, 4);
  canvas.poly(sw.cloud, [[0, horizon + 20], [110, horizon - 46], [190, horizon + 8], [0, horizon + 36]]);
  canvas.poly(sw.stone, [[150, horizon + 14], [250, horizon - 54], [320, horizon - 4], [320, horizon + 28]]);
  house(canvas, sw, 118, horizon + 6, 124, 88);
  pine(canvas, sw, 62, horizon - 8);
  pine(canvas, sw, 248, horizon - 16);
  pine(canvas, sw, 28, horizon + 36);
  for (let i = 0; i < 5; i += 1) {
    canvas.capsule(i % 2 ? sw.wood[0] ?? sw.ink : sw.wood[1] ?? sw.ink, 36, 392 + i * 18, 150, 392 + i * 18, 8);
  }
  for (let i = 0; i < 6; i += 1) canvas.rect(sw.ink, 188 + i * 22, 400, 14, 40);
  for (let i = 0; i < 4; i += 1) canvas.ellipse(sw.cloud, 40 + i * 70, 36 + (i % 2) * 18, 16, 10);
  const names: Record<Mood, string> = { dawn: "Cabin at Dawn", day: "Snow Cabin", dusk: "Cabin at Dusk", night: "Cabin Lights" };
  return finished("cabin", canvas, names[mood], "A cabin between snowy pines.");
}

function lemonTea(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["wood", "sky"]);
  bands(canvas, [sw.sky[3] ?? sw.cloud, sw.sky[2] ?? sw.cloud, sw.stone, sw.sky[1] ?? 1], 0, 280 + rf(rng, -2, 2), 4);
  bands(canvas, [sw.wood[0] ?? sw.stone, sw.wood[1] ?? sw.stone, sw.ink, sw.roof], 278, 460, 3);
  shadeDisc(canvas, [sw.cloud, sw.sky[2] ?? sw.cloud, sw.water[2] ?? sw.sky[1] ?? 1], 108, 228, 40, 34);
  canvas.ellipse(sw.gold[1] ?? sw.sun, 108, 196, 16, 12);
  canvas.capsule(sw.wood[1] ?? sw.ink, 142, 214, 168, 188, 7);
  shadeDisc(canvas, [sw.gold[0] ?? sw.sun, sw.cloud, sw.gold[1] ?? sw.sun], 196, 250, 24, 24);
  shadeDisc(canvas, [sw.gold[1] ?? sw.sun, sw.cloud], 248, 268, 20, 20);
  bloom(canvas, sw, 250, 150, 1);
  bloom(canvas, sw, 64, 150, 1);
  canvas.capsule(sw.stem, 250, 186, 250, 236, 7);
  canvas.ellipse(sw.leaf[0] ?? sw.stem, 40, 210, 22, 14, -0.5);
  canvas.rect(sw.ink, 28, 292, 264, 12);
  for (let i = 0; i < 4; i += 1) bloom(canvas, sw, 48 + i * 72, 378, 1);
  const names: Record<Mood, string> = { dawn: "Morning Tea", day: "Lemon Tea", dusk: "Tea at Dusk", night: "Night Tea" };
  return finished("tea", canvas, names[mood], "A cup of tea, a lemon, and a flower.");
}

function monarch(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, ["sky"]);
  bands(canvas, sw.sky, 0, 310, 6);
  bands(canvas, [sw.leaf[1] ?? 1, sw.land[1] ?? 1, sw.land[0] ?? 1, sw.stem], 308, 460, 4);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 60, 40, 0.7);
  const cx = 160 + rf(rng, -4, 4);
  const cy = 180;
  canvas.capsule(sw.ink, cx, cy - 40, cx, cy + 50, 8);
  const cells = [sw.gold[1] ?? sw.sun, sw.roof, sw.gold[0] ?? sw.sun, sw.ink];
  for (let wing = 0; wing < 2; wing += 1) {
    const dir = wing === 0 ? -1 : 1;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const x = cx + dir * (26 + col * 24);
        const y = cy - 48 + row * 26;
        canvas.ellipse(cells[(row + col + wing) % cells.length] ?? sw.sun, x, y, 10, 12, dir * 0.15);
      }
    }
  }
  bed(canvas, sw, 28, 340, 5, 2);
  canvas.ellipse(sw.leaf[0] ?? sw.stem, 40, 300, 24, 14, -0.5);
  canvas.ellipse(sw.leaf[1] ?? sw.stem, 280, 300, 24, 14, 0.5);
  const names: Record<Mood, string> = { dawn: "Monarch at Dawn", day: "Monarch", dusk: "Monarch at Dusk", night: "Night Monarch" };
  return finished("monarch", canvas, names[mood], "A monarch with every wing cell drawn.");
}

function cherryBranch(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood);
  bands(canvas, [sw.sky[3] ?? sw.cloud, sw.sky[2] ?? sw.cloud, sw.pink[0] ?? sw.sky[2] ?? 1, sw.sky[1] ?? 1], 0, 460, 5);
  canvas.capsule(sw.wood[1] ?? sw.ink, 20, 300, 300, 120, 9);
  canvas.capsule(sw.wood[0] ?? sw.ink, 120, 220, 80, 360, 7);
  canvas.capsule(sw.wood[0] ?? sw.ink, 200, 180, 260, 300, 7);
  for (let i = 0; i < 10; i += 1) {
    const x = 36 + (i % 5) * 58 + rf(rng, -3, 3);
    const y = 80 + Math.floor(i / 5) * 70;
    bloom(canvas, sw, x, y, 0.85);
  }
  for (let i = 0; i < 6; i += 1) bloom(canvas, sw, 40 + i * 46, 240 + (i % 2) * 30, 0.7);
  canvas.ellipse(sw.sun, 270, 48, 16, 16);
  const names: Record<Mood, string> = { dawn: "Cherry Morning", day: "Cherry Branch", dusk: "Cherry at Dusk", night: "Night Cherry" };
  return finished("cherry", canvas, names[mood], "A branch of open cherry blossoms.");
}

function peony(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood);
  bands(canvas, [sw.sky[2] ?? 1, sw.sky[3] ?? 1, sw.water[2] ?? 1, sw.sky[1] ?? 1, sw.stone], 0, 460, 5);
  const cx = 160;
  const cy = 200 + rf(rng, -4, 4);
  for (let ring = 0; ring < 4; ring += 1) {
    const count = 10 + ring * 2;
    const dist = 28 + ring * 36;
    for (let i = 0; i < count; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / count + ring * 0.08;
      const color = sw.pink[(i + ring) % 3] ?? sw.sun;
      canvas.ellipse(color, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 11, 16, a + Math.PI / 2);
    }
  }
  shadeDisc(canvas, [sw.gold[0] ?? sw.sun, sw.gold[1] ?? sw.sun], cx, cy, 18, 18);
  for (let i = 0; i < 5; i += 1) {
    canvas.ellipse(sw.leaf[i % 2 ? 1 : 0] ?? sw.stem, 36 + i * 64, 48, 22, 14, -0.5);
    canvas.ellipse(sw.leaf[i % 2 ? 0 : 1] ?? sw.stem, 40 + i * 60, 410, 24, 14, 0.4);
  }
  const names: Record<Mood, string> = { dawn: "Peony Morning", day: "Peony", dusk: "Peony at Dusk", night: "Night Peony" };
  return finished("peony", canvas, names[mood], "A peony filling the page.");
}

function gardenFox(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood);
  const horizon = 160;
  bands(canvas, sw.sky, 0, horizon, 5);
  canvas.ellipse(sw.sun, 60, 44, 18, 18);
  cloud(canvas, sw.cloud, sw.sky[2] ?? sw.cloud, 230, 40, 0.8);
  bands(canvas, [sw.leaf[1] ?? 1, sw.land[1] ?? 1, sw.land[0] ?? 1, sw.stem], horizon - 1, 460, 4);
  tree(canvas, sw, 250, horizon - 20);
  const fx = 120 + rf(rng, -4, 4);
  const fy = 280;
  canvas.ellipse(sw.gold[1] ?? sw.sun, fx, fy, 48, 24);
  canvas.ellipse(sw.roof, fx + 36, fy - 20, 18, 16);
  canvas.poly(sw.gold[0] ?? sw.sun, [[fx + 24, fy - 30], [fx + 18, fy - 48], [fx + 36, fy - 32]]);
  canvas.poly(sw.gold[0] ?? sw.sun, [[fx + 40, fy - 28], [fx + 52, fy - 46], [fx + 48, fy - 24]]);
  canvas.ellipse(sw.ink, fx + 40, fy - 18, 7, 7);
  canvas.ellipse(sw.cloud, fx + 46, fy - 8, 8, 6);
  canvas.ellipse(sw.roof, fx - 40, fy + 6, 22, 14);
  canvas.capsule(sw.gold[1] ?? sw.sun, fx - 10, fy + 16, fx - 16, fy + 48, 7);
  canvas.capsule(sw.gold[1] ?? sw.sun, fx + 12, fy + 16, fx + 16, fy + 48, 7);
  bed(canvas, sw, 16, 348, 6, 2);
  const names: Record<Mood, string> = { dawn: "Fox at Dawn", day: "Garden Fox", dusk: "Fox at Dusk", night: "Night Fox" };
  return finished("fox", canvas, names[mood], "A fox sitting in a tulip bed.");
}

export const TEMPLATES: Array<(rng: Rng, mood: Mood) => Painted> = [
  tulipMeadow,
  flamingoLagoon,
  roseWindow,
  harbor,
  stillSwan,
  gardenRobin,
  sunflower,
  cottageGarden,
  lighthouseCove,
  canalBridge,
  catNap,
  balloonDay,
  snowCabin,
  lemonTea,
  monarch,
  cherryBranch,
  peony,
  gardenFox,
];
