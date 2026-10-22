#!/usr/bin/env python3
"""Build Linen's original color-by-number pictures.

Each page is drawn for this app (no third-party templates), then split into
closed regions that share a numbered color. Regenerates src/pictures/art and CREDITS.md.
"""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src" / "pictures" / "art"
SCALE = 3
VW, VH = 320, 460
W, H = VW * SCALE, VH * SCALE

CATEGORIES = [
    ("animals", "Animals"),
    ("flowers", "Flowers"),
    ("mandalas", "Mandalas"),
    ("landscapes", "Landscapes"),
    ("food", "Food"),
    ("butterflies", "Butterflies"),
    ("birds", "Birds"),
    ("places", "Places"),
]


def sx(x: float) -> int:
    return int(round(x * SCALE))


def sy(y: float) -> int:
    return int(round(y * SCALE))


class Scene:
    def __init__(self, colors: list[str], background: set[int], seed: int):
        self.colors = colors
        self.background = set(background)
        self.seed = seed
        self.img = np.zeros((H, W), np.uint8)
        self.inks: list[tuple[str, float]] = []

    def poly(self, pts: list[tuple[float, float]], idx: int) -> None:
        arr = np.array([[sx(x), sy(y)] for x, y in pts], np.int32)
        cv2.fillPoly(self.img, [arr], int(idx), lineType=cv2.LINE_8)

    def rect(self, x: float, y: float, w: float, h: float, idx: int) -> None:
        self.poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], idx)

    def ellipse(self, cx: float, cy: float, rx: float, ry: float, idx: int, angle: float = 0) -> None:
        cv2.ellipse(
            self.img,
            (sx(cx), sy(cy)),
            (max(1, sx(rx)), max(1, sy(ry))),
            angle,
            0,
            360,
            int(idx),
            -1,
            cv2.LINE_8,
        )

    def circle(self, cx: float, cy: float, r: float, idx: int) -> None:
        cv2.circle(self.img, (sx(cx), sy(cy)), max(1, sx(r)), int(idx), -1, cv2.LINE_8)

    def tri(self, a: tuple[float, float], b: tuple[float, float], c: tuple[float, float], idx: int) -> None:
        self.poly([a, b, c], idx)

    def capsule(self, x0: float, y0: float, x1: float, y1: float, r: float, idx: int) -> None:
        steps = max(2, int(math.hypot(x1 - x0, y1 - y0) / max(0.8, r * 0.35)))
        for i in range(steps + 1):
            t = i / steps
            self.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, idx)

    def stroke(self, pts: list[tuple[float, float]], width: float, idx: int) -> None:
        arr = np.array([[sx(x), sy(y)] for x, y in pts], np.int32)
        cv2.polylines(self.img, [arr], False, int(idx), max(1, sx(width)), cv2.LINE_8)

    def bands(self, x: float, y: float, w: float, h: float, indices: list[int]) -> None:
        n = len(indices)
        for i, idx in enumerate(indices):
            y0 = y + h * i / n
            y1 = y + h * (i + 1) / n + 0.8
            self.rect(x, y0, w, y1 - y0, idx)

    def ink(self, pts: list[tuple[float, float]], width: float = 1.35) -> None:
        if len(pts) < 2:
            return
        bits = [f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"]
        bits.extend(f"L{x:.2f} {y:.2f}" for x, y in pts[1:])
        self.inks.append((" ".join(bits), width))


def petal(
    scene: Scene,
    cx: float,
    cy: float,
    r0: float,
    r1: float,
    a0: float,
    a1: float,
    idx: int,
    bulge: float = 1.15,
    stretch: float = 1,
) -> None:
    steps = 6
    outer: list[tuple[float, float]] = []
    inner: list[tuple[float, float]] = []
    for i in range(steps + 1):
        t = i / steps
        a = a0 + (a1 - a0) * t
        bend = 1 + (bulge - 1) * math.sin(math.pi * t)
        outer.append((cx + math.cos(a) * r1 * bend, cy + math.sin(a) * r1 * bend * stretch))
        inner.append((cx + math.cos(a) * r0, cy + math.sin(a) * r0 * stretch))
    scene.poly(outer + inner[::-1], idx)


def mirror(pts: list[tuple[float, float]], cx: float = 160) -> list[tuple[float, float]]:
    return [(cx - (x - cx), y) for x, y in pts]


def both(scene: Scene, pts: list[tuple[float, float]], idx: int, cx: float = 160) -> None:
    scene.poly(pts, idx)
    scene.poly(mirror(pts, cx), idx)


def absorb(img: np.ndarray, min_area: int) -> np.ndarray:
    img = img.copy()
    height, width = img.shape
    for _ in range(8):
        changed = False
        for idx in [int(v) for v in np.unique(img)]:
            mask = (img == idx).astype(np.uint8)
            count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
            for i in range(1, count):
                if int(stats[i, cv2.CC_STAT_AREA]) >= min_area:
                    continue
                ys, xs = np.where(labels == i)
                votes: dict[int, int] = {}
                for y, x in zip(ys[::2], xs[::2]):
                    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        yy, xx = int(y + dy), int(x + dx)
                        if yy < 0 or xx < 0 or yy >= height or xx >= width:
                            continue
                        if labels[yy, xx] == i:
                            continue
                        other = int(img[yy, xx])
                        if other == idx:
                            continue
                        votes[other] = votes.get(other, 0) + 1
                if not votes:
                    continue
                img[labels == i] = max(votes, key=votes.get)
                changed = True
        if not changed:
            break
    return img


def components(img: np.ndarray, background: set[int]) -> list[dict]:
    found = []
    for idx in [int(v) for v in np.unique(img)]:
        mask = (img == idx).astype(np.uint8)
        count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        for i in range(1, count):
            area = int(stats[i, cv2.CC_STAT_AREA])
            if area < 30:
                continue
            found.append({"idx": idx, "area": area, "mask": labels == i, "bg": idx in background})
    return found


def cell_count(area: int, bg: bool, unit: float) -> int:
    weight = 0.58 if bg else 1.32
    return max(1, min(34, int(round(area * weight / unit))))


def choose_unit(comps: list[dict], target: int) -> float:
    def total(unit: float) -> int:
        return sum(cell_count(c["area"], c["bg"], unit) for c in comps)

    lo, hi = 300.0, 250000.0
    for _ in range(30):
        mid = (lo + hi) / 2
        if total(mid) > target:
            lo = mid
        else:
            hi = mid
    return hi


def split_mask(mask: np.ndarray, k: int, rng: np.random.Generator) -> list[np.ndarray]:
    ys, xs = np.where(mask)
    if k <= 1 or len(xs) < 24:
        return [mask]
    pts = np.stack([xs, ys], axis=1)
    sample = pts
    if len(pts) > 4500:
        sample = pts[rng.choice(len(pts), 4500, replace=False)]
    k = min(k, len(sample))
    if k <= 1:
        return [mask]
    chosen = [int(rng.integers(len(sample)))]
    dist = np.full(len(sample), np.inf)
    for _ in range(k - 1):
        last = sample[chosen[-1]]
        delta = (sample[:, 0] - last[0]) ** 2 + (sample[:, 1] - last[1]) ** 2
        dist = np.minimum(dist, delta)
        chosen.append(int(np.argmax(dist)))
    seeds = sample[np.array(chosen)].astype(np.float32)
    labels = np.empty(len(pts), np.int32)
    for start in range(0, len(pts), 7000):
        chunk = pts[start : start + 7000].astype(np.float32)
        delta = (chunk[:, None, 0] - seeds[None, :, 0]) ** 2 + (chunk[:, None, 1] - seeds[None, :, 1]) ** 2
        labels[start : start + 7000] = np.argmin(delta, axis=1)
    masks = []
    for i in range(k):
        sel = labels == i
        if not np.any(sel):
            continue
        piece = np.zeros(mask.shape, bool)
        piece[pts[sel, 1], pts[sel, 0]] = True
        masks.append(piece)
    return masks or [mask]


def mask_path(mask: np.ndarray) -> tuple[str | None, bool, float]:
    raw = mask.astype(np.uint8) * 255
    thick = cv2.dilate(raw, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(thick, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_L1)
    parts: list[str] = []
    for contour in contours:
        approx = cv2.approxPolyDP(contour, 1.2, True)
        if len(approx) < 3:
            continue
        pts = approx.reshape(-1, 2)
        bits = [f"M{pts[0, 0] / SCALE:.2f} {pts[0, 1] / SCALE:.2f}"]
        bits.extend(f"L{x / SCALE:.2f} {y / SCALE:.2f}" for x, y in pts[1:])
        bits.append("Z")
        parts.append("".join(bits))
    if not parts:
        return None, False, 0
    dist = cv2.distanceTransform((mask.astype(np.uint8)), cv2.DIST_L2, 3)
    return " ".join(parts), len(parts) > 1, float(dist.max())


def outline_path(img: np.ndarray, background: set[int]) -> str:
    parts: list[str] = []
    for idx in [int(v) for v in np.unique(img)]:
        if idx in background:
            continue
        mask = (img == idx).astype(np.uint8)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            if cv2.contourArea(contour) < 90:
                continue
            approx = cv2.approxPolyDP(contour, 1.7, True)
            if len(approx) < 3:
                continue
            pts = approx.reshape(-1, 2)
            bits = [f"M{pts[0, 0] / SCALE:.2f} {pts[0, 1] / SCALE:.2f}"]
            bits.extend(f"L{x / SCALE:.2f} {y / SCALE:.2f}" for x, y in pts[1:])
            bits.append("Z")
            parts.append("".join(bits))
    return " ".join(parts)


def vectorize(scene: Scene, target: int) -> tuple[list[dict], list[str], str]:
    img = scene.img
    min_area = 220
    comps: list[dict] = []
    for _ in range(5):
        img = absorb(img, min_area)
        comps = components(img, scene.background)
        if len(comps) <= 250 or min_area > 640:
            break
        min_area += 140
    if not comps:
        raise RuntimeError("picture has no regions")
    unit = choose_unit(comps, target)
    rng = np.random.default_rng(scene.seed)
    regions: list[tuple[int, dict]] = []
    for comp in comps:
        k = cell_count(comp["area"], comp["bg"], unit)
        for piece in split_mask(comp["mask"], k, rng):
            path, holes, radius = mask_path(piece)
            if not path:
                continue
            view_r = radius / SCALE
            region: dict = {"d": path, "n": int(comp["idx"]) + 1}
            if holes:
                region["evenodd"] = True
            if view_r >= 3.25:
                dist = cv2.distanceTransform(piece.astype(np.uint8), cv2.DIST_L2, 3)
                _, _, _, loc = cv2.minMaxLoc(dist)
                region["label"] = [round(loc[0] / SCALE, 2), round(loc[1] / SCALE, 2)]
                region["hintSize"] = int(max(5, min(12, round(view_r * 0.8))))
            else:
                region["label"] = None
            regions.append((int(piece.sum()), region))
    regions.sort(key=lambda item: -item[0])
    used = sorted({region["n"] for _, region in regions})
    remap = {old: i + 1 for i, old in enumerate(used)}
    colors = [scene.colors[n - 1] for n in used]
    cleaned = []
    for i, (_, region) in enumerate(regions):
        region["n"] = remap[region["n"]]
        region["id"] = f"r{i}"
        cleaned.append(region)
    return cleaned, colors, outline_path(img, scene.background)


def paint_rgb(img: np.ndarray, colors: list[str]) -> Image.Image:
    rgb = np.zeros((img.shape[0], img.shape[1], 3), np.uint8)
    for i, hex_color in enumerate(colors):
        value = hex_color.lstrip("#")
        rgb[img == i] = [int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)]
    return Image.fromarray(rgb)


def svg_for(picture: dict, numbered: bool) -> str:
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VW} {VH}" width="{VW}" height="{VH}">',
        f'<rect width="{VW}" height="{VH}" fill="#fbf6f0"/>',
    ]
    for region in picture["regions"]:
        color = picture["colors"][region["n"] - 1] if not numbered else "#fbf6f0"
        rule = ' fill-rule="evenodd"' if region.get("evenodd") else ""
        stroke = ""
        if numbered:
            stroke = ' stroke="#d9cdd2" stroke-width="0.45" stroke-linejoin="round"'
        parts.append(f'<path d="{region["d"]}" fill="{color}"{rule}{stroke}/>')
    if numbered and picture["outline"]:
        parts.append(
            f'<path d="{picture["outline"]}" fill="none" stroke="#4e3a44" stroke-width="1.55" stroke-linejoin="round" stroke-linecap="round"/>'
        )
        for ink in picture["ink"]:
            parts.append(
                f'<path d="{ink["d"]}" fill="none" stroke="#4e3a44" stroke-width="{ink["w"]}" stroke-linecap="round" stroke-linejoin="round"/>'
            )
        for region in picture["regions"]:
            if not region["label"]:
                continue
            x, y = region["label"]
            size = region.get("hintSize", 7)
            parts.append(
                f'<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="central" font-size="{size}" font-family="Nunito, sans-serif" font-weight="700" fill="#7a5364">{region["n"]}</text>'
            )
    parts.append("</svg>")
    return "".join(parts)


