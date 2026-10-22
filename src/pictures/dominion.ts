import {
  capsule,
  centroid,
  circlePath,
  cloudPath,
  ellipsePath,
  flamePath,
  polygon,
  rectPath,
  ringPath,
  roundRectPath,
  smoothClosed,
  stadiumVertical,
  waveBand,
} from "./geometry.ts";
import { Sheet } from "./sheet.ts";
import type { Picture } from "./types.ts";

function truck(): Picture {
  const s = new Sheet();
  s.region("sky", rectPath(0, 0, 320, 268), 5, [70, 80]);
  s.region("sun", circlePath(250, 78, 28), 2, [250, 78]);
  s.region("cloud-a", cloudPath(78, 64, 26), 8, [78, 68]);
  s.region("cloud-b", cloudPath(168, 48, 18), 8, [168, 50]);
  s.region(
    "hill-far",
    "M 0 214 C 50 176, 110 188, 160 206 C 220 228, 270 168, 320 190 L 320 300 L 0 300 Z",
    4,
    [80, 230],
  );
  s.region(
    "hill-near",
    "M 0 250 C 70 214, 130 236, 190 252 C 250 270, 280 236, 320 246 L 320 318 L 0 318 Z",
    3,
    [60, 276],
  );
  s.region("road", rectPath(0, 300, 320, 160), 7, [160, 390]);

  [46, 92, 138].forEach((x, i) => {
    s.region(`post-${i}`, rectPath(x, 214, 7, 48), 8, [x + 3, 236]);
  });
  s.stroke("M 46 226 L 148 226 M 46 242 L 148 242", 2, { layer: "under" });

  const bed: [number, number][] = [
    [34, 236],
    [154, 228],
    [154, 292],
    [46, 292],
  ];
  const cab: [number, number][] = [
    [150, 228],
    [150, 206],
    [214, 198],
    [236, 230],
    [258, 248],
    [262, 292],
    [150, 292],
  ];
  const glass: [number, number][] = [
    [164, 214],
    [208, 208],
    [226, 236],
    [164, 242],
  ];
  s.region("bed", polygon(bed), 1, [96, 262]);
  s.region("cab", polygon(cab), 6, [196, 256]);
  s.region("window", polygon(glass), 5, centroid(glass));
  s.region("bumper", polygon([[258, 268], [276, 268], [276, 292], [258, 292]]), 8, [267, 280]);
  s.region("headlight", circlePath(252, 258, 8), 2, [252, 258]);
  s.region("taillight", roundRectPath(40, 250, 12, 16, 3), 2, [46, 258]);
  s.region("tire-r", circlePath(108, 300, 30), 4, [108, 300]);
  s.region("hub-r", circlePath(108, 300, 12), 8, [108, 300]);
  s.region("tire-f", circlePath(214, 300, 30), 4, [214, 300]);
  s.region("hub-f", circlePath(214, 300, 12), 8, [214, 300]);

  s.stroke("M 154 228 L 154 292", 2);
  s.stroke("M 40 292 L 250 292", 2);
  s.stroke("M 70 360 H 130 M 190 360 H 250 M 40 390 H 90 M 150 390 H 210 M 250 390 H 300", 2.2);

  return s.build({
    id: "od-truck",
    pack: "dominion",
    title: "Country Road",
    caption: "A pickup on a long, easy road.",
  });
}

function hatBoots(): Picture {
  const s = new Sheet();
  s.region("floor", rectPath(0, 392, 320, 68), 3, [160, 424]);
  s.region("shadow-l", ellipsePath(80, 404, 52, 8), 7, null);
  s.region("shadow-r", ellipsePath(230, 404, 52, 8), 7, null);
  s.region("brim", ellipsePath(160, 168, 124, 28), 1, [52, 168]);
  const crown = smoothClosed(
    [
      [116, 168],
      [108, 96],
      [126, 68],
      [160, 58],
      [196, 68],
      [214, 96],
      [206, 168],
    ],
    0.18,
  );
  s.region("crown", crown, 6, [160, 112]);
  s.region("dent", ellipsePath(160, 86, 26, 12), 2, [160, 86]);
  s.region("band", roundRectPath(116, 128, 88, 18, 6), 4, [160, 137]);
  s.region("buckle", roundRectPath(196, 130, 16, 14, 3), 2, [204, 137]);

  const boot = (prefix: string, x: number) => {
    const shaft: [number, number][] = [
      [x + 18, 236],
      [x + 78, 230],
      [x + 86, 328],
      [x + 36, 346],
      [x + 8, 300],
    ];
    const foot: [number, number][] = [
      [x + 8, 318],
      [x + 86, 330],
      [x + 118, 352],
      [x + 108, 378],
      [x + 16, 378],
      [x + 4, 350],
    ];
    const heel: [number, number][] = [
      [x + 16, 370],
      [x + 48, 366],
      [x + 48, 396],
      [x + 12, 396],
    ];
    const cuff: [number, number][] = [
      [x + 16, 230],
      [x + 76, 224],
      [x + 80, 250],
      [x + 14, 256],
    ];
    s.region(`${prefix}-shaft`, polygon(shaft), 1, [x + 48, 290]);
    s.region(`${prefix}-foot`, polygon(foot), 6, [x + 64, 360]);
    s.region(`${prefix}-heel`, polygon(heel), 4, centroid(heel));
    s.region(`${prefix}-cuff`, polygon(cuff), 8, centroid(cuff));
    s.stroke(`M ${x + 28} 268 C ${x + 48} 278, ${x + 60} 276, ${x + 74} 262`, 1.7);
    s.stroke(`M ${x + 24} 352 L ${x + 96} 362`, 1.6);
  };
  boot("l", 18);
  boot("r", 168);

  return s.build({
    id: "od-hat",
    pack: "dominion",
    title: "Hat & Boots",
    caption: "A hat waiting beside a pair of boots.",
  });
}

