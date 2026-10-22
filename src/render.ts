import type { Picture } from "./pictures/types.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
export const PAPER = "#fbf6f0";
export const HIGHLIGHT = "#f8d5e0";
const LINE = "#e3d5db";
const INK = "#4e3a44";

export type RenderOptions = {
  interactive: boolean;
  numbers: boolean;
  lines: boolean;
  layout: "stage" | "thumb";
};

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | undefined>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) node.setAttribute(key, value);
  }
  return node;
}

export function referenceFills(picture: Picture): Record<string, string> {
  const fills: Record<string, string> = {};
  for (const region of picture.regions) fills[region.id] = picture.colors[region.n - 1] ?? PAPER;
  return fills;
}

export function renderSvg(picture: Picture, fills: Record<string, string>, opts: RenderOptions): SVGSVGElement {
  const svg = el("svg", {
    viewBox: picture.viewBox,
    xmlns: SVG_NS,
    role: opts.interactive ? "img" : "presentation",
    "aria-label": opts.interactive ? picture.title : undefined,
  });
  svg.classList.add(opts.layout === "stage" ? "stage-svg" : "thumb-svg");

  const box = picture.viewBox.split(/[\s,]+/);
  svg.append(el("rect", { width: box[2] ?? "320", height: box[3] ?? "460", fill: PAPER }));

  for (const region of picture.regions) {
    const color = fills[region.id] ?? PAPER;
    const path = el("path", {
      d: region.d,
      fill: color,
      stroke: opts.lines ? LINE : "none",
      "stroke-width": opts.lines ? "1.15" : undefined,
      "stroke-linejoin": "round",
      "vector-effect": opts.lines ? "non-scaling-stroke" : undefined,
      "fill-rule": region.evenodd ? "evenodd" : undefined,
    });
    path.classList.add("region");
    path.dataset.region = region.id;
    path.dataset.n = String(region.n);
    path.dataset.open = fills[region.id] ? "false" : "true";
    path.style.fill = color;
    svg.append(path);
  }

  if (opts.lines && picture.outline) {
    svg.append(
      el("path", {
        d: picture.outline,
        fill: "none",
        stroke: INK,
        "stroke-width": "2.35",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "vector-effect": "non-scaling-stroke",
        "pointer-events": "none",
        class: "ink",
      }),
    );
  }
  if (opts.lines) {
    for (const stroke of picture.ink) {
      svg.append(
        el("path", {
          d: stroke.d,
          fill: "none",
          stroke: INK,
          "stroke-width": String(Math.max(1.5, stroke.w * 1.15)),
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "vector-effect": "non-scaling-stroke",
          "pointer-events": "none",
          class: "ink",
        }),
      );
    }
  }

  if (opts.numbers) {
    for (const region of picture.regions) {
      if (!region.label) continue;
      const hint = el("text", {
        x: String(region.label[0]),
        y: String(region.label[1]),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-size": String(region.hintSize ?? 8),
        fill: "#6a4454",
        "font-family": "Nunito, sans-serif",
        "font-weight": "700",
        "pointer-events": "none",
      });
      hint.classList.add("hint");
      hint.dataset.hint = region.id;
      hint.dataset.open = fills[region.id] ? "false" : "true";
      hint.textContent = String(region.n);
      svg.append(hint);
    }
  }

  return svg;
}

export function setRegionFill(svg: SVGSVGElement, regionId: string, color: string | null): void {
  const path = svg.querySelector(`[data-region="${cssEscape(regionId)}"]`);
  if (!(path instanceof SVGPathElement)) return;
  const next = color ?? PAPER;
  path.setAttribute("fill", next);
  path.style.fill = next;
  path.dataset.open = color ? "false" : "true";
  path.classList.remove("hot");
  path.classList.remove("bloom");
  void path.getBoundingClientRect();
  path.classList.add("bloom");
  const hint = svg.querySelector(`[data-hint="${cssEscape(regionId)}"]`);
  if (hint) hint.setAttribute("data-open", color ? "false" : "true");
}

export function markHot(svg: SVGSVGElement, n: number): void {
  svg.querySelectorAll<SVGPathElement>(".region").forEach((path) => {
    const open = path.dataset.open === "true";
    const hot = open && path.dataset.n === String(n);
    path.classList.toggle("hot", hot);
    if (!open) return;
    const fill = hot ? HIGHLIGHT : PAPER;
    path.setAttribute("fill", fill);
    path.style.fill = fill;
  });
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && "escape" in CSS) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}
