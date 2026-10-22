import { renderSvg } from "./render.ts";
import type { Picture } from "./pictures/types.ts";

export async function exportPng(picture: Picture, fills: Record<string, string>): Promise<void> {
  const done = picture.regions.every((region) => Boolean(fills[region.id]));
  const svg = renderSvg(picture, fills, { interactive: false, numbers: false, lines: !done, layout: "thumb" });
  const width = 960;
  const height = 1380;
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");
    ctx.fillStyle = "#fbf6f0";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Empty image"));
      }, "image/png");
    });
    await shareOrDownload(png, `linen-${picture.id}.png`, picture.title);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not draw the picture"));
    image.src = url;
  });
}

async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}
