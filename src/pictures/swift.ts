import {
  capsule,
  centroid,
  circlePath,
  diamondPath,
  ellipsePath,
  flowerParts,
  heartPath,
  mirrorX,
  polygon,
  rectPath,
  ringPath,
  roundRectPath,
  smoothClosed,
  starPath,
} from "./geometry.ts";
import { Sheet } from "./sheet.ts";
import type { Picture } from "./types.ts";

const INK = "#4a3f48";

function stage(): Picture {
  const s = new Sheet();
  s.region("backdrop", roundRectPath(86, 78, 148, 168, 8), 5, [160, 156]);

  const drape = (x: number, w: number, y0: number, y1: number, sway: number, id: string, n: number) => {
    const d = `M ${x} ${y0}
      C ${x + w * 0.15} ${y0 + 28}, ${x - sway} ${(y0 + y1) / 2}, ${x + sway * 0.2} ${y1 - 18}
      L ${x + w * 0.15} ${y1}
      C ${x + w * 0.7} ${y1 - 16}, ${x + w + sway} ${(y0 + y1) / 2}, ${x + w} ${y0 + 24}
      L ${x + w} ${y0} Z`;
    const label: [number, number] = [x + w * 0.45, (y0 + y1) / 2];
    s.region(id, d, n, label);
  };
  drape(22, 34, 52, 286, 8, "curtain-l1", 1);
  drape(46, 36, 60, 300, -6, "curtain-l2", 2);
  drape(68, 32, 56, 274, 5, "curtain-l3", 1);
  drape(220, 32, 56, 274, -5, "curtain-r3", 1);
  drape(238, 36, 60, 300, 6, "curtain-r2", 2);
  drape(264, 34, 52, 286, -8, "curtain-r1", 1);

  const scallops: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = 28 + i * 38;
    scallops.push(ellipsePath(x + 16, 58, 22, 16));
  }
  s.region("valance", scallops.join(" "), 2, [160, 52]);

  s.region("beam-l", polygon([[78, 48], [108, 48], [132, 246], [70, 246]]), 6, [96, 150]);
  s.region("beam-c", polygon([[138, 40], [182, 40], [196, 246], [124, 246]]), 7, [160, 140]);
  s.region("beam-r", polygon([[212, 48], [242, 48], [250, 246], [188, 246]]), 6, [224, 150]);

  s.region("plank-1", polygon([[36, 246], [284, 246], [292, 272], [28, 272]]), 3, [160, 258]);
  s.region("plank-2", polygon([[28, 272], [292, 272], [300, 300], [20, 300]]), 4, [160, 286]);
  s.region("lip", polygon([[16, 300], [304, 300], [310, 332], [10, 332]]), 8, [160, 316]);

  s.region("speaker-l", roundRectPath(38, 252, 42, 58, 8), 5, [59, 286]);
  s.region("cone-l", circlePath(59, 282, 12), 7, [59, 282]);
  s.region("speaker-r", roundRectPath(240, 252, 42, 58, 8), 5, [261, 286]);
  s.region("cone-r", circlePath(261, 282, 12), 7, [261, 282]);

  s.region("lamp-l", circlePath(93, 42, 10), 7, [93, 42]);
  s.region("lamp-c", circlePath(160, 34, 11), 2, [160, 34]);
  s.region("lamp-r", circlePath(227, 42, 10), 7, [227, 42]);

  s.region("mic", roundRectPath(148, 168, 24, 36, 12), 2, [160, 186]);
  s.stroke("M 160 204 L 160 300", 2.4);
  s.stroke("M 160 176 L 160 186 M 154 180 L 166 180 M 154 188 L 166 188", 1.6);

  const stars: [number, number, number][] = [
    [48, 118, 0],
    [274, 124, 1],
    [40, 196, 2],
    [286, 188, 3],
    [118, 96, 4],
    [206, 92, 5],
  ];
  for (const [x, y, i] of stars) {
    s.region(`star-${i}`, starPath(x, y, 11, 4.5), i % 2 === 0 ? 2 : 7, [x, y]);
  }
  s.region("pool-l", ellipsePath(110, 258, 28, 8), 6, [110, 258]);
  s.region("pool-r", ellipsePath(214, 258, 28, 8), 6, [214, 258]);

  return s.build({
    id: "swift-stage",
    pack: "swift",
    title: "Concert Lights",
    caption: "Curtains, spotlights, and an empty stage.",
  });
}