function instruments(): Picture {
  const s = new Sheet();
  s.region("rail", roundRectPath(16, 118, 288, 16, 6), 5, [160, 126]);
  s.region("plank-1", rectPath(0, 338, 320, 32), 3, [40, 354]);
  s.region("plank-2", rectPath(0, 370, 320, 30), 4, [200, 384]);
  s.region("plank-3", rectPath(0, 400, 320, 28), 3, [80, 414]);
  s.region("plank-4", rectPath(0, 428, 320, 32), 8, [220, 444]);
  for (let x = 28; x < 300; x += 28) {
    s.stroke(`M ${x} 134 L ${x} 168`, 2, { layer: "under" });
  }

  const banjo = "rotate(-8 108 280)";
  s.region("b-neck", roundRectPath(98, 86, 22, 150, 6), 6, [109, 150], { transform: banjo });
  const peg: [number, number][] = [
    [96, 92],
    [92, 62],
    [108, 46],
    [128, 46],
    [136, 70],
  ];
  s.region("b-peghead", polygon(peg), 4, centroid(peg), { transform: banjo });
  s.region("b-pot", circlePath(110, 262, 62), 8, [110, 300], { transform: banjo });
  s.region("b-rim", ringPath(110, 248, 58, 44), 3, [110, 198], { evenodd: true, transform: banjo });
  s.region("b-head", circlePath(110, 248, 44), 1, [110, 248], { transform: banjo });
  s.region("b-bridge", roundRectPath(96, 246, 28, 8, 2), 4, [110, 250], { transform: banjo });
  (
    [
      [88, 78],
      [90, 60],
      [136, 60],
      [134, 78],
    ] as [number, number][]
  ).forEach(([x, y], i) => {
    s.region(`b-pin-${i}`, circlePath(x, y, 5), 2, [x, y], { transform: banjo });
  });
  for (let i = 0; i < 5; i++) {
    const x = 100 + i * 5;
    s.stroke(`M ${x} 70 L ${x} 250`, 1.2, { transform: banjo });
  }
  for (let y = 110; y <= 200; y += 16) {
    s.stroke(`M 100 ${y} L 120 ${y}`, 1.4, { transform: banjo });
  }

  const guitar = "rotate(7 214 300)";
  const body = smoothClosed(
    [
      [214, 214],
      [186, 224],
      [172, 252],
      [176, 276],
      [166, 308],
      [190, 340],
      [214, 350],
      [238, 340],
      [262, 308],
      [252, 276],
      [258, 252],
      [244, 224],
    ],
    0.22,
  );
  s.region("g-neck", rectPath(204, 108, 20, 120), 6, [214, 160], { transform: guitar });
  const head: [number, number][] = [
    [202, 116],
    [198, 84],
    [208, 68],
    [226, 68],
    [234, 86],
    [228, 116],
  ];
  s.region("g-head", polygon(head), 4, centroid(head), { transform: guitar });
  s.region("g-body", body, 1, [196, 280], { transform: guitar });
  s.region("g-board", rectPath(206, 100, 16, 140), 3, [214, 150], { transform: guitar });
  s.region("g-hole", circlePath(214, 286, 16), 5, [214, 286], { transform: guitar });
  s.region("g-ring", ringPath(214, 286, 24, 16), 8, [214, 262], { evenodd: true, transform: guitar });
  [[198, 92], [230, 92]].forEach(([x, y], i) => {
    s.region(`g-pin-${i}`, circlePath(x, y, 5), 2, [x, y], { transform: guitar });
  });
  for (let i = 0; i < 6; i++) {
    const x = 207 + i * 2.4;
    s.stroke(`M ${x} 96 L ${x} 320`, 1.15, { transform: guitar });
  }

  return s.build({
    id: "od-instruments",
    pack: "dominion",
    title: "Porch Pair",
    caption: "A banjo and a guitar leaning together.",
  });
}

