import {
  capsule,
  circlePath,
  diamondPath,
  ellipsePath,
  flamePath,
  polygon,
  rectPath,
  roundRectPath,
  smoothClosed,
  starPath,
  teardropPath,
} from "./geometry.ts";
import {
  bloom,
  bricks,
  cloud,
  fan,
  frame,
  inEllipse,
  inFrame,
  inPoly,
  lattice,
  paisleyField,
  Pen,
  rosette,
  scallops,
  teardropRing,
  tone,
} from "./patterns.ts";
import { Sheet } from "./sheet.ts";
import type { Picture } from "./types.ts";

function mirror(pts: readonly [number, number][]): [number, number][] {
  return pts.map(([x, y]) => [320 - x, y]);
}

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function truck(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "tr");

  fan(p, 84, 112, -0.4, 1.35, [
    [12, 24],
    [24, 36],
  ], 7, 4);
  p.add(circlePath(84, 112, 10), 2, [84, 112], 16);
  cloud(p, 200, 104, 22, 1);
  cloud(p, 250, 124, 16, 3);

  const body: [number, number][] = [
    [48, 268],
    [48, 210],
    [142, 210],
    [146, 164],
    [198, 158],
    [220, 178],
    [256, 198],
    [272, 214],
    [272, 268],
  ];
  bricks(p, 56, 218, 80, 42, 4, 3, 5);
  lattice(p, 154, 206, 208, 258, 13, 3, (x, y) => x > 152 && x < 210 && y > 204 && y < 262 && !(x > 158 && x < 204 && y < 198));
  const panes: [number, number, number, number][] = [
    [152, 170, 24, 16],
    [178, 168, 26, 16],
    [152, 188, 24, 14],
    [178, 186, 26, 14],
  ];
  for (const [x, y, w, h] of panes) p.add(rectPath(x, y, w, h), tone(x, y, 2), [x + w / 2, y + h / 2], 12);
  for (let i = 0; i < 3; i++) p.add(rectPath(228, 220 + i * 10, 28, 6), 6, [242, 223 + i * 10], 10);
  p.add(circlePath(264, 236, 6), 1, [264, 236], 12);
  p.add(rectPath(50, 228, 8, 12), 8, [54, 234], 10);
  p.add(circlePath(206, 176, 4.5), 7, [206, 176], 9);
  p.add(rectPath(186, 236, 10, 4), 4, [191, 238], 8);

  const wheel = (cx: number, cy: number, n: number) => {
    rosette(p, cx, cy, 18, 28, 12, n);
    fan(p, cx, cy, 0, Math.PI * 2, [[6, 16]], 6, n + 2);
    p.add(circlePath(cx, cy, 5.5), n + 4, [cx, cy], 11);
  };
  wheel(96, 294, 1);
  wheel(214, 294, 3);

  bricks(p, 48, 330, 224, 28, 7, 2, 6, 2);
  for (let i = 0; i < 8; i++) p.add(rectPath(58 + i * 26, 344, 14, 5), 8, [65 + i * 26, 346.5], 8);
  for (let x = 56; x <= 260; x += 18) {
    p.add(teardropPath(x, 318, 5.2, -Math.PI / 2), tone(x, 318), [x, 318], 10);
  }
  for (const [x, y] of [
    [64, 372],
    [108, 380],
    [168, 374],
    [214, 382],
    [256, 370],
  ] as [number, number][]) {
    bloom(p, x, y, 8, 3.1, 5, tone(x, y, 1));
  }

  s.stroke(smoothClosed(body, 0.16), 3.3);
  s.stroke(polygon([[150, 168], [196, 164], [210, 190], [150, 196]]), 2.4);
  s.stroke("M 176 168 V 194 M 150 182 H 208", 1.2);
  s.stroke(circlePath(96, 294, 29), 3);
  s.stroke(circlePath(214, 294, 29), 3);
  s.stroke("M 46 330 H 274", 2.2);

  return s.build({
    id: "od-truck",
    pack: "dominion",
    title: "Country Road",
    caption: "A pickup on a long, easy road.",
  });
}

