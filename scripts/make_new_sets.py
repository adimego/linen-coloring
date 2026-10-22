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


def arc_points(cx: float, cy: float, rx: float, ry: float, a0: float, a1: float, n: int) -> list[tuple[float, float]]:
    return [
        (cx + math.cos(a0 + (a1 - a0) * i / n) * rx, cy + math.sin(a0 + (a1 - a0) * i / n) * ry)
        for i in range(n + 1)
    ]


def scene_cherry() -> Scene:
    c = [
        "#fde7ef",
        "#f7c2d4",
        "#f3a0bc",
        "#e56b93",
        "#c4476e",
        "#6d3b32",
        "#8d5344",
        "#f7f0c8",
        "#f2d0e4",
        "#c9e6c4",
        "#7eae78",
        "#fbf7f2",
    ]
    s = Scene(c, {0, 1}, 31)
    s.img[:] = 0
    s.bands(0, 0, 320, 300, [0, 1])
    s.ellipse(160, 430, 210, 90, 11)
    s.ellipse(40, 390, 70, 28, 10)
    s.ellipse(250, 400, 80, 26, 9)
    branch = arc_points(40, 430, 280, 90, math.pi * 1.05, math.pi * 1.72, 16)
    blob_along(s, branch, 7, 5)
    blob_along(s, branch[4:12], 3.2, 6)
    flowers = [(70, 250), (110, 190), (150, 150), (196, 168), (230, 210), (268, 160), (86, 300), (176, 230), (248, 250)]
    for i, (x, y) in enumerate(flowers):
        for k in range(5):
            a0 = -math.pi / 2 + k * math.tau / 5
            petal(s, x, y, 4, 16, a0 - 0.35, a0 + 0.35, 2 if i % 2 == 0 else 3, 1.35, 1)
        s.circle(x, y, 4.2, 7 if i % 3 else 4)
    for x, y, ang in ((48, 330, -30), (300, 280, 20), (130, 340, 10), (210, 310, -15)):
        s.ellipse(x, y, 16, 7, 10, ang)
    s.circle(292, 48, 16, 8)
    return s


