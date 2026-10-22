/**
 * Hand-tuned scene templates. Each one is a fixed composition: the frame is
 * filled with large shapes, and the seed only shifts palette, time of day,
 * counts, and placement inside ranges that stay above the size floor.
 *
 * Shapes of the same color stay apart. A later shape only kisses an earlier
 * one, so it does not shave a sliver off the focal subject.
 */
import { Canvas } from "./raster.ts";

export type Painted = {
  id: string;
  canvas: Canvas;
  title: string;
  caption: string;
};

type Rng = () => number;
type Mood = "dawn" | "day" | "dusk" | "night";

const MOODS: Mood[] = ["dawn", "day", "dusk", "night"];

export const TEMPLATES: Array<(rng: Rng) => Painted> = [
  tulipMeadow,
  flamingoLagoon,
  petalMandala,
  harbor,
  skyline,
  openBloom,
  roseWindow,
  cottageGarden,
];

function ri(rng: Rng, a: number, b: number): number {
  return a + Math.floor(rng() * (b - a + 1));
}

function rf(rng: Rng, a: number, b: number): number {
  return a + rng() * (b - a);
}

function moodOf(rng: Rng): Mood {
  return MOODS[ri(rng, 0, MOODS.length - 1)] ?? "day";
}

function bands(canvas: Canvas, colors: number[], y0: number, y1: number): void {
  const h = (y1 - y0) / colors.length;
  colors.forEach((n, i) => {
    canvas.rect(n, 0, y0 + i * h, 320, h + 0.6);
  });
}

function cloud(canvas: Canvas, n: number, x: number, y: number, s: number): void {
  canvas.ellipse(n, x, y, 28 * s, 14 * s);
  canvas.ellipse(n, x + 22 * s, y + 3 * s, 18 * s, 11 * s);
  canvas.ellipse(n, x - 18 * s, y + 4 * s, 16 * s, 10 * s);
}

function wedge(canvas: Canvas, n: number, cx: number, cy: number, r: number, a0: number, a1: number): void {
  const pts: Array<[number, number]> = [[cx, cy]];
  const steps = 8;
  for (let i = 0; i <= steps; i += 1) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  canvas.poly(n, pts);
}

