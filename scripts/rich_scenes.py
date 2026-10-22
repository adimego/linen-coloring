#!/usr/bin/env python3
"""Full-frame redraws for pictures that read as sparse or muddled.

These replace the generator for the named pages. Print-derived pages are
simplified by hand so the original subject still reads, and they keep the
credits already stored on the picture. Every structural shape is wide enough
to survive the ~15px region floor.
"""

from __future__ import annotations

import math

from make_pages import Scene, both, mirror, petal


def heart(scene: Scene, cx: float, cy: float, r: float, idx: int) -> None:
    pts = []
    for i in range(28):
        t = i / 28 * math.tau
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + x * r / 18, cy + y * r / 18))
    scene.poly(pts, idx)


def star(scene: Scene, cx: float, cy: float, r: float, idx: int, points: int = 5, inner: float = 0.46) -> None:
    pts = []
    for i in range(points * 2):
        ang = -math.pi / 2 + i * math.pi / points
        rad = r if i % 2 == 0 else r * inner
        pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    scene.poly(pts, idx)


def arc(cx: float, cy: float, rx: float, ry: float, a0: float, a1: float, n: int = 16) -> list[tuple[float, float]]:
    return [
        (cx + math.cos(a0 + (a1 - a0) * i / n) * rx, cy + math.sin(a0 + (a1 - a0) * i / n) * ry)
        for i in range(n + 1)
    ]


def cloud(scene: Scene, x: float, y: float, s: float, idx: int) -> None:
    scene.ellipse(x, y, 28 * s, 14 * s, idx)
    scene.ellipse(x - 18 * s, y + 4 * s, 16 * s, 12 * s, idx)
    scene.ellipse(x + 20 * s, y + 2 * s, 18 * s, 12 * s, idx)


def bloom(scene: Scene, x: float, y: float, r: float, a: int, b: int, center: int) -> None:
    for i in range(6):
        ang = i * 60
        scene.ellipse(x, y, r * 0.62, r * 0.34, a if i % 2 == 0 else b, ang)
    scene.circle(x, y, max(8, r * 0.28), center)


def tulip_cup(scene: Scene, x: float, y: float, rx: float, ry: float, petal: int, shade: int) -> None:
    scene.ellipse(x - rx * 0.42, y + ry * 0.08, rx * 0.72, ry, petal, -16)
    scene.ellipse(x + rx * 0.42, y + ry * 0.08, rx * 0.72, ry, petal, 16)
    scene.ellipse(x, y - ry * 0.06, rx * 0.5, ry * 1.05, shade)


def leaf(scene: Scene, x: float, y: float, rx: float, ry: float, idx: int, angle: float) -> None:
    scene.ellipse(x, y, rx, ry, idx, angle)


def window(scene: Scene, x: float, y: float, w: float, h: float, frame: int, glass: int, muntin: int) -> None:
    scene.rect(x, y, w, h, frame)
    scene.rect(x + 4, y + 4, w - 8, h - 8, glass)
    scene.rect(x + w / 2 - 2, y + 4, 4, h - 8, muntin)
    scene.rect(x + 4, y + h / 2 - 2, w - 8, 4, muntin)


def book_row(scene: Scene, x: float, y: float, n: int, w: float, h: float, colors: list[int]) -> None:
    for i in range(n):
        scene.rect(x + i * w, y, w - 3, h, colors[i % len(colors)])


# --- animals, flowers, birds -------------------------------------------------


def scene_cat() -> Scene:
    c = [
        "#f6d5c8",  # 0 wall
        "#f3e7d4",  # 1 wall warm
        "#f7f1e4",  # 2 sun
        "#e7c2a4",  # 3 cushion
        "#d7a888",  # 4 cushion shade
        "#c9845a",  # 5 cat
        "#a86440",  # 6 stripes
        "#f4e2cf",  # 7 chest
        "#3e3538",  # 8 features
        "#7eaa72",  # 9 plant
        "#3f6b48",  # 10 pot
        "#e7b15c",  # 11 yarn
        "#f7f4ee",  # 12 cushion trim
        "#c45a6a",  # 13 rug
    ]
    s = Scene(c, {0, 1}, 11)
    s.bands(0, 0, 320, 300, [0, 1])
    s.rect(0, 280, 320, 180, 13)
    s.rect(0, 300, 320, 24, 12)
    s.rect(24, 36, 150, 120, 8)
    window(s, 36, 48, 126, 96, 12, 2, 8)
    s.rect(36, 144, 126, 14, 12)
    cloud(s, 250, 70, 1.1, 2)
    s.ellipse(170, 360, 130, 48, 3)
    s.ellipse(170, 348, 110, 28, 4)
    # Curled cat, large enough to be the subject.
    s.ellipse(176, 300, 108, 62, 5)
    s.ellipse(150, 292, 70, 40, 7)
    s.circle(118, 236, 40, 5)
    s.ellipse(86, 214, 18, 28, 5, -20)
    s.ellipse(148, 206, 18, 28, 5, 16)
    s.ellipse(92, 220, 8, 16, 7, -20)
    s.ellipse(142, 214, 8, 16, 7, 16)
    s.ellipse(108, 244, 16, 8, 8, -16)
    s.ellipse(132, 242, 16, 8, 8, 16)
    s.ellipse(120, 258, 8, 6, 6)
    s.ellipse(168, 318, 28, 16, 5)
    s.ellipse(214, 328, 26, 16, 5)
    s.ellipse(164, 324, 12, 8, 7)
    s.ellipse(216, 334, 12, 8, 7)
    s.capsule(250, 300, 286, 250, 16, 5)
    s.capsule(286, 250, 250, 228, 14, 5)
    s.ellipse(236, 286, 16, 8, 6, 40)
    s.ellipse(268, 268, 14, 7, 6, -24)
    s.ellipse(200, 286, 18, 8, 6, 18)
    s.circle(78, 390, 22, 11)
    s.circle(78, 384, 8, 12)
    s.capsule(78, 406, 78, 440, 6, 11)
    s.ellipse(270, 400, 26, 18, 9)
    s.rect(254, 400, 32, 28, 10)
    s.ellipse(270, 392, 22, 10, 9)
    return s


