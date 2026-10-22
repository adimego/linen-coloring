#!/usr/bin/env python3
"""Split large coloring regions into a few smooth tonal bands.

Bands follow the shape: wavy horizontal steps on broad sky, water, and
ground; concentric rings on rounded petals and bodies; one light/shadow
cut on tall forms. The original silhouette is kept. Small parts are left
whole. This does not tessellate a picture into triangles.
"""

from __future__ import annotations

import colorsys
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from shapely.affinity import scale as shp_scale
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src" / "pictures" / "art"

PAGE_W = 320.0
PAGE_H = 460.0
SCALE = 3
MIN_RADIUS = 5.25
MIN_AREA = 88.0
MAX_REGIONS = 280
TARGET = 170
STEP_GAP = 34.0

TOKEN = __import__("re").compile(r"[MLCZmlcz]|-?\d*\.?\d+(?:e[-+]?\d+)?")


def parse_path(d: str) -> list[list[tuple[float, float]]]:
    parts: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = []
    command = ""
    i = 0
    tokens = TOKEN.findall(d)
    while i < len(tokens):
        token = tokens[i]
        if token in "MLCZmlcz":
            command = token.upper()
            i += 1
            if command == "Z":
                if len(current) >= 3:
                    parts.append(current)
                current = []
            continue
        if command in ("C", "Q"):
            need = 6 if command == "C" else 4
            nums = [float(tokens[i + k]) for k in range(need)]
            i += need
            current.append((nums[-2], nums[-1]))
            continue
        x = float(token)
        y = float(tokens[i + 1])
        i += 2
        if command == "M" and current:
            parts.append(current)
            current = [(x, y)]
        else:
            current.append((x, y))
    if len(current) >= 3:
        parts.append(current)
    return parts


def clean_poly(loop: list[tuple[float, float]]) -> list[Polygon]:
    if len(loop) < 3:
        return []
    pts = list(loop)
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    if len(pts) < 3:
        return []
    poly = Polygon(pts)
    if not poly.is_valid:
        poly = poly.buffer(0)
    return [p for p in flatten(poly) if p.area >= 1]


def to_geom(parts: list[list[tuple[float, float]]]) -> Polygon | MultiPolygon | None:
    loops: list[Polygon] = []
    for part in parts:
        loops.extend(clean_poly(part))
    if not loops:
        return None
    loops.sort(key=lambda p: p.area, reverse=True)
    used = [False] * len(loops)
    geoms = []
    for i, outer in enumerate(loops):
        if used[i]:
            continue
        holes = []
        for j in range(i + 1, len(loops)):
            if used[j]:
                continue
            inner = loops[j]
            if outer.contains(inner.representative_point()):
                holes.append(list(inner.exterior.coords))
                used[j] = True
        geom = Polygon(list(outer.exterior.coords), holes) if holes else outer
        if not geom.is_valid:
            geom = geom.buffer(0)
        if not geom.is_empty:
            geoms.append(geom)
        used[i] = True
    if not geoms:
        return None
    merged = unary_union(geoms)
    return merged if not merged.is_empty else None


def flatten(geom) -> list[Polygon]:
    if geom is None or geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [geom]
    if isinstance(geom, MultiPolygon):
        return [g for g in geom.geoms if not g.is_empty]
    if isinstance(geom, GeometryCollection):
        out = []
        for g in geom.geoms:
            out.extend(flatten(g))
        return out
    return []


def raster(geom) -> np.ndarray:
    mask = np.zeros((int(PAGE_H * SCALE), int(PAGE_W * SCALE)), np.uint8)
    for poly in flatten(geom):
        ext = np.round(np.array(poly.exterior.coords) * SCALE).astype(np.int32)
        if len(ext) >= 3:
            cv2.fillPoly(mask, [ext], 1)
        for hole in poly.interiors:
            pts = np.round(np.array(hole.coords) * SCALE).astype(np.int32)
            if len(pts) >= 3:
                cv2.fillPoly(mask, [pts], 0)
    return mask


