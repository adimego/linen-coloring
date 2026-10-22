import type { Cue } from "../audio.ts";
import { icon } from "../icons.ts";
import { getPicture } from "../pictures/index.ts";
import { referenceFills, renderSvg } from "../render.ts";
import {
  createLevelGrid,
  levelById,
  levels,
  type LevelDef,
} from "./levels.ts";
import {
  coverStats,
  findMove,
  isWon,
  listPieces,
  mulberry32,
  resolveAll,
  reshuffle,
  swapOnly,
  type CellPos,
  type Frame,
  type Grid,
  type PieceAt,
} from "./logic.ts";
import { playCascade, slideSwap } from "./motion.ts";
import { pieceByKind, veilMarkup } from "./pieces.ts";
import {
  applySnapshot,
  getLevel,
  isUnlocked,
  loadMatch,
  putLevel,
  snapshotFromGrid,
  snapshotProgress,
  type LevelSave,
} from "./save.ts";

export type MatchCtx = {
  soundHtml: string;
  openMatch: () => void;
  openLevel: (id: number) => void;
  back: () => void;
  openZen: () => void;
  say: (message: string) => void;
  cue: (kind: Cue) => void;
  haptic: () => void;
};

const HINT_MS = 4000;

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function renderMatchHome(root: HTMLElement, ctx: MatchCtx): () => void {
  const save = loadMatch();
  const cleared = levels.filter((level) => getLevel(save, level.id).won).length;
  const next = levels.find((level) => isUnlocked(save, level.id) && !getLevel(save, level.id).won);
  root.innerHTML = `
    <header class="top gallery-top">
      <div class="brand">
        <span class="mark" aria-hidden="true"></span>
        <div>
          <p class="eyebrow">Match three</p>
          <h1>Linen</h1>
        </div>
      </div>
      ${ctx.soundHtml}
    </header>
    <div class="modes" role="tablist" aria-label="Game">
      <button type="button" role="tab" data-mode="color" aria-selected="false">Color</button>
      <button type="button" role="tab" data-mode="match" aria-selected="true">Match</button>
      <button type="button" role="tab" data-mode="sort" aria-selected="false">Sort</button>
    </div>
    <main class="gallery">
      <p class="blurb">Swap pieces that touch. Three alike lift the leaves and uncover a picture.</p>
      <button type="button" class="zen-entry" id="zen-open">
        <span class="card-title">Zen</span>
        <span class="caption">Match with no levels, for as long as you like.</span>
      </button>
      <p class="note">No clock, no lives, and no way to lose. ${cleared} of ${levels.length} pictures clear.</p>
      <div class="level-grid">
        ${levels.map((level) => levelCard(level, save, next?.id === level.id)).join("")}
      </div>
      <p class="install-note">Add Linen to your home screen to keep it offline.</p>
    </main>
    <p class="live" id="live" aria-live="polite"></p>
  `;
  for (const level of levels) {
    const picture = getPicture(level.pictureId);
    const host = root.querySelector(`#level-thumb-${level.id}`);
    if (picture && host) {
      host.append(renderSvg(picture, referenceFills(picture), { interactive: false, numbers: false, lines: false, layout: "thumb" }));
    }
  }
  root.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.level);
      if (id) ctx.openLevel(id);
    });
  });
  root.querySelector("#zen-open")?.addEventListener("click", () => ctx.openZen());
  return () => {};
}

