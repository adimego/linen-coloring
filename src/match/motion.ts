/**
 * Calm match motion. Swaps, clears, and gravity run on transforms
 * (and the Web Animations API) so the board stays on the compositor.
 */
import type { CellPos, Frame, PieceAt } from "./logic.ts";

const SWAP_MS = 340;
const GLOW_MS = 280;
const POP_MS = 380;
const FALL_MS = 400;

export type MotionHost = {
  frame: HTMLElement;
  layer: HTMLElement;
  cols: number;
  rows: number;
  reduce: boolean;
  make: (piece: PieceAt) => HTMLElement;
  find: (id: number) => HTMLElement | null;
  locate: (r: number, c: number) => HTMLElement | null;
  place: (el: HTMLElement, piece: PieceAt) => void;
};

export async function slideSwap(host: MotionHost, a: CellPos, b: CellPos, forward: boolean): Promise<void> {
  const first = host.locate(a.r, a.c);
  const second = host.locate(b.r, b.c);
  if (!first || !second) return;
  if (host.reduce) {
    first.style.transform = "none";
    second.style.transform = "none";
    return;
  }
  const dx = ((b.c - a.c) / host.cols) * host.frame.clientWidth;
  const dy = ((b.r - a.r) / host.rows) * host.frame.clientHeight;
  const end = forward ? { x: dx, y: dy } : { x: 0, y: 0 };
  await Promise.all([
    glide(first, end.x, end.y),
    glide(second, -end.x, -end.y),
  ]);
}

export async function playCascade(
  host: MotionHost,
  frames: Frame[],
  hooks: {
    onCovers: (covers: number[][]) => void;
    chime: () => void;
    haptic: () => void;
    alive: () => boolean;
  },
): Promise<void> {
  for (const step of frames) {
    if (!hooks.alive()) return;
    const matched = step.cleared
      .map((cell) => host.find(cell.id))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);
    hooks.onCovers(step.covers);
    if (host.reduce) {
      for (const el of matched) {
        el.style.transition = "opacity 280ms linear";
        el.style.opacity = "0";
      }
      hooks.chime();
      hooks.haptic();
      await wait(280);
      if (!hooks.alive()) return;
      for (const el of matched) el.remove();
      snapFall(host, step.pieces);
      continue;
    }
    for (const el of matched) el.classList.add("is-glow");
    await wait(GLOW_MS);
    if (!hooks.alive()) return;
    hooks.chime();
    hooks.haptic();
    const pops = matched.map((el) => popPiece(host, el));
    await Promise.all(pops);
    if (!hooks.alive()) return;
    for (const el of matched) el.remove();
    host.layer.querySelectorAll(".spark").forEach((node) => node.remove());
    await fallIn(host, step.pieces);
  }
}

function snapFall(host: MotionHost, pieces: PieceAt[]): void {
  const seen = new Set<number>();
  for (const piece of pieces) {
    seen.add(piece.id);
    const existing = host.find(piece.id);
    if (!existing) {
      const el = host.make(piece);
      el.style.opacity = "0";
      host.layer.append(el);
      el.style.transition = "opacity 280ms linear";
      el.style.opacity = "1";
      continue;
    }
    host.place(existing, piece);
    existing.style.transform = "none";
  }
}

async function fallIn(host: MotionHost, pieces: PieceAt[]): Promise<void> {
  const cellW = host.frame.clientWidth / host.cols;
  const cellH = host.frame.clientHeight / host.rows;
  const jobs: Animation[] = [];
  for (const piece of pieces) {
    const existing = host.find(piece.id);
    const delay = Math.min(110, piece.r * 14 + piece.c * 8);
    if (!existing) {
      const el = host.make(piece);
      const fromY = -((piece.r + 1.2) * cellH);
      el.style.transform = `translate3d(0, ${fromY}px, 0)`;
      host.layer.append(el);
      jobs.push(land(el, 0, fromY, delay));
      continue;
    }
    const oldR = Number(existing.dataset.r);
    const oldC = Number(existing.dataset.c);
    if (oldR === piece.r && oldC === piece.c) continue;
    const dx = (oldC - piece.c) * cellW;
    const dy = (oldR - piece.r) * cellH;
    host.place(existing, piece);
    existing.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    jobs.push(land(existing, dx, dy, delay));
  }
  if (!jobs.length) return;
  await Promise.all(jobs.map((anim) => anim.finished.catch(() => undefined)));
  for (const piece of pieces) {
    const el = host.find(piece.id);
    if (!el) continue;
    el.style.transform = "none";
    el.getAnimations().forEach((anim) => anim.cancel());
  }
}

function land(el: HTMLElement, dx: number, dy: number, delay: number): Animation {
  return el.animate(
    [
      { transform: `translate3d(${dx}px, ${dy}px, 0)`, offset: 0 },
      { transform: "translate3d(0, -3px, 0)", offset: 0.82 },
      { transform: "translate3d(0, 0, 0)", offset: 1 },
    ],
    { duration: FALL_MS, delay, easing: "cubic-bezier(0.22, 0.8, 0.28, 1)", fill: "forwards" },
  );
}

async function glide(el: HTMLElement, x: number, y: number): Promise<void> {
  const from = el.style.transform && el.style.transform !== "none" ? el.style.transform : "translate3d(0, 0, 0)";
  const to = x === 0 && y === 0 ? "translate3d(0, 0, 0)" : `translate3d(${x}px, ${y}px, 0)`;
  const anim = el.animate(
    [{ transform: from }, { transform: to }],
    { duration: SWAP_MS, easing: "cubic-bezier(0.22, 0.72, 0.28, 1)", fill: "forwards" },
  );
  await anim.finished.catch(() => undefined);
  el.style.transform = to === "translate3d(0, 0, 0)" ? "none" : to;
  anim.cancel();
}

function popPiece(host: MotionHost, el: HTMLElement): Promise<void> {
  el.classList.remove("is-glow");
  el.classList.add("is-pop");
  burst(host, el);
  const anim = el.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1, offset: 0 },
      { transform: "translate3d(0, 0, 0) scale(1.16)", opacity: 1, offset: 0.36 },
      { transform: "translate3d(0, 0, 0) scale(1.28)", opacity: 0, offset: 1 },
    ],
    { duration: POP_MS, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "forwards" },
  );
  return anim.finished.then(() => undefined).catch(() => undefined);
}

function burst(host: MotionHost, el: HTMLElement): void {
  const color = el.style.background || "#f4c2d0";
  const r = Number(el.dataset.r);
  const c = Number(el.dataset.c);
  const x = ((c + 0.5) / host.cols) * host.frame.clientWidth;
  const y = ((r + 0.5) / host.rows) * host.frame.clientHeight;
  for (let i = 0; i < 6; i += 1) {
    const spark = document.createElement("i");
    spark.className = "spark";
    spark.style.background = color;
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    host.layer.append(spark);
    const angle = (Math.PI * 2 * i) / 6 + 0.35;
    const dist = 14 + (i % 3) * 6;
    spark.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0.95 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0.3)`,
          opacity: 0,
        },
      ],
      { duration: POP_MS, easing: "cubic-bezier(0.16, 0.7, 0.3, 1)", fill: "forwards" },
    );
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