function guitar(): Picture {
  const s = new Sheet();
  const lean = "rotate(-4 160 250)";
  const body = smoothClosed(
    [
      [160, 168],
      [124, 178],
      [98, 206],
      [90, 240],
      [102, 262],
      [92, 300],
      [112, 342],
      [146, 366],
      [160, 372],
      [176, 366],
      [210, 342],
      [230, 300],
      [220, 262],
      [232, 240],
      [224, 206],
      [198, 178],
    ],
    0.2,
  );
  s.region("neck", rectPath(146, 78, 28, 108), 3, [160, 120], { transform: lean });
  const head: [number, number][] = [
    [144, 86],
    [138, 48],
    [150, 30],
    [170, 30],
    [182, 48],
    [176, 86],
  ];
  s.region("headstock", polygon(head), 3, centroid(head), { transform: lean });
  s.region("body", body, 1, [128, 250], { transform: lean });
  s.region("pickguard", ellipsePath(196, 308, 34, 48, 0.45), 4, [196, 308], { transform: lean });
  s.region("fretboard", rectPath(149, 74, 22, 130), 6, [160, 130], { transform: lean });
  s.region("rosette", ringPath(160, 274, 34, 20), 8, [160, 246], { evenodd: true, transform: lean });
  s.region("soundhole", circlePath(160, 274, 20), 5, [160, 274], { transform: lean });
  s.region("bridge", roundRectPath(138, 328, 44, 14, 4), 3, [160, 335], { transform: lean });

  const pegs: [number, number][] = [
    [134, 58],
    [132, 42],
    [138, 28],
    [186, 58],
    [188, 42],
    [182, 28],
  ];
  pegs.forEach(([x, y], i) => {
    s.region(`peg-${i}`, circlePath(x, y, 6), 7, [x, y], { transform: lean });
  });

  const sparkles: [number, number][] = [
    [46, 96],
    [78, 54],
    [250, 70],
    [286, 140],
    [40, 210],
    [292, 250],
    [58, 360],
    [270, 390],
  ];
  sparkles.forEach(([x, y], i) => {
    s.region(`spark-${i}`, starPath(x, y, i % 2 ? 10 : 13, i % 2 ? 4 : 5), 2, [x, y]);
  });

  for (let i = 0; i < 6; i++) {
    const x = 152 + i * 3.2;
    s.stroke(`M ${x} 86 L ${x + 1} 332`, 1.3, { transform: lean });
  }
  for (let y = 96; y <= 186; y += 15) {
    s.stroke(`M 150 ${y} L 170 ${y}`, 1.5, { transform: lean });
  }
  s.stroke(circlePath(160, 274, 27), 1.4, { transform: lean });

  return s.build({
    id: "swift-guitar",
    pack: "swift",
    title: "Sparkle Guitar",
    caption: "An acoustic guitar with a little glitter.",
  });
}

function bracelets(): Picture {
  const s = new Sheet();
  const rows = [
    { cy: 108, n: 1, rx: 108, ry: 30 },
    { cy: 188, n: 3, rx: 112, ry: 32 },
    { cy: 268, n: 4, rx: 108, ry: 30 },
    { cy: 348, n: 5, rx: 100, ry: 28 },
  ];
  rows.forEach((row, b) => {
    s.stroke(ellipsePath(160, row.cy, row.rx, row.ry), 3.2, { layer: "under" });
    const count = 13;
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
      const x = 160 + Math.cos(a) * row.rx;
      const y = row.cy + Math.sin(a) * row.ry;
      if (i === 3) {
        s.region(`b${b}-heart`, heartPath(x, y, 13), 6, [x, y + 1]);
      } else if (i === 9) {
        s.region(`b${b}-star`, starPath(x, y, 12, 5), 2, [x, y]);
      } else if (i === 0) {
        s.region(`b${b}-clasp`, roundRectPath(x - 8, y - 10, 16, 20, 4), 7, [x, y]);
      } else {
        s.region(`b${b}-bead-${i}`, circlePath(x, y, 11), row.n, [x, y]);
      }
    }
  });
  return s.build({
    id: "swift-bracelets",
    pack: "swift",
    title: "Bracelets",
    caption: "A stack of beaded friendship bracelets.",
  });
}

