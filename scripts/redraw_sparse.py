#!/usr/bin/env python3
"""Rebuild the pictures listed in rich_scenes.SCENES. Does not touch the others."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from make_new_sets import append_audit
from make_pages import ART, VW, VH, paint_rgb, vectorize
from rich_scenes import SCENES
from tidy_regions import tidy

PREVIEW = Path("/tmp/quality/paint")


def build(pid: str, scene) -> tuple[dict, dict]:
    old = json.loads((ART / f"{pid}.json").read_text(encoding="utf-8"))
    best = None
    for target in (170, 150, 190, 130, 210):
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
        "id": old["id"],
        "category": old["category"],
        "title": old["title"],
        "caption": old["caption"],
        "viewBox": f"0 0 {VW} {VH}",
        "colors": colors,
        "regions": regions,
        "outline": outline,
        "ink": [{"d": d, "w": w} for d, w in scene.inks],
    }
    if old.get("credits"):
        picture["credits"] = old["credits"]
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


def main() -> None:
    wanted = sys.argv[1:]
    ids = [pid for pid in SCENES if not wanted or pid in wanted]
    missing = [pid for pid in wanted if pid not in SCENES]
    if missing:
        raise SystemExit(f"unknown {missing}")
    PREVIEW.mkdir(parents=True, exist_ok=True)
    summaries = []
    for pid in ids:
        print(pid, flush=True)
        scene = SCENES[pid]()
        paint_rgb(scene.img, scene.colors).resize((220, 316)).save(PREVIEW / f"{pid}.png")
        picture, summary = build(pid, scene)
        (ART / f"{pid}.json").write_text(json.dumps(picture, separators=(",", ":")), encoding="utf-8")
        summaries.append(summary)
    append_audit(summaries)
    print("wrote", len(summaries))


if __name__ == "__main__":
    main()