function tower(): Picture {
  const s = new Sheet();
  s.region("sky-top", rectPath(0, 0, 320, 150), 5, [60, 70]);
  s.region("sky-mid", rectPath(0, 150, 320, 80), 2, [50, 186]);
  s.region("sky-low", rectPath(0, 230, 320, 70), 6, [40, 258]);
  s.region("sun", circlePath(214, 236, 32), 2, [214, 226]);
  s.region(
    "hill",
    "M 0 300 C 60 250, 120 274, 180 286 C 240 300, 280 260, 320 278 L 320 400 L 0 400 Z",
    3,
    [70, 330],
  );
  s.region("ground", rectPath(0, 360, 320, 100), 4, [160, 420]);

  const roof: [number, number][] = [
    [108, 156],
    [160, 102],
    [212, 156],
  ];
  s.region("roof", polygon(roof), 7, [160, 132]);

  const tank = stadiumVertical(160, 124, 248, 52);
  s.clip("tank", tank);
  s.region("band-1", rectPath(100, 124, 120, 42), 1, [160, 156], { clipId: "tank" });
  s.region("band-2", rectPath(100, 166, 120, 40), 8, [160, 186], { clipId: "tank" });
  s.region("band-3", rectPath(100, 206, 120, 48), 1, [160, 220], { clipId: "tank" });
  s.stroke(tank, 2.5);
  s.region("hatch", roundRectPath(148, 176, 18, 22, 4), 4, [157, 187]);
  s.region("walk", ellipsePath(160, 236, 64, 12), 7, [210, 236]);

  const leg = (pts: [number, number][], id: string) => {
    s.region(id, polygon(pts), 6, centroid(pts));
  };
  leg(
    [
      [118, 236],
      [134, 236],
      [96, 372],
      [74, 372],
    ],
    "leg-fl",
  );
  leg(
    [
      [186, 236],
      [202, 236],
      [246, 372],
      [224, 372],
    ],
    "leg-fr",
  );
  leg(
    [
      [142, 240],
      [154, 240],
      [140, 360],
      [126, 360],
    ],
    "leg-bl",
  );
  leg(
    [
      [166, 240],
      [178, 240],
      [194, 360],
      [180, 360],
    ],
    "leg-br",
  );

  s.stroke("M 196 248 L 196 360 M 204 248 L 204 360", 1.8);
  for (let y = 268; y < 350; y += 16) {
    s.stroke(`M 196 ${y} L 204 ${y}`, 1.5);
  }
  s.stroke("M 100 280 L 150 330 M 150 280 L 100 330 M 170 280 L 220 330 M 220 280 L 170 330", 1.8);

  s.region("tree-a", ellipsePath(48, 332, 22, 26), 3, [48, 328]);
  s.region("trunk-a", rectPath(44, 348, 8, 28), 6, [48, 360]);
  s.region("tree-b", ellipsePath(286, 324, 18, 22), 3, [286, 320]);
  s.region("trunk-b", rectPath(282, 340, 8, 26), 6, [286, 352]);
  s.region("house", rectPath(250, 332, 28, 24), 8, [264, 344]);
  s.region("house-roof", polygon([[246, 332], [264, 316], [282, 332]]), 2, [264, 326]);
  s.stroke("M 40 80 l 10 6 l -10 6 M 300 96 l -12 7 l 12 7", 1.8);

  return s.build({
    id: "od-tower",
    pack: "dominion",
    title: "Water Tower",
    caption: "A small-town tower against a sunset.",
  });
}

