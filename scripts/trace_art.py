#!/usr/bin/env python3
"""Download PD/CC0 line art and trace it into closed tap-to-fill regions.

Licenses allowed: public domain, CC0, CC BY. This script refuses anything else.
Outputs src/pictures/art/*.json and CREDITS.md.
"""

from __future__ import annotations

import json
import re
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path("/workspace")
ART = ROOT / "src" / "pictures" / "art"
CACHE = Path("/tmp/linen-src/orig")
PREVIEW = Path("/tmp/linen-src/traced")
UA = "LinenColoringBot/1.0 (coloring-book research; educational)"

PAGE_W, PAGE_H = 320, 460
SCALE = 3
CANVAS = (PAGE_W * SCALE, PAGE_H * SCALE)  # w, h
CC0 = "CC0 1.0"
CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/"
PD = "Public domain"
PD_URL = "https://creativecommons.org/publicdomain/mark/1.0/"
INK = "#4a3f48"
PAPER = "#fbf6f0"
PASTEL = ["#f2c1c8", "#f7e3c2", "#c9dfc4", "#c9d4f2", "#e6c8ee", "#f3d5b5", "#b7d8d4", "#e7d3c5"]


def credit(work: str, author: str, source: str, license_name: str, license_url: str) -> dict:
    return {
        "work": work,
        "author": author,
        "sourceUrl": source,
        "license": license_name,
        "licenseUrl": license_url,
    }


def rawpixel(image_id: str, slug: str, work: str, url: str) -> dict:
    return {
        **credit(work, "Unknown", f"https://www.rawpixel.com/image/{image_id}/{slug}", CC0, CC0_URL),
        "url": url,
        "kind": "raster",
    }


def commons_file(filename: str, work: str, author: str, license_name: str, license_url: str, kind: str) -> dict:
    page = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(filename.replace(" ", "_"))
    download = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)
    return {
        **credit(work, author, page, license_name, license_url),
        "url": download,
        "kind": kind,
        "filename": filename,
    }


# Every file below was checked as public domain or CC0 on Wikimedia Commons or rawpixel.
FILES = {
    "guitar": rawpixel(
        "6588592",
        "vector-sticker-public-domain-black",
        "Acoustic guitar clipart",
        "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA0L2pvYjcxMC0wMjEtdl8yLmpwZw.jpg",
    ),
    "cats": commons_file(
        "Love Letters of a Cat by Louis Wain (1860\u20131939).png",
        "Love Letters of a Cat",
        "Louis Wain",
        PD,
        PD_URL,
        "raster",
    ),
    "snake": rawpixel(
        "6503958",
        "vector-sticker-vintage-public-domain",
        "Rattlesnake clipart",
        "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA0L2pvYjY3Ni0xMTktdl8xLmpwZw.jpg",
    ),
    "rose": rawpixel(
        "6303590",
        "image-plant-flower-vintage",
        "Rose flower drawing",
        "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvam9iNjcxLTAzOC14LmpwZw.jpg",
    ),
    "bracelet": commons_file(
        "Beaded bracelet illustration.png",
        "Beaded bracelet illustration",
        "Francis Akuka for the Wikimedia Foundation",
        CC0,
        CC0_URL,
        "raster",
    ),
    "sweater": rawpixel(
        "7613269",
        "vector-cartoon-illustrations-public-domain",
        "Green sweater illustration",
        "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA4L2pvYjk1MS01OV8xLmpwZw.jpg",
    ),
    "disco": rawpixel(
        "6431607",
        "vector-sticker-public-domain-shape",
        "Disco ball sticker",
        "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA0L2pvYjY4Mi0wMDktbDF1OGRudDEuanBn.jpg",
    ),
    "stage": rawpixel(
        "6328855",
        "vector-sticker-public-domain-illustrations",
        "Theater stage clipart",
        "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvam9iNjgwLTA2MS12LWwxZGJ0eTMwLmpwZw.jpg",
    ),
    "truck": rawpixel(
        "6449242",
        "vector-sticker-public-domain-illustrations",
        "Pickup truck clipart",
        "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA0L2pvYjY4My0wMTMyLWwxeWdrYWxjLmpwZw.jpg",
    ),
    "hat": commons_file(
        "Cowboy boot and hat.svg",
        "Cowboy boot and hat",
        "gnokii (Openclipart)",
        CC0,
        CC0_URL,
        "svg",
    ),
    "banjo": commons_file(
        "Banjo (PSF).png",
        "Banjo",
        "Pearson Scott Foresman",
        PD,
        PD_URL,
        "raster",
    ),
    "tower": rawpixel(
        "6726099",
        "image-vintage-public-domain-house",
        "Reservoir water tower",
        "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L2pvYjcyNC0yMTAteC5qcGc.jpg",
    ),
    "fire": rawpixel(
        "6864204",
        "vector-sticker-public-domain-fire",
        "Bonfire clipart",
        "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L2pvYjczMC0xNTEtdi5qcGc.jpg",
    ),
    "sail": rawpixel(
        "6673060",
        "vector-sticker-public-domain-illustrations",
        "Sailboat clipart",
        "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L2pvYjcyMi0xNjcuanBn.jpg",
    ),
}


