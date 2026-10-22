#!/usr/bin/env python3
"""Split every gallery region into a few tonal bands.

Bands follow the long span of a shape (sky and water fall into horizontal
steps; a tall petal falls into light, mid, and dark). Pieces stay large
enough to tap: inscribed diameter at least ~12px at the default phone fit.
Palette steps sit next to their parent color, light then dark.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np

from tidy_regions import (
    ART,
    SCALE,
    contour_path,
    fill_gaps,
    hint_size,
    label_point,
    measure_mask,
    paint_labels,
    parse_path,
    raster,
)

MIN_RADIUS = 5.15
MIN_AREA = 82.0
TARGET_MIN = 180
TARGET_MAX = 320
MIN_COLORS = 12
MAX_COLORS = 30
STEP_GAP = 34.0
PAGE_W, PAGE_H = 320, 460


def rgb_of(value: str) -> np.ndarray:
    return np.array(
        [int(value[1:3], 16), int(value[3:5], 16), int(value[5:7], 16)],
        np.float32,
    )


def as_hex(color: np.ndarray) -> str:
    clamped = np.clip(np.round(color), 0, 255).astype(int)
    return f"#{clamped[0]:02x}{clamped[1]:02x}{clamped[2]:02x}"


def rgb_dist(a: np.ndarray, b: np.ndarray) -> float:
    delta = a.astype(np.float32) - b.astype(np.float32)
    return float(np.sqrt(np.dot(delta, delta)))


def luminance(color: np.ndarray) -> float:
    return float(0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2])


def mix(color: np.ndarray, toward: np.ndarray, amount: float) -> np.ndarray:
    return color * (1 - amount) + toward * amount


def fitted_path(mask: np.ndarray) -> tuple[str, bool]:
    solid = (mask > 0).astype(np.uint8) if mask.dtype != np.uint8 else (mask > 0).astype(np.uint8)
    for epsilon, external in (
        (0.55 * SCALE, False),
        (0.32 * SCALE, True),
        (0.14 * SCALE, True),
    ):
        path, holes = contour_path(solid, epsilon, external)
        if not path:
            continue
        area, radius = measure_mask(raster(parse_path(path), holes and not external))
        if area >= MIN_AREA * 0.82 and radius >= MIN_RADIUS * 0.9:
            return path, holes and not external
    path, _holes = contour_path(solid, 0.14 * SCALE, external=True)
    return path, False


def components(mask: np.ndarray) -> list[np.ndarray]:
    solid = (mask > 0).astype(np.uint8)
    count, labels = cv2.connectedComponents(solid, connectivity=4)
    out = []
    for index in range(1, count):
        part = labels == index
        if part.any():
            out.append(part)
    return out


def split_mask(mask: np.ndarray, k: int, axis: str) -> list[np.ndarray]:
    solid = mask > 0
    ys, xs = np.where(solid)
    coords = ys if axis == "y" else xs
    order = np.argsort(coords, kind="stable")
    bands = [np.zeros(solid.shape, bool) for _ in range(k)]
    cuts = [int(round(i * len(order) / k)) for i in range(k + 1)]
    for index in range(k):
        chosen = order[cuts[index] : cuts[index + 1]]
        if axis == "y":
            bands[index][ys[chosen], xs[chosen]] = True
        else:
            bands[index][ys[chosen], xs[chosen]] = True
    return bands


def passes(mask: np.ndarray) -> bool:
    area, radius = measure_mask(mask)
    return area >= MIN_AREA and radius >= MIN_RADIUS


def absorb(bands: list[np.ndarray]) -> list[np.ndarray]:
    """Fold any band that would be untappable into a neighbor band."""
    kept: list[np.ndarray] = []
    pending: list[np.ndarray] = []
    for band in bands:
        parts = components(band)
        good = [part for part in parts if passes(part)]
        bad = [part for part in parts if not passes(part)]
        blob = np.zeros(band.shape, bool)
        for part in good:
            blob |= part
        for part in bad:
            pending.append(part)
        if blob.any():
            kept.append(blob)
        elif pending and not good:
            continue
    if not kept:
        whole = np.zeros_like(bands[0]) if bands else None
        if whole is None:
            return []
        for band in bands:
            whole |= band
        return [whole] if whole.any() else []
    for part in pending:
        ys, xs = np.where(part)
        cy = float(ys.mean())
        cx = float(xs.mean())
        best = 0
        best_d = 1e18
        for index, band in enumerate(kept):
            by, bx = np.where(band)
            dist = (float(by.mean()) - cy) ** 2 + (float(bx.mean()) - cx) ** 2
            if dist < best_d:
                best_d = dist
                best = index
        kept[best] |= part
    return [band for band in kept if band.any()]


def choose_split(mask: np.ndarray, level: int) -> tuple[int, str]:
    area, radius = measure_mask(mask)
    if area < MIN_AREA or radius < 1:
        return 1, "y"
    ys, xs = np.where(mask > 0)
    height = (int(ys.max()) - int(ys.min()) + 1) / SCALE
    width = (int(xs.max()) - int(xs.min()) + 1) / SCALE
    min_band = [15.0, 13.2, 11.6, 10.8][level]
    min_radius = [9.2, 8.2, 7.3, 6.5][level]
    if radius < min_radius:
        return 1, "y"
    tall = height >= width * 0.72
    wide = width > height * 1.05
    for k in (4, 3, 2):
        if tall and height >= min_band * k:
            return k, "y"
        if wide and width >= min_band * k and height >= min_band:
            return k, "x"
    if height >= min_band * 2 and radius >= min_radius:
        return 2, "y"
    if width >= min_band * 2 and height >= min_band * 0.85 and radius >= min_radius:
        return 2, "x"
    return 1, "y"


def highlight_mask(mask: np.ndarray) -> np.ndarray | None:
    area, radius = measure_mask(mask)
    if radius < 14 or area < 700:
        return None
    x, y, point_radius = label_point(mask)
    if point_radius < 12:
        return None
    rx = max(6.4, min(point_radius * 0.34, 14))
    ry = rx * 0.82
    cx = x - rx * 0.15
    cy = y - ry * 0.55
    patch = np.zeros(mask.shape, np.uint8)
    cv2.ellipse(
        patch,
        (int(round(cx * SCALE)), int(round(cy * SCALE))),
        (int(round(rx * SCALE)), int(round(ry * SCALE))),
        0,
        0,
        360,
        1,
        thickness=-1,
    )
    patch_b = (patch > 0) & (mask > 0)
    if not passes(patch_b):
        return None
    remain = (mask > 0) & ~patch_b
    if not passes(remain):
        return None
    _ra, remain_r = measure_mask(remain)
    if remain_r < MIN_RADIUS + 0.4:
        return None
    return patch_b


class Piece:
    def __init__(self, mask: np.ndarray, color: int, tone: int) -> None:
        self.mask = mask
        self.color = color
        self.tone = tone


def region_pieces(mask: np.ndarray, color: int, level: int, highlights: bool) -> list[Piece]:
    k, axis = choose_split(mask, level)
    if k == 1:
        bands = [mask > 0]
    else:
        bands = absorb(split_mask(mask, k, axis))
        if len(bands) < 2:
            bands = [mask > 0]
    pieces = [Piece(band, color, index) for index, band in enumerate(bands)]
    if highlights and pieces:
        host = max(pieces, key=lambda piece: int(piece.mask.sum()))
        patch = highlight_mask(host.mask)
        if patch is not None:
            host.mask = host.mask & ~patch
            pieces.append(Piece(patch, color, -1))
    return pieces


def allocate_steps(colors: list[str], pieces: list[Piece], areas: dict[int, float]) -> dict[int, int]:
    demand: dict[int, int] = {index + 1: 1 for index in range(len(colors))}
    for piece in pieces:
        need = 1 if piece.tone < 0 else piece.tone + 1
        # A highlight needs one step lighter than the darkest band of that color.
        demand[piece.color] = max(demand[piece.color], need if piece.tone >= 0 else 2)
    # Highlights use tone -1, which needs an extra light step beyond the bands.
    highlight_colors = {piece.color for piece in pieces if piece.tone < 0}
    for color in highlight_colors:
        band_tones = [piece.tone for piece in pieces if piece.color == color and piece.tone >= 0]
        demand[color] = max(demand[color], (max(band_tones) + 1 if band_tones else 1) + 1)

    steps = {color: 1 for color in demand}
    total = len(colors)
    order = sorted(demand, key=lambda color: (-areas.get(color, 0), color))
    for color in order:
        want = min(4, demand[color])
        while steps[color] < want and total < MAX_COLORS:
            steps[color] += 1
            total += 1
    guard = 0
    while total < MIN_COLORS and guard < 40:
        guard += 1
        color = max(order, key=lambda item: (steps[item] < 4, areas.get(item, 0)))
        if steps[color] >= 4:
            break
        steps[color] += 1
        total += 1
    return steps


def fit_pieces(groups: list[list[Piece]], steps: dict[int, int]) -> list[Piece]:
    """Drop extra bands so every remaining band of a shape gets its own step."""
    fitted: list[Piece] = []
    for group in groups:
        if not group:
            continue
        color = group[0].color
        available = steps.get(color, 1)
        highlights = [piece for piece in group if piece.tone < 0]
        bands = [piece for piece in group if piece.tone >= 0]
        bands.sort(key=lambda piece: piece.tone)
        room = available - (1 if highlights else 0)
        if room < 1:
            room = available
            highlights = []
        while len(bands) > max(1, room):
            bands[-2].mask = bands[-2].mask | bands[-1].mask
            bands.pop()
        for index, piece in enumerate(bands):
            piece.tone = index + (1 if highlights else 0)
        if highlights:
            highlights[0].tone = 0
            if bands and bands[0].tone == 0:
                bands[0].tone = 0
                # Keep highlight distinct: shift bands up if a step remains.
                if available > len(bands):
                    for index, piece in enumerate(bands):
                        piece.tone = index + 1
                else:
                    highlights = []
        fitted.extend(highlights)
        fitted.extend(bands)
    return fitted


def push_apart(candidate: np.ndarray, blocked: list[np.ndarray], origin: np.ndarray) -> np.ndarray:
    color = np.clip(candidate.astype(np.float32), 0, 255)
    if not blocked:
        return color
    for _ in range(8):
        nearest = min(blocked, key=lambda other: rgb_dist(color, other))
        gap = rgb_dist(color, nearest)
        if gap >= STEP_GAP:
            return color
        delta = color - nearest
        norm = float(np.linalg.norm(delta))
        if norm < 1:
            delta = np.array([36.0, -28.0, 22.0], np.float32) + (origin - 128) * 0.05
            norm = float(np.linalg.norm(delta))
        color = np.clip(color + delta / norm * (STEP_GAP - gap + 3), 0, 255)
    return color


def make_ramp(value: str, count: int, blocked: list[np.ndarray]) -> list[str]:
    origin = rgb_of(value)
    if count <= 1:
        return [as_hex(origin)]
    light = mix(origin, np.array([255, 255, 255], np.float32), 0.46)
    dark = mix(origin, origin * 0.22 + np.array([24, 18, 22], np.float32) * 0.78, 0.0)
    dark = origin * 0.52
    if luminance(origin) > 214:
        light = mix(origin, np.array([255, 255, 255], np.float32), 0.22)
        dark = origin * 0.62
    elif luminance(origin) < 70:
        light = mix(origin, np.array([255, 255, 255], np.float32), 0.62)
        dark = origin * 0.72
    tones = [light, origin, dark]
    if count == 2:
        light_d = rgb_dist(light, origin)
        dark_d = rgb_dist(dark, origin)
        tones = [light, origin] if light_d >= dark_d else [origin, dark]
    if count >= 4:
        tones = [light, origin, origin * 0.75, dark]
    tones = sorted(tones[:count], key=luminance, reverse=True)
    fixed: list[np.ndarray] = []
    local_blocked = list(blocked)
    for tone in tones:
        placed = push_apart(tone, local_blocked + fixed, origin)
        if fixed and luminance(placed) > luminance(fixed[-1]) - 6:
            darker = np.clip(fixed[-1] * 0.78, 0, 255)
            placed = push_apart(darker, local_blocked + fixed, origin)
        fixed.append(placed)
    return [as_hex(tone) for tone in fixed]


def build_palette(colors: list[str], pieces: list[Piece], steps: dict[int, int]) -> tuple[list[str], dict[tuple[int, int], int]]:
    palette: list[str] = []
    blocked: list[np.ndarray] = []
    mapping: dict[tuple[int, int], int] = {}
    for index, color in enumerate(colors):
        number = index + 1
        count = steps.get(number, 1)
        ramp = make_ramp(color, count, blocked)
        for tone, value in enumerate(ramp):
            mapping[(number, tone)] = len(palette) + 1
            palette.append(value)
            blocked.append(rgb_of(value))
    for piece in pieces:
        tone = piece.tone if piece.tone >= 0 else 0
        if (piece.color, tone) not in mapping:
            piece.tone = min(tone, steps.get(piece.color, 1) - 1)
    palette[:] = repair_adjacent(palette)
    return palette, mapping


def repair_adjacent(palette: list[str]) -> list[str]:
    """Push neighboring swatches apart so a step is easy to tell from the next."""
    colors = [rgb_of(value) for value in palette]
    for index in range(1, len(colors)):
        for _ in range(12):
            gap = rgb_dist(colors[index], colors[index - 1])
            if gap >= STEP_GAP:
                break
            delta = colors[index] - colors[index - 1]
            norm = float(np.linalg.norm(delta))
            if norm < 1:
                delta = np.array([24.0, -16.0, 12.0], np.float32)
                norm = float(np.linalg.norm(delta))
            colors[index] = np.clip(colors[index] + delta / norm * (STEP_GAP - gap + 2.5), 0, 255)
        if rgb_dist(colors[index], colors[index - 1]) < STEP_GAP:
            colors[index] = np.clip(colors[index] + np.array([28.0, -18.0, 14.0], np.float32), 0, 255)
    return [as_hex(color) for color in colors]


def paint_pieces(pieces: list[Piece]) -> tuple[np.ndarray, dict[int, int]]:
    label = np.zeros((PAGE_H * SCALE, PAGE_W * SCALE), np.int32)
    numbers: dict[int, int] = {}
    for index, piece in enumerate(pieces, start=1):
        label[piece.mask] = index
        numbers[index] = index  # remapped later
    return fill_gaps(label), numbers


def assemble(picture: dict, level: int) -> dict | None:
    source = paint_labels(picture["regions"])
    source = fill_gaps(source)
    numbers = {index + 1: region["n"] for index, region in enumerate(picture["regions"])}
    groups: list[list[Piece]] = []
    areas: dict[int, float] = {index + 1: 0.0 for index in range(len(picture["colors"]))}
    highlights = level >= 1
    for rid in [int(value) for value in np.unique(source) if int(value) != 0]:
        mask = source == rid
        color = numbers.get(rid, 1)
        area, _radius = measure_mask(mask)
        areas[color] = areas.get(color, 0) + area
        groups.append(region_pieces(mask, color, level, highlights))
    raw = [piece for group in groups for piece in group]
    steps = allocate_steps(picture["colors"], raw, areas)
    pieces = fit_pieces(groups, steps)
    # If we still have fewer than 12 colors, the extra steps were not given a piece.
    # Steal a band from the largest multi-band color by splitting its biggest piece again.
    palette, mapping = build_palette(picture["colors"], pieces, steps)
    if len(palette) > MAX_COLORS:
        return None
    label = np.zeros(source.shape, np.int32)
    piece_number: dict[int, int] = {}
    next_id = 1
    for piece in pieces:
        tone = max(0, piece.tone)
        number = mapping.get((piece.color, tone))
        if number is None:
            number = mapping.get((piece.color, 0), 1)
        label[piece.mask] = next_id
        piece_number[next_id] = number
        next_id += 1
    label = fill_gaps(label)
    regions, outline = rebuild(label, piece_number, palette)
    if not regions:
        return None
    out = {
        "id": picture["id"],
        "category": picture["category"],
        "title": picture["title"],
        "caption": picture["caption"],
        "viewBox": picture["viewBox"],
        "colors": palette,
        "regions": regions,
        "outline": outline,
        "ink": picture.get("ink") or [],
    }
    if picture.get("credits"):
        out["credits"] = picture["credits"]
    return out


def rebuild(label: np.ndarray, numbers: dict[int, int], palette: list[str]) -> tuple[list[dict], str]:
    records = []
    for rid in [int(value) for value in np.unique(label) if int(value) != 0]:
        mask = label == rid
        area, radius = measure_mask(mask)
        if area < MIN_AREA * 0.55 or radius < 2.5:
            continue
        x, y, point_radius = label_point(mask)
        number = numbers.get(rid, 1)
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
        records.append((area, point_radius, region, rid))
    records.sort(key=lambda item: -item[0])
    regions = []
    for index, (_area, point_radius, region, _rid) in enumerate(records):
        region["hintSize"] = hint_size(point_radius, region["n"])
        region["id"] = f"r{index}"
        regions.append(region)
    used = {region["n"] for region in regions}
    if len(used) != len(palette):
        # Drop unused steps by remapping, which also closes holes in the swatch list.
        ordered = sorted(used)
        remap = {old: index + 1 for index, old in enumerate(ordered)}
        palette[:] = [palette[old - 1] for old in ordered]
        for region in regions:
            region["n"] = remap[region["n"]]
            region["hintSize"] = hint_size(8, region["n"])
    edge_counts: dict[int, int] = {}
    border = np.concatenate([label[0, :], label[-1, :], label[:, 0], label[:, -1]])
    for rid in border:
        rid = int(rid)
        if rid == 0 or rid not in numbers:
            continue
        number = numbers[rid]
        edge_counts[number] = edge_counts.get(number, 0) + 1
    frame = max(edge_counts, key=edge_counts.get) if edge_counts else None
    # Frame number may have been remapped. Match by color identity after remap
    # is unreliable here; skip outlining only when a single color owns the border
    # pixels we still have. Outline every non-dominant swatch.
    outline_parts: list[str] = []
    dominant = None
    if frame is not None and any(region["n"] == frame for region in regions):
        dominant = frame
    for number in range(1, len(palette) + 1):
        if number == dominant:
            continue
        union = np.zeros(label.shape, np.uint8)
        for region in regions:
            if region["n"] != number:
                continue
            union = np.maximum(union, raster(parse_path(region["d"]), bool(region.get("evenodd"))))
        path, _holes = contour_path(union, 1.05 * SCALE, external=True)
        if path:
            outline_parts.append(path)
    return regions, " ".join(outline_parts)


def measure_picture(picture: dict) -> dict:
    areas = []
    radii = []
    for region in picture["regions"]:
        area, radius = measure_mask(raster(parse_path(region["d"]), bool(region.get("evenodd"))))
        areas.append(area)
        radii.append(radius)
    adjacent = []
    colors = picture["colors"]
    # Adjacent swatches that came from one ramp are neighbors in the list.
    # Report the minimum gap between every neighboring pair so a too-close step is visible.
    for index in range(len(colors) - 1):
        adjacent.append(rgb_dist(rgb_of(colors[index]), rgb_of(colors[index + 1])))
    return {
        "regions": len(picture["regions"]),
        "colors": len(colors),
        "min_area": float(min(areas) if areas else 0),
        "min_radius": float(min(radii) if radii else 0),
        "min_gap": float(min(adjacent) if adjacent else 0),
        "small": int(sum(1 for area, radius in zip(areas, radii) if area < MIN_AREA or radius < MIN_RADIUS * 0.92)),
    }


def rank(stats: dict) -> tuple[int, float]:
    regions = stats["regions"]
    penalty = 0.0
    if regions < TARGET_MIN:
        penalty += (TARGET_MIN - regions) * 3
    elif regions > TARGET_MAX:
        penalty += (regions - TARGET_MAX) * 3
    else:
        penalty += abs(regions - 240) * 0.01
    if not (MIN_COLORS <= stats["colors"] <= MAX_COLORS):
        penalty += 250
    penalty += stats["small"] * 40
    if stats["min_gap"] < 30:
        penalty += (30 - stats["min_gap"]) * 4
    perfect = (
        TARGET_MIN <= regions <= TARGET_MAX
        and MIN_COLORS <= stats["colors"] <= MAX_COLORS
        and stats["small"] == 0
        and stats["min_gap"] >= 30
    )
    return (0 if perfect else 1, penalty)


def band_picture(picture: dict) -> tuple[dict, dict, int]:
    before = len(picture["regions"])
    best = None
    best_stats = None
    best_level = 0
    best_rank = (9, 1e9)
    for level in range(4):
        candidate = assemble(picture, level)
        if candidate is None:
            continue
        stats = measure_picture(candidate)
        score = rank(stats)
        if score < best_rank:
            best, best_stats, best_level, best_rank = candidate, stats, level, score
        if score[0] == 0:
            break
        if stats["regions"] > TARGET_MAX + 40 and level >= 1:
            break
    if best is None or best_stats is None:
        raise RuntimeError(f"{picture['id']} produced no page")
    if best_stats["regions"] > TARGET_MAX or best_stats["small"]:
        healed = heal(best)
        if healed is not None:
            stats = measure_picture(healed)
            if rank(stats) <= best_rank:
                best, best_stats, best_level = healed, stats, best_level
    best_stats["before"] = before
    best_stats["level"] = best_level
    return best, best_stats, best_level


def heal(picture: dict) -> dict | None:
    """Merge untappable pieces, then the smallest extras, until the page fits."""
    label = fill_gaps(paint_labels(picture["regions"]))
    numbers = {index + 1: region["n"] for index, region in enumerate(picture["regions"])}
    ids = [int(value) for value in np.unique(label) if int(value) != 0]

    def touch(rid: int) -> int:
        mask = (label == rid).astype(np.uint8)
        ring = cv2.dilate(mask, np.ones((3, 3), np.uint8)).astype(bool) & (label != rid) & (label != 0)
        if not ring.any():
            return 0
        values, counts = np.unique(label[ring], return_counts=True)
        order = np.argsort(-counts)
        return int(values[int(order[0])]) if len(order) else 0

    changed = False
    guard = 0
    while guard < 80:
        guard += 1
        ids = [int(value) for value in np.unique(label) if int(value) != 0]
        failing = [rid for rid in ids if not passes(label == rid)]
        extras = len(ids) - TARGET_MAX
        if not failing and extras <= 0:
            break
        if failing:
            victim = min(failing, key=lambda rid: int((label == rid).sum()))
        else:
            victim = min(ids, key=lambda rid: int((label == rid).sum()))
        host = touch(victim)
        if not host:
            break
        label[label == victim] = host
        changed = True
    if not changed:
        return picture
    kept = [int(value) for value in np.unique(label) if int(value) != 0]
    remapped = np.zeros_like(label)
    new_numbers: dict[int, int] = {}
    for index, rid in enumerate(kept, start=1):
        remapped[label == rid] = index
        new_numbers[index] = numbers.get(rid, 1)
    regions, outline = rebuild(remapped, new_numbers, picture["colors"])
    if not regions:
        return None
    healed = dict(picture)
    healed["regions"] = regions
    healed["outline"] = outline
    healed["colors"] = picture["colors"]
    return healed


def main() -> None:
    only = None
    dry = "--dry-run" in sys.argv
    for arg in sys.argv[1:]:
        if arg.startswith("--only="):
            only = set(arg.split("=", 1)[1].split(","))
    rows = []
    files = sorted(ART.glob("*.json"))
    for path in files:
        picture = json.loads(path.read_text())
        if only and picture["id"] not in only:
            continue
        updated, stats, _level = band_picture(picture)
        stats["id"] = picture["id"]
        rows.append(stats)
        flag = ""
        if not (TARGET_MIN <= stats["regions"] <= TARGET_MAX):
            flag += " COUNT"
        if not (MIN_COLORS <= stats["colors"] <= MAX_COLORS):
            flag += " COLORS"
        if stats["small"]:
            flag += " SLIVER"
        if stats["min_gap"] < 28:
            flag += " GAP"
        print(
            f"{stats['id']}: {stats['before']} -> {stats['regions']} regions, "
            f"{stats['colors']} colors, r {stats['min_radius']:.2f}, gap {stats['min_gap']:.0f}, "
            f"level {stats['level']}{flag}",
            flush=True,
        )
        hard = "COUNT" in flag or "COLORS" in flag or "SLIVER" in flag
        if not dry and not hard:
            path.write_text(json.dumps(updated, separators=(",", ":"), ensure_ascii=False) + "\n")
        elif not dry and hard:
            print(f"  kept original {picture['id']}", flush=True)
    if rows:
        counts = [row["regions"] for row in rows]
        print(f"done {len(rows)} pictures, regions {min(counts)}–{max(counts)}")


if __name__ == "__main__":
    main()
