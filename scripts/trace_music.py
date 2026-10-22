#!/usr/bin/env python3
"""Turn public-domain music art into Music coloring pages.

Sources are checked on Wikimedia Commons. Only public domain, CC0, and CC BY
are accepted. No modern-artist portraits, band marks, or song lyrics.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

import trace_landscapes as landscapes

CACHE = Path("/tmp/music/src")
PREVIEW = Path("/tmp/music/preview")
ART = landscapes.ART

PAGES = [
    {
        "id": "arts-music",
        "title": "The Arts: Music",
        "caption": "An Art Nouveau figure with a lyre.",
        "file": "Alfons Mucha - The Arts Music, 1898.jpg",
        "author": "Alphonse Mucha",
        "work": "The Arts: Music, 1898",
        "focus": (0.50, 0.48),
        "seed": 51,
    },
    {
        "id": "violin-score",
        "title": "Violin and Score",
        "caption": "A violin resting on open sheet music.",
        "file": "William Michael Harnett Still life Violin and Music.jpg",
        "author": "William Michael Harnett",
        "work": "Still Life — Violin and Music",
        "focus": (0.50, 0.46),
        "seed": 53,
    },
    {
        "id": "still-guitar",
        "title": "Still Guitar",
        "caption": "A guitar among flowers and a glass.",
        "file": "Tomás Yepes - Still Life With A Guitar, c. 1650.jpg",
        "author": "Tomás Yepes",
        "work": "Still Life with a Guitar, about 1650",
        "focus": (0.42, 0.48),
        "seed": 59,
    },
    {
        "id": "at-the-harp",
        "title": "At the Harp",
        "caption": "A player beside a tall harp.",
        "file": "Caroline Delestres - Woman Playing a Harp 2.jpg",
        "author": "Caroline Delestres",
        "work": "Woman Playing a Harp",
        "focus": (0.50, 0.46),
        "seed": 61,
    },
    {
        "id": "at-the-piano",
        "title": "At the Piano",
        "caption": "A quiet hour at the piano.",
        "file": "Jenny Nyström Girl at the Piano 1892.jpg",
        "author": "Jenny Nyström",
        "work": "Girl at the Piano, 1892",
        "focus": (0.50, 0.48),
        "seed": 67,
    },
    {
        "id": "maple-shamisen",
        "title": "Maple and Shamisen",
        "caption": "A shamisen under red maple leaves.",
        "file": "Maple Leaves Koyo and Shamisen by Kitagawa Utamaro c1803.png",
        "author": "Kitagawa Utamaro",
        "work": "Maple Leaves (Koyo) and Shamisen, about 1803",
        "focus": (0.50, 0.46),
        "seed": 71,
    },
    {
        "id": "with-a-koto",
        "title": "With a Koto",
        "caption": "A koto held close, from a Hokusai print.",
        "file": "Koto o idaku musume LCCN2008660877.jpg",
        "author": "Katsushika Hokusai",
        "work": "Koto o idaku musume (Girl Holding a Koto)",
        "focus": (0.52, 0.48),
        "seed": 73,
    },
    {
        "id": "flute-player",
        "title": "Flute Player",
        "caption": "A flute raised in a woodblock print.",
        "file": "Utagawa Kuniteru II - Flute Player.jpg",
        "author": "Utagawa Kuniteru II",
        "work": "Flute Player",
        "focus": (0.50, 0.46),
        "seed": 79,
    },
]


def main() -> None:
    preview_only = "--preview" in sys.argv
    only = ""
    for arg in sys.argv:
        if arg.startswith("--only="):
            only = arg.split("=", 1)[1]
    CACHE.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    hand = {"maple-shamisen", "with-a-koto", "flute-player"}
    for spec in PAGES:
        if spec["id"] in hand:
            print(f"== {spec['id']} kept as a hand simplification", flush=True)
            continue
        if only and spec["id"] != only:
            continue
        print(f"== {spec['id']}", flush=True)
        meta = landscapes.file_meta(spec["file"])
        print(f"   {meta['license']}  {meta['sourceUrl']}", flush=True)
        path = CACHE / f"{spec['id']}.jpg"
        landscapes.download(spec["file"], path)
        rgb = np.array(Image.open(path).convert("RGB"))
        cropped = landscapes.portrait_crop(rgb, spec["focus"])
        cropped = landscapes.hide_cartouches(cropped, spec.get("covers", []))
        prepared = landscapes.lift_lines(cropped)
        indexed, colors = landscapes.quantize(prepared, spec["seed"])
        painted = landscapes.pages.paint_rgb(indexed, colors).resize(
            (landscapes.pages.VW, landscapes.pages.VH), Image.Resampling.BOX
        )
        painted.save(PREVIEW / f"{spec['id']}.png")
        print(f"   colors {len(colors)}", flush=True)
        if preview_only:
            continue
        picture = landscapes.build(
            spec,
            meta,
            indexed,
            colors,
            category="music",
            target=190,
            low=150,
            high=250,
        )
        out = ART / f"{spec['id']}.json"
        out.write_text(__import__("json").dumps(picture, separators=(",", ":")), encoding="utf-8")
        print(f"   regions {len(picture['regions'])} -> {out.name}", flush=True)


if __name__ == "__main__":
    main()
