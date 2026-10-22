import {
  circlePath,
  diamondPath,
  ellipsePath,
  heartPath,
  polygon,
  rectPath,
  roundRectPath,
  smoothClosed,
  starPath,
  teardropPath,
} from "./geometry.ts";
import {
  alongEllipse,
  arcPoints,
  bloom,
  bricks,
  fan,
  frame,
  inEllipse,
  inFrame,
  inPoly,
  lattice,
  paisleyField,
  Pen,
  ribbon,
  rosette,
  scalesAlong,
  tone,
  tufts,
} from "./patterns.ts";
import { Sheet } from "./sheet.ts";
import type { Picture } from "./types.ts";

const INK = "#4a3f48";

function stage(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "st");

  for (let x = 64; x <= 256; x += 16) {
    p.add(teardropPath(x, 98, 8, Math.PI), tone(x, 98), [x, 104], 12);
  }

  const drop = (x: number, y0: number) => {
    for (let i = 0; i < 9; i++) {
      const y = y0 + i * 18;
      p.add(teardropPath(x, y, 8.2, Math.PI), 1 + (i % 3), [x, y + 1], 12);
    }
  };
  for (const x of [60, 80, 100]) drop(x, 128);
  for (const x of [220, 240, 260]) drop(x, 128);

  fan(p, 160, 136, Math.PI / 2 - 0.98, Math.PI / 2 + 0.98, [
    [8, 24],
    [24, 40],
    [40, 54],
  ], 5, 3);

  lattice(p, 124, 198, 196, 286, 16, 2, (x, y) => {
    const dx = x - 160;
    const dy = y - 240;
    return dx * dx + dy * dy > 30 * 30;
  });
  rosette(p, 160, 240, 10, 26, 12, 6);
  p.add(circlePath(160, 240, 7), 3, [160, 240], 12);

  const stars: [number, number][] = [
    [128, 176],
    [192, 176],
    [118, 292],
    [160, 300],
    [202, 292],
    [136, 168],
    [184, 188],
  ];
  for (const [x, y] of stars) p.add(starPath(x, y, 5.5, 2.4), tone(x, y, 4), [x, y], 10);

  for (let i = 0; i < 9; i++) {
    const x = 72 + i * 22;
    p.add(circlePath(x, 308, 6.2), 1 + (i % 4), [x, 308], 12);
  }
  bricks(p, 54, 322, 212, 62, 4, 5, 5);

  s.stroke("M 48 300 V 112 Q 48 72 92 72 H 228 Q 272 72 272 112 V 300", 3.2);
  s.stroke(roundRectPath(48, 112, 64, 186, 10), 2.6);
  s.stroke(roundRectPath(208, 112, 64, 186, 10), 2.6);
  s.stroke("M 52 318 H 268", 3);
  s.stroke(circlePath(160, 240, 28), 1.6);

  return s.build({
    id: "swift-stage",
    pack: "swift",
    title: "Concert Lights",
    caption: "Curtains, spotlights, and an empty stage.",
  });
}