# --- pictures -----------------------------------------------------------------

def scene_cat() -> Scene:
    c = [
        "#f6d7e2",
        "#f3e3d4",
        "#e7c3b4",
        "#f7d5e3",
        "#e7b4c8",
        "#f4e2cf",
        "#e7b7aa",
        "#d98962",
        "#b86543",
        "#8f4634",
        "#f7f4ef",
        "#3e3538",
        "#d6ece4",
        "#f2c14e",
    ]
    s = Scene(c, {0, 1}, 11)
    s.bands(0, 0, 320, 460, [0, 0, 1])
    s.ellipse(250, 70, 46, 22, 12)
    s.ellipse(70, 96, 34, 16, 12)
    s.ellipse(168, 352, 128, 42, 2)
    s.ellipse(168, 338, 108, 28, 3)
    s.ellipse(168, 348, 86, 16, 4)
    s.ellipse(176, 268, 86, 52, 5)
    s.circle(124, 214, 48, 5)
    s.tri((86, 196), (112, 132), (142, 198), 5)
    s.tri((146, 188), (176, 126), (196, 204), 5)
    s.tri((98, 188), (116, 152), (134, 192), 6)
    s.tri((156, 186), (174, 150), (186, 198), 6)
    s.capsule(230, 286, 262, 214, 16, 5)
    s.capsule(262, 214, 214, 188, 13, 5)
    s.circle(206, 186, 12, 7)
    for cx, cy, ang in ((150, 250, 28), (186, 268, -18), (210, 246, 40), (168, 292, 8), (236, 274, -30)):
        s.ellipse(cx, cy, 18, 8, 8, ang)
    s.ellipse(248, 236, 12, 6, 8, 50)
    s.ellipse(128, 292, 22, 12, 5)
    s.ellipse(198, 304, 24, 12, 5)
    s.ellipse(118, 300, 10, 6, 7)
    s.ellipse(206, 312, 11, 6, 7)
    s.ellipse(108, 214, 14, 16, 10)
    s.ellipse(146, 212, 14, 16, 10)
    s.circle(110, 216, 5.5, 11)
    s.circle(148, 214, 5.5, 11)
    s.circle(112, 214, 2.2, 10)
    s.circle(150, 212, 2.2, 10)
    s.ellipse(128, 232, 7, 5, 6)
    s.ellipse(112, 228, 8, 4, 6)
    s.ellipse(146, 226, 8, 4, 6)
    s.ink([(88, 224), (62, 218)], 1.15)
    s.ink([(90, 232), (60, 232)], 1.15)
    s.ink([(90, 240), (64, 246)], 1.15)
    s.ink([(166, 222), (196, 214)], 1.15)
    s.ink([(168, 230), (200, 230)], 1.15)
    s.ink([(166, 238), (196, 246)], 1.15)
    s.circle(46, 390, 10, 13)
    s.circle(72, 404, 7, 6)
    s.circle(248, 400, 9, 13)
    s.circle(274, 386, 6, 6)
    return s