def scene_rose() -> Scene:
    c = [
        "#f8e4ee",
        "#f3c9da",
        "#d7ebc8",
        "#7eaa72",
        "#3f6d48",
        "#f8d5de",
        "#f0a9bb",
        "#e07b94",
        "#c44d6c",
        "#9a3354",
        "#f2c56a",
        "#fffaf6",
        "#e7c4a4",
    ]
    s = Scene(c, {0, 1}, 31)
    s.bands(0, 0, 320, 280, [0, 1])
    s.rect(0, 250, 320, 210, 2)
    s.ellipse(160, 270, 200, 30, 3)
    for x, y, r in ((40, 200, 28), (70, 330, 22), (250, 190, 26), (280, 340, 24), (36, 400, 20)):
        bloom(s, x, y, r, 6, 7, 10)
        s.capsule(x, y + r, x, y + r + 36, 6, 4)
    s.capsule(160, 450, 160, 250, 11, 4)
    leaf(s, 108, 320, 48, 18, 3, -42)
    leaf(s, 112, 312, 24, 8, 4, -42)
    leaf(s, 220, 340, 52, 18, 3, 38)
    leaf(s, 214, 330, 24, 8, 4, 38)
    leaf(s, 86, 250, 28, 12, 3, -70)
    # Layered rose filling the upper half.
    for i, (rad, col) in enumerate(((92, 5), (74, 6), (58, 7), (42, 8), (28, 9))):
        count = 8 if i < 3 else 6
        for k in range(count):
            a = 0.2 * i + k * math.tau / count
            s.ellipse(160 + math.cos(a) * rad * 0.38, 168 + math.sin(a) * rad * 0.38, rad * 0.55, 22, col, math.degrees(a))
    s.circle(160, 168, 18, 10)
    s.circle(160, 168, 8, 11)
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
        "#f0a03a",
    ]
    s = Scene(c, {0, 1}, 41)
    s.bands(0, 0, 320, 220, [0, 1])
    cloud(s, 60, 48, 1.2, 11)
    cloud(s, 250, 36, 1.0, 11)
    s.circle(250, 78, 26, 2)
    s.rect(0, 210, 320, 250, 10)
    s.ellipse(160, 230, 220, 28, 8)
    # A row of smaller sunflowers so the field is not empty.
    for i, x in enumerate((48, 112, 214, 276)):
        y = 300 + (i % 2) * 18
        s.capsule(x, 450, x, y + 10, 7, 9)
        for k in range(8):
            a = k * 45
            s.ellipse(x, y, 22, 10, 3 if k % 2 == 0 else 4, a)
        s.circle(x, y, 12, 6)
        s.circle(x, y, 6, 7)
    # Hero flower.
    s.capsule(160, 450, 160, 210, 12, 9)
    leaf(s, 100, 300, 52, 18, 8, -48)
    leaf(s, 104, 292, 26, 8, 9, -48)
    leaf(s, 228, 320, 56, 18, 8, 46)
    leaf(s, 222, 312, 26, 8, 9, 46)
    for k in range(12):
        a = k * 30
        s.ellipse(160, 150, 46, 18, 3 if k % 2 == 0 else 12, a)
    for k in range(8):
        a = 18 + k * 45
        s.ellipse(160, 150, 28, 12, 4, a)
    s.circle(160, 150, 36, 6)
    s.circle(160, 150, 22, 7)
    s.circle(160, 150, 10, 5)
    return s


def scene_robin() -> Scene:
    c = [
        "#c5e4f6",
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
        "#5f8f58",
        "#e07a8a",
        "#f2d48a",
    ]
    s = Scene(c, {0}, 131)
    s.img[:] = 0
    cloud(s, 70, 48, 1.3, 1)
    cloud(s, 230, 36, 1.1, 1)
    s.rect(0, 250, 320, 210, 11)
    s.ellipse(160, 270, 220, 36, 8)
    for x, y in ((36, 300), (78, 340), (250, 310), (290, 360), (48, 400), (280, 420)):
        bloom(s, x, y, 18, 12, 2, 13)
    # Branch the bird actually sits on, edge to edge.
    s.stroke([(0, 340), (80, 318), (180, 332), (320, 300)], 22, 4)
    s.stroke([(70, 326), (40, 280)], 12, 5)
    s.stroke([(240, 318), (280, 270)], 12, 5)
    leaf(s, 54, 292, 22, 10, 8, -30)
    leaf(s, 268, 286, 22, 10, 8, 24)
    # Large robin.
    s.ellipse(168, 250, 78, 48, 4)
    s.ellipse(196, 246, 40, 30, 2)
    s.ellipse(214, 268, 36, 20, 3, 16)
    s.circle(124, 214, 36, 4)
    s.ellipse(108, 196, 16, 22, 5, -24)
    s.ellipse(112, 230, 14, 8, 6, 10)
    s.poly([(150, 214), (196, 206), (156, 230)], 6)
    s.poly([(176, 214), (196, 210), (178, 224)], 7)
    s.tri((86, 230), (40, 214), (78, 268), 5)
    s.ellipse(118, 208, 12, 10, 9)
    s.circle(118, 208, 6, 7)
    s.capsule(150, 292, 146, 332, 8, 5)
    s.capsule(186, 294, 192, 334, 8, 5)
    s.ellipse(142, 338, 16, 8, 7, 8)
    s.ellipse(196, 340, 16, 8, 7, -8)
    for x, y in ((40, 120), (280, 140), (300, 200)):
        s.circle(x, y, 10, 12)
    return s


def scene_swan() -> Scene:
    c = [
        "#f6c7b0",
        "#f3a48a",
        "#f8e2c4",
        "#f7f5f2",
        "#e7eef4",
        "#9ec4de",
        "#4e86b0",
        "#f2b7c6",
        "#e8c9a4",
        "#3a3434",
        "#6b8f6a",
        "#d7e4c8",
        "#c5d8ee",
        "#fffaf4",
    ]
    s = Scene(c, {0, 1, 2}, 149)
    s.bands(0, 0, 320, 200, [0, 1, 2])
    s.circle(64, 70, 28, 13)
    cloud(s, 220, 54, 1.4, 13)
    cloud(s, 140, 36, 1.0, 4)
    s.bands(0, 188, 320, 272, [5, 6, 12])
    # Reeds and lily pads so the water is a place.
    for x, h in ((28, 150), (52, 120), (270, 160), (300, 110)):
        s.capsule(x, 430, x + 8, 430 - h, 7, 10)
        leaf(s, x + 16, 430 - h, 18, 8, 11, -30)
    for x, y in ((70, 250), (250, 280), (40, 340), (200, 390)):
        s.ellipse(x, y, 28, 12, 11)
        s.ellipse(x, y, 10, 5, 7)
    # Reflection first, then the bird.
    s.ellipse(150, 300, 78, 22, 4)
    s.capsule(214, 250, 236, 200, 12, 4)
    # Body, wing, S-neck wide enough to stay attached.
    s.ellipse(150, 268, 92, 48, 3)
    s.ellipse(168, 258, 48, 22, 4)
    s.ellipse(126, 262, 36, 16, 8, -18)
    s.stroke([(188, 250), (214, 220), (236, 170), (220, 128), (196, 108)], 20, 3)
    s.circle(188, 104, 20, 3)
    s.ellipse(206, 108, 16, 7, 1, 18)
    s.ellipse(180, 100, 10, 8, 9)
    s.circle(180, 100, 5, 13)
    s.ellipse(150, 312, 70, 14, 4)
    s.capsule(210, 300, 228, 360, 8, 3)
    return s


# --- landscapes and city -----------------------------------------------------


def scene_lake() -> Scene:
    c = [
        "#f6c7a8",
        "#f3a48e",
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
        "#e7f2dc",
    ]
    s = Scene(c, {0, 1, 2}, 71)
    s.bands(0, 0, 320, 180, [3, 1, 0])
    s.circle(230, 78, 26, 2)
    cloud(s, 70, 48, 1.2, 11)
    cloud(s, 150, 36, 0.9, 11)
    # Mountains and their reflection, same silhouette shifted down.
    s.poly([(0, 168), (70, 96), (130, 160), (0, 188)], 4)
    s.poly([(40, 176), (140, 78), (230, 176), (80, 196)], 6)
    s.poly([(160, 180), (240, 70), (320, 150), (320, 196)], 7)
    s.poly([(210, 110), (240, 78), (268, 112)], 11)
    for x, y in ((90, 140), (176, 150), (262, 136)):
        s.tri((x - 12, y), (x, y - 28), (x + 12, y), 8)
    s.rect(0, 188, 320, 272, 10)
    s.poly([(0, 210), (70, 250), (130, 214), (0, 230)], 5)
    s.poly([(40, 214), (140, 292), (230, 220), (80, 204)], 6)
    s.poly([(160, 214), (240, 300), (320, 230), (320, 204)], 7)
    s.rect(0, 360, 320, 100, 9)
    s.ellipse(160, 372, 200, 18, 13)
    s.capsule(48, 450, 48, 330, 8, 12)
    s.tri((28, 340), (48, 300), (70, 340), 8)
    s.capsule(250, 450, 250, 340, 8, 12)
    s.ellipse(250, 336, 28, 16, 8)
    s.rect(150, 390, 70, 8, 12)
    s.rect(176, 398, 8, 28, 12)
    s.rect(90, 400, 36, 28, 11)
    s.tri((84, 404), (108, 380), (132, 404), 1)
    return s


