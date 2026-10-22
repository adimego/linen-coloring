export function zoomAbout(
  tx: number,
  ty: number,
  scale: number,
  cx: number,
  cy: number,
  nextScale: number,
): { tx: number; ty: number; scale: number } {
  const clamped = Math.min(6, Math.max(1, nextScale));
  const wx = (cx - tx) / scale;
  const wy = (cy - ty) / scale;
  return { scale: clamped, tx: cx - wx * clamped, ty: cy - wy * clamped };
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

  private readonly onDown: (event: PointerEvent) => void;
  private readonly onMove: (event: PointerEvent) => void;
  private readonly onUp: (event: PointerEvent) => void;
  private readonly onWheel: (event: WheelEvent) => void;
  private readonly el: HTMLElement;
  private readonly target: SVGElement;
  private readonly onTap: (clientX: number, clientY: number) => void;

  constructor(el: HTMLElement, target: SVGElement, onTap: (clientX: number, clientY: number) => void) {
    this.el = el;
    this.target = target;
    this.onTap = onTap;
    this.onDown = (event) => this.down(event);
    this.onMove = (event) => this.move(event);
    this.onUp = (event) => this.up(event);
    this.onWheel = (event) => this.wheel(event);
    this.el.addEventListener("pointerdown", this.onDown);
    this.el.addEventListener("pointermove", this.onMove);
    this.el.addEventListener("pointerup", this.onUp);
    this.el.addEventListener("pointercancel", this.onUp);
    this.el.addEventListener("wheel", this.onWheel, { passive: false });
  }

  destroy(): void {
    this.el.removeEventListener("pointerdown", this.onDown);
    this.el.removeEventListener("pointermove", this.onMove);
    this.el.removeEventListener("pointerup", this.onUp);
    this.el.removeEventListener("pointercancel", this.onUp);
    this.el.removeEventListener("wheel", this.onWheel);
  }

  zoomBy(factor: number): void {
    const rect = this.el.getBoundingClientRect();
    const next = zoomAbout(this.tx, this.ty, this.scale, rect.width / 2, rect.height / 2, this.scale * factor);
    this.commit(next.tx, next.ty, next.scale);
  }

  reset(): void {
    this.tx = 0;
    this.ty = 0;
    this.scale = 1;
    this.apply();
  }

  private down(event: PointerEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest("button, a")) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    this.el.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    this.pointers.set(event.pointerId, point);
    this.maxPointers = Math.max(this.maxPointers, this.pointers.size);
    if (this.pointers.size === 1) {
      this.origin = point;
      this.last = point;
      this.moved = false;
      this.pinch = null;
    } else {
      this.pinching = true;
      this.moved = true;
      this.pinch = null;
    }
  }

  private move(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    event.preventDefault();
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) {
      this.pinchZoom();
      return;
    }
    if (this.pointers.size === 1 && this.last && this.origin) {
      const point = { x: event.clientX, y: event.clientY };
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;
      const traveled = Math.hypot(point.x - this.origin.x, point.y - this.origin.y);
      if (traveled > 12) this.moved = true;
      if (this.moved && this.scale > 1) {
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
    if (this.pointers.size === 0) {
      const tap = !this.moved && !this.pinching && this.maxPointers === 1 && point;
      this.maxPointers = 0;
      this.pinching = false;
      this.moved = false;
      this.origin = null;
      this.last = null;
      if (tap && point) this.onTap(point.x, point.y);
    }
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
    const next = Math.min(6, Math.max(1, this.pinch.scale * (dist / this.pinch.dist)));
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
    if (this.scale <= 1) {
      this.scale = 1;
      this.tx = 0;
      this.ty = 0;
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
