export function zoomAbout(
  tx: number,
  ty: number,
  scale: number,
  cx: number,
  cy: number,
  nextScale: number,
  minScale = 1,
): { tx: number; ty: number; scale: number } {
  const clamped = Math.min(6, Math.max(minScale, nextScale));
  const wx = (cx - tx) / scale;
  const wy = (cy - ty) / scale;
  return { scale: clamped, tx: cx - wx * clamped, ty: cy - wy * clamped };
}

const FIT_MARGIN = 8;
const PALM_MS = 450;

let activePens = 0;
let palmUntil = 0;

/** True while a pen is down, and briefly after it lifts, so a palm does not tap. */
export function penIsBlocking(): boolean {
  return activePens > 0 || performance.now() < palmUntil;
}

function notePen(event: PointerEvent): void {
  if (event.pointerType !== "pen") return;
  if (event.type === "pointerdown") {
    activePens += 1;
    palmUntil = Number.POSITIVE_INFINITY;
    return;
  }
  if (event.type === "pointerup" || event.type === "pointercancel") {
    activePens = Math.max(0, activePens - 1);
    if (activePens === 0) palmUntil = performance.now() + PALM_MS;
  }
}

let palmInstalled = false;

/** Drop palm touches for the whole page while a pen is in use. */
export function installPalmRejection(): void {
  if (palmInstalled) return;
  palmInstalled = true;
  const block = (event: PointerEvent) => {
    notePen(event);
    if (event.pointerType === "touch" && penIsBlocking()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  document.addEventListener("pointerdown", block, true);
  document.addEventListener("pointermove", block, true);
  document.addEventListener("pointerup", block, true);
  document.addEventListener("pointercancel", block, true);
}

/** Visible band for the picture: below the top chrome and header, above the toolbar. */
export function visibleFrame(input: {
  safeTop: number;
  safeBottom: number;
  safeLeft: number;
  safeRight: number;
  offsetTop: number;
  rootTop: number;
  viewWidth: number;
  viewHeight: number;
  headerBottom: number;
  dockTop: number;
}): { top: number; left: number; right: number; bottom: number } {
  const unaccountedTop = Math.max(0, input.offsetTop + input.rootTop);
  const top = Math.max(input.safeTop, unaccountedTop, input.headerBottom, 0);
  const bottom = Math.min(input.viewHeight - input.safeBottom, input.dockTop);
  const left = Math.max(input.safeLeft, 0);
  const right = input.viewWidth - Math.max(input.safeRight, 0);
  return { top, left, right, bottom: Math.max(top + 1, bottom) };
}

/** Scale and center the viewBox picture inside a band. Transform origin is the box top-left. */
export function fitTransform(input: {
  boxWidth: number;
  boxHeight: number;
  boxLeft: number;
  boxTop: number;
  bandLeft: number;
  bandTop: number;
  bandRight: number;
  bandBottom: number;
  vbWidth: number;
  vbHeight: number;
}): { tx: number; ty: number; scale: number } {
  const left = input.bandLeft + FIT_MARGIN;
  const top = input.bandTop + FIT_MARGIN;
  const right = input.bandRight - FIT_MARGIN;
  const bottom = input.bandBottom - FIT_MARGIN;
  const availW = Math.max(1, right - left);
  const availH = Math.max(1, bottom - top);
  const contain = Math.min(input.boxWidth / input.vbWidth, input.boxHeight / input.vbHeight) || 1;
  const localW = input.vbWidth * contain;
  const localH = input.vbHeight * contain;
  const localX = (input.boxWidth - localW) / 2;
  const localY = (input.boxHeight - localH) / 2;
  const scale = Math.min(6, Math.max(0.2, Math.min(availW / localW, availH / localH)));
  const targetLeft = left + (availW - localW * scale) / 2;
  const targetTop = top + (availH - localH * scale) / 2;
  return {
    scale,
    tx: targetLeft - input.boxLeft - localX * scale,
    ty: targetTop - input.boxTop - localY * scale,
  };
}

function safeInset(edge: "top" | "right" | "bottom" | "left"): number {
  const probe = document.getElementById("linen-safe-probe") ?? document.createElement("div");
  if (!probe.isConnected) {
    probe.id = "linen-safe-probe";
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
    document.body.append(probe);
  }
  const value = getComputedStyle(probe).getPropertyValue(`padding-${edge}`);
  return Number.parseFloat(value) || 0;
}

type Point = { x: number; y: number };

/**
 * One finger taps. One finger pans once zoomed in.
 * Two fingers pinch-zoom around the midpoint. Wheel zooms too.
 */
export class GestureController {
  private tx = 0;
  private ty = 0;
  private scale = 1;
  private pointers = new Map<number, Point>();
  private moved = false;
  private pinching = false;
  private maxPointers = 0;
  private origin: Point | null = null;
  private last: Point | null = null;
  private pinch: { dist: number; scale: number; wx: number; wy: number } | null = null;
  private fitScale = 1;
  private fitTx = 0;
  private fitTy = 0;
  private fitFrame = 0;
  private fittedKey = "";
  private observer: ResizeObserver | null = null;

  private readonly onDown: (event: PointerEvent) => void;
  private readonly onMove: (event: PointerEvent) => void;
  private readonly onUp: (event: PointerEvent) => void;
  private readonly onWheel: (event: WheelEvent) => void;
  private readonly onRefit: () => void;
  private readonly el: HTMLElement;
  private readonly target: SVGElement;
  private readonly onTap: (clientX: number, clientY: number, phase: "down" | "move" | "up") => void;

  constructor(el: HTMLElement, target: SVGElement, onTap: (clientX: number, clientY: number, phase: "down" | "move" | "up") => void) {
    this.el = el;
    this.target = target;
    this.onTap = onTap;
    this.onDown = (event) => this.down(event);
    this.onMove = (event) => this.move(event);
    this.onUp = (event) => this.up(event);
    this.onWheel = (event) => this.wheel(event);
    this.onRefit = () => {
      if (this.pointers.size > 0) return;
      if (this.fitFrame) return;
      this.fitFrame = window.requestAnimationFrame(() => {
        this.fitFrame = 0;
        this.fit();
      });
    };
    this.el.addEventListener("pointerdown", this.onDown);
    this.el.addEventListener("pointermove", this.onMove);
    this.el.addEventListener("pointerup", this.onUp);
    this.el.addEventListener("pointercancel", this.onUp);
    this.el.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("resize", this.onRefit);
    window.addEventListener("orientationchange", this.onRefit);
    window.visualViewport?.addEventListener("resize", this.onRefit);
    window.visualViewport?.addEventListener("scroll", this.onRefit);
    this.observer = new ResizeObserver(() => this.onRefit());
    this.observer.observe(this.el);
    const dock = this.el.closest(".app")?.querySelector(".dock");
    if (dock) this.observer.observe(dock);
    this.fit();
  }

  destroy(): void {
    if (this.fitFrame) window.cancelAnimationFrame(this.fitFrame);
    this.el.removeEventListener("pointerdown", this.onDown);
    this.el.removeEventListener("pointermove", this.onMove);
    this.el.removeEventListener("pointerup", this.onUp);
    this.el.removeEventListener("pointercancel", this.onUp);
    this.el.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("resize", this.onRefit);
    window.removeEventListener("orientationchange", this.onRefit);
    window.visualViewport?.removeEventListener("resize", this.onRefit);
    window.visualViewport?.removeEventListener("scroll", this.onRefit);
    this.observer?.disconnect();
    this.observer = null;
    this.placeShell(true);
  }

  zoomBy(factor: number): void {
    const rect = this.el.getBoundingClientRect();
    const next = zoomAbout(this.tx, this.ty, this.scale, rect.width / 2, rect.height / 2, this.scale * factor, this.fitScale);
    this.commit(next.tx, next.ty, next.scale);
  }

  /** Fit the whole picture between the top bar and the palette. */
  reset(): void {
    this.fittedKey = "";
    this.fit();
  }

  fit(): void {
    this.placeShell(false);
    const svg = this.target;
    if (!(svg instanceof SVGSVGElement)) return;
    const box = this.el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    const vv = window.visualViewport;
    const header = this.el.closest(".app")?.querySelector("header.top");
    const dock = this.el.closest(".app")?.querySelector(".dock");
    const dockRect = dock?.getBoundingClientRect();
    const viewHeight = vv?.height ?? window.innerHeight;
    const dockBelow = !dockRect || dockRect.top >= box.top + Math.min(80, box.height * 0.35);
    const frame = visibleFrame({
      safeTop: safeInset("top"),
      safeBottom: safeInset("bottom"),
      safeLeft: safeInset("left"),
      safeRight: safeInset("right"),
      offsetTop: vv?.offsetTop ?? 0,
      rootTop: document.documentElement.getBoundingClientRect().top,
      viewWidth: vv?.width ?? window.innerWidth,
      viewHeight,
      headerBottom: header?.getBoundingClientRect().bottom ?? 0,
      dockTop: dockBelow ? (dockRect?.top ?? viewHeight) : viewHeight,
    });
    const vb = svg.viewBox.baseVal;
    const next = fitTransform({
      boxWidth: box.width,
      boxHeight: box.height,
      boxLeft: box.left,
      boxTop: box.top,
      bandLeft: Math.max(frame.left, box.left),
      bandTop: Math.max(frame.top, box.top),
      bandRight: Math.min(frame.right, box.right),
      bandBottom: Math.min(frame.bottom, box.bottom),
      vbWidth: vb.width || 320,
      vbHeight: vb.height || 460,
    });
    const key = [
      Math.round(box.width),
      Math.round(box.height),
      Math.round(frame.top),
      Math.round(frame.bottom),
      Math.round(frame.left),
      Math.round(frame.right),
    ].join(":");
    if (key === this.fittedKey) return;
    this.fittedKey = key;
    this.fitScale = next.scale;
    this.fitTx = next.tx;
    this.fitTy = next.ty;
    this.tx = next.tx;
    this.ty = next.ty;
    this.scale = next.scale;
    svg.style.transition = "none";
    this.apply();
  }

  private placeShell(clear: boolean): void {
    const app = this.el.closest(".app");
    if (!(app instanceof HTMLElement)) return;
    if (clear) {
      app.style.height = "";
      app.style.transform = "";
      return;
    }
    const vv = window.visualViewport;
    const top = vv?.offsetTop ?? 0;
    const height = vv?.height ?? window.innerHeight;
    app.style.height = `${Math.round(height)}px`;
    app.style.transform = top ? `translateY(${top}px)` : "";
  }

  /** Zoom so a viewBox point sits in the middle of the viewport. */
  focus(vx: number, vy: number, nextScale = 2.75): void {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const svg = this.target;
    if (!(svg instanceof SVGSVGElement)) return;
    svg.style.transition = "none";
    svg.style.transform = "none";
    const rect = this.el.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const fit = Math.min(svgRect.width / vb.width, svgRect.height / vb.height) || 1;
    const localX = (svgRect.width - vb.width * fit) / 2 + (vx - vb.x) * fit;
    const localY = (svgRect.height - vb.height * fit) / 2 + (vy - vb.y) * fit;
    this.scale = Math.min(6, Math.max(1.4, nextScale));
    this.tx = rect.width / 2 - localX * this.scale;
    this.ty = rect.height / 2 - localY * this.scale;
    this.clamp();
    if (!reduce) svg.style.transition = "transform 420ms cubic-bezier(0.22, 0.7, 0.3, 1)";
    this.apply();
    window.setTimeout(() => {
      svg.style.transition = "";
    }, reduce ? 0 : 460);
  }

  private down(event: PointerEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest("button, a")) return;
    if (event.pointerType === "touch" && penIsBlocking()) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    try {
      this.el.setPointerCapture(event.pointerId);
    } catch {
      /* The pointer is already gone, or this event was synthesized. */
    }
    const point = { x: event.clientX, y: event.clientY };
    this.pointers.set(event.pointerId, point);
    this.maxPointers = Math.max(this.maxPointers, this.pointers.size);
    if (event.pointerType === "pen" || this.pointers.size === 1) {
      this.origin = point;
      this.last = point;
      this.moved = false;
      this.pinch = null;
      this.paint(event, "down");
      return;
    }
    this.pinching = true;
    this.moved = true;
    this.pinch = null;
  }

  private move(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    if (event.pointerType === "touch" && penIsBlocking()) return;
    event.preventDefault();
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (event.pointerType === "pen") {
      this.paint(event, "move");
      return;
    }
    if (this.pointers.size === 2 && !this.penDown()) {
      this.pinchZoom();
      return;
    }
    if (this.pointers.size === 1 && this.last && this.origin) {
      const point = { x: event.clientX, y: event.clientY };
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;
      const traveled = Math.hypot(point.x - this.origin.x, point.y - this.origin.y);
      if (traveled > 12) this.moved = true;
      if (this.moved && this.scale > this.fitScale + 0.02) {
        this.tx += dx;
        this.ty += dy;
        this.clamp();
        this.apply();
      }
      this.last = point;
    }
  }

  private up(event: PointerEvent): void {
    const point = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (event.pointerType === "pen") this.paint(event, "up");
    if (this.pointers.size === 0) {
      const tap = !this.moved && !this.pinching && this.maxPointers === 1 && point && event.pointerType !== "pen";
      this.maxPointers = 0;
      this.pinching = false;
      this.moved = false;
      this.origin = null;
      this.last = null;
      if (tap && point) this.onTap(point.x, point.y, "up");
    }
  }

  private penDown(): boolean {
    return activePens > 0;
  }

  private paint(event: PointerEvent, phase: "down" | "move" | "up"): void {
    const coalesced = phase === "move" && typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
    const points = coalesced.length ? coalesced : [event];
    for (const point of points) this.onTap(point.clientX, point.clientY, phase);
  }

  private pinchZoom(): void {
    const pts = [...this.pointers.values()];
    const a = pts[0];
    const b = pts[1];
    if (!a || !b) return;
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const rect = this.el.getBoundingClientRect();
    const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
    if (!this.pinch) {
      this.pinch = {
        dist,
        scale: this.scale,
        wx: (mid.x - this.tx) / this.scale,
        wy: (mid.y - this.ty) / this.scale,
      };
    }
    const next = Math.min(6, Math.max(this.fitScale, this.pinch.scale * (dist / this.pinch.dist)));
    this.scale = next;
    this.tx = mid.x - this.pinch.wx * next;
    this.ty = mid.y - this.pinch.wy * next;
    this.clamp();
    this.apply();
  }

  private wheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.el.getBoundingClientRect();
    const next = zoomAbout(
      this.tx,
      this.ty,
      this.scale,
      event.clientX - rect.left,
      event.clientY - rect.top,
      this.scale * (event.deltaY > 0 ? 0.92 : 1.08),
      this.fitScale,
    );
    this.commit(next.tx, next.ty, next.scale);
  }

  private commit(tx: number, ty: number, scale: number): void {
    this.tx = tx;
    this.ty = ty;
    this.scale = scale;
    this.clamp();
    this.apply();
  }

  private clamp(): void {
    if (this.scale <= this.fitScale + 0.001) {
      this.scale = this.fitScale;
      this.tx = this.fitTx;
      this.ty = this.fitTy;
      return;
    }
    const rect = this.el.getBoundingClientRect();
    const slack = 36;
    const minX = rect.width * (1 - this.scale) - slack;
    const minY = rect.height * (1 - this.scale) - slack;
    this.tx = Math.min(slack, Math.max(minX, this.tx));
    this.ty = Math.min(slack, Math.max(minY, this.ty));
  }

  private apply(): void {
    this.target.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
  }
}