function levelCard(level: LevelDef, save: ReturnType<typeof loadMatch>, isNext: boolean): string {
  const record = getLevel(save, level.id);
  const unlocked = isUnlocked(save, level.id);
  const picture = getPicture(level.pictureId);
  const title = picture?.title ?? level.name;
  const progress = snapshotProgress(level, record.snapshot, record.won);
  const pct = progress.total ? Math.round((progress.clear / progress.total) * 100) : 0;
  const status = !unlocked
    ? `After level ${level.id - 1}`
    : record.snapshot
      ? `${progress.clear} of ${progress.total} clear`
      : record.won
        ? "Clear"
        : "Covered";
  const width = record.snapshot ? pct : record.won ? 100 : 0;
  return `
    <button type="button" class="level-card${record.won ? " is-done" : ""}${isNext ? " is-next" : ""}" data-level="${level.id}" ${unlocked ? "" : "disabled"} aria-label="Level ${level.id}, ${esc(level.name)}, ${esc(title)}, ${esc(status)}">
      <span class="thumb" id="level-thumb-${level.id}"></span>
      <span class="meta">
        <span class="meta-row">
          <span class="card-title">${level.id}. ${esc(level.name)}</span>
          ${record.won ? '<span class="seal">Clear</span>' : ""}
        </span>
        <span class="caption">${esc(title)}</span>
        <span class="bar" aria-hidden="true"><span style="width:${width}%"></span></span>
        <span class="count">${esc(status)}</span>
      </span>
    </button>
  `;
}

export function renderMatchLevel(root: HTMLElement, level: LevelDef, ctx: MatchCtx): () => void {
  const record = getLevel(loadMatch(), level.id);
  if (!isUnlocked(loadMatch(), level.id)) return renderLocked(root, level, ctx);
  if (record.pendingReveal && record.won) return renderReveal(root, level, ctx, record.bestMoves ?? 0);
  return renderBoard(root, level, ctx, record);
}

function renderLocked(root: HTMLElement, level: LevelDef, ctx: MatchCtx): () => void {
  root.innerHTML = `
    <header class="top gallery-top">
      <button type="button" class="icon-btn" id="match-back" aria-label="Back to levels">${icon("back")}</button>
      <div class="title-block">
        <p class="eyebrow">Level ${level.id}</p>
        <h1>${esc(level.name)}</h1>
      </div>
      ${ctx.soundHtml}
    </header>
    <main class="gallery">
      <div class="empty">
        <p>This picture is still waiting.</p>
        <p>Clear level ${level.id - 1} and it will open. There is nothing to lose.</p>
      </div>
    </main>
    <p class="live" id="live" aria-live="polite"></p>
  `;
  root.querySelector("#match-back")?.addEventListener("click", () => ctx.back());
  ctx.say(`Level ${level.id} opens after level ${level.id - 1}.`);
  return () => {};
}

function renderReveal(root: HTMLElement, level: LevelDef, ctx: MatchCtx, moves: number): () => void {
  root.innerHTML = shell(level, ctx, "The picture is clear.");
  hidePlayChrome(root);
  const stage = root.querySelector("#match-stage");
  stage?.append(revealBlock(level, moves));
  bindReveal(root, level, ctx);
  return () => {};
}