function guitar(): Picture {
  const s = new Sheet();
  frame(s);
  const g = new Pen(s, "g");

  const hole = (x: number, y: number) => (x - 160) ** 2 + (y - 268) ** 2 < 30 ** 2;
  const bridge = (x: number, y: number) => Math.abs(x - 160) < 24 && Math.abs(y - 342) < 12;
  const lower = (x: number, y: number) => inEllipse(x, y, 160, 328, 52, 46) && !hole(x, y) && !bridge(x, y);
  const upper = (x: number, y: number) => inEllipse(x, y, 160, 226, 40, 34) && y < 252;

  for (let y = 292; y <= 364; y += 24) {
    for (let x = 118; x <= 202; x += 24) {
      if (!lower(x, y) || x > 168) continue;
      if (Math.hypot(x - 160, y - 268) < 48) continue;
      bloom(g, x, y, 9.5, 3.6, 6, tone(x, y));
    }
  }
  paisleyField(g, 150, 300, 214, 366, 16, 6.4, 4, (x, y) => lower(x, y) && x >= 168);
  paisleyField(g, 128, 198, 196, 252, 15, 5.8, 6, upper);

  rosette(g, 160, 268, 12, 20, 12, 1);
  rosette(g, 160, 268, 20, 28, 16, 2);
  g.add(rectPath(142, 336, 36, 8), 5, [160, 340], 12);
  for (let i = 0; i < 6; i++) g.add(circlePath(146 + i * 5.6, 350, 2.8), 7, [146 + i * 5.6, 350], 7);

  for (let i = 0; i < 6; i++) {
    const y = 122 + i * 10;
    g.add(rectPath(150, y, 20, 7), 1 + (i % 4), [160, y + 3.5], 10);
  }
  for (const y of [127, 147, 167]) g.add(diamondPath(160, y, 3.2, 3.6), 8, [160, y], 7);

  const peg = (x: number, y: number, n: number) => g.add(circlePath(x, y, 5.6), n, [x, y], 11);
  peg(128, 84, 2);
  peg(128, 98, 3);
  peg(128, 112, 4);
  peg(192, 84, 5);
  peg(192, 98, 6);
  peg(192, 112, 7);

  alongEllipse(160, 330, 66, 56, 22, (x, y, i) => {
    if (y < 300) return;
    if (inEllipse(x, y, 160, 328, 60, 54)) return;
    g.add(circlePath(x, y, 3.6), 4 + (i % 3), [x, y], 8);
  });

  const stray = (x: number, y: number) => {
    if (!inFrame(x, y, 8)) return false;
    if (inEllipse(x, y, 160, 226, 72, 64)) return false;
    if (inEllipse(x, y, 160, 324, 98, 84)) return false;
    if (x > 118 && x < 202 && y < 196) return false;
    return true;
  };
  for (let y = 86; y <= 370; y += 36) {
    for (let x = 56; x <= 264; x += 36) {
      if (!stray(x, y)) continue;
      if ((x + y) % 72 < 36) g.add(starPath(x, y, 5.2, 2.2), tone(x, y, 2), [x, y], 10);
      else bloom(g, x, y, 8, 3.2, 5, tone(x, y, 1));
    }
  }

  s.stroke(
    smoothClosed(
      [
        [160, 186],
        [190, 198],
        [208, 224],
        [198, 250],
        [184, 264],
        [202, 286],
        [226, 312],
        [224, 342],
        [198, 368],
        [160, 378],
        [122, 368],
        [96, 342],
        [94, 312],
        [118, 286],
        [136, 264],
        [122, 250],
        [112, 224],
        [130, 198],
      ],
      0.28,
    ),
    3.2,
  );
  s.stroke(roundRectPath(146, 114, 28, 74, 6), 2.4);
  s.stroke(roundRectPath(138, 74, 44, 44, 10), 2.6);
  s.stroke(circlePath(160, 268, 29), 2);
  s.stroke(circlePath(160, 268, 8), 1, { fill: INK });
  for (let i = 0; i < 6; i++) s.stroke(`M ${151 + i * 3.6} 80 V 348`, 0.75);
  for (let i = 0; i < 7; i++) s.stroke(`M 148 ${120 + i * 10} H 172`, 1.15);

  return s.build({
    id: "swift-guitar",
    pack: "swift",
    title: "Sparkle Guitar",
    caption: "An acoustic guitar with a little glitter.",
  });
}

function bracelets(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "br");
  const rows = [104, 166, 228, 290, 352];

  rows.forEach((cy, row) => {
    alongEllipse(160, cy, 90, 16, 24, (x, y, i) => {
      const n = 1 + ((row + i) % 6);
      const k = (i + row) % 5;
      if (k === 0) p.add(circlePath(x, y, 6.1), n, [x, y], 12);
      else if (k === 1) p.add(heartPath(x, y, 6.2), n, [x, y + 0.6], 12);
      else if (k === 2) p.add(starPath(x, y, 6.2, 2.6), n, [x, y], 12);
      else if (k === 3) p.add(diamondPath(x, y, 5.2, 6.2), n, [x, y], 12);
      else p.add(teardropPath(x, y, 6, -Math.PI / 2), n, [x, y], 12);
    });
  });

  for (let i = 0; i < rows.length - 1; i++) {
    const y = (rows[i] + rows[i + 1]) / 2;
    for (const x of [62, 258]) p.add(teardropPath(x, y, 5.4, x < 160 ? -0.4 : 2.6), tone(x, y), [x, y], 10);
    bloom(p, 160, y, 7.2, 2.8, 5, tone(160, y, i));
  }

  for (let x = 96; x <= 224; x += 20) {
    p.add(starPath(x, 76, 4.2, 1.8), tone(x, 76), [x, 76], 8);
    p.add(starPath(x, 386, 4.2, 1.8), tone(x, 386, 1), [x, 386], 8);
  }

  rows.forEach((cy) => s.stroke(ellipsePath(160, cy, 90, 16), 2.4));

  return s.build({
    id: "swift-bracelets",
    pack: "swift",
    title: "Bracelets",
    caption: "A stack of beaded friendship bracelets.",
  });
}