def scene_coast() -> Scene:
    c = [
        "#f7d7c4",
        "#f3b7c0",
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
        "#3f6b48",
    ]
    s = Scene(c, {0, 1}, 83)
    s.bands(0, 0, 320, 180, [1, 0])
    s.circle(70, 64, 28, 2)
    cloud(s, 200, 48, 1.3, 10)
    cloud(s, 280, 80, 0.9, 10)
    s.poly([(0, 120), (0, 280), (110, 240), (70, 110)], 11)
    s.ellipse(40, 150, 36, 22, 12)
    s.bands(80, 160, 240, 120, [3, 4, 5])
    s.ellipse(230, 210, 40, 10, 10)
    s.poly([(200, 206), (230, 168), (260, 206)], 10)
    s.rect(0, 270, 320, 40, 6)
    # Wide path from the foreground into the beach.
    s.poly([(120, 460), (200, 460), (176, 300), (146, 300)], 7)
    s.poly([(132, 460), (188, 460), (168, 320), (152, 320)], 8)
    s.rect(0, 300, 110, 160, 12)
    s.rect(210, 310, 110, 150, 12)
    for x, y in ((40, 340), (70, 390), (250, 350), (286, 400), (36, 430)):
        bloom(s, x, y, 16, 11, 1, 2)
        leaf(s, x + 16, y + 8, 16, 7, 13, 30)
    s.rect(40, 300, 36, 10, 9)
    s.capsule(46, 310, 46, 340, 5, 9)
    s.capsule(70, 310, 70, 340, 5, 9)
    s.rect(40, 292, 36, 8, 9)
    s.ellipse(250, 430, 22, 12, 9)
    s.circle(80, 250, 10, 10)
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
    s = Scene(c, {0, 1}, 173)
    s.bands(0, 0, 320, 70, [0, 1])
    s.circle(250, 36, 16, 7)
    for x, y in ((30, 24), (80, 40), (160, 18), (300, 28)):
        s.circle(x, y, 4, 9)
    # Facade fills the frame. Windows are large on purpose.
    s.rect(0, 60, 320, 340, 4)
    s.rect(0, 60, 16, 340, 11)
    s.rect(304, 60, 16, 340, 11)
    colors_off = [3, 5, 2]
    for col in range(4):
        for row in range(6):
            x = 28 + col * 72
            y = 78 + row * 52
            lit = (col * 3 + row) % 4 == 0
            glass = 6 if lit else colors_off[(col + row) % 3]
            window(s, x, y, 52, 40, 11, glass, 0)
            if (col + row) % 5 == 0:
                s.rect(x + 8, y + 8, 16, 24, 10)
    s.rect(0, 390, 320, 70, 11)
    s.rect(118, 400, 84, 60, 3)
    s.rect(136, 414, 28, 36, 6)
    s.circle(188, 432, 5, 8)
    s.rect(20, 418, 70, 8, 8)
    s.ellipse(250, 424, 28, 8, 6)
    s.capsule(40, 430, 40, 460, 6, 7)
    s.ellipse(40, 422, 16, 8, 6)
    return s


def scene_dusk_skyline() -> Scene:
    c = [
        "#3a3d78",
        "#c46b86",
        "#f2b07a",
        "#f8e2ae",
        "#2e3358",
        "#4e466c",
        "#6a5878",
        "#f6e2a8",
        "#241f3a",
        "#5c4e78",
        "#8eb0d4",
        "#f7f4ee",
        "#e09a86",
    ]
    s = Scene(c, {0, 1, 2}, 257)
    s.bands(0, 0, 320, 220, [0, 1, 2])
    s.circle(78, 150, 30, 3)
    s.circle(78, 150, 14, 11)
    cloud(s, 210, 48, 1.3, 12)
    cloud(s, 150, 30, 0.8, 12)
    towers = [
        (0, 150, 58, 200, 4),
        (52, 90, 70, 260, 5),
        (118, 48, 54, 302, 8),
        (168, 110, 78, 240, 6),
        (242, 140, 78, 210, 4),
    ]
    for x, y, w, h, idx in towers:
        s.rect(x, y, w, h, idx)
        if w > 60:
            s.rect(x + w / 2 - 8, y - 28, 16, 32, idx)
        cols = 2 if w < 60 else 3
        rows = max(4, int(h / 48))
        for row in range(rows):
            for col in range(cols):
                wx = x + 8 + col * ((w - 16) / cols)
                wy = y + 14 + row * ((h - 28) / rows)
                lit = (row + col + x) % 3 != 0
                s.rect(wx, wy, 14, 18, 7 if lit else 0)
    s.rect(0, 340, 320, 120, 9)
    # Reflection of the towers in the water.
    for x, w, idx in ((0, 58, 4), (52, 70, 5), (118, 54, 8), (168, 78, 6), (242, 78, 4)):
        s.rect(x, 348, w, 36, idx)
    s.rect(130, 328, 70, 14, 10)
    s.ellipse(70, 400, 36, 12, 12)
    s.ellipse(220, 420, 48, 14, 1)
    return s


