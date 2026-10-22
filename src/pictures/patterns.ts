import {
  circlePath,
  diamondPath,
  ellipsePath,
  flowerParts,
  rectPath,
  smoothClosed,
  teardropPath,
  wedgePath,
} from "./geometry.ts";
import { Sheet } from "./sheet.ts";

function norm(n: number): number {
  return ((Math.round(n) - 1) % 8 + 8) % 8 + 1;
}

export function tone(x: number, y: number, salt = 0): number {
  return norm(Math.round(x / 18) + Math.round(y / 21) * 2 + salt);
}

export class Pen {
  private i = 0;
  private readonly prefix: string;
  readonly sheet: Sheet;

  constructor(sheet: Sheet, prefix: string) {
    this.sheet = sheet;
    this.prefix = prefix;
  }

  add(
    d: string,
    n: number,
    at: readonly [number, number],
    size: number,
    opts?: { evenodd?: boolean; clipId?: string },
  ): void {
    const hintSize = size < 12 ? 6 : size < 18 ? 7 : size < 28 ? 9 : 11;
    this.sheet.region(this.prefix + "-" + this.i, d, norm(n), [round(at[0]), round(at[1])], {
      hintSize,
      evenodd: opts?.evenodd,
      clipId: opts?.clipId,
    });
    this.i += 1;
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

export function inFrame(x: number, y: number, pad = 0): boolean {
  if (x < 44 + pad || x > 276 - pad || y < 72 + pad || y > 390 - pad) return false;
  const corners: [number, number][] = [
    [40, 48],
    [280, 48],
    [40, 412],
    [280, 412],
  ];
  for (const [cx, cy] of corners) {
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < (26 + pad) * (26 + pad)) return false;
  }
  return true;
}

export function inPoly(x: number, y: number, poly: readonly [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 0.00001) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Ornate coloring-book frame: corner blooms, edge diamonds, and side beads. */
export function frame(sheet: Sheet): void {
  const p = new Pen(sheet, "bd");
  const corners: [number, number][] = [
    [40, 48],
    [280, 48],
    [40, 412],
    [280, 412],
  ];
  for (const [cx, cy] of corners) {
    const flower = flowerParts(cx, cy, 13, 4.8, 8);
    flower.petals.forEach((petal, i) => {
      p.add(petal.d, i % 2 === 0 ? 1 : 2, petal.label, 11);
    });
    p.add(flower.center, 3, [cx, cy], 9);
  }
  for (const y of [20, 440]) {
    for (let x = 72; x <= 248; x += 16) p.add(diamondPath(x, y, 5.4, 6.3), 4, [x, y], 10);
  }
  for (const x of [16, 304]) {
    for (let y = 80; y <= 384; y += 16) p.add(circlePath(x, y, 4.7), 5, [x, y], 9);
  }
  const hair = (d: string, w = 1.3) => sheet.stroke(d, w);
  hair("M 64 34 H 256");
  hair("M 68 38 H 252", 0.8);
  hair("M 64 426 H 256");
  hair("M 68 422 H 252", 0.8);
  hair("M 30 70 V 390");
  hair("M 34 74 V 386", 0.8);
  hair("M 290 70 V 390");
  hair("M 286 74 V 386", 0.8);
}

export function bloom(
  p: Pen,
  cx: number,
  cy: number,
  len: number,
  wid: number,
  petals: number,
  n = 2,
): void {
  const flower = flowerParts(cx, cy, len, wid, petals);
  flower.petals.forEach((petal, i) => {
    p.add(petal.d, n + (i % 2), petal.label, len);
  });
  p.add(flower.center, n + 2, [cx, cy], wid * 2);
}

export function rosette(p: Pen, cx: number, cy: number, r0: number, r1: number, count: number, n = 1): void {
  for (let i = 0; i < count; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    const a1 = a0 + (2 * Math.PI) / count;
    const am = (a0 + a1) / 2;
    const rm = (r0 + r1) / 2;
    p.add(wedgePath(cx, cy, r0, r1, a0, a1), n + (i % 2), [cx + Math.cos(am) * rm, cy + Math.sin(am) * rm], r1 - r0);
  }
}

export function fan(
  p: Pen,
  cx: number,
  cy: number,
  a0: number,
  a1: number,
  bands: readonly [number, number][],
  slices: number,
  n = 1,
): void {
  for (let s = 0; s < slices; s++) {
    const t0 = a0 + ((a1 - a0) * s) / slices;
    const t1 = a0 + ((a1 - a0) * (s + 1)) / slices;
    const am = (t0 + t1) / 2;
    bands.forEach(([r0, r1], b) => {
      const rm = (r0 + r1) / 2;
      p.add(
        wedgePath(cx, cy, r0, r1, t0, t1),
        n + ((s + b) % 4),
        [cx + Math.cos(am) * rm, cy + Math.sin(am) * rm],
        Math.max(8, r1 - r0),
      );
    });
  }
}

export function lattice(
  p: Pen,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number,
  n: number,
  keep?: (x: number, y: number) => boolean,
): void {
  const hw = step * 0.46;
  const hh = step * 0.5;
  let row = 0;
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      if (!keep || keep(x, y)) p.add(diamondPath(x, y, hw, hh), n + ((row + Math.round(x / step)) % 4), [x, y], step * 0.85);
    }
    row += 1;
  }
}