def scene_fox() -> Scene:
    c = [
        "#f8d2c0",
        "#f0b2a8",
        "#e7c7a4",
        "#b7d18a",
        "#6f9a55",
        "#4f7a44",
        "#e37a34",
        "#c44e22",
        "#f7f3ec",
        "#f0d4c0",
        "#7a3428",
        "#342e30",
        "#f0b14c",
        "#f2d56a",
        "#fffaf4",
    ]
    s = Scene(c, {0, 1, 2, 3}, 23)
    s.bands(0, 0, 320, 300, [0, 1, 2])
    s.ellipse(160, 430, 230, 120, 3)
    s.ellipse(160, 400, 200, 70, 4)
    s.ellipse(54, 250, 28, 14, 5, -30)
    s.ellipse(40, 300, 22, 10, 5, 20)
    s.ellipse(286, 268, 30, 12, 5, 24)
    s.ellipse(168, 292, 62, 48, 6)
    s.circle(160, 196, 52, 6)
    s.tri((112, 176), (126, 92), (168, 164), 6)
    s.tri((208, 176), (196, 92), (154, 164), 6)
    s.tri((122, 168), (136, 116), (160, 162), 10)
    s.tri((198, 168), (184, 116), (162, 162), 10)
    s.ellipse(160, 230, 34, 28, 8)
    s.ellipse(160, 214, 22, 16, 14)
    s.circle(142, 190, 6.5, 14)
    s.circle(178, 190, 6.5, 14)
    s.circle(142, 191, 3.2, 11)
    s.circle(178, 191, 3.2, 11)
    s.ellipse(160, 214, 7, 5, 11)
    s.ellipse(160, 248, 16, 10, 9)
    s.ellipse(128, 330, 18, 12, 6)
    s.ellipse(192, 330, 18, 12, 6)
    s.ellipse(126, 338, 8, 6, 14)
    s.ellipse(194, 338, 8, 6, 14)
    s.capsule(214, 300, 286, 250, 18, 6)
    s.capsule(286, 250, 268, 214, 14, 6)
    s.circle(262, 210, 16, 14)
    s.ellipse(230, 286, 14, 7, 7, 40)
    s.ellipse(268, 246, 12, 6, 7, -20)
    for x, y in ((46, 360), (78, 388), (250, 372), (286, 348)):
        s.circle(x, y, 11, 13)
        s.circle(x, y, 4.5, 7)
        s.ellipse(x - 8, y + 14, 8, 4, 5, -40)
    s.ink([(148, 206), (132, 210)], 1.1)
    s.ink([(172, 206), (188, 210)], 1.1)
    return s