function renderBoard(root: HTMLElement, level: LevelDef, ctx: MatchCtx, record: LevelSave): () => void {
  let seed = record.snapshot?.seed ?? level.seed;
  let grid = createLevelGrid(level, seed);
  if (record.snapshot && !applySnapshot(grid, record.snapshot)) {
    seed = level.seed;
    grid = createLevelGrid(level, seed);
  }
  let moves = record.snapshot?.moves ?? 0;
  let busy = false;
  let won = false;
  let selected: CellPos | null = null;
  let hintTimer = 0;
  let token = 0;
  let pointer: { x: number; y: number; cell: CellPos; id: number } | null = null;
  let dragged = false;
  const reduce = reducedMotion();

  const picture = getPicture(level.pictureId);
  root.innerHTML = shell(level, ctx, statusLine(grid, moves));
  const stage = must<HTMLElement>(root, "#match-stage");
  const frame = document.createElement("div");
  frame.className = "board-frame";
  frame.style.setProperty("--cols", String(grid.cols));
  frame.style.setProperty("--rows", String(grid.rows));
  frame.style.aspectRatio = `${grid.cols} / ${grid.rows}`;
  frame.innerHTML = `<div class="board-art" id="board-art"></div><div class="board" id="board" role="group" aria-label="Match board"></div><div class="pieces" id="pieces"></div>`;
  const again = document.createElement("button");
  again.type = "button";
  again.className = "text-link match-again";
  again.id = "match-again";
  again.textContent = "Lay the pieces again";
  stage.append(frame, again);
  const art = must<HTMLElement>(frame, "#board-art");
  if (picture) {
    const svg = renderSvg(picture, referenceFills(picture), { interactive: false, numbers: false, lines: false, layout: "thumb" });
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    art.append(svg);
  }
  const board = must<HTMLElement>(frame, "#board");
  const pieces = must<HTMLElement>(frame, "#pieces");
  board.style.gridTemplateColumns = `repeat(${grid.cols}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${grid.rows}, 1fr)`;
  paintTiles();
  paintPieces(false);
  paintMeter();
  armHint();

  function alive(): boolean {
    return token === 0;
  }

  async function pause(ms: number): Promise<boolean> {
    const mark = token;
    await wait(reduce ? 0 : ms);
    return mark === token;
  }

  function paintTiles(): void {
    board.replaceChildren();
    for (let r = 0; r < grid.rows; r += 1) {
      for (let c = 0; c < grid.cols; c += 1) {
        const hole = !grid.mask[r]?.[c];
        const tile = document.createElement(hole ? "div" : "button");
        tile.className = hole ? "tile is-hole" : "tile";
        tile.dataset.r = String(r);
        tile.dataset.c = String(c);
        if (!hole && tile instanceof HTMLButtonElement) {
          tile.type = "button";
          tile.dataset.cover = String(grid.cover[r]?.[c] ?? 1);
          tile.dataset.piece = String(grid.piece[r]?.[c] ?? 0);
          tile.innerHTML = `<span class="veil">${veilMarkup(grid.cover[r]?.[c] ?? 1)}</span>`;
          tile.setAttribute("aria-pressed", "false");
          tile.setAttribute("aria-label", tileLabel(r, c));
        }
        board.append(tile);
      }
    }
  }

  function tileLabel(r: number, c: number): string {
    const kind = grid.piece[r]?.[c] ?? 0;
    const name = pieceByKind(kind).name;
    const cover = grid.cover[r]?.[c] ?? 0;
    const veil = cover >= 2 ? "two layers of leaves" : cover === 1 ? "covered" : "clear";
    return `${name}, ${veil}, row ${r + 1}, column ${c + 1}`;
  }

  function paintMeter(): void {
    const stats = coverStats(grid);
    const status = root.querySelector("#match-status");
    if (status) status.textContent = statusLine(grid, moves);
    const bar = root.querySelector<HTMLElement>("#match-bar");
    if (bar) bar.style.width = `${stats.total ? Math.round((stats.clear / stats.total) * 100) : 0}%`;
    board.querySelectorAll<HTMLElement>(".tile:not(.is-hole)").forEach((tile) => {
      const r = Number(tile.dataset.r);
      const c = Number(tile.dataset.c);
      const cover = grid.cover[r]?.[c] ?? 0;
      tile.dataset.cover = String(cover);
      tile.dataset.piece = String(grid.piece[r]?.[c] ?? -1);
      const veil = tile.querySelector(".veil");
      if (veil) veil.innerHTML = veilMarkup(cover);
      tile.setAttribute("aria-label", tileLabel(r, c));
    });
  }

  function paintSelect(): void {
    board.querySelectorAll<HTMLElement>(".tile").forEach((tile) => {
      const on = Boolean(selected && Number(tile.dataset.r) === selected.r && Number(tile.dataset.c) === selected.c);
      tile.classList.toggle("is-selected", on);
      if (tile instanceof HTMLButtonElement) tile.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function posOf(r: number, c: number): { left: string; top: string; width: string; height: string } {
    return {
      left: `${((c + 0.15) / grid.cols) * 100}%`,
      top: `${((r + 0.15) / grid.rows) * 100}%`,
      width: `${(0.7 / grid.cols) * 100}%`,
      height: `${(0.7 / grid.rows) * 100}%`,
    };
  }

  function makePiece(piece: PieceAt): HTMLElement {
    const el = document.createElement("span");
    el.className = "piece";
    el.dataset.id = String(piece.id);
    el.dataset.r = String(piece.r);
    el.dataset.c = String(piece.c);
    el.dataset.kind = String(piece.kind);
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
    pieces.style.opacity = fadeIn ? "0" : "1";
    if (fadeIn) {
      window.requestAnimationFrame(() => {
        pieces.style.transition = reduce ? "none" : "opacity 280ms ease";
        pieces.style.opacity = "1";
      });
    }
  }

  function pieceEl(id: number): HTMLElement | null {
    const node = pieces.querySelector(`[data-id="${id}"]`);
    return node instanceof HTMLElement ? node : null;
  }

  function commitPositions(): void {
    for (const piece of listPieces(grid)) {
      const el = pieceEl(piece.id) ?? makePiece(piece);
      if (!el.parentElement) pieces.append(el);
      const pos = posOf(piece.r, piece.c);
      el.dataset.r = String(piece.r);
      el.dataset.c = String(piece.c);
      el.dataset.kind = String(piece.kind);
      el.style.transition = "none";
      el.style.transform = "none";
      el.style.left = pos.left;
      el.style.top = pos.top;
    }
  }

  function motionHost() {
    return {
      frame,
      layer: pieces,
      cols: grid.cols,
      rows: grid.rows,
      reduce,
      make: makePiece,
      find: pieceEl,
      locate: (r: number, c: number) => {
        const node = pieces.querySelector(`[data-r="${r}"][data-c="${c}"]`);
        return node instanceof HTMLElement ? node : null;
      },
      place: (el: HTMLElement, piece: PieceAt) => {
        const pos = posOf(piece.r, piece.c);
        el.dataset.r = String(piece.r);
        el.dataset.c = String(piece.c);
        el.dataset.kind = String(piece.kind);
        el.style.left = pos.left;
        el.style.top = pos.top;
      },
    };
  }

  function applyCovers(covers: number[][]): void {
    for (let r = 0; r < grid.rows; r += 1) {
      for (let c = 0; c < grid.cols; c += 1) grid.cover[r][c] = covers[r]?.[c] ?? grid.cover[r][c];
    }
    paintMeter();
  }

  async function animateFrames(frames: Frame[]): Promise<void> {
    await playCascade(motionHost(), frames, {
      onCovers: applyCovers,
      chime: () => ctx.cue("match"),
      haptic: () => ctx.haptic(),
      alive,
    });
  }

  function remember(pendingReveal: boolean): void {
    const prev = getLevel(loadMatch(), level.id);
    const finished = prev.won || isWon(grid);
    let best = prev.bestMoves;
    if (isWon(grid)) best = best == null ? moves : Math.min(best, moves);
    putLevel(level.id, {
      won: finished,
      bestMoves: best,
      pendingReveal,
      snapshot: pendingReveal || isWon(grid) ? null : snapshotFromGrid(grid, moves, seed),
    });
  }

  async function showWin(): Promise<void> {
    won = true;
    clearHint();
    ctx.cue("win");
    ctx.haptic();
    frame.classList.add("is-won");
    hidePlayChrome(root);
    remember(true);
    if (!(await pause(380))) return;
    frame.hidden = true;
    again.hidden = true;
    root.querySelector("#match-back")?.removeEventListener("click", onBack);
    const reveal = revealBlock(level, moves);
    stage.append(reveal);
    bindReveal(root, level, ctx);
    const status = root.querySelector("#match-status");
    if (status) status.textContent = "The picture is clear.";
    ctx.say(`${picture?.title ?? level.name} is clear.`);
  }

  async function playSwap(a: CellPos, b: CellPos): Promise<void> {
    if (busy || won || !alive()) return;
    if (!grid.mask[b.r]?.[b.c]) {
      armHint();
      return;
    }
    busy = true;
    board.setAttribute("aria-busy", "true");
    selected = null;
    paintSelect();
    clearHint();
    await slideSwap(motionHost(), a, b, true);
    if (!alive()) return;
    const rng = mulberry32((seed + moves * 10007 + 17) >>> 0);
    if (!swapOnly(grid, a, b)) {
      await slideSwap(motionHost(), a, b, false);
      busy = false;
      board.setAttribute("aria-busy", "false");
      armHint();
      return;
    }
    commitPositions();
    const frames = resolveAll(grid, rng);
    moves += 1;
    const finished = isWon(grid);
    remember(finished);
    await animateFrames(frames);
    if (!alive()) return;
    paintMeter();
    if (finished) {
      await showWin();
      busy = false;
      board.setAttribute("aria-busy", "false");
      return;
    }
    if (!findMove(grid)) {
      ctx.say("No swaps left. The pieces are drifting into a new pattern.");
      ctx.cue("shuffle");
      pieces.style.transition = reduce ? "none" : "opacity 240ms ease";
      pieces.style.opacity = "0";
      if (!(await pause(240))) return;
      const shuffleRng = mulberry32((seed + 333 + moves * 17) >>> 0);
      reshuffle(grid, shuffleRng);
      paintPieces(true);
      paintMeter();
      remember(false);
    } else {
      remember(false);
      const cleared = frames.reduce((sum, frameStep) => sum + frameStep.cleared.length, 0);
      ctx.say(cleared >= 4 ? "A little more of the picture." : "The leaves lifted.");
    }
    busy = false;
    board.setAttribute("aria-busy", "false");
    armHint();
  }

  function clearHint(): void {
    window.clearTimeout(hintTimer);
    hintTimer = 0;
    board.querySelectorAll(".is-hint").forEach((node) => node.classList.remove("is-hint"));
  }

  function armHint(): void {
    clearHint();
    if (won) return;
    hintTimer = window.setTimeout(() => {
      if (busy || won || !alive()) return;
      const move = findMove(grid);
      if (!move) return;
      for (const cell of move) {
        board.querySelector(`.tile[data-r="${cell.r}"][data-c="${cell.c}"]`)?.classList.add("is-hint");
      }
      ctx.say("A pair is glowing.");
    }, HINT_MS);
  }

  function tileFrom(event: Event): HTMLElement | null {
    const target = event.target instanceof Element ? event.target.closest(".tile") : null;
    if (target instanceof HTMLElement && !target.classList.contains("is-hole")) return target;
    return null;
  }

  function onDown(event: PointerEvent): void {
    if (busy || won || event.button !== 0) return;
    const tile = tileFrom(event);
    if (!tile) return;
    clearHint();
    pointer = {
      x: event.clientX,
      y: event.clientY,
      cell: { r: Number(tile.dataset.r), c: Number(tile.dataset.c) },
      id: event.pointerId,
    };
    dragged = false;
    frame.setPointerCapture(event.pointerId);
  }

  function onMove(event: PointerEvent): void {
    if (!pointer || dragged || busy || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (Math.hypot(dx, dy) < 18) return;
    dragged = true;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const next = {
      r: pointer.cell.r + (horizontal ? 0 : Math.sign(dy)),
      c: pointer.cell.c + (horizontal ? Math.sign(dx) : 0),
    };
    const from = pointer.cell;
    pointer = null;
    void playSwap(from, next);
  }

  function onUp(event: PointerEvent): void {
    if (!pointer || event.pointerId !== pointer.id) return;
    const from = pointer.cell;
    pointer = null;
    if (dragged || busy) return;
    const tile = tileFrom(event);
    const here = tile ? { r: Number(tile.dataset.r), c: Number(tile.dataset.c) } : from;
    if (selected && Math.abs(selected.r - here.r) + Math.abs(selected.c - here.c) === 1) {
      const previous = selected;
      selected = null;
      paintSelect();
      void playSwap(previous, here);
      return;
    }
    selected = selected && selected.r === here.r && selected.c === here.c ? null : here;
    paintSelect();
    armHint();
  }

  frame.addEventListener("pointerdown", onDown);
  frame.addEventListener("pointermove", onMove);
  frame.addEventListener("pointerup", onUp);
  frame.addEventListener("pointercancel", () => {
    pointer = null;
  });
  frame.addEventListener("contextmenu", (event) => event.preventDefault());
  again.addEventListener("click", () => {
    if (busy || won) return;
    seed = (level.seed + Math.floor(Math.random() * 50000) + 3) >>> 0;
    grid = createLevelGrid(level, seed);
    moves = 0;
    selected = null;
    paintTiles();
    paintPieces(false);
    paintMeter();
    remember(false);
    armHint();
    ctx.say("A fresh scattering of pieces.");
  });
  const onBack = (): void => ctx.back();
  root.querySelector("#match-back")?.addEventListener("click", onBack);

  board.setAttribute("aria-busy", "false");
  if (!findMove(grid)) {
    const shuffleRng = mulberry32((seed + 91) >>> 0);
    reshuffle(grid, shuffleRng);
    paintPieces(false);
    remember(false);
  }

  return () => {
    token += 1;
    window.clearTimeout(hintTimer);
  };
}

function hidePlayChrome(root: HTMLElement): void {
  const help = root.querySelector(".match-help");
  const meter = root.querySelector(".match-meter");
  if (help instanceof HTMLElement) help.hidden = true;
  if (meter instanceof HTMLElement) meter.hidden = true;
}

function shell(level: LevelDef, ctx: MatchCtx, status: string): string {
  const extra = level.doubles ? " A few tiles wear two layers." : "";
  return `
    <header class="top gallery-top">
      <button type="button" class="icon-btn" id="match-back" aria-label="Back to levels">${icon("back")}</button>
      <div class="title-block">
        <p class="eyebrow">Level ${level.id}</p>
        <h1>${esc(level.name)}</h1>
      </div>
      ${ctx.soundHtml}
    </header>
    <p class="match-help">Swipe two neighbors. Three of a kind clears the cover beneath them.${extra} Take as many swaps as you like.</p>
    <div class="match-meter">
      <p id="match-status">${esc(status)}</p>
      <span class="bar" aria-hidden="true"><span id="match-bar"></span></span>
    </div>
    <div class="match-stage" id="match-stage"></div>
    <p class="live" id="live" aria-live="polite"></p>
  `;
}

function statusLine(grid: Grid, moves: number): string {
  const stats = coverStats(grid);
  const left = stats.total - stats.clear;
  const cover = left === 0 ? "The picture is clear" : left === 1 ? "1 tile still covered" : `${left} tiles still covered`;
  return `${cover} · ${moves} ${moves === 1 ? "swap" : "swaps"}`;
}

function revealBlock(level: LevelDef, moves: number): HTMLElement {
  const picture = getPicture(level.pictureId);
  const section = document.createElement("section");
  section.className = "reveal";
  section.id = "reveal";
  const next = levelById(level.id + 1);
  section.innerHTML = `
    <p class="reveal-kicker">Clear</p>
    <div class="reveal-art" id="reveal-art"></div>
    <h2>${esc(picture?.title ?? level.name)}</h2>
    <p class="reveal-caption">${esc(picture?.caption ?? "")}</p>
    <p class="reveal-moves">${moves} ${moves === 1 ? "swap" : "swaps"}, and all the time you wanted.</p>
    <div class="reveal-actions">
      ${next ? `<button type="button" class="primary" id="match-next">Next picture</button>` : ""}
      <button type="button" class="secondary" id="match-levels">All levels</button>
    </div>
  `;
  const host = section.querySelector("#reveal-art");
  if (picture && host) {
    const svg = renderSvg(picture, referenceFills(picture), { interactive: false, numbers: false, lines: false, layout: "thumb" });
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    host.append(svg);
  }
  return section;
}

function bindReveal(root: HTMLElement, level: LevelDef, ctx: MatchCtx): void {
  const dismiss = (): void => {
    const prev = getLevel(loadMatch(), level.id);
    putLevel(level.id, { ...prev, pendingReveal: false });
  };
  root.querySelector("#match-next")?.addEventListener("click", () => {
    dismiss();
    ctx.openLevel(level.id + 1);
  });
  root.querySelector("#match-levels")?.addEventListener("click", () => {
    dismiss();
    ctx.openMatch();
  });
  root.querySelector("#match-back")?.addEventListener("click", () => {
    dismiss();
    ctx.back();
  });
}

function must<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node as T;
}
