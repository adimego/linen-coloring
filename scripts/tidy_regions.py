#!/usr/bin/env python3
"""Merge untappable regions and smooth the outlines of every coloring page.

A region must be visible at the default fit on a 390×844 phone. There the
picture scales at 1.21875 CSS pixels per viewBox unit, so the floors below are
about 0.15% of the page and a 12px inscribed diameter — enough for a finger
and a two-digit number.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src" / "pictures" / "art"
AUDIT = ROOT / "REGION_AUDIT.md"

PAGE_W, PAGE_H = 320, 460
PAGE_AREA = PAGE_W * PAGE_H
FIT_SCALE = 390 / 320
SCALE = 3
H, W = PAGE_H * SCALE, PAGE_W * SCALE
MIN_AREA = 0.0015 * PAGE_AREA
MIN_RADIUS = 6.0
MAX_AREA = 3200.0
TARGET_AREA = 1500.0
TOKEN = re.compile(r"[MLCZQ]|-?\d*\.?\d+(?:e[-+]?\d+)?", re.I)


def flatten_cubic(
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    p3: tuple[float, float],
    steps: int = 6,
) -> list[tuple[float, float]]:
    points = []
    for step in range(1, steps + 1):
        t = step / steps
        u = 1 - t
        points.append(
            (
                u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
            )
        )
    return points


def parse_path(d: str) -> list[list[tuple[float, float]]]:
    parts: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = []
    command = ""
    cursor = (0.0, 0.0)
    tokens = TOKEN.findall(d)
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token in "MLCZQmlczq":
            command = token.upper()
            i += 1
            if command == "Z":
                if len(current) >= 3:
                    parts.append(current)
                current = []
            continue
        if command == "C":
            x1, y1, x2, y2, x, y = (float(tokens[i + k]) for k in range(6))
            i += 6
            current.extend(flatten_cubic(cursor, (x1, y1), (x2, y2), (x, y)))
            cursor = (x, y)
            continue
        if command == "Q":
            x1, y1, x, y = (float(tokens[i + k]) for k in range(4))
            i += 4
            current.extend(flatten_cubic(cursor, (x1, y1), (x1, y1), (x, y)))
            cursor = (x, y)
            continue
        x = float(token)
        y = float(tokens[i + 1])
        i += 2
        if command == "M" and current:
            parts.append(current)
            current = [(x, y)]
        else:
            current.append((x, y))
        cursor = (x, y)
    if len(current) >= 3:
        parts.append(current)
    return parts


def raster(parts: list[list[tuple[float, float]]], evenodd: bool = False) -> np.ndarray:
    mask = np.zeros((H, W), np.uint8)
    polygons = []
    for poly in parts:
        pts = np.round(np.array(poly, np.float32) * SCALE).astype(np.int32)
        if len(pts) >= 3:
            polygons.append(pts)
    if not polygons:
        return mask
    if not evenodd:
        cv2.fillPoly(mask, polygons, 1)
        return mask
    for pts in polygons:
        layer = np.zeros_like(mask)
        cv2.fillPoly(layer, [pts], 1)
        mask = np.bitwise_xor(mask, layer)
    return mask


def hex_lab(value: str) -> np.ndarray:
    rgb = np.uint8([[[int(value[1:3], 16), int(value[3:5], 16), int(value[5:7], 16)]]])
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)[0, 0].astype(np.float32)


def inscribed(mask: np.ndarray) -> tuple[float, float, float]:
    """Return area, inscribed radius, and the incenter in viewBox units."""
    solid = mask if mask.dtype == bool else mask > 0
    pixels = int(solid.sum())
    if pixels == 0:
        return 0.0, 0.0, 0.0
    ys, xs = np.where(solid)
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    crop = np.zeros((y1 - y0 + 2, x1 - x0 + 2), np.uint8)
    crop[1:-1, 1:-1] = solid[y0:y1, x0:x1].astype(np.uint8)
    dist = cv2.distanceTransform(crop, cv2.DIST_L2, 3)
    _, radius_px, _, loc = cv2.minMaxLoc(dist)
    return pixels / (SCALE * SCALE), float(radius_px) / SCALE, 0.0 if radius_px <= 0 else 1.0


def measure_mask(mask: np.ndarray) -> tuple[float, float]:
    area, radius, _ = inscribed(mask)
    return area, radius


def path_stats(regions: list[dict]) -> tuple[float, float, int]:
    areas = []
    radii = []
    for region in regions:
        area, radius = measure_mask(raster(parse_path(region["d"]), bool(region.get("evenodd"))))
        areas.append(area)
        radii.append(radius)
    area_a = np.array(areas)
    radius_a = np.array(radii)
    small = int(((area_a < MIN_AREA) | (radius_a < MIN_RADIUS)).sum())
    return float(area_a.min()), float(radius_a.min()), small


def paint_labels(regions: list[dict]) -> np.ndarray:
    label = np.zeros((H, W), np.int32)
    for index, region in enumerate(regions):
        mask = raster(parse_path(region["d"]), bool(region.get("evenodd")))
        label[mask > 0] = index + 1
    return label


def component_stats(label: np.ndarray, rid: int) -> tuple[float, float]:
    return measure_mask(label == rid)


def neighbor_votes(label: np.ndarray, rid: int, reach: int) -> list[tuple[int, int]]:
    mask = (label == rid).astype(np.uint8)
    if int(mask.sum()) == 0:
        return []
    kernel = np.ones((reach, reach), np.uint8)
    ring = cv2.dilate(mask, kernel).astype(bool) & (label != rid) & (label != 0)
    if not ring.any():
        return []
    values, counts = np.unique(label[ring], return_counts=True)
    return [(int(value), int(count)) for value, count in zip(values, counts) if int(value) != 0]


def choose_neighbor(
    votes: list[tuple[int, int]],
    source: int,
    numbers: dict[int, int],
    labs: dict[int, np.ndarray],
) -> int:
    def sort_key(item: tuple[int, int]) -> tuple[float, float, int]:
        other, border = item
        same = 0.0 if numbers.get(other) == numbers.get(source) else 1.0
        if other in labs and source in labs:
            dist = float(np.linalg.norm(labs[source] - labs[other]))
        else:
            dist = 999.0
        return (same, dist, -border)

    return min(votes, key=sort_key)[0]


def merge_small(label: np.ndarray, numbers: dict[int, int], labs: dict[int, np.ndarray]) -> np.ndarray:
    alive = {int(value) for value in np.unique(label) if int(value) != 0}
    stats: dict[int, tuple[float, float]] = {}

    def cached(rid: int) -> tuple[float, float]:
        if rid not in stats:
            stats[rid] = component_stats(label, rid)
        return stats[rid]

    guard = 0
    while guard < 8000:
        guard += 1
        worst: tuple[float, int] | None = None
        for rid in list(alive):
            area, radius = cached(rid)
            if area <= 0:
                alive.discard(rid)
                stats.pop(rid, None)
                continue
            if area < MIN_AREA or radius < MIN_RADIUS:
                if worst is None or area < worst[0]:
                    worst = (area, rid)
        if worst is None:
            break
        rid = worst[1]
        votes: list[tuple[int, int]] = []
        for reach in (3, 7, 15, 31):
            votes = [(nid, count) for nid, count in neighbor_votes(label, rid, reach) if nid in alive and nid != rid]
            if votes:
                break
        if not votes:
            label[label == rid] = 0
            alive.discard(rid)
            continue
        target = choose_neighbor(votes, rid, numbers, labs)
        label[label == rid] = target
        alive.discard(rid)
        stats.pop(rid, None)
        stats.pop(target, None)
    return label


def split_large(
    label: np.ndarray,
    numbers: dict[int, int],
    labs: dict[int, np.ndarray],
    seed: int,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    next_id = int(label.max()) + 1
    for rid in [int(value) for value in np.unique(label) if int(value) != 0]:
        mask = label == rid
        area, _radius = measure_mask(mask)
        if area < MAX_AREA:
            continue
        pieces = farthest_split(mask, max(2, min(18, int(area // TARGET_AREA))), rng)
        if len(pieces) < 2:
            continue
        kept = []
        for piece in pieces:
            piece_area, piece_radius = measure_mask(piece)
            if piece_area >= MIN_AREA and piece_radius >= MIN_RADIUS:
                kept.append(piece)
            else:
                label[piece] = 0
        if len(kept) < 2:
            label[mask] = rid
            continue
        label[mask] = 0
        for piece in kept:
            label[piece] = next_id
            numbers[next_id] = numbers[rid]
            if rid in labs:
                labs[next_id] = labs[rid]
            next_id += 1
    # Orphan pixels from rejected slivers fall back to the parent color via gap fill.
    return label


def farthest_split(mask: np.ndarray, k: int, rng: np.random.Generator) -> list[np.ndarray]:
    ys, xs = np.where(mask)
    if k < 2 or len(xs) < 80:
        return [mask]
    pts = np.stack([xs, ys], axis=1)
    sample = pts if len(pts) <= 3500 else pts[rng.choice(len(pts), 3500, replace=False)]
    chosen = [int(rng.integers(len(sample)))]
    dist = np.full(len(sample), np.inf)
    for _ in range(k - 1):
        last = sample[chosen[-1]]
        delta = (sample[:, 0] - last[0]) ** 2 + (sample[:, 1] - last[1]) ** 2
        dist = np.minimum(dist, delta)
        chosen.append(int(np.argmax(dist)))
    seeds = sample[np.array(chosen)].astype(np.float32)
    owners = np.empty(len(pts), np.int32)
    for start in range(0, len(pts), 8000):
        chunk = pts[start : start + 8000].astype(np.float32)
        delta = (chunk[:, None, 0] - seeds[None, :, 0]) ** 2 + (chunk[:, None, 1] - seeds[None, :, 1]) ** 2
        owners[start : start + len(chunk)] = np.argmin(delta, axis=1)
    pieces = []
    for index in range(k):
        selected = owners == index
        if not np.any(selected):
            continue
        piece = np.zeros(mask.shape, bool)
        piece[pts[selected, 1], pts[selected, 0]] = True
        count, cc, stats, _ = cv2.connectedComponentsWithStats(piece.astype(np.uint8), 8)
        if count <= 1:
            continue
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        pieces.append(cc == largest)
    return pieces


def fill_gaps(label: np.ndarray) -> np.ndarray:
    for _ in range(6):
        empty = label == 0
        if not empty.any():
            break
        filled = label.copy()
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            shifted = np.roll(label, (dy, dx), axis=(0, 1))
            if dy == 1:
                shifted[0, :] = 0
            elif dy == -1:
                shifted[-1, :] = 0
            if dx == 1:
                shifted[:, 0] = 0
            elif dx == -1:
                shifted[:, -1] = 0
            take = empty & (shifted != 0) & (filled == 0)
            filled[take] = shifted[take]
        if np.array_equal(filled, label):
            break
        label = filled
    return label


def contour_path(mask: np.ndarray, epsilon: float, external: bool) -> tuple[str, bool]:
    mode = cv2.RETR_EXTERNAL if external else cv2.RETR_CCOMP
    thick = cv2.dilate(mask.astype(np.uint8), np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(thick, mode, cv2.CHAIN_APPROX_TC89_L1)
    parts: list[str] = []
    for contour in contours:
        if cv2.contourArea(contour) < 12:
            continue
        approx = cv2.approxPolyDP(contour, epsilon, True)
        if len(approx) < 3:
            continue
        pts = approx.reshape(-1, 2)
        bits = [f"M{pts[0, 0] / SCALE:.2f} {pts[0, 1] / SCALE:.2f}"]
        bits.extend(f"L{x / SCALE:.2f} {y / SCALE:.2f}" for x, y in pts[1:])
        bits.append("Z")
        parts.append("".join(bits))
    return " ".join(parts), len(parts) > 1


def fitted_path(mask: np.ndarray) -> tuple[str, bool]:
    for epsilon, external in (
        (0.62 * SCALE, False),
        (0.35 * SCALE, True),
        (0.16 * SCALE, True),
    ):
        path, holes = contour_path(mask, epsilon, external)
        if not path:
            continue
        area, radius = measure_mask(raster(parse_path(path), holes and not external))
        if area >= MIN_AREA * 0.9 and radius >= MIN_RADIUS * 0.92:
            return path, holes and not external
    path, holes = contour_path(mask, 0.16 * SCALE, external=True)
    return path, False


def label_point(mask: np.ndarray) -> tuple[float, float, float]:
    solid = mask if mask.dtype == bool else mask > 0
    ys, xs = np.where(solid)
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    crop = np.zeros((y1 - y0 + 2, x1 - x0 + 2), np.uint8)
    crop[1:-1, 1:-1] = solid[y0:y1, x0:x1].astype(np.uint8)
    dist = cv2.distanceTransform(crop, cv2.DIST_L2, 5)
    _, radius, _, loc = cv2.minMaxLoc(dist)
    return (x0 + loc[0] - 1) / SCALE, (y0 + loc[1] - 1) / SCALE, float(radius) / SCALE


def hint_size(radius: float, number: int) -> int:
    digits = 2 if number >= 10 else 1
    factor = 1.2 if digits == 1 else 1.55
    return int(max(7, min(12, (radius * 2) / factor)))


def rebuild(label: np.ndarray, numbers: dict[int, int], colors: list[str]) -> tuple[list[dict], list[str], str]:
    records = []
    for rid in [int(value) for value in np.unique(label) if int(value) != 0]:
        mask = label == rid
        area, radius = measure_mask(mask)
        if area < MIN_AREA * 0.5 or radius < 1:
            continue
        x, y, point_radius = label_point(mask)
        number = numbers[rid]
        path, holes = fitted_path(mask)
        if not path:
            continue
        region: dict = {
            "d": path,
            "n": number,
            "label": [round(x, 2), round(y, 2)],
            "hintSize": hint_size(point_radius, number),
        }
        if holes:
            region["evenodd"] = True
        records.append((area, point_radius, region))
    records.sort(key=lambda item: -item[0])
    used = sorted({region["n"] for _, _, region in records})
    remap = {old: index + 1 for index, old in enumerate(used)}
    palette = [colors[n - 1] for n in used]
    regions = []
    for index, (_, point_radius, region) in enumerate(records):
        region["n"] = remap[region["n"]]
        region["hintSize"] = hint_size(point_radius, region["n"])
        region["id"] = f"r{index}"
        regions.append(region)

    edge_counts: dict[int, int] = {}
    border = np.concatenate([label[0, :], label[-1, :], label[:, 0], label[:, -1]])
    for rid in border:
        if rid == 0 or int(rid) not in numbers:
            continue
        number = remap.get(numbers[int(rid)])
        if number:
            edge_counts[number] = edge_counts.get(number, 0) + 1
    frame = max(edge_counts, key=edge_counts.get) if edge_counts else None
    outline_parts: list[str] = []
    for number in range(1, len(palette) + 1):
        if number == frame:
            continue
        union = np.zeros((H, W), np.uint8)
        for region in regions:
            if region["n"] != number:
                continue
            union = np.maximum(union, raster(parse_path(region["d"]), bool(region.get("evenodd"))))
        path, _holes = contour_path(union, 1.15 * SCALE, external=True)
        if path:
            outline_parts.append(path)
    return regions, palette, " ".join(outline_parts)


def tidy(picture: dict) -> tuple[dict, dict]:
    before_area, before_radius, before_small = path_stats(picture["regions"])
    label = paint_labels(picture["regions"])
    numbers = {index + 1: region["n"] for index, region in enumerate(picture["regions"])}
    labs = {index + 1: hex_lab(picture["colors"][region["n"] - 1]) for index, region in enumerate(picture["regions"])}
    for _ in range(3):
        label = merge_small(label, numbers, labs)
        label = split_large(label, numbers, labs, 11)
        label = fill_gaps(label)
    label = merge_small(label, numbers, labs)
    label = fill_gaps(label)
    regions, colors, outline = rebuild(label, numbers, picture["colors"])
    after_area, after_radius, after_small = path_stats(regions)
    picture["regions"] = regions
    picture["colors"] = colors
    picture["outline"] = outline
    for stroke in picture.get("ink") or []:
        stroke["w"] = 1.6
    summary = {
        "id": picture["id"],
        "title": picture["title"],
        "category": picture["category"],
        "before_count": len(picture["regions"]),
        "before_area": before_area,
        "before_radius": before_radius,
        "before_small": before_small,
        "after_count": len(regions),
        "after_area": after_area,
        "after_radius": after_radius,
        "after_small": after_small,
        "colors": len(colors),
    }
    return picture, summary


def px_diameter(radius: float) -> float:
    return radius * 2 * FIT_SCALE


def write_audit(rows: list[dict], before_counts: dict[str, int]) -> None:
    lines = [
        "# Region size audit",
        "",
        "Measured on the page viewBox (320×460). At the default fit on a 390×844 phone the picture is 390px wide, so one viewBox unit is 1.22 CSS pixels.",
        "",
        "A region is too small when its area is under 0.15% of the page (221 square units) or its inscribed diameter is under 12 viewBox units (about 15px, enough for a two-digit number). Those regions were merged into the most similar touching neighbor. Very large leftovers were divided again, but only into pieces that still clear the floor.",
        "",
        "| Picture | Category | Regions before | Smallest area before | Smallest diameter before | Regions after | Smallest area after | Smallest diameter after |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in rows:
        lines.append(
            "| {title} | {category} | {before} | {ba:.2f}% | {bd:.1f}px | {after} | {aa:.2f}% | {ad:.1f}px |".format(
                title=row["title"],
                category=row["category"],
                before=before_counts[row["id"]],
                ba=100 * row["before_area"] / PAGE_AREA,
                bd=px_diameter(row["before_radius"]),
                after=row["after_count"],
                aa=100 * row["after_area"] / PAGE_AREA,
                ad=px_diameter(row["after_radius"]),
            )
        )
    lines.append("")
    AUDIT.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    rows = []
    before_counts = {}
    for path in sorted(ART.glob("*.json")):
        picture = json.loads(path.read_text(encoding="utf-8"))
        before_counts[picture["id"]] = len(picture["regions"])
        print(f"== {picture['id']}", flush=True)
        updated, summary = tidy(picture)
        summary["before_count"] = before_counts[picture["id"]]
        if summary["after_count"] < 40:
            raise RuntimeError(f"{picture['id']} only has {summary['after_count']} regions")
        if summary["after_radius"] < MIN_RADIUS * 0.9 or summary["after_area"] < MIN_AREA * 0.85:
            raise RuntimeError(
                f"{picture['id']} still too small: area {summary['after_area']:.1f} radius {summary['after_radius']:.2f}"
            )
        if not 6 <= summary["colors"] <= 24:
            raise RuntimeError(f"{picture['id']} has {summary['colors']} colors")
        path.write_text(json.dumps(updated, separators=(",", ":")), encoding="utf-8")
        print(
            f"   {summary['before_count']} -> {summary['after_count']}  "
            f"min {px_diameter(summary['before_radius']):.1f}px -> {px_diameter(summary['after_radius']):.1f}px",
            flush=True,
        )
        rows.append(summary)
    rows.sort(key=lambda row: (row["category"], row["title"]))
    write_audit(rows, before_counts)
    print(f"audit {AUDIT}")


if __name__ == "__main__":
    main()
