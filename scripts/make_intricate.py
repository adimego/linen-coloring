#!/usr/bin/env python3
"""Original Intricate gallery pages.

Each motif is its own shape. Same-color neighbors stay separate, and large
petals, feathers, and panes carry a light-to-dark band along the form.
Nothing is tessellated into cells. Do not run make_pages.py from here.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src" / "pictures" / "art"
PREVIEW = Path("/tmp/intricate_preview")
SCALE = 3
VW, VH = 320, 460
W, H = VW * SCALE, VH * SCALE
MIN_AREA = 88.0
MIN_RADIUS = 5.25

PAPER = (251, 246, 240)


def sx(x: float) -> int:
    return int(round(x * SCALE))


def sy(y: float) -> int:
    return int(round(y * SCALE))


def ellipse_mask(cx: float, cy: float, rx: float, ry: float, angle: float = 0) -> np.ndarray:
    mask = np.zeros((H, W), np.uint8)
    cv2.ellipse(
        mask,
        (sx(cx), sy(cy)),
        (max(1, sx(abs(rx))), max(1, sx(abs(ry)))),
        angle,
        0,
        360,
        255,
        -1,
        cv2.LINE_8,
    )
    return mask > 0


def circle_mask(cx: float, cy: float, r: float) -> np.ndarray:
    return ellipse_mask(cx, cy, r, r, 0)


def poly_mask(pts: list[tuple[float, float]]) -> np.ndarray:
    mask = np.zeros((H, W), np.uint8)
    arr = np.array([[sx(x), sy(y)] for x, y in pts], np.int32)
    if len(arr) >= 3:
        cv2.fillPoly(mask, [arr], 255, lineType=cv2.LINE_8)
    return mask > 0


def capsule_mask(x0: float, y0: float, x1: float, y1: float, r: float) -> np.ndarray:
    mask = np.zeros((H, W), np.uint8)
    thickness = max(1, sx(r * 2))
    cv2.line(mask, (sx(x0), sy(y0)), (sx(x1), sy(y1)), 255, thickness, cv2.LINE_8)
    cv2.circle(mask, (sx(x0), sy(y0)), max(1, sx(r)), 255, -1, cv2.LINE_8)
    cv2.circle(mask, (sx(x1), sy(y1)), max(1, sx(r)), 255, -1, cv2.LINE_8)
    return mask > 0


def round_rect_mask(x: float, y: float, w: float, h: float, r: float) -> np.ndarray:
    mask = np.zeros((H, W), np.uint8)
    r = max(0.5, min(r, w / 2, h / 2))
    cv2.rectangle(mask, (sx(x + r), sy(y)), (sx(x + w - r), sy(y + h)), 255, -1)
    cv2.rectangle(mask, (sx(x), sy(y + r)), (sx(x + w), sy(y + h - r)), 255, -1)
    rad = max(1, sx(r))
    for cx, cy in ((x + r, y + r), (x + w - r, y + r), (x + r, y + h - r), (x + w - r, y + h - r)):
        cv2.circle(mask, (sx(cx), sy(cy)), rad, 255, -1, cv2.LINE_8)
    return mask > 0


class Plate:
    def __init__(self, colors: list[str], background: set[int]):
        self.colors = colors
        self.background = set(background)
        self.img = np.zeros((H, W), np.int32)
        self.color: dict[int, int] = {}
        self.protect: dict[int, bool] = {}
        self.next_id = 1
        self.inks: list[tuple[str, float]] = []
        self.subject = np.zeros((H, W), dtype=bool)

    def stamp(self, mask: np.ndarray, color: int, protect: bool = False, avoid: bool = False) -> bool:
        if color < 0 or color >= len(self.colors):
            raise RuntimeError(f"color {color} outside palette of {len(self.colors)}")
        if mask.shape != (H, W) or not np.any(mask):
            return False
        if avoid and color not in self.background and busy(self, mask):
            return False
        rid = self.next_id
        self.next_id += 1
        self.img[mask] = rid
        self.color[rid] = int(color)
        self.protect[rid] = protect
        if color not in self.background:
            self.subject[mask] = True
        return True

    def ink(self, pts: list[tuple[float, float]], width: float = 1.45) -> None:
        if len(pts) < 2:
            return
        bits = [f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"]
        bits.extend(f"L{x:.2f} {y:.2f}" for x, y in pts[1:])
        self.inks.append((" ".join(bits), width))


def busy(plate: Plate, mask: np.ndarray) -> bool:
    if not np.any(mask) or not np.any(plate.subject):
        return False
    return int(np.count_nonzero(mask & plate.subject)) > int(mask.sum()) * 0.1


def petal(
    plate: Plate,
    cx: float,
    cy: float,
    ang: float,
    length: float,
    width: float,
    outer: int,
    inner: int | None = None,
    protect: bool = False,
    avoid: bool = False,
) -> None:
    rad = math.radians(ang)
    ox = cx + math.cos(rad) * length * 0.12
    oy = cy + math.sin(rad) * length * 0.12
    plate.stamp(ellipse_mask(ox, oy, length * 0.52, width * 0.5, ang), outer, protect, avoid)
    if inner is None or width < 16 or length < 28:
        return
    ix = cx + math.cos(rad) * length * 0.22
    iy = cy + math.sin(rad) * length * 0.22
    plate.stamp(ellipse_mask(ix, iy, length * 0.28, max(6.4, width * 0.28), ang), inner, protect)


def bloom(
    plate: Plate,
    cx: float,
    cy: float,
    n: int,
    length: float,
    width: float,
    rot: float,
    outer: int,
    inner: int | None,
    center: int,
    heart: int | None = None,
    protect: bool = False,
    orbit: float | None = None,
    avoid: bool = False,
) -> bool:
    radial = length * 0.34 if orbit is None else orbit - length * 0.12
    reach = abs(radial) + length * 0.5
    if avoid and busy(plate, circle_mask(cx, cy, reach * 0.72)):
        return False
    for i in range(n):
        ang = rot + i * (360 / n)
        rad = math.radians(ang)
        petal(
            plate,
            cx + math.cos(rad) * radial,
            cy + math.sin(rad) * radial,
            ang,
            length,
            width,
            outer,
            inner,
            protect,
            avoid,
        )
    cr = max(6.6, width * 0.42)
    plate.stamp(circle_mask(cx, cy, cr), center, protect)
    if heart is not None:
        plate.stamp(circle_mask(cx, cy, max(6.4, cr * 0.48)), heart, protect)
    return True


def leaf(
    plate: Plate,
    x: float,
    y: float,
    length: float,
    width: float,
    ang: float,
    dark: int,
    light: int | None = None,
    avoid: bool = False,
) -> bool:
    rad = math.radians(ang)
    mx = x + math.cos(rad) * length * 0.45
    my = y + math.sin(rad) * length * 0.45
    if avoid and busy(plate, ellipse_mask(mx, my, length * 0.5, width * 0.5, ang)):
        return False
    plate.stamp(ellipse_mask(mx, my, length * 0.5, width * 0.5, ang), dark, avoid=avoid)
    if light is not None and width >= 15 and length >= 26:
        plate.stamp(
            ellipse_mask(
                mx + math.cos(rad) * length * 0.08,
                my + math.sin(rad) * length * 0.08,
                length * 0.26,
                max(6.3, width * 0.24),
                ang,
            ),
            light,
        )
    x2 = x + math.cos(rad) * length * 0.82
    y2 = y + math.sin(rad) * length * 0.82
    plate.ink([(x + math.cos(rad) * 2, y + math.sin(rad) * 2), (x2, y2)], 1.25)
    return True


def split_petal(
    plate: Plate,
    cx: float,
    cy: float,
    ang: float,
    length: float,
    width: float,
    base: int,
    tip: int,
    avoid: bool = False,
) -> None:
    """Two tones along a petal, set end to end so neither one eats the other."""
    rad = math.radians(ang)
    span = max(6.6, length * 0.22)
    for dist, color in ((-length * 0.2, base), (length * 0.24, tip)):
        plate.stamp(
            ellipse_mask(cx + math.cos(rad) * dist, cy + math.sin(rad) * dist, span, width * 0.5, ang),
            color,
            avoid=avoid,
        )


def live_count(plate: Plate) -> int:
    return int(np.count_nonzero(np.unique(plate.img)))


def sow(plate: Plate, box: tuple[float, float, float, float], step: float, draw, goal: int = 330) -> None:
    x0, y0, x1, y1 = box
    y = y0
    row = 0
    draws = 0
    while y <= y1 and draws < 980:
        x = x0 + (step * 0.5 if row % 2 else 0)
        while x <= x1 and draws < 980:
            if draws % 5 == 0 and live_count(plate) >= goal:
                return
            jx = x + math.sin(row * 1.3 + x * 0.07) * 4
            jy = y + math.cos(x * 0.05 + row * 0.8) * 4
            draw(plate, jx, jy, row, draws)
            draws += 1
            x += step
        y += step * 0.86
        row += 1


def ribbon(plate: Plate, pts: list[tuple[float, float]], widths: list[float], color_at) -> None:
    if len(pts) < 2:
        return
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for i, (x, y) in enumerate(pts):
        if i == 0:
            dx, dy = pts[1][0] - x, pts[1][1] - y
        elif i == len(pts) - 1:
            dx, dy = x - pts[i - 1][0], y - pts[i - 1][1]
        else:
            dx = pts[i + 1][0] - pts[i - 1][0]
            dy = pts[i + 1][1] - pts[i - 1][1]
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length, dx / length
        half = max(6.0, widths[i]) / 2
        left.append((x + nx * half, y + ny * half))
        right.append((x - nx * half, y - ny * half))
    for i in range(len(pts) - 1):
        plate.stamp(poly_mask([left[i], left[i + 1], right[i + 1], right[i]]), color_at(i))


def wave_band(plate: Plate, y0: float, y1: float, color: int, phase: float, amp: float = 12) -> None:
    top: list[tuple[float, float]] = []
    bot: list[tuple[float, float]] = []
    for k in range(21):
        x = VW * k / 20
        wobble = math.sin(k * 0.85 + phase) * amp
        top.append((x, y0 + wobble))
        bot.append((x, y1 + math.sin(k * 0.6 + phase + 1.2) * amp * 0.65))
    plate.stamp(poly_mask(top + bot[::-1]), color)


def cover(plate: Plate, color: int) -> None:
    plate.stamp(np.ones((H, W), dtype=bool), color)


def sample_curve(fn, n: int) -> list[tuple[float, float]]:
    return [fn(i / (n - 1)) for i in range(n)]


def neighbor_counts(img: np.ndarray, mask: np.ndarray, k: int) -> list[tuple[int, int]]:
    dil = cv2.dilate(mask.astype(np.uint8), np.ones((k, k), np.uint8))
    edge = (dil == 1) & ~mask
    vals = img[edge]
    vals = vals[vals != 0]
    if vals.size == 0:
        return []
    ids, counts = np.unique(vals, return_counts=True)
    return list(zip((int(i) for i in ids), (int(c) for c in counts)))


def choose_dest(img: np.ndarray, mask: np.ndarray, my_color: int, color_of: dict[int, int], bg: set[int]) -> int | None:
    pairs: list[tuple[int, int]] = []
    for k in (3, 7, 15, 31):
        pairs = neighbor_counts(img, mask, k)
        if pairs:
            break
    if not pairs:
        return None

    def rank(item: tuple[int, int]) -> tuple[int, int, int]:
        nid, count = item
        other = color_of.get(nid, -1)
        same = 1 if other == my_color else 0
        both_bg = 1 if my_color in bg and other in bg else 0
        subject = 1 if my_color not in bg and other not in bg else 0
        return (same, both_bg, subject, count)

    pairs.sort(key=rank, reverse=True)
    return pairs[0][0]


def relabel(img: np.ndarray, color: dict[int, int], protect: dict[int, bool]):
    new = np.zeros_like(img)
    nc: dict[int, int] = {}
    np_: dict[int, bool] = {}
    nid = 1
    for old in np.unique(img):
        old = int(old)
        if old == 0:
            continue
        n, labels = cv2.connectedComponents((img == old).astype(np.uint8), connectivity=8)
        for i in range(1, n):
            new[labels == i] = nid
            nc[nid] = color[old]
            np_[nid] = protect.get(old, False)
            nid += 1
    return new, nc, np_


def fill_zeros(img: np.ndarray) -> None:
    kernel = np.ones((3, 3), np.uint8)
    for _ in range(48):
        if not np.any(img == 0):
            return
        grown = cv2.dilate(img.astype(np.int32), kernel)
        holes = img == 0
        img[holes] = grown[holes]


def measure(img: np.ndarray, color_of: dict[int, int], protect: dict[int, bool]) -> list[dict]:
    found = []
    for rid in list(color_of):
        mask = img == rid
        area_px = int(mask.sum())
        if area_px == 0:
            continue
        dist = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 3)
        _min, radius, _min_loc, loc = cv2.minMaxLoc(dist)
        found.append(
            {
                "id": rid,
                "mask": mask,
                "area": area_px / (SCALE * SCALE),
                "radius": float(radius) / SCALE,
                "color": color_of[rid],
                "protect": protect.get(rid, False),
                "at": (float(loc[0]) / SCALE, float(loc[1]) / SCALE),
            }
        )
    return found


def absorb(plate: Plate) -> np.ndarray:
    fill_zeros(plate.img)
    img, color, protect = relabel(plate.img, plate.color, plate.protect)
    plate.color = color
    plate.protect = protect
    for _ in range(24):
        comps = measure(img, plate.color, plate.protect)
        bad = [c for c in comps if c["area"] < MIN_AREA or c["radius"] < MIN_RADIUS]
        todo = sorted(bad, key=lambda c: (c["area"], c["radius"]))
        if not bad and len(comps) > 450:
            pool = sorted((c for c in comps if not c["protect"]), key=lambda c: c["area"])
            todo = pool[: len(comps) - 430]
        if not todo:
            break
        merged = 0
        for comp in todo:
            if not np.any(img == comp["id"]):
                continue
            dest = choose_dest(img, img == comp["id"], comp["color"], plate.color, plate.background)
            if dest is None or dest == comp["id"]:
                continue
            img[img == comp["id"]] = dest
            plate.protect.pop(comp["id"], None)
            plate.color.pop(comp["id"], None)
            merged += 1
        if merged == 0:
            break
    img, color, protect = relabel(img, plate.color, plate.protect)
    plate.img = img
    plate.color = color
    plate.protect = protect
    fill_zeros(plate.img)
    return plate.img


def mask_path(mask: np.ndarray) -> tuple[str | None, bool]:
    thick = cv2.dilate(mask.astype(np.uint8) * 255, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(thick, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_L1)
    parts: list[str] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        eps = 1.15 if area < 8000 else 1.55
        approx = cv2.approxPolyDP(contour, eps, True)
        if len(approx) < 3:
            continue
        pts = approx.reshape(-1, 2)
        bits = [f"M{pts[0, 0] / SCALE:.2f} {pts[0, 1] / SCALE:.2f}"]
        bits.extend(f"L{x / SCALE:.2f} {y / SCALE:.2f}" for x, y in pts[1:])
        bits.append("Z")
        parts.append("".join(bits))
    if not parts:
        return None, False
    return " ".join(parts), len(parts) > 1


def outline_path(img: np.ndarray, color_of: dict[int, int], background: set[int]) -> str:
    color_img = np.zeros((H, W), np.uint8)
    for rid, color in color_of.items():
        if color in background:
            continue
        color_img[img == rid] = np.uint8(color + 1)
    parts: list[str] = []
    for idx in [int(v) for v in np.unique(color_img) if int(v) != 0]:
        contours, _ = cv2.findContours((color_img == idx).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_L1)
        for contour in contours:
            if cv2.contourArea(contour) < 80:
                continue
            approx = cv2.approxPolyDP(contour, 1.45, True)
            if len(approx) < 3:
                continue
            pts = approx.reshape(-1, 2)
            bits = [f"M{pts[0, 0] / SCALE:.2f} {pts[0, 1] / SCALE:.2f}"]
            bits.extend(f"L{x / SCALE:.2f} {y / SCALE:.2f}" for x, y in pts[1:])
            bits.append("Z")
            parts.append("".join(bits))
    return " ".join(parts)


def big_enough(mask: np.ndarray) -> bool:
    area = float(mask.sum()) / (SCALE * SCALE)
    if area < MIN_AREA:
        return False
    dist = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 3)
    return float(dist.max()) / SCALE >= MIN_RADIUS


def lighter_color(colors: list[str], index: int) -> int:
    def rgb(hex_color: str) -> tuple[int, int, int]:
        value = hex_color.lstrip("#")
        return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)

    base = rgb(colors[index])
    target = tuple(min(255, channel + 42) for channel in base)
    best = index
    score = 10**9
    for i, color in enumerate(colors):
        sample = rgb(color)
        dist = sum((sample[k] - target[k]) ** 2 for k in range(3))
        if dist < score:
            best, score = i, dist
    return best


def split_elongated(mask: np.ndarray) -> tuple[np.ndarray, np.ndarray] | None:
    ys, xs = np.where(mask)
    if len(xs) < 40:
        return None
    pts = np.stack([xs.astype(np.float64), ys.astype(np.float64)], axis=1)
    center = pts.mean(axis=0)
    centered = pts - center
    cov = centered.T @ centered
    values, vectors = np.linalg.eigh(cov)
    major = vectors[:, 1]
    minor = vectors[:, 0]
    along = centered @ major
    across = centered @ minor
    span = float(np.percentile(along, 92) - np.percentile(along, 8))
    thick = float(np.percentile(np.abs(across), 92) * 2)
    if span < thick * 1.12 or span < MIN_RADIUS * SCALE * 2.4:
        return None
    mid = float(np.median(along))
    low = np.zeros(mask.shape, dtype=bool)
    high = np.zeros(mask.shape, dtype=bool)
    low[ys[along <= mid], xs[along <= mid]] = True
    high[ys[along > mid], xs[along > mid]] = True
    if not big_enough(low) or not big_enough(high):
        return None
    return low, high


def stretch_regions(plate: Plate, goal: int = 290) -> None:
    """Cut long petals, leaves, and feathers into a base and a tip."""
    for _ in range(12):
        comps = measure(plate.img, plate.color, plate.protect)
        if len(comps) >= goal:
            return
        comps.sort(key=lambda comp: -comp["area"])
        count = len(comps)
        progressed = False
        for comp in comps:
            if count >= goal:
                return
            if comp["color"] in plate.background or comp["protect"]:
                continue
            if not np.any(plate.img == comp["id"]):
                continue
            parts = split_elongated(plate.img == comp["id"])
            if not parts:
                continue
            _low, high = parts
            nid = plate.next_id
            plate.next_id += 1
            plate.img[high] = nid
            plate.color[nid] = lighter_color(plate.colors, comp["color"])
            plate.protect[nid] = False
            progressed = True
            count += 1
        if not progressed:
            return


def fill_openings(plate: Plate, goal: int = 270) -> None:
    """Put a petal or a small bloom in the largest open patch of the background."""
    choices = [i for i in range(len(plate.colors)) if i not in plate.background] or [0]
    margin = 16 * SCALE
    for n in range(180):
        if live_count(plate) >= goal:
            return
        free = (~plate.subject).astype(np.uint8)
        free[:margin, :] = 0
        free[-margin:, :] = 0
        free[:, :margin] = 0
        free[:, -margin:] = 0
        dist = cv2.distanceTransform(free, cv2.DIST_L2, 3)
        _min, peak, _at, loc = cv2.minMaxLoc(dist)
        if peak < 7.4 * SCALE:
            return
        cx = loc[0] / SCALE
        cy = loc[1] / SCALE
        room = peak / SCALE
        color = choices[n % len(choices)]
        tip = choices[(n + 2) % len(choices)]
        ang = (n * 47) % 180 - 90
        if room >= 20:
            bloom(plate, cx, cy, 5, min(30, room * 1.15), 14, ang, color, None, tip, None, avoid=True)
        else:
            petal(plate, cx, cy, ang, min(22, room * 1.55), min(13.5, max(12.4, room * 1.2)), color, None)


def export_picture(plate: Plate, meta: dict) -> dict:
    absorb(plate)
    before = live_count(plate)
    if before < 250:
        stretch_regions(plate, 320)
    if live_count(plate) < 250:
        fill_openings(plate, 272)
    img = plate.img
    comps = measure(img, plate.color, plate.protect)
    regions = []
    used: set[int] = set()
    worst_area = 9999.0
    worst_r = 9999.0
    for comp in comps:
        path, holes = mask_path(comp["mask"])
        if not path:
            raise RuntimeError(f"{meta['id']} lost a contour")
        worst_area = min(worst_area, comp["area"])
        worst_r = min(worst_r, comp["radius"])
        if comp["area"] < MIN_AREA or comp["radius"] < MIN_RADIUS:
            raise RuntimeError(
                f"{meta['id']} region color {comp['color']} area {comp['area']:.1f} radius {comp['radius']:.2f}"
            )
        hint = int(max(8, min(16, round(comp["radius"] * 1.05))))
        region = {
            "d": path,
            "n": comp["color"] + 1,
            "label": [round(comp["at"][0], 2), round(comp["at"][1], 2)],
            "hintSize": hint,
            "id": "",
        }
        if holes:
            region["evenodd"] = True
        regions.append((comp["area"], region))
        used.add(comp["color"])
    regions.sort(key=lambda item: -item[0])
    order = sorted(used)
    if len(order) < 10 or len(order) > 16:
        raise RuntimeError(f"{meta['id']} uses {len(order)} colors")
    remap = {old: i + 1 for i, old in enumerate(order)}
    colors = [plate.colors[old] for old in order]
    cleaned = []
    for i, (_, region) in enumerate(regions):
        region["n"] = remap[region["n"] - 1]
        region["id"] = f"r{i}"
        cleaned.append(region)
    count = len(cleaned)
    if count < 250 or count > 450:
        raise RuntimeError(f"{meta['id']} has {count} regions")
    picture = {
        "id": meta["id"],
        "category": "intricate",
        "title": meta["title"],
        "caption": meta["caption"],
        "viewBox": "0 0 320 460",
        "colors": colors,
        "regions": cleaned,
        "outline": outline_path(img, plate.color, plate.background),
        "ink": [{"d": d, "w": w} for d, w in plate.inks],
    }
    print(
        f"{meta['id']}: {count} regions, {len(colors)} colors, "
        f"min area {worst_area:.1f}, min radius {worst_r:.2f}"
    )
    return picture


def paint_preview(picture: dict, img: np.ndarray, color_of: dict[int, int], colors: list[str]) -> tuple[Image.Image, Image.Image]:
    rgb = np.zeros((H, W, 3), np.uint8)
    rgb[:] = PAPER
    for rid, color in color_of.items():
        hex_color = colors[color].lstrip("#")
        rgb[img == rid] = [int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)]
    edge = np.zeros((H, W), bool)
    edge[:, 1:] |= img[:, 1:] != img[:, :-1]
    edge[1:, :] |= img[1:, :] != img[:-1, :]
    lines = np.zeros((H, W, 3), np.uint8)
    lines[:] = PAPER
    lines[edge] = (78, 58, 68)
    color_im = Image.fromarray(rgb).resize((VW, VH), Image.Resampling.BOX)
    line_im = Image.fromarray(lines).resize((VW, VH), Image.Resampling.BOX)
    return color_im, line_im


def save_picture(picture: dict, plate: Plate) -> tuple[Image.Image, Image.Image]:
    path = ART / f"{picture['id']}.json"
    path.write_text(json.dumps(picture, separators=(",", ":")), encoding="utf-8")
    color_im, line_im = paint_preview(picture, plate.img, plate.color, plate.colors)
    return color_im, line_im


def contact(images: list[tuple[str, Image.Image]], dest: Path) -> None:
    cell_w, cell_h = 160, 230
    cols = 4
    rows = math.ceil(len(images) / cols)
    sheet = Image.new("RGB", (cols * cell_w, rows * (cell_h + 22)), (255, 250, 246))
    draw = ImageDraw.Draw(sheet)
    for i, (title, image) in enumerate(images):
        thumb = image.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        x = (i % cols) * cell_w
        y = (i // cols) * (cell_h + 22)
        sheet.paste(thumb, (x, y + 18))
        draw.text((x + 6, y + 2), title, fill=(78, 58, 68))
    sheet.save(dest)


# --- scenes -------------------------------------------------------------------

def scene_morning() -> tuple[Plate, dict]:
    c = [
        "#f7e8f2", "#e7cfe6", "#d4b6d8", "#f8f4ea", "#d9c6f0", "#8e6cbc", "#5d3e8a",
        "#f0d15e", "#d7e7c2", "#8fb56e", "#4e7a49", "#3c5940", "#f6c9d6", "#e3a0b8",
    ]
    p = Plate(c, {0, 1, 2})
    cover(p, 0)
    wave_band(p, 0, 170, 0, 0.2, 14)
    wave_band(p, 120, 300, 1, 1.1, 16)
    wave_band(p, 250, 470, 2, 2.0, 12)
    # Trellis of thick vines.
    for x, phase in ((28, 0.2), (92, 1.1), (164, 0.4), (236, 1.6), (300, 0.8)):
        pts = sample_curve(lambda t, x=x, phase=phase: (x + math.sin(t * 6 + phase) * 10, 8 + t * 444), 8)
        ribbon(p, pts, [13] * 8, lambda i: 11 if i % 2 == 0 else 10)
    for y, phase in ((70, 0.3), (150, 1.2), (230, 0.6), (310, 1.4), (390, 0.2)):
        pts = sample_curve(lambda t, y=y, phase=phase: (t * 320, y + math.sin(t * 8 + phase) * 8), 8)
        ribbon(p, pts, [12.5] * 8, lambda i: 10 if i % 2 else 11)
    spots = []
    for row, y in enumerate((48, 128, 208, 288, 368)):
        for col, x in enumerate((28, 92, 164, 236, 300)):
            spots.append((x, y, (row + col) * 18))
    for i, (x, y, rot) in enumerate(spots):
        bloom(p, x, y, 5, 34, 16, rot, 5 if i % 2 == 0 else 13, 4 if i % 2 == 0 else 12, 6, 7)
        leaf(p, x + 16, y + 18, 32, 16, 50 + (i % 3) * 20, 10, 8)
        leaf(p, x - 18, y + 16, 30, 15, 130 + (i % 4) * 12, 9, 8)
    # Extra blossoms along the lower vines so the page stays dense without filler.
    for i, x in enumerate(range(20, 310, 36)):
        bloom(p, x, 430 - (i % 3) * 8, 5, 30, 15, i * 14, 13, 12, 5, 7)
    meta = {
        "id": "morning-glories",
        "title": "Morning Glories",
        "caption": "Trumpet blooms and heart-shaped leaves on a vine trellis.",
    }
    return p, meta


def scene_peony() -> tuple[Plate, dict]:
    c = [
        "#fbf3ee", "#f6e0e4", "#f8e4ec", "#f3c3d2", "#e398b0", "#c46d88", "#8f445c",
        "#e7f0d6", "#b7d09a", "#6f9a62", "#3f6b44", "#f7f1df", "#f0c36a", "#d98a4a", "#5c4638",
    ]
    p = Plate(c, {0, 1})
    cover(p, 0)
    wave_band(p, 0, 210, 0, 0.4, 10)
    wave_band(p, 160, 470, 1, 1.3, 14)
    p.stamp(ellipse_mask(160, 430, 180, 70, 0), 8)
    p.stamp(ellipse_mask(160, 448, 150, 40, 0), 9)

    def peony(cx: float, cy: float, scale: float, rot: float) -> None:
        bloom(p, cx, cy, 11, 78 * scale, 30 * scale, rot, 5, 3, 6, 4)
        bloom(p, cx, cy, 9, 56 * scale, 24 * scale, rot + 16, 4, 3, 6, 2)
        bloom(p, cx, cy, 8, 36 * scale, 18 * scale, rot + 8, 3, 2, 7, 6)

    peony(168, 168, 1.05, 8)
    peony(62, 250, 0.72, 20)
    peony(262, 246, 0.7, -6)
    peony(118, 340, 0.62, 14)
    peony(230, 352, 0.6, 28)
    for i, (x, y, ang) in enumerate(
        (
            (40, 150, 110), (70, 130, 80), (250, 140, -40), (290, 170, -70),
            (30, 330, 140), (300, 320, 40), (150, 90, -80), (190, 100, -30),
            (90, 200, 160), (240, 200, 20), (40, 400, 120), (280, 400, 60),
            (120, 420, 100), (200, 424, 70), (160, 250, 30),
        )
    ):
        leaf(p, x, y, 40 + (i % 3) * 8, 16 + (i % 2) * 4, ang, 10 if i % 2 == 0 else 9, 8)
    # Butterfly, right of the main bloom. Wings are broad sections, not a mosaic.
    bx, by = 250, 118
    for sign, ang in ((1, -28), (-1, 208)):
        petal(p, bx, by, ang, 52, 28, 13, 12)
        petal(p, bx + sign * 6, by + 16, ang + sign * 18, 40, 24, 14, 13)
        p.stamp(ellipse_mask(bx + sign * 22, by - 8, 8, 6.6, ang), 12)
    p.stamp(capsule_mask(bx - 8, by + 2, bx + 10, by + 6, 6.4), 14, protect=True)
    p.stamp(circle_mask(bx + 12, by + 2, 6.5), 14, protect=True)
    p.ink([(bx + 14, by - 2), (bx + 26, by - 16)], 1.3)
    p.ink([(bx + 10, by - 1), (bx + 18, by - 18)], 1.3)
    for i, (x, y) in enumerate(((48, 70), (280, 64), (24, 210), (300, 280), (70, 400), (250, 430))):
        bloom(p, x, y, 6, 28, 15, i * 12, 4, 3, 7, 6)
    for i in range(16):
        ang = math.radians(i * 22.5 - 90)
        x = min(292, max(28, 160 + math.cos(ang) * 132))
        y = min(430, max(36, 230 + math.sin(ang) * 176))
        bloom(p, x, y, 6, 30, 16, i * 11, 4 if i % 2 == 0 else 5, 3, 6, 2)
        leaf(p, x + 14, y + 8, 28, 14, 35 + i * 8, 10, 8)

    def plant_peony(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        bloom(plate, x, y, 6, 26, 14, n * 9, 4 if n % 2 == 0 else 5, 3, 6, None, avoid=True)

    sow(p, (16, 24, 304, 440), 58, plant_peony, 300)
    meta = {
        "id": "peony-garden",
        "title": "Peony Garden",
        "caption": "Layered peonies and a butterfly in a soft border.",
    }
    return p, meta


def scene_koi() -> tuple[Plate, dict]:
    c = [
        "#e5f3f1", "#c5e4e0", "#8fcfc8", "#4eaaa6", "#f8e8ec", "#f3c6d2", "#e08aa2",
        "#f7f2c4", "#f8f5f0", "#f0b08a", "#e07a48", "#c4482a", "#3e3538", "#d7e6bc", "#6f9a5c",
    ]
    p = Plate(c, {0, 1, 2, 3})
    cover(p, 0)
    wave_band(p, 0, 140, 0, 0.2, 12)
    wave_band(p, 90, 240, 1, 1.0, 16)
    wave_band(p, 190, 340, 2, 1.8, 14)
    wave_band(p, 300, 470, 3, 0.6, 12)

    def koi(x0: float, y0: float, length: float, amp: float, phase: float, tilt: float) -> None:
        n = 9
        pts = []
        widths = []
        rad = math.radians(tilt)
        for i in range(n):
            t = i / (n - 1)
            along = t * length
            side = math.sin(t * math.pi * 1.35 + phase) * amp
            x = x0 + math.cos(rad) * along - math.sin(rad) * side
            y = y0 + math.sin(rad) * along + math.cos(rad) * side
            w = 16 + math.sin(t * math.pi) * 20
            if t > 0.84:
                w = 13
            pts.append((x, y))
            widths.append(w)
        ribbon(p, pts, widths, lambda i: 10 if i < 3 else 11 if i < 6 else 12)
        # Head and tail read as parts of the fish, not extra spots.
        hx, hy = pts[0]
        tx, ty = pts[-1]
        p.stamp(ellipse_mask(hx, hy, 16, 12, tilt), 10, protect=True)
        p.stamp(circle_mask(hx - math.cos(rad) * 6, hy - math.sin(rad) * 6, 6.6), 8, protect=True)
        p.stamp(circle_mask(hx - math.cos(rad) * 8, hy - math.sin(rad) * 4, 6.4), 13, protect=True)
        p.ink([(hx - 2, hy - 3), (hx + 2, hy - 3)], 1.5)
        petal(p, tx, ty, tilt + 28, 32, 16, 12, 11, protect=True)
        petal(p, tx, ty, tilt - 28, 32, 16, 11, 10, protect=True)
        mx, my = pts[4]
        p.stamp(ellipse_mask(mx, my - 16, 16, 10, tilt - 70), 9)
        p.stamp(ellipse_mask(mx, my + 14, 18, 9, tilt + 80), 10)
        for spot_i, (sx_, sy_) in enumerate(pts[2:6]):
            p.stamp(circle_mask(sx_, sy_, 6.8), 8 if spot_i % 2 == 0 else 9)

    koi(36, 150, 168, 16, 0.4, 18)
    koi(250, 300, 170, 18, 1.2, 198)

    def lotus(cx: float, cy: float, scale: float, rot: float) -> None:
        bloom(p, cx, cy, 10, 46 * scale, 18 * scale, rot, 6, 5, 7, 4)
        bloom(p, cx, cy, 8, 30 * scale, 15 * scale, rot + 18, 5, 4, 7, 8)

    lotus(78, 250, 1.15, 10)
    lotus(214, 132, 1.0, -8)
    lotus(168, 360, 0.95, 16)
    for i, (x, y, ang) in enumerate(
        ((40, 80, 20), (120, 70, -10), (200, 210, 16), (270, 80, -20), (300, 200, 24), (50, 360, 12), (250, 400, -16), (140, 420, 8))
    ):
        p.stamp(ellipse_mask(x, y, 28, 16, ang), 14)
        p.stamp(ellipse_mask(x + 6, y - 2, 16, 9, ang), 13)
        p.ink([(x - 10, y), (x + 16, y - 4)], 1.2)
        if i % 2 == 0:
            p.stamp(capsule_mask(x, y, x + 8, y - 48, 6.2), 14)
            bloom(p, x + 8, y - 56, 6, 22, 13, -80, 5, 4, 7, None)
    for i, x in enumerate(range(24, 310, 28)):
        p.stamp(ellipse_mask(x, 448, 12, 7, 8 + i), 13 if i % 2 == 0 else 14)

    def plant_koi(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        if n % 3 == 0:
            plate.stamp(ellipse_mask(x, y, 22, 13, 10 + row * 7), 14 if n % 2 == 0 else 13, avoid=True)
            plate.stamp(ellipse_mask(x + 5, y - 1, 12, 7.2, 10 + row * 7), 13 if n % 2 == 0 else 14, avoid=True)
        else:
            bloom(plate, x, y, 6, 26, 14, n * 11, 6 if n % 2 == 0 else 5, 4, 7, 8, avoid=True)

    sow(p, (16, 24, 304, 436), 46, plant_koi, 360)
    meta = {
        "id": "koi-pond",
        "title": "Koi Pond",
        "caption": "Two koi under lotus blooms and lily pads.",
    }
    return p, meta


def scene_owl() -> tuple[Plate, dict]:
    c = [
        "#d5d8ea", "#b7c0dc", "#8d9bbf", "#f6f1e2", "#f4d7e2", "#e7a9c0", "#c47896",
        "#e6d2b4", "#c7a67c", "#8d6848", "#4e382c", "#6d8f62", "#3f6844", "#f7f4ea", "#2c2826",
    ]
    p = Plate(c, {0, 1, 2})
    cover(p, 0)
    wave_band(p, 0, 180, 2, 0.4, 12)
    wave_band(p, 130, 300, 1, 1.2, 14)
    wave_band(p, 250, 470, 0, 0.5, 10)
    p.stamp(circle_mask(250, 78, 28), 3)
    p.stamp(circle_mask(258, 74, 16), 0)
    # Branch in four bark lengths.
    branch = sample_curve(lambda t: (t * 330 - 6, 292 + math.sin(t * 5.2) * 16), 7)
    ribbon(p, branch, [20, 22, 24, 22, 20, 18, 16], lambda i: 10 if i % 2 == 0 else 9)
    # Owl body, belly, wings, head, face, beak, feet.
    p.stamp(ellipse_mask(168, 214, 52, 68, 0), 8, protect=True)
    p.stamp(ellipse_mask(168, 230, 32, 40, 0), 7, protect=True)
    for i, ang in enumerate((-20, -5, 8, 22)):
        petal(p, 118, 200, 180 + ang, 58, 22, 9 if i % 2 == 0 else 10, 8, protect=True)
        petal(p, 214, 200, ang, 58, 22, 10 if i % 2 == 0 else 9, 8, protect=True)
    p.stamp(circle_mask(168, 148, 36), 8, protect=True)
    p.stamp(ellipse_mask(168, 156, 24, 20, 0), 7, protect=True)
    petal(p, 142, 116, -110, 34, 16, 10, 9, protect=True)
    petal(p, 194, 116, -70, 34, 16, 10, 9, protect=True)
    p.stamp(circle_mask(150, 146, 14), 13, protect=True)
    p.stamp(circle_mask(186, 146, 14), 13, protect=True)
    p.stamp(circle_mask(150, 146, 7.2), 11, protect=True)
    p.stamp(circle_mask(186, 146, 7.2), 11, protect=True)
    p.stamp(circle_mask(150, 146, 6.4), 14, protect=True)
    p.stamp(circle_mask(186, 146, 6.4), 14, protect=True)
    p.stamp(poly_mask([(168, 158), (158, 176), (178, 176)]), 11, protect=True)
    p.stamp(ellipse_mask(154, 214, 8, 12, 8), 10, protect=True)
    p.stamp(ellipse_mask(182, 214, 8, 12, -8), 10, protect=True)
    p.stamp(capsule_mask(150, 268, 142, 300, 6.5), 11, protect=True)
    p.stamp(capsule_mask(186, 268, 196, 300, 6.5), 11, protect=True)
    p.ink([(158, 168), (164, 172), (170, 168)], 1.35)
    # Blossoms crowded along the branch and a few above it.
    flowers = []
    for i in range(16):
        t = i / 15
        flowers.append((12 + t * 296, 300 + math.sin(t * 8) * 18, i * 15))
    for x, y in ((40, 70), (90, 120), (230, 150), (300, 210), (20, 210), (270, 40), (40, 180)):
        flowers.append((x, y, x))
    for i, (x, y, rot) in enumerate(flowers):
        bloom(p, x, y, 5, 30, 15, rot, 5 if i % 2 == 0 else 6, 4, 7, 3)
        leaf(p, x + 14, y + 8, 28, 14, 40 + (i % 5) * 18, 12, 11)
        leaf(p, x - 12, y + 10, 26, 13, 150, 11, 12)
    for i in range(8):
        leaf(p, 20 + i * 38, 360 + (i % 2) * 16, 36, 16, 70 + i * 8, 12 if i % 2 == 0 else 11, 11)

    def plant_owl(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        bloom(plate, x, y, 5, 26, 14, n * 13, 5 if n % 2 == 0 else 6, 4, 7, 3, avoid=True)
        if n % 2 == 0:
            leaf(plate, x + 12, y + 8, 26, 14, 30 + row * 12, 12, 11, avoid=True)

    sow(p, (14, 88, 306, 446), 42, plant_owl, 360)
    meta = {
        "id": "flowering-owl",
        "title": "Flowering Owl",
        "caption": "An owl perched in a branch of open blossoms.",
    }
    return p, meta


def scene_mandala() -> tuple[Plate, dict]:
    c = [
        "#fbf6f1", "#f8e7ee", "#f3c9d8", "#e7a3ba", "#c86d8c", "#8d4662",
        "#e7f0d8", "#b7d4a4", "#6ea06a", "#3f6e4c", "#f3e2b0", "#e2c06a",
        "#d08a4a", "#7d5b8e", "#efe6f4", "#5c463c",
    ]
    p = Plate(c, {0})
    cover(p, 0)
    cx, cy = 160, 224
    rings = [
        (8, 30, 3, 2),
        (12, 54, 4, 3),
        (16, 78, 13, 5),
        (18, 102, 8, 7),
        (20, 126, 11, 12),
        (22, 150, 9, 6),
    ]
    for n, orbit, base, tip in rings:
        for i in range(n):
            ang = -90 + i * (360 / n) + (8 if orbit > 100 else 0)
            rad = math.radians(ang)
            split_petal(
                p,
                cx + math.cos(rad) * orbit,
                cy + math.sin(rad) * orbit,
                ang,
                30,
                14,
                base,
                tip,
            )
    p.stamp(circle_mask(cx, cy, 14), 11, protect=True)
    p.stamp(circle_mask(cx, cy, 7), 5, protect=True)
    # Corner sprigs keep the mandala from floating in an empty field.
    for i, (x, y) in enumerate(((46, 46), (274, 46), (46, 414), (274, 414))):
        bloom(p, x, y, 8, 36, 16, i * 12, 4, 3, 5, 11)
        bloom(p, x, y, 6, 22, 14, i * 20 + 8, 13, 12, 5, None)
        for ang in (20, 70, 120, 180, 230, 290):
            leaf(p, x, y, 34, 14, ang + i * 8, 8 if ang % 40 == 0 else 9, 7)
    for i in range(12):
        ang = i * 30
        rad = math.radians(ang - 90)
        leaf(p, cx + math.cos(rad) * 156, cy + math.sin(rad) * 168, 26, 13, ang - 90, 8, 7)
    meta = {
        "id": "mandala-bloom",
        "title": "Mandala Bloom",
        "caption": "A round flower mandala with a sprig in each corner.",
    }
    return p, meta


def scene_hummingbird() -> tuple[Plate, dict]:
    c = [
        "#f8f1ea", "#f6e3ea", "#e7c6d4", "#f28b6a", "#d4544a", "#f7e08a",
        "#d9efc4", "#8fc07a", "#4f8a56", "#2f5e40", "#7ec8c4", "#3e8e96",
        "#f7f4ef", "#5c463c", "#c9a06a", "#2e6b8a",
    ]
    p = Plate(c, {0, 1})
    cover(p, 0)
    wave_band(p, 0, 200, 0, 0.3)
    wave_band(p, 150, 470, 1, 1.1)

    def trumpet(cx: float, cy: float, ang: float, scale: float) -> None:
        rad = math.radians(ang)
        x0 = cx - math.cos(rad) * 34 * scale
        y0 = cy - math.sin(rad) * 34 * scale
        p.stamp(capsule_mask(x0, y0, cx, cy, 7.2 * scale), 9)
        bloom(p, cx, cy, 5, 40 * scale, 18 * scale, ang, 4, 3, 5, 6)
        p.stamp(circle_mask(cx - math.cos(rad) * 6, cy - math.sin(rad) * 6, 8 * scale), 5)

    spots = [
        (70, 80, -40, 1.0), (180, 70, -70, 0.95), (270, 110, -20, 0.9),
        (46, 180, 20, 0.85), (250, 200, -10, 1.05), (120, 250, 30, 0.8),
        (300, 280, 10, 0.9), (80, 330, -30, 1.0), (190, 360, -50, 0.95),
        (40, 420, -80, 0.85), (150, 150, 40, 0.75), (230, 420, 20, 0.9),
        (120, 430, -20, 0.8), (280, 40, -60, 0.75),
    ]
    for x, y, ang, scale in spots:
        trumpet(x, y, ang, scale)
        leaf(p, x + 18, y + 20, 34, 16, ang + 40, 8, 6)
        leaf(p, x - 16, y + 18, 30, 15, ang + 140, 9, 7)
    # Vine linking the flowers.
    vine = sample_curve(lambda t: (20 + t * 280, 40 + math.sin(t * 9) * 36 + t * 360), 14)
    ribbon(p, vine, [12.5] * 14, lambda i: 9 if i % 2 == 0 else 8)
    # Hummingbird hovering at the central trumpet. Broad wing feathers, a thick beak.
    bx, by = 168, 188
    p.stamp(ellipse_mask(bx, by, 22, 14, -16), 11, protect=True)
    p.stamp(ellipse_mask(bx - 4, by + 4, 12, 8, -16), 10, protect=True)
    p.stamp(circle_mask(bx + 22, by - 8, 11), 12, protect=True)
    p.stamp(capsule_mask(bx + 30, by - 10, bx + 62, by - 16, 6.2), 14, protect=True)
    p.stamp(circle_mask(bx + 24, by - 10, 6.5), 14, protect=True)
    for i, ang in enumerate((-70, -48, -28, -8)):
        petal(p, bx - 6, by - 4, ang, 46, 16, 15 if i % 2 == 0 else 11, 10, protect=True)
    for i, ang in enumerate((150, 168, 186)):
        petal(p, bx - 18, by + 4, ang, 32, 14, 4 if i != 1 else 5, 3, protect=True)
    p.ink([(bx + 26, by - 12), (bx + 28, by - 8)], 1.4)

    def plant_bird(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        bloom(plate, x, y, 5, 30, 15, -70 + n * 8, 4 if n % 2 == 0 else 3, 5, 6, None, avoid=True)
        leaf(plate, x + 8, y + 14, 28, 14, 40 + row * 15, 8, 6, avoid=True)

    sow(p, (18, 30, 302, 440), 50, plant_bird, 340)
    meta = {
        "id": "trumpet-hummingbird",
        "title": "Trumpet Flowers",
        "caption": "A hummingbird at a stand of trumpet flowers.",
    }
    return p, meta


def scene_fox() -> tuple[Plate, dict]:
    c = [
        "#f8e7d4", "#f0c9a4", "#e4a878", "#f2c14e", "#e07a34", "#c44822", "#8f4630",
        "#e39a58", "#c46a32", "#f7f1e4", "#5c382c", "#6b4636", "#8f6850", "#e4d0b0",
        "#c4a888", "#f6e2c4",
    ]
    p = Plate(c, {0, 1, 2})
    cover(p, 0)
    wave_band(p, 0, 150, 0, 0.2, 12)
    wave_band(p, 100, 250, 1, 1.0, 14)
    wave_band(p, 200, 340, 2, 0.4, 10)
    p.stamp(ellipse_mask(160, 430, 200, 80, 0), 13)
    p.stamp(ellipse_mask(80, 448, 120, 40, 0), 14)
    p.stamp(ellipse_mask(240, 450, 110, 36, 0), 14)

    def canopy(cx: float, cy: float, n: int, spread: float, rot: float) -> None:
        for i in range(n):
            ang = rot + i * (180 / max(1, n - 1)) - 90
            rad = math.radians(ang)
            leaf(
                p,
                cx + math.cos(rad) * spread * 0.2,
                cy + math.sin(rad) * spread * 0.15,
                28 + (i % 3) * 6,
                15,
                ang,
                (4, 5, 6, 3)[i % 4],
                3 if i % 2 == 0 else 4,
            )

    for tx, top, height in ((48, 70, 250), (270, 90, 230), (150, 40, 200)):
        p.stamp(capsule_mask(tx, top + height, tx + 6, top + 40, 9), 11)
        p.stamp(capsule_mask(tx + 4, top + height - 10, tx + 10, top + 80, 7), 12)
        canopy(tx + 8, top + 70, 14, 70, 10 if tx < 160 else -8)
    # Fox, large enough that ears, muzzle, and tail stay separate.
    p.stamp(ellipse_mask(214, 300, 36, 22, -30), 8, protect=True)
    p.stamp(ellipse_mask(248, 276, 16, 12, -40), 9, protect=True)
    p.stamp(ellipse_mask(176, 318, 40, 28, 8), 7, protect=True)
    p.stamp(ellipse_mask(166, 324, 20, 18, 10), 9, protect=True)
    p.stamp(ellipse_mask(150, 268, 26, 22, 0), 7, protect=True)
    p.stamp(ellipse_mask(126, 276, 16, 11, -8), 8, protect=True)
    p.stamp(circle_mask(112, 276, 6.6), 10, protect=True)
    petal(p, 136, 242, -110, 30, 16, 7, 15, protect=True)
    petal(p, 164, 240, -70, 30, 16, 7, 15, protect=True)
    p.stamp(circle_mask(142, 264, 6.6), 10, protect=True)
    p.ink([(140, 264), (144, 264)], 1.6)
    p.stamp(capsule_mask(156, 340, 150, 382, 7), 8, protect=True)
    p.stamp(capsule_mask(178, 342, 184, 386, 7), 7, protect=True)
    p.stamp(capsule_mask(196, 336, 208, 378, 6.6), 8, protect=True)
    # Ferns and fallen leaves fill the floor without a grid.
    for i in range(18):
        x = 16 + (i * 17) % 300
        y = 360 + (i % 5) * 16
        leaf(p, x, y, 32, 14, -70 - (i % 4) * 16, (5, 6, 4)[i % 3], 3)
    for i in range(10):
        x = 24 + i * 30
        y = 400 + (i % 3) * 12
        p.stamp(ellipse_mask(x, y, 16, 8, 20 + i * 9), 5 if i % 2 == 0 else 6)
        p.stamp(capsule_mask(x, y, x, y - 22, 6.2), 12)
        p.stamp(ellipse_mask(x, y - 28, 12, 7, 0), 4 if i % 2 == 0 else 9)

    def plant_fox(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        leaf(plate, x, y, 26, 14, -80 + (n % 6) * 22, (4, 5, 6, 3)[n % 4], 3 if n % 2 == 0 else 4, avoid=True)

    sow(p, (12, 16, 308, 446), 30, plant_fox, 360)
    meta = {
        "id": "autumn-fox",
        "title": "Autumn Fox",
        "caption": "A fox sitting under red and gold trees.",
    }
    return p, meta


def scene_coral() -> tuple[Plate, dict]:
    c = [
        "#e5f4f6", "#c5e6ea", "#8fd0d4", "#f6f1e6", "#f0d8c4", "#e7b89a",
        "#d98a72", "#f2b6c4", "#e07a96", "#7d4d6a", "#d8f0c8", "#7dba8a",
        "#3e8f8a", "#f4e08a", "#5c463c", "#f7fbfb",
    ]
    p = Plate(c, {0, 1, 2})
    cover(p, 0)
    wave_band(p, 0, 160, 0, 0.2, 10)
    wave_band(p, 110, 300, 1, 1.1, 14)
    wave_band(p, 250, 470, 2, 0.7, 12)
    p.stamp(ellipse_mask(160, 450, 190, 50, 0), 4)

    def shell(cx: float, cy: float, scale: float, rot: float) -> None:
        pts = []
        widths = []
        steps = 16
        for i in range(steps):
            t = i / (steps - 1)
            ang = math.radians(rot + t * 340)
            rad = (16 + t * 78) * scale
            pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad * 0.78))
            widths.append((15 + t * 20) * scale)
        ribbon(p, pts, widths, lambda i: 5 if i % 3 == 0 else 6 if i % 3 == 1 else 7)
        p.stamp(ellipse_mask(pts[0][0], pts[0][1], 14 * scale, 10 * scale, rot), 4, protect=True)
        p.stamp(ellipse_mask(pts[-1][0], pts[-1][1], 18 * scale, 12 * scale, rot + 40), 8)

    shell(168, 250, 1.05, -40)
    shell(70, 150, 0.55, 20)
    shell(250, 360, 0.5, 140)

    def coral(x: float, y: float, ang: float, length: float, width: float, depth: int, hue: int) -> None:
        if depth == 0 or length < 26 or width < 12:
            p.stamp(ellipse_mask(x, y, max(8, width * 0.7), max(7, width * 0.55), ang), hue)
            return
        rad = math.radians(ang)
        x2 = x + math.cos(rad) * length
        y2 = y + math.sin(rad) * length
        p.stamp(capsule_mask(x, y, x2, y2, width / 2), hue)
        coral(x2, y2, ang - 26, length * 0.72, width * 0.86, depth - 1, 8 if hue == 9 else 9)
        coral(x2, y2, ang + 22, length * 0.68, width * 0.82, depth - 1, 12 if depth % 2 == 0 else hue)

    for x, y, ang in (
        (40, 400, -80), (90, 420, -60), (200, 430, -90), (260, 410, -70), (300, 390, -50),
        (30, 300, -40), (300, 240, -120), (20, 200, -20),
    ):
        coral(x, y, ang, 54, 16, 3, 9)
    for i in range(9):
        x = 30 + i * 32
        pts = sample_curve(lambda t, x=x, i=i: (x + math.sin(t * 6 + i) * 14, 80 + t * 300), 7)
        ribbon(p, pts, [12, 13, 14, 13, 12, 12, 12], lambda k, i=i: 11 if (k + i) % 2 == 0 else 10)
    # Anemones and a starfish.
    for x, y in ((120, 120), (230, 90), (60, 70)):
        p.stamp(circle_mask(x, y, 14), 13)
        for k in range(8):
            ang = k * 45
            petal(p, x, y, ang, 28, 13, 8 if k % 2 == 0 else 7, None)
    for k in range(5):
        ang = -90 + k * 72
        petal(p, 250, 180, ang, 36, 16, 5, 4, protect=True)
    p.stamp(circle_mask(250, 180, 10), 14, protect=True)
    for i, (x, y) in enumerate(((40, 40), (160, 36), (280, 48), (120, 200), (180, 300))):
        p.stamp(circle_mask(x, y, 8 + (i % 2)), 15)

    def plant_reef(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        if n % 2 == 0:
            bloom(plate, x, y, 6, 24, 13, n * 14, 8 if row % 2 == 0 else 9, None, 13, None, avoid=True)
        else:
            plate.stamp(ellipse_mask(x, y, 18, 11, row * 9), 6 if n % 4 else 5, avoid=True)
            plate.stamp(ellipse_mask(x + 3, y, 10, 6.6, row * 9), 7, avoid=True)

    sow(p, (16, 30, 304, 430), 48, plant_reef, 340)
    meta = {
        "id": "coral-shell",
        "title": "Coral and Shell",
        "caption": "A spiral shell among coral, weed, and anemones.",
    }
    return p, meta


def scene_wisteria() -> tuple[Plate, dict]:
    c = [
        "#f7f3ea", "#e7eef2", "#d5e2ea", "#c9b6e6", "#9a78c4", "#6d4e9a",
        "#efe6f8", "#dcecc8", "#8fbe78", "#4f7e4e", "#6b5344", "#e7cbb0",
        "#f6d7e4", "#c986a4", "#8d6848", "#f8f6f2",
    ]
    p = Plate(c, {0, 1, 2})
    cover(p, 0)
    wave_band(p, 0, 200, 1, 0.3, 12)
    wave_band(p, 140, 340, 2, 1.0, 10)
    wave_band(p, 300, 470, 0, 0.2, 8)
    p.stamp(ellipse_mask(160, 450, 170, 48, 0), 11)
    # Arch.
    arch = sample_curve(
        lambda t: (24 + t * 272, 390 - math.sin(t * math.pi) * 280),
        12,
    )
    ribbon(p, arch, [16] * 12, lambda i: 10 if i % 2 == 0 else 14)
    # Hanging racemes.
    for i in range(18):
        t = (i + 0.5) / 18
        x = 24 + t * 272
        y = 390 - math.sin(t * math.pi) * 280
        drop = 70 + (i % 4) * 18
        for k in range(6):
            by = y + 16 + k * 16
            bloom(p, x + math.sin(k + i) * 3, by, 5, 20, 13, k * 16, 5 if (i + k) % 2 == 0 else 4, 3, 6, 15)
        leaf(p, x, y, 30, 14, -100 + (i % 5) * 10, 9, 8)
        if i % 2 == 0:
            leaf(p, x + 10, y + 6, 26, 13, 40, 8, 7)
        _ = drop
    for i, x in enumerate(range(36, 300, 28)):
        leaf(p, x, 400, 34, 15, 60 + (i % 3) * 20, 9, 8)
        if i % 2 == 0:
            bloom(p, x, 424, 5, 22, 13, 8, 13, 12, 5, 6)
    # Posts of the arch.
    p.stamp(capsule_mask(30, 200, 26, 420, 8), 10)
    p.stamp(capsule_mask(292, 200, 296, 420, 8), 14)

    def plant_wisteria(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        bloom(plate, x, y, 5, 22, 13, n * 10, 5 if n % 2 == 0 else 4, 3, 6, 15, avoid=True)

    sow(p, (18, 140, 302, 446), 32, plant_wisteria, 360)
    meta = {
        "id": "wisteria-arch",
        "title": "Wisteria Arch",
        "caption": "Racemes of wisteria hanging from a garden arch.",
    }
    return p, meta


def scene_sunflower() -> tuple[Plate, dict]:
    c = [
        "#fbf6ee", "#f8e7c4", "#f2c14e", "#e2a020", "#c47a14", "#8a5610",
        "#f6e2a8", "#e7f0c8", "#b7d08a", "#6f9a48", "#3f6a32", "#5c4630",
        "#f7f4ea", "#3e3530", "#f0d48a", "#d98a3a",
    ]
    p = Plate(c, {0, 1})
    cover(p, 0)
    wave_band(p, 0, 180, 0, 0.2, 8)
    wave_band(p, 150, 300, 1, 0.8, 10)
    p.stamp(ellipse_mask(160, 430, 200, 90, 0), 8)
    p.stamp(ellipse_mask(160, 455, 160, 40, 0), 9)

    def sunflower(cx: float, cy: float, scale: float, rot: float, petals: int) -> None:
        p.stamp(capsule_mask(cx, cy + 20 * scale, cx + 4, cy + 90 * scale, 6.4), 11)
        leaf(p, cx - 8, cy + 40 * scale, 36 * scale, 16, 150, 10, 8)
        leaf(p, cx + 10, cy + 48 * scale, 34 * scale, 15, 30, 9, 8)
        bloom(p, cx, cy, petals, 62 * scale, 20 * scale, rot, 3, 2, 5, 6)
        bloom(p, cx, cy, max(8, petals - 4), 40 * scale, 16 * scale, rot + 10, 4, 15, 5, 13)

    sunflower(160, 168, 1.15, 6, 16)
    for x, y, scale, rot in (
        (58, 120, 0.72, 12),
        (270, 130, 0.7, -8),
        (46, 250, 0.66, 20),
        (276, 260, 0.68, 4),
        (100, 330, 0.7, 16),
        (220, 340, 0.72, -12),
        (160, 400, 0.6, 8),
    ):
        sunflower(x, y, scale, rot, 12)
    # Bees, each a few fat segments and two wings.
    for i, (x, y) in enumerate(((120, 150), (210, 200), (90, 300), (240, 300), (170, 250))):
        p.stamp(ellipse_mask(x, y, 14, 9, -20 + i * 6), 14, protect=True)
        p.stamp(ellipse_mask(x + 6, y + 1, 8, 7, 10), 6, protect=True)
        p.stamp(circle_mask(x + 16, y - 1, 6.5), 12, protect=True)
        p.stamp(ellipse_mask(x - 2, y - 10, 12, 7, -30), 0)
        p.stamp(ellipse_mask(x + 8, y - 8, 11, 6.5, 20), 0)
        p.ink([(x + 18, y - 4), (x + 24, y - 12)], 1.2)

    def plant_field(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        for k in range(8):
            ang = -90 + k * 45 + row * 6
            rad = math.radians(ang)
            split_petal(plate, x + math.cos(rad) * 14, y + math.sin(rad) * 14, ang, 34, 14, 3, 2, avoid=True)
        plate.stamp(circle_mask(x, y, 8), 5, avoid=True)
        leaf(plate, x + 6, y + 18, 28, 14, 50, 10, 8, avoid=True)

    sow(p, (20, 40, 300, 430), 72, plant_field, 340)
    meta = {
        "id": "sunflower-bees",
        "title": "Sunflower Bees",
        "caption": "Sunflowers across a field, with bees at the blooms.",
    }
    return p, meta


def scene_peacock() -> tuple[Plate, dict]:
    c = [
        "#f6f1e8", "#d7efe8", "#7ec8b8", "#2f8f86", "#1f5c62", "#f2d56a",
        "#e2a83a", "#c4622a", "#1f3f4a", "#e7d8c0", "#8fb56e", "#4f7a44",
        "#f4e7c8", "#6b4a8a", "#f7fbf8", "#3e6a38",
    ]
    p = Plate(c, {0})
    cover(p, 0)
    wave_band(p, 300, 470, 9, 0.4, 8)
    origin = (160, 500)

    def feather(ang: float, length: float, barbs: int) -> None:
        rad = math.radians(ang)
        for i in range(barbs):
            t = 0.34 + 0.42 * (i / max(1, barbs - 1))
            dist = 70 + (length - 70) * t
            bx = origin[0] + math.cos(rad) * dist
            by = origin[1] + math.sin(rad) * dist
            split_petal(p, bx, by, ang + 64, 32, 13, 3 if i % 2 == 0 else 2, 2)
            split_petal(p, bx, by, ang - 64, 32, 13, 2 if i % 2 == 0 else 4, 3)
        x0 = origin[0] + math.cos(rad) * 50
        y0 = origin[1] + math.sin(rad) * 50
        x1 = origin[0] + math.cos(rad) * (length * 0.62)
        y1 = origin[1] + math.sin(rad) * (length * 0.62)
        p.stamp(capsule_mask(x0, y0, x1, y1, 6.4), 8)
        ex = origin[0] + math.cos(rad) * length * 0.78
        ey = origin[1] + math.sin(rad) * length * 0.78
        p.stamp(ellipse_mask(ex, ey, 16, 12, ang), 4, protect=True)
        p.stamp(ellipse_mask(ex, ey, 10, 8, ang), 6, protect=True)
        p.stamp(ellipse_mask(ex, ey, 6.5, 6.4, ang), 7, protect=True)

    for ang in range(-155, -24, 18):
        feather(ang, 250, 5)
    for ang in range(-146, -30, 18):
        feather(float(ang), 190, 3)
    # Body and a little garden at the foot of the fan.
    p.stamp(ellipse_mask(160, 400, 36, 28, 0), 3, protect=True)
    p.stamp(circle_mask(160, 366, 16), 4, protect=True)
    p.stamp(poly_mask([(160, 360), (150, 348), (170, 348)]), 6, protect=True)
    p.stamp(circle_mask(154, 364, 6.4), 14, protect=True)
    for i, x in enumerate(range(24, 310, 34)):
        leaf(p, x, 430, 32, 14, -80 + (i % 4) * 18, 11, 10)
        if i % 2 == 0:
            bloom(p, x, 400, 6, 24, 14, i * 10, 5, 12, 6, 7)

    def plant_fan(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        for k in range(5):
            ang = -90 + k * 72
            rad = math.radians(ang)
            split_petal(plate, x + math.cos(rad) * 10, y + math.sin(rad) * 10, ang, 28, 13, 11 if n % 2 == 0 else 10, 2, avoid=True)
        plate.stamp(circle_mask(x, y, 7), 5, avoid=True)

    sow(p, (12, 280, 308, 452), 34, plant_fan, 360)
    sow(p, (8, 16, 58, 300), 36, plant_fan, 360)
    sow(p, (262, 16, 312, 300), 36, plant_fan, 360)
    meta = {
        "id": "peacock-fan",
        "title": "Peacock Fan",
        "caption": "A peacock's tail opened into a fan of eyed feathers.",
    }
    return p, meta


def scene_lanterns() -> tuple[Plate, dict]:
    c = [
        "#1e2438", "#2d3a5c", "#455888", "#f6e2a8", "#f0b84a", "#e07a3a",
        "#c44848", "#f7f1e2", "#d7c4a4", "#8f6a48", "#6b4636", "#8fb0c8",
        "#d7e6c0", "#6f9a62", "#e7b7c8", "#f4d7e4",
    ]
    p = Plate(c, {0, 1, 2})
    cover(p, 0)
    wave_band(p, 0, 180, 0, 0.2, 8)
    wave_band(p, 120, 320, 1, 1.0, 12)
    wave_band(p, 260, 470, 2, 0.5, 10)

    def lantern(cx: float, top: float, w: float, h: float, glow: int) -> None:
        p.stamp(capsule_mask(cx, top - 28, cx, top, 6.2), 10)
        p.stamp(round_rect_mask(cx - w / 2, top, w, h, 8), 10)
        p.stamp(poly_mask([(cx - w * 0.28, top - 2), (cx + w * 0.28, top - 2), (cx + w * 0.18, top - 16), (cx - w * 0.18, top - 16)]), 9)
        inset = 11
        cols, rows = 2, 3
        inner_w = w - inset * 2
        inner_h = h - inset * 2
        gap = 11
        pw = (inner_w - gap) / cols
        ph = (inner_h - gap * 2) / rows
        for row in range(rows):
            for col in range(cols):
                x = cx - w / 2 + inset + col * (pw + gap)
                y = top + inset + row * (ph + gap)
                tone = glow if (row == 1) else 7 if row == 0 else 4
                if col == 0 and row != 1:
                    tone = 11
                p.stamp(round_rect_mask(x, y, pw, ph, 3), tone)
        p.stamp(circle_mask(cx, top + h + 14, 6.6), 5)
        p.stamp(circle_mask(cx, top + h + 30, 6.4), 6)

    lanterns = [
        (60, 70, 70, 108, 3),
        (160, 46, 78, 120, 4),
        (262, 78, 70, 104, 5),
        (48, 230, 64, 96, 4),
        (160, 214, 86, 118, 3),
        (274, 236, 64, 96, 6),
        (100, 360, 60, 86, 5),
        (220, 368, 60, 88, 3),
    ]
    for cx, top, w, h, glow in lanterns:
        lantern(cx, top, w, h, glow)
    # Foliage between the lanterns, drawn as whole leaves and glass blossoms.
    sprigs = [
        (112, 150), (214, 160), (110, 300), (214, 310), (160, 340),
        (30, 180), (300, 190), (40, 340), (290, 350), (160, 180),
    ]
    for i, (x, y) in enumerate(sprigs):
        for ang in (-40, 20, 70, 120, 170, 220):
            leaf(p, x, y, 30, 14, ang + i * 4, 13, 12)
        bloom(p, x, y - 8, 5, 24, 14, i * 14, 15, 14, 5, 3)
    p.stamp(round_rect_mask(8, 8, 304, 18, 4), 10)
    p.stamp(round_rect_mask(8, 434, 304, 18, 4), 9)

    def plant_glass(plate: Plate, x: float, y: float, row: int, n: int) -> None:
        bloom(plate, x, y, 5, 24, 14, n * 12, 15, 14, 5, 3, avoid=True)
        leaf(plate, x + 10, y + 8, 26, 13, 20 + row * 18, 13, 12, avoid=True)

    sow(p, (16, 36, 304, 424), 42, plant_glass, 330)
    meta = {
        "id": "lantern-garden",
        "title": "Lantern Garden",
        "caption": "Leaded lanterns hanging in a night garden.",
    }
    return p, meta


SCENES = [
    scene_morning,
    scene_peony,
    scene_koi,
    scene_owl,
    scene_mandala,
    scene_hummingbird,
    scene_fox,
    scene_coral,
    scene_wisteria,
    scene_sunflower,
    scene_peacock,
    scene_lanterns,
]


def main() -> None:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    colored: list[tuple[str, Image.Image]] = []
    lined: list[tuple[str, Image.Image]] = []
    for build in SCENES:
        try:
            plate, meta = build()
        except Exception as exc:
            print(f"FAIL build {build.__name__}: {exc}")
            continue
        try:
            picture = export_picture(plate, meta)
        except RuntimeError as exc:
            print(f"FAIL {exc}")
            if plate.color:
                color_im, line_im = paint_preview({}, plate.img, plate.color, plate.colors)
                color_im.save(PREVIEW / f"{meta['id']}-color.png")
                line_im.save(PREVIEW / f"{meta['id']}-line.png")
                colored.append((meta["title"], color_im))
                lined.append((meta["title"], line_im))
            continue
        color_im, line_im = save_picture(picture, plate)
        color_im.save(PREVIEW / f"{meta['id']}-color.png")
        line_im.save(PREVIEW / f"{meta['id']}-line.png")
        colored.append((meta["title"], color_im))
        lined.append((meta["title"], line_im))
    contact(colored, PREVIEW / "contact-color.png")
    contact(lined, PREVIEW / "contact-line.png")
    print(f"wrote {len(SCENES)} pages")


if __name__ == "__main__":
    main()