function cats(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "cat");

  const near = (x: number, y: number, spots: readonly [number, number, number][]) =>
    spots.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r);

  const leftFace: [number, number, number][] = [
    [116, 178, 9],
    [132, 180, 9],
    [126, 196, 8],
    [112, 192, 7],
    [138, 194, 7],
  ];
  const rightFace: [number, number, number][] = [
    [196, 188, 9],
    [212, 186, 9],
    [202, 206, 8],
    [188, 204, 7],
    [214, 202, 7],
  ];

  tufts(p, 108, 272, 46, 56, 13, 5.1, 2, (x, y) => near(x, y, [[108, 184, 32], [96, 332, 14], [122, 336, 14]]));
  tufts(p, 108, 184, 30, 28, 11, 4.4, 4, (x, y) => near(x, y, leftFace));
  tufts(p, 214, 280, 44, 54, 13, 5.1, 3, (x, y) => near(x, y, [[206, 194, 30], [198, 340, 14], [222, 336, 14]]));
  tufts(p, 206, 194, 29, 27, 11, 4.4, 5, (x, y) => near(x, y, rightFace));

  const ear = (a: [number, number], b: [number, number], c: [number, number], inner: [number, number][], n: number) => {
    const mid: [number, number] = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3 + 4];
    p.add(polygon([a, b, c]), n, mid, 14);
    const im: [number, number] = inner.reduce((acc, pt) => [acc[0] + pt[0], acc[1] + pt[1]], [0, 0]).map((v) => v / inner.length) as [
      number,
      number,
    ];
    p.add(polygon(inner), n + 1, im, 10);
    s.stroke(polygon([a, b, c]), 2.4);
  };
  ear([86, 168], [74, 128], [108, 150], [[88, 160], [82, 140], [102, 154]], 1);
  ear([112, 150], [124, 122], [142, 164], [[118, 150], [124, 136], [136, 158]], 2);
  ear([184, 174], [176, 136], [206, 158], [[188, 166], [184, 148], [200, 160]], 3);
  ear([208, 156], [226, 128], [234, 170], [[214, 158], [224, 142], [228, 164]], 6);

  const eye = (x: number, y: number, n: number) => {
    p.add(ellipsePath(x, y, 6.4, 7.2), n, [x, y + 2], 12);
    s.stroke(circlePath(x, y - 0.4, 2.5), 1, { fill: INK });
  };
  eye(116, 178, 1);
  eye(132, 180, 2);
  eye(196, 188, 3);
  eye(212, 186, 4);
  p.add(heartPath(126, 194, 5.2), 6, [126, 197], 10);
  p.add(heartPath(202, 204, 5), 6, [202, 207], 10);
  p.add(ellipsePath(112, 192, 5.5, 3.6), 5, [112, 192], 8);
  p.add(ellipsePath(138, 194, 5.5, 3.6), 5, [138, 194], 8);
  p.add(ellipsePath(188, 204, 5.2, 3.4), 7, [188, 204], 8);
  p.add(ellipsePath(214, 202, 5.2, 3.4), 7, [214, 202], 8);

  const bow = (x: number, y: number, n: number) => {
    p.add(ellipsePath(x - 7, y, 6.5, 4.2, -0.4), n, [x - 7, y], 10);
    p.add(ellipsePath(x + 7, y, 6.5, 4.2, 0.4), n + 1, [x + 7, y], 10);
    p.add(circlePath(x, y, 3.2), n + 2, [x, y], 8);
  };
  bow(76, 158, 2);
  bow(246, 166, 4);

  const paw = (x: number, y: number, n: number) => {
    p.add(ellipsePath(x, y + 2, 8, 5.5), n, [x, y + 2], 12);
    for (const dx of [-6, 0, 6]) p.add(circlePath(x + dx, y - 5, 3.3), n + 1, [x + dx, y - 5], 7);
  };
  paw(96, 334, 1);
  paw(122, 338, 2);
  paw(198, 342, 3);
  paw(222, 338, 4);

  const leftTail: [number, number][] = [
    [74, 292],
    [56, 318],
    [62, 348],
    [84, 368],
  ];
  const rightTail: [number, number][] = [
    [250, 300],
    [268, 328],
    [258, 356],
    [236, 372],
  ];
  scalesAlong(p, leftTail, 12, 4.6, 6, 2);
  scalesAlong(p, rightTail, 12, 4.6, 7, 2);
  s.stroke(ribbon(leftTail, 10), 2.8);
  s.stroke(ribbon(rightTail, 10), 2.8);

  bloom(p, 160, 108, 12, 4.2, 6, 2);
  bloom(p, 72, 108, 9, 3.4, 5, 4);
  bloom(p, 248, 112, 9, 3.4, 5, 5);
  for (let x = 78; x <= 242; x += 28) {
    if (x > 92 && x < 230) bloom(p, x, 386, 7.5, 2.9, 5, tone(x, 386));
  }

  s.stroke(ellipsePath(108, 272, 50, 62), 3.2);
  s.stroke(circlePath(108, 184, 34), 3.2);
  s.stroke(ellipsePath(214, 280, 48, 58), 3.2);
  s.stroke(circlePath(206, 194, 32), 3.2);
  s.stroke("M 100 186 C 78 184, 70 192, 64 188 M 98 194 C 76 198, 68 206, 60 204", 0.9);
  s.stroke("M 214 196 C 236 192, 246 198, 254 194 M 216 204 C 238 208, 248 214, 256 210", 0.9);
  s.stroke("M 120 202 Q 126 208 132 202", 1.1);
  s.stroke("M 196 212 Q 202 218 208 212", 1.1);

  return s.build({
    id: "swift-cats",
    pack: "swift",
    title: "Two Cats",
    caption: "A pair of cats keeping each other company.",
  });
}