def scene_street_cafe() -> Scene:
    c = [
        "#c5dff2",
        "#f4e7d6",
        "#e7cfc0",
        "#c44755",
        "#f7f3ea",
        "#6b4034",
        "#8ebfe0",
        "#d9c4ae",
        "#5f8f58",
        "#e07a8a",
        "#f2d48a",
        "#f7f7f4",
        "#8a5a3a",
        "#3d6a4a",
        "#f6e7b4",
    ]
    s = Scene(c, {0}, 269)
    s.bands(0, 0, 320, 90, [0, 0])
    cloud(s, 60, 36, 1.0, 11)
    s.rect(0, 70, 320, 230, 1)
    s.rect(0, 280, 320, 180, 7)
    for i in range(7):
        s.rect(0, 300 + i * 22, 320, 10, 2 if i % 2 else 7)
    # Awning with bold stripes.
    s.poly([(16, 78), (304, 64), (304, 130), (16, 148)], 3)
    for i in range(8):
        s.poly(
            [
                (20 + i * 36, 80 + i * 0.4),
                (48 + i * 36, 78),
                (48 + i * 36, 128),
                (20 + i * 36, 136),
            ],
            4 if i % 2 == 0 else 11,
        )
    window(s, 36, 150, 110, 110, 5, 6, 12)
    s.rect(160, 156, 70, 120, 5)
    s.circle(214, 216, 6, 14)
    s.rect(210, 168, 80, 100, 4)
    s.rect(228, 184, 44, 60, 6)
    # Tables, chairs, flower box — all thick.
    s.ellipse(78, 360, 40, 16, 11)
    s.capsule(52, 360, 52, 420, 6, 12)
    s.capsule(104, 360, 104, 420, 6, 12)
    s.ellipse(200, 372, 36, 14, 11)
    s.capsule(176, 372, 176, 430, 6, 12)
    s.capsule(224, 372, 224, 430, 6, 12)
    s.ellipse(190, 348, 18, 8, 10)
    s.circle(186, 340, 8, 14)
    s.rect(250, 330, 56, 22, 5)
    for i, col in enumerate((9, 8, 10, 9)):
        bloom(s, 262 + (i % 2) * 24, 318 - (i // 2) * 8, 14, col, 3, 14)
    s.rect(36, 250, 90, 16, 8)
    s.ellipse(80, 300, 16, 8, 10)
    return s


def scene_canal() -> Scene:
    c = [
        "#d5e7f6",
        "#f3e4d2",
        "#e7b7ae",
        "#d4896a",
        "#3d6e90",
        "#7ec0d4",
        "#4a90ae",
        "#f4ecdf",
        "#cbbba8",
        "#2c3338",
        "#c4474a",
        "#f6e2b0",
        "#6b3a38",
        "#7ea36a",
        "#f7f4ee",
    ]
    s = Scene(c, {0}, 281)
    s.bands(0, 0, 320, 70, [0, 0])
    cloud(s, 160, 32, 1.2, 14)
    s.rect(0, 56, 150, 200, 3)
    s.rect(170, 40, 150, 216, 1)
    s.tri((170, 56), (245, 16), (310, 56), 10)
    for x, y in ((16, 80), (70, 80), (16, 140), (70, 140), (188, 78), (246, 78), (188, 140), (246, 140)):
        window(s, x, y, 40, 46, 12, 4, 14)
    s.rect(48, 196, 36, 60, 12)
    s.rect(230, 190, 34, 66, 12)
    # Stone arch bridge.
    s.rect(20, 230, 280, 36, 7)
    s.rect(28, 226, 264, 10, 8)
    s.ellipse(160, 300, 78, 48, 5)
    s.ellipse(160, 312, 52, 30, 6)
    for x in (40, 80, 240, 280):
        s.rect(x, 210, 10, 24, 8)
    s.bands(0, 250, 320, 210, [5, 6, 5])
    s.rect(24, 268, 90, 50, 3)
    s.rect(210, 268, 90, 70, 1)
    s.ellipse(210, 360, 50, 14, 8)
    s.capsule(168, 356, 186, 340, 6, 8)
    s.circle(214, 348, 8, 11)
    s.rect(36, 250, 70, 16, 13)
    for i in range(3):
        bloom(s, 50 + i * 22, 244, 12, 2, 10, 11)
    return s


def scene_rainy_lights() -> Scene:
    c = [
        "#243044",
        "#3c4c68",
        "#4a3d58",
        "#2a3144",
        "#f2c56a",
        "#9eb6dc",
        "#3a3842",
        "#6a5644",
        "#c4476a",
        "#3d6e96",
        "#e2b14a",
        "#5c564e",
        "#f7f4ee",
        "#1c2436",
        "#8f3044",
    ]
    s = Scene(c, {0, 13}, 293)
    s.bands(0, 0, 320, 80, [13, 0])
    s.rect(0, 60, 100, 250, 3)
    s.rect(100, 36, 120, 274, 2)
    s.rect(220, 80, 100, 230, 1)
    for x, y, idx in (
        (16, 90, 4),
        (56, 90, 5),
        (16, 150, 4),
        (56, 160, 9),
        (118, 60, 4),
        (164, 70, 5),
        (118, 130, 10),
        (164, 140, 4),
        (118, 200, 5),
        (236, 110, 4),
        (276, 120, 9),
        (236, 180, 4),
    ):
        window(s, x, y, 32, 40, 13, idx, 0)
    s.rect(0, 300, 320, 160, 6)
    s.rect(0, 312, 320, 40, 11)
    # Big reflections, the rainy read.
    s.ellipse(48, 360, 36, 16, 4)
    s.ellipse(140, 380, 48, 18, 5)
    s.ellipse(210, 360, 30, 14, 10)
    s.ellipse(270, 390, 34, 14, 8)
    # Two people under umbrellas. No faces, just coats.
    s.ellipse(86, 250, 36, 16, 8)
    s.capsule(86, 258, 86, 310, 12, 7)
    s.capsule(86, 300, 70, 330, 6, 7)
    s.capsule(86, 300, 104, 330, 6, 7)
    s.ellipse(220, 240, 34, 14, 12)
    s.capsule(220, 248, 220, 305, 12, 14)
    s.capsule(220, 294, 204, 326, 6, 14)
    s.capsule(220, 294, 238, 326, 6, 14)
    s.capsule(40, 200, 40, 310, 6, 13)
    s.ellipse(40, 188, 16, 8, 4)
    return s


# --- peaceful ----------------------------------------------------------------


def scene_zen_garden() -> Scene:
    c = [
        "#e7d8c8",
        "#efe4d2",
        "#d8c6aa",
        "#8a8078",
        "#5c564e",
        "#6f8f62",
        "#c4474a",
        "#6b4030",
        "#f3e7d6",
        "#8f3038",
        "#7a9098",
        "#c5d8d4",
        "#e7b15c",
        "#3f6b48",
        "#f7f4ee",
    ]
    s = Scene(c, {0, 1}, 307)
    s.rect(0, 0, 320, 70, 10)
    s.rect(0, 60, 320, 24, 7)
    for x in range(16, 320, 28):
        s.rect(x, 48, 8, 28, 7)
    s.rect(0, 78, 320, 382, 1)
    # Wide rake arcs, not hairlines.
    for i, y in enumerate((130, 180, 240, 300, 360, 420)):
        s.ellipse(160, y, 150, 18, 2 if i % 2 == 0 else 0)
    s.ellipse(100, 200, 36, 24, 3)
    s.ellipse(190, 250, 30, 22, 4)
    s.ellipse(140, 330, 26, 18, 3)
    s.ellipse(70, 300, 34, 16, 5)
    s.ellipse(230, 170, 28, 14, 5)
    # Maple.
    s.capsule(262, 450, 246, 210, 10, 7)
    for ang, col in ((-40, 6), (10, 9), (50, 6), (-10, 12), (30, 9)):
        leaf(s, 246 + math.cos(math.radians(ang)) * 8, 200 + ang * 0.4, 26, 14, col, ang)
    s.circle(230, 188, 18, 6)
    # Lantern.
    s.rect(40, 120, 36, 16, 3)
    s.rect(48, 136, 20, 28, 8)
    s.rect(44, 164, 28, 10, 4)
    s.rect(54, 174, 8, 20, 4)
    s.ellipse(80, 400, 36, 16, 11)
    s.ellipse(80, 396, 16, 8, 14)
    return s


def scene_snow_cabin() -> Scene:
    c = [
        "#c5d8ee",
        "#f4f7fb",
        "#e7eef6",
        "#b7c6dc",
        "#f7f8fa",
        "#3d5c48",
        "#2a4034",
        "#8a5a3c",
        "#6b4030",
        "#5c3828",
        "#f6d58a",
        "#d7e4c8",
        "#8aa0b8",
        "#f2e2c4",
        "#4a6a8a",
    ]
    s = Scene(c, {0, 1}, 313)
    s.bands(0, 0, 320, 160, [0, 1])
    cloud(s, 70, 40, 1.1, 4)
    cloud(s, 230, 36, 1.2, 4)
    s.poly([(0, 150), (90, 70), (170, 150)], 2)
    s.poly([(120, 156), (220, 50), (320, 150)], 3)
    s.poly([(190, 100), (220, 64), (250, 104)], 4)
    s.rect(0, 150, 320, 310, 4)
    # Pines.
    for x, y in ((48, 250), (276, 270)):
        s.tri((x - 28, y + 40), (x, y - 70), (x + 28, y + 40), 5)
        s.tri((x - 22, y + 10), (x, y - 40), (x + 22, y + 10), 6)
        s.tri((x - 16, y - 10), (x, y - 36), (x + 16, y - 10), 4)
        s.capsule(x, y + 40, x, y + 70, 6, 9)
    # Cabin.
    s.rect(96, 230, 140, 110, 7)
    s.tri((78, 240), (166, 150), (254, 240), 4)
    s.tri((96, 234), (166, 172), (236, 234), 8)
    s.rect(146, 274, 36, 66, 9)
    window(s, 110, 258, 36, 32, 13, 10, 8)
    window(s, 190, 258, 36, 32, 13, 10, 8)
    s.rect(156, 168, 18, 36, 14)
    s.circle(166, 158, 10, 12)
    for i in range(4):
        s.circle(150 + i * 10, 120 - i * 16, 12, 1)
    s.ellipse(160, 400, 140, 22, 1)
    s.poly([(120, 360), (160, 420), (200, 360)], 2)
    for x, y in ((30, 80), (180, 40), (300, 90), (70, 180), (250, 190), (40, 360)):
        s.circle(x, y, 8, 1)
    return s


def scene_balloons() -> Scene:
    c = [
        "#8ec4ee",
        "#d7eef8",
        "#f7f8f6",
        "#b7d08a",
        "#6f9a56",
        "#8fb56e",
        "#d4535c",
        "#f7f1e4",
        "#4d78c4",
        "#f0c14e",
        "#8a5a32",
        "#5c4030",
        "#e7f2dc",
        "#f2b7c4",
        "#3d5c86",
    ]
    s = Scene(c, {0, 1}, 359)
    s.bands(0, 0, 320, 250, [0, 1])
    cloud(s, 50, 40, 1.2, 2)
    cloud(s, 250, 36, 1.3, 2)
    cloud(s, 160, 70, 0.8, 2)
    s.ellipse(160, 430, 240, 140, 3)
    s.ellipse(70, 390, 100, 50, 4)
    s.ellipse(250, 400, 110, 46, 5)
    s.poly([(0, 360), (80, 330), (40, 420)], 12)
    s.rect(200, 360, 40, 28, 7)
    s.tri((194, 364), (220, 336), (246, 364), 10)
    # Three large balloons with baskets and ropes.
    balloons = [(78, 150, 6, 13), (160, 118, 8, 9), (246, 156, 9, 7)]
    for cx, cy, a, b in balloons:
        s.ellipse(cx, cy, 46, 58, a)
        s.ellipse(cx, cy - 8, 28, 34, b)
        s.tri((cx - 12, cy + 50), (cx, cy + 70), (cx + 12, cy + 50), a)
        s.rect(cx - 14, cy + 78, 28, 16, 10)
        s.stroke([(cx - 10, cy + 52), (cx - 12, cy + 78)], 6, 11)
        s.stroke([(cx + 10, cy + 52), (cx + 12, cy + 78)], 6, 11)
    s.capsule(40, 450, 40, 360, 6, 11)
    s.ellipse(40, 354, 22, 14, 4)
    return s


def scene_reading_nook() -> Scene:
    c = [
        "#f6e4ea",
        "#e7d0d8",
        "#c5dff2",
        "#f7f4ee",
        "#e7b7c8",
        "#6f8f78",
        "#4f6e58",
        "#f6e2a8",
        "#c4474a",
        "#3d6e96",
        "#f0c14e",
        "#8a5a3c",
        "#e2cbb4",
        "#d7a8b8",
        "#5f8a52",
        "#f7f1e6",
    ]
    s = Scene(c, {0, 1}, 373)
    s.bands(0, 0, 320, 300, [0, 1])
    for y in (40, 100, 160, 220):
        s.rect(0, y, 200, 8, 4)
    s.rect(0, 290, 320, 170, 12)
    s.ellipse(160, 400, 140, 36, 13)
    # Window with curtains.
    s.rect(16, 36, 150, 170, 4)
    window(s, 28, 48, 126, 140, 11, 2, 3)
    s.rect(16, 36, 22, 170, 4)
    s.rect(144, 36, 22, 170, 8)
    # Chair.
    s.ellipse(200, 250, 78, 90, 5)
    s.ellipse(200, 270, 70, 40, 6)
    s.ellipse(188, 286, 46, 20, 15)
    s.rect(150, 300, 16, 50, 11)
    s.rect(230, 300, 16, 50, 11)
    # Lamp and books.
    s.rect(250, 150, 14, 100, 11)
    s.ellipse(258, 140, 32, 18, 7)
    s.circle(258, 168, 8, 10)
    s.rect(236, 188, 70, 150, 15)
    book_row(s, 244, 200, 4, 16, 40, [8, 9, 10, 5])
    book_row(s, 244, 248, 4, 16, 40, [4, 10, 8, 9])
    book_row(s, 244, 296, 4, 16, 36, [9, 5, 10, 8])
    # Open book and mug on a side table.
    s.rect(70, 300, 70, 14, 11)
    s.rect(78, 314, 10, 40, 11)
    s.rect(122, 314, 10, 40, 11)
    s.rect(78, 286, 28, 16, 3)
    s.rect(106, 286, 28, 16, 15)
    s.capsule(96, 292, 108, 270, 6, 8)
    s.ellipse(102, 268, 12, 6, 7)
    s.ellipse(40, 360, 18, 16, 14)
    s.rect(28, 360, 24, 22, 11)
    return s


# --- food, pink, jewelry, doodles --------------------------------------------


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
        "#e7f2dc",
    ]
    s = Scene(c, {0, 1}, 103)
    s.bands(0, 0, 320, 250, [0, 1])
    for x, y in ((40, 50), (120, 40), (200, 60), (270, 36), (80, 120), (240, 110)):
        bloom(s, x, y, 18, 6, 7, 11)
    s.rect(0, 240, 320, 220, 13)
    s.ellipse(160, 250, 220, 20, 2)
    s.rect(20, 250, 280, 16, 14)
    # Teapot.
    s.ellipse(78, 200, 48, 36, 6)
    s.ellipse(78, 172, 28, 12, 2)
    s.rect(66, 156, 24, 12, 12)
    s.capsule(120, 190, 156, 176, 8, 6)
    s.stroke([(40, 190), (24, 160), (40, 140), (64, 160)], 10, 7)
    # Cup, saucer, lemon, spoon. Handle is thick and closed.
    s.ellipse(190, 300, 90, 22, 3)
    s.ellipse(190, 292, 74, 14, 2)
    s.poly([(150, 168), (236, 168), (250, 280), (136, 280)], 6)
    s.poly([(162, 180), (224, 180), (234, 268), (152, 268)], 4)
    s.ellipse(190, 168, 46, 16, 2)
    s.ellipse(190, 170, 32, 10, 8)
    s.stroke([(236, 200), (268, 186), (270, 230), (240, 236)], 14, 6)
    s.stroke([(244, 200), (258, 198), (258, 220), (244, 222)], 8, 0)
    s.circle(70, 330, 28, 11)
    s.circle(70, 330, 18, 8)
    s.poly([(70, 312), (86, 330), (70, 348), (60, 330)], 9)
    s.ellipse(120, 340, 16, 10, 11)
    s.capsule(250, 300, 300, 360, 5, 12)
    s.ellipse(300, 368, 16, 8, 12)
    # Steam, wide ribbons.
    s.stroke([(170, 150), (158, 110), (172, 78)], 10, 5)
    s.stroke([(200, 146), (214, 104), (200, 70)], 10, 5)
    s.ellipse(40, 400, 22, 16, 10)
    s.rect(24, 400, 32, 24, 12)
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
        "#7eaa72",
    ]
    s = Scene(c, {0}, 47)
    s.img[:] = 0
    for y in (30, 90, 150):
        s.rect(0, y, 320, 10, 1)
    s.rect(0, 250, 320, 210, 2)
    s.ellipse(160, 268, 200, 22, 4)
    # Mirror and reflected bottles, not a face.
    s.ellipse(160, 140, 100, 120, 11)
    s.ellipse(160, 142, 82, 100, 3)
    s.rect(118, 70, 18, 40, 13)
    s.circle(127, 64, 10, 9)
    s.rect(150, 90, 14, 32, 7)
    s.circle(157, 84, 8, 8)
    s.ellipse(190, 100, 16, 10, 1)
    s.rect(200, 28, 18, 36, 11)
    s.rect(150, 18, 24, 16, 8)
    # Tabletop still life.
    s.rect(28, 292, 264, 18, 5)
    s.rect(40, 310, 18, 90, 6)
    s.rect(262, 310, 18, 90, 6)
    s.rect(56, 268, 20, 28, 13)
    s.circle(66, 262, 10, 9)
    s.rect(96, 272, 16, 24, 7)
    s.circle(104, 266, 8, 8)
    s.ellipse(150, 276, 28, 12, 1)
    bloom(s, 200, 262, 16, 9, 10, 8)
    s.capsule(230, 270, 248, 230, 6, 11)
    s.ellipse(248, 224, 12, 16, 14)
    # Stool.
    s.ellipse(160, 400, 54, 18, 10)
    s.rect(124, 400, 72, 12, 6)
    s.capsule(132, 412, 132, 452, 6, 11)
    s.capsule(188, 412, 188, 452, 6, 11)
    s.ellipse(70, 420, 20, 14, 14)
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
        "#c9b6e6",
    ]
    s = Scene(c, {0}, 53)
    s.img[:] = 0
    for x in range(0, 320, 40):
        s.rect(x, 0, 18, 220, 1 if (x // 40) % 2 == 0 else 3)
    s.rect(0, 300, 320, 160, 10)
    s.ellipse(180, 400, 120, 36, 13)
    # Window and curtains.
    s.rect(36, 28, 130, 150, 4)
    window(s, 48, 40, 106, 126, 2, 5, 9)
    s.rect(20, 24, 28, 170, 1)
    s.rect(154, 24, 28, 170, 11)
    # Bed.
    s.rect(40, 210, 250, 28, 9)
    s.rect(52, 230, 230, 80, 2)
    s.rect(60, 238, 214, 36, 3)
    for i, col in enumerate((1, 11, 2, 14)):
        s.rect(64 + i * 52, 244, 44, 26, col)
    s.ellipse(100, 250, 32, 18, 1)
    s.ellipse(160, 248, 36, 20, 11)
    s.ellipse(214, 252, 28, 16, 2)
    s.rect(52, 292, 230, 40, 12)
    # Lamp and nightstand.
    s.rect(250, 250, 48, 16, 8)
    s.rect(268, 200, 10, 54, 9)
    s.ellipse(274, 190, 20, 12, 6)
    s.rect(258, 176, 32, 10, 7)
    s.rect(36, 250, 36, 28, 8)
    bloom(s, 54, 240, 14, 12, 11, 7)
    heart(s, 286, 48, 16, 12)
    s.circle(250, 40, 10, 7)
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
        "#5c3a48",
    ]
    s = Scene(c, {0, 1}, 71)
    s.img[:] = 0
    s.ellipse(160, 230, 210, 250, 1)
    s.rect(28, 24, 264, 412, 0)
    s.rect(40, 36, 240, 388, 1)
    # Velvet card the pair hangs on.
    s.rect(64, 70, 192, 340, 13)
    for i, x in enumerate((118, 202)):
        hook = arc(x, 100, 22, 30, math.pi * 0.85, math.pi * 1.85, 12)
        s.stroke(hook, 8, 4)
        s.circle(x, 128, 10, 3)
        s.capsule(x, 136, x, 160, 5, 4)
        s.poly([(x, 156), (x + 28, 210), (x, 228), (x - 28, 210)], 6 if i == 0 else 8)
        s.poly([(x, 170), (x + 16, 206), (x, 198)], 7 if i == 0 else 9)
        s.circle(x, 250, 20, 2 if i == 0 else 10)
        s.circle(x - 6, 244, 7, 5)
        s.capsule(x, 268, x, 292, 5, 3)
        s.poly([(x, 286), (x + 18, 330), (x, 354), (x - 18, 330)], 12 if i == 0 else 4)
        s.circle(x, 372, 12, 3)
    star(s, 64, 400, 16, 3, 4, 0.45)
    star(s, 250, 60, 14, 9, 4, 0.45)
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
        "#5c3a48",
        "#fffaf6",
    ]
    s = Scene(c, {0, 1}, 79)
    s.img[:] = 0
    s.ellipse(160, 240, 220, 260, 1)
    s.rect(24, 24, 272, 412, 0)
    # Display bust, not a person.
    s.ellipse(160, 150, 70, 88, 11)
    s.ellipse(160, 210, 100, 30, 1)
    s.rect(36, 300, 248, 110, 12)
    chain = arc(160, 150, 120, 86, 0.15, math.pi - 0.15, 18)
    for x, y in chain:
        s.circle(x, y, 11, 3)
        s.circle(x - 3, y - 3, 4, 5)
    end = chain[len(chain) // 2]
    s.capsule(end[0], end[1], 160, 248, 7, 4)
    s.circle(160, 256, 12, 2)
    s.poly([(160, 262), (210, 330), (160, 392), (110, 330)], 4)
    s.poly([(160, 278), (192, 332), (160, 368), (128, 332)], 6)
    s.poly([(160, 294), (176, 332), (160, 352)], 8)
    s.circle(160, 332, 10, 9)
    s.circle(160, 404, 12, 2)
    # A second chain and a ring so the tray is not empty.
    s.ellipse(70, 360, 28, 36, 3)
    s.ellipse(70, 360, 14, 20, 12)
    s.circle(250, 350, 16, 7)
    s.circle(250, 350, 8, 10)
    return s


def scene_doodles() -> Scene:
    c = [
        "#fff6ee",
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
    s.bands(0, 0, 320, 460, [11, 0])
    s.rect(16, 16, 288, 428, 8)
    # A filled sketchbook page of large doodles.
    star(s, 70, 70, 36, 1)
    star(s, 250, 78, 32, 3)
    s.circle(160, 72, 34, 4)
    s.circle(146, 64, 20, 8)
    heart(s, 78, 180, 40, 9)
    heart(s, 246, 176, 34, 11)
    bloom(s, 160, 186, 36, 3, 6, 1)
    for i in range(6):
        a = -math.pi / 2 + i * math.tau / 6
        petal(s, 160, 300, 16, 48, a - 0.42, a + 0.42, 3 if i % 2 == 0 else 6, 1.35, 1)
    s.circle(160, 300, 14, 1)
    star(s, 64, 300, 26, 10, 4, 0.45)
    star(s, 258, 310, 28, 2, 6, 0.5)
    s.stroke(arc(80, 400, 36, 22, 0.2, math.pi * 1.4, 14), 12, 4)
    s.stroke(arc(230, 400, 40, 24, math.pi * 0.8, math.pi * 2.1, 14), 12, 5)
    s.circle(160, 400, 18, 9)
    s.stroke([(36, 140), (110, 120)], 10, 7)
    s.stroke([(210, 130), (290, 150)], 10, 7)
    for i, (x, y) in enumerate(((40, 240), (280, 240), (48, 360), (286, 360))):
        s.circle(x, y, 12, [1, 3, 5, 6][i])
    return s


def scene_bouquet() -> Scene:
    c = [
        "#f6e7ee",
        "#f7f3ea",
        "#e7c9a4",
        "#c9845a",
        "#8d5344",
        "#f4b4c8",
        "#e36d97",
        "#c4476e",
        "#f6d56a",
        "#7ec48a",
        "#3f8a4e",
        "#f7f7f4",
        "#e07a45",
        "#d7eef6",
    ]
    s = Scene(c, {0}, 127)
    s.img[:] = 0
    s.rect(0, 0, 320, 300, 13)
    window(s, 36, 28, 100, 120, 11, 0, 4)
    s.rect(180, 40, 110, 90, 1)
    bloom(s, 220, 70, 16, 6, 7, 8)
    s.rect(0, 280, 320, 180, 1)
    s.ellipse(160, 300, 200, 18, 2)
    # Vase.
    s.ellipse(160, 430, 40, 16, 3)
    s.poly([(124, 250), (196, 250), (184, 400), (136, 400)], 11)
    s.ellipse(160, 248, 48, 16, 3)
    s.rect(142, 400, 36, 16, 4)
    stems = [(-78, 150, 6), (-48, 180, 7), (-16, 160, 8), (16, 190, 6), (48, 150, 12), (78, 170, 7)]
    for i, (dx, h, shade) in enumerate(stems):
        x = 160 + dx * 0.55
        y = 250 - h
        s.capsule(x, y + 20, 160 + dx * 0.15, 250, 8, 4)
        leaf(s, x - 16, y + h * 0.55, 28, 12, 9 if i % 2 == 0 else 10, -40)
        tulip_cup(s, x, y, 22, 40, shade, 7 if shade != 7 else 6)
    leaf(s, 118, 246, 22, 10, 9, -28)
    leaf(s, 204, 248, 22, 10, 10, 28)
    return s


def scene_closeup() -> Scene:
    c = [
        "#fdeef4",
        "#f7d0e0",
        "#f4b4c8",
        "#e36d97",
        "#c4476e",
        "#f6d56a",
        "#7ec48a",
        "#3f8a4e",
        "#2f6a40",
        "#f7f4ee",
        "#e7c9a4",
        "#8d5344",
        "#d7eef6",
    ]
    s = Scene(c, {0, 1}, 131)
    s.bands(0, 0, 320, 200, [12, 0])
    s.rect(0, 180, 320, 280, 1)
    s.ellipse(160, 200, 220, 40, 6)
    # Garden leaves behind the hero so the frame is a place.
    for x, y, ang in ((40, 240, -30), (70, 320, 20), (250, 230, 28), (280, 340, -16), (36, 400, 10)):
        leaf(s, x, y, 36, 16, 7 if ang > 0 else 8, ang)
    s.circle(260, 60, 22, 5)
    # One large tulip.
    s.capsule(150, 450, 156, 210, 14, 8)
    leaf(s, 96, 300, 64, 22, 6, -38)
    leaf(s, 100, 290, 30, 10, 7, -38)
    leaf(s, 214, 330, 70, 22, 7, 36)
    leaf(s, 208, 318, 32, 10, 8, 36)
    tulip_cup(s, 156, 150, 48, 78, 3, 4)
    s.ellipse(156, 150, 16, 28, 5)
    s.circle(156, 168, 8, 5)
    # Side bud on a thick stem that leaves the main stalk.
    s.capsule(156, 280, 78, 190, 8, 8)
    tulip_cup(s, 74, 168, 20, 34, 2, 4)
    return s


# --- print simplifications ---------------------------------------------------


def scene_maple_shamisen() -> Scene:
    """Utamaro: a seated player, a shamisen, and maple leaves."""
    c = [
        "#f3e6cf",
        "#e7d3b4",
        "#1e1a1c",
        "#f0c2b4",
        "#c4474a",
        "#e07a45",
        "#f2d48a",
        "#6b4034",
        "#f7f4ee",
        "#8d3038",
        "#d7a08a",
        "#4a3428",
    ]
    s = Scene(c, {0, 1}, 71)
    s.bands(0, 0, 320, 460, [0, 1])
    # Maple filling the corners.
    s.stroke([(0, 40), (80, 80), (40, 140)], 14, 7)
    s.stroke([(320, 20), (240, 70), (280, 150), (220, 180)], 14, 7)
    s.stroke([(0, 360), (70, 320), (30, 260)], 12, 7)
    for x, y, ang, col in (
        (36, 70, -30, 4),
        (70, 110, 20, 5),
        (24, 130, 40, 9),
        (260, 50, -20, 4),
        (300, 90, 30, 5),
        (246, 120, -40, 6),
        (280, 160, 10, 4),
        (40, 300, 24, 5),
        (70, 340, -16, 9),
    ):
        leaf(s, x, y, 26, 14, col, ang)
    # Seated figure. Face is a plain oval so it cannot collapse into a giant eye.
    s.ellipse(176, 250, 70, 90, 4)
    s.ellipse(176, 270, 50, 40, 10)
    s.rect(150, 250, 52, 18, 11)
    s.rect(168, 200, 18, 28, 3)
    s.circle(178, 176, 28, 3)
    s.ellipse(178, 164, 32, 22, 2)
    s.ellipse(156, 180, 12, 18, 2)
    s.ellipse(200, 180, 12, 18, 2)
    s.ellipse(150, 250, 16, 12, 3)
    s.ellipse(210, 268, 16, 12, 3)
    # Shamisen: square body, long neck, strings.
    s.rect(48, 300, 90, 100, 8)
    s.rect(60, 312, 66, 76, 2)
    s.circle(78, 350, 10, 8)
    s.circle(108, 350, 10, 8)
    s.stroke([(92, 312), (120, 230), (150, 168)], 16, 7)
    s.stroke([(86, 318), (116, 236), (146, 176)], 5, 11)
    s.stroke([(98, 318), (128, 236), (156, 176)], 5, 11)
    s.circle(154, 164, 10, 6)
    s.rect(40, 400, 70, 16, 1)
    return s


def scene_koto() -> Scene:
    """Hokusai: a kneeling figure holding a long koto, with water behind."""
    c = [
        "#d5e6f2",
        "#9ec4de",
        "#4e86b0",
        "#f7f3ea",
        "#e7c4b4",
        "#c98468",
        "#6b4034",
        "#1e1a1c",
        "#f2d48a",
        "#7ea36a",
        "#f7f4ee",
        "#8d5344",
        "#c5d8c4",
    ]
    s = Scene(c, {0, 1, 2}, 73)
    s.bands(0, 0, 320, 220, [0, 1, 2])
    for x in (30, 70, 250, 290):
        s.capsule(x, 220, x + 6, 80, 7, 9)
        leaf(s, x + 10, 90, 16, 8, 12, -20)
    s.rect(0, 200, 320, 260, 3)
    s.ellipse(160, 220, 200, 20, 1)
    # Kneeling robe.
    s.poly([(110, 200), (230, 200), (250, 400), (90, 400)], 4)
    s.poly([(140, 210), (210, 210), (200, 300), (150, 300)], 5)
    s.rect(150, 250, 50, 16, 6)
    s.rect(164, 168, 20, 36, 5)
    s.circle(174, 148, 26, 5)
    s.ellipse(174, 136, 30, 18, 7)
    s.ellipse(154, 154, 12, 16, 7)
    s.ellipse(196, 154, 12, 16, 7)
    # Koto across the lap, long and obvious.
    s.poly([(24, 280), (300, 250), (308, 286), (36, 320)], 11)
    s.poly([(40, 286), (290, 262), (294, 278), (48, 304)], 8)
    for i in range(6):
        x = 70 + i * 36
        s.rect(x, 268 + i * -2, 8, 22, 7)
    s.stroke([(48, 292), (290, 268)], 5, 7)
    s.stroke([(52, 302), (294, 278)], 5, 7)
    s.ellipse(120, 300, 16, 10, 5)
    s.ellipse(210, 286, 16, 10, 5)
    return s


def scene_flute() -> Scene:
    """Kuniteru: a standing flute player in a patterned robe."""
    c = [
        "#f4ead4",
        "#e7d7b8",
        "#c4474a",
        "#1e1a1c",
        "#f7f4ee",
        "#e7c4a4",
        "#6b4034",
        "#3d6e90",
        "#f2d48a",
        "#7ea36a",
        "#8d3038",
        "#d7e4ef",
    ]
    s = Scene(c, {0, 1}, 79)
    s.bands(0, 0, 320, 460, [0, 1])
    cloud(s, 60, 50, 1.3, 11)
    cloud(s, 240, 40, 1.2, 11)
    for i, y in enumerate((120, 200, 300, 400)):
        s.ellipse(40, y, 70, 16, 11 if i % 2 == 0 else 1)
        s.ellipse(280, y + 20, 70, 16, 1 if i % 2 == 0 else 11)
    # Standing robe with large round patterns.
    s.poly([(120, 168), (210, 168), (240, 440), (90, 440)], 2)
    s.poly([(140, 180), (196, 180), (188, 280), (148, 280)], 4)
    for x, y in ((130, 240), (180, 260), (140, 330), (190, 350), (150, 410)):
        s.circle(x, y, 16, 4)
        s.circle(x, y, 7, 8)
    s.rect(146, 150, 28, 24, 5)
    s.circle(160, 124, 28, 5)
    s.ellipse(160, 110, 32, 20, 3)
    s.ellipse(140, 128, 12, 16, 3)
    s.ellipse(182, 128, 12, 16, 3)
    # Flute raised to the mouth, thick, with finger holes.
    s.capsule(168, 136, 300, 70, 12, 6)
    s.capsule(176, 132, 292, 74, 5, 8)
    for t in (0.25, 0.4, 0.55, 0.7):
        x = 168 + (300 - 168) * t
        y = 136 + (70 - 136) * t
        s.circle(x, y, 7, 3)
    s.capsule(150, 180, 190, 150, 10, 5)
    s.ellipse(186, 146, 14, 10, 5)
    s.rect(126, 400, 28, 16, 7)
    s.rect(176, 404, 28, 14, 7)
    return s


def scene_meguro() -> Scene:
    """Hiroshige: drum bridge, sunset hill, willows, and water."""
    c = [
        "#f6c7a8",
        "#e07a55",
        "#f8e2b0",
        "#6fa85a",
        "#3d6b40",
        "#5c4030",
        "#e7d3b4",
        "#7ec0d4",
        "#3d6e90",
        "#f7f4ee",
        "#c9845a",
        "#8fb56a",
        "#2c3338",
        "#f3a48e",
    ]
    s = Scene(c, {0, 1, 2}, 41)
    s.bands(0, 0, 320, 200, [1, 13, 0])
    s.circle(230, 90, 28, 2)
    cloud(s, 70, 40, 1.2, 9)
    cloud(s, 150, 28, 0.8, 9)
    # Sunset hill.
    s.poly([(180, 180), (250, 70), (320, 150), (320, 200), (200, 200)], 10)
    s.poly([(210, 160), (250, 100), (290, 160)], 3)
    # Willows.
    for x in (36, 70):
        s.capsule(x, 210, x, 120, 8, 5)
        s.stroke([(x, 130), (x - 20, 200), (x - 8, 250)], 12, 3)
        s.stroke([(x, 140), (x + 16, 210), (x + 8, 260)], 12, 4)
    s.capsule(300, 200, 300, 110, 8, 5)
    s.stroke([(300, 120), (276, 190), (290, 250)], 12, 3)
    # Drum bridge: a clear arch.
    arch = arc(160, 250, 110, 90, math.pi, math.tau, 20)
    s.stroke(arch, 26, 6)
    s.stroke(arch, 10, 9)
    for x, y in arch[::4]:
        s.rect(x - 3, y - 16, 6, 14, 12)
    s.rect(40, 240, 24, 20, 6)
    s.rect(256, 240, 24, 20, 6)
    # Water and reflection.
    s.bands(0, 250, 320, 210, [7, 8, 7])
    refl = arc(160, 280, 90, 50, 0, math.pi, 16)
    s.stroke(refl, 16, 6)
    s.rect(0, 400, 320, 60, 11)
    s.ellipse(80, 420, 30, 12, 4)
    s.ellipse(240, 430, 36, 12, 3)
    return s


def scene_kusatsu() -> Scene:
    """Hiroshige: a mountain, a village, and a road through the fields."""
    c = [
        "#d5e6f6",
        "#f7f4ee",
        "#8ea0b8",
        "#5c6e86",
        "#6fa85a",
        "#3d6b40",
        "#c9845a",
        "#8d5344",
        "#f2d48a",
        "#e7d3b4",
        "#3a3434",
        "#7ea36a",
        "#e07a55",
        "#f6e2b0",
    ]
    s = Scene(c, {0}, 43)
    s.bands(0, 0, 320, 120, [0, 0])
    cloud(s, 60, 36, 1.1, 1)
    cloud(s, 240, 28, 1.2, 1)
    # Mountain.
    s.poly([(40, 150), (160, 36), (280, 150)], 2)
    s.poly([(110, 110), (160, 52), (200, 110)], 1)
    s.poly([(70, 140), (120, 100), (150, 140)], 3)
    s.poly([(180, 140), (220, 96), (260, 140)], 3)
    # Fields and village band.
    s.rect(0, 140, 320, 80, 4)
    s.rect(0, 180, 140, 40, 8)
    s.rect(180, 180, 140, 40, 11)
    houses = [40, 100, 200, 260]
    for i, x in enumerate(houses):
        s.rect(x, 130, 48, 36, 9 if i % 2 == 0 else 1)
        s.tri((x - 6, 134), (x + 24, 104), (x + 54, 134), 10 if i % 2 == 0 else 12)
        s.rect(x + 18, 146, 12, 20, 7)
    # Wide road.
    s.poly([(70, 460), (170, 460), (210, 220), (150, 210)], 6)
    s.poly([(90, 460), (150, 460), (190, 230), (164, 224)], 7)
    # Trees.
    for x, y in ((36, 280), (250, 260), (300, 340), (30, 380)):
        s.capsule(x, y + 40, x, y, 7, 7)
        s.circle(x, y - 8, 22, 5)
        s.circle(x - 12, y + 6, 14, 4)
        s.circle(x + 12, y + 4, 14, 11)
    # Two travelers on the road, simple and large.
    for x, y in ((130, 340), (156, 400)):
        s.capsule(x, y + 30, x, y, 8, 10)
        s.circle(x, y - 16, 10, 13)
        s.circle(x, y - 8, 12, 1)
    return s


SCENES = {
    "cat-nap": scene_cat,
    "open-rose": scene_rose,
    "sunflower": scene_sunflower,
    "garden-robin": scene_robin,
    "still-swan": scene_swan,
    "lake-evening": scene_lake,
    "coast-path": scene_coast,
    "night-windows": scene_city,
    "dusk-skyline": scene_dusk_skyline,
    "street-cafe": scene_street_cafe,
    "canal-bridge": scene_canal,
    "rainy-lights": scene_rainy_lights,
    "zen-garden": scene_zen_garden,
    "snow-cabin": scene_snow_cabin,
    "balloon-valley": scene_balloons,
    "reading-nook": scene_reading_nook,
    "lemon-tea": scene_tea,
    "vanity-table": scene_vanity,
    "pink-bedroom": scene_bedroom,
    "drop-earrings": scene_earrings,
    "pendant-necklace": scene_necklace,
    "doodle-collage": scene_doodles,
    "tulip-bouquet": scene_bouquet,
    "tulip-closeup": scene_closeup,
    "maple-shamisen": scene_maple_shamisen,
    "with-a-koto": scene_koto,
    "flute-player": scene_flute,
    "meguro-sunset": scene_meguro,
    "kusatsu-village": scene_kusatsu,
}


def _bind() -> None:
    import make_new_sets
    import make_pages
    import make_tulips

    make_pages._install_rich_scenes()
    make_new_sets._install_rich_scenes()
    make_tulips._install_rich_scenes()


_bind()