function tulipMeadow(rng: Rng): Painted {
  const mood = moodOf(rng);
  const canvas = new Canvas();
  const sky = mood === "night"
    ? ["#1b304c", "#3d6284", "#7f93a8", "#d5dde8"]
    : mood === "dusk"
      ? ["#e36a4e", "#f3a878", "#f6d2ae", "#8d4d86"]
      : mood === "dawn"
        ? ["#f0b498", "#f8dcc4", "#5aa6d8", "#c96b86"]
        : ["#3e92d4", "#8ec8f0", "#d5ecfb", "#f6e3b4"];
  const s0 = canvas.add(sky[0] ?? "#3e92d4");
  const s1 = canvas.add(sky[1] ?? "#8ec8f0");
  const s2 = canvas.add(sky[2] ?? "#d5ecfb");
  const s3 = canvas.add(sky[3] ?? "#f6e3b4");
  const sunC = canvas.add(mood === "night" ? "#f4e2b0" : "#f0b429");
  const cloudC = canvas.add(mood === "night" ? "#f7f4ee" : "#f7fbff");
  const g0 = canvas.add(mood === "night" ? "#2f7a4e" : "#1f6a38");
  const g1 = canvas.add(mood === "night" ? "#3f8f5c" : "#7cb35a");
  const g2 = canvas.add("#d5e29a");
  const stem = canvas.add(mood === "night" ? "#07160f" : "#143d24");
  const leaf = canvas.add("#b6de74");
  const bloom = canvas.add(mood === "night" ? "#ff7aa2" : "#e2316a", true);
  const petal = canvas.add("#ffd0e0", true);
  const mill = canvas.add("#c4845c");
  const roof = canvas.add("#6b2e28");

  const horizon = 162 + ri(rng, -4, 6);
  bands(canvas, [s0, s1, s2, s3], 0, horizon);
  canvas.ellipse(sunC, rf(rng, 52, 100), rf(rng, 40, 58), rf(rng, 22, 28), rf(rng, 22, 28));
  cloud(canvas, cloudC, rf(rng, 168, 210), rf(rng, 34, 52), rf(rng, 0.85, 1.05));
  cloud(canvas, cloudC, rf(rng, 246, 286), rf(rng, 64, 84), 0.8);
  bands(canvas, [g2, g1, g0, g1], horizon - 1, 460);

  const mx = rf(rng, 246, 274);
  canvas.rect(mill, mx - 14, horizon - 86, 30, 92);
  canvas.poly(roof, [
    [mx - 24, horizon - 80],
    [mx + 26, horizon - 80],
    [mx + 1, horizon - 114],
  ]);
  const arm = rf(rng, 0, Math.PI / 2);
  for (let b = 0; b < 4; b += 1) {
    const a = arm + (b * Math.PI) / 2;
    canvas.capsule(roof, mx + 1, horizon - 84, mx + 1 + Math.cos(a) * 40, horizon - 84 + Math.sin(a) * 40, 8);
  }

  const rows = 4;
  const per = ri(rng, 5, 6);
  for (let row = 0; row < rows; row += 1) {
    const y = 206 + row * 62;
    const stagger = row % 2 === 0 ? 0 : 28;
    for (let i = 0; i < per; i += 1) {
      const span = 268 - stagger;
      const x = 26 + stagger + (per === 1 ? span / 2 : (i * span) / (per - 1));
      canvas.capsule(stem, x, y + 16, x + rf(rng, -4, 4), y + 46, 9);
      canvas.ellipse(leaf, x + 20, y + 34, 11, 20, 0.65);
      canvas.ellipse(bloom, x, y, 18, 24);
      canvas.ellipse(petal, x, y - 32, 10, 12);
    }
  }

  const names: Record<Mood, string> = {
    dawn: "Dawn Tulip Rows",
    day: "Tulip Meadow",
    dusk: "Evening Tulips",
    night: "Moonlit Tulips",
  };
  return { id: "tulips", canvas, title: names[mood], caption: "Rows of tulips, a windmill, and a full sky." };
}