def scene_flamingo() -> Scene:
    c = [
        "#f8d5e4",
        "#f3b7cf",
        "#f7e7c4",
        "#f4f7fb",
        "#9fd0ea",
        "#3d8eb8",
        "#f7f3ee",
        "#f4a8c4",
        "#e36d97",
        "#c4476e",
        "#f6c56b",
        "#e0893a",
        "#5c3a48",
        "#f7d0dc",
    ]
    s = Scene(c, {0, 1, 3, 4}, 37)
    s.img[:] = 0
    s.bands(0, 0, 320, 250, [0, 1])
    s.circle(250, 70, 22, 2)
    s.rect(0, 250, 320, 210, 4)
    s.ellipse(160, 268, 200, 18, 3)
    s.rect(0, 330, 320, 130, 5)
    s.ellipse(168, 300, 58, 32, 7)
    s.ellipse(188, 292, 36, 18, 8)
    neck = arc_points(150, 210, 70, 90, -0.2, 2.4, 14)
    blob_along(s, neck, 11, 8)
    blob_along(s, neck, 6, 9)
    s.circle(118, 148, 16, 9)
    s.circle(112, 144, 2.8, 12)
    s.poly([(128, 146), (168, 154), (128, 162)], 10)
    s.poly([(128, 150), (158, 156), (128, 160)], 11)
    for i, ang in enumerate((-40, -10, 18, 46)):
        s.ellipse(176, 286, 28, 9, 13 if i % 2 == 0 else 7, ang)
    s.capsule(150, 328, 138, 420, 3.4, 10)
    s.capsule(186, 328, 198, 420, 3.4, 10)
    s.ellipse(128, 424, 12, 4, 11)
    s.ellipse(210, 424, 12, 4, 11)
    s.ellipse(70, 360, 18, 8, 6)
    s.ellipse(270, 380, 22, 8, 3)
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
    s.rect(0, 300, 320, 160, 1)
    s.ellipse(160, 312, 200, 16, 7)
    spots = [(70, 210), (160, 188), (250, 214)]
    for i, (x, y) in enumerate(spots):
        s.poly([(x - 28, y + 20), (x + 28, y + 20), (x + 20, y + 78), (x - 20, y + 78)], 8)
        for k in range(4):
            s.rect(x - 22, y + 24 + k * 14, 44, 8, 9 if k % 2 == 0 else 5)
        s.ellipse(x, y + 18, 30, 16, 2 if i != 1 else 3)
        s.circle(x, y - 6, 18, 3 if i != 1 else 4)
        s.circle(x - 10, y - 16, 10, 2)
        s.circle(x + 12, y - 12, 9, 12 if i == 2 else 6)
        s.circle(x, y - 28, 7, 10)
        s.ellipse(x, y + 86, 26, 6, 7)
    s.rect(24, 300, 272, 8, 6)
    s.circle(40, 70, 10, 4)
    s.circle(280, 60, 8, 11)
    heart(s, 160, 70, 16, 3)
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
        "#3e9a86",
    ]
    s = Scene(c, {0}, 61)
    s.img[:] = 0
    s.ellipse(160, 250, 150, 180, 1)
    s.ellipse(160, 268, 92, 110, 2)
    s.ellipse(160, 268, 58, 74, 0)
    s.ellipse(160, 248, 78, 18, 3, -8)
    s.ellipse(160, 292, 70, 14, 4, 6)
    s.poly([(160, 150), (196, 214), (160, 236), (124, 214)], 6)
    s.poly([(160, 150), (196, 214), (160, 198)], 7)
    s.poly([(160, 150), (124, 214), (160, 198)], 8)
    s.poly([(124, 214), (196, 214), (160, 236)], 5)
    s.circle(160, 196, 8, 9)
    for ang in (-0.8, -0.2, 0.35, 0.9):
        s.circle(160 + math.cos(ang) * 86, 250 + math.sin(ang) * 28, 7, 10 if ang < 0 else 11)
    s.circle(70, 120, 5, 3)
    s.circle(250, 140, 4, 12)
    star(s, 250, 360, 12, 3, 4, 0.35)
    return s