export function tufts(
  p: Pen,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  step: number,
  size: number,
  n: number,
  reject?: (x: number, y: number) => boolean,
): void {
  let row = 0;
  for (let y = cy - ry; y <= cy + ry; y += step) {
    const ox = row % 2 ? step * 0.5 : 0;
    for (let x = cx - rx; x <= cx + rx; x += step) {
      const px = x + ox;
      if (!inEllipse(px, y, cx, cy, rx, ry)) continue;
      if (reject?.(px, y)) continue;
      const ang = Math.atan2(y - cy, px - cx);
      p.add(teardropPath(px, y, size, ang + Math.PI / 2), n + ((row + Math.round(px)) % 3), [px, y], size * 2);
    }
    row += 1;
  }
}

export function arcPoints(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  step: number,
): [number, number][] {
  const n = Math.max(2, Math.round((Math.abs(a1 - a0) * r) / step));
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function walk(pts: readonly [number, number][], step: number): { x: number; y: number; ang: number }[] {
  const out: { x: number; y: number; ang: number }[] = [];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.001) continue;
    const ang = Math.atan2(dy, dx);
    let dist = step - carry;
    while (dist <= len + 0.001) {
      const t = Math.min(1, dist / len);
      out.push({ x: a[0] + dx * t, y: a[1] + dy * t, ang });
      dist += step;
    }
    carry = Math.max(0, len - (dist - step));
  }
  return out;
}

export function scalesAlong(
  p: Pen,
  pts: readonly [number, number][],
  step: number,
  rad: number,
  n: number,
  rows = 2,
): void {
  const offs = rows === 1 ? [0] : rows === 2 ? [-0.9, 0.9] : [-1.28, 0, 1.28];
  for (const s of walk(pts, step)) {
    const nx = Math.cos(s.ang + Math.PI / 2);
    const ny = Math.sin(s.ang + Math.PI / 2);
    offs.forEach((off, i) => {
      const x = s.x + nx * rad * off;
      const y = s.y + ny * rad * off;
      p.add(ellipsePath(x, y, rad * 1.02, rad * 0.68, s.ang), n + i, [x, y], rad * 2);
    });
  }
}

export function ribbon(pts: readonly [number, number][], half: number): string {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * half;
    const ny = (dx / len) * half;
    left.push([pts[i][0] + nx, pts[i][1] + ny]);
    right.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  right.reverse();
  return smoothClosed([...left, ...right], 0.16);
}

export function scallops(p: Pen, y: number, x0: number, x1: number, r: number, n: number, step?: number): void {
  const dx = step ?? r * 1.65;
  let i = 0;
  for (let x = x0; x <= x1; x += dx) {
    p.add(wedgePath(x, y, 0, r, Math.PI, Math.PI * 2), n + (i % 3), [x, y - r * 0.42], r * 1.4);
    i += 1;
  }
}

export function bricks(
  p: Pen,
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
  n: number,
  gap = 1.3,
): void {
  const ch = (h - gap * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    const shift = r % 2 ? w * 0.04 : 0;
    const cw = (w - shift - gap * (cols - 1)) / cols;
    const yy = y + r * (ch + gap);
    for (let c = 0; c < cols; c++) {
      const xx = x + shift + c * (cw + gap);
      if (xx + cw > x + w + 0.4) continue;
      p.add(rectPath(xx, yy, cw, ch), n + ((r + c) % 5), [xx + cw / 2, yy + ch / 2], Math.min(cw, ch));
    }
  }
}

export function cloud(p: Pen, cx: number, cy: number, s: number, n: number): void {
  p.add(circlePath(cx, cy, s * 0.52), n, [cx, cy], s);
  p.add(circlePath(cx - s * 0.78, cy + s * 0.16, s * 0.38), n + 1, [cx - s * 0.78, cy + s * 0.16], s * 0.7);
  p.add(circlePath(cx + s * 0.74, cy + s * 0.18, s * 0.34), n + 2, [cx + s * 0.74, cy + s * 0.18], s * 0.6);
}

export function alongEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
  fn: (x: number, y: number, i: number, ang: number) => void,
): void {
  for (let i = 0; i < count; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    fn(cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry, i, ang);
  }
}

export function paisleyField(
  p: Pen,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number,
  size: number,
  n: number,
  keep: (x: number, y: number) => boolean,
): void {
  let row = 0;
  for (let y = y0; y <= y1; y += step) {
    const ox = row % 2 ? step * 0.5 : 0;
    let col = 0;
    for (let x = x0 + ox; x <= x1; x += step) {
      if (keep(x, y)) {
        const rot = (row + col) % 2 === 0 ? -0.8 : 0.65;
        p.add(teardropPath(x, y, size, rot), n + ((row + col) % 4), [x, y], size * 1.7);
      }
      col += 1;
    }
    row += 1;
  }
}

export function teardropRing(
  p: Pen,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
  size: number,
  n: number,
): void {
  alongEllipse(cx, cy, rx, ry, count, (x, y, i, ang) => {
    p.add(teardropPath(x, y, size, ang + Math.PI / 2), n + (i % 3), [x, y], size * 1.6);
  });
}