def measure(geom) -> tuple[float, float]:
    mask = raster(geom)
    pixels = int(mask.sum())
    if pixels == 0:
        return 0.0, 0.0
    ys, xs = np.where(mask > 0)
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    crop = np.zeros((y1 - y0 + 2, x1 - x0 + 2), np.uint8)
    crop[1:-1, 1:-1] = mask[y0:y1, x0:x1]
    dist = cv2.distanceTransform(crop, cv2.DIST_L2, 3)
    radius = float(dist.max()) / SCALE
    return pixels / (SCALE * SCALE), radius


def pieces_ok(geoms: list) -> bool:
    if len(geoms) < 2:
        return False
    for geom in geoms:
        area, radius = measure(geom)
        if area < MIN_AREA or radius < MIN_RADIUS:
            return False
    return True


def wave(a: float, b: float, base: float, amp: float, phase: float, along: str) -> list[tuple[float, float]]:
    steps = 16
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = a + (b - a) * t
        wobble = amp * math.sin(t * math.pi * 2 + phase)
        if along == "h":
            pts.append((u, base + wobble))
        else:
            pts.append((base + wobble, u))
    return pts


def band_pieces(geom, count: int, along: str) -> list | None:
    minx, miny, maxx, maxy = geom.bounds
    if along == "h":
        start, end = miny - 2, maxy + 2
        span_a, span_b = minx - 4, maxx + 4
    else:
        start, end = minx - 2, maxx + 2
        span_a, span_b = miny - 4, maxy + 4
    span = end - start
    if span < 28:
        return None
    # Unequal steps so the shading is not a barcode.
    raw = [1.15, 0.82, 1.05, 0.9, 1.08][:count]
    total = sum(raw)
    weights = [v / total for v in raw]
    amp = min(5.5, span * 0.035)
    edges = [start]
    cursor = start
    for weight in weights[:-1]:
        cursor += span * weight
        edges.append(cursor)
    edges.append(end)
    cuts = []
    for index, edge in enumerate(edges):
        phase = 0.6 + index * 0.9
        local_amp = 0 if index in (0, len(edges) - 1) else amp
        cuts.append(wave(span_a, span_b, edge, local_amp, phase, along))
    pieces = []
    for i in range(count):
        top = cuts[i]
        bot = list(reversed(cuts[i + 1]))
        strip = Polygon(top + bot)
        if not strip.is_valid:
            strip = strip.buffer(0)
        piece = geom.intersection(strip)
        parts = [p for p in flatten(piece) if p.area > 15]
        if not parts:
            return None
        pieces.append(unary_union(parts))
    if not pieces_ok(pieces):
        return None
    return pieces


def concentric_pieces(geom, count: int) -> list | None:
    point = geom.representative_point()
    origin = (point.x, point.y)
    if count == 2:
        scales = [0.62]
    elif count == 3:
        scales = [0.74, 0.46]
    else:
        scales = [0.8, 0.58, 0.36]
    inner_geoms = []
    for factor in scales:
        inner = shp_scale(geom, factor, factor, origin=origin)
        inner = geom.intersection(inner)
        inner_geoms.append(unary_union(flatten(inner)) if not inner.is_empty else inner)
    rings = []
    prev = geom
    for inner in inner_geoms:
        ring = prev.difference(inner)
        rings.append(unary_union(flatten(ring)) if not ring.is_empty else ring)
        prev = inner
    rings.append(prev)
    rings = [g for g in rings if g is not None and not g.is_empty]
    if len(rings) != count or not pieces_ok(rings):
        return None
    return rings