function snake(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "sn");
  const a0 = 0.35;
  const a1 = Math.PI * 1.78;
  const spine = arcPoints(160, 236, 82, a0, a1, 10);
  scalesAlong(p, spine, 13, 5.1, 2, 3);
  s.stroke(ribbon(spine, 13.5), 3.1);

  const end = spine[spine.length - 1];
  const prev = spine[spine.length - 2];
  const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  const hx = end[0] + Math.cos(ang) * 18;
  const hy = end[1] + Math.sin(ang) * 18;
  p.add(ellipsePath(hx, hy, 16, 11, ang), 4, [hx, hy], 16);
  for (let i = 0; i < 5; i++) {
    const a = ang + Math.PI + (i - 2) * 0.42;
    const x = hx + Math.cos(a) * 8;
    const y = hy + Math.sin(a) * 6;
    p.add(teardropPath(x, y, 4.2, a + Math.PI / 2), 5, [x, y], 8);
  }
  const ex = hx + Math.cos(ang + Math.PI / 2) * 4;
  const ey = hy + Math.sin(ang + Math.PI / 2) * 4;
  p.add(circlePath(ex, ey, 3.4), 1, [ex, ey], 8);
  s.stroke(circlePath(ex, ey, 1.6), 1, { fill: INK });
  const tx = hx + Math.cos(ang) * 16;
  const ty = hy + Math.sin(ang) * 16;
  s.stroke(
    `M ${tx} ${ty} L ${tx + Math.cos(ang + 0.3) * 16} ${ty + Math.sin(ang + 0.3) * 16} M ${tx} ${ty} L ${tx + Math.cos(ang - 0.3) * 16} ${ty + Math.sin(ang - 0.3) * 16}`,
    1.3,
  );
  s.stroke(ellipsePath(hx, hy, 16, 11, ang), 3);

  bloom(p, 160, 236, 14, 5, 8, 3);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    bloom(p, 160 + Math.cos(a) * 32, 236 + Math.sin(a) * 32, 9, 3.4, 5, 1 + i);
  }
  const outer: [number, number][] = [
    [72, 108],
    [248, 104],
    [68, 360],
    [252, 364],
    [160, 96],
    [160, 372],
  ];
  for (const [x, y] of outer) bloom(p, x, y, 10, 3.6, 6, tone(x, y));
  paisleyField(p, 52, 120, 268, 360, 28, 6, 6, (x, y) => {
    const d = Math.hypot(x - 160, y - 236);
    if (d < 124) return false;
    return inFrame(x, y, 8);
  });

  return s.build({
    id: "swift-snake",
    pack: "swift",
    title: "Garden Snake",
    caption: "A snake resting in the flowers.",
  });
}

