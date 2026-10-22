import type { Cue } from "../audio.ts";
import { icon } from "../icons.ts";
import type { Picture } from "../pictures/types.ts";
import { referenceFills, renderSvg } from "../render.ts";
import { createBoard, findMove, listPieces, mulberry32, reshuffle, trySwap, type CellPos, type PieceAt } from "./logic.ts";
import { pieceByKind } from "./pieces.ts";

export type ZenCtx = {
  toolsHtml: string;
  back: () => void;
  say: (message: string) => void;
  cue: (kind: Cue) => void;
  haptic: () => void;
  picture: Picture | null;
};

const COLS = 7;
const ROWS = 8;
const HINT_MS = 4000;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function renderZen(root: HTMLElement, ctx: ZenCtx): () => void {
  const rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
  const mask = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => true));
  const cover = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
  const grid = createBoard({ mask, cover, kinds: 5 }, rng);
  let paused = false;
  let busy = false;
  let selected: CellPos | null = null;
  let hintTimer = 0;
  let pointer: { x: number; y: number; cell: CellPos } | null = null;
  let reveal = Boolean(ctx.picture);
  const reduce = reducedMotion();

  root.innerHTML = `
    <header class="top gallery-top">
      <button type="button" class="icon-btn" id="zen-back" aria-label="Back to Match">${icon("back")}</button>
      <div class="title-block">
        <p class="eyebrow">No levels</p>
        <h1>Zen</h1>
      </div>
      ${ctx.toolsHtml}
    </header>
    <p class="match-help">Swap pieces that touch. The board refills itself. Pause whenever you like.</p>
    <div class="zen-tools">
      <button type="button" class="text-link" id="zen-pause" aria-pressed="false">Pause</button>
      ${ctx.picture ? `<button type="button" class="text-link" id="zen-reveal" aria-pressed="true">Today's picture</button>` : ""}
    </div>
    <div class="match-stage">
      <div class="board-frame" style="--cols:${COLS};--rows:${ROWS};aspect-ratio:${COLS} / ${ROWS}">
        <div class="board-art zen-art${reveal ? " is-on" : ""}" id="zen-art"></div>
        <div class="board" id="zen-board" role="group" aria-label="Zen board"></div>
        <div class="pieces" id="zen-pieces"></div>
      </div>
    </div>
    <p class="live" id="live" aria-live="polite"></p>
  `;

  const frame = must(root, ".board-frame");
  const board = must(root, "#zen-board");
  const pieces = must(root, "#zen-pieces");
  const art = must(root, "#zen-art");
  board.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
  if (ctx.picture) {
    const svg = renderSvg(ctx.picture, referenceFills(ctx.picture), { interactive: false, numbers: false, lines: false, layout: "thumb" });
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    art.append(svg);
  }
  paintTiles();
  paintPieces(false);
  armHint();
  ctx.say("Zen is open. Match for as long as you like.");

  root.querySelector("#zen-back")?.addEventListener("click", () => ctx.back());
  root.querySelector("#zen-pause")?.addEventListener("click", () => {
    paused = !paused;
    const button = root.querySelector("#zen-pause");
    if (button) {
      button.textContent = paused ? "Resume" : "Pause";
      button.setAttribute("aria-pressed", paused ? "true" : "false");
    }
    art.classList.toggle("is-paused", paused);
    if (paused) clearHint();
    else armHint();
    ctx.say(paused ? "Paused." : "Resumed.");
  });
  root.querySelector("#zen-reveal")?.addEventListener("click", () => {
    reveal = !reveal;
    art.classList.toggle("is-on", reveal);
    const button = root.querySelector("#zen-reveal");
    button?.setAttribute("aria-pressed", reveal ? "true" : "false");
    ctx.say(reveal ? "Today's picture is fading in behind the pieces." : "The picture is hidden.");
  });

  board.addEventListener("pointerdown", (event) => {
    if (paused || busy || event.button !== 0) return;
    const cell = cellFrom(event.target);
    if (!cell) return;
    pointer = { x: event.clientX, y: event.clientY, cell };
    clearHint();
  });
  board.addEventListener("pointermove", (event) => {
    if (!pointer || paused || busy) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (Math.hypot(dx, dy) < 18) return;
    const next = neighbor(pointer.cell, dx, dy);
    const from = pointer.cell;
    pointer = null;
    if (next) void play(from, next);
  });
  board.addEventListener("pointerup", () => {
    if (!pointer || paused || busy) {
      pointer = null;
      return;
    }
    const cell = pointer.cell;
    pointer = null;
    choose(cell);
  });
  board.addEventListener("pointercancel", () => {
    pointer = null;
  });

  function paintTiles(): void {
    board.replaceChildren();
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "tile";
        tile.dataset.r = String(r);
        tile.dataset.c = String(c);
        tile.dataset.cover = "0";
        tile.setAttribute("aria-pressed", "false");
        tile.setAttribute("aria-label", label(r, c));
        board.append(tile);
      }
    }
  }

  function label(r: number, c: number): string {
    const name = pieceByKind(grid.piece[r]?.[c] ?? 0).name;
    return `${name}, row ${r + 1}, column ${c + 1}`;
  }

  function paintSelect(): void {
    board.querySelectorAll<HTMLElement>(".tile").forEach((tile) => {
      const on = Boolean(selected && Number(tile.dataset.r) === selected.r && Number(tile.dataset.c) === selected.c);
      tile.classList.toggle("is-selected", on);
      tile.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function posOf(r: number, c: number): { left: string; top: string; width: string; height: string } {
    return {
      left: `${((c + 0.15) / COLS) * 100}%`,
      top: `${((r + 0.15) / ROWS) * 100}%`,
      width: `${(0.7 / COLS) * 100}%`,
      height: `${(0.7 / ROWS) * 100}%`,
    };
  }

  function makePiece(piece: PieceAt): HTMLElement {
    const el = document.createElement("span");
    el.className = "piece";
    el.dataset.id = String(piece.id);
    el.dataset.r = String(piece.r);
    el.dataset.c = String(piece.c);
    const artPiece = pieceByKind(piece.kind);
    el.style.background = artPiece.disc;
    el.innerHTML = artPiece.svg;
    const pos = posOf(piece.r, piece.c);
    el.style.left = pos.left;
    el.style.top = pos.top;
    el.style.width = pos.width;
    el.style.height = pos.height;
    return el;
  }

  function paintPieces(fadeIn: boolean): void {
    pieces.replaceChildren();
    for (const piece of listPieces(grid)) pieces.append(makePiece(piece));
    if (!fadeIn) return;
    pieces.style.opacity = "0";
    window.requestAnimationFrame(() => {
      pieces.style.transition = reduce ? "none" : "opacity 280ms ease";
      pieces.style.opacity = "1";
    });
  }

  function pieceEl(id: number): HTMLElement | null {
    const node = pieces.querySelector(`[data-id="${id}"]`);
    return node instanceof HTMLElement ? node : null;
  }

  function cellFrom(target: EventTarget | null): CellPos | null {
    if (!(target instanceof Element)) return null;
    const tile = target.closest(".tile");
    if (!(tile instanceof HTMLElement)) return null;
    return { r: Number(tile.dataset.r), c: Number(tile.dataset.c) };
  }

  function neighbor(cell: CellPos, dx: number, dy: number): CellPos | null {
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const next = horizontal
      ? { r: cell.r, c: cell.c + (dx > 0 ? 1 : -1) }
      : { r: cell.r + (dy > 0 ? 1 : -1), c: cell.c };
    if (next.r < 0 || next.c < 0 || next.r >= ROWS || next.c >= COLS) return null;
    return next;
  }

  function choose(cell: CellPos): void {
    if (!selected) {
      selected = cell;
      paintSelect();
      return;
    }
    if (selected.r === cell.r && selected.c === cell.c) {
      selected = null;
      paintSelect();
      return;
    }
    const from = selected;
    selected = null;
    paintSelect();
    if (Math.abs(from.r - cell.r) + Math.abs(from.c - cell.c) !== 1) {
      selected = cell;
      paintSelect();
      return;
    }
    void play(from, cell);
  }

  async function glide(a: CellPos, b: CellPos, forward: boolean): Promise<void> {
    const first = pieces.querySelector(`[data-r="${a.r}"][data-c="${a.c}"]`);
    const second = pieces.querySelector(`[data-r="${b.r}"][data-c="${b.c}"]`);
    if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) return;
    const sign = forward ? 1 : -1;
    const dx = ((b.c - a.c) / COLS) * frame.clientWidth * sign;
    const dy = ((b.r - a.r) / ROWS) * frame.clientHeight * sign;
    const ms = reduce ? 0 : 160;
    for (const el of [first, second]) el.style.transition = ms ? `transform ${ms}ms ease` : "none";
    first.style.transform = forward ? `translate(${dx}px, ${dy}px)` : "none";
    second.style.transform = forward ? `translate(${-dx}px, ${-dy}px)` : "none";
    await wait(ms + 20);
  }

  async function play(a: CellPos, b: CellPos): Promise<void> {
    if (busy || paused) return;
    busy = true;
    clearHint();
    await glide(a, b, true);
    const frames = trySwap(grid, a, b, rng);
    if (!frames) {
      await glide(a, b, false);
      busy = false;
      armHint();
      return;
    }
    ctx.haptic();
    ctx.cue("match");
    const cleared = new Set(frames.flatMap((frameStep) => frameStep.cleared.map((cell) => cell.id)));
    for (const id of cleared) {
      const el = pieceEl(id);
      if (!el) continue;
      el.style.transition = reduce ? "none" : "transform 200ms ease, opacity 200ms ease";
      el.style.transform = "scale(0.5)";
      el.style.opacity = "0";
    }
    await wait(reduce ? 0 : 200);
    if (!findMove(grid)) {
      reshuffle(grid, rng);
      ctx.cue("shuffle");
      ctx.say("The pieces found a new arrangement.");
    }
    paintPieces(true);
    refreshLabels();
    busy = false;
    if (!paused) armHint();
  }

  function refreshLabels(): void {
    board.querySelectorAll<HTMLElement>(".tile").forEach((tile) => {
      tile.setAttribute("aria-label", label(Number(tile.dataset.r), Number(tile.dataset.c)));
    });
  }

  function clearHint(): void {
    window.clearTimeout(hintTimer);
    hintTimer = 0;
    board.querySelectorAll(".is-hint").forEach((tile) => tile.classList.remove("is-hint"));
  }

  function armHint(): void {
    clearHint();
    hintTimer = window.setTimeout(() => {
      if (paused || busy) return;
      const move = findMove(grid);
      if (!move) return;
      for (const cell of move) {
        board.querySelector(`[data-r="${cell.r}"][data-c="${cell.c}"]`)?.classList.add("is-hint");
      }
    }, HINT_MS);
  }

  return () => {
    clearHint();
  };
}

function must(root: ParentNode, selector: string): HTMLElement {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
  return node;
}