def choose_split(geom) -> tuple[str, list] | None:
    area, radius = measure(geom)
    if area < 1100 or radius < 11:
        return None
    minx, miny, maxx, maxy = geom.bounds
    w, h = maxx - minx, maxy - miny
    if w < 8 or h < 8:
        return None
    box_area = w * h
    fill = area / box_area if box_area else 0
    aspect = w / h
    touches_top = miny <= 1.5 and w >= 90
    touches_bottom = maxy >= PAGE_H - 1.5 and w >= 90
    spans_width = minx <= 1.5 and maxx >= PAGE_W - 1.5 and h >= 34
    broad = area >= 8000 and w >= 110 and h >= 32 and fill >= 0.4
    field = (touches_top or touches_bottom or spans_width or broad) and fill >= 0.38 and h >= 30
    folds = (not field) and w >= 80 and h >= 44 and aspect >= 1.2 and fill >= 0.45 and area >= 2800
    roundish = 0.62 <= aspect <= 1.6 and fill >= 0.5 and min(w, h) >= 40 and radius >= 15
    tall = h >= w * 1.22 and w >= 34 and h >= 52 and fill >= 0.4 and radius >= 13

    if field or folds:
        along = "h"
        for count in (4, 3, 2):
            if h < 16 * count:
                continue
            pieces = band_pieces(geom, count, along)
            if pieces:
                return along, pieces
        return None
    if roundish:
        for count in (3, 2):
            pieces = concentric_pieces(geom, count)
            if pieces:
                return "ring", pieces
        return None
    if tall:
        for count in (3, 2):
            if w < 16 * count:
                continue
            pieces = band_pieces(geom, count, "v")
            if pieces:
                return "v", pieces
    # One light/shadow cut on a medium form, only when both sides stay tappable.
    if radius >= 11 and min(w, h) >= 28 and fill >= 0.4 and area >= 1000:
        along = "h" if w >= h else "v"
        pieces = band_pieces(geom, 2, along)
        if pieces:
            return along, pieces
    return None


def rgb_of(hex_color: str) -> tuple[int, int, int]:
    return tuple(int(hex_color[i : i + 2], 16) for i in (1, 3, 5))


def hex_of(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))


def clamp_byte(value: float) -> int:
    return max(0, min(255, int(round(value))))


def shade_steps(base: str, count: int, blocked: list[tuple[int, int, int]]) -> list[str]:
    r, g, b = [c / 255 for c in rgb_of(base)]
    hue, light, sat = colorsys.rgb_to_hls(r, g, b)
    sat = max(sat, 0.05) if light > 0.08 else sat

    def paint(lightness: float, sat_shift: float = 0) -> tuple[int, int, int]:
        rr, gg, bb = colorsys.hls_to_rgb(hue, max(0.04, min(0.96, lightness)), max(0, min(1, sat + sat_shift)))
        return clamp_byte(rr * 255), clamp_byte(gg * 255), clamp_byte(bb * 255)

    spread = 0.1
    colors: list[tuple[int, int, int]] = []
    for _ in range(10):
        if count == 1:
            levels = [light]
        else:
            half = spread * (count - 1) / 2
            levels = [light - half + spread * i for i in range(count)]
        colors = [paint(level, -0.03 * abs(i - (count - 1) / 2)) for i, level in enumerate(levels)]
        # Keep the middle step close to the original hue so the subject still reads.
        mid = (count - 1) // 2
        colors[mid] = rgb_of(base)
        if all(dist(colors[i], colors[i + 1]) >= STEP_GAP for i in range(count - 1)):
            break
        spread += 0.035
    # Push any step off colors already reserved.
    safe: list[tuple[int, int, int]] = []
    for color in colors:
        for _ in range(8):
            nearest = min((dist(color, other), other) for other in blocked + safe) if (blocked or safe) else (999, color)
            if nearest[0] >= STEP_GAP - 0.5:
                break
            other = nearest[1]
            delta = [color[i] - other[i] for i in range(3)]
            norm = math.sqrt(sum(v * v for v in delta)) or 1
            color = tuple(clamp_byte(color[i] + delta[i] / norm * 8) for i in range(3))
        safe.append(color)
        blocked.append(color)
    # Order light to dark.
    safe.sort(key=lambda c: -(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]))
    return [hex_of(c) for c in safe]


def path_of(geom) -> tuple[str, bool]:
    geom = geom.simplify(0.4, preserve_topology=True)
    polys = flatten(geom)
    chunks = []
    holes = False
    for poly in polys:
        if poly.area < 20:
            continue
        chunks.append(ring_path(list(poly.exterior.coords)))
        for hole in poly.interiors:
            chunks.append(ring_path(list(hole.coords)))
            holes = True
    return "".join(chunks), holes or len(polys) > 1 and False


def ring_path(coords: list[tuple[float, float]]) -> str:
    if len(coords) > 1 and coords[0] == coords[-1]:
        coords = coords[:-1]
    body = []
    for index, (x, y) in enumerate(coords):
        cmd = "M" if index == 0 else "L"
        body.append(f"{cmd}{x:.2f} {y:.2f}")
    return "".join(body) + "Z"


def label_of(geom) -> list[float]:
    point = geom.representative_point()
    return [round(point.x, 2), round(point.y, 2)]


