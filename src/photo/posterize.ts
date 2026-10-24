import { pictureFromIndexed, SCALE, VH, VW } from "../daily/raster.ts";
import type { Picture } from "../pictures/types.ts";

type RGB = [number, number, number];

export function difficultyPlan(amount: number): { colors: number; maxRegions: number; smooth: number; label: string } {
  const t = Math.min(1, Math.max(0, amount));
  const colors = Math.round(12 + t * 12);
  const maxRegions = Math.round(80 + t * 120);
  const smooth = t < 0.34 ? 2 : t < 0.67 ? 1 : 0;
  const label = t < 0.34 ? "Fewer, larger regions" : t < 0.67 ? "A middle count of regions" : "More, smaller regions";
  return { colors, maxRegions, smooth, label };
}

export async function posterizeFile(file: File, amount: number, meta: { id: string; title: string }): Promise<Picture> {
  const bitmap = await bitmapFromFile(file);
  try {
    return posterizeBitmap(bitmap, amount, meta);
  } finally {
    bitmap.close();
  }
}

/** iOS gives HEIC from the library. Safari decodes it through an image when createImageBitmap rejects the file. */
async function bitmapFromFile(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      try {
        return await createImageBitmap(image, { imageOrientation: "from-image" });
      } catch {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx || canvas.width < 1 || canvas.height < 1) throw new Error("This photo could not be read.");
        ctx.drawImage(image, 0, 0);
        return await createImageBitmap(canvas);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This photo could not be read."));
    image.src = url;
  });
}

function posterizeBitmap(bitmap: ImageBitmap, amount: number, meta: { id: string; title: string }): Picture {
  const plan = difficultyPlan(amount);
  const width = VW * SCALE;
  const height = VH * SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser could not read the photo.");
  ctx.fillStyle = "#fbf6f0";
  ctx.fillRect(0, 0, width, height);
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const dw = bitmap.width * scale;
  const dh = bitmap.height * scale;
  ctx.drawImage(bitmap, (width - dw) / 2, (height - dh) / 2, dw, dh);
  const data = ctx.getImageData(0, 0, width, height).data;
  const palette = medianCut(data, plan.colors);
  let indexed = mapNearest(data, palette);
  for (let pass = 0; pass < plan.smooth; pass += 1) indexed = smoothIndexed(indexed, width, height);
  const { picture } = pictureFromIndexed(indexed, palette.map(hexOf), {
    id: meta.id,
    title: meta.title,
    caption: "Made on this phone from your photo. Nothing was uploaded.",
    category: "photo",
  }, plan.maxRegions);
  picture.credits = [
    {
      work: meta.title,
      author: "You",
      sourceUrl: "",
      license: "Your photo, turned into a coloring page on this device. Nothing was uploaded.",
      licenseUrl: "",
    },
  ];
  return picture;
}

function medianCut(data: Uint8ClampedArray, count: number): RGB[] {
  const samples: RGB[] = [];
  for (let i = 0; i < data.length; i += 32) {
    samples.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]);
  }
  if (!samples.length) return [[251, 246, 240]];
  let boxes: RGB[][] = [samples];
  while (boxes.length < count) {
    let best = -1;
    let bestRange = 12;
    let channel = 0;
    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index];
      if (!box || box.length < 2) continue;
      for (let ch = 0; ch < 3; ch += 1) {
        let min = 255;
        let max = 0;
        for (const pixel of box) {
          const value = pixel[ch] ?? 0;
          if (value < min) min = value;
          if (value > max) max = value;
        }
        const range = max - min;
        if (range > bestRange) {
          bestRange = range;
          best = index;
          channel = ch;
        }
      }
    }
    if (best < 0) break;
    const box = boxes[best];
    if (!box) break;
    const ch = channel;
    box.sort((a, b) => (a[ch] ?? 0) - (b[ch] ?? 0));
    const mid = Math.max(1, Math.floor(box.length / 2));
    boxes = boxes.flatMap((item, index) => (index === best ? [item.slice(0, mid), item.slice(mid)] : [item]));
  }
  return boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const pixel of box) {
      r += pixel[0];
      g += pixel[1];
      b += pixel[2];
    }
    const n = Math.max(1, box.length);
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
}

function mapNearest(data: Uint8ClampedArray, palette: RGB[]): Uint8Array {
  const indexed = new Uint8Array(data.length / 4);
  for (let i = 0; i < indexed.length; i += 1) {
    const offset = i * 4;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    let best = 0;
    let bestDist = Infinity;
    for (let p = 0; p < palette.length; p += 1) {
      const color = palette[p];
      if (!color) continue;
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }
    indexed[i] = best + 1;
  }
  return indexed;
}

function smoothIndexed(src: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(src.length);
  const counts = new Uint16Array(40);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      counts.fill(0);
      let best = src[y * width + x] ?? 1;
      let bestCount = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const value = src[yy * width + xx] ?? 1;
          if (value < 1 || value >= counts.length) continue;
          const next = (counts[value] ?? 0) + 1;
          counts[value] = next;
          if (next > bestCount) {
            bestCount = next;
            best = value;
          }
        }
      }
      out[y * width + x] = best;
    }
  }
  return out;
}

function hexOf(color: RGB): string {
  const part = (value: number) => value.toString(16).padStart(2, "0");
  return `#${part(color[0])}${part(color[1])}${part(color[2])}`;
}