function flamingoLagoon(rng: Rng): Painted {
  const mood = moodOf(rng);
  const canvas = new Canvas();
  const skyHex = mood === "night"
    ? ["#16243e", "#31486e", "#8ea0bc"]
    : mood === "dusk"
      ? ["#e36a4e", "#f4b48a", "#fbe0c4"]
      : ["#3e92d4", "#9ed0f2", "#f8e2b8"];
  const s0 = canvas.add(skyHex[0] ?? "#3e92d4");
  const s1 = canvas.add(skyHex[1] ?? "#9ed0f2");
  const s2 = canvas.add(skyHex[2] ?? "#f8e2b8");
  const sunC = canvas.add(mood === "night" ? "#f6e6bc" : "#f0b429");
  const cloudC = canvas.add("#f7fbff");
  const w0 = canvas.add(mood === "night" ? "#14604c" : "#1f7f88");
  const w1 = canvas.add(mood === "night" ? "#1d6a74" : "#3eb0ae");
  const w2 = canvas.add(mood === "night" ? "#3a8f8a" : "#b7efe0");
  const foam = canvas.add("#9ae06a");
  const reedA = canvas.add("#8fbf4a");
  const reedB = canvas.add("#d2dc6a");
  const body = canvas.add("#ff6b96", true);
  const neck = canvas.add("#ffd0de", true);
  const wing = canvas.add("#c43168", true);
  const beak = canvas.add("#f08a28");
  const leg = canvas.add("#4a241e");

  const horizon = 150 + ri(rng, -6, 6);
  bands(canvas, [s0, s1, s2], 0, horizon);
  canvas.ellipse(sunC, rf(rng, 48, 92), rf(rng, 38, 56), 26, 26);
  cloud(canvas, cloudC, rf(rng, 180, 230), rf(rng, 32, 48), 0.95);
  bands(canvas, [w2, w1, w0, w1, w0], horizon - 1, 460);

  for (let i = 0; i < 6; i += 1) {
    canvas.ellipse(i % 2 ? foam : w2, 18 + i * 50, horizon + 16, 18, 10);
  }

  const bx = rf(rng, 150, 188);
  const by = horizon + rf(rng, 86, 108);
  canvas.ellipse(body, bx, by, 72, 40);
  canvas.ellipse(wing, bx + 28, by - 2, 22, 14, -0.2);
  const head: [number, number] = [bx - 10, by - 128];
  const neckPts: Array<[number, number]> = [
    [bx + 36, by - 6],
    [bx + 62, by - 52],
    [bx + 28, by - 96],
    head,
  ];
  for (let i = 0; i < neckPts.length - 1; i += 1) {
    const a = neckPts[i];
    const b = neckPts[i + 1];
    if (!a || !b) continue;
    canvas.capsule(neck, a[0], a[1], b[0], b[1], 13);
  }
  canvas.ellipse(neck, head[0], head[1], 18, 18);
  canvas.capsule(beak, head[0] - 10, head[1] + 2, head[0] - 40, head[1] + 6, 8);
  canvas.capsule(leg, bx - 16, by + 18, bx - 20, by + 58, 8);
  canvas.capsule(leg, bx + 10, by + 20, bx + 8, by + 60, 8);
  canvas.ellipse(neck, bx - 6, by + 70, 24, 9);

  for (let i = 0; i < 5; i += 1) {
    const x = i < 3 ? 24 + i * 36 : 250 + (i - 3) * 32;
    canvas.capsule(i % 2 ? reedA : reedB, x, horizon + 150, x, horizon + 20, 9);
  }
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const x = 28 + col * 44;
      const y = 318 + row * 34;
      if (Math.hypot(x - bx, y - by) < 86) continue;
      canvas.ellipse(w2, x, y, 13, 11);
      canvas.ellipse((row + col) % 2 ? foam : beak, x, y - 16, 9, 9);
    }
  }

  const names: Record<Mood, string> = {
    dawn: "Lagoon at Dawn",
    day: "Flamingo Lagoon",
    dusk: "Flamingo at Dusk",
    night: "Night Lagoon",
  };
  return { id: "lagoon", canvas, title: names[mood], caption: "A flamingo in a banded lagoon, with reeds and lilies." };
}