function hatBoots(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "hb");

  const crown: [number, number][] = [
    [134, 158],
    [128, 116],
    [142, 84],
    [160, 74],
    [178, 84],
    [192, 116],
    [186, 158],
  ];
  paisleyField(p, 132, 86, 190, 140, 14, 5.6, 2, (x, y) => inPoly(x, y, crown) && y < 128);
  for (let x = 136; x <= 184; x += 12) p.add(diamondPath(x, 138, 4.6, 5.2), 4, [x, 138], 9);
  teardropRing(p, 160, 166, 96, 12, 22, 5.2, 6);

  const leftBoot: [number, number][] = [
    [150, 228],
    [112, 224],
    [104, 248],
    [100, 308],
    [86, 326],
    [62, 336],
    [66, 352],
    [96, 356],
    [148, 358],
    [158, 344],
    [148, 328],
    [142, 300],
    [148, 246],
  ];
  const rightBoot = mirror(leftBoot);
  lattice(p, 70, 232, 152, 350, 13, 3, (x, y) => inPoly(x, y, leftBoot));
  lattice(p, 168, 232, 252, 350, 13, 5, (x, y) => inPoly(x, y, rightBoot));
  p.add(teardropPath(124, 220, 6, Math.PI), 1, [124, 220], 11);
  p.add(teardropPath(136, 218, 6, Math.PI), 2, [136, 218], 11);
  p.add(teardropPath(184, 218, 6, Math.PI), 1, [184, 218], 11);
  p.add(teardropPath(196, 220, 6, Math.PI), 2, [196, 220], 11);
  p.add(starPath(150, 338, 5.5, 2.4), 8, [150, 338], 10);
  p.add(starPath(170, 338, 5.5, 2.4), 8, [170, 338], 10);

  bloom(p, 78, 118, 11, 4, 6, 2);
  bloom(p, 242, 118, 11, 4, 6, 4);
  bloom(p, 160, 204, 8, 3, 5, 6);
  paisleyField(p, 50, 90, 112, 200, 18, 5.4, 7, (x, y) => inFrame(x, y, 4) && x < 118 && !inPoly(x, y, crown));
  paisleyField(p, 208, 90, 270, 200, 18, 5.4, 1, (x, y) => inFrame(x, y, 4) && x > 202);

  s.stroke(smoothClosed(crown, 0.2), 3.2);
  s.stroke(ellipsePath(160, 166, 108, 18), 3.2);
  s.stroke("M 136 138 H 184", 2);
  s.stroke("M 148 86 C 154 104, 166 104, 172 86", 1.5);
  s.stroke(smoothClosed(leftBoot, 0.16), 3.2);
  s.stroke(smoothClosed(rightBoot, 0.16), 3.2);

  return s.build({
    id: "od-hat",
    pack: "dominion",
    title: "Hat & Boots",
    caption: "A hat waiting beside a pair of boots.",
  });
}