function cardigan(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "cd");

  const leftPanel: [number, number][] = [
    [108, 176],
    [150, 176],
    [150, 366],
    [108, 366],
  ];
  const rightPanel = leftPanel.map(([x, y]) => [320 - x, y] as [number, number]);
  const leftSleeve: [number, number][] = [
    [108, 176],
    [144, 198],
    [82, 258],
    [54, 250],
    [50, 228],
    [98, 168],
  ];
  const rightSleeve = leftSleeve.map(([x, y]) => [320 - x, y] as [number, number]);
  const pocket = (x: number, y: number) => x > 114 && x < 144 && y > 268 && y < 314;
  const pocketR = (x: number, y: number) => x > 176 && x < 206 && y > 268 && y < 314;

  lattice(p, 114, 188, 144, 354, 15, 2, (x, y) => inPoly(x, y, leftPanel) && !pocket(x, y));
  lattice(p, 176, 188, 206, 354, 15, 3, (x, y) => inPoly(x, y, rightPanel) && !pocketR(x, y));
  lattice(p, 56, 176, 140, 256, 14, 4, (x, y) => inPoly(x, y, leftSleeve) && x > 64);
  lattice(p, 180, 176, 264, 256, 14, 5, (x, y) => inPoly(x, y, rightSleeve) && x < 256);
  lattice(p, 118, 276, 140, 306, 12, 6, (x, y) => pocket(x, y));
  lattice(p, 180, 276, 202, 306, 12, 7, (x, y) => pocketR(x, y));

  for (let i = 0; i < 4; i++) {
    p.add(rectPath(50, 226 + i * 7, 20, 5.2), 1 + (i % 3), [60, 228.6 + i * 7], 8);
    p.add(rectPath(250, 226 + i * 7, 20, 5.2), 1 + (i % 3), [260, 228.6 + i * 7], 8);
  }
  for (let i = 0; i < 6; i++) {
    p.add(rectPath(110 + i * 6.4, 366, 5, 16), 8, [112.5 + i * 6.4, 374], 10);
    p.add(rectPath(172 + i * 6.4, 366, 5, 16), 1, [174.5 + i * 6.4, 374], 10);
  }
  for (let i = 0; i < 5; i++) p.add(circlePath(160, 206 + i * 32, 6.2), 2 + (i % 3), [160, 206 + i * 32], 12);

  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x = 118 + t * 84;
    const y = 168 - Math.sin(t * Math.PI) * 22;
    p.add(teardropPath(x, y, 7, Math.PI), 6 + (i % 2), [x, y], 12);
  }

  for (const [x, y] of [
    [74, 108],
    [122, 92],
    [198, 92],
    [246, 108],
  ] as [number, number][]) {
    bloom(p, x, y, 9, 3.4, 5, tone(x, y));
  }

  s.stroke(polygon(leftPanel), 3.2);
  s.stroke(polygon(rightPanel), 3.2);
  s.stroke(polygon(leftSleeve), 3.2);
  s.stroke(polygon(rightSleeve), 3.2);
  s.stroke("M 114 176 C 124 142, 196 142, 206 176", 2.8);
  s.stroke(roundRectPath(114, 270, 30, 42, 6), 2);
  s.stroke(roundRectPath(176, 270, 30, 42, 6), 2);

  return s.build({
    id: "swift-cardigan",
    pack: "swift",
    title: "Cardigan",
    caption: "An oversized cardigan for a quiet day.",
  });
}

function mirrorball(): Picture {
  const s = new Sheet();
  frame(s);
  const p = new Pen(s, "mb");
  const cx = 160;
  const cy = 228;
  const step = 11;
  const hw = 5.15;
  for (let y = cy - 78; y <= cy + 78; y += step) {
    for (let x = cx - 78; x <= cx + 78; x += step) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > 76 ** 2) continue;
      p.add(diamondPath(x, y, hw, hw), tone(x, y), [x, y], 10);
    }
  }
  rosette(p, cx, cy, 84, 98, 28, 1);
  for (let i = 0; i < 6; i++) {
    const y = 78 + i * 10;
    p.add(circlePath(160, y, 4.6), 1 + (i % 4), [160, y], 9);
  }
  p.add(polygon([[152, 132], [168, 132], [164, 144], [156, 144]]), 6, [160, 138], 12);

  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + 0.2;
    const r = 116 + (i % 2) * 18;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (!inFrame(x, y, 5)) continue;
    if (i % 3 === 0) bloom(p, x, y, 7.5, 2.8, 5, tone(x, y));
    else p.add(starPath(x, y, 5.4, 2.2), tone(x, y, 2), [x, y], 10);
  }

  s.stroke(circlePath(cx, cy, 100), 3.3);
  s.stroke(`M 160 74 V 132`, 1.6);
  for (const dy of [-48, -18, 14, 44]) {
    const y = cy + dy;
    const half = Math.sqrt(Math.max(0, 96 ** 2 - dy ** 2));
    s.stroke(`M ${cx - half} ${y} H ${cx + half}`, 0.9);
  }

  return s.build({
    id: "swift-mirrorball",
    pack: "swift",
    title: "Mirrorball",
    caption: "A hanging ball of tiny mirrors.",
  });
}

export function swiftPictures(): Picture[] {
  return [stage(), guitar(), bracelets(), cats(), snake(), cardigan(), mirrorball()];
}