function cats(): Picture {
  const s = new Sheet();
  s.region("rug", ellipsePath(160, 412, 126, 22), 4, [160, 412]);

  const cat = (prefix: string, cx: number, side: number) => {
    const headY = 198;
    const bodyY = 300;
    const hr = 46;
    const brx = 50;
    const bry = 72;
    const tailA: [number, number] = [cx + side * 8, bodyY + 8];
    const tailB: [number, number] = [cx + side * 78, bodyY - 6];
    const tailC: [number, number] = [cx + side * 62, bodyY - 78];
    s.region(`${prefix}-tail`, `${capsule(tailA, tailB, 12)} ${capsule(tailB, tailC, 10)}`, 3, tailB);
    const earL: [number, number][] = [
      [cx - 28, headY - 18],
      [cx - 34, headY - 78],
      [cx - 2, headY - 28],
    ];
    const earR: [number, number][] = [
      [cx + 4, headY - 30],
      [cx + 36, headY - 82],
      [cx + 32, headY - 16],
    ];
    s.region(`${prefix}-ear-l`, polygon(earL), 1, [cx - 24, headY - 58]);
    s.region(`${prefix}-ear-r`, polygon(earR), 1, [cx + 26, headY - 60]);
    s.region(
      `${prefix}-inner-l`,
      polygon([
        [cx - 24, headY - 28],
        [cx - 28, headY - 64],
        [cx - 8, headY - 34],
      ]),
      2,
      [cx - 22, headY - 48],
    );
    s.region(
      `${prefix}-inner-r`,
      polygon([
        [cx + 10, headY - 34],
        [cx + 30, headY - 66],
        [cx + 26, headY - 26],
      ]),
      2,
      [cx + 22, headY - 48],
    );
    s.region(`${prefix}-body`, ellipsePath(cx, bodyY, brx, bry), 1, [cx, bodyY + 16]);
    s.region(`${prefix}-head`, circlePath(cx, headY, hr), 1, [cx, headY + 8]);
    s.region(`${prefix}-chest`, ellipsePath(cx, bodyY + 16, 22, 28), 8, [cx, bodyY + 18]);
    s.region(`${prefix}-paw-l`, ellipsePath(cx - 28, bodyY + 58, 18, 12), 1, [cx - 28, bodyY + 58]);
    s.region(`${prefix}-paw-r`, ellipsePath(cx + 28, bodyY + 58, 18, 12), 1, [cx + 28, bodyY + 58]);
    s.region(`${prefix}-nose`, ellipsePath(cx, headY + 16, 6, 4.5), 2, [cx, headY + 16]);
    s.stroke(circlePath(cx - 16, headY - 2, 6), 2.1);
    s.stroke(circlePath(cx + 16, headY - 2, 6), 2.1);
    s.stroke(circlePath(cx - 16, headY - 2, 2.2), 0, { fill: INK });
    s.stroke(circlePath(cx + 16, headY - 2, 2.2), 0, { fill: INK });
    s.stroke(`M ${cx - 8} ${headY + 26} Q ${cx} ${headY + 34} ${cx + 8} ${headY + 26}`, 1.8);
    s.stroke(`M ${cx - 18} ${headY + 30} Q ${cx} ${headY + 38} ${cx + 18} ${headY + 30}`, 1.6);
    s.stroke(`M ${cx - hr + 6} ${headY + 6} H ${cx - hr - 16}`, 1.6);
    s.stroke(`M ${cx - hr + 4} ${headY + 14} H ${cx - hr - 18}`, 1.6);
    s.stroke(`M ${cx + hr - 6} ${headY + 6} H ${cx + hr + 16}`, 1.6);
    s.stroke(`M ${cx + hr - 4} ${headY + 14} H ${cx + hr + 18}`, 1.6);
  };

  cat("l", 102, -1);
  cat("r", 218, 1);

  s.region("bow-l", ellipsePath(84, 242, 13, 8, -0.5), 6, [84, 242]);
  s.region("bow-r", ellipsePath(120, 242, 13, 8, 0.5), 6, [120, 242]);
  s.region("bow-k", circlePath(102, 244, 6), 7, [102, 244]);
  s.region("collar", roundRectPath(196, 236, 44, 14, 7), 5, [218, 243]);
  s.region("bell", circlePath(218, 258, 7), 2, [218, 258]);
  s.region("yarn", circlePath(160, 392, 18), 6, [160, 392]);
  s.stroke("M 148 386 C 156 378, 166 378, 172 388 C 178 398, 168 404, 158 398", 1.7);
  s.stroke("M 146 398 C 132 404, 128 418, 142 420", 1.8);

  return s.build({
    id: "swift-cats",
    pack: "swift",
    title: "Two Cats",
    caption: "A pair of cats keeping each other company.",
  });
}