function petalMandala(rng: Rng): Painted {
  const mood = moodOf(rng);
  const canvas = new Canvas();
  const ground = mood === "night"
    ? ["#241c3e", "#4a3870", "#c48aaa", "#f0d8c0"]
    : mood === "dusk"
      ? ["#6a3058", "#c45a78", "#f2b4a4", "#f7e0c4"]
      : ["#7ec8ea", "#c96b90", "#f8e2b4", "#7a5cc4"];
  const a = canvas.add(ground[0] ?? "#f7d5e6");
  const b = canvas.add(ground[1] ?? "#c96b90");
  const c = canvas.add(ground[2] ?? "#f8e2b4");
  const d = canvas.add(ground[3] ?? "#cbb6ea");
  const petal = canvas.add("#d72660", true);
  const petalB = canvas.add("#ffd6e4", true);
  const leaf = canvas.add("#1f7a48");
  const leafB = canvas.add("#b6e07a");
  const gold = canvas.add("#f0b429");
  const ink = canvas.add(mood === "night" ? "#120e1c" : "#4a2038");

  const cx = 160 + ri(rng, -6, 6);
  const cy = 230 + ri(rng, -8, 8);
  const gems = 12;
  const groundColors = [a, b, c, d];
  for (let i = 0; i < gems; i += 1) {
    const a0 = -Math.PI / 2 + (i * Math.PI * 2) / gems;
    wedge(canvas, groundColors[i % groundColors.length] ?? a, cx, cy, 540, a0, a1(a0, gems));
  }

  const rings = [
    { r: 52, n: 8, rx: 22, ry: 32, colors: [petal, petalB] },
    { r: 114, n: 12, rx: 15, ry: 24, colors: [leaf, leafB] },
    { r: 146, n: ri(rng, 16, 18), rx: 14, ry: 26, colors: [petalB, gold] },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i += 1) {
      const ang = -Math.PI / 2 + (i * Math.PI * 2) / ring.n;
      const x = cx + Math.cos(ang) * ring.r;
      const y = cy + Math.sin(ang) * ring.r;
      canvas.ellipse(ring.colors[i % ring.colors.length] ?? petal, x, y, ring.rx, ring.ry, ang + Math.PI / 2);
    }
  }
  canvas.ellipse(gold, cx, cy, 32, 32);
  canvas.ellipse(ink, cx, cy, 12, 12);

  for (let i = 0; i < 10; i += 1) {
    const ang = (i * Math.PI * 2) / 10 + 0.16;
    const x = cx + Math.cos(ang) * 186;
    const y = cy + Math.sin(ang) * 186;
    if (x < 28 || x > 292 || y < 28 || y > 432) continue;
    canvas.ellipse(i % 2 ? petal : leaf, x, y, 13, 13);
  }

  const bead = [leaf, petal, gold, petalB];
  let beadIndex = 0;
  for (let x = 24; x <= 296; x += 30) {
    for (const y of [26, 434]) {
      canvas.ellipse(bead[beadIndex % bead.length] ?? leaf, x, y, 12, 12);
      beadIndex += 1;
    }
  }
  for (let y = 64; y <= 396; y += 40) {
    for (const x of [26, 294]) {
      if (Math.hypot(x - cx, y - cy) < 188) continue;
      canvas.ellipse(bead[beadIndex % bead.length] ?? petal, x, y, 12, 12);
      beadIndex += 1;
    }
  }
  // Corner blossoms sit outside the petal rings, so a shifted center cannot drop the count under the floor.
  for (const [x, y] of [[56, 56], [264, 56], [56, 404], [264, 404]] as Array<[number, number]>) {
    canvas.ellipse(beadIndex % 2 ? gold : leaf, x, y, 12, 12);
    beadIndex += 1;
  }

  const names: Record<Mood, string> = {
    dawn: "Dawn Mandala",
    day: "Petal Mandala",
    dusk: "Dusk Mandala",
    night: "Night Mandala",
  };
  return { id: "mandala", canvas, title: names[mood], caption: "A full-frame mandala of petals, leaves, and a gold center." };
}

function a1(a0: number, gems: number): number {
  return a0 + (Math.PI * 2) / gems + 0.04;
}

function harbor(rng: Rng): Painted {
  const mood = moodOf(rng);
  const canvas = new Canvas();
  const skyHex = mood === "night"
    ? ["#15243c", "#3a5278", "#a8bdd4"]
    : mood === "dusk"
      ? ["#d85a48", "#f2a47a", "#f8d4b0"]
      : ["#3e92d4", "#9ed0f2", "#f8e2b8"];
  const s0 = canvas.add(skyHex[0] ?? "#3e92d4");
  const s1 = canvas.add(skyHex[1] ?? "#9ed0f2");
  const s2 = canvas.add(skyHex[2] ?? "#f8e2b8");
  const sunC = canvas.add(mood === "night" ? "#f4e2b0" : "#f0b429");
  const cloudC = canvas.add("#d7e8f8");
  const sea0 = canvas.add(mood === "night" ? "#123840" : "#176e78");
  const sea1 = canvas.add(mood === "night" ? "#1e6470" : "#2f9aa0");
  const sea2 = canvas.add(mood === "night" ? "#3d8880" : "#8fd8cc");
  const hull = canvas.add("#8a342c", true);
  const sail = canvas.add("#fff6ee", true);
  const sailB = canvas.add("#e23b68", true);
  const mast = canvas.add("#3e342e");
  const hut = canvas.add("#f0c49a");
  const hutRoof = canvas.add("#b33b32");
  const rock = canvas.add("#5c6e7c");

  const horizon = 168 + ri(rng, -6, 8);
  bands(canvas, [s0, s1, s2], 0, horizon);
  canvas.ellipse(sunC, rf(rng, 46, 88), rf(rng, 42, 62), 26, 26);
  cloud(canvas, cloudC, rf(rng, 176, 220), rf(rng, 36, 54), 1);
  cloud(canvas, cloudC, rf(rng, 250, 292), rf(rng, 72, 92), 0.75);
  bands(canvas, [sea2, sea1, sea0, sea1], horizon - 1, 460);

  const boatX = rf(rng, 118, 150);
  const boatY = horizon + 56;
  canvas.ellipse(hull, boatX, boatY, 62, 20);
  canvas.capsule(mast, boatX + 4, boatY - 6, boatX + 4, boatY - 132, 8);
  canvas.poly(sail, [
    [boatX - 2, boatY - 122],
    [boatX - 2, boatY - 18],
    [boatX + 96, boatY - 26],
  ]);
  canvas.poly(sailB, [
    [boatX + 10, boatY - 112],
    [boatX + 10, boatY - 22],
    [boatX - 64, boatY - 28],
  ]);
  canvas.rect(sailB, boatX - 2, boatY - 142, 20, 14);
  canvas.ellipse(rock, 262, horizon + 6, 40, 18);
  canvas.rect(hut, 246, horizon - 86, 32, 92);
  canvas.poly(hutRoof, [
    [238, horizon - 80],
    [286, horizon - 80],
    [262, horizon - 118],
  ]);
  canvas.rect(sunC, 254, horizon - 62, 16, 24);

  const dock = horizon + 100;
  const dockRows = 6;
  const dockH = (460 - dock) / dockRows;
  for (let row = 0; row < dockRows; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      canvas.rect((row + col) % 2 ? hut : hull, col * 32, dock + row * dockH, 32.6, dockH + 0.6);
    }
  }

  const names: Record<Mood, string> = {
    dawn: "Harbor Morning",
    day: "Sail Harbor",
    dusk: "Harbor at Dusk",
    night: "Harbor Moon",
  };
  return { id: "harbor", canvas, title: names[mood], caption: "A sailboat in a full harbor, with a light and shore huts." };
}