function instruments(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "in");

  rosette(p, 112, 214, 8, 22, 10, 1);
  rosette(p, 112, 214, 22, 36, 14, 2);
  rosette(p, 112, 214, 36, 50, 18, 3);
  p.add(circlePath(112, 214, 6), 8, [112, 214], 12);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    p.add(circlePath(112 + Math.cos(a) * 54, 214 + Math.sin(a) * 54, 3.4), 4 + (i % 2), [112 + Math.cos(a) * 54, 214 + Math.sin(a) * 54], 7);
  }
  for (let i = 0; i < 6; i++) p.add(rectPath(104, 96 + i * 14, 16, 10), 1 + (i % 4), [112, 101 + i * 14], 10);
  for (const [x, y] of [
    [96, 78],
    [128, 78],
    [92, 92],
    [132, 92],
  ] as [number, number][]) {
    p.add(circlePath(x, y, 4.8), tone(x, y), [x, y], 10);
  }
  p.add(rectPath(100, 168, 24, 5), 6, [112, 170.5], 8);

  const inBody = (x: number, y: number) =>
    inEllipse(x, y, 214, 304, 40, 52) && (x - 214) ** 2 + (y - 300) ** 2 > 22 ** 2;
  for (let y = 268; y <= 348; y += 26) {
    for (let x = 184; x <= 246; x += 26) {
      if (inBody(x, y)) bloom(p, x, y, 9, 3.4, 5, tone(x, y));
    }
  }
  rosette(p, 214, 300, 8, 18, 12, 5);
  for (let i = 0; i < 6; i++) p.add(rectPath(206, 132 + i * 14, 16, 10), 2 + (i % 3), [214, 137 + i * 14], 10);
  for (const y of [146, 174, 202]) p.add(diamondPath(214, y, 3.4, 4), 8, [214, y], 8);
  for (const [x, y] of [
    [188, 112],
    [214, 104],
    [240, 112],
    [184, 126],
    [244, 126],
  ] as [number, number][]) {
    p.add(circlePath(x, y, 4.6), tone(x, y, 2), [x, y], 9);
  }
  p.add(rectPath(202, 332, 24, 6), 7, [214, 335], 10);

  paisleyField(p, 48, 80, 272, 380, 22, 6, 4, (x, y) => {
    if (!inFrame(x, y, 6)) return false;
    if ((x - 112) ** 2 + (y - 214) ** 2 < 68 ** 2) return false;
    if (inEllipse(x, y, 214, 304, 58, 74)) return false;
    if (x > 96 && x < 136 && y < 214 && y > 70) return false;
    if (x > 196 && x < 236 && y < 250 && y > 96) return false;
    return true;
  });

  s.stroke(circlePath(112, 214, 58), 3.3);
  s.stroke(roundRectPath(102, 86, 20, 128, 6), 2.6);
  s.stroke(roundRectPath(88, 70, 48, 28, 8), 2.4);
  s.stroke(
    smoothClosed(
      [
        [214, 236],
        [246, 252],
        [258, 292],
        [246, 334],
        [214, 356],
        [182, 334],
        [170, 292],
        [182, 252],
      ],
      0.26,
    ),
    3.3,
  );
  s.stroke(roundRectPath(204, 124, 20, 116, 6), 2.6);
  s.stroke(roundRectPath(180, 96, 68, 36, 10), 2.4);
  s.stroke(circlePath(214, 300, 19), 2);
  for (let i = 0; i < 4; i++) s.stroke(`M ${106 + i * 4} 78 V 214`, 0.7);
  for (let i = 0; i < 6; i++) s.stroke(`M ${205 + i * 3.2} 108 V 332`, 0.7);

  return s.build({
    id: "od-instruments",
    pack: "dominion",
    title: "Porch Pair",
    caption: "A banjo and a guitar leaning together.",
  });
}

function tower(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "tw");

  fan(p, 262, 102, Math.PI * 0.55, Math.PI * 1.45, [
    [10, 22],
    [22, 34],
  ], 6, 4);
  p.add(circlePath(262, 102, 8), 2, [262, 102], 14);
  cloud(p, 78, 108, 18, 1);
  cloud(p, 124, 92, 12, 5);

  const roof: [number, number][] = [
    [160, 118],
    [236, 162],
    [84, 162],
  ];
  for (let i = 0; i < 8; i++) {
    const u0 = i / 8;
    const u1 = (i + 1) / 8;
    const a = lerp([84, 162], [236, 162], u0);
    const b = lerp([84, 162], [236, 162], u1);
    const mid: [number, number] = [(160 + a[0] + b[0]) / 3, (118 + a[1] + b[1]) / 3];
    p.add(polygon([[160, 122], b, a]), 1 + (i % 4), mid, 16);
  }
  bricks(p, 96, 166, 128, 52, 6, 3, 3, 3.2);
  p.add(roundRectPath(146, 176, 28, 30, 4), 6, [160, 194], 16);
  p.add(circlePath(160, 188, 5), 1, [160, 188], 10);

  const tops: [number, number][] = [
    [108, 218],
    [142, 218],
    [178, 218],
    [212, 218],
  ];
  const feet: [number, number][] = [
    [72, 368],
    [128, 364],
    [192, 364],
    [248, 368],
  ];
  tops.forEach((top, i) => {
    const foot = feet[i];
    for (let k = 0; k < 4; k++) {
      const a = lerp(top, foot, k / 4);
      const b = lerp(top, foot, (k + 1) / 4);
      p.add(capsule(a, b, 6.5), 2 + (k % 3), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], 14);
    }
  });
  for (let i = 0; i < 3; i++) {
    const y0 = 250 + i * 36;
    const y1 = y0 + 28;
    for (let leg = 0; leg < 3; leg++) {
      const a: [number, number] = lerp(tops[leg], feet[leg], (y0 - 218) / (368 - 218));
      const b: [number, number] = lerp(tops[leg + 1], feet[leg + 1], (y1 - 218) / (368 - 218));
      const c: [number, number] = lerp(tops[leg], feet[leg], (y1 - 218) / (368 - 218));
      const d: [number, number] = lerp(tops[leg + 1], feet[leg + 1], (y0 - 218) / (368 - 218));
      p.add(capsule(a, b, 3.6), 6, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], 12);
      p.add(capsule(c, d, 3.6), 7, [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2], 12);
    }
  }
  for (let i = 0; i < 8; i++) {
    const y = 236 + i * 16;
    p.add(capsule([152, y], [168, y], 3.2), 5, [160, y], 10);
  }
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 96 + col * (128 / 6);
      const y = 166 + row * (52 / 3);
      if (Math.hypot(x - 160, y - 190) < 16) continue;
      p.add(circlePath(x, y, 3.4), 8, [x, y], 7);
    }
  }

  scallops(p, 378, 52, 268, 12, 2, 20);
  for (let x = 58; x <= 262; x += 16) p.add(teardropPath(x, 366, 5, -Math.PI / 2), tone(x, 366), [x, 366], 9);

  s.stroke(ellipsePath(160, 162, 78, 16), 2.6);
  s.stroke(ellipsePath(160, 214, 78, 14), 2.6);
  s.stroke("M 82 162 V 214 M 238 162 V 214", 3);
  s.stroke(polygon(roof), 3);
  s.stroke(roundRectPath(146, 176, 28, 30, 4), 1.8);

  return s.build({
    id: "od-tower",
    pack: "dominion",
    title: "Water Tower",
    caption: "A small-town tower against a sunset.",
  });
}