function snake(): Picture {
  const s = new Sheet();
  const pts: [number, number][] = [];
  const turns = 2.15;
  const steps = 16;
  const phase = -0.9;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = phase + t * turns * Math.PI * 2;
    const rad = 18 + t * 92;
    pts.push([168 + Math.cos(a) * rad, 248 + Math.sin(a) * rad * 0.82]);
  }
  const outerFirst = [...pts].reverse();
  for (let i = 1; i < outerFirst.length; i++) {
    const r = 15 - i * 0.35;
    s.region(`seg-${i}`, capsule(outerFirst[i - 1], outerFirst[i], Math.max(8, r)), i % 2 === 0 ? 1 : 4, [
      (outerFirst[i - 1][0] + outerFirst[i][0]) / 2,
      (outerFirst[i - 1][1] + outerFirst[i][1]) / 2,
    ]);
  }
  const head = outerFirst[0];
  const neck = outerFirst[1];
  s.region("head", circlePath(head[0], head[1], 18), 2, [head[0], head[1]]);
  const dx = head[0] - neck[0];
  const dy = head[1] - neck[1];
  const len = Math.hypot(dx, dy) || 1;
  const tx = dx / len;
  const ty = dy / len;
  s.stroke(
    `M ${head[0] + tx * 14} ${head[1] + ty * 14} l ${tx * 16 - ty * 5} ${ty * 16 + tx * 5} M ${head[0] + tx * 14} ${head[1] + ty * 14} l ${tx * 16 + ty * 5} ${ty * 16 - tx * 5}`,
    1.7,
  );
  const nx = -ty;
  const ny = tx;
  s.stroke(circlePath(head[0] + nx * 6 - tx * 2, head[1] + ny * 6 - ty * 2, 3.2), 1.6);
  s.stroke(circlePath(head[0] + nx * 6 - tx * 2, head[1] + ny * 6 - ty * 2, 1.3), 0, { fill: INK });

  const blooms: [number, number, number, number][] = [
    [58, 72, 16, 1],
    [262, 84, 18, 6],
    [52, 392, 15, 2],
    [270, 378, 16, 7],
    [160, 52, 13, 3],
  ];
  blooms.forEach(([cx, cy, size, n], fi) => {
    const flower = flowerParts(cx, cy, size, size * 0.42, 6);
    flower.petals.forEach((petal, pi) => {
      s.region(`fl-${fi}-p-${pi}`, petal.d, n, pi === 0 ? petal.label : null);
    });
    s.region(`fl-${fi}-c`, flower.center, n === 2 ? 7 : 2, [cx, cy]);
  });
  s.region("leaf-a", ellipsePath(96, 96, 18, 8, -0.8), 3, [96, 96]);
  s.region("leaf-b", ellipsePath(230, 118, 16, 7, 0.7), 3, [230, 118]);
  s.region("leaf-c", ellipsePath(90, 360, 16, 7, 0.5), 3, [90, 360]);
  s.region("leaf-d", ellipsePath(236, 348, 18, 8, -0.4), 3, [236, 348]);

  return s.build({
    id: "swift-snake",
    pack: "swift",
    title: "Garden Snake",
    caption: "A snake resting in the flowers.",
  });
}

