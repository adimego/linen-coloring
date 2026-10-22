#!/usr/bin/env python3
"""Original Pink, Jewelry, and Fun Designs pages for Linen.

Drawn for this app, then passed through the same region-size cleanup as the
rest of the gallery. No third-party templates, brands, or likenesses.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from make_pages import ART, VW, VH, Scene, paint_rgb, petal, vectorize
from tidy_regions import PAGE_AREA, tidy

ROOT = Path(__file__).resolve().parents[1]


def heart(scene: Scene, cx: float, cy: float, r: float, idx: int) -> None:
    pts = []
    for i in range(28):
        t = i / 28 * math.tau
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + x * r / 18, cy + y * r / 18))
    scene.poly(pts, idx)


def star(scene: Scene, cx: float, cy: float, r: float, idx: int, points: int = 5, inner: float = 0.42) -> None:
    pts = []
    for i in range(points * 2):
        ang = -math.pi / 2 + i * math.pi / points
        rad = r if i % 2 == 0 else r * inner
        pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    scene.poly(pts, idx)


def blob_along(scene: Scene, pts: list[tuple[float, float]], radius: float, idx: int) -> None:
    for x, y in pts:
        scene.circle(x, y, radius, idx)


def resample(pts: list[tuple[float, float]], step: float) -> list[tuple[float, float]]:
    if len(pts) < 2:
        return list(pts)
    out = [pts[0]]
    carry = 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        dist = math.hypot(x1 - x0, y1 - y0)
        if dist < 1e-6:
            continue
        pos = step - carry
        while pos <= dist + 1e-6:
            t = min(1.0, pos / dist)
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
            pos += step
        carry = dist - (pos - step)
    if math.hypot(out[-1][0] - pts[-1][0], out[-1][1] - pts[-1][1]) > step * 0.4:
        out.append(pts[-1])
    return out


def beads(scene: Scene, pts: list[tuple[float, float]], radius: float, idx: int, shine: int | None = None) -> None:
    for x, y in resample(pts, max(4.0, radius * 1.15)):
        scene.circle(x, y, radius, idx)
        if shine is not None:
            scene.circle(x - radius * 0.28, y - radius * 0.28, max(2.2, radius * 0.32), shine)


def thick(scene: Scene, pts: list[tuple[float, float]], width: float, idx: int) -> None:
    scene.stroke(pts, width, idx)
    beads(scene, pts, width * 0.52, idx)


def arc_points(cx: float, cy: float, rx: float, ry: float, a0: float, a1: float, n: int) -> list[tuple[float, float]]:
    return [
        (cx + math.cos(a0 + (a1 - a0) * i / n) * rx, cy + math.sin(a0 + (a1 - a0) * i / n) * ry)
        for i in range(n + 1)
    ]


def blossom(scene: Scene, x: float, y: float, scale: float, shade: int, center: int) -> None:
    for k in range(5):
        a0 = -math.pi / 2 + k * math.tau / 5
        petal(scene, x, y, 2.4 * scale, 11 * scale, a0 - 0.34, a0 + 0.34, shade, 1.28, 1)
    scene.circle(x, y, 3.2 * scale, center)


def scene_cherry() -> Scene:
    c = [
        "#fde7ef",
        "#f7c5d6",
        "#f3a0bc",
        "#e56b93",
        "#c4476e",
        "#6d3b32",
        "#8d5344",
        "#f7f0c8",
        "#f4d0e2",
        "#c9e6c4",
        "#6ea36a",
        "#f6efe4",
        "#e7c2cf",
    ]
    s = Scene(c, {0, 1, 11}, 31)
    s.img[:] = 0
    s.bands(0, 0, 320, 360, [0, 1])
    s.circle(268, 58, 22, 7)
    s.ellipse(70, 330, 110, 48, 12)
    s.ellipse(250, 318, 120, 42, 12)
    s.ellipse(160, 500, 250, 130, 11)
    s.ellipse(50, 430, 70, 18, 10)
    s.ellipse(270, 440, 80, 20, 9)
    trunk = [(168, 452), (160, 360), (154, 280), (162, 210)]
    limbs = [
        [(160, 230), (100, 180), (36, 130)],
        [(164, 214), (220, 160), (292, 112)],
        [(156, 250), (90, 240), (28, 270)],
        [(166, 246), (230, 230), (300, 250)],
        [(158, 200), (190, 140), (214, 78)],
        [(152, 300), (90, 330), (40, 370)],
        [(170, 290), (230, 320), (286, 360)],
    ]
    for branch in [trunk, *limbs]:
        thick(s, branch, 16 if branch is trunk else 11, 5)
        thick(s, branch, 6, 6)
    spots: list[tuple[float, float]] = []
    for branch in [trunk, *limbs]:
        spots.extend(resample(branch, 26))
    for i, (x, y) in enumerate(spots):
        if y > 430:
            continue
        blossom(s, x, y, 1.05, 2 if i % 2 == 0 else 3, 7 if i % 3 else 4)
    for x, y, ang in ((64, 390, -24), (210, 400, 18), (130, 360, -8), (250, 370, 30)):
        s.ellipse(x, y, 18, 7, 10, ang)
    for i, (x, y) in enumerate(((48, 418), (110, 448), (190, 430), (250, 452), (300, 410))):
        s.ellipse(x, y, 7, 3.5, 8 if i % 2 == 0 else 3, i * 18)
    return s


def ribbon(scene: Scene, spine: list[tuple[float, float]], width0: float, width1: float, idx: int) -> None:
    """A filled band that follows a curve and tapers from width0 to width1."""
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    count = len(spine)
    for i, (x, y) in enumerate(spine):
        t = i / max(1, count - 1)
        width = width0 + (width1 - width0) * t
        if i == 0:
            dx, dy = spine[1][0] - x, spine[1][1] - y
        elif i == count - 1:
            dx, dy = x - spine[i - 1][0], y - spine[i - 1][1]
        else:
            dx, dy = spine[i + 1][0] - spine[i - 1][0], spine[i + 1][1] - spine[i - 1][1]
        mag = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / mag, dx / mag
        left.append((x + nx * width / 2, y + ny * width / 2))
        right.append((x - nx * width / 2, y - ny * width / 2))
    scene.poly(left + right[::-1], idx)


def teardrop(scene: Scene, cx: float, cy: float, rx: float, ry: float, idx: int) -> None:
    pts = []
    for i in range(48):
        angle = i / 48 * math.tau
        x = math.cos(angle)
        stretch = 1 + 0.42 * max(x, 0)
        pts.append((cx + x * rx * stretch, cy + math.sin(angle) * ry))
    scene.poly(pts, idx)


def scene_flamingo() -> Scene:
    c = [
        "#f6b89a",
        "#f08aaa",
        "#f8e0b0",
        "#fff6ea",
        "#8ec9d4",
        "#3e86a0",
        "#f7c6d4",
        "#f0a3bb",
        "#e57b9e",
        "#d45d86",
        "#b7d7a8",
        "#4e8a5c",
        "#2e3d4a",
        "#f3d2c4",
        "#e8b3c4",
    ]
    s = Scene(c, {0, 1, 4, 5}, 37)
    s.img[:] = 0
    s.bands(0, 0, 320, 250, [0, 1, 0])
    s.circle(246, 78, 28, 2)
    s.circle(246, 78, 16, 3)
    for cx, cy, rx, ry, ang in (
        (70, 58, 36, 14, -12),
        (120, 48, 28, 12, 8),
        (40, 96, 24, 10, 6),
        (180, 42, 30, 11, -6),
        (300, 110, 26, 10, 14),
    ):
        s.ellipse(cx, cy, rx, ry, 3, ang)
        s.ellipse(cx + 8, cy + 4, rx * 0.55, ry * 0.7, 2, ang)
    s.rect(0, 228, 320, 232, 5)
    s.ellipse(160, 236, 220, 18, 4)
    for y, rx in ((268, 90), (310, 120), (360, 140), (410, 110)):
        s.ellipse(150, y, rx, 7, 4)
    # Distant palms and a small flamingo, kept large enough to survive cleanup.
    s.capsule(46, 250, 40, 188, 7, 12)
    for ang in (-60, -25, 10, 42, 74):
        s.ellipse(42, 176, 28, 7, 11, ang)
    s.capsule(286, 246, 292, 196, 6, 12)
    for ang in (110, 150, 190, 230):
        s.ellipse(292, 188, 22, 6, 11, ang)
    s.ellipse(118, 214, 16, 8, 14)
    s.capsule(108, 214, 96, 186, 6, 14)
    s.circle(92, 180, 7, 6)
    # Reeds in two clumps.
    for x, lean in ((24, -18), (58, 8), (78, -6), (248, 12), (274, -10), (302, 16)):
        s.ellipse(x, 300, 8, 42, 11 if x < 160 else 10, lean)
        s.ellipse(x + 6, 318, 7, 28, 10, lean + 16)
    # Teardrop body, then a neck that starts inside it and narrows toward the head.
    teardrop(s, 206, 312, 52, 30, 7)
    spine = resample(
        [(176, 304), (150, 322), (122, 300), (108, 250), (118, 198), (142, 156), (164, 128)],
        5,
    )
    ribbon(s, spine, 20, 14, 6)
    hx, hy = spine[-1]
    s.ellipse(hx + 8, hy - 6, 22, 15, 6, -16)
    s.ellipse(hx - 2, hy - 10, 11, 8, 12)
    beak = resample([(hx + 16, hy + 2), (hx + 34, hy + 16), (hx + 42, hy + 32)], 4)
    ribbon(s, beak, 12, 10, 13)
    tip = resample([(hx + 38, hy + 26), (hx + 52, hy + 46)], 3)
    ribbon(s, tip, 12, 10, 12)
    # Layered wing and tail feathers in close pinks.
    for i, ang in enumerate((-62, -40, -18, 4, 24)):
        s.ellipse(214, 304, 36, 9, 8 if i % 2 == 0 else 9, ang)
    for i, ang in enumerate((-28, -6, 16)):
        s.ellipse(228, 318, 28, 7, 9 if i % 2 else 8, ang)
    for i, ang in enumerate((18, 36, 52)):
        s.ellipse(246, 322, 26, 7, 9 if i == 1 else 7, ang)
    # Standing leg, knee bent back, webbed foot. Tucked leg against the belly.
    standing = resample([(198, 334), (186, 372), (208, 396), (190, 436)], 4)
    ribbon(s, standing, 13, 11, 14)
    s.ellipse(176, 444, 12, 5, 14, -16)
    s.ellipse(192, 448, 11, 4.5, 14, 0)
    s.ellipse(208, 444, 12, 5, 14, 18)
    tucked = resample([(220, 328), (242, 308), (232, 284)], 4)
    ribbon(s, tucked, 12, 11, 14)
    s.ellipse(226, 276, 10, 4.5, 14, 24)
    # Broken reflection under the bird.
    s.ellipse(196, 390, 48, 12, 13)
    s.ellipse(168, 408, 22, 6, 6)
    s.ellipse(150, 424, 14, 5, 6)
    for y in (378, 400, 422):
        s.ellipse(190, y, 70, 5, 4)
    return s


def scene_peony() -> Scene:
    c = [
        "#fdeef3",
        "#f8d0de",
        "#f3a9c2",
        "#e5789e",
        "#c44772",
        "#f7e1ea",
        "#fff6f8",
        "#d7efc8",
        "#8fbf78",
        "#4f8a52",
        "#f6e7b8",
        "#e7b15c",
    ]
    s = Scene(c, {0}, 41)
    s.img[:] = 0
    s.ellipse(160, 250, 150, 190, 1)
    cx, cy = 160, 210
    layers = [
        (18, 48, 8, 1.5, [5, 2]),
        (42, 78, 12, 1.35, [2, 3, 5]),
        (72, 112, 16, 1.25, [3, 4, 2]),
        (104, 142, 18, 1.15, [4, 3, 11]),
    ]
    for r0, r1, count, bulge, shades in layers:
        for i in range(count):
            a0 = -math.pi / 2 + i * math.tau / count
            petal(s, cx, cy, r0, r1, a0 - 0.28, a0 + 0.28, shades[i % len(shades)], bulge, 1.05)
    s.circle(cx, cy, 16, 10)
    s.circle(cx, cy, 7, 6)
    s.capsule(160, 360, 160, 450, 6, 9)
    for ang, side in ((-50, -1), (50, 1), (-20, -1), (24, 1)):
        s.ellipse(160 + side * 36, 390, 28, 12, 8 if side < 0 else 7, ang)
    s.ellipse(48, 400, 30, 16, 8, -20)
    s.ellipse(276, 410, 28, 14, 9, 18)
    return s


def scene_cupcakes() -> Scene:
    c = [
        "#f7d5e2",
        "#fff8f4",
        "#f3b7cc",
        "#e56f96",
        "#c4476e",
        "#f6e2b0",
        "#e7b15c",
        "#f7f1e8",
        "#d8b08a",
        "#8d5a3c",
        "#f25b6a",
        "#7dce8a",
        "#c9a6e6",
    ]
    s = Scene(c, {0}, 43)
    s.img[:] = 0
    for col in range(4):
        for row in range(4):
            s.circle(36 + col * 84, 36 + row * 72, 10, 2 if (col + row) % 2 == 0 else 12)
    s.rect(0, 292, 320, 168, 1)
    s.ellipse(160, 300, 200, 18, 7)
    s.ellipse(160, 430, 54, 14, 9)
    s.capsule(160, 318, 160, 424, 9, 8)
    s.ellipse(160, 308, 128, 20, 7)
    s.ellipse(160, 300, 108, 14, 1)
    spots = [(78, 168), (160, 150), (242, 168)]
    for i, (x, y) in enumerate(spots):
        s.poly([(x - 30, y + 28), (x + 30, y + 28), (x + 22, y + 96), (x - 22, y + 96)], 8)
        for k in range(4):
            s.rect(x - 24, y + 32 + k * 16, 48, 10, 9 if k % 2 == 0 else 5)
        s.ellipse(x, y + 24, 34, 16, 2 if i != 1 else 3)
        s.circle(x - 8, y + 4, 16, 3 if i != 1 else 4)
        s.circle(x + 12, y + 8, 14, 4 if i == 0 else 6)
        s.circle(x, y - 16, 8, 10)
        s.ellipse(x, y + 100, 28, 7, 7)
    heart(s, 160, 64, 18, 4)
    return s


def scene_vanity() -> Scene:
    c = [
        "#f8d6e4",
        "#f3b4cb",
        "#fff7f4",
        "#e7eef6",
        "#f6e2ee",
        "#d9a07a",
        "#c9845a",
        "#f7f1c8",
        "#e7b15c",
        "#e36d97",
        "#c4476e",
        "#8d5344",
        "#f7f7f8",
        "#c9b6e6",
    ]
    s = Scene(c, {0}, 47)
    s.img[:] = 0
    s.rect(0, 250, 320, 210, 2)
    s.ellipse(160, 268, 190, 20, 4)
    s.rect(36, 300, 248, 16, 5)
    s.rect(48, 316, 16, 110, 6)
    s.rect(256, 316, 16, 110, 6)
    s.ellipse(160, 150, 78, 100, 12)
    s.ellipse(160, 150, 64, 84, 3)
    s.ellipse(148, 132, 22, 30, 4)
    s.ellipse(176, 160, 14, 20, 1)
    s.rect(118, 48, 84, 12, 8)
    s.rect(150, 28, 20, 24, 11)
    s.rect(70, 262, 18, 36, 13)
    s.circle(79, 258, 8, 9)
    s.rect(108, 268, 16, 28, 7)
    s.circle(116, 264, 7, 10)
    s.ellipse(210, 274, 22, 10, 1)
    s.circle(196, 268, 5, 9)
    s.circle(224, 270, 5, 8)
    s.capsule(248, 250, 270, 210, 3, 11)
    s.ellipse(160, 400, 46, 16, 10)
    s.rect(136, 400, 48, 10, 6)
    s.capsule(136, 410, 136, 450, 4, 11)
    s.capsule(184, 410, 184, 450, 4, 11)
    return s


def scene_bedroom() -> Scene:
    c = [
        "#f7d0e0",
        "#f3b0c6",
        "#fff6f4",
        "#f7e7ef",
        "#e7eef8",
        "#9ec4e6",
        "#f6d7a8",
        "#e7b15c",
        "#c98468",
        "#8d5344",
        "#f7f3ea",
        "#e36d97",
        "#c4476e",
        "#d7efd0",
    ]
    s = Scene(c, {0, 3}, 53)
    s.img[:] = 0
    s.rect(0, 300, 320, 160, 10)
    s.ellipse(200, 390, 90, 28, 13)
    s.rect(70, 48, 120, 140, 4)
    s.rect(82, 60, 96, 116, 5)
    s.rect(118, 60, 8, 116, 2)
    s.rect(40, 70, 36, 150, 1)
    s.rect(184, 70, 36, 150, 11)
    s.rect(36, 230, 248, 28, 9)
    s.rect(48, 250, 230, 70, 2)
    s.rect(56, 258, 214, 28, 3)
    s.ellipse(110, 268, 28, 16, 1)
    s.ellipse(168, 266, 32, 18, 11)
    s.ellipse(214, 272, 22, 14, 2)
    s.rect(48, 292, 230, 36, 12)
    s.rect(250, 250, 36, 16, 8)
    s.rect(258, 210, 8, 44, 9)
    s.ellipse(262, 200, 16, 10, 6)
    s.rect(250, 188, 24, 8, 7)
    s.circle(40, 40, 8, 7)
    heart(s, 286, 48, 14, 12)
    return s


def scene_ring() -> Scene:
    c = [
        "#2c2438",
        "#4a3d5c",
        "#6a5878",
        "#f3e2b0",
        "#e7c56a",
        "#c9843a",
        "#f7f4ee",
        "#d7ecf8",
        "#7eb6e2",
        "#3d78b4",
        "#f4b4c8",
        "#e36d97",
        "#c9f0e4",
    ]
    s = Scene(c, {0, 1}, 61)
    s.img[:] = 0
    s.ellipse(160, 250, 200, 230, 1)
    s.ellipse(70, 90, 48, 28, 2, -18)
    s.ellipse(250, 400, 60, 30, 2, 16)
    # Closed band: gold ring with a velvet hole.
    s.ellipse(160, 286, 96, 112, 4)
    s.ellipse(160, 292, 58, 72, 0)
    s.ellipse(160, 210, 78, 16, 3)
    s.ellipse(160, 360, 70, 12, 5)
    # Prongs from the band up into the stone.
    for dx in (-28, 28):
        s.capsule(160 + dx, 214, 160 + dx * 0.72, 168, 4.5, 4)
    s.capsule(160, 200, 160, 156, 4.5, 3)
    # Faceted stone sitting in the setting.
    s.poly([(160, 118), (214, 176), (160, 214), (106, 176)], 6)
    s.poly([(160, 118), (214, 176), (160, 168)], 8)
    s.poly([(160, 118), (106, 176), (160, 168)], 7)
    s.poly([(106, 176), (214, 176), (160, 214)], 9)
    s.circle(160, 168, 8, 11)
    for ang in (-0.9, -0.35, 0.35, 0.9):
        s.circle(160 + math.cos(ang) * 78, 250 + math.sin(ang) * 36, 8, 10 if ang < 0 else 12)
    star(s, 48, 360, 14, 3, 4, 0.4)
    star(s, 270, 80, 12, 11, 4, 0.4)
    return s


def scene_pearls() -> Scene:
    c = [
        "#5c3a48",
        "#8d4d5e",
        "#fbf7f2",
        "#f3e6d0",
        "#e7d2a8",
        "#c98468",
        "#e7c56a",
        "#f7f1c8",
        "#d9c6aa",
        "#b7d8e6",
        "#7ea4c0",
        "#f4c2d0",
    ]
    s = Scene(c, {0, 1}, 67)
    s.img[:] = 0
    s.ellipse(160, 240, 210, 250, 1)
    s.ellipse(60, 70, 50, 28, 11, -16)
    s.ellipse(260, 410, 70, 30, 8, 14)
    s.poly([(18, 18), (110, 8), (86, 120), (8, 96)], 8)
    strand = arc_points(160, 230, 108, 150, -math.pi * 0.92, math.pi * 0.92, 28)
    beads(s, strand, 15, 2, 7)
    left, right = strand[0], strand[-1]
    # Clasp bridges the two ends and overlaps both pearls.
    s.capsule(left[0], left[1], right[0], right[1], 6, 6)
    s.rect((left[0] + right[0]) / 2 - 10, (left[1] + right[1]) / 2 - 8, 20, 16, 5)
    s.circle((left[0] + right[0]) / 2, (left[1] + right[1]) / 2, 4, 4)
    return s


def scene_earrings() -> Scene:
    c = [
        "#f7efe6",
        "#e7d5c4",
        "#f3e2b0",
        "#e7c56a",
        "#b8873e",
        "#f7f7f4",
        "#d5ecf6",
        "#6aa8d4",
        "#f4b4c8",
        "#e36d97",
        "#c9f0e4",
        "#3e9a86",
        "#c9b6e6",
    ]
    s = Scene(c, {0}, 71)
    s.img[:] = 0
    s.ellipse(160, 240, 200, 250, 1)
    s.rect(36, 36, 248, 388, 0)
    s.rect(48, 48, 224, 364, 1)
    for i, x in enumerate((112, 208)):
        hook = arc_points(x, 92, 18, 26, math.pi * 0.85, math.pi * 1.75, 10)
        thick(s, hook, 6, 4)
        s.circle(x, 118, 8, 3)
        s.capsule(x, 124, x, 148, 3.2, 4)
        s.poly([(x, 146), (x + 26, 196), (x, 214), (x - 26, 196)], 6 if i == 0 else 8)
        s.poly([(x, 156), (x + 16, 194), (x, 188)], 7 if i == 0 else 9)
        s.circle(x, 236, 18, 2 if i == 0 else 10)
        s.circle(x - 5, 230, 6, 5)
        s.capsule(x, 252, x, 274, 3.4, 3)
        s.poly([(x, 270), (x + 16, 312), (x, 334), (x - 16, 312)], 12 if i == 0 else 4)
        s.circle(x, 352, 10, 3)
    star(s, 64, 400, 12, 3, 4, 0.4)
    star(s, 256, 70, 12, 9, 4, 0.4)
    return s


def scene_brooch() -> Scene:
    c = [
        "#243044",
        "#3d4e68",
        "#f3e2b0",
        "#e7c56a",
        "#f7f4ee",
        "#f4b4c8",
        "#e36d97",
        "#c4476e",
        "#d5ecf6",
        "#3d78b4",
        "#c9f0e4",
        "#2f8f78",
        "#c9b6e6",
    ]
    s = Scene(c, {0}, 73)
    s.img[:] = 0
    s.ellipse(160, 230, 140, 160, 1)
    for i in range(8):
        a = -math.pi / 2 + i * math.tau / 8
        petal(s, 160, 230, 28, 92, a - 0.32, a + 0.32, 2 if i % 2 == 0 else 3, 1.2, 1)
        s.circle(160 + math.cos(a) * 70, 230 + math.sin(a) * 70, 12, [5, 8, 10, 12][i % 4])
        s.circle(160 + math.cos(a) * 70, 230 + math.sin(a) * 70, 5, 4)
    s.circle(160, 230, 24, 6)
    s.circle(160, 230, 12, 9)
    s.circle(160, 230, 5, 4)
    s.capsule(160, 330, 160, 400, 4, 3)
    s.ellipse(160, 408, 16, 6, 2)
    return s


def scene_necklace() -> Scene:
    c = [
        "#f6efe8",
        "#e7d5c8",
        "#f3e2b0",
        "#e7c56a",
        "#b8873e",
        "#f7f4ee",
        "#f4b4c8",
        "#e36d97",
        "#7eb6e2",
        "#3d78b4",
        "#c9f0e4",
        "#8d5344",
    ]
    s = Scene(c, {0, 1}, 79)
    s.img[:] = 0
    s.ellipse(160, 250, 210, 250, 1)
    # A display bust, not a person: neck form only.
    s.ellipse(160, 150, 78, 96, 11)
    s.ellipse(160, 210, 110, 36, 1)
    chain = arc_points(160, 168, 108, 78, 0.25, math.pi - 0.25, 26)
    beads(s, chain, 7.5, 3, 5)
    # Drop the chain into the bail so the pendant is attached.
    end = chain[len(chain) // 2]
    s.capsule(end[0], end[1], 160, 248, 5, 4)
    s.circle(160, 252, 10, 2)
    s.poly([(160, 258), (198, 320), (160, 372), (122, 320)], 4)
    s.poly([(160, 274), (184, 322), (160, 354), (136, 322)], 6)
    s.poly([(160, 286), (172, 322), (160, 340)], 8)
    s.circle(160, 322, 8, 9)
    s.circle(160, 384, 9, 2)
    s.ellipse(64, 360, 36, 16, 10, -18)
    s.ellipse(256, 380, 32, 14, 7, 16)
    return s


def scene_jewel_box() -> Scene:
    c = [
        "#f4e4ea",
        "#e7b7c8",
        "#8d3d58",
        "#f7f3ea",
        "#e7c9a4",
        "#c9845a",
        "#f3e2b0",
        "#e7c56a",
        "#f7f7f4",
        "#7eb6e2",
        "#e36d97",
        "#3e9a86",
        "#5c3a48",
        "#fff6f8",
    ]
    s = Scene(c, {0}, 83)
    s.img[:] = 0
    s.ellipse(160, 250, 210, 250, 1)
    s.rect(0, 360, 320, 100, 11)
    s.ellipse(160, 368, 180, 16, 0)
    # Open lid, hinged on the box and fully on the page.
    s.poly([(46, 188), (78, 48), (242, 48), (274, 188)], 1)
    s.poly([(70, 170), (94, 68), (226, 68), (250, 170)], 13)
    s.ellipse(160, 118, 48, 22, 8)
    s.capsule(160, 188, 160, 206, 8, 2)
    # Box body.
    s.rect(44, 198, 232, 168, 4)
    s.rect(60, 214, 200, 92, 3)
    # Drawer pulled forward, still attached under the box.
    s.rect(58, 312, 204, 54, 5)
    s.rect(70, 324, 180, 30, 4)
    s.circle(160, 340, 7, 6)
    # Contents sitting in the tray.
    s.ellipse(112, 258, 30, 16, 6)
    s.ellipse(112, 258, 16, 9, 0)
    s.circle(168, 246, 11, 8)
    s.circle(190, 258, 11, 7)
    s.circle(176, 270, 11, 8)
    s.poly([(214, 230), (240, 258), (214, 278), (188, 258)], 9)
    s.circle(214, 256, 6, 10)
    s.rect(148, 188, 24, 16, 6)
    s.circle(160, 204, 6, 12)
    return s


def scene_kaleidoscope() -> Scene:
    c = [
        "#1d2438",
        "#f7e7c8",
        "#e7b15c",
        "#e36d97",
        "#c4476e",
        "#7eb6e2",
        "#3d78b4",
        "#c9f0e4",
        "#2f8f78",
        "#c9b6e6",
        "#f7f4ee",
        "#f4b4c8",
    ]
    s = Scene(c, {0}, 89)
    s.img[:] = 0
    cx, cy = 160, 230
    s.circle(cx, cy, 168, 1)
    for i in range(12):
        a = i * math.tau / 12
        s.poly(
            [
                (cx + math.cos(a) * 20, cy + math.sin(a) * 20),
                (cx + math.cos(a + 0.26) * 168, cy + math.sin(a + 0.26) * 168),
                (cx + math.cos(a - 0.26) * 168, cy + math.sin(a - 0.26) * 168),
            ],
            10 if i % 2 == 0 else 4,
        )
    for ring, r in enumerate((40, 72, 108, 146)):
        count = 8 + ring * 2
        for i in range(count):
            a0 = i * math.tau / count
            a1 = a0 + math.tau / count * 0.82
            shade = [2, 3, 5, 7, 9, 11][(i + ring) % 6]
            petal(s, cx, cy, r * 0.62, r, a0, a1, shade, 1.05, 1)
    s.circle(cx, cy, 18, 2)
    s.circle(cx, cy, 8, 6)
    return s


def scene_hearts_stars() -> Scene:
    c = [
        "#fff6f4",
        "#f7d0e0",
        "#e36d97",
        "#c4476e",
        "#f6e2b0",
        "#e7b15c",
        "#7eb6e2",
        "#3d78b4",
        "#c9f0e4",
        "#2f8f78",
        "#c9b6e6",
        "#f7f4ee",
    ]
    s = Scene(c, set(), 97)
    s.img[:] = 0
    shades = [1, 4, 6, 8, 10, 11]
    for row in range(6):
        for col in range(4):
            x, y = col * 80, row * 78
            s.rect(x, y, 82, 80, shades[(row + col) % len(shades)])
            if (row + col) % 2 == 0:
                heart(s, x + 40, y + 42, 22, 2 if row % 2 == 0 else 3)
            else:
                star(s, x + 40, y + 40, 22, 5 if col % 2 == 0 else 7)
    return s


def scene_swirls() -> Scene:
    c = [
        "#2a2438",
        "#f6d56a",
        "#e07a45",
        "#e36d97",
        "#c4476e",
        "#7eb6e2",
        "#f7f4ee",
        "#c9f0e4",
        "#2f8f78",
        "#c9b6e6",
        "#f4b4c8",
        "#f7e7c4",
    ]
    s = Scene(c, {0}, 101)
    s.img[:] = 0
    centers = [(90, 130), (230, 150), (70, 320), (210, 330), (160, 230)]
    cols = [1, 3, 5, 7, 9]
    for (cx, cy), col in zip(centers, cols):
        pts = []
        for i in range(48):
            t = i / 47
            ang = t * math.tau * 2.2
            rad = 8 + t * 48
            pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad * 1.15))
        s.stroke(pts, 8, col)
        s.circle(cx, cy, 8, 6 if col != 6 else 2)
    for i in range(14):
        s.circle(30 + (i * 47) % 270, 40 + (i * 83) % 390, 7, [2, 4, 10, 11][i % 4])
    return s


def scene_doodles() -> Scene:
    c = [
        "#fff8f2",
        "#f6d56a",
        "#e07a45",
        "#e36d97",
        "#7eb6e2",
        "#2f8f78",
        "#c9b6e6",
        "#5c3a48",
        "#f7f4ee",
        "#c4476e",
        "#3d78b4",
        "#f4b4c8",
    ]
    s = Scene(c, {0}, 103)
    s.img[:] = 0
    star(s, 70, 70, 28, 1)
    star(s, 250, 90, 24, 3)
    s.circle(160, 80, 26, 4)
    s.circle(148, 74, 18, 0)
    heart(s, 70, 180, 26, 9)
    heart(s, 250, 190, 22, 11)
    s.ellipse(160, 190, 36, 22, 5)
    s.circle(160, 184, 8, 8)
    for i in range(6):
        a = -math.pi / 2 + i * math.tau / 6
        petal(s, 160, 280, 8, 28, a - 0.4, a + 0.4, 3 if i % 2 == 0 else 6, 1.3, 1)
    s.circle(160, 280, 8, 1)
    star(s, 60, 300, 18, 10, 4, 0.4)
    star(s, 260, 310, 20, 2, 6, 0.5)
    s.ellipse(80, 400, 40, 18, 4)
    s.ellipse(230, 400, 46, 16, 5)
    s.circle(160, 390, 16, 9)
    s.capsule(40, 140, 120, 120, 4, 7)
    s.capsule(200, 140, 290, 150, 4, 7)
    for i, (x, y) in enumerate(((40, 240), (280, 250), (40, 360), (290, 360), (160, 140))):
        s.circle(x, y, 8, [1, 3, 5, 6, 10][i])
    return s


def scene_stained_glass() -> Scene:
    c = [
        "#2a2430",
        "#f6d56a",
        "#e07a45",
        "#e36d97",
        "#c4476e",
        "#7eb6e2",
        "#3d78b4",
        "#c9f0e4",
        "#2f8f78",
        "#c9b6e6",
        "#f7f4ee",
        "#f4b4c8",
        "#8d5344",
    ]
    s = Scene(c, set(), 107)
    s.img[:] = 0
    s.rect(0, 0, 320, 460, 0)
    s.rect(28, 36, 264, 390, 10)
    # Arch by covering corners.
    s.circle(160, 120, 110, 1)
    s.rect(36, 120, 248, 290, 5)
    leads = [
        (160, 36, 160, 426),
        (36, 180, 284, 180),
        (36, 280, 284, 280),
        (36, 120, 284, 220),
        (284, 120, 36, 220),
    ]
    for x0, y0, x1, y1 in leads:
        s.capsule(x0, y0, x1, y1, 4.5, 0)
    panes = [
        (80, 150, 2),
        (230, 150, 6),
        (160, 150, 1),
        (70, 230, 3),
        (160, 230, 7),
        (250, 230, 9),
        (70, 340, 8),
        (160, 340, 11),
        (250, 340, 4),
        (110, 400, 12),
        (210, 400, 2),
    ]
    for x, y, idx in panes:
        s.circle(x, y, 22, idx)
    s.rect(20, 20, 280, 16, 0)
    s.rect(20, 420, 280, 18, 0)
    s.rect(16, 20, 18, 420, 0)
    s.rect(286, 20, 18, 420, 0)
    return s


def scene_quilt() -> Scene:
    c = [
        "#f7f3ea",
        "#f4b4c8",
        "#e36d97",
        "#c4476e",
        "#f6e2b0",
        "#e7b15c",
        "#7eb6e2",
        "#3d78b4",
        "#c9f0e4",
        "#2f8f78",
        "#c9b6e6",
        "#8d5344",
        "#fffdf8",
    ]
    s = Scene(c, {0}, 109)
    s.img[:] = 0
    s.rect(16, 16, 288, 428, 11)
    patterns = [1, 6, 4, 8, 2, 10, 5, 7, 9, 3, 1, 6]
    for i in range(12):
        col, row = i % 3, i // 3
        x, y = 32 + col * 88, 32 + row * 100
        base = patterns[i]
        alt = patterns[(i + 3) % 12]
        s.rect(x, y, 80, 92, 12)
        if i % 4 == 0:
            s.poly([(x + 4, y + 4), (x + 76, y + 4), (x + 40, y + 88)], base)
            s.poly([(x + 4, y + 4), (x + 4, y + 88), (x + 40, y + 46)], alt)
            s.poly([(x + 76, y + 4), (x + 76, y + 88), (x + 40, y + 46)], 5 if base != 5 else 7)
        elif i % 4 == 1:
            s.rect(x + 6, y + 6, 68, 80, base)
            s.rect(x + 20, y + 20, 40, 52, alt)
            s.rect(x + 32, y + 34, 16, 24, 12)
        elif i % 4 == 2:
            for k in range(4):
                s.rect(x + 6, y + 6 + k * 20, 68, 16, base if k % 2 == 0 else alt)
        else:
            s.rect(x + 6, y + 6, 68, 80, base)
            s.poly([(x + 40, y + 14), (x + 66, y + 46), (x + 40, y + 78), (x + 14, y + 46)], alt)
            s.circle(x + 40, y + 46, 8, 12)
    return s


PICTURES = [
    ("cherry-blossoms", "pink", "Cherry Blossoms", "A blossoming tree against the sky.", scene_cherry),
    ("flamingo", "pink", "Flamingo", "An elegant flamingo in a sunset lagoon.", scene_flamingo),
    ("peony", "pink", "Peony", "A full peony with soft leaves.", scene_peony),
    ("pink-cupcakes", "pink", "Pink Cupcakes", "Three cupcakes on a cake stand.", scene_cupcakes),
    ("vanity-table", "pink", "Vanity Table", "A mirror, a few bottles, and a pink stool.", scene_vanity),
    ("pink-bedroom", "pink", "Pink Bedroom", "A bed, curtains, and a small lamp.", scene_bedroom),
    ("gem-ring", "jewelry", "Gem Ring", "A closed gold band with a faceted stone.", scene_ring),
    ("pearl-strand", "jewelry", "Pearl Strand", "A full strand of pearls with a clasp.", scene_pearls),
    ("drop-earrings", "jewelry", "Drop Earrings", "A matching pair, from hook to drop.", scene_earrings),
    ("gem-brooch", "jewelry", "Gem Brooch", "A flower brooch set with round stones.", scene_brooch),
    ("pendant-necklace", "jewelry", "Pendant Necklace", "A chain joined to a teardrop pendant.", scene_necklace),
    ("jewelry-box", "jewelry", "Jewelry Box", "An open box with a lid, a drawer, and a few pieces.", scene_jewel_box),
    ("kaleidoscope", "fun-designs", "Kaleidoscope", "A geometric kaleidoscope in candy colors.", scene_kaleidoscope),
    ("hearts-and-stars", "fun-designs", "Hearts and Stars", "A repeating pattern of hearts and stars.", scene_hearts_stars),
    ("retro-swirls", "fun-designs", "Retro Swirls", "Candy-colored swirls on a dark ground.", scene_swirls),
    ("doodle-collage", "fun-designs", "Doodle Collage", "Stars, moons, hearts, and little flowers.", scene_doodles),
    ("stained-glass", "fun-designs", "Stained Glass", "An arched window of colored panes.", scene_stained_glass),
    ("quilt-blocks", "fun-designs", "Quilt Blocks", "A patchwork of simple quilt squares.", scene_quilt),
]


def build_one(spec: tuple) -> dict:
    pid, category, title, caption, maker = spec
    scene = maker()
    best = None
    for target in (170, 150, 190, 130):
        regions, colors, outline = vectorize(scene, target)
        count = len(regions)
        print(f"  {pid} target {target} -> {count} regions, {len(colors)} colors", flush=True)
        best = (regions, colors, outline, count)
        if 100 <= count <= 260 and 6 <= len(colors) <= 16:
            break
    if best is None:
        raise RuntimeError(pid)
    regions, colors, outline, count = best
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
    picture, summary = tidy(picture)
    summary["before_count"] = count
    print(
        f"    tidy {count} -> {summary['after_count']}  "
        f"min {summary['after_radius'] * 2 * (390 / 320):.1f}px  colors {summary['colors']}",
        flush=True,
    )
    if summary["after_count"] < 80 or summary["after_count"] > 300:
        raise RuntimeError(f"{pid} has {summary['after_count']} regions after cleanup")
    if not 6 <= summary["colors"] <= 24:
        raise RuntimeError(f"{pid} has {summary['colors']} colors")
    if summary["after_radius"] * 2 * (390 / 320) < 14:
        raise RuntimeError(f"{pid} smallest diameter is too small")
    return picture, summary


def append_audit(rows: list[dict]) -> None:
    audit = ROOT / "REGION_AUDIT.md"
    text = audit.read_text(encoding="utf-8")
    lines = [line for line in text.splitlines() if not line.startswith("| ") or line.startswith("| Picture") or line.startswith("| ---")]
    # Keep the header and rebuild every data row, including the ones already there.
    existing = []
    for line in text.splitlines():
        if line.startswith("| ") and not line.startswith("| Picture") and not line.startswith("| ---"):
            title = [part.strip() for part in line.strip("|").split("|")][0]
            if title in {row["title"] for row in rows}:
                continue
            existing.append(line)
    fresh = []
    for row in rows:
        fresh.append(
            "| {title} | {category} | {before} | {ba:.2f}% | {bd:.1f}px | {after} | {aa:.2f}% | {ad:.1f}px |".format(
                title=row["title"],
                category=row["category"],
                before=row["before_count"],
                ba=100 * row["before_area"] / PAGE_AREA,
                bd=row["before_radius"] * 2 * (390 / 320),
                after=row["after_count"],
                aa=100 * row["after_area"] / PAGE_AREA,
                ad=row["after_radius"] * 2 * (390 / 320),
            )
        )
    merged = existing + fresh
    # Stable enough: category column is field 2.
    def key(line: str) -> tuple[str, str]:
        parts = [part.strip() for part in line.strip("|").split("|")]
        return (parts[1], parts[0])

    merged.sort(key=key)
    header = []
    for line in text.splitlines():
        header.append(line)
        if line.startswith("| ---"):
            break
    audit.write_text("\n".join(header + merged) + "\n", encoding="utf-8")


def append_credits(pictures: list[dict]) -> None:
    path = ROOT / "CREDITS.md"
    text = path.read_text(encoding="utf-8")
    note = "Pink, Jewelry, and Fun Designs are original illustrations drawn for this app."
    if note not in text:
        text = text.replace(
            "Every other coloring page is an original illustration drawn for this app.\n",
            "Every other coloring page is an original illustration drawn for this app.\n" + note + "\n",
        )
    names = {"pink": "Pink", "jewelry": "Jewelry", "fun-designs": "Fun Designs"}
    blocks = ["", ""]
    for key, name in names.items():
        blocks.append(f"## {name}")
        blocks.append("")
        blocks.append("Original illustrations created for Linen. No brands, logos, or third-party templates.")
        blocks.append("")
        for picture in pictures:
            if picture["category"] != key:
                continue
            blocks.append(f"### {picture['title']}")
            blocks.append("")
            blocks.append(picture["caption"])
            blocks.append("")
            blocks.append(f"- **{picture['title']}**")
            blocks.append("  - Author: Linen")
            blocks.append("  - Source: original illustration created for Linen")
            blocks.append("  - License: original work, created for Linen")
            blocks.append("")
        blocks.append("")
    addition = "\n".join(blocks).rstrip() + "\n"
    if "## Pink" not in text:
        text = text.rstrip() + "\n" + addition
    path.write_text(text, encoding="utf-8")


def previews() -> None:
    out = Path("/tmp/newsets")
    out.mkdir(parents=True, exist_ok=True)
    thumbs = []
    for spec in PICTURES:
        scene = spec[4]()
        image = paint_rgb(scene.img, scene.colors).resize((160, 230), Image.Resampling.BOX)
        image.save(out / f"{spec[0]}.png")
        thumbs.append(image)
        print(spec[0])
    sheet = Image.new("RGB", (160 * 6, 230 * 3), (255, 255, 255))
    for i, image in enumerate(thumbs):
        sheet.paste(image, ((i % 6) * 160, (i // 6) * 230))
    sheet.save(out / "sheet.png")


def _install_rich_scenes() -> None:
    import sys

    scenes = getattr(sys.modules.get("rich_scenes"), "SCENES", None)
    if not scenes:
        return
    global PICTURES
    PICTURES = [
        (pid, category, title, caption, scenes.get(pid, maker))
        for pid, category, title, caption, maker in PICTURES
    ]


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "preview":
        ids = set(sys.argv[2:])
        if not ids:
            previews()
            return
        out = Path("/tmp/newsets")
        out.mkdir(parents=True, exist_ok=True)
        for spec in PICTURES:
            if spec[0] not in ids:
                continue
            scene = spec[4]()
            paint_rgb(scene.img, scene.colors).resize((220, 316), Image.Resampling.BOX).save(out / f"{spec[0]}.png")
            print(spec[0])
        return
    if len(sys.argv) > 1 and sys.argv[1] == "rebuild":
        wanted = set(sys.argv[2:])
        summaries = []
        for spec in PICTURES:
            if spec[0] not in wanted:
                continue
            print(spec[0], flush=True)
            picture, summary = build_one(spec)
            (ART / f"{picture['id']}.json").write_text(json.dumps(picture, separators=(",", ":")), encoding="utf-8")
            summaries.append(summary)
        append_audit(summaries)
        return
    summaries = []
    pictures = []
    for spec in PICTURES:
        print(spec[0], flush=True)
        picture, summary = build_one(spec)
        path = ART / f"{picture['id']}.json"
        path.write_text(json.dumps(picture, separators=(",", ":")), encoding="utf-8")
        pictures.append(picture)
        summaries.append(summary)
    append_audit(summaries)
    append_credits(pictures)
    print("wrote", len(pictures))


if __name__ == "__main__":
    main()