def band_picture(picture: dict) -> dict:
    colors: list[str] = list(picture["colors"])
    kept = []
    splits = []  # (pieces, color_index)
    for region in picture["regions"]:
        geom = to_geom(parse_path(region["d"]))
        if geom is None:
            kept.append(region)
            continue
        chosen = choose_split(geom)
        if not chosen:
            kept.append(region)
            continue
        _kind, pieces = chosen
        splits.append((pieces, region["n"] - 1, region))

    # Largest shapes take the extra bands first, and we stop before the page gets noisy.
    splits.sort(key=lambda item: -sum(p.area for p in item[0]))
    accepted = []
    total = len(picture["regions"])
    for pieces, color_index, region in splits:
        extra = len(pieces) - 1
        if total + extra > MAX_REGIONS:
            kept.append(region)
            continue
        accepted.append((pieces, color_index))
        total += extra

    # Build shade ramps only for colors we actually split.
    groups: dict[int, int] = {}
    for pieces, color_index in accepted:
        groups[color_index] = max(groups.get(color_index, 1), len(pieces))

    blocked: list[tuple[int, int, int]] = []
    shade_of: dict[int, list[str]] = {}
    order = []
    for index, hex_color in enumerate(colors):
        count = groups.get(index, 1)
        # Cap the book so swatches stay a strip, not a chart.
        if count > 4:
            count = 4
        steps = shade_steps(hex_color, count, blocked) if count > 1 else [hex_color.lower()]
        if count == 1:
            blocked.append(rgb_of(hex_color))
        shade_of[index] = steps
        order.append(index)

    new_colors: list[str] = []
    index_map: dict[tuple[int, int], int] = {}
    for index in order:
        steps = shade_of[index]
        for step, hex_color in enumerate(steps):
            index_map[(index, step)] = len(new_colors) + 1
            new_colors.append(hex_color)

    regions = []

    def emit(geom, n: int) -> None:
        d, evenodd = path_of(geom)
        if not d:
            return
        area, radius = measure(geom)
        region = {
            "d": d,
            "n": n,
            "label": label_of(geom),
            "hintSize": int(max(11, min(28, round(radius * 1.6)))),
            "id": f"r{len(regions)}",
        }
        if evenodd:
            region["evenodd"] = True
        regions.append(region)
        _ = area

    # Draw unsplit regions first, then bands, so a hairline overlap covers paper.
    for region in picture["regions"]:
        # Reconstruct by identity: unsplit ones are those not accepted.
        pass
    accepted_ids = set(id(item[2]) for item in [])  # placeholder to keep type quiet
    _ = accepted_ids

    split_lookup = {(id(region)): pieces for pieces, _color, region in []}
    # Use object identity from the original list.
    piece_by_id = {}
    # Re-run is wasteful; store while accepting. Rebuild from `accepted` paired with region
    # by re-reading the loop storage. `accepted` dropped the region. Redo mapping:
    return _emit_picture(picture, accepted, shade_of, index_map, new_colors)


def _emit_picture(picture, accepted, shade_of, index_map, new_colors) -> dict:
    # `accepted` is (pieces, color_index) without the source region, so match by
    # recomputing nothing: the caller passes pieces already. Unsplit regions are
    # every original region whose geometry was not accepted. We pass them via
    # a side channel stored on the function. See band_picture rewrite below.
    raise RuntimeError("replaced")


