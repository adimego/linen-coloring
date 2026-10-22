#!/usr/bin/env python3
"""Turn public-domain landscape prints into Relaxing Landscapes pages.

Each source is checked on Wikimedia Commons before it is used. Only public
domain, CC0, and CC BY (with attribution stored on the picture) are accepted.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import make_pages as pages

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src" / "pictures" / "art"
CACHE = Path("/tmp/land/src")
PREVIEW = Path("/tmp/land/preview")
UA = "LinenColoringBot/1.0 (coloring-book research; educational)"
PD = "https://creativecommons.org/publicdomain/mark/1.0/"

# focus is where the portrait window sits inside the printed area, 0–1.
PAGES = [
    {
        "id": "hakone-lake",
        "title": "Lake at Hakone",
        "caption": "A still lake under a dark mountain.",
        "file": "Hiroshige, The lake in Hakone, 1858.jpg",
        "author": "Utagawa Hiroshige",
        "work": "The lake in Hakone, from Thirty-six Views of Mount Fuji, 1858",
        "focus": (0.58, 0.46),
        "covers": [(0.00, 0.00, 0.48, 0.32)],
        "seed": 11,
    },
    {
        "id": "satta-cliffs",
        "title": "Sea at Satta",
        "caption": "Cliffs above a bay, with Fuji far off.",
        "file": 'Ando Hiroshige - The Sea at Satta, Suruga Province, from the series "Thirty-six Views of Mount Fuji" - Google Art Project.jpg',
        "author": "Utagawa Hiroshige",
        "work": "The Sea at Satta, Suruga Province, from Thirty-six Views of Mount Fuji",
        "focus": (0.48, 0.42),
        "seed": 17,
    },
    {
        "id": "clear-morning",
        "title": "Clear Morning",
        "caption": "Fuji at sunrise, red against a quiet sky.",
        "file": "Red Fuji southern wind clear morning.jpg",
        "author": "Katsushika Hokusai",
        "work": "South Wind, Clear Morning (Gaifū kaisei), from Thirty-six Views of Mount Fuji",
        "focus": (0.50, 0.46),
        "seed": 23,
    },
    {
        "id": "ejiri-fields",
        "title": "Wind over the Fields",
        "caption": "Papers blowing across the fields at Ejiri.",
        "file": "Ejiri in the Suruga province.jpg",
        "author": "Katsushika Hokusai",
        "work": "Ejiri in Suruga Province, from Thirty-six Views of Mount Fuji",
        "focus": (0.34, 0.50),
        "covers": [(0.00, 0.00, 0.30, 0.24)],
        "seed": 29,
    },
    {
        "id": "inume-pass",
        "title": "Inume Pass",
        "caption": "A pine path through the mountains.",
        "file": "Inume pass in the Kai province.jpg",
        "author": "Katsushika Hokusai",
        "work": "The Inume Pass in Kai Province, from Thirty-six Views of Mount Fuji",
        "focus": (0.52, 0.46),
        "covers": [(0.00, 0.00, 0.42, 0.28)],
        "seed": 31,
    },
    {
        "id": "mishima-pines",
        "title": "Mishima Pass",
        "caption": "Pines, a lake, and a path through the hills.",
        "file": "Mishima pass in Kai province.jpg",
        "author": "Katsushika Hokusai",
        "work": "Mishima Pass in Kai Province, from Thirty-six Views of Mount Fuji",
        "focus": (0.46, 0.50),
        "seed": 37,
    },
    {
        "id": "meguro-sunset",
        "title": "Sunset Hill",
        "caption": "A drum bridge and the hill at evening.",
        "file": "Hiroshige, Drum bridge at Meguro and Sunset Hill, 1857.jpg",
        "author": "Utagawa Hiroshige",
        "work": "Drum Bridge and Sunset Hill at Meguro, from One Hundred Famous Views of Edo, 1857",
        "focus": (0.42, 0.48),
        "seed": 41,
    },
    {
        "id": "kusatsu-village",
        "title": "Village at Kusatsu",
        "caption": "A country road with a mountain behind it.",
        "file": "Ando Hiroshige - Landscape at Kusatsu - Google Art Project.jpg",
        "author": "Utagawa Hiroshige",
        "work": "Landscape at Kusatsu",
        "focus": (0.42, 0.48),
        "seed": 43,
    },
]


def api(params: dict) -> dict:
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    delay = 2.0
    for _ in range(6):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 429:
                raise
            time.sleep(delay)
            delay *= 2
    raise RuntimeError("Wikimedia rate limit persisted")


def license_ok(short: str) -> bool:
    text = " ".join(short.lower().replace("_", " ").split())
    if text in {"public domain", "pd", "cc0", "cc0 1.0"}:
        return True
    if text.startswith("cc by"):
        banned = ("sa", "nc", "nd")
        tail = text.removeprefix("cc by").strip()
        tokens = set(tail.replace("-", " ").split())
        return not tokens.intersection(banned)
    return False


def file_meta(filename: str) -> dict:
    cache = CACHE / "meta.json"
    stored: dict = {}
    if cache.exists():
        stored = json.loads(cache.read_text(encoding="utf-8"))
    if filename in stored:
        return stored[filename]
    data = api(
        {
            "action": "query",
            "titles": f"File:{filename}",
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "format": "json",
        }
    )
    pages = data["query"]["pages"]
    page = next(iter(pages.values()))
    if "missing" in page:
        raise RuntimeError(f"missing on Commons: {filename}")
    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})

    def value(key: str) -> str:
        return meta.get(key, {}).get("value", "")

    short = value("LicenseShortName")
    if not license_ok(short):
        raise RuntimeError(f"license not reusable for {filename}: {short!r}")
    title = page["title"].removeprefix("File:")
    meta = {
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(title.replace(" ", "_")),
        "license": "Public domain" if "public domain" in short.lower() or short.lower() in {"pd", "cc0"} else short,
        "licenseUrl": value("LicenseUrl") or PD,
        "thumb": info["url"],
    }
    stored[filename] = meta
    CACHE.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(stored, indent=2), encoding="utf-8")
    time.sleep(1.2)
    return meta


def download(filename: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 10000:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    encoded = urllib.parse.quote(filename)
    url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{encoded}?width=1800"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as response:
        data = response.read()
    if not data.startswith(b"\xff\xd8") and not data.startswith(b"\x89PNG"):
        raise RuntimeError(f"download was not an image: {filename}")
    dest.write_bytes(data)


def content_box(rgb: np.ndarray) -> tuple[int, int, int, int]:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    mask = gray < 242
    mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    ys, xs = np.where(mask)
    height, width = gray.shape
    if len(xs) < 100:
        return 0, 0, width, height
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    pad_x = int((x1 - x0) * 0.012)
    pad_y = int((y1 - y0) * 0.012)
    return max(0, x0 + pad_x), max(0, y0 + pad_y), min(width, x1 - pad_x), min(height, y1 - pad_y)


def portrait_crop(rgb: np.ndarray, focus: tuple[float, float]) -> np.ndarray:
    height, width = rgb.shape[:2]
    x0, y0, x1, y1 = content_box(rgb)
    box_w, box_h = max(1, x1 - x0), max(1, y1 - y0)
    aspect = pages.VW / pages.VH
    if box_w / box_h > aspect:
        crop_h = box_h
        crop_w = int(round(box_h * aspect))
    else:
        crop_w = box_w
        crop_h = int(round(box_w / aspect))
    cx = int(x0 + box_w * focus[0])
    cy = int(y0 + box_h * focus[1])
    left = min(max(cx - crop_w // 2, x0), max(x0, x1 - crop_w))
    top = min(max(cy - crop_h // 2, y0), max(y0, y1 - crop_h))
    cropped = rgb[top : top + crop_h, left : left + crop_w]
    return cv2.resize(cropped, (pages.W, pages.H), interpolation=cv2.INTER_AREA)


def hide_cartouches(rgb: np.ndarray, covers: list[tuple[float, float, float, float]]) -> np.ndarray:
    """Replace publisher title blocks with a clone of the nearby sky."""
    if not covers:
        return rgb
    out = rgb.copy()
    height, width = out.shape[:2]
    mask = np.zeros((height, width), np.uint8)
    for x, y, w, h in covers:
        x0 = max(0, int(x * width))
        y0 = max(0, int(y * height))
        x1 = min(width, int((x + w) * width))
        y1 = min(height, int((y + h) * height))
        if x1 <= x0 or y1 <= y0:
            continue
        if x >= 0.5:
            src_x1 = max(1, x0 - 6)
            src_x0 = max(0, src_x1 - max(12, (x1 - x0) // 5))
        else:
            src_x0 = min(width - 2, x1 + 6)
            src_x1 = min(width, src_x0 + max(12, (x1 - x0) // 5))
        band = out[y0:y1, src_x0:src_x1]
        if band.size == 0:
            continue
        fill = cv2.resize(band, (x1 - x0, y1 - y0), interpolation=cv2.INTER_LINEAR)
        out[y0:y1, x0:x1] = fill
        mask[y0:y1, x0:x1] = 255
    if int(mask.max()) == 0:
        return out
    blurred = cv2.GaussianBlur(out, (0, 0), 7)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    alpha = np.clip(dist / 16.0, 0, 1)[..., None]
    mixed = (out.astype(np.float32) * alpha + blurred.astype(np.float32) * (1 - alpha)).astype(np.uint8)
    out[mask > 0] = mixed[mask > 0]
    return out


def lift_lines(rgb: np.ndarray) -> np.ndarray:
    smooth = cv2.bilateralFilter(rgb, 7, 32, 7)
    gray = cv2.cvtColor(smooth, cv2.COLOR_RGB2GRAY)
    dark = (gray < 48).astype(np.uint8) * 255
    thick = cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    thin = cv2.subtract(dark, thick)
    thin = cv2.dilate(thin, np.ones((2, 2), np.uint8))
    if int(thin.sum()) == 0:
        return smooth
    return cv2.inpaint(smooth, thin, 3, cv2.INPAINT_TELEA)


def quantize(rgb: np.ndarray, seed: int, k: int = 12) -> tuple[np.ndarray, list[str]]:
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
    rng = np.random.default_rng(seed)
    take = min(90000, len(lab))
    sample = lab[rng.choice(len(lab), take, replace=False)]
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.4)
    _, _, centers = cv2.kmeans(sample, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    centers = merge_centers(centers.astype(np.float32), 16.0)
    labels = np.empty(len(lab), np.uint8)
    for start in range(0, len(lab), 120000):
        chunk = lab[start : start + 120000]
        dist = ((chunk[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        labels[start : start + len(chunk)] = np.argmin(dist, axis=1).astype(np.uint8)
    indexed = labels.reshape(rgb.shape[:2])
    indexed = close_regions(indexed)
    colors = [lab_to_hex(center) for center in centers]
    return indexed, colors


def merge_centers(centers: np.ndarray, limit: float) -> np.ndarray:
    kept: list[np.ndarray] = []
    for center in centers:
        if any(float(np.linalg.norm(center - other)) < limit for other in kept):
            continue
        kept.append(center)
    return np.stack(kept, axis=0)


def lab_to_hex(center: np.ndarray) -> str:
    pixel = np.uint8([[center]])
    rgb = cv2.cvtColor(pixel, cv2.COLOR_LAB2RGB)[0, 0]
    return "#{:02x}{:02x}{:02x}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


def close_regions(indexed: np.ndarray) -> np.ndarray:
    out = indexed.copy()
    kernel = np.ones((3, 3), np.uint8)
    areas = [(int((indexed == idx).sum()), int(idx)) for idx in np.unique(indexed)]
    for _, idx in sorted(areas, reverse=True):
        mask = (out == idx).astype(np.uint8)
        closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        gained = (closed == 1) & (out != idx)
        count, labels, stats, _ = cv2.connectedComponentsWithStats(gained.astype(np.uint8), connectivity=8)
        for i in range(1, count):
            if int(stats[i, cv2.CC_STAT_AREA]) <= 80:
                out[labels == i] = idx
    return out


def background_colors(indexed: np.ndarray) -> set[int]:
    top = indexed[: indexed.shape[0] // 5]
    values, counts = np.unique(top, return_counts=True)
    order = np.argsort(-counts)
    chosen = {int(values[order[0]])}
    if len(order) > 1 and counts[order[1]] > top.size * 0.18:
        chosen.add(int(values[order[1]]))
    return chosen


def build(
    spec: dict,
    meta: dict,
    indexed: np.ndarray,
    colors: list[str],
    category: str = "relaxing-landscapes",
    target: int = 175,
    low: int = 100,
    high: int = 300,
) -> dict:
    scene = pages.Scene(colors, background_colors(indexed), spec["seed"])
    scene.img = indexed
    attempt = target
    regions, palette, outline = pages.vectorize(scene, attempt)
    for _ in range(4):
        count = len(regions)
        if low <= count <= high:
            break
        attempt = int(attempt * (0.8 if count > high else 1.28))
        regions, palette, outline = pages.vectorize(scene, max(40, attempt))
    if not low <= len(regions) <= high:
        raise RuntimeError(f"{spec['id']} has {len(regions)} regions")
    if not 6 <= len(palette) <= 24:
        raise RuntimeError(f"{spec['id']} has {len(palette)} colors")
    return {
        "id": spec["id"],
        "category": category,
        "title": spec["title"],
        "caption": spec["caption"],
        "viewBox": f"0 0 {pages.VW} {pages.VH}",
        "colors": palette,
        "regions": regions,
        "outline": outline,
        "ink": [],
        "credits": [
            {
                "work": spec["work"],
                "author": spec["author"],
                "sourceUrl": meta["sourceUrl"],
                "license": meta["license"],
                "licenseUrl": meta["licenseUrl"] or PD,
            }
        ],
    }


def main() -> None:
    preview_only = "--preview" in sys.argv
    only = ""
    for arg in sys.argv:
        if arg.startswith("--only="):
            only = arg.split("=", 1)[1]
    CACHE.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    hand = {"meguro-sunset", "kusatsu-village"}
    for spec in PAGES:
        if spec["id"] in hand:
            print(f"== {spec['id']} kept as a hand simplification", flush=True)
            continue
        if only and spec["id"] != only:
            continue
        print(f"== {spec['id']}", flush=True)
        meta = file_meta(spec["file"])
        print(f"   {meta['license']}  {meta['sourceUrl']}", flush=True)
        path = CACHE / f"{spec['id']}.jpg"
        download(spec["file"], path)
        rgb = np.array(Image.open(path).convert("RGB"))
        cropped = portrait_crop(rgb, spec["focus"])
        cropped = hide_cartouches(cropped, spec.get("covers", []))
        prepared = lift_lines(cropped)
        indexed, colors = quantize(prepared, spec["seed"])
        painted = pages.paint_rgb(indexed, colors).resize((pages.VW, pages.VH), Image.Resampling.BOX)
        painted.save(PREVIEW / f"{spec['id']}.png")
        print(f"   colors {len(colors)}", flush=True)
        if preview_only:
            continue
        picture = build(spec, meta, indexed, colors)
        out = ART / f"{spec['id']}.json"
        out.write_text(json.dumps(picture, separators=(",", ":")), encoding="utf-8")
        print(f"   regions {len(picture['regions'])} -> {out.name}", flush=True)


if __name__ == "__main__":
    main()
