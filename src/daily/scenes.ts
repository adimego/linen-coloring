/**
 * Eighteen illustrated daily scenes. The calendar picks the scene, so the
 * same composition cannot return within a week. Dawn, day, dusk, and night
 * repaint the palette; the date only jitters placement inside safe ranges.
 *
 * Same-colored shapes stay apart. A later shape only kisses an earlier one,
 * so it does not shave a sliver off the subject.
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

const KITS: Record<Mood, string[]> = {
  day: ["#1e6cac", "#4e9ed4", "#8ec8ee", "#d4eefc", "#1a5c34", "#3e8d52", "#b7d97a", "#0e4e68", "#2b88a3", "#7ec8c8", "#f4b430", "#f4f1ea", "#d2ec8a", "#3f8932", "#143222", "#f6c6d6", "#e45b88", "#a82858", "#f8b8a0", "#e25848", "#9a2830", "#f8e2a4", "#dc9c30", "#1c1618", "#e0b07a", "#8a5434", "#7a2e38", "#d9d0c6", "#8d8680"],
  night: ["#161136", "#2b3962", "#546888", "#c6c1d6", "#10280b", "#2a5640", "#9bb888", "#073235", "#1d5760", "#7aa8a4", "#f4e4b9", "#e2e0ee", "#cfe6a4", "#6ea868", "#232c25", "#f0b8cc", "#d06088", "#8a3058", "#f0b09a", "#d06058", "#7d2d3a", "#efd69b", "#c89040", "#f9f6ee", "#c89870", "#67432e", "#5a2834", "#b6b1be", "#6a6670"],
  dawn: ["#efa297", "#f3ccbd", "#ffe7ce", "#6ea8d0", "#2a6840", "#5e9b5d", "#c3de8e", "#1a6070", "#3a98a8", "#8ed0cc", "#f5b33d", "#fff8f2", "#dbf09c", "#4a9743", "#183b28", "#f8c4db", "#e46890", "#b03060", "#febca2", "#e47058", "#a83840", "#f8e8af", "#dba54b", "#2c2128", "#e5c38d", "#8a5840", "#8a3844", "#e6e2de", "#a89890"],
  dusk: ["#6a3058", "#c45a58", "#f79d78", "#fdd5bb", "#1e5038", "#3b7452", "#b0cc78", "#143848", "#2a6878", "#6aa8a8", "#f6c878", "#f8efe6", "#c8e090", "#4d8c46", "#0f2c1b", "#f4bfd1", "#d85078", "#90284a", "#f4b098", "#d04840", "#8c2829", "#f5e3a1", "#d09838", "#291821", "#d9ab78", "#7a4830", "#6c2430", "#e2d9cf", "#9a9088"],
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
  coral: number[];
  gold: number[];
  ink: number;
  wood: number[];
  roof: number;
  stone: number[];
};

const GROUP = [
  "sky", "sky", "sky", "sky",
  "land", "land", "land",
  "water", "water", "water",
  "sun", "cloud",
  "leaf", "leaf",
  "stem",
  "pink", "pink", "pink",
  "coral", "coral", "coral",
  "gold", "gold",
  "ink",
  "wood", "wood",
  "roof",
  "stone", "stone",
];

function kit(canvas: Canvas, mood: Mood, focal: ReadonlySet<string>): Sw {
  const hex = KITS[mood];
  const marks = new Set(focal);
  marks.add("pink");
  marks.add("coral");
  marks.add("gold");
  const id: number[] = [];
  GROUP.forEach((group, index) => {
    id.push(canvas.add(hex[index] ?? "#888888", marks.has(group)));
  });
  const take = (start: number, count: number) => id.slice(start, start + count);
  return {
    sky: take(0, 4),
    land: take(4, 3),
    water: take(7, 3),
    sun: id[10] ?? 1,
    cloud: id[11] ?? 1,
    leaf: take(12, 2),
    stem: id[14] ?? 1,
    pink: take(15, 3),
    coral: take(18, 3),
    gold: take(21, 2),
    ink: id[23] ?? 1,
    wood: take(24, 2),
    roof: id[26] ?? 1,
    stone: take(27, 2),
  };
}

function rf(rng: Rng, a: number, b: number): number {
  return a + rng() * (b - a);
}

function backdrop(canvas: Canvas, upper: number[], lower: number[], horizon: number): void {
  const skyW = [0.18, 0.22, 0.2, 0.24, 0.16];
  let y = 0;
  for (let i = 0; i < skyW.length; i += 1) {
    const h = horizon * (skyW[i] ?? 0.2);
    canvas.rect(upper[i % upper.length] ?? 1, 0, y, 320, h + 0.8);
    y += h;
  }
  const rest = 460 - horizon;
  const groundW = [0.17, 0.22, 0.2, 0.23, 0.18];
  let gy = horizon - 0.5;
  for (let i = 0; i < groundW.length; i += 1) {
    const h = rest * (groundW[i] ?? 0.2);
    canvas.rect(lower[i % lower.length] ?? 1, 0, gy, 320, h + 0.8);
    gy += h;
  }
}

function cloud(canvas: Canvas, light: number, shade: number, x: number, y: number, s: number): void {
  canvas.ellipse(light, x, y, 26 * s, 14 * s);
  canvas.ellipse(light, x + 18 * s, y + 3 * s, 16 * s, 10 * s);
  canvas.ellipse(light, x - 16 * s, y + 3 * s, 14 * s, 9 * s);
  canvas.ellipse(shade, x + 2 * s, y + 5 * s, 12 * s, 7 * s);
}

function ellipseBands(canvas: Canvas, colors: number[], cx: number, cy: number, rx: number, ry: number): void {
  const count = colors.length;
  for (let index = 0; index < count; index += 1) {
    const y0 = cy - ry + (2 * ry * index) / count;
    const y1 = cy - ry + (2 * ry * (index + 1)) / count;
    const pts: Array<[number, number]> = [];
    const steps = 5;
    for (let step = 0; step <= steps; step += 1) {
      const y = y0 + ((y1 - y0) * step) / steps;
      const ny = (y - cy) / ry;
      const nx = Math.sqrt(Math.max(0, 1 - ny * ny)) * rx;
      pts.push([cx - nx, y]);
    }
    for (let step = steps; step >= 0; step -= 1) {
      const y = y0 + ((y1 - y0) * step) / steps;
      const ny = (y - cy) / ry;
      const nx = Math.sqrt(Math.max(0, 1 - ny * ny)) * rx;
      pts.push([cx + nx, y]);
    }
    canvas.poly(colors[index] ?? colors[0] ?? 1, pts);
  }
}

function blobField(
  canvas: Canvas,
  colors: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cols: number,
  rows: number,
  rng: Rng,
): void {
  const pitchX = (x1 - x0) / cols;
  const pitchY = (y1 - y0) / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const n = colors[(col + row * 2) % colors.length] ?? colors[0] ?? 1;
      const x = x0 + (col + 0.5) * pitchX + rf(rng, -pitchX * 0.18, pitchX * 0.18);
      const y = y0 + (row + 0.5) * pitchY + rf(rng, -pitchY * 0.16, pitchY * 0.16);
      canvas.ellipse(
        n,
        x,
        y,
        Math.max(11, pitchX * rf(rng, 0.22, 0.3)),
        Math.max(10, pitchY * rf(rng, 0.24, 0.34)),
        rf(rng, -0.6, 0.6),
      );
    }
  }
}

function flower(
  canvas: Canvas,
  x: number,
  y: number,
  band: number[],
  tip: number,
  stem: number,
  leafA: number,
  leafB: number,
  scale: number,
): void {
  const stemR = Math.max(8.6, 7.5 * scale);
  canvas.capsule(stem, x, y + 4 * scale, x, y + 30 * scale, stemR);
  canvas.ellipse(leafA, x + 16 * scale, y + 18 * scale, Math.max(9, 8 * scale), Math.max(13, 11 * scale), 0.55);
  canvas.ellipse(leafB, x - 15 * scale, y + 22 * scale, Math.max(9, 7.5 * scale), Math.max(12, 10 * scale), -0.6);
  ellipseBands(canvas, band, x, y, 12 * scale, 15 * scale);
  canvas.ellipse(tip, x, y - 18 * scale, Math.max(8.2, 7 * scale), Math.max(10, 8 * scale));
}

function wedge(canvas: Canvas, n: number, cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): void {
  const pts: Array<[number, number]> = [];
  const steps = 6;
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

function glassRing(canvas: Canvas, pairs: number[][], cx: number, cy: number, r0: number, r1: number, count: number, rot: number): void {
  const mid = (r0 + r1) / 2;
  for (let i = 0; i < count; i += 1) {
    const pair = pairs[i % pairs.length] ?? [1, 1];
    const a0 = rot + (i * Math.PI * 2) / count;
    const a1 = rot + ((i + 1) * Math.PI * 2) / count;
    wedge(canvas, pair[0] ?? 1, cx, cy, r0, mid, a0, a1);
    wedge(canvas, pair[1] ?? 1, cx, cy, mid, r1, a0, a1);
  }
}

function petal(canvas: Canvas, n0: number, n1: number, x: number, y: number, angle: number, len: number): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  canvas.capsule(n0, x, y, x + dx * len, y + dy * len, 9);
  canvas.capsule(n1, x + dx * len * 0.55, y + dy * len * 0.55, x + dx * (len + 16), y + dy * (len + 16), 8.2);
}

function tree(canvas: Canvas, sw: Sw, x: number, y: number, s: number): void {
  canvas.capsule(sw.wood[1] ?? sw.stem, x, y, x, y - 54 * s, Math.max(9, 10 * s));
  ellipseBands(canvas, [sw.leaf[0] ?? 1, sw.leaf[1] ?? 1, sw.land[1] ?? 1], x, y - 78 * s, 28 * s, 32 * s);
  ellipseBands(canvas, [sw.land[2] ?? 1, sw.leaf[0] ?? 1], x + 22 * s, y - 58 * s, 18 * s, 20 * s);
}

function finished(id: string, canvas: Canvas, mood: Mood, titles: Record<Mood, string>, caption: string): Painted {
  return { id, canvas, title: titles[mood], caption };
}

function tulipMeadow(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["pink", "coral", "gold"]));
  const horizon = 168 + rf(rng, -4, 4);
  backdrop(canvas, sw.sky, sw.land, horizon);
  canvas.ellipse(sw.gold[0] ?? sw.sun, rf(rng, 46, 78), rf(rng, 36, 52), 24, 24);
  canvas.ellipse(sw.sun, 62, 44, 14, 14);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 180, 220), rf(rng, 40, 58), rf(rng, 0.9, 1.15));
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 250, 290), rf(rng, 70, 88), 0.75);
  const mx = rf(rng, 236, 268);
  canvas.rect(sw.wood[0] ?? sw.stem, mx - 16, horizon - 78, 32, 84);
  canvas.rect(sw.wood[1] ?? sw.stem, mx - 16, horizon - 40, 32, 22);
  canvas.poly(sw.roof, [[mx - 26, horizon - 74], [mx + 28, horizon - 74], [mx + 1, horizon - 118]]);
  canvas.ellipse(sw.gold[1] ?? sw.sun, mx, horizon - 96, 10, 10);
  const arm = rf(rng, 0.2, 1);
  for (let blade = 0; blade < 4; blade += 1) {
    const angle = arm + (blade * Math.PI) / 2;
    canvas.capsule(sw.roof, mx + Math.cos(angle) * 18, horizon - 96 + Math.sin(angle) * 18, mx + Math.cos(angle) * 48, horizon - 96 + Math.sin(angle) * 48, 8.4);
  }
  const hues: Array<[number[], number]> = [
    [sw.pink.slice(0, 2), sw.pink[2] ?? sw.pink[0] ?? 1],
    [sw.coral.slice(0, 2), sw.coral[2] ?? sw.coral[0] ?? 1],
    [sw.gold, sw.sun],
  ];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const x = 34 + col * 50 + rf(rng, -12, 12) + (row % 2) * 16;
      const y = horizon + 36 + row * 62 + rf(rng, -14, 14);
      if (Math.abs(x - 168) < 36 && Math.abs(y - (horizon + 150)) < 48) continue;
      const hue = hues[(col + row) % hues.length] ?? hues[0] ?? [[1], 1];
      flower(canvas, x, y, hue[0], hue[1], sw.stem, sw.leaf[0] ?? sw.stem, sw.leaf[1] ?? sw.stem, 1);
    }
  }
  canvas.ellipse(sw.pink[1] ?? sw.pink[0] ?? 1, 168, horizon + 150, 34, 40);
  canvas.ellipse(sw.pink[0] ?? 1, 168, horizon + 128, 16, 14);
  blobField(canvas, [sw.stone[0] ?? 1, sw.wood[0] ?? 1, sw.gold[0] ?? 1], 8, 400, 312, 456, 7, 2, rng);
  return finished("tulips", canvas, mood, {
    dawn: "Dawn Tulip Rows",
    day: "Tulip Meadow",
    dusk: "Evening Tulips",
    night: "Moonlit Tulips",
  }, "A windmill over a field of banded tulips.");
}

function flamingoLagoon(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["pink", "coral"]));
  const horizon = 150 + rf(rng, -4, 6);
  backdrop(canvas, sw.sky, sw.water, horizon);
  canvas.ellipse(sw.gold[0] ?? sw.sun, rf(rng, 40, 70), 42, 22, 22);
  canvas.ellipse(sw.sun, 54, 42, 12, 12);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 200, 250), 48, 1);
  blobField(canvas, sw.water, 6, horizon + 8, 314, 452, 6, 8, rng);
  const bx = 168 + rf(rng, -8, 8);
  const by = horizon + 118;
  ellipseBands(canvas, [sw.pink[0] ?? 1, sw.pink[1] ?? 1, sw.pink[2] ?? 1], bx, by, 74, 40);
  const neck = sw.coral[0] ?? sw.pink[0] ?? 1;
  const pts: Array<[number, number]> = [[bx + 30, by - 8], [bx + 58, by - 48], [bx + 24, by - 96], [bx - 8, by - 132]];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i] ?? [0, 0];
    const b = pts[i + 1] ?? a;
    canvas.capsule(neck, a[0], a[1], b[0], b[1], 13);
  }
  const head = pts[3] ?? [bx, by - 130];
  canvas.ellipse(neck, head[0], head[1], 16, 16);
  canvas.capsule(sw.gold[1] ?? sw.sun, head[0] - 8, head[1] + 2, head[0] - 36, head[1] + 8, 8.2);
  canvas.ellipse(sw.ink, head[0] - 28, head[1] + 6, 8, 7);
  canvas.ellipse(sw.ink, head[0] - 4, head[1] - 4, 7.2, 7.2);
  for (let i = 0; i < 7; i += 1) {
    const angle = -0.4 + i * 0.18;
    petal(canvas, i % 2 ? (sw.coral[1] ?? 1) : (sw.coral[2] ?? 1), i % 2 ? (sw.pink[2] ?? 1) : (sw.pink[1] ?? 1), bx + 10, by - 4, angle, 26);
  }
  canvas.capsule(sw.wood[1] ?? sw.ink, bx - 16, by + 28, bx - 22, by + 78, 8.4);
  canvas.capsule(sw.wood[1] ?? sw.ink, bx + 18, by + 30, bx + 12, by + 80, 8.4);
  canvas.ellipse(sw.wood[0] ?? sw.ink, bx - 28, by + 84, 14, 8);
  canvas.ellipse(sw.wood[0] ?? sw.ink, bx + 6, by + 86, 14, 8);
  for (let i = 0; i < 8; i += 1) {
    const x = 28 + (i % 4) * 78 + rf(rng, -8, 8);
    const y = 360 + Math.floor(i / 4) * 40;
    ellipseBands(canvas, [sw.leaf[0] ?? 1, sw.leaf[1] ?? 1], x, y, 16, 12);
    canvas.ellipse(sw.gold[0] ?? sw.sun, x, y - 2, 8, 8);
  }
  for (let i = 0; i < 8; i += 1) {
    const x = 18 + i * 40;
    canvas.capsule(i % 2 ? (sw.leaf[0] ?? 1) : (sw.land[2] ?? 1), x, horizon + 20, x + rf(rng, -4, 4), horizon + 70, 8.2);
  }
  return finished("flamingo", canvas, mood, {
    dawn: "Dawn Lagoon",
    day: "Flamingo Lagoon",
    dusk: "Lagoon at Dusk",
    night: "Night Flamingo",
  }, "One flamingo, an S-shaped neck, and banded water.");
}

function roseWindow(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["pink", "gold", "coral"]));
  backdrop(canvas, sw.stone, sw.stone, 200 + rf(rng, -6, 6));
  const cx = 160;
  const cy = 228 + rf(rng, -6, 6);
  const rot = rf(rng, 0, 0.4);
  const pairs = [sw.pink.slice(0, 2), sw.coral.slice(0, 2), [sw.gold[0] ?? 1, sw.gold[1] ?? 1], [sw.sky[1] ?? 1, sw.sky[2] ?? 1]];
  glassRing(canvas, pairs, cx, cy, 78, 118, 16, rot);
  glassRing(canvas, pairs, cx, cy, 44, 74, 12, rot + 0.2);
  glassRing(canvas, pairs, cx, cy, 18, 40, 8, rot);
  ellipseBands(canvas, [sw.gold[0] ?? 1, sw.sun, sw.gold[1] ?? 1], cx, cy, 16, 16);
  for (let i = 0; i < 6; i += 1) {
    const a0 = rot + (i * Math.PI * 2) / 6;
    const a1 = a0 + Math.PI / 6 - 0.08;
    wedge(canvas, i % 2 ? (sw.stone[0] ?? 1) : (sw.stone[1] ?? 1), cx, cy, 120, 138, a0, a1);
  }
  canvas.poly(sw.wood[1] ?? sw.stone[1] ?? 1, [[70, 120], [250, 120], [230, 70], [90, 70]]);
  canvas.rect(sw.wood[0] ?? 1, 108, 78, 104, 18);
  const corners: Array<[number, number]> = [[46, 48], [274, 48], [46, 412], [274, 412]];
  for (const [x, y] of corners) {
    for (let p = 0; p < 8; p += 1) {
      const angle = rot + (p * Math.PI * 2) / 8;
      const pair = pairs[p % pairs.length] ?? [1, 1];
      petal(canvas, pair[0] ?? 1, pair[1] ?? 1, x, y, angle, 18);
    }
    canvas.ellipse(sw.gold[1] ?? sw.sun, x, y, 10, 10);
  }
  blobField(canvas, [sw.roof, sw.coral[2] ?? 1, sw.pink[2] ?? 1, sw.sky[0] ?? 1], 16, 300, 304, 390, 6, 2, rng);
  return finished("rose-window", canvas, mood, {
    dawn: "Dawn Rose Window",
    day: "Rose Window",
    dusk: "Rose Window at Dusk",
    night: "Night Rose Window",
  }, "A round window with radial tracery, not a grid of panes.");
}

function harbor(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["coral", "wood", "gold"]));
  const horizon = 168 + rf(rng, -6, 6);
  backdrop(canvas, sw.sky, sw.water, horizon);
  canvas.ellipse(sw.gold[0] ?? sw.sun, rf(rng, 230, 270), 48, 22, 22);
  canvas.ellipse(sw.sun, 250, 48, 12, 12);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 40, 80), 46, 1);
  blobField(canvas, [...sw.water, sw.sky[2] ?? sw.water[0] ?? 1], 4, horizon + 16, 316, 456, 6, 7, rng);
  const lx = 62 + rf(rng, -4, 4);
  ellipseBands(canvas, [sw.stone[0] ?? 1, sw.stone[1] ?? 1, sw.cloud], lx, horizon - 20, 22, 78);
  canvas.poly(sw.roof, [[lx - 28, horizon - 92], [lx + 28, horizon - 92], [lx, horizon - 124]]);
  canvas.ellipse(sw.gold[1] ?? sw.sun, lx, horizon - 108, 9, 9);
  canvas.rect(sw.wood[0] ?? 1, lx - 6, horizon + 8, 14, 28);
  const boat = 196 + rf(rng, -10, 10);
  const by = horizon + 78;
  ellipseBands(canvas, [sw.wood[0] ?? 1, sw.wood[1] ?? 1, sw.roof], boat, by, 58, 24);
  canvas.rect(sw.stone[0] ?? 1, boat - 16, by - 46, 32, 28);
  canvas.poly(sw.cloud, [[boat + 8, by - 18], [boat + 8, by - 78], [boat + 48, by - 28]]);
  canvas.capsule(sw.ink, boat + 8, by - 16, boat + 8, by - 86, 8.2);
  canvas.ellipse(sw.coral[1] ?? 1, boat - 8, by - 8, 10, 10);
  ellipseBands(canvas, sw.land, 250, horizon + 150, 70, 48);
  for (let i = 0; i < 5; i += 1) {
    canvas.ellipse(i % 2 ? (sw.ink) : (sw.wood[1] ?? 1), 30 + i * 18, horizon + 24 - i * 6, 12, 8);
  }
  return finished("harbor", canvas, mood, {
    dawn: "Dawn Harbor",
    day: "Quiet Harbor",
    dusk: "Harbor Lights",
    night: "Harbor Night",
  }, "A lighthouse, a boat, and water in wave bands.");
}

function stillSwan(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["stone", "cloud", "gold"]));
  const horizon = 176 + rf(rng, -4, 4);
  backdrop(canvas, sw.sky, sw.water, horizon);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 48, 90), 50, 1.05);
  canvas.ellipse(sw.gold[0] ?? sw.sun, rf(rng, 220, 260), 44, 20, 20);
  const sx = 150 + rf(rng, -8, 8);
  const sy = horizon + 96;
  ellipseBands(canvas, [sw.cloud, sw.stone[0] ?? sw.cloud, sw.stone[1] ?? sw.cloud], sx, sy, 78, 40);
  canvas.capsule(sw.cloud, sx + 40, sy - 6, sx + 78, sy - 78, 14);
  canvas.ellipse(sw.cloud, sx + 86, sy - 96, 16, 14);
  canvas.capsule(sw.gold[1] ?? sw.sun, sx + 92, sy - 94, sx + 118, sy - 90, 8);
  canvas.ellipse(sw.ink, sx + 80, sy - 100, 7.4, 7.4);
  ellipseBands(canvas, [sw.stone[1] ?? 1, sw.ink], sx + 10, sy - 8, 28, 16);
  canvas.ellipse(sw.water[0] ?? 1, sx, sy + 70, 70, 16);
  canvas.ellipse(sw.water[1] ?? 1, sx + 40, sy + 86, 36, 12);
  blobField(canvas, sw.leaf, 10, horizon + 150, 120, 440, 3, 5, rng);
  blobField(canvas, sw.land, 210, horizon + 160, 310, 440, 3, 4, rng);
  for (let i = 0; i < 6; i += 1) {
    canvas.capsule(sw.leaf[1] ?? sw.stem, 16 + i * 18, horizon + 10, 20 + i * 18, horizon + 64, 8.2);
  }
  return finished("swan", canvas, mood, {
    dawn: "Swan at Dawn",
    day: "Still Swan",
    dusk: "Swan at Dusk",
    night: "Moonlit Swan",
  }, "A shaded swan on banded water.");
}

function gardenRobin(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["coral", "wood", "leaf"]));
  const horizon = 250 + rf(rng, -6, 6);
  backdrop(canvas, sw.sky, sw.land, horizon);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 40, 90), 48, 0.9);
  canvas.ellipse(sw.sun, rf(rng, 230, 270), 46, 18, 18);
  canvas.capsule(sw.wood[1] ?? sw.stem, 36, 300, 280, 210, 12);
  canvas.capsule(sw.wood[0] ?? sw.stem, 120, 250, 150, 150, 9);
  for (let i = 0; i < 14; i += 1) {
    const x = 40 + (i % 7) * 38 + rf(rng, -6, 6);
    const y = 120 + Math.floor(i / 7) * 48 + rf(rng, -6, 6);
    ellipseBands(canvas, i % 2 ? sw.leaf : [sw.land[2] ?? 1, sw.leaf[0] ?? 1], x, y, 16, 12);
  }
  for (let i = 0; i < 10; i += 1) {
    const angle = -0.8 + i * 0.35;
    const x = 70 + i * 22;
    petal(canvas, sw.pink[i % 3] ?? 1, sw.coral[i % 3] ?? 1, x, 168 + (i % 3) * 8, angle, 16);
  }
  const bx = 168;
  const by = 236;
  ellipseBands(canvas, [sw.coral[0] ?? 1, sw.coral[1] ?? 1, sw.coral[2] ?? 1], bx, by, 28, 22);
  canvas.ellipse(sw.stone[0] ?? sw.cloud, bx + 30, by - 6, 16, 14);
  canvas.ellipse(sw.gold[1] ?? sw.sun, bx + 46, by - 2, 10, 8);
  canvas.ellipse(sw.ink, bx + 24, by - 10, 7.2, 7.2);
  canvas.capsule(sw.wood[1] ?? sw.ink, bx - 8, by + 16, bx - 20, by + 36, 8);
  blobField(canvas, [sw.pink[1] ?? 1, sw.coral[0] ?? 1, sw.gold[0] ?? 1, sw.leaf[0] ?? 1], 12, horizon + 10, 308, 452, 6, 4, rng);
  return finished("robin", canvas, mood, {
    dawn: "Robin at Dawn",
    day: "Garden Robin",
    dusk: "Robin at Dusk",
    night: "Night Robin",
  }, "A robin on a branch among banded leaves.");
}

function sunflower(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["gold", "coral", "leaf"]));
  const horizon = 300 + rf(rng, -8, 4);
  backdrop(canvas, sw.sky, sw.land, horizon);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 36, 70), 42, 0.85);
  const cx = 160 + rf(rng, -8, 8);
  const cy = 168;
  for (let i = 0; i < 18; i += 1) {
    const angle = rf(rng, -0.05, 0.05) + (i * Math.PI * 2) / 18;
    petal(canvas, i % 2 ? (sw.gold[0] ?? 1) : (sw.gold[1] ?? 1), i % 2 ? (sw.coral[0] ?? 1) : (sw.sun), cx, cy, angle, 46);
  }
  ellipseBands(canvas, [sw.wood[0] ?? 1, sw.roof, sw.ink], cx, cy, 28, 28);
  canvas.capsule(sw.stem, cx, cy + 70, cx, horizon + 40, 12);
  canvas.ellipse(sw.leaf[0] ?? 1, cx + 36, cy + 110, 22, 14, 0.6);
  canvas.ellipse(sw.leaf[1] ?? 1, cx - 40, cy + 130, 20, 13, -0.5);
  blobField(canvas, [sw.gold[0] ?? 1, sw.coral[1] ?? 1, sw.pink[1] ?? 1, sw.leaf[0] ?? 1], 8, horizon - 10, 312, 452, 6, 4, rng);
  return finished("sunflower", canvas, mood, {
    dawn: "Dawn Sunflower",
    day: "Tall Sunflower",
    dusk: "Sunflower at Dusk",
    night: "Moonlit Sunflower",
  }, "A large sunflower with banded petals.");
}

function cottageGarden(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["roof", "pink", "wood"]));
  const horizon = 210 + rf(rng, -6, 6);
  backdrop(canvas, sw.sky, sw.land, horizon);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 40, 80), 46, 0.9);
  canvas.ellipse(sw.sun, rf(rng, 240, 280), 48, 18, 18);
  tree(canvas, sw, 48, horizon + 20, 1);
  tree(canvas, sw, 276, horizon + 10, 0.9);
  const hx = 118;
  const hy = horizon + 24;
  canvas.rect(sw.stone[0] ?? 1, hx, hy - 78, 92, 30);
  canvas.rect(sw.stone[1] ?? 1, hx, hy - 50, 92, 30);
  canvas.rect(sw.wood[0] ?? 1, hx, hy - 22, 92, 24);
  canvas.poly(sw.roof, [[hx - 12, hy - 76], [hx + 104, hy - 76], [hx + 46, hy - 124]]);
  canvas.rect(sw.wood[1] ?? 1, hx + 36, hy - 40, 20, 42);
  canvas.rect(sw.sky[2] ?? 1, hx + 10, hy - 66, 18, 18);
  canvas.rect(sw.gold[0] ?? sw.sun, hx + 64, hy - 66, 18, 18);
  canvas.rect(sw.roof, hx + 8, hy - 108, 16, 12);
  blobField(canvas, [sw.pink[0] ?? 1, sw.pink[1] ?? 1, sw.coral[1] ?? 1, sw.gold[0] ?? 1, sw.leaf[0] ?? 1], 12, horizon + 20, 308, 456, 6, 5, rng);
  canvas.rect(sw.stone[1] ?? 1, 146, horizon + 30, 28, 150);
  return finished("cottage", canvas, mood, {
    dawn: "Cottage at Dawn",
    day: "Cottage Garden",
    dusk: "Cottage at Dusk",
    night: "Cottage Night",
  }, "A banded cottage behind a crowded garden.");
}

function lighthouseCove(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["stone", "gold", "water"]));
  const horizon = 188 + rf(rng, -4, 4);
  backdrop(canvas, sw.sky, sw.water, horizon);
  canvas.ellipse(sw.gold[0] ?? sw.sun, rf(rng, 200, 246), 42, 20, 20);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, 70, 56, 0.8);
  canvas.poly(sw.land[0] ?? 1, [[0, horizon + 20], [150, horizon - 10], [168, 430], [0, 430]]);
  canvas.poly(sw.land[1] ?? 1, [[0, horizon + 80], [120, horizon + 40], [130, 450], [0, 450]]);
  canvas.poly(sw.land[2] ?? 1, [[20, horizon + 130], [100, horizon + 90], [90, 456], [0, 456]]);
  const lx = 78;
  ellipseBands(canvas, [sw.stone[0] ?? 1, sw.cloud, sw.stone[1] ?? 1], lx, horizon - 8, 20, 70);
  canvas.poly(sw.roof, [[lx - 26, horizon - 72], [lx + 26, horizon - 72], [lx, horizon - 104]]);
  canvas.ellipse(sw.gold[1] ?? sw.sun, lx, horizon - 88, 9, 9);
  blobField(canvas, sw.water, 140, horizon + 8, 316, 450, 4, 8, rng);
  ellipseBands(canvas, sw.wood, 230, horizon + 70, 36, 16);
  canvas.poly(sw.cloud, [[214, horizon + 54], [214, horizon + 18], [250, horizon + 48]]);
  blobField(canvas, [sw.stone[0] ?? 1, sw.wood[0] ?? 1, sw.coral[2] ?? 1], 150, 400, 310, 456, 5, 2, rng);
  return finished("lighthouse", canvas, mood, {
    dawn: "Cove at Dawn",
    day: "Lighthouse Cove",
    dusk: "Cove at Dusk",
    night: "Cove at Night",
  }, "A cliff, a banded lighthouse, and a small cove.");
}

function canalBridge(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["stone", "wood", "water"]));
  const horizon = 150 + rf(rng, -4, 4);
  backdrop(canvas, sw.sky, sw.water, horizon);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 36, 70), 40, 0.85);
  canvas.ellipse(sw.sun, rf(rng, 240, 280), 36, 16, 16);
  tree(canvas, sw, 36, horizon + 30, 0.8);
  tree(canvas, sw, 286, horizon + 24, 0.75);
  canvas.rect(sw.stone[0] ?? 1, 70, horizon - 70, 70, 78);
  canvas.rect(sw.wood[0] ?? 1, 78, horizon - 96, 54, 28);
  canvas.poly(sw.roof, [[64, horizon - 66], [148, horizon - 66], [106, horizon - 112]]);
  canvas.rect(sw.stone[1] ?? 1, 186, horizon - 58, 78, 66);
  canvas.poly(sw.roof, [[176, horizon - 54], [274, horizon - 54], [226, horizon - 102]]);
  canvas.rect(sw.sky[2] ?? 1, 96, horizon - 48, 16, 18);
  canvas.rect(sw.gold[0] ?? 1, 210, horizon - 40, 16, 18);
  canvas.rect(sw.gold[1] ?? 1, 234, horizon - 40, 16, 18);
  canvas.poly(sw.stone[0] ?? 1, [[40, horizon + 36], [280, horizon + 36], [250, horizon + 8], [70, horizon + 8]]);
  canvas.poly(sw.stone[1] ?? 1, [[78, horizon + 70], [150, horizon + 8], [168, horizon + 8], [96, horizon + 78]]);
  canvas.poly(sw.wood[1] ?? 1, [[168, horizon + 78], [240, horizon + 8], [258, horizon + 8], [186, horizon + 78]]);
  blobField(canvas, sw.water, 8, horizon + 90, 312, 456, 6, 6, rng);
  return finished("canal", canvas, mood, {
    dawn: "Canal at Dawn",
    day: "Canal Bridge",
    dusk: "Canal at Dusk",
    night: "Canal Night",
  }, "Houses, a stone arch, and banded canal water.");
}

function catNap(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["coral", "wood", "gold"]));
  backdrop(canvas, sw.stone, sw.wood, 230 + rf(rng, -4, 4));
  canvas.rect(sw.sky[0] ?? 1, 36, 36, 248, 150);
  canvas.rect(sw.sky[1] ?? 1, 48, 48, 224, 126);
  canvas.rect(sw.sky[2] ?? 1, 168, 48, 104, 126);
  ellipseBands(canvas, [sw.gold[0] ?? 1, sw.sun], 118, 110, 28, 28);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, 230, 90, 0.7);
  const cx = 168 + rf(rng, -6, 6);
  const cy = 300;
  ellipseBands(canvas, [sw.coral[0] ?? 1, sw.coral[1] ?? 1, sw.wood[0] ?? 1], cx, cy, 70, 42);
  ellipseBands(canvas, [sw.coral[0] ?? 1, sw.coral[2] ?? 1], cx + 62, cy - 28, 28, 26);
  canvas.poly(sw.coral[2] ?? 1, [[cx + 42, cy - 48], [cx + 54, cy - 70], [cx + 66, cy - 46]]);
  canvas.poly(sw.coral[1] ?? 1, [[cx + 70, cy - 46], [cx + 86, cy - 68], [cx + 90, cy - 42]]);
  canvas.ellipse(sw.ink, cx + 54, cy - 30, 7.4, 7.4);
  canvas.ellipse(sw.ink, cx + 74, cy - 28, 7.4, 7.4);
  canvas.ellipse(sw.pink[2] ?? 1, cx + 66, cy - 16, 8, 7);
  canvas.capsule(sw.coral[2] ?? 1, cx - 60, cy - 6, cx - 92, cy - 36, 9);
  ellipseBands(canvas, [sw.pink[0] ?? 1, sw.pink[1] ?? 1, sw.roof], cx, cy + 48, 78, 28);
  blobField(canvas, [sw.leaf[0] ?? 1, sw.leaf[1] ?? 1, sw.land[1] ?? 1], 16, 390, 300, 456, 6, 2, rng);
  return finished("cat", canvas, mood, {
    dawn: "Cat at the Window",
    day: "Cat Nap",
    dusk: "Cat at Dusk",
    night: "Night Cat",
  }, "A banded cat on a cushion, under a window.");
}

function balloonDay(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["pink", "coral", "gold"]));
  const horizon = 300 + rf(rng, -6, 6);
  backdrop(canvas, sw.sky, sw.land, horizon);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 30, 60), 250, 0.8);
  const balloons: Array<[number, number, number, number[]]> = [
    [70, 90, 1.15, sw.pink],
    [160, 70, 1.3, sw.coral],
    [250, 100, 1.05, [sw.gold[0] ?? 1, sw.gold[1] ?? 1, sw.sun]],
    [110, 190, 0.85, [sw.sky[1] ?? 1, sw.sky[2] ?? 1, sw.sky[3] ?? 1]],
    [220, 200, 0.9, [sw.leaf[0] ?? 1, sw.land[2] ?? 1, sw.leaf[1] ?? 1]],
  ];
  for (const [x, y, s, colors] of balloons) {
    const jx = x + rf(rng, -6, 6);
    ellipseBands(canvas, colors, jx, y, 32 * s, 40 * s);
    canvas.capsule(sw.ink, jx, y + 40 * s, 160, horizon + 8, 8);
  }
  canvas.rect(sw.wood[0] ?? 1, 132, horizon - 8, 56, 28);
  canvas.rect(sw.wood[1] ?? 1, 140, horizon + 16, 40, 16);
  blobField(canvas, [sw.pink[1] ?? 1, sw.coral[1] ?? 1, sw.gold[0] ?? 1, sw.leaf[0] ?? 1], 8, horizon + 16, 312, 456, 6, 3, rng);
  return finished("balloons", canvas, mood, {
    dawn: "Balloons at Dawn",
    day: "Five Balloons",
    dusk: "Balloons at Dusk",
    night: "Night Balloons",
  }, "A handful of large banded balloons, not a field of dots.");
}

function snowCabin(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["wood", "gold", "roof"]));
  const horizon = 200 + rf(rng, -6, 6);
  backdrop(canvas, sw.sky, [sw.cloud, sw.stone[0] ?? sw.cloud, sw.sky[3] ?? sw.cloud, sw.stone[1] ?? sw.cloud], horizon);
  canvas.ellipse(sw.gold[0] ?? sw.sun, rf(rng, 40, 70), 48, 16, 16);
  for (const x of [36, 78, 250, 286]) {
    canvas.poly(sw.land[0] ?? sw.stem, [[x - 22, horizon], [x + 22, horizon], [x, horizon - 70]]);
    canvas.poly(sw.land[1] ?? sw.stem, [[x - 16, horizon - 24], [x + 16, horizon - 24], [x, horizon - 86]]);
    canvas.capsule(sw.wood[1] ?? sw.stem, x, horizon, x, horizon + 16, 8.4);
  }
  const hx = 124;
  canvas.rect(sw.wood[0] ?? 1, hx, horizon - 70, 78, 28);
  canvas.rect(sw.wood[1] ?? 1, hx, horizon - 44, 78, 48);
  canvas.poly(sw.roof, [[hx - 14, horizon - 66], [hx + 92, horizon - 66], [hx + 39, horizon - 112]]);
  canvas.rect(sw.cloud, hx - 8, horizon - 78, 94, 16);
  canvas.rect(sw.gold[1] ?? sw.sun, hx + 14, horizon - 40, 16, 16);
  canvas.rect(sw.gold[0] ?? sw.sun, hx + 48, horizon - 40, 16, 16);
  canvas.rect(sw.ink, hx + 30, horizon - 22, 16, 26);
  blobField(canvas, [sw.stone[0] ?? 1, sw.sky[2] ?? 1, sw.cloud, sw.stone[1] ?? 1], 8, horizon + 20, 312, 456, 6, 5, rng);
  return finished("cabin", canvas, mood, {
    dawn: "Cabin at Dawn",
    day: "Snow Cabin",
    dusk: "Cabin at Dusk",
    night: "Cabin Night",
  }, "A cabin, pines, and banded snow.");
}

function lemonTea(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["gold", "coral", "wood"]));
  backdrop(canvas, sw.sky, sw.wood, 168 + rf(rng, -4, 4));
  canvas.rect(sw.stone[0] ?? 1, 0, 250, 320, 70);
  canvas.rect(sw.stone[1] ?? 1, 0, 318, 320, 70);
  canvas.rect(sw.wood[0] ?? 1, 0, 386, 320, 74);
  ellipseBands(canvas, [sw.cloud, sw.stone[0] ?? 1, sw.sky[2] ?? 1], 108, 168, 46, 58);
  canvas.ellipse(sw.ink, 108, 200, 16, 10);
  canvas.capsule(sw.wood[1] ?? 1, 150, 150, 196, 120, 9);
  ellipseBands(canvas, [sw.gold[0] ?? 1, sw.gold[1] ?? 1, sw.sun], 210, 150, 34, 30);
  ellipseBands(canvas, [sw.coral[0] ?? 1, sw.gold[1] ?? 1, sw.coral[2] ?? 1], 86, 300, 28, 26);
  ellipseBands(canvas, [sw.gold[0] ?? 1, sw.sun, sw.gold[1] ?? 1], 150, 310, 26, 24);
  ellipseBands(canvas, [sw.coral[1] ?? 1, sw.gold[0] ?? 1], 214, 292, 22, 20);
  ellipseBands(canvas, [sw.leaf[0] ?? 1, sw.leaf[1] ?? 1], 250, 250, 18, 12);
  blobField(canvas, [sw.pink[0] ?? 1, sw.pink[1] ?? 1, sw.coral[0] ?? 1, sw.leaf[0] ?? 1], 16, 340, 300, 452, 6, 3, rng);
  canvas.ellipse(sw.sky[1] ?? 1, 250, 120, 30, 36);
  canvas.ellipse(sw.cloud, 250, 112, 18, 22);
  return finished("tea", canvas, mood, {
    dawn: "Tea at Dawn",
    day: "Lemon Tea",
    dusk: "Tea at Dusk",
    night: "Tea at Night",
  }, "A pot, a cup, and banded lemons on a table.");
}

function monarch(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["coral", "gold", "ink"]));
  const horizon = 250 + rf(rng, -6, 6);
  backdrop(canvas, sw.sky, sw.land, horizon);
  const cx = 160;
  const cy = 150;
  ellipseBands(canvas, [sw.coral[0] ?? 1, sw.coral[1] ?? 1, sw.gold[0] ?? 1], cx - 70, cy, 62, 78);
  ellipseBands(canvas, [sw.gold[0] ?? 1, sw.coral[0] ?? 1, sw.coral[2] ?? 1], cx + 70, cy, 62, 78);
  ellipseBands(canvas, [sw.coral[2] ?? 1, sw.roof, sw.gold[1] ?? 1], cx - 78, cy + 70, 40, 36);
  ellipseBands(canvas, [sw.gold[1] ?? 1, sw.coral[1] ?? 1, sw.roof], cx + 78, cy + 70, 40, 36);
  blobField(canvas, [sw.ink, sw.gold[1] ?? 1, sw.coral[2] ?? 1, sw.wood[1] ?? 1], cx - 120, cy - 60, cx - 16, cy + 100, 3, 4, rng);
  blobField(canvas, [sw.gold[0] ?? 1, sw.ink, sw.roof, sw.coral[0] ?? 1], cx + 16, cy - 60, cx + 120, cy + 100, 3, 4, rng);
  canvas.capsule(sw.ink, cx, cy - 20, cx, cy + 90, 10);
  canvas.ellipse(sw.ink, cx, cy - 36, 12, 12);
  canvas.capsule(sw.ink, cx - 4, cy - 46, cx - 28, cy - 78, 8);
  canvas.capsule(sw.ink, cx + 4, cy - 46, cx + 28, cy - 78, 8);
  blobField(canvas, [sw.pink[1] ?? 1, sw.leaf[0] ?? 1, sw.gold[0] ?? 1, sw.coral[0] ?? 1], 8, horizon, 312, 456, 6, 4, rng);
  return finished("monarch", canvas, mood, {
    dawn: "Monarch at Dawn",
    day: "Monarch",
    dusk: "Monarch at Dusk",
    night: "Night Monarch",
  }, "A monarch with banded wings over a flower bed.");
}

function cherryBranch(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["pink", "wood", "coral"]));
  const horizon = 300 + rf(rng, -8, 4);
  backdrop(canvas, sw.sky, sw.land, horizon);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 40, 80), 48, 0.9);
  canvas.ellipse(sw.sun, rf(rng, 240, 280), 42, 16, 16);
  canvas.capsule(sw.wood[1] ?? sw.stem, 20, 340, 300, 120, 14);
  canvas.capsule(sw.wood[0] ?? sw.stem, 80, 260, 70, 150, 9);
  canvas.capsule(sw.wood[0] ?? sw.stem, 200, 200, 240, 120, 9);
  for (let i = 0; i < 18; i += 1) {
    const x = 28 + (i % 9) * 32 + rf(rng, -5, 5);
    const y = 130 + Math.floor(i / 9) * 70 + rf(rng, -8, 8);
    ellipseBands(canvas, [sw.pink[0] ?? 1, sw.pink[1] ?? 1], x, y, 14, 12);
    canvas.ellipse(sw.coral[i % 3] ?? sw.pink[2] ?? 1, x, y, 8, 8);
    canvas.ellipse(sw.leaf[i % 2] ?? sw.leaf[0] ?? 1, x + 14, y + 10, 10, 8, 0.5);
  }
  blobField(canvas, [sw.pink[1] ?? 1, sw.pink[2] ?? 1, sw.leaf[0] ?? 1, sw.coral[0] ?? 1], 8, horizon + 6, 312, 456, 6, 3, rng);
  return finished("cherry", canvas, mood, {
    dawn: "Cherry at Dawn",
    day: "Cherry Branch",
    dusk: "Cherry at Dusk",
    night: "Night Cherry",
  }, "A blossoming branch against a banded sky.");
}

function peony(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["pink", "coral", "leaf"]));
  const horizon = 300 + rf(rng, -6, 4);
  backdrop(canvas, sw.sky, sw.land, horizon);
  const cx = 160 + rf(rng, -6, 6);
  const cy = 150;
  for (let ring = 0; ring < 3; ring += 1) {
    const count = 10 + ring * 4;
    const radius = 20 + ring * 28;
    for (let i = 0; i < count; i += 1) {
      const angle = (i * Math.PI * 2) / count + ring * 0.2;
      const pair = [sw.pink, sw.coral, [sw.gold[0] ?? 1, sw.pink[0] ?? 1, sw.coral[0] ?? 1]][i % 3] ?? sw.pink;
      petal(canvas, pair[ring % pair.length] ?? 1, pair[(ring + 1) % pair.length] ?? 1, cx + Math.cos(angle) * radius * 0.3, cy + Math.sin(angle) * radius * 0.25, angle, 20 + ring * 8);
    }
  }
  ellipseBands(canvas, [sw.gold[0] ?? 1, sw.gold[1] ?? 1, sw.coral[2] ?? 1], cx, cy, 18, 16);
  canvas.capsule(sw.stem, cx, cy + 120, cx, horizon + 36, 11);
  canvas.ellipse(sw.leaf[0] ?? 1, cx + 40, cy + 150, 26, 16, 0.7);
  canvas.ellipse(sw.leaf[1] ?? 1, cx - 46, cy + 168, 24, 15, -0.6);
  canvas.ellipse(sw.leaf[0] ?? 1, cx + 10, cy + 190, 20, 12, 0.2);
  blobField(canvas, [sw.leaf[0] ?? 1, sw.leaf[1] ?? 1, sw.land[2] ?? 1, sw.pink[0] ?? 1], 8, horizon, 312, 456, 6, 3, rng);
  return finished("peony", canvas, mood, {
    dawn: "Peony at Dawn",
    day: "Open Peony",
    dusk: "Peony at Dusk",
    night: "Night Peony",
  }, "A peony built from banded petals.");
}

function gardenFox(rng: Rng, mood: Mood): Painted {
  const canvas = new Canvas();
  const sw = kit(canvas, mood, new Set(["coral", "gold", "wood"]));
  const horizon = 220 + rf(rng, -6, 6);
  backdrop(canvas, sw.sky, sw.land, horizon);
  canvas.ellipse(sw.gold[0] ?? sw.sun, rf(rng, 40, 70), 46, 18, 18);
  cloud(canvas, sw.cloud, sw.stone[0] ?? sw.cloud, rf(rng, 220, 270), 50, 0.9);
  const fx = 168;
  const fy = horizon + 70;
  ellipseBands(canvas, [sw.coral[0] ?? 1, sw.coral[1] ?? 1, sw.gold[1] ?? 1], fx, fy, 70, 36);
  ellipseBands(canvas, [sw.coral[0] ?? 1, sw.coral[2] ?? 1, sw.wood[0] ?? 1], fx + 62, fy - 30, 26, 22);
  canvas.poly(sw.coral[2] ?? 1, [[fx + 46, fy - 46], [fx + 58, fy - 72], [fx + 70, fy - 44]]);
  canvas.poly(sw.gold[1] ?? 1, [[fx + 66, fy - 44], [fx + 82, fy - 70], [fx + 86, fy - 40]]);
  canvas.ellipse(sw.ink, fx + 56, fy - 32, 7.2, 7.2);
  canvas.ellipse(sw.ink, fx + 74, fy - 30, 7.2, 7.2);
  canvas.ellipse(sw.wood[1] ?? sw.ink, fx + 68, fy - 16, 8, 7);
  canvas.capsule(sw.coral[1] ?? 1, fx - 62, fy, fx - 110, fy + 20, 12);
  canvas.ellipse(sw.cloud, fx - 112, fy + 18, 14, 10);
  canvas.capsule(sw.wood[1] ?? 1, fx - 20, fy + 28, fx - 24, fy + 70, 8.4);
  canvas.capsule(sw.wood[1] ?? 1, fx + 16, fy + 28, fx + 20, fy + 70, 8.4);
  blobField(canvas, [sw.pink[0] ?? 1, sw.pink[1] ?? 1, sw.leaf[0] ?? 1, sw.gold[0] ?? 1, sw.coral[0] ?? 1], 8, horizon + 80, 312, 456, 6, 4, rng);
  return finished("fox", canvas, mood, {
    dawn: "Fox at Dawn",
    day: "Garden Fox",
    dusk: "Fox at Dusk",
    night: "Night Fox",
  }, "A fox among banded garden flowers.");
}

/** Foreground blossoms and a few sky flowers. Colors are the bloom ramps, which are not the ground. */
function meadow(canvas: Canvas, rng: Rng): void {
  const hues: Array<[number[], number]> = [
    [[16, 17], 18],
    [[19, 20], 21],
    [[22, 23], 11],
  ];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const x = 36 + col * 58 + (row % 2) * 26 + rf(rng, -12, 12);
      const y = 268 + row * 46 + rf(rng, -14, 14);
      const hue = hues[(col + row) % hues.length] ?? hues[0] ?? [[16], 18];
      const flip = (col + row) % 2 === 0;
      flower(canvas, x, y, hue[0], hue[1], flip ? 15 : 26, flip ? 13 : 14, flip ? 14 : 13, 0.92);
      canvas.ellipse(flip ? 28 : 25, x + 20, y + 24, 10, 8.5);
    }
  }
  const accents = [16, 19, 22, 18, 21, 11, 27, 29];
  const placed: Array<[number, number]> = [];
  for (let i = 0; i < 70 && placed.length < 34; i += 1) {
    const x = rf(rng, 20, 300);
    const y = rf(rng, 16, 168);
    if (placed.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 < 34 * 34)) continue;
    placed.push([x, y]);
    canvas.ellipse(accents[placed.length % accents.length] ?? 16, x, y, rf(rng, 10, 13), rf(rng, 9, 12), rf(rng, -0.7, 0.7));
  }
  canvas.ellipse(20, 250, 392, 32, 34);
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const x = 30 + col * 50 + (row % 2) * 18 + rf(rng, -8, 8);
      const y = 154 + row * 24 + rf(rng, -3, 3);
      const a = [16, 19, 22, 13, 25, 28][(col + row * 2) % 6] ?? 16;
      const b = [18, 21, 11, 14, 26, 29][(col + row * 2) % 6] ?? 18;
      canvas.ellipse(a, x, y, 12, 10);
      canvas.ellipse(b, x + 8, y - 2, 8.4, 8.2);
    }
  }
}

function dress(paint: (rng: Rng, mood: Mood) => Painted): (rng: Rng, mood: Mood) => Painted {
  return (rng, mood) => {
    const painted = paint(rng, mood);
    meadow(painted.canvas, rng);
    return painted;
  };
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
].map(dress);