def scene_rose() -> Scene:
    c = [
        "#f8e7ee",
        "#f3d5e2",
        "#dcead4",
        "#7eaa72",
        "#3f6d48",
        "#4d7a52",
        "#f8d5de",
        "#f0a9bb",
        "#e07b94",
        "#c44d6c",
        "#f2c56a",
        "#e39a42",
        "#fffaf6",
    ]
    s = Scene(c, {0, 1}, 31)
    s.bands(0, 0, 320, 460, [0, 1])
    s.capsule(160, 430, 160, 250, 7, 5)
    s.ellipse(108, 300, 36, 16, 3, -40)
    s.ellipse(112, 292, 22, 8, 4, -40)
    s.ellipse(214, 318, 34, 15, 3, 36)
    s.ellipse(210, 310, 18, 7, 4, 36)
    s.ellipse(86, 250, 18, 8, 3, -70)
    s.circle(160, 188, 78, 6)
    for i, (rad, shades, ang0) in enumerate(
        (
            (70, (6, 7), 0.2),
            (58, (7, 8), 0.5),
            (46, (8, 9), 0.1),
            (32, (9, 6), 0.4),
        )
    ):
        count = 8 if i < 2 else 6
        for k in range(count):
            a = ang0 + k * math.tau / count
            s.ellipse(
                160 + math.cos(a) * (rad * 0.42),
                188 + math.sin(a) * (rad * 0.42),
                rad * 0.58,
                20,
                shades[k % 2],
                math.degrees(a),
            )
    s.circle(160, 188, 16, 10)
    s.circle(160, 188, 7, 11)
    s.ellipse(70, 390, 16, 16, 7)
    s.ellipse(250, 96, 14, 14, 8)
    s.circle(48, 120, 8, 3)
    return s


def scene_sunflower() -> Scene:
    c = [
        "#8ec4e8",
        "#d7ecf8",
        "#f7e7b2",
        "#f2c94c",
        "#e2a428",
        "#c47a22",
        "#8a4e28",
        "#5c321c",
        "#6fa85a",
        "#3d6b40",
        "#e7f2dc",
        "#f7f3e8",
    ]
    s = Scene(c, {0, 1, 10}, 41)
    s.bands(0, 0, 320, 250, [0, 1])
    s.rect(0, 248, 320, 220, 10)
    s.circle(250, 64, 28, 2)
    s.capsule(168, 450, 168, 250, 8, 9)
    s.ellipse(112, 320, 40, 16, 8, -50)
    s.ellipse(116, 312, 22, 7, 9, -50)
    s.ellipse(230, 336, 36, 14, 8, 48)
    s.ellipse(226, 328, 18, 6, 9, 48)
    for k in range(18):
        a = k * math.tau / 18
        shade = 3 if k % 2 == 0 else 4
        s.ellipse(160 + math.cos(a) * 64, 168 + math.sin(a) * 64, 30, 14, shade, math.degrees(a))
    for k in range(12):
        a = 0.2 + k * math.tau / 12
        s.ellipse(160 + math.cos(a) * 34, 168 + math.sin(a) * 34, 20, 10, 5, math.degrees(a))
    s.circle(160, 168, 28, 6)
    s.circle(160, 168, 14, 7)
    s.circle(160, 168, 5, 11)
    return s


def scene_star_mandala() -> Scene:
    c = [
        "#f4e4f4",
        "#e7d0ee",
        "#f4e7c4",
        "#e2b84e",
        "#c9843a",
        "#f7f4ee",
        "#8ea0d4",
        "#4d5d98",
        "#e7a3c0",
        "#c45d84",
        "#8fb59a",
    ]
    s = Scene(c, {0}, 53)
    s.img[:] = 0
    s.ellipse(160, 230, 168, 210, 1)
    cx, cy, stretch = 160, 230, 1.22
    rings = [
        (18, 46, 8, 1.35, [8, 3], -math.pi / 2),
        (50, 78, 12, 1.05, [6, 5, 9], 0.1),
        (82, 108, 16, 1.28, [3, 7, 8], 0.2),
        (112, 142, 20, 1.02, [9, 6, 4, 5], 0.05),
        (146, 176, 24, 1.18, [7, 3, 10, 8], 0.12),
    ]
    for r0, r1, count, bulge, shades, phase in rings:
        for i in range(count):
            a0 = phase + i * math.tau / count
            a1 = a0 + math.tau / count * 0.86
            petal(s, cx, cy, r0, r1, a0, a1, shades[i % len(shades)], bulge, stretch)
    s.circle(cx, cy, 16, 3)
    s.circle(cx, cy, 7, 5)
    for i in range(10):
        a = i * math.tau / 10
        s.circle(cx + math.cos(a) * 92, cy + math.sin(a) * 92 * stretch, 5.5, 4 if i % 2 == 0 else 9)
    return s