def rewrite(picture: dict) -> tuple[dict, dict]:
    original_regions = picture["regions"]
    colors: list[str] = [c.lower() for c in picture["colors"]]
    plans = []
    for region in original_regions:
        geom = to_geom(parse_path(region["d"]))
        plans.append((region, geom))

    ranked = []
    for region, geom in plans:
        if geom is None:
            continue
        chosen = choose_split(geom)
        if chosen:
            ranked.append((geom.area, region, chosen[1]))
    ranked.sort(key=lambda item: -item[0])

    used = {}
    steps = {index: 1 for index in range(len(colors))}
    total = len(original_regions)
    for _area, region, pieces in ranked:
        extra = len(pieces) - 1
        room = TARGET + 40
        # Keep adding while the page is under the natural target, then only
        # keep splits of very large fields.
        if total >= room and _area < 6000:
            continue
        if total + extra > MAX_REGIONS:
            continue
        parent = region["n"] - 1
        grow = max(0, len(pieces) - steps[parent])
        if sum(steps.values()) + grow > 28:
            continue
        steps[parent] = max(steps[parent], len(pieces))
        used[id(region)] = pieces
        total += extra

    groups = {index: count for index, count in steps.items() if count > 1}

    blocked: list[tuple[int, int, int]] = [rgb_of(c) for i, c in enumerate(colors) if i not in groups]
    # Unsplit colors occupy their original slots and must not be collided with.
    shade_of: dict[int, list[str]] = {}
    for index, hex_color in enumerate(colors):
        count = groups.get(index, 1)
        if count == 1:
            shade_of[index] = [hex_color]
        else:
            shade_of[index] = shade_steps(hex_color, count, blocked)

    new_colors: list[str] = []
    step_n: dict[tuple[int, int], int] = {}
    for index in range(len(colors)):
        for step, hex_color in enumerate(shade_of[index]):
            step_n[(index, step)] = len(new_colors) + 1
            new_colors.append(hex_color)

    regions = []

    def emit(geom, n: int, evenodd_hint: bool = False) -> None:
        d, evenodd = path_of(geom)
        if not d:
            return
        _area, radius = measure(geom)
        region = {
            "d": d,
            "n": n,
            "label": label_of(geom),
            "hintSize": int(max(11, min(28, round(radius * 1.6)))),
            "id": f"r{len(regions)}",
        }
        if evenodd or evenodd_hint:
            region["evenodd"] = True
        regions.append(region)

    for region, geom in plans:
        pieces = used.get(id(region))
        if not pieces or geom is None:
            # Keep the authored path so unsplit subjects stay exactly as drawn.
            copied = {
                "d": region["d"],
                "n": step_n[(region["n"] - 1, 0)],
                "label": region.get("label"),
                "hintSize": region.get("hintSize", 12),
                "id": f"r{len(regions)}",
            }
            if region.get("evenodd"):
                copied["evenodd"] = True
            regions.append(copied)
            continue
        parent = region["n"] - 1
        steps = shade_of[parent]
        # Top / outer band is the lightest step.
        for index, piece in enumerate(pieces):
            step = min(index, len(steps) - 1)
            for part in flatten(piece):
                if part.area < 30:
                    continue
                area, radius = measure(part)
                if area < MIN_AREA or radius < MIN_RADIUS:
                    continue
                # A hair of overlap covers the cracks a curved cut leaves between neighbors.
                sealed = part.buffer(0.35).intersection(geom.buffer(0.2))
                if sealed.is_empty:
                    sealed = part
                emit(sealed, step_n[(parent, step)], bool(region.get("evenodd")))

    out = {
        "id": picture["id"],
        "category": picture["category"],
        "title": picture["title"],
        "caption": picture["caption"],
        "viewBox": picture.get("viewBox", "0 0 320 460"),
        "colors": new_colors,
        "regions": regions,
        "outline": picture.get("outline", ""),
        "ink": picture.get("ink", []),
    }
    if picture.get("credits"):
        out["credits"] = picture["credits"]
    stats = {
        "id": picture["id"],
        "before": len(original_regions),
        "after": len(regions),
        "colors": len(new_colors),
        "splits": len(used),
    }
    return out, stats


def main() -> None:
    only = None
    out_dir = ART
    args = sys.argv[1:]
    if "--only" in args:
        only = set(args[args.index("--only") + 1].split(","))
    if "--out" in args:
        out_dir = Path(args[args.index("--out") + 1])
        out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for path in sorted(ART.glob("*.json")):
        picture = json.loads(path.read_text())
        if only and picture["id"] not in only:
            continue
        updated, stats = rewrite(picture)
        dest = out_dir / path.name
        dest.write_text(json.dumps(updated, separators=(",", ":"), ensure_ascii=False) + "\n")
        rows.append(stats)
        print(f"{stats['id']:22} {stats['before']:3} -> {stats['after']:3}  colors {stats['colors']:2}  splits {stats['splits']}")
    if rows:
        after = [r["after"] for r in rows]
        print(f"pages {len(rows)}  regions {min(after)}–{max(after)}")


if __name__ == "__main__":
    main()