function bonfire(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "bf");

  const bulbs: [number, number][] = [];
  let wire = "";
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const x = 58 + t * 204;
    const y = 108 + Math.sin(t * Math.PI) * 46;
    bulbs.push([x, y]);
    wire += `${i === 0 ? "M" : "L"} ${x} ${y - 9} `;
    p.add(diamondPath(x, y - 10, 3.2, 4), 4, [x, y - 10], 8);
    p.add(circlePath(x, y, 6.2), 1 + (i % 5), [x, y], 12);
  }
  s.stroke(wire, 1.5);

  for (let y = 172; y <= 228; y += 18) {
    const row = Math.round((y - 172) / 18);
    for (let x = 56 + (row % 2 ? 9 : 0); x <= 264; x += 18) {
      if (!inFrame(x, y, 2)) continue;
      const k = (row + x) % 4;
      if (k === 0) p.add(starPath(x, y, 5, 2.1), tone(x, y), [x, y], 9);
      else if (k === 1) p.add(circlePath(x, y, 4.2), tone(x, y, 1), [x, y], 8);
      else if (k === 2) p.add(diamondPath(x, y, 4.4, 5), tone(x, y, 2), [x, y], 9);
      else p.add(teardropPath(x, y, 4.6, row % 2 ? 0.5 : -0.8), tone(x, y, 3), [x, y], 9);
    }
  }

  const specs: [number, number][] = [
    [160, 48],
    [140, 40],
    [180, 40],
    [122, 34],
    [150, 36],
    [176, 36],
    [198, 34],
    [112, 28],
    [134, 30],
    [160, 32],
    [186, 30],
    [208, 28],
    [108, 24],
    [128, 24],
    [148, 26],
    [172, 26],
    [192, 24],
    [214, 24],
  ];
  for (const [x, h] of specs) {
    const hParam = h * 0.48;
    const cy = 332 - hParam * 0.2;
    p.add(flamePath(x, cy, 10, hParam), tone(x, cy, 2), [x, cy - hParam * 0.25], 12);
  }
  for (let i = 0; i < 10; i++) {
    const x = 118 + (i % 5) * 22;
    const y = 248 + Math.floor(i / 5) * 16;
    p.add(starPath(x, y, 3.6, 1.5), 8, [x, y], 7);
  }

  p.add(capsule([108, 348], [214, 338], 7), 6, [160, 344], 16);
  p.add(capsule([100, 358], [230, 354], 6.5), 7, [165, 356], 16);
  p.add(capsule([124, 364], [206, 360], 5), 5, [164, 362], 14);
  for (const [x, y] of [
    [96, 336],
    [86, 352],
    [236, 334],
    [246, 350],
    [118, 370],
    [210, 372],
  ] as [number, number][]) {
    p.add(ellipsePath(x, y, 8, 5.5, 0.4), tone(x, y), [x, y], 12);
  }
  bricks(p, 70, 376, 180, 16, 8, 2, 3, 1.4);

  return s.build({
    id: "od-bonfire",
    pack: "dominion",
    title: "String Lights",
    caption: "A bonfire under a line of bulbs.",
  });
}