function skyline(rng: Rng): Painted {
  const mood = moodOf(rng);
  const canvas = new Canvas();
  const skyHex = mood === "night"
    ? ["#14182a", "#2a3c5e", "#8ea2c0"]
    : mood === "dusk"
      ? ["#d85a48", "#f2a47a", "#f8d4b0"]
      : mood === "dawn"
        ? ["#f0b498", "#f8d8c0", "#d5e4f6"]
        : ["#3e92d4", "#9ed0f2", "#f8e2b8"];
  const s0 = canvas.add(skyHex[0] ?? "#3e92d4");
  const s1 = canvas.add(skyHex[1] ?? "#9ed0f2");
  const s2 = canvas.add(skyHex[2] ?? "#f8e2b8");
  const sunC = canvas.add(mood === "night" ? "#f4e2b0" : "#f0b429");
  const cloudC = canvas.add("#f7fbff");
  const tower = canvas.add(mood === "night" ? "#8aa888" : "#314868", true);
  const blockA = canvas.add(mood === "night" ? "#3e5270" : "#607890");
  const blockB = canvas.add(mood === "dusk" ? "#a85068" : "#c46a52");
  const blockC = canvas.add(mood === "night" ? "#6a7c96" : "#9a7048");
  const win = canvas.add(mood === "night" ? "#f6d78a" : "#7ec8f0");
  const street = canvas.add("#6a4632");
  const tree = canvas.add("#1f7a48");
  const shop = canvas.add("#e23b68");
  const kiosk = canvas.add("#3f6f9a");
  const lamp = canvas.add("#ff7a3c");

  bands(canvas, [s0, s1, s2, s0, s1, s2], 0, 408);
  // Three rows of balloons in open sky, clear of the sun and the roofs.
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      canvas.ellipse((row + col) % 2 ? shop : kiosk, 20 + col * 40, 22 + row * 30, 12, 12);
    }
  }
  cloud(canvas, cloudC, 28, 126, 0.55);
  cloud(canvas, cloudC, 156, 122, 0.6);
  canvas.ellipse(sunC, rf(rng, 230, 258), rf(rng, 122, 134), 18, 18);
  canvas.rect(street, 0, 408, 320, 52);

  const ground = 408;
  const specs = [
    { x: 0, w: 54, h: 156, color: blockA, cols: 1, rows: 4 },
    { x: 52, w: 86, h: 252, color: tower, cols: 2, rows: 6 },
    { x: 136, w: 60, h: 188, color: blockB, cols: 1, rows: 5 },
    { x: 194, w: 72, h: 220, color: blockC, cols: 2, rows: 6 },
    { x: 264, w: 56, h: 160, color: blockA, cols: 1, rows: 4 },
  ];
  for (const spec of specs) {
    const top = ground - spec.h;
    canvas.rect(spec.color, spec.x, top, spec.w, spec.h + 6);
    if (spec.color === tower) canvas.rect(spec.color, spec.x + 8, top - 28, spec.w - 16, 30);
    const winW = spec.cols === 1 ? 18 : 16;
    const gap = 16;
    const inner = spec.w - 16;
    const used = spec.cols * winW + (spec.cols - 1) * gap;
    const x0 = spec.x + 8 + Math.max(0, (inner - used) / 2);
    const rowStart = spec.color === tower ? top + 20 : top + 16;
    for (let row = 0; row < spec.rows; row += 1) {
      const y = rowStart + row * 34;
      if (y + 22 > 340) break;
      for (let col = 0; col < spec.cols; col += 1) {
        canvas.rect(win, x0 + col * (winW + gap), y, winW, 18);
      }
    }
  }

  for (let i = 0; i < 5; i += 1) {
    const x = 8 + i * 64;
    canvas.rect(shop, x, 346, 48, 78);
    canvas.rect(sunC, x + 4, 334, 40, 18);
    canvas.rect(win, x + 13, 364, 22, 26);
    canvas.ellipse(lamp, x + 24, 408, 11, 11);
  }
  for (let i = 0; i < 6; i += 1) {
    const x = 6 + i * 52;
    canvas.rect(kiosk, x, 292, 40, 40);
    canvas.rect(sunC, x, 276, 40, 18);
    canvas.rect(lamp, x + 10, 304, 18, 18);
  }
  for (let col = 0; col < 8; col += 1) {
    canvas.rect(col % 2 ? tree : lamp, 4 + col * 40, 430, 32, 26);
  }

  const names: Record<Mood, string> = {
    dawn: "Dawn Skyline",
    day: "City Skyline",
    dusk: "Dusk Skyline",
    night: "Lit Windows",
  };
  return { id: "skyline", canvas, title: names[mood], caption: "A skyline of towers, lit windows, and shopfronts." };
}

