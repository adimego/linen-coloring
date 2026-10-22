#!/usr/bin/env python3
"""Tulips category: original scenes plus two public-domain botanical plates."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

import trace_landscapes as traces
from make_new_sets import append_audit, beads, thick
from make_pages import ART, VW, VH, Scene, paint_rgb, vectorize
from tidy_regions import tidy

ROOT = Path(__file__).resolve().parents[1]


def tulip(scene: Scene, x: float, y: float, h: float, petal: int, leaf: int, stem: int, tilt: float = 0) -> None:
    scene.capsule(x, y + h * 0.15, x + tilt, y + h, max(3.4, h * 0.05), stem)
    scene.ellipse(x - h * 0.22, y + h * 0.55, h * 0.34, h * 0.09, leaf, -58)
    scene.ellipse(x + h * 0.24, y + h * 0.7, h * 0.3, h * 0.08, leaf, 48)
    scene.ellipse(x - h * 0.11, y, h * 0.14, h * 0.28, petal, -16)
    scene.ellipse(x + h * 0.11, y, h * 0.14, h * 0.28, petal, 16)
    scene.ellipse(x, y - h * 0.04, h * 0.12, h * 0.3, petal)


def scene_field() -> Scene:
    """Rows of tulips in perspective. Every bloom sits on a stem that reaches
    the ground, with leaves. Far rows use a shared leaf band plus wide stems
    so cleanup cannot erase them into the grass."""
    c = [
        "#7ebfe0",  # 0 sky top
        "#c5e6f6",  # 1 sky
        "#fff6ea",  # 2 cloud and mill blades
        "#f6d36a",  # 3 sun
        "#d5ecc4",  # 4 far meadow
        "#9ed39a",  # 5 grass
        "#4e9a5c",  # 6 leaves
        "#1f6a3c",  # 7 stems
        "#e36d97",  # 8 pink
        "#b43d66",  # 9 rose
        "#e07a45",  # 10 coral
        "#f0c14d",  # 11 yellow tulip
        "#f4efe4",  # 12 mill wall
        "#8d5344",  # 13 mill wood
        "#4a332c",  # 14 mill shadow
        "#d7b98a",  # 15 soil
    ]
    s = Scene(c, {0, 1, 4, 5, 15}, 121)
    s.bands(0, 0, 320, 200, [0, 1])
    s.circle(262, 58, 20, 3)
    s.ellipse(70, 78, 36, 14, 2)
    s.ellipse(96, 84, 28, 12, 2)
    s.ellipse(188, 48, 40, 14, 2)
    s.ellipse(214, 56, 26, 11, 2)
    s.ellipse(160, 210, 200, 36, 4)
    s.rect(0, 196, 320, 264, 5)
    s.rect(0, 418, 320, 42, 15)

    # Windmill stands on the far meadow, left of the flowers.
    s.poly([(34, 268), (86, 268), (76, 148), (44, 148)], 12)
    s.rect(52, 188, 16, 28, 14)
    s.ellipse(60, 142, 28, 14, 13)
    s.circle(60, 142, 9, 14)
    for ang in (18, 108, 198, 288):
        rad = math.radians(ang)
        s.capsule(60, 142, 60 + math.cos(rad) * 54, 142 + math.sin(rad) * 54, 8, 2)

    blooms = (8, 9, 10, 11)

    def cup(x: float, y: float, rx: float, ry: float, color: int) -> None:
        # Each petal is wide enough to keep an inscribed diameter past the floor.
        s.ellipse(x - rx * 0.42, y + ry * 0.12, rx * 0.78, ry * 0.86, color, -16)
        s.ellipse(x + rx * 0.42, y + ry * 0.12, rx * 0.78, ry * 0.86, color, 16)
        s.ellipse(x, y, rx * 0.7, ry, color)

    def plant(x: float, bloom_y: float, ground_y: float, rx: float, ry: float, color: int, tilt: float, leaf: bool) -> None:
        stem_top = bloom_y + ry * 0.55
        s.capsule(x, stem_top, x + tilt, ground_y, 9, 7)
        if leaf:
            s.ellipse(x - 16, (stem_top + ground_y) * 0.5, 20, 10, 6, -50)
            s.ellipse(x + 18, (stem_top + ground_y) * 0.58, 22, 10, 6, 46)
        cup(x, bloom_y, rx, ry, color)

    # Far row: wide stems drop into one leaf band, so nothing floats above the field.
    s.poly([(96, 214), (308, 210), (316, 252), (88, 258)], 6)
    far_x = [112, 156, 200, 244, 288]
    for i, x in enumerate(far_x):
        plant(x, 176, 248, 14, 18, blooms[i % 4], tilt=(i % 2) * 6 - 3, leaf=False)
    # Mid row, a little closer and larger. Stems run down into the front foliage.
    s.poly([(24, 292), (316, 286), (320, 340), (8, 348)], 6)
    mid_x = [78, 132, 186, 240, 294]
    for i, x in enumerate(mid_x):
        plant(x, 252, 338, 16, 22, blooms[(i + 1) % 4], tilt=(i % 2) * 8 - 4, leaf=True)
    # Front row reaches the soil at the bottom edge.
    front_x = [58, 128, 198, 268]
    for i, x in enumerate(front_x):
        plant(x, 348, 456, 18, 28, blooms[(i + 2) % 4], tilt=(i % 2) * 10 - 5, leaf=True)
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
    ]
    s = Scene(c, {0}, 127)
    s.img[:] = 0
    s.rect(0, 300, 320, 160, 1)
    s.ellipse(160, 312, 190, 16, 2)
    s.ellipse(160, 430, 36, 12, 3)
    s.poly([(128, 250), (192, 250), (176, 400), (144, 400)], 11)
    s.ellipse(160, 248, 40, 14, 3)
    s.rect(146, 400, 28, 14, 4)
    stems = [(-70, 70, 6), (-40, 110, 5), (-10, 90, 8), (20, 120, 7), (48, 80, 6), (72, 100, 5)]
    for i, (dx, h, shade) in enumerate(stems):
        x = 160 + dx * 0.55
        tulip(s, x, 250 - h, h, shade, 9 if i % 2 == 0 else 10, 4, tilt=dx * 0.08)
    s.ellipse(118, 250, 16, 8, 12, -30)
    s.ellipse(202, 252, 16, 8, 12, 30)
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
    ]
    s = Scene(c, {0, 1}, 131)
    s.img[:] = 0
    s.ellipse(160, 230, 180, 230, 1)
    tulip(s, 160, 150, 200, 3, 6, 11)
    s.ellipse(160, 150, 28, 62, 4)
    s.ellipse(118, 250, 46, 14, 7, -40)
    s.ellipse(214, 280, 50, 14, 8, 36)
    s.ellipse(70, 340, 36, 12, 6, -20)
    # A side bud on a stem that leaves the main stalk.
    s.capsule(160, 280, 84, 200, 5, 11)
    s.ellipse(78, 186, 16, 28, 2, -20)
    s.ellipse(78, 180, 8, 18, 5, -20)
    s.circle(250, 70, 16, 5)
    return s


def scene_mandala() -> Scene:
    c = [
        "#fff6f8",
        "#f7d0e0",
        "#e36d97",
        "#c4476e",
        "#f6d56a",
        "#e07a45",
        "#7ec48a",
        "#3f8a4e",
        "#7eb6e2",
        "#f7f4ee",
        "#c9b6e6",
        "#8d5344",
    ]
    s = Scene(c, {0}, 137)
    s.img[:] = 0
    s.ellipse(160, 230, 168, 200, 1)
    cx, cy = 160, 230
    for i in range(10):
        a = -math.pi / 2 + i * math.tau / 10
        x = cx + math.cos(a) * 108
        y = cy + math.sin(a) * 128
        shade = 2 if i % 2 == 0 else 3
        s.capsule(cx, cy, x, y, 4, 6 if i % 2 == 0 else 7)
        s.ellipse(x, y, 18, 32, shade, math.degrees(a + math.pi / 2))
        s.ellipse(x, y, 8, 16, 4 if i % 2 == 0 else 5, math.degrees(a + math.pi / 2))
    for i in range(8):
        a = i * math.tau / 8
        s.ellipse(cx + math.cos(a) * 58, cy + math.sin(a) * 70, 12, 22, 10 if i % 2 == 0 else 8, math.degrees(a + math.pi / 2))
    s.circle(cx, cy, 22, 4)
    s.circle(cx, cy, 10, 9)
    return s


def scene_path() -> Scene:
    c = [
        "#9fd0ea",
        "#f7e7c4",
        "#7ec48a",
        "#3f8a4e",
        "#e7c9a4",
        "#c9845a",
        "#e36d97",
        "#c4476e",
        "#f6d56a",
        "#f7f4ee",
        "#8d5344",
        "#6aa8d4",
    ]
    s = Scene(c, {0, 1}, 139)
    s.img[:] = 0
    s.bands(0, 0, 320, 180, [11, 0])
    s.circle(60, 48, 16, 1)
    s.rect(0, 170, 320, 290, 2)
    s.poly([(128, 190), (192, 190), (250, 460), (70, 460)], 4)
    s.ellipse(160, 200, 36, 14, 5)
    # Gate posts and arch, joined.
    s.rect(108, 150, 12, 50, 10)
    s.rect(200, 150, 12, 50, 10)
    s.capsule(114, 150, 206, 150, 6, 10)
    for side, petal in ((-1, 6), (1, 7)):
        for row, y in enumerate((210, 260, 320, 390)):
            for i in range(3):
                x = 160 + side * (70 + i * 28 + row * 6)
                if x < 16 or x > 304:
                    continue
                shade = petal if (i + row) % 2 == 0 else 8
                tulip(s, x, y, 36 + row * 6, shade, 3 if i % 2 == 0 else 2, 10, tilt=side * 3)
    return s


def scene_can() -> Scene:
    c = [
        "#d7eef6",
        "#7ec48a",
        "#3f8a4e",
        "#e7c9a4",
        "#c9845a",
        "#8d5344",
        "#7eb6e2",
        "#3d78b4",
        "#e36d97",
        "#c4476e",
        "#f6d56a",
        "#f7f4ee",
        "#f4b4c8",
    ]
    s = Scene(c, {0}, 143)
    s.img[:] = 0
    s.rect(0, 300, 320, 160, 1)
    s.ellipse(160, 312, 200, 18, 2)
    # Can body, spout, and handle, all touching.
    s.ellipse(150, 300, 70, 48, 6)
    s.ellipse(150, 268, 54, 14, 11)
    s.capsule(190, 280, 250, 230, 8, 7)
    s.ellipse(256, 224, 14, 10, 6)
    handle = [(100, 270), (70, 230), (78, 180), (120, 168), (148, 190)]
    thick(s, handle, 10, 5)
    for i, (dx, h, shade) in enumerate(((-20, 70, 8), (0, 96, 9), (24, 64, 10), (46, 80, 12))):
        tulip(s, 140 + dx, 250 - h, h, shade, 2 if i % 2 == 0 else 1, 5)
    tulip(s, 250, 250, 70, 8, 2, 5, tilt=6)
    s.ellipse(40, 360, 28, 12, 3, -20)
    return s


ORIGINALS = [
    ("tulip-field", "Tulip Field", "Rows of tulips on stems, and a windmill.", scene_field),
    ("tulip-bouquet", "Tulip Bouquet", "A vase filled with tulips.", scene_bouquet),
    ("tulip-closeup", "Single Tulip", "One tulip, close enough to count the petals.", scene_closeup),
    ("tulip-mandala", "Tulip Mandala", "Tulips arranged in a ring.", scene_mandala),
    ("tulip-path", "Garden Path", "A path between two beds of tulips.", scene_path),
    ("watering-can", "Watering Can", "Tulips growing from a watering can.", scene_can),
]

PLATES = [
    {
        "id": "redoute-tulip",
        "title": "Sweet Tulip",
        "caption": "A botanical tulip from Redouté's Liliacées.",
        "file": "Tulipa suaveolens in Les liliacees.jpg",
        "author": "Pierre-Joseph Redouté",
        "work": "Tulipa suaveolens, from Les Liliacées",
        "focus": (0.48, 0.40),
        "covers": [(0.0, 0.90, 1.0, 0.10)],
        "seed": 151,
    },
    {
        "id": "besler-tulips",
        "title": "Besler Tulips",
        "caption": "Three tulips from a Hortus Eystettensis plate.",
        "file": "Besler H.E. tulipa 2.jpg",
        "author": "Basilius Besler",
        "work": "Tulipa, from Hortus Eystettensis",
        "focus": (0.50, 0.42),
        "covers": [(0.0, 0.88, 1.0, 0.12)],
        "seed": 157,
    },
]


def _install_rich_scenes() -> None:
    import sys

    scenes = getattr(sys.modules.get("rich_scenes"), "SCENES", None)
    if not scenes:
        return
    global ORIGINALS
    ORIGINALS = [
        (pid, title, caption, scenes.get(pid, maker))
        for pid, title, caption, maker in ORIGINALS
    ]


def build_original(spec: tuple) -> tuple[dict, dict]:
    pid, title, caption, maker = spec
    scene = maker()
    best = None
    for target in (170, 150, 190, 130):
        regions, colors, outline = vectorize(scene, target)
        count = len(regions)
        print(f"  {pid} target {target} -> {count} regions, {len(colors)} colors", flush=True)
        best = (regions, colors, outline, count)
        if 100 <= count <= 260 and 6 <= len(colors) <= 16:
            break
    regions, colors, outline, count = best
    picture = {
        "id": pid,
        "category": "tulips",
        "title": title,
        "caption": caption,
        "viewBox": f"0 0 {VW} {VH}",
        "colors": colors,
        "regions": regions,
        "outline": outline,
        "ink": [],
    }
    picture, summary = tidy(picture)
    summary["before_count"] = count
    return picture, summary


def build_plate(spec: dict) -> tuple[dict, dict]:
    meta = traces.file_meta(spec["file"])
    print(f"   {meta['license']}  {meta['sourceUrl']}", flush=True)
    path = Path("/tmp/tulips") / f"{spec['id']}.jpg"
    traces.download(spec["file"], path)
    rgb = np.array(Image.open(path).convert("RGB"))
    cropped = traces.portrait_crop(rgb, spec["focus"])
    cropped = traces.hide_cartouches(cropped, spec.get("covers", []))
    prepared = traces.lift_lines(cropped)
    indexed, colors = traces.quantize(prepared, spec["seed"])
    paint_rgb(indexed, colors).resize((320, 460), Image.Resampling.BOX).save(Path("/tmp/tulips") / f"{spec['id']}-quant.png")
    picture = traces.build(spec, meta, indexed, colors, category="tulips", target=170, low=90, high=280)
    before = len(picture["regions"])
    picture, summary = tidy(picture)
    summary["before_count"] = before
    return picture, summary


def pages_w() -> int:
    return 320


def pages_h() -> int:
    return 460


def check(summary: dict) -> None:
    px = summary["after_radius"] * 2 * (390 / 320)
    print(
        f"    tidy {summary['before_count']} -> {summary['after_count']}  min {px:.1f}px  colors {summary['colors']}",
        flush=True,
    )
    if summary["after_count"] < 80 or summary["after_count"] > 300:
        raise RuntimeError(f"{summary['id']} has {summary['after_count']} regions")
    if not 6 <= summary["colors"] <= 24:
        raise RuntimeError(f"{summary['id']} has {summary['colors']} colors")
    if px < 14:
        raise RuntimeError(f"{summary['id']} smallest diameter {px:.1f}px")


def write_credits(pictures: list[dict]) -> None:
    path = ROOT / "CREDITS.md"
    text = path.read_text(encoding="utf-8")
    note = "Tulips mixes original illustrations with public-domain botanical plates."
    if note not in text:
        text = text.replace(
            "Pink, Jewelry, and Fun Designs are original illustrations drawn for this app.\n",
            "Pink, Jewelry, and Fun Designs are original illustrations drawn for this app.\n" + note + "\n",
        )
    if "## Tulips" in text:
        text = text.split("## Tulips")[0].rstrip() + "\n"
    lines = ["", "## Tulips", ""]
    for picture in pictures:
        lines.append(f"### {picture['title']}")
        lines.append("")
        lines.append(picture["caption"])
        lines.append("")
        credits = picture.get("credits") or [
            {
                "work": picture["title"],
                "author": "Linen",
                "sourceUrl": "",
                "license": "original work, created for Linen",
                "licenseUrl": "",
            }
        ]
        for credit in credits:
            lines.append(f"- **{credit['work']}**")
            lines.append(f"  - Author: {credit['author']}")
            if credit.get("sourceUrl"):
                lines.append(f"  - Source: {credit['sourceUrl']}")
            else:
                lines.append("  - Source: original illustration created for Linen")
            lines.append(f"  - License: {credit['license']}")
            lines.append("")
    path.write_text(text.rstrip() + "\n" + "\n".join(lines).rstrip() + "\n", encoding="utf-8")


def previews() -> None:
    out = Path("/tmp/tulips")
    out.mkdir(parents=True, exist_ok=True)
    for spec in ORIGINALS:
        scene = spec[3]()
        paint_rgb(scene.img, scene.colors).resize((200, 288), Image.Resampling.BOX).save(out / f"{spec[0]}.png")
        print(spec[0])


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "preview":
        previews()
        return
    pictures = []
    summaries = []
    for spec in ORIGINALS:
        print(spec[0], flush=True)
        picture, summary = build_original(spec)
        check(summary)
        (ART / f"{picture['id']}.json").write_text(json.dumps(picture, separators=(",", ":")), encoding="utf-8")
        pictures.append(picture)
        summaries.append(summary)
    for spec in PLATES:
        print(spec["id"], flush=True)
        picture, summary = build_plate(spec)
        check(summary)
        (ART / f"{picture['id']}.json").write_text(json.dumps(picture, separators=(",", ":")), encoding="utf-8")
        pictures.append(picture)
        summaries.append(summary)
    append_audit(summaries)
    write_credits(pictures)
    print("wrote", len(pictures))


if __name__ == "__main__":
    main()