def scene_pearls() -> Scene:
    c = [
        "#f6e7ea",
        "#e7c9c4",
        "#fbf7f2",
        "#f3e2c4",
        "#e7d2a8",
        "#c98468",
        "#8d5344",
        "#f7f1c8",
        "#d9c6aa",
        "#b7d8e6",
        "#7ea4c0",
        "#e7b7c8",
    ]
    s = Scene(c, {0, 1}, 67)
    s.img[:] = 0
    s.bands(0, 0, 320, 460, [0, 1, 0])
    s.ellipse(80, 80, 50, 30, 11, -20)
    s.ellipse(250, 400, 70, 36, 9, 16)
    s.poly([(40, 40), (120, 20), (150, 140), (30, 160)], 8)
    pts = arc_points(160, 240, 110, 150, -math.pi * 0.15, math.pi * 1.15, 18)
    for i, (x, y) in enumerate(pts):
        s.circle(x, y, 13, 2 if i % 2 == 0 else 3)
        s.circle(x - 3, y - 3, 4, 7)
    s.rect(pts[0][0] - 8, pts[0][1] - 6, 16, 12, 5)
    s.circle(pts[-1][0], pts[-1][1], 8, 4)
    s.circle(pts[-1][0], pts[-1][1], 3, 6)
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
    s.rect(0, 0, 160, 460, 0)
    s.rect(160, 0, 160, 460, 1)
    for i, x in enumerate((80, 240)):
        s.capsule(x, 50, x, 90, 2.4, 4)
        s.circle(x, 96, 6, 3)
        s.poly([(x, 108), (x + 22, 160), (x, 176), (x - 22, 160)], 6 if i == 0 else 8)
        s.poly([(x, 112), (x + 16, 156), (x, 150)], 7 if i == 0 else 9)
        s.circle(x, 196, 16, 2 if i == 0 else 10)
        s.circle(x - 4, y := 190, 5, 5)
        s.poly([(x, 214), (x + 14, 250), (x, 268), (x - 14, 250)], 12 if i == 0 else 4)
        s.circle(x, 286, 8, 3)
    _ = y
    star(s, 40, 400, 12, 3, 4, 0.4)
    star(s, 280, 40, 10, 9, 4, 0.4)
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
    s.ellipse(160, 520, 220, 180, 1)
    s.ellipse(160, 80, 120, 40, 11)
    chain = arc_points(160, 150, 120, 70, 0.15, math.pi - 0.15, 22)
    for i, (x, y) in enumerate(chain):
        s.circle(x, y, 5.5, 3 if i % 2 == 0 else 4)
    s.poly([(160, 214), (188, 268), (160, 300), (132, 268)], 5)
    s.poly([(160, 226), (176, 264), (160, 286), (144, 264)], 6)
    s.poly([(160, 236), (170, 262), (160, 274)], 8)
    s.circle(160, 262, 6, 9)
    s.circle(160, 308, 8, 2)
    s.ellipse(70, 360, 30, 14, 10, -20)
    s.ellipse(250, 380, 26, 12, 7, 16)
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
    s.rect(40, 150, 240, 28, 2)
    s.poly([(40, 150), (70, 70), (250, 70), (280, 150)], 1)
    s.rect(78, 86, 164, 52, 13)
    s.ellipse(160, 112, 40, 16, 8)
    s.rect(48, 176, 224, 180, 4)
    s.rect(64, 192, 192, 148, 3)
    s.ellipse(120, 270, 28, 16, 6)
    s.ellipse(120, 270, 16, 9, 0)
    s.circle(168, 250, 10, 8)
    s.circle(190, 258, 10, 8)
    s.circle(180, 274, 10, 7)
    s.poly([(210, 230), (232, 258), (210, 274), (188, 258)], 9)
    s.circle(210, 256, 5, 10)
    s.rect(150, 150, 20, 14, 6)
    s.circle(160, 164, 5, 12)
    s.rect(36, 360, 248, 16, 5)
    s.ellipse(160, 420, 90, 16, 11)
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
    ("cherry-blossoms", "pink", "Cherry Blossoms", "A branch of pink blossoms against a pale sky.", scene_cherry),
    ("flamingo", "pink", "Flamingo", "A flamingo standing in shallow water.", scene_flamingo),
    ("peony", "pink", "Peony", "A full peony with soft leaves.", scene_peony),
    ("pink-cupcakes", "pink", "Pink Cupcakes", "Three cupcakes with cherries on top.", scene_cupcakes),
    ("vanity-table", "pink", "Vanity Table", "A mirror, a few bottles, and a pink stool.", scene_vanity),
    ("pink-bedroom", "pink", "Pink Bedroom", "A bed, curtains, and a small lamp.", scene_bedroom),
    ("gem-ring", "jewelry", "Gem Ring", "A gold band with a faceted stone.", scene_ring),
    ("pearl-strand", "jewelry", "Pearl Strand", "A strand of pearls on folded cloth.", scene_pearls),
    ("drop-earrings", "jewelry", "Drop Earrings", "A pair of earrings with pearl drops.", scene_earrings),
    ("gem-brooch", "jewelry", "Gem Brooch", "A flower brooch set with round stones.", scene_brooch),
    ("pendant-necklace", "jewelry", "Pendant Necklace", "A chain and a teardrop pendant.", scene_necklace),
    ("jewelry-box", "jewelry", "Jewelry Box", "An open box with a ring and a few pearls.", scene_jewel_box),
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


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "preview":
        previews()
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
