export function f(n: number): string {
  const r = Math.round(n * 100) / 100;
  return String(r);
}

export function circlePath(cx: number, cy: number, r: number): string {
  return ellipsePath(cx, cy, r, r);
}

export function ellipsePath(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const deg = (rot * 180) / Math.PI;
  const point = (ang: number): [number, number] => {
    const x = rx * Math.cos(ang);
    const y = ry * Math.sin(ang);
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    return [cx + x * c - y * s, cy + x * s + y * c];
  };
  const [x0, y0] = point(0);
  const [x1, y1] = point(Math.PI);
  return `M ${f(x0)} ${f(y0)} A ${f(rx)} ${f(ry)} ${f(deg)} 1 1 ${f(x1)} ${f(y1)} A ${f(rx)} ${f(ry)} ${f(deg)} 1 1 ${f(x0)} ${f(y0)} Z`;
}

export function ringPath(cx: number, cy: number, rOut: number, rIn: number): string {
  return `${circlePath(cx, cy, rOut)} ${circlePath(cx, cy, rIn)}`;
}

export function rectPath(x: number, y: number, w: number, h: number): string {
  return `M ${f(x)} ${f(y)} H ${f(x + w)} V ${f(y + h)} H ${f(x)} Z`;
}

export function roundRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M ${f(x + rr)} ${f(y)} H ${f(x + w - rr)} A ${f(rr)} ${f(rr)} 0 0 1 ${f(x + w)} ${f(y + rr)} V ${f(y + h - rr)} A ${f(rr)} ${f(rr)} 0 0 1 ${f(x + w - rr)} ${f(y + h)} H ${f(x + rr)} A ${f(rr)} ${f(rr)} 0 0 1 ${f(x)} ${f(y + h - rr)} V ${f(y + rr)} A ${f(rr)} ${f(rr)} 0 0 1 ${f(x + rr)} ${f(y)} Z`;
}

export function polygon(pts: readonly [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${f(p[0])} ${f(p[1])}`).join(" ") + " Z";
}

export function centroid(pts: readonly [number, number][]): [number, number] {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
}

export function mirrorX(pts: readonly [number, number][], width = 320): [number, number][] {
  return pts.map(([x, y]) => [width - x, y]);
}

/** Closed cardinal spline. Tension near 0.22 keeps corners soft. */
export function smoothClosed(pts: readonly [number, number][], tension = 0.22): string {
  const n = pts.length;
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + " Z";
}

export function capsule(a: [number, number], b: [number, number], r: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * r;
  const ny = (dx / len) * r;
  return `M ${f(a[0] + nx)} ${f(a[1] + ny)} A ${f(r)} ${f(r)} 0 0 1 ${f(a[0] - nx)} ${f(a[1] - ny)} L ${f(b[0] - nx)} ${f(b[1] - ny)} A ${f(r)} ${f(r)} 0 0 1 ${f(b[0] + nx)} ${f(b[1] + ny)} Z`;
}

export function starPath(cx: number, cy: number, r: number, inner: number, points = 5): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    d += `${i === 0 ? "M" : "L"} ${f(x)} ${f(y)} `;
  }
  return `${d}Z`;
}

export function heartPath(cx: number, cy: number, s: number): string {
  const y = cy - s * 0.2;
  return `M ${f(cx)} ${f(y + s * 0.35)} C ${f(cx)} ${f(y + s * 0.02)}, ${f(cx - s * 0.58)} ${f(y - s * 0.28)}, ${f(cx - s * 0.55)} ${f(y + s * 0.08)} C ${f(cx - s * 0.55)} ${f(y + s * 0.42)}, ${f(cx)} ${f(y + s * 0.68)}, ${f(cx)} ${f(y + s)} C ${f(cx)} ${f(y + s * 0.68)}, ${f(cx + s * 0.55)} ${f(y + s * 0.42)}, ${f(cx + s * 0.55)} ${f(y + s * 0.08)} C ${f(cx + s * 0.58)} ${f(y - s * 0.28)}, ${f(cx)} ${f(y + s * 0.02)}, ${f(cx)} ${f(y + s * 0.35)} Z`;
}

export function diamondPath(cx: number, cy: number, hw: number, hh: number): string {
  return `M ${f(cx)} ${f(cy - hh)} L ${f(cx + hw)} ${f(cy)} L ${f(cx)} ${f(cy + hh)} L ${f(cx - hw)} ${f(cy)} Z`;
}

export function stadiumVertical(cx: number, top: number, bottom: number, r: number): string {
  const yTop = top + r;
  const yBot = bottom - r;
  return `M ${f(cx - r)} ${f(yTop)} A ${f(r)} ${f(r)} 0 0 0 ${f(cx + r)} ${f(yTop)} L ${f(cx + r)} ${f(yBot)} A ${f(r)} ${f(r)} 0 0 0 ${f(cx - r)} ${f(yBot)} Z`;
}

export function cloudPath(cx: number, cy: number, s: number): string {
  return [
    ellipsePath(cx, cy, s, s * 0.62),
    ellipsePath(cx - s * 0.72, cy + s * 0.12, s * 0.64, s * 0.5),
    ellipsePath(cx + s * 0.74, cy + s * 0.14, s * 0.56, s * 0.44),
    ellipsePath(cx + s * 0.1, cy - s * 0.28, s * 0.48, s * 0.4),
  ].join(" ");
}

export function flowerParts(
  cx: number,
  cy: number,
  petalLen: number,
  petalW: number,
  count: number,
): { petals: { d: string; label: [number, number] }[]; center: string } {
  const petals: { d: string; label: [number, number] }[] = [];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    const px = cx + Math.cos(a) * petalLen * 0.62;
    const py = cy + Math.sin(a) * petalLen * 0.62;
    petals.push({
      d: ellipsePath(px, py, petalLen * 0.58, petalW, a),
      label: [px, py],
    });
  }
  return { petals, center: circlePath(cx, cy, petalW * 0.85) };
}

export function flamePath(cx: number, cy: number, w: number, h: number): string {
  return smoothClosed(
    [
      [cx, cy - h],
      [cx + w * 0.28, cy - h * 0.42],
      [cx + w * 0.46, cy - h * 0.05],
      [cx + w * 0.18, cy + h * 0.22],
      [cx, cy + h * 0.34],
      [cx - w * 0.2, cy + h * 0.18],
      [cx - w * 0.5, cy - h * 0.02],
      [cx - w * 0.26, cy - h * 0.46],
    ],
    0.28,
  );
}

/** A horizontal band with a soft sine along the top and bottom. */
export function waveBand(y0: number, y1: number, amp: number, phase: number): string {
  const steps = 10;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = (320 / steps) * i;
    const y = y0 + Math.sin(i * 0.85 + phase) * amp;
    d += `${i === 0 ? "M" : "L"} ${f(x)} ${f(y)} `;
  }
  for (let i = steps; i >= 0; i--) {
    const x = (320 / steps) * i;
    const y = y1 + Math.sin(i * 0.85 + phase + 0.6) * amp;
    d += `L ${f(x)} ${f(y)} `;
  }
  return `${d}Z`;
}