def scene_petal_mandala() -> Scene:
    c = [
        "#fdeff3",
        "#f6c9d6",
        "#fff6ea",
        "#e7b15c",
        "#c98448",
        "#e38aa6",
        "#b84d70",
        "#7eaa78",
        "#3f6b4c",
        "#c9b6e6",
        "#7d6aa8",
        "#f7f7f4",
    ]
    s = Scene(c, {0}, 61)
    s.img[:] = 0
    cx, cy, stretch = 160, 232, 1.24
    s.ellipse(cx, cy, 170, 208, 1)
    layers = [
        (22, 58, 8, 1.55, [5, 2], -math.pi / 2),
        (60, 96, 10, 1.4, [7, 6, 3], 0.2),
        (98, 132, 14, 1.25, [9, 2, 5, 7], 0.08),
        (134, 168, 18, 1.15, [6, 10, 3, 8], 0.16),
    ]
    for r0, r1, count, bulge, shades, phase in layers:
        for i in range(count):
            a0 = phase + i * math.tau / count - 0.08
            a1 = a0 + math.tau / count * 0.78
            petal(s, cx, cy, r0, r1, a0, a1, shades[i % len(shades)], bulge, stretch)
    s.circle(cx, cy, 18, 3)
    s.circle(cx, cy, 8, 6)
    for i in range(12):
        a = -math.pi / 2 + i * math.tau / 12
        s.ellipse(cx + math.cos(a) * 78, cy + math.sin(a) * 78 * stretch, 8, 14, 4 if i % 2 == 0 else 11, math.degrees(a + math.pi / 2))
    return s


def scene_lake() -> Scene:
    c = [
        "#f6c7a8",
        "#f3a48e",
        "#e7b7c8",
        "#f8e2b8",
        "#c3b7d8",
        "#8e7eb4",
        "#6d8fbe",
        "#4e6f98",
        "#3c5478",
        "#8ea86a",
        "#5d7a48",
        "#d7e4ef",
        "#f7f1e4",
        "#6b5348",
    ]
    s = Scene(c, {0, 1, 2, 11}, 71)
    s.bands(0, 0, 320, 210, [2, 1, 0])
    s.circle(210, 118, 26, 3)
    s.poly([(0, 168), (70, 120), (120, 162), (0, 190)], 5)
    s.poly([(40, 176), (130, 108), (210, 176), (90, 188)], 7)
    s.poly([(150, 184), (230, 96), (320, 150), (320, 196), (190, 196)], 8)
    s.tri((86, 150), (100, 116), (114, 150), 10)
    s.tri((168, 156), (184, 118), (200, 156), 9)
    s.tri((248, 148), (266, 112), (284, 148), 10)
    s.rect(0, 188, 320, 200, 11)
    s.poly([(40, 230), (130, 300), (210, 250), (90, 214)], 6)
    s.poly([(150, 236), (230, 320), (320, 250), (320, 214), (190, 214)], 7)
    s.bands(0, 300, 320, 160, [12, 11, 6])
    s.rect(0, 392, 320, 70, 9)
    s.ellipse(70, 430, 26, 10, 10)
    s.ellipse(250, 424, 30, 12, 13)
    s.capsule(20, 360, 54, 392, 3, 13)
    return s


def scene_coast() -> Scene:
    c = [
        "#f7d7c4",
        "#f3b7c0",
        "#e7c4de",
        "#f6e2b4",
        "#9fd0e4",
        "#6eb0d0",
        "#4c86b0",
        "#f4e2c8",
        "#e7c8a4",
        "#c9a07a",
        "#8f6b58",
        "#f7f6f2",
        "#d98a7a",
        "#6f8f6a",
    ]
    s = Scene(c, {0, 1, 2, 4, 5, 6, 7}, 83)
    s.bands(0, 0, 320, 200, [2, 1, 0])
    s.circle(78, 78, 30, 3)
    s.poly([(0, 150), (0, 230), (90, 200), (40, 140)], 10)
    s.ellipse(36, 168, 28, 16, 13)
    s.bands(0, 188, 320, 120, [4, 5, 6])
    s.ellipse(250, 250, 34, 8, 11)
    s.poly([(228, 246), (250, 214), (272, 246)], 11)
    s.rect(0, 300, 320, 36, 8)
    s.bands(0, 332, 320, 128, [7, 9])
    s.capsule(40, 360, 280, 430, 16, 12)
    s.ellipse(120, 390, 22, 12, 10)
    s.ellipse(210, 410, 18, 10, 10)
    s.circle(64, 348, 8, 10)
    s.circle(250, 336, 6, 13)
    return s


def scene_tart() -> Scene:
    c = [
        "#f6efe6",
        "#e7d3c0",
        "#f7f7f8",
        "#d9dde6",
        "#e8c48a",
        "#c48a48",
        "#f3d2a4",
        "#c83b4a",
        "#8d2d4a",
        "#4d5ea8",
        "#f7f2ea",
        "#7eaa6e",
        "#f2e2a8",
        "#a84868",
    ]
    s = Scene(c, {0, 1}, 97)
    s.bands(0, 0, 320, 460, [0, 1])
    s.ellipse(160, 268, 132, 36, 3)
    s.ellipse(160, 258, 118, 28, 2)
    s.circle(160, 210, 92, 5)
    s.circle(160, 206, 78, 4)
    s.circle(160, 200, 62, 6)
    s.ellipse(160, 168, 20, 12, 10)
    spots = [
        (160, 150, 7),
        (132, 168, 8),
        (188, 166, 9),
        (118, 196, 7),
        (160, 188, 8),
        (204, 194, 9),
        (128, 220, 9),
        (160, 222, 7),
        (196, 220, 8),
        (146, 206, 13),
        (178, 208, 13),
    ]
    for x, y, idx in spots:
        s.circle(x, y, 13, idx)
        s.circle(x - 3, y - 3, 4.5, 12 if idx != 9 else 10)
    s.ellipse(214, 176, 16, 8, 11, 40)
    s.circle(70, 390, 12, 7)
    s.circle(250, 96, 10, 9)
    return s