function cardigan(): Picture {
  const s = new Sheet();
  const sleeveL: [number, number][] = [
    [118, 168],
    [78, 132],
    [36, 168],
    [24, 292],
    [92, 312],
    [124, 214],
  ];
  const cuffL: [number, number][] = [
    [24, 278],
    [16, 314],
    [90, 332],
    [98, 294],
  ];
  const panelL: [number, number][] = [
    [108, 156],
    [148, 132],
    [148, 348],
    [78, 372],
    [96, 300],
    [120, 210],
  ];
  const collarL: [number, number][] = [
    [108, 150],
    [150, 128],
    [142, 176],
    [112, 186],
  ];
  s.region("shirt", polygon([[146, 168], [174, 168], [182, 360], [138, 360]]), 5, [160, 270]);
  s.region("sleeve-l", polygon(sleeveL), 1, [70, 230]);
  s.region("sleeve-r", polygon(mirrorX(sleeveL)), 1, [250, 230]);
  s.region("panel-l", polygon(panelL), 3, [112, 270]);
  s.region("panel-r", polygon(mirrorX(panelL)), 3, [208, 270]);
  s.region("cuff-l", polygon(cuffL), 8, centroid(cuffL));
  s.region("cuff-r", polygon(mirrorX(cuffL)), 8, centroid(mirrorX(cuffL)));
  s.region("collar-l", polygon(collarL), 2, centroid(collarL));
  s.region("collar-r", polygon(mirrorX(collarL)), 2, centroid(mirrorX(collarL)));
  s.region("pocket-l", roundRectPath(92, 262, 44, 52, 12), 4, [114, 288]);
  s.region("pocket-r", roundRectPath(184, 262, 44, 52, 12), 4, [206, 288]);
  [196, 228, 260].forEach((y, i) => {
    s.region(`button-${i}`, circlePath(160, y, 7), 7, [160, y]);
  });
  s.stroke("M 86 348 Q 116 338 144 346", 1.8);
  s.stroke("M 176 346 Q 204 338 234 348", 1.8);
  s.stroke("M 102 286 H 128 M 102 300 H 126", 1.6);
  s.stroke("M 192 286 H 218 M 194 300 H 218", 1.6);

  return s.build({
    id: "swift-cardigan",
    pack: "swift",
    title: "Cardigan",
    caption: "An oversized cardigan for a quiet day.",
  });
}

function mirrorball(): Picture {
  const s = new Sheet();
  const cx = 160;
  const cy = 230;
  const R = 112;
  s.clip("ball", circlePath(cx, cy, R));
  s.region("shadow", ellipsePath(cx, 398, 74, 14), 8, [cx, 398]);
  s.region("mount", roundRectPath(cx - 18, 28, 36, 12, 4), 3, [cx, 34]);
  s.stroke(`M ${cx} 40 L ${cx} ${cy - R - 8}`, 2.2);
  const cap: [number, number][] = [
    [cx - 24, cy - R + 8],
    [cx + 24, cy - R + 8],
    [cx + 16, cy - R - 14],
    [cx - 16, cy - R - 14],
  ];
  s.region("cap", polygon(cap), 3, [cx, cy - R - 2]);

  const hw = 16;
  const hh = 14;
  let row = 0;
  for (let y = cy - R - 8; y <= cy + R + 8; y += hh) {
    const offset = row % 2 === 0 ? 0 : hw;
    let col = 0;
    for (let x = cx - R - hw; x <= cx + R + hw; x += hw * 2) {
      const px = x + offset;
      const py = y;
      if (Math.hypot(px - cx, py - cy) > R + 10) {
        col++;
        continue;
      }
      const inside = Math.hypot(px - cx, py - cy) < R - 16;
      s.region(
        `f-${row}-${col}`,
        diamondPath(px, py, hw * 0.98, hh * 0.98),
        ((row + col) % 8) + 1,
        inside ? [px, py] : null,
        { clipId: "ball", hintSize: 8 },
      );
      col++;
    }
    row++;
  }
  s.stroke(circlePath(cx, cy, R), 2.6);

  const stars: [number, number][] = [
    [42, 120],
    [278, 132],
    [36, 250],
    [286, 268],
    [70, 360],
    [252, 352],
  ];
  stars.forEach(([x, y], i) => {
    s.region(`star-${i}`, starPath(x, y, 12, 5), 2, [x, y]);
  });

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