function sail(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "sa");

  cloud(p, 86, 96, 16, 1);
  cloud(p, 230, 88, 18, 3);
  fan(p, 262, 118, Math.PI * 0.7, Math.PI * 1.55, [
    [8, 18],
    [18, 30],
  ], 6, 4);
  p.add(circlePath(262, 118, 7), 2, [262, 118], 12);

  const apex: [number, number] = [164, 132];
  const clew: [number, number] = [236, 236];
  const tack: [number, number] = [164, 236];
  const cut = 0.2;
  const tl = lerp(apex, tack, cut);
  const tr = lerp(apex, clew, cut);
  p.add(polygon([apex, tr, tl]), 1, [(apex[0] + tr[0] + tl[0]) / 3, (apex[1] + tr[1] + tl[1]) / 3], 16);
  sailMesh(p, tl, tr, clew, tack, 4, 3, 2);

  const jibTop: [number, number] = [152, 150];
  const jibL: [number, number] = [78, 230];
  const jibR: [number, number] = [152, 232];
  const jl = lerp(jibTop, jibL, 0.24);
  const jr = lerp(jibTop, jibR, 0.24);
  p.add(polygon([jibTop, jr, jl]), 5, [(jibTop[0] + jr[0] + jl[0]) / 3, (jibTop[1] + jr[1] + jl[1]) / 3], 14);
  sailMesh(p, jl, jr, jibR, jibL, 3, 2, 6);

  for (let i = 0; i < 8; i++) p.add(rectPath(158, 124 + i * 14, 10, 11), 3 + (i % 3), [163, 129.5 + i * 14], 10);
  p.add(polygon([[164, 112], [176, 124], [164, 124]]), 8, [168, 120], 10);
  bricks(p, 96, 252, 128, 32, 6, 3, 4, 1.5);
  for (let i = 0; i < 4; i++) p.add(circlePath(112 + i * 26, 270, 5.5), 1 + i, [112 + i * 26, 270], 11);

  for (const y of [318, 340, 362, 384]) scallops(p, y, 52, 270, 11, y < 350 ? 6 : 7, 18);

  s.stroke(polygon([apex, clew, tack]), 3);
  s.stroke(polygon([jibTop, jibR, jibL]), 3);
  s.stroke(
    smoothClosed(
      [
        [64, 246],
        [256, 246],
        [236, 292],
        [84, 292],
      ],
      0.12,
    ),
    3.3,
  );
  s.stroke("M 160 114 V 248", 2.6);
  s.stroke("M 164 236 H 232", 2.2);

  return s.build({
    id: "od-sail",
    pack: "dominion",
    title: "Lake Boat",
    caption: "A sailboat on still water.",
  });
}

function sailMesh(
  p: Pen,
  tl: [number, number],
  tr: [number, number],
  br: [number, number],
  bl: [number, number],
  rows: number,
  cols: number,
  n: number,
): void {
  for (let r = 0; r < rows; r++) {
    const t0 = r / rows;
    const t1 = (r + 1) / rows;
    const l0 = lerp(tl, bl, t0);
    const r0 = lerp(tr, br, t0);
    const l1 = lerp(tl, bl, t1);
    const r1 = lerp(tr, br, t1);
    const use = Math.max(1, Math.round(cols * (0.55 + (0.45 * (r + 1)) / rows)));
    for (let c = 0; c < use; c++) {
      const u0 = c / use;
      const u1 = (c + 1) / use;
      const q: [number, number][] = [lerp(l0, r0, u0), lerp(l0, r0, u1), lerp(l1, r1, u1), lerp(l1, r1, u0)];
      const cx = q.reduce((sum, pt) => sum + pt[0], 0) / 4;
      const cy = q.reduce((sum, pt) => sum + pt[1], 0) / 4;
      const shrunk = q.map(([x, y]) => [cx + (x - cx) * 0.86, cy + (y - cy) * 0.86] as [number, number]);
      p.add(polygon(shrunk), n + ((r + c) % 4), [cx, cy], 12);
    }
  }
}

export function dominionPictures(): Picture[] {
  return [truck(), hatBoots(), instruments(), tower(), bonfire(), sail()];
}