def scene_tea() -> Scene:
    c = [
        "#f7e7ea",
        "#f3d3c8",
        "#fffaf6",
        "#e7e2ea",
        "#f4f7fb",
        "#d5dde8",
        "#c4555c",
        "#8f303c",
        "#e7b15a",
        "#f6e2a8",
        "#7eaa72",
        "#f2c14e",
        "#6b4a3a",
        "#c98a55",
    ]
    s = Scene(c, {0, 1}, 103)
    s.bands(0, 0, 320, 460, [0, 1])
    s.ellipse(160, 318, 108, 22, 3)
    s.ellipse(160, 308, 92, 14, 2)
    s.poly([(118, 188), (206, 188), (220, 292), (104, 292)], 6)
    s.poly([(128, 198), (196, 198), (206, 280), (118, 280)], 4)
    s.ellipse(160, 188, 48, 16, 2)
    s.ellipse(160, 190, 36, 10, 13)
    s.ellipse(160, 186, 34, 8, 8)
    s.capsule(208, 214, 246, 214, 12, 6)
    s.capsule(214, 214, 240, 214, 6, 0)
    s.capsule(208, 250, 244, 250, 11, 7)
    s.circle(78, 250, 26, 11)
    s.circle(78, 250, 18, 9)
    s.poly([(78, 232), (92, 250), (78, 268), (70, 250)], 9)
    s.ellipse(230, 188, 14, 7, 10, -20)
    s.ink([(148, 150), (140, 118), (150, 96)], 1.2)
    s.ink([(172, 146), (184, 112), (176, 88)], 1.2)
    return s


def scene_monarch() -> Scene:
    c = [
        "#f8efd8",
        "#f3e0b4",
        "#f0a03a",
        "#e07a22",
        "#2b2728",
        "#f7f4ee",
        "#c4472a",
        "#8fb0d8",
        "#f2d2c4",
    ]
    s = Scene(c, {0, 1}, 113)
    s.bands(0, 0, 320, 460, [0, 1])
    s.circle(64, 70, 16, 7)
    s.circle(250, 390, 12, 8)
    upper = [(158, 214), (118, 150), (62, 78), (36, 120), (48, 186), (96, 214), (140, 228)]
    lower = [(156, 236), (120, 250), (70, 300), (48, 352), (96, 332), (140, 268)]
    both(s, upper, 2)
    both(s, lower, 3)
    border_u = [(150, 210), (104, 132), (52, 86), (34, 132), (58, 196), (112, 220)]
    border_l = [(150, 240), (108, 268), (62, 318), (50, 356), (104, 328), (140, 270)]
    for pts in (border_u, border_l):
        s.stroke(pts, 8, 4)
        s.stroke(mirror(pts), 8, 4)
    for pts in (
        [(150, 200), (70, 110)],
        [(152, 214), (48, 160)],
        [(154, 228), (86, 250)],
        [(152, 248), (70, 310)],
    ):
        s.stroke(pts, 5.5, 4)
        s.stroke(mirror(pts), 5.5, 4)
    for x, y in ((70, 112), (48, 150), (62, 196), (78, 300), (58, 340), (100, 318)):
        s.circle(x, y, 6.5, 5)
        s.circle(320 - x, y, 6.5, 5)
    s.capsule(160, 176, 160, 300, 11, 4)
    s.circle(160, 168, 13, 4)
    s.circle(154, 166, 2.4, 5)
    s.circle(166, 166, 2.4, 5)
    s.ink([(150, 158), (132, 132), (138, 124)], 1.25)
    s.ink([(170, 158), (188, 132), (182, 124)], 1.25)
    s.circle(132, 122, 3.2, 4)
    s.circle(188, 122, 3.2, 4)
    return s


def scene_blue_wing() -> Scene:
    c = [
        "#e7f2f6",
        "#d5e6f2",
        "#7eb6e0",
        "#3d78b8",
        "#1e4d86",
        "#12325c",
        "#f7f4ee",
        "#e7c2d4",
        "#f2d78a",
        "#6fbfb8",
    ]
    s = Scene(c, {0, 1}, 127)
    s.bands(0, 0, 320, 460, [0, 1])
    s.ellipse(160, 70, 40, 12, 7)
    upper = [(156, 200), (90, 120), (40, 150), (58, 210), (120, 220)]
    lower = [(156, 228), (100, 250), (48, 310), (70, 360), (130, 280)]
    both(s, upper, 2)
    both(s, lower, 3)
    inner_u = [(156, 206), (110, 150), (78, 176), (120, 214)]
    inner_l = [(156, 236), (112, 270), (90, 320), (136, 268)]
    both(s, inner_u, 4)
    both(s, inner_l, 9)
    for pts, w in (
        ([(150, 198), (70, 140), (46, 168), (78, 214), (140, 216)], 7),
        ([(152, 230), (86, 268), (56, 330), (96, 348), (140, 270)], 7),
    ):
        s.stroke(pts, w, 5)
        s.stroke(mirror(pts), w, 5)
    for x, y, col in ((86, 160, 6), (70, 196, 8), (100, 292, 6), (78, 330, 8)):
        s.circle(x, y, 7, col)
        s.circle(320 - x, y, 7, col)
    s.capsule(160, 186, 160, 292, 9, 5)
    s.circle(160, 176, 11, 5)
    s.ink([(152, 168), (140, 142)], 1.2)
    s.ink([(168, 168), (180, 142)], 1.2)
    return s


def scene_robin() -> Scene:
    c = [
        "#d9ecf6",
        "#f7f3ea",
        "#c96a48",
        "#a84838",
        "#6a5438",
        "#4a3428",
        "#f0b14a",
        "#2e2a28",
        "#8fb56a",
        "#f7f7f4",
        "#e7d3b8",
        "#6f8fbe",
    ]
    s = Scene(c, {0}, 131)
    s.img[:] = 0
    s.ellipse(40, 80, 26, 14, 11)
    s.ellipse(270, 60, 32, 12, 11)
    s.stroke([(16, 300), (300, 268)], 16, 4)
    s.stroke([(40, 292), (18, 246)], 7, 5)
    s.ellipse(86, 214, 22, 12, 8, -30)
    s.ellipse(250, 250, 18, 10, 8, 20)
    s.ellipse(176, 214, 52, 36, 4)
    s.ellipse(214, 206, 28, 22, 2)
    s.circle(150, 176, 26, 4)
    s.tri((172, 176), (214, 168), (176, 190), 6)
    s.ellipse(196, 236, 30, 16, 5, 18)
    s.tri((130, 214), (78, 196), (120, 242), 5)
    s.circle(142, 172, 6, 9)
    s.circle(144, 173, 3, 7)
    s.stroke([(168, 250), (166, 286)], 3.2, 5)
    s.stroke([(186, 252), (192, 288)], 3.2, 5)
    s.circle(164, 292, 4, 7)
    s.circle(194, 294, 4, 7)
    s.ellipse(300, 400, 18, 18, 8)
    return s