function openBloom(rng: Rng): Painted {
  const mood = moodOf(rng);
  const canvas = new Canvas();
  const back = mood === "night"
    ? ["#1e2a40", "#3e5674", "#d7c2aa", "#8fb8d4"]
    : mood === "dusk"
      ? ["#e07a72", "#f6c8b4", "#7eb6d8", "#c45a78"]
      : ["#7ec8ea", "#f8e2b8", "#d7c4f0", "#f7fbff"];
  const grounds = back.map((hex) => canvas.add(hex));
  const petal = canvas.add("#d72660", true);
  const petalB = canvas.add("#ffd0e0", true);
  const leaf = canvas.add("#1f7a48");
  const leafB = canvas.add("#b6e07a");
  const gold = canvas.add("#f0b429");
  const deep = canvas.add("#6b2444");

  const cx = 160;
  const cy = 220 + ri(rng, -6, 6);
  const tileH = 460 / 10;
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      canvas.rect(grounds[(row + col) % grounds.length] ?? petal, col * 40, row * tileH, 40.6, tileH + 0.6);
    }
  }

  const corners: Array<[number, number, number]> = [
    [58, 78, 0.5],
    [262, 80, -0.45],
    [60, 390, 0.8],
    [260, 392, -0.7],
  ];
  corners.forEach(([x, y, rot], i) => {
    canvas.ellipse(i % 2 ? leaf : leafB, x, y, 26, 40, rot);
  });

  const petals = 12;
  for (let i = 0; i < petals; i += 1) {
    const ang = -Math.PI / 2 + (i * Math.PI * 2) / petals;
    canvas.ellipse(i % 2 ? petal : petalB, cx + Math.cos(ang) * 86, cy + Math.sin(ang) * 86, 24, 46, ang + Math.PI / 2);
  }
  for (let i = 0; i < 8; i += 1) {
    const ang = (i * Math.PI * 2) / 8 + 0.2;
    canvas.ellipse(deep, cx + Math.cos(ang) * 40, cy + Math.sin(ang) * 40, 14, 20, ang);
  }
  canvas.ellipse(gold, cx, cy, 22, 22);
  canvas.ellipse(deep, cx, cy, 10, 10);

  for (let i = 0; i < 14; i += 1) {
    const ang = (i * Math.PI * 2) / 14;
    const x = cx + Math.cos(ang) * 150;
    const y = cy + Math.sin(ang) * 150;
    if (x < 24 || x > 296 || y < 24 || y > 436) continue;
    canvas.ellipse(i % 2 ? leaf : gold, x, y, 12, 12);
  }
  for (let col = 0; col < 8; col += 1) {
    canvas.ellipse(col % 2 ? deep : gold, 24 + col * 38, 28, 12, 12);
  }

  const names: Record<Mood, string> = {
    dawn: "Morning Bloom",
    day: "Open Bloom",
    dusk: "Dusk Bloom",
    night: "Night Bloom",
  };
  return { id: "bloom", canvas, title: names[mood], caption: "One large flower filling the page, with leaves in the corners." };
}