def download(key: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    meta = FILES[key]
    dest = CACHE / f"{key}.bin"
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    req = urllib.request.Request(meta["url"], headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as response:
        dest.write_bytes(response.read())
    print(f"downloaded {key} {dest.stat().st_size}")
    return dest


def load_rgba(key: str) -> Image.Image:
    path = download(key)
    meta = FILES[key]
    if meta["kind"] == "svg":
        png = CACHE / f"{key}.png"
        subprocess.check_call(
            ["rsvg-convert", "-w", "1600", "-b", "white", "-o", str(png), str(path)],
        )
        im = Image.open(png).convert("RGBA")
    else:
        im = Image.open(path).convert("RGBA")
    return im


def trim(im: Image.Image, thresh: int = 246) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    content = (arr[:, :, 3] > 12) & np.any(arr[:, :, :3] < thresh, axis=2)
    if not content.any():
        return im
    ys, xs = np.where(content)
    pad = 6
    box = (
        max(0, int(xs.min()) - pad),
        max(0, int(ys.min()) - pad),
        min(im.width, int(xs.max()) + pad + 1),
        min(im.height, int(ys.max()) + pad + 1),
    )
    return im.crop(box)


def knockout(im: Image.Image, thresh: int = 236) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    light = (arr[:, :, 0] >= thresh) & (arr[:, :, 1] >= thresh) & (arr[:, :, 2] >= thresh)
    arr[:, :, 3] = np.where(light, 0, arr[:, :, 3])
    return Image.fromarray(arr)


def fit(im: Image.Image, box: tuple[int, int], rotate: float = 0) -> Image.Image:
    sprite = trim(im)
    if rotate:
        sprite = sprite.rotate(rotate, expand=True, resample=Image.Resampling.BICUBIC, fillcolor=(255, 255, 255, 0))
        sprite = trim(sprite)
    sprite.thumbnail(box, Image.Resampling.LANCZOS)
    return sprite


def blank() -> Image.Image:
    return Image.new("RGBA", CANVAS, (255, 255, 255, 255))


def paste_at(page: Image.Image, sprite: Image.Image, cx: int, cy: int) -> None:
    x = int(cx - sprite.width / 2)
    y = int(cy - sprite.height / 2)
    left = max(0, -x)
    top = max(0, -y)
    right = min(sprite.width, page.width - x)
    bottom = min(sprite.height, page.height - y)
    if right <= left or bottom <= top:
        return
    cropped = sprite.crop((left, top, right, bottom))
    page.alpha_composite(cropped, (x + left, y + top))


def center_piece(im: Image.Image, pad: int = 28) -> Image.Image:
    page = blank()
    sprite = fit(im, (CANVAS[0] - pad * 2, CANVAS[1] - pad * 2))
    paste_at(page, sprite, CANVAS[0] // 2, CANVAS[1] // 2)
    return page


def build_pages() -> dict[str, Image.Image]:
    guitar = load_rgba("guitar")
    cats = load_rgba("cats")
    snake = load_rgba("snake")
    rose = load_rgba("rose")
    bracelet = load_rgba("bracelet")
    sweater = load_rgba("sweater")
    disco = load_rgba("disco")
    stage = load_rgba("stage")
    truck = load_rgba("truck")
    hat = load_rgba("hat")
    banjo = load_rgba("banjo")
    tower = load_rgba("tower")
    fire = load_rgba("fire")
    sail = load_rgba("sail")

    pages = {
        "swift-guitar": center_piece(guitar, 36),
        "swift-cats": center_piece(cats, 22),
        "swift-bracelets": center_piece(bracelet, 30),
        "swift-cardigan": center_piece(sweater, 40),
        "swift-mirrorball": center_piece(disco, 48),
        "swift-stage": center_piece(stage, 26),
        "od-truck": center_piece(truck, 34),
        "od-hat": center_piece(hat, 40),
        "od-tower": center_piece(tower, 28),
        "od-bonfire": center_piece(fire, 36),
        "od-sail": center_piece(sail, 40),
    }

    garden = blank()
    rose_sprite = knockout(rose, 232)
    spots = [
        (250, 280, 430, 520, -18),
        (710, 300, 430, 520, 16),
        (220, 780, 380, 460, 12),
        (740, 820, 380, 480, -14),
        (480, 180, 340, 400, 0),
        (180, 1120, 320, 380, 20),
        (760, 1140, 320, 380, -8),
    ]
    for cx, cy, bw, bh, rot in spots:
        paste_at(garden, fit(rose_sprite, (bw, bh), rot), cx, cy)
    snake_sprite = knockout(fit(snake, (620, 780), -18), 230)
    paste_at(garden, snake_sprite, CANVAS[0] // 2, 760)
    pages["swift-snake"] = garden

    pair = blank()
    paste_at(pair, knockout(fit(banjo, (460, 1120), -8), 238), 300, 700)
    paste_at(pair, knockout(fit(guitar, (460, 1160), 9), 236), 680, 690)
    pages["od-instruments"] = pair
    return pages


def line_ink(rgb: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    ink = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 35, 9)
    ink[blur < 48] = 255
    # Drop pepper noise in blank paper.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(ink, 8)
    for index in range(1, count):
        if stats[index, cv2.CC_STAT_AREA] < 10:
            ink[labels == index] = 0
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    return cv2.morphologyEx(ink, cv2.MORPH_CLOSE, kernel)


def edge_ink(rgb: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    blur = cv2.bilateralFilter(gray, 7, 24, 7)
    edges = cv2.Canny(blur, 28, 100)
    edges = cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1)
    dark = np.zeros_like(gray)
    dark[blur < 55] = 255
    ink = cv2.bitwise_or(edges, dark)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    ink = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, kernel)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(ink, 8)
    for index in range(1, count):
        if stats[index, cv2.CC_STAT_AREA] < 8:
            ink[labels == index] = 0
    return ink


def potrace_path(ink: np.ndarray) -> str:
    height, width = ink.shape
    bits = np.packbits((ink > 0).astype(np.uint8), axis=1)
    pbm = CACHE / "ink.pbm"
    svg = CACHE / "ink.svg"
    header = f"P4\n{width} {height}\n".encode()
    pbm.write_bytes(header + bits.tobytes())
    subprocess.check_call(["potrace", "-s", "--flat", "-t", "12", "-a", "1.05", "-o", str(svg), str(pbm)])
    text = svg.read_text(encoding="utf-8", errors="replace")
    match = re.search(r'd="([^"]+)"', text, re.S)
    if not match:
        raise RuntimeError("potrace produced no path")
    return re.sub(r"\s+", " ", match.group(1)).strip()


def absorb_small(labels: np.ndarray, min_area: int, max_count: int) -> np.ndarray:
    labels = labels.copy()
    limit = min_area
    for _ in range(8):
        areas = np.bincount(labels.ravel())
        kept = sum(1 for area in areas[1:] if area >= limit)
        if kept <= max_count:
            break
        limit = int(limit * 1.4) + 20
    areas = np.bincount(labels.ravel())
    for index, area in enumerate(areas):
        if index == 0 or area == 0 or area >= limit:
            continue
        labels[labels == index] = 0
    # OpenCV morphology does not accept the int32 label image, so grow by shifts.
    for _ in range(64):
        unknown = labels == 0
        if not unknown.any():
            break
        before = int(unknown.sum())
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            shifted = np.zeros_like(labels)
            src = labels
            if dy > 0:
                src = src[:-dy, :]
                dest_slice_y = (dy, labels.shape[0])
            elif dy < 0:
                src = src[-dy:, :]
                dest_slice_y = (0, labels.shape[0] + dy)
            else:
                dest_slice_y = (0, labels.shape[0])
            if dx > 0:
                src = src[:, :-dx]
                dest_slice_x = (dx, labels.shape[1])
            elif dx < 0:
                src = src[:, -dx:]
                dest_slice_x = (0, labels.shape[1] + dx)
            else:
                dest_slice_x = (0, labels.shape[1])
            shifted[dest_slice_y[0] : dest_slice_y[1], dest_slice_x[0] : dest_slice_x[1]] = src
            take = unknown & (shifted > 0)
            labels[take] = shifted[take]
            unknown = labels == 0
            if not unknown.any():
                break
        if int(unknown.sum()) == before:
            break
    return labels


def contour_path(contour: np.ndarray) -> str:
    points = contour.reshape(-1, 2)
    if len(points) < 3:
        return ""
    simple = [points[0]]
    for point in points[1:]:
        if point[0] != simple[-1][0] or point[1] != simple[-1][1]:
            simple.append(point)
    if len(simple) < 3:
        return ""
    parts = [f"M{simple[0][0] / SCALE:.1f} {simple[0][1] / SCALE:.1f}"]
    for x, y in simple[1:]:
        parts.append(f"L{x / SCALE:.1f} {y / SCALE:.1f}")
    parts.append("Z")
    return " ".join(parts)


def regions_from_labels(labels: np.ndarray, dilate: int) -> list[dict]:
    areas = np.bincount(labels.ravel())
    order = sorted((index for index in range(1, len(areas)) if areas[index] > 0), key=lambda index: -areas[index])
    kernel = np.ones((dilate, dilate), np.uint8) if dilate > 1 else None
    adjacency: dict[int, set[int]] = {index: set() for index in order}
    for shift, axis in ((1, 1), (1, 0)):
        if axis == 1:
            left, right = labels[:, :-shift], labels[:, shift:]
        else:
            left, right = labels[:-shift, :], labels[shift:, :]
        differ = (left != right) & (left != 0) & (right != 0)
        if not differ.any():
            continue
        pairs = np.unique(np.stack([left[differ], right[differ]], axis=1), axis=0)
        for a, b in pairs:
            adjacency.setdefault(int(a), set()).add(int(b))
            adjacency.setdefault(int(b), set()).add(int(a))

    numbers: dict[int, int] = {}
    for index in order:
        used = {numbers[other] for other in adjacency.get(index, ()) if other in numbers}
        for number in range(1, 9):
            if number not in used:
                numbers[index] = number
                break
        else:
            numbers[index] = 1

    regions = []
    for index in order:
        mask = np.where(labels == index, 255, 0).astype(np.uint8)
        if kernel is not None:
            mask = cv2.dilate(mask, kernel)
        contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hierarchy is None:
            continue
        hierarchy = hierarchy[0]
        epsilon_base = 1.15
        for contour_index, contour in enumerate(contours):
            if hierarchy[contour_index][3] != -1:
                continue
            outer = cv2.approxPolyDP(contour, epsilon_base, True)
            holes = []
            child = hierarchy[contour_index][2]
            while child != -1:
                holes.append(cv2.approxPolyDP(contours[child], epsilon_base, True))
                child = hierarchy[child][0]
            pieces = [contour_path(outer)] + [contour_path(hole) for hole in holes]
            pieces = [piece for piece in pieces if piece]
            if not pieces:
                continue
            dist = cv2.distanceTransform(np.where(labels == index, 255, 0).astype(np.uint8), cv2.DIST_L2, 3)
            _, max_dist, _, max_at = cv2.minMaxLoc(dist)
            label = None
            hint = None
            if max_dist >= 4.5:
                point = (float(max_at[0]), float(max_at[1]))
                label = [round(point[0] / SCALE, 1), round(point[1] / SCALE, 1)]
                hint = int(max(4, min(13, round(max_dist / SCALE * 0.95))))
            region = {
                "id": f"r{len(regions)}",
                "d": " ".join(pieces),
                "n": numbers[index],
                "label": label,
            }
            if hint:
                region["hintSize"] = hint
            if holes:
                region["evenodd"] = True
            regions.append(region)
    return regions


def trace_ink(ink: np.ndarray, min_area: int, max_count: int) -> tuple[list[dict], str]:
    white = cv2.bitwise_not(ink)
    count, labels = cv2.connectedComponents(white, 8)
    del count
    labels = absorb_small(labels, min_area, max_count)
    # Fold any leftover unlabeled pixels into ink so the overlay matches.
    ink = ink.copy()
    ink[labels == 0] = 255
    white = cv2.bitwise_not(ink)
    _, labels = cv2.connectedComponents(white, 8)
    regions = regions_from_labels(labels, dilate=5)
    overlay = potrace_path(ink)
    return regions, overlay


def color_labels(rgb: np.ndarray, k: int) -> np.ndarray:
    smooth = cv2.medianBlur(rgb, 3)
    height, width = smooth.shape[:2]
    small = cv2.resize(smooth, (max(90, width // 3), max(90, height // 3)), interpolation=cv2.INTER_AREA)
    pixels = small.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.8)
    _, _, centers = cv2.kmeans(pixels, k, None, criteria, 4, cv2.KMEANS_PP_CENTERS)
    centers = centers.astype(np.float32)
    flat = smooth.reshape(-1, 3).astype(np.float32)
    nearest = np.empty(flat.shape[0], np.int32)
    for start in range(0, len(flat), 50000):
        chunk = flat[start : start + 50000]
        distance = ((chunk[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        nearest[start : start + 50000] = distance.argmin(axis=1)
    pale = [index for index, center in enumerate(centers) if float(center.min()) > 232]
    if pale:
        keeper = pale[0]
        for index in pale[1:]:
            nearest[nearest == index] = keeper
    return nearest.reshape(height, width).astype(np.int32) + 1


def boundary_ink(labels: np.ndarray) -> np.ndarray:
    ink = np.zeros(labels.shape, np.uint8)
    ink[:-1, :][labels[:-1, :] != labels[1:, :]] = 255
    ink[:, :-1][labels[:, :-1] != labels[:, 1:]] = 255
    return cv2.dilate(ink, np.ones((3, 3), np.uint8))


def trace_page(page: Image.Image, mode: str, min_area: int, max_count: int, colors: int = 8) -> dict:
    rgb = np.array(page.convert("RGB"))
    if mode == "color":
        labels = absorb_small(color_labels(rgb, colors), min_area, max_count)
        ink = boundary_ink(labels)
        regions = regions_from_labels(labels, dilate=5)
        overlay = potrace_path(ink)
    else:
        if mode == "line":
            ink = line_ink(rgb)
        elif mode == "edge":
            ink = edge_ink(rgb)
        else:
            raise ValueError(mode)
        regions, overlay = trace_ink(ink, min_area, max_count)
    height = rgb.shape[0]
    return {
        "viewBox": f"0 0 {PAGE_W} {PAGE_H}",
        "regionStroke": 0,
        "regions": regions,
        "strokes": [
            {
                "d": overlay,
                "w": 1,
                "fill": INK,
                "layer": "over",
                "transform": f"scale({1 / SCALE:.6f}) translate(0 {height}) scale(0.1 -0.1)",
            }
        ],
    }


PICTURES = [
    {
        "id": "swift-stage",
        "pack": "swift",
        "title": "Concert Lights",
        "caption": "Curtains, spotlights, and an empty stage.",
        "mode": "color",
        "colors": 10,
        "min_area": 280,
        "max_count": 220,
        "credits": [FILES["stage"]],
    },
    {
        "id": "swift-guitar",
        "pack": "swift",
        "title": "Sparkle Guitar",
        "caption": "An acoustic guitar with a little glitter.",
        "mode": "line",
        "min_area": 160,
        "max_count": 260,
        "credits": [FILES["guitar"]],
    },
    {
        "id": "swift-bracelets",
        "pack": "swift",
        "title": "Bracelets",
        "caption": "A stack of beaded friendship bracelets.",
        "mode": "line",
        "min_area": 140,
        "max_count": 320,
        "credits": [FILES["bracelet"]],
    },
    {
        "id": "swift-cats",
        "pack": "swift",
        "title": "Two Cats",
        "caption": "A pair of cats keeping each other company.",
        "mode": "line",
        "min_area": 120,
        "max_count": 360,
        "credits": [FILES["cats"]],
    },
    {
        "id": "swift-snake",
        "pack": "swift",
        "title": "Garden Snake",
        "caption": "A snake resting in the flowers.",
        "mode": "line",
        "min_area": 150,
        "max_count": 340,
        "credits": [FILES["snake"], FILES["rose"]],
    },
    {
        "id": "swift-cardigan",
        "pack": "swift",
        "title": "Cardigan",
        "caption": "An oversized cardigan for a quiet day.",
        "mode": "edge",
        "min_area": 180,
        "max_count": 260,
        "credits": [FILES["sweater"]],
    },
    {
        "id": "swift-mirrorball",
        "pack": "swift",
        "title": "Mirrorball",
        "caption": "A hanging ball of tiny mirrors.",
        "mode": "line",
        "min_area": 80,
        "max_count": 340,
        "credits": [FILES["disco"]],
    },
    {
        "id": "od-truck",
        "pack": "dominion",
        "title": "Country Road",
        "caption": "A pickup on a long, easy road.",
        "mode": "edge",
        "min_area": 160,
        "max_count": 240,
        "credits": [FILES["truck"]],
    },
    {
        "id": "od-hat",
        "pack": "dominion",
        "title": "Hat & Boots",
        "caption": "A hat waiting beside a pair of boots.",
        "mode": "line",
        "min_area": 80,
        "max_count": 180,
        "credits": [FILES["hat"]],
    },
    {
        "id": "od-instruments",
        "pack": "dominion",
        "title": "Porch Pair",
        "caption": "A banjo and a guitar leaning together.",
        "mode": "line",
        "min_area": 140,
        "max_count": 300,
        "credits": [FILES["banjo"], FILES["guitar"]],
    },
    {
        "id": "od-tower",
        "pack": "dominion",
        "title": "Water Tower",
        "caption": "A small-town tower against a sunset.",
        "mode": "line",
        "min_area": 140,
        "max_count": 280,
        "credits": [FILES["tower"]],
    },
    {
        "id": "od-bonfire",
        "pack": "dominion",
        "title": "String Lights",
        "caption": "A bonfire under a line of bulbs.",
        "mode": "edge",
        "min_area": 160,
        "max_count": 260,
        "credits": [FILES["fire"]],
    },
    {
        "id": "od-sail",
        "pack": "dominion",
        "title": "Lake Boat",
        "caption": "A sailboat on still water.",
        "mode": "line",
        "min_area": 100,
        "max_count": 200,
        "credits": [FILES["sail"]],
    },
]


def write_preview(picture_id: str, traced: dict) -> None:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PAGE_W} {PAGE_H}" width="{PAGE_W}" height="{PAGE_H}">',
        f'<rect width="{PAGE_W}" height="{PAGE_H}" fill="{PAPER}"/>',
    ]
    for region in traced["regions"]:
        color = PASTEL[(region["n"] - 1) % 8]
        rule = ' fill-rule="evenodd"' if region.get("evenodd") else ""
        parts.append(f'<path d="{region["d"]}" fill="{color}" stroke="none"{rule}/>')
    for stroke in traced["strokes"]:
        transform = f' transform="{stroke["transform"]}"' if stroke.get("transform") else ""
        parts.append(f'<path d="{stroke["d"]}" fill="{stroke["fill"]}"{transform}/>')
    parts.append("</svg>")
    svg_path = PREVIEW / f"{picture_id}.svg"
    png_path = PREVIEW / f"{picture_id}.png"
    svg_path.write_text("".join(parts), encoding="utf-8")
    subprocess.check_call(["rsvg-convert", "-w", "390", "-h", "560", "-o", str(png_path), str(svg_path)])


def public_credit(item: dict) -> dict:
    return {
        "work": item["work"],
        "author": item["author"],
        "sourceUrl": item["sourceUrl"],
        "license": item["license"],
        "licenseUrl": item["licenseUrl"],
    }


def write_credits(rows: list[dict]) -> None:
    lines = [
        "# Image credits",
        "",
        "Linen's coloring pages are traced from public-domain and CC0 line art so the regions can be tapped and filled. Nothing here is album art, a logo, or a portrait of a performer.",
        "",
        "Public domain and CC0 works can be reused in an app. Each page below names the source, the author when one is known, and the license.",
        "",
    ]
    current = ""
    for row in rows:
        if row["pack"] != current:
            current = row["pack"]
            lines.append(f"## {row['packName']}")
            lines.append("")
        lines.append(f"### {row['title']}")
        lines.append("")
        lines.append(f"{row['caption']}")
        lines.append("")
        for item in row["credits"]:
            lines.append(f"- **{item['work']}**")
            lines.append(f"  - Author: {item['author']}")
            lines.append(f"  - Source: {item['sourceUrl']}")
            lines.append(f"  - License: [{item['license']}]({item['licenseUrl']})")
        lines.append("")
    (ROOT / "CREDITS.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    ART.mkdir(parents=True, exist_ok=True)
    pages = build_pages()
    summary = []
    credit_rows = []
    for spec in PICTURES:
        print(f"tracing {spec['id']} ({spec['mode']})")
        traced = trace_page(
            pages[spec["id"]],
            spec["mode"],
            spec["min_area"],
            spec["max_count"],
            int(spec.get("colors", 8)),
        )
        payload = {
            "id": spec["id"],
            "pack": spec["pack"],
            "title": spec["title"],
            "caption": spec["caption"],
            "viewBox": traced["viewBox"],
            "regionStroke": traced["regionStroke"],
            "credits": [public_credit(item) for item in spec["credits"]],
            "regions": traced["regions"],
            "strokes": traced["strokes"],
            "clips": [],
        }
        if len(payload["regions"]) < 8:
            raise SystemExit(f"{spec['id']} only produced {len(payload['regions'])} regions")
        path = ART / f"{spec['id']}.json"
        path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
        write_preview(spec["id"], traced)
        print(f"  {len(payload['regions'])} regions, {path.stat().st_size} bytes")
        summary.append((spec["id"], len(payload["regions"])))
        credit_rows.append(
            {
                "pack": spec["pack"],
                "packName": "Taylor Swift" if spec["pack"] == "swift" else "Old Dominion",
                "title": spec["title"],
                "caption": spec["caption"],
                "credits": payload["credits"],
            }
        )
    write_credits(credit_rows)
    print("DONE", summary)


if __name__ == "__main__":
    main()