def scene_swan() -> Scene:
    c = [
        "#d5e8f4",
        "#f7f5f2",
        "#e7eef4",
        "#b9d4e6",
        "#7eafd0",
        "#f2b7c6",
        "#e8c9a4",
        "#6b8f6a",
        "#4a6a8a",
        "#f0a03a",
        "#3a3434",
        "#d7e4c8",
    ]
    s = Scene(c, {0, 3, 4}, 149)
    s.bands(0, 0, 320, 230, [0, 3])
    s.ellipse(70, 60, 28, 12, 2)
    s.bands(0, 220, 320, 240, [4, 3, 8])
    s.ellipse(150, 250, 70, 32, 1)
    s.ellipse(168, 242, 36, 16, 2)
    s.capsule(196, 236, 230, 150, 14, 1)
    s.capsule(230, 150, 214, 108, 12, 1)
    s.circle(206, 100, 16, 1)
    s.ellipse(220, 104, 12, 5, 9, 16)
    s.circle(202, 96, 2.6, 10)
    s.ellipse(120, 246, 24, 12, 6, -20)
    s.ellipse(150, 292, 54, 12, 2)
    s.capsule(210, 300, 228, 360, 7, 2)
    s.tri((40, 360), (58, 318), (76, 360), 7)
    s.tri((250, 390), (270, 346), (290, 390), 11)
    s.ellipse(40, 400, 16, 8, 5)
    return s


def scene_cottage() -> Scene:
    c = [
        "#c5e2f4",
        "#f7e7c0",
        "#b7d48c",
        "#7ea85c",
        "#f4efe6",
        "#e3d2bc",
        "#c4554c",
        "#8f3030",
        "#6e8fbe",
        "#f7f4ea",
        "#6b4a32",
        "#3e342e",
        "#f2c14e",
        "#e7a0b4",
        "#5d4034",
        "#d7ece4",
    ]
    s = Scene(c, {0, 1, 2}, 157)
    s.bands(0, 0, 320, 250, [0, 1])
    s.circle(250, 64, 22, 15)
    s.ellipse(160, 430, 240, 130, 2)
    s.ellipse(160, 400, 180, 70, 3)
    s.ellipse(58, 250, 36, 36, 3)
    s.capsule(58, 300, 58, 360, 6, 14)
    s.rect(92, 214, 150, 112, 4)
    s.rect(100, 222, 134, 96, 5)
    s.tri((78, 220), (168, 128), (258, 220), 6)
    s.tri((96, 214), (168, 146), (240, 214), 7)
    s.rect(196, 126, 22, 52, 14)
    s.rect(192, 116, 30, 14, 10)
    s.rect(146, 256, 36, 70, 10)
    s.circle(174, 292, 3.6, 12)
    s.rect(112, 242, 32, 28, 8)
    s.rect(196, 242, 32, 28, 8)
    s.rect(118, 248, 20, 16, 9)
    s.rect(202, 248, 20, 16, 9)
    s.stroke([(118, 256), (138, 256)], 1.6, 11)
    s.stroke([(202, 256), (222, 256)], 1.6, 11)
    s.capsule(168, 360, 168, 430, 14, 5)
    for x, col in ((40, 13), (70, 12), (250, 13), (280, 6), (36, 12)):
        s.circle(x, 392, 8, col)
        s.ellipse(x, 404, 5, 8, 3)
    s.stroke([(24, 360), (300, 360)], 3, 11)
    for x in (40, 80, 120, 240, 280):
        s.stroke([(x, 360), (x, 384)], 3, 11)
    return s