function roseWindow(rng: Rng): Painted {
  const mood = moodOf(rng);
  const canvas = new Canvas();
  const stone = canvas.add(mood === "night" ? "#3a3440" : "#f4ece4");
  const stoneB = canvas.add(mood === "night" ? "#6a5c68" : "#c4a48c");
  const leadA = canvas.add("#2a2624");
  const leadB = canvas.add("#d9cfc4");
  const glassHex = ["#3d8ec4", "#d72660", "#f0b429", "#1f8a52", "#7a5cc4", "#f7fbff"];
  const glass = glassHex.map((hex, index) => canvas.add(hex, index === 1));
  const gold = canvas.add("#ffe08a");

  const course = 28;
  for (let y = 0, i = 0; y < 460; y += course, i += 1) {
    canvas.rect(i % 2 ? stoneB : stone, 0, y, 320, course + 0.6);
  }

  const pane = 32;
  const gap = 16;
  const cols = 4;
  const rows = 5;
  const gridW = cols * pane + (cols + 1) * gap;
  const gridH = rows * pane + (rows + 1) * gap;
  const x0 = (320 - gridW) / 2;
  const y0 = 168;
  for (let row = 0; row <= rows; row += 1) {
    canvas.rect(leadA, x0, y0 + row * (pane + gap), gridW, gap);
  }
  for (let col = 0; col <= cols; col += 1) {
    canvas.rect(leadB, x0 + col * (pane + gap), y0, gap, gridH);
  }
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const others = [glass[0], glass[2], glass[3], glass[4], glass[5]];
      const color = (row + col) % 2 === 0 ? (glass[1] ?? gold) : (others[(row * 2 + col) % others.length] ?? gold);
      canvas.rect(color, x0 + gap + col * (pane + gap), y0 + gap + row * (pane + gap), pane, pane);
    }
  }

  const cx = 160;
  const cy = 108;
  for (let i = 0; i < 8; i += 1) {
    const a0 = -Math.PI / 2 + (i * Math.PI * 2) / 8;
    const a1n = a0 + (Math.PI * 2) / 8 + 0.02;
    const color = glass[i % glass.length] ?? gold;
    const pts: Array<[number, number]> = [[cx, cy]];
    for (let s = 0; s <= 4; s += 1) {
      const ang = a0 + ((a1n - a0) * s) / 4;
      pts.push([cx + Math.cos(ang) * 48, cy + Math.sin(ang) * 44]);
    }
    canvas.poly(color, pts);
  }
  canvas.ellipse(glass[1] ?? gold, cx, cy, 22, 22);

  const names: Record<Mood, string> = {
    dawn: "Rose Window, Morning",
    day: "Rose Window",
    dusk: "Rose Window at Dusk",
    night: "Rose Window, Night",
  };
  return {
    id: "window",
    canvas,
    title: names[mood],
    caption: "A stone rose window filled with glass panes.",
  };
}

