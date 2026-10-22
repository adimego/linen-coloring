import type { Picture } from "./pictures/types.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
export const PAPER = "#fbf6f0";
export const INK = "#4a3f48";

export type RenderOptions = {
  interactive: boolean;
  hints: boolean;
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

export function renderSvg(picture: Picture, fills: Record<string, string>, opts: RenderOptions): SVGSVGElement {
  const svg = el("svg", {
    viewBox: picture.viewBox,
    xmlns: SVG_NS,
    role: opts.interactive ? "img" : "presentation",
    "aria-label": opts.interactive ? picture.title : undefined,
  });
  svg.classList.add(opts.layout === "stage" ? "stage-svg" : "thumb-svg");
  if (opts.hints) svg.classList.add("hints-on");

  svg.append(el("rect", { width: "320", height: "460", fill: PAPER }));

  if (picture.clips.length) {
    const defs = el("defs", {});
    for (const clip of picture.clips) {
      const clipPath = el("clipPath", { id: `${picture.id}-${clip.id}` });
      clipPath.append(el("path", { d: clip.d }));
      defs.append(clipPath);
    }
    svg.append(defs);
  }

  const paintStroke = (d: string, w: number, transform?: string, fill?: string) => {
    const node = el("path", {
      d,
      transform,
      fill: fill ?? "none",
      stroke: fill ? "none" : INK,
      "stroke-width": fill ? undefined : String(w),
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "pointer-events": "none",
    });
    node.classList.add("ink");
    return node;
  };

  for (const stroke of picture.strokes) {
    if (stroke.layer === "under") svg.append(paintStroke(stroke.d, stroke.w, stroke.transform, stroke.fill));
  }

  for (const region of picture.regions) {
    const color = fills[region.id] ?? PAPER;
    const path = el("path", {
      d: region.d,
      fill: color,
      stroke: INK,
      "stroke-width": "1.5",
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      "fill-rule": region.evenodd ? "evenodd" : undefined,
      transform: region.transform,
      "clip-path": region.clipId ? `url(#${picture.id}-${region.clipId})` : undefined,
    });
    path.classList.add("region");
    path.dataset.region = region.id;
    path.dataset.open = fills[region.id] ? "false" : "true";
    path.style.fill = color;
    svg.append(path);

    if (region.label && opts.interactive) {
      const hint = el("text", {
        x: String(region.label[0]),
        y: String(region.label[1]),
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-size": String(region.hintSize ?? 8),
        fill: "#7a5364",
        "font-family": "Nunito, sans-serif",
        "font-weight": "700",
        "pointer-events": "none",
      });
      hint.classList.add("hint");
      hint.textContent = String(region.n);
      svg.append(hint);
    }
  }

  for (const stroke of picture.strokes) {
    if (stroke.layer !== "under") svg.append(paintStroke(stroke.d, stroke.w, stroke.transform, stroke.fill));
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
  path.classList.remove("bloom");
  void path.getBoundingClientRect();
  path.classList.add("bloom");
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && "escape" in CSS) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}