def scene_city() -> Scene:
    c = [
        "#1c2744",
        "#2c3a62",
        "#3d4e7a",
        "#141b30",
        "#24324e",
        "#4e3d58",
        "#f6e2a8",
        "#f7f4ea",
        "#e7b15c",
        "#8ea0c8",
        "#c4556a",
        "#1a2238",
        "#6e8fbe",
    ]
    s = Scene(c, {0, 1, 2}, 173)
    s.bands(0, 0, 320, 220, [0, 1, 2])
    s.circle(250, 62, 20, 7)
    s.circle(242, 58, 16, 0)
    for x, y in ((40, 48), (90, 80), (180, 40), (300, 96), (150, 70)):
        s.circle(x, y, 3.5, 9)
    buildings = [
        (10, 176, 58, 230, 3),
        (74, 120, 78, 286, 4),
        (158, 86, 52, 320, 11),
        (216, 146, 92, 260, 5),
    ]
    for x, y, w, h, idx in buildings:
        s.rect(x, y, w, h, idx)
        cols = max(2, int(w // 18))
        rows = max(3, int((h - 28) // 22))
        for row in range(rows):
            for col in range(cols):
                wx = x + 8 + col * ((w - 16) / cols)
                wy = y + 12 + row * ((h - 24) / rows)
                lit = (row * 3 + col * 2 + x) % 5 == 0
                s.rect(wx, wy, 8, 11, 6 if lit else 0)
    s.rect(0, 400, 320, 60, 11)
    s.rect(40, 418, 70, 8, 8)
    s.rect(210, 424, 50, 6, 12)
    s.rect(168, 360, 22, 46, 8)
    return s


PICTURES = [
    ("cat-nap", "animals", "Cat Nap", "A curled cat in a square of sun.", scene_cat),
    ("garden-fox", "animals", "Garden Fox", "A fox sitting among the flowers.", scene_fox),
    ("open-rose", "flowers", "Open Rose", "A rose opened all the way.", scene_rose),
    ("sunflower", "flowers", "Sunflower", "A tall sunflower against the sky.", scene_sunflower),
    ("star-mandala", "mandalas", "Star Mandala", "An eight-point star, colored inward.", scene_star_mandala),
    ("petal-mandala", "mandalas", "Petal Mandala", "Rings of petals around a quiet center.", scene_petal_mandala),
    ("lake-evening", "landscapes", "Lake Evening", "Mountains resting in a still lake.", scene_lake),
    ("coast-path", "landscapes", "Coast Path", "A warm sky over a quiet shore.", scene_coast),
    ("berry-tart", "food", "Berry Tart", "A tart piled with berries.", scene_tart),
    ("lemon-tea", "food", "Lemon Tea", "Tea, a lemon, and a quiet table.", scene_tea),
    ("monarch", "butterflies", "Monarch", "Open wings in amber and black.", scene_monarch),
    ("blue-wing", "butterflies", "Blue Wing", "A butterfly the color of evening water.", scene_blue_wing),
    ("garden-robin", "birds", "Garden Robin", "A robin perched on a branch.", scene_robin),
    ("still-swan", "birds", "Still Swan", "A swan on flat water.", scene_swan),
    ("rose-cottage", "places", "Rose Cottage", "A small house behind a garden fence.", scene_cottage),
    ("night-windows", "places", "Night Windows", "A city block with a few lights on.", scene_city),
]


def build_picture(spec: tuple) -> tuple[dict, np.ndarray, list[str]]:
    pid, category, title, caption, maker = spec
    scene = maker()
    painted = scene.img.copy()
    paint_colors = list(scene.colors)
    best: tuple[list[dict], list[str], str] | None = None
    for target in (185, 160, 210, 140, 230):
        regions, colors, outline = vectorize(scene, target)
        # vectorize absorbs a copy via local img; scene.img unchanged except we pass scene
        count = len(regions)
        print(f"  {pid} target {target} -> {count} regions, {len(colors)} colors")
        if 100 <= count <= 300 and len(colors) >= 6:
            best = (regions, colors, outline)
            break
        best = (regions, colors, outline)
    if best is None:
        raise RuntimeError(pid)
    regions, colors, outline = best
    count = len(regions)
    if count < 100 or count > 300:
        raise RuntimeError(f"{pid} has {count} regions")
    picture = {
        "id": pid,
        "category": category,
        "title": title,
        "caption": caption,
        "viewBox": f"0 0 {VW} {VH}",
        "colors": colors,
        "regions": regions,
        "outline": outline,
        "ink": [{"d": d, "w": w} for d, w in scene.inks],
    }
    return picture, painted, paint_colors


def write_credits(pictures: list[dict]) -> None:
    lines = [
        "# Image credits",
        "",
        "Every coloring page in Linen is an original illustration drawn for this app.",
        "They are not copied from Happy Color, Color by Number, or any other coloring product,",
        "and they are not traced from someone else's artwork.",
        "",
        "Author: Linen",
        "License: original work, created for Linen",
        "",
    ]
    by_cat = {key: name for key, name in CATEGORIES}
    for key, name in CATEGORIES:
        lines.append(f"## {name}")
        lines.append("")
        for picture in pictures:
            if picture["category"] != key:
                continue
            lines.append(f"### {picture['title']}")
            lines.append("")
            lines.append(picture["caption"])
            lines.append("")
            lines.append(f"- **{picture['title']}**")
            lines.append("  - Author: Linen")
            lines.append("  - Source: original illustration created for Linen")
            lines.append("  - License: original work, created for Linen")
            lines.append("")
        lines.append("")
    (ROOT / "CREDITS.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    _ = by_cat


def contact_sheet(items: list[tuple[str, Image.Image]]) -> None:
    thumb_w, thumb_h = 160, 230
    cols = 4
    rows = math.ceil(len(items) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + 28)), (246, 214, 224))
    draw = ImageDraw.Draw(sheet)
    for i, (title, image) in enumerate(items):
        thumb = image.resize((thumb_w, thumb_h), Image.Resampling.BOX)
        x = (i % cols) * thumb_w
        y = (i // cols) * (thumb_h + 28)
        sheet.paste(thumb, (x, y))
        draw.text((x + 6, y + thumb_h + 6), title, fill=(90, 40, 60))
    out = Path("/tmp/linen-cbn")
    out.mkdir(parents=True, exist_ok=True)
    sheet.save(out / "sheet.png")


def raster_previews(pictures: list[dict]) -> None:
    out = Path("/tmp/linen-cbn")
    out.mkdir(parents=True, exist_ok=True)
    for picture in pictures:
        for kind in ("line", "fill"):
            svg = svg_for(picture, numbered=(kind == "line"))
            svg_path = out / f"{picture['id']}-{kind}.svg"
            png_path = out / f"{picture['id']}-{kind}.png"
            svg_path.write_text(svg, encoding="utf-8")
            subprocess.run(
                ["rsvg-convert", "-w", "200", "-h", "288", "-o", str(png_path), str(svg_path)],
                check=True,
            )


def main() -> None:
    ART.mkdir(parents=True, exist_ok=True)
    for old in ART.glob("*.json"):
        old.unlink()
    pictures = []
    paints = []
    for spec in PICTURES:
        print(spec[0])
        # Fresh scene each attempt: vectorize must not depend on mutated img.
        picture, _painted, _colors = build_picture(spec)
        # Repaint for the sheet from a clean scene.
        scene = spec[4]()
        paints.append((f"{picture['title']} {len(picture['regions'])}", paint_rgb(scene.img, scene.colors)))
        path = ART / f"{picture['id']}.json"
        path.write_text(json.dumps(picture, separators=(",", ":")), encoding="utf-8")
        pictures.append(picture)
        labeled = sum(1 for region in picture["regions"] if region["label"])
        print(f"    kept {len(picture['regions'])} regions, {labeled} numbers, {len(picture['colors'])} colors")
    write_credits(pictures)
    contact_sheet(paints)
    raster_previews(pictures)
    print("wrote", len(pictures), "pictures")


if __name__ == "__main__":
    main()