function cottageGarden(rng: Rng): Painted {
  const mood = moodOf(rng);
  const canvas = new Canvas();
  const skyHex = mood === "night"
    ? ["#16243c", "#3a5274", "#a8bdd0"]
    : mood === "dusk"
      ? ["#d85a48", "#f2a47a", "#f8d4b0"]
      : ["#3e92d4", "#9ed0f2", "#f8e2b8"];
  const s0 = canvas.add(skyHex[0] ?? "#3e92d4");
  const s1 = canvas.add(skyHex[1] ?? "#9ed0f2");
  const s2 = canvas.add(skyHex[2] ?? "#f8e2b8");
  const sunC = canvas.add(mood === "night" ? "#f4e2b0" : "#f0b429");
  const hill = canvas.add(mood === "night" ? "#3d8a78" : "#6ea25c");
  const lawn = canvas.add(mood === "night" ? "#10281c" : "#1f6a38");
  const lawnB = canvas.add("#b6e07a");
  const wall = canvas.add("#d07a58", true);
  const roof = canvas.add("#a33b38", true);
  const door = canvas.add("#4a241e");
  const win = canvas.add(mood === "night" ? "#f6d78a" : "#ffe08a");
  const trunk = canvas.add("#8a5a32");
  const canopy = canvas.add("#9adf7a");
  const bloom = canvas.add("#d72660");
  const bloomB = canvas.add("#ffd0e0");
  const path = canvas.add("#e6c39a");

  const horizon = 158;
  bands(canvas, [s0, s1, s2], 0, horizon);
  canvas.ellipse(sunC, rf(rng, 48, 82), rf(rng, 36, 54), 24, 24);
  cloud(canvas, s2, rf(rng, 190, 240), 34, 0.9);
  canvas.ellipse(hill, 64, horizon + 8, 86, 32);
  canvas.ellipse(hill, 240, horizon + 12, 100, 34);
  bands(canvas, [lawnB, lawn, lawnB], horizon + 18, 460);

  canvas.ellipse(canopy, 54, horizon + 4, 40, 32);
  canvas.ellipse(canopy, 84, horizon + 16, 26, 22);
  canvas.capsule(trunk, 62, horizon + 18, 62, horizon + 86, 10);

  const houseX = 112 + ri(rng, -4, 8);
  const houseY = horizon + 28;
  canvas.rect(wall, houseX, houseY, 136, 112);
  canvas.poly(roof, [
    [houseX - 14, houseY + 8],
    [houseX + 150, houseY + 8],
    [houseX + 68, houseY - 54],
  ]);
  canvas.rect(roof, houseX + 96, houseY - 48, 20, 34);
  canvas.rect(door, houseX + 54, houseY + 52, 28, 60);
  canvas.rect(win, houseX + 16, houseY + 24, 22, 26);
  canvas.rect(win, houseX + 98, houseY + 24, 22, 26);
  canvas.rect(path, houseX + 54, houseY + 112, 30, 160);

  for (let row = 0; row < 4; row += 1) {
    for (let i = 0; i < 6; i += 1) {
      const x = 26 + i * 52 + (row % 2) * 16;
      const y = 300 + row * 40;
      if (Math.hypot(x - (houseX + 68), y - (houseY + 70)) < 78) continue;
      canvas.capsule(trunk, x, y + 10, x, y + 32, 9);
      canvas.ellipse(canopy, x + 16, y + 18, 10, 16, 0.7);
      canvas.ellipse(i % 2 ? bloom : bloomB, x, y, 14, 16);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    canvas.rect(path, 16 + i * 40, 248, 22, 28);
    canvas.ellipse(i % 2 ? bloomB : sunC, 24 + i * 38, 444, 12, 12);
  }

  const names: Record<Mood, string> = {
    dawn: "Cottage Morning",
    day: "Rose Cottage",
    dusk: "Cottage at Dusk",
    night: "Cottage Lights",
  };
  return { id: "cottage", canvas, title: names[mood], caption: "A cottage, a tree, and flower rows filling the garden." };
}