function bonfire(): Picture {
  const s = new Sheet();
  s.region("sky", rectPath(0, 0, 320, 250), 5, [60, 80]);
  s.region("horizon", rectPath(0, 250, 320, 90), 8, [50, 290]);
  s.region("ground", rectPath(0, 330, 320, 130), 4, [160, 420]);
  const stars: [number, number][] = [
    [36, 48],
    [84, 36],
    [140, 64],
    [210, 40],
    [268, 58],
    [300, 96],
    [48, 120],
    [180, 100],
  ];
  stars.forEach(([x, y], i) => {
    s.region(`star-${i}`, circlePath(x, y, i % 3 === 0 ? 4 : 2.6), 2, i % 3 === 0 ? [x, y] : null);
  });

  s.region("pole-l", roundRectPath(26, 150, 12, 190, 4), 6, [32, 240]);
  s.region("pole-r", roundRectPath(282, 150, 12, 190, 4), 6, [288, 240]);
  let wire = "";
  const bulbs: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = 38 + t * 244;
    const y = 156 + Math.sin(Math.PI * t) * 46;
    wire += `${i === 0 ? "M" : "L"} ${x} ${y} `;
    if (i > 0 && i < 8) bulbs.push([x, y]);
  }
  s.stroke(wire, 2);
  bulbs.forEach(([x, y], i) => {
    s.region(`bulb-${i}`, circlePath(x, y + 8, 8), i % 2 === 0 ? 2 : 7, [x, y + 8]);
  });

  s.region("blanket", ellipsePath(86, 400, 62, 20), 1, [86, 400]);
  s.region("rock-a", ellipsePath(78, 348, 22, 14), 8, [78, 348]);
  s.region("rock-b", ellipsePath(246, 352, 26, 16), 6, [246, 352]);
  s.region("rock-c", ellipsePath(210, 366, 16, 10), 8, [210, 366]);
  s.region("log-a", capsule([108, 332], [214, 348], 12), 3, [160, 340]);
  s.region("log-b", capsule([118, 356], [206, 328], 11), 6, [170, 348]);
  s.region("flame-out", flamePath(160, 292, 78, 92), 2, [160, 270]);
  s.region("flame-mid", flamePath(160, 300, 48, 70), 7, [160, 286]);
  s.region("flame-in", flamePath(160, 308, 24, 46), 8, [160, 300]);
  [[132, 214], [188, 200], [150, 186], [176, 228]].forEach(([x, y], i) => {
    s.region(`spark-${i}`, circlePath(x, y, 3.5), 2, null);
  });
  s.stroke("M 250 330 L 292 292", 2);
  s.region("marshmallow", roundRectPath(280, 278, 16, 20, 8), 8, [288, 288]);

  return s.build({
    id: "od-bonfire",
    pack: "dominion",
    title: "String Lights",
    caption: "A bonfire under a line of bulbs.",
  });
}

function sailboat(): Picture {
  const s = new Sheet();
  s.region("sky", rectPath(0, 0, 320, 210), 5, [60, 70]);
  s.region("sun", circlePath(64, 72, 26), 2, [64, 72]);
  s.region("cloud", cloudPath(230, 64, 28), 8, [230, 68]);
  s.region(
    "shore",
    "M 0 196 C 80 176, 140 188, 210 180 C 260 174, 290 186, 320 178 L 320 220 L 0 220 Z",
    4,
    [40, 200],
  );
  s.region("water-far", waveBand(200, 280, 7, 0.2), 6, [160, 240]);
  s.region("water-mid", waveBand(268, 360, 8, 1.1), 5, [80, 310]);
  s.region("water-near", waveBand(348, 470, 6, 0.4), 8, [200, 400]);

  s.region(
    "reflect-sail",
    polygon([
      [168, 312],
      [176, 360],
      [230, 348],
      [188, 312],
    ]),
    1,
    [196, 336],
  );
  s.region(
    "reflect-hull",
    polygon([
      [112, 312],
      [214, 312],
      [196, 340],
      [128, 340],
    ]),
    3,
    [164, 326],
  );

  const hull = smoothClosed(
    [
      [86, 250],
      [236, 246],
      [228, 286],
      [196, 308],
      [124, 308],
      [92, 286],
    ],
    0.16,
  );
  s.region("hull", hull, 3, [160, 286]);
  s.region("deck", polygon([[100, 252], [220, 250], [214, 266], [106, 268]]), 4, [160, 258]);
  s.region("cabin", roundRectPath(142, 228, 46, 28, 6), 7, [165, 242]);
  s.region("porthole", circlePath(165, 242, 6), 2, [165, 242]);
  s.region(
    "main-sail",
    "M 176 78 C 188 140, 196 200, 188 246 L 248 240 C 220 180, 196 120, 176 78 Z",
    1,
    [210, 170],
  );
  s.region(
    "jib",
    "M 168 108 C 150 150, 132 200, 150 242 L 104 236 C 124 180, 150 130, 168 108 Z",
    8,
    [140, 180],
  );
  s.stroke("M 172 70 L 172 300", 2.4);
  s.stroke("M 108 242 L 246 238", 2);
  s.stroke("M 40 48 l 12 8 l -12 8 M 292 120 l -14 8 l 14 8", 1.8);
  s.region("flag", polygon([[172, 70], [196, 78], [172, 88]]), 2, [182, 78]);

  return s.build({
    id: "od-sail",
    pack: "dominion",
    title: "Lake Boat",
    caption: "A sailboat on still water.",
  });
}

export function dominionPictures(): Picture[] {
  return [truck(), hatBoots(), instruments(), tower(), bonfire(), sailboat()];
}
