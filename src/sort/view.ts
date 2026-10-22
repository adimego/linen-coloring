import type { Cue } from "../audio.ts";
import { icon } from "../icons.ts";
import {
  LEVEL_COUNT,
  cloneJars,
  isCompleteJar,
  isWon,
  levelById,
  pour,
  pourAmount,
  replay,
  solveMove,
  topRun,
  zenSpec,
  type Jar,
  type SortLevel,
  type SortStep,
} from "./logic.ts";
import { bitMarkup, toneName } from "./pieces.ts";
import { getSortLevel, isSortUnlocked, loadSort, putSortLevel, putZen, type SortLevelSave, type ZenSave } from "./save.ts";

export type SortCtx = {
  soundHtml: string;
  openSort: () => void;
  openLevel: (id: number) => void;
  openZen: () => void;
  back: () => void;
  say: (message: string) => void;
  cue: (kind: Cue) => void;
  haptic: () => void;
};

type WinAction = { label: string; primary?: boolean; run: () => void };

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

function pourCount(history: SortStep[]): number {
  return history.reduce((count, step) => count + (step.kind === "pour" ? 1 : 0), 0);
}

function twistNote(twists: SortLevel["twists"]): string {
  const parts: string[] = [];
  if (twists.includes("hidden")) parts.push("Buried pieces show when they reach the top");
  if (twists.includes("narrow")) parts.push("One vase is narrower");
  if (twists.includes("tall")) parts.push("One vase is taller");
  if (!parts.length) return "Pour a color onto the same color, or into an empty vase.";
  return `${parts.join(". ")}.`;
}

function jarWords(jar: Jar): string {
  if (!jar.slots.length) return "empty";
  return jar.slots.map((slot) => (slot.hidden ? "hidden" : toneName(slot.color))).join(", ");
}

export function renderSortHome(root: HTMLElement, ctx: SortCtx): () => void {
  const save = loadSort();
  let cleared = 0;
  let next = 0;
  for (let id = 1; id <= LEVEL_COUNT; id += 1) {
    const record = save.levels[String(id)];
    const won = Boolean(record?.won);
    if (won) cleared += 1;
    if (!next && (id === 1 || save.levels[String(id - 1)]?.won) && !won) next = id;
  }
  const buttons: string[] = [];
  for (let id = 1; id <= LEVEL_COUNT; id += 1) {
    const record = normalize(save.levels[String(id)]);
    const unlocked = id === 1 || Boolean(save.levels[String(id - 1)]?.won);
    const state = !unlocked ? "locked" : record.won ? "sorted" : record.history?.length ? "in progress" : "open";
    const mark = record.won ? " is-done" : record.history?.length ? " is-open" : "";
    buttons.push(
      `<button type="button" class="sort-level${mark}${next === id ? " is-next" : ""}" data-level="${id}" ${unlocked ? "" : "disabled"} aria-label="Table ${id}, ${state}">${id}</button>`,
    );
  }
  root.innerHTML = `
    <header class="top gallery-top">
      <div class="brand">
        <span class="mark" aria-hidden="true"></span>
        <div>
          <p class="eyebrow">Sort</p>
          <h1>Linen</h1>
        </div>
      </div>
      ${ctx.soundHtml}
    </header>
    <div class="modes" role="tablist" aria-label="Game">
      <button type="button" role="tab" data-mode="color" aria-selected="false">Color</button>
      <button type="button" role="tab" data-mode="match" aria-selected="false">Match</button>
      <button type="button" role="tab" data-mode="sort" aria-selected="true">Sort</button>
    </div>
    <main class="gallery">
      <p class="blurb">Tap a vase to lift its top color, then pour it onto a match or into an empty vase.</p>
      <button type="button" class="zen-entry" id="sort-zen">
        <span class="card-title">Zen Sort</span>
        <span class="caption">A new table whenever you want one.</span>
      </button>
      <p class="note">No clock and no way to lose. ${cleared} of ${LEVEL_COUNT} tables sorted.</p>
      <div class="sort-grid">${buttons.join("")}</div>
      <p class="install-note">Add Linen to your home screen to keep it offline.</p>
    </main>
    <p class="live" id="live" aria-live="polite"></p>
  `;
  root.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.level);
      if (id) ctx.openLevel(id);
    });
  });
  root.querySelector("#sort-zen")?.addEventListener("click", () => ctx.openZen());
  return () => {};
}

function normalize(record: SortLevelSave | undefined): SortLevelSave {
  if (!record) return { won: false, bestMoves: null, history: [] };
  return record;
}

export function renderSortLevel(root: HTMLElement, id: number, ctx: SortCtx): () => void {
  if (!isSortUnlocked(id)) return renderLocked(root, id, ctx);
  let level: SortLevel;
  try {
    level = levelById(id);
  } catch {
    return renderMissing(root, ctx);
  }
  const record = getSortLevel(id);
  let history = replay(level.jars, record.history) ? record.history : [];
  return mountTable(root, ctx, {
    eyebrow: `${level.colors} colors`,
    title: `Table ${id}`,
    backLabel: "Back to tables",
    base: level.jars,
    history,
    note: (steps) => {
      const latest = getSortLevel(id);
      const moves = pourCount(steps);
      const count = moves === 0 ? "Ready when you are." : `${moves} ${moves === 1 ? "pour" : "pours"}.`;
      const best = latest.bestMoves !== null ? ` Best is ${latest.bestMoves}.` : "";
      return `${count} ${twistNote(level.twists)}${best}`;
    },
    winActions: (moves) => {
      const actions: WinAction[] = [];
      if (id < LEVEL_COUNT) actions.push({ label: "Next", primary: true, run: () => ctx.openLevel(id + 1) });
      actions.push({ label: "Tables", primary: id === LEVEL_COUNT, run: () => ctx.openSort() });
      return { copy: `Sorted, in ${moves} ${moves === 1 ? "pour" : "pours"}.`, actions };
    },
    onCommit: (steps, boardWon) => {
      const prev = getSortLevel(id);
      const moves = pourCount(steps);
      const best = boardWon ? (prev.bestMoves === null ? moves : Math.min(prev.bestMoves, moves)) : prev.bestMoves;
      putSortLevel(id, { won: prev.won || boardWon, bestMoves: best, history: steps });
    },
  });
}

export function renderSortZen(root: HTMLElement, ctx: SortCtx): () => void {
  let saved = loadSort().zen ?? freshZen(0);
  let level = zenSpec(saved.index, saved.seed);
  let history = replay(level.jars, saved.history) ? saved.history : [];
  if (history !== saved.history) {
    saved = { ...saved, history };
    putZen(saved);
  }
  return mountTable(root, ctx, {
    eyebrow: "Zen Sort",
    title: `Table ${saved.index + 1}`,
    backLabel: "Back to Sort",
    base: level.jars,
    history,
    note: (steps) => {
      const moves = pourCount(steps);
      const count = moves === 0 ? "Stay as long as you like." : `${moves} ${moves === 1 ? "pour" : "pours"}.`;
      return `${count} ${twistNote(level.twists)}`;
    },
    winActions: (moves) => ({
      copy: `Sorted, in ${moves} ${moves === 1 ? "pour" : "pours"}.`,
      actions: [{ label: "Another table", primary: true, run: () => another() }],
    }),
    onCommit: (steps, boardWon) => {
      saved = { ...saved, history: steps, won: boardWon };
      putZen(saved);
    },
    onAnother: () => {
      const index = saved.index + 1;
      const seed = (Date.now() ^ Math.imul(index + 1, 997)) >>> 0;
      saved = { seed, index, history: [], won: false };
      level = zenSpec(index, seed);
      putZen(saved);
      return { base: level.jars, eyebrow: "Zen Sort", title: `Table ${index + 1}` };
    },
  });

  function another(): void {
    /* The button calls the table's own reset through onAnother. */
  }
}

function freshZen(index: number): ZenSave {
  const seed = (Date.now() ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  return { seed: seed || 1, index, history: [], won: false };
}

type TableSpec = {
  eyebrow: string;
  title: string;
  backLabel: string;
  base: Jar[];
  history: SortStep[];
  note: (history: SortStep[]) => string;
  winActions: (moves: number) => { copy: string; actions: WinAction[] };
  onCommit: (history: SortStep[], boardWon: boolean) => void;
  onAnother?: () => { base: Jar[]; eyebrow: string; title: string };
};

function mountTable(root: HTMLElement, ctx: SortCtx, spec: TableSpec): () => void {
  let base = cloneJars(spec.base);
  let history = spec.history.slice();
  let jars = replay(base, history) ?? cloneJars(base);
  let lifted: number | null = null;
  let busy = false;
  let generation = 0;
  let hintTimer = 0;
  const reduce = reducedMotion();

  root.innerHTML = `
    <header class="top gallery-top">
      <button type="button" class="icon-btn" id="sort-back" aria-label="${esc(spec.backLabel)}">${icon("back")}</button>
      <div class="title-block">
        <p class="eyebrow" id="sort-eyebrow">${esc(spec.eyebrow)}</p>
        <h1 id="sort-title">${esc(spec.title)}</h1>
      </div>
      ${ctx.soundHtml}
    </header>
    <p class="sort-note" id="sort-note"></p>
    <div class="sort-stage">
      <div class="vase-board" id="vase-board" role="group" aria-label="Vases"></div>
    </div>
    <div class="sort-done" id="sort-done" hidden>
      <p id="sort-done-copy"></p>
      <div class="sort-done-actions" id="sort-done-actions"></div>
    </div>
    <div class="dock">
      <div class="tools">
        <button type="button" class="tool" id="sort-undo">${icon("undo")}<span>Undo</span></button>
        <button type="button" class="tool" id="sort-restart">${icon("refresh")}<span>Again</span></button>
        <button type="button" class="tool" id="sort-hint">${icon("hint")}<span>Hint</span></button>
        <button type="button" class="tool" id="sort-extra" aria-label="Add an empty vase">${icon("plus")}<span>Vase</span></button>
      </div>
    </div>
    <div class="pour-layer" id="pour-layer"></div>
    <p class="live" id="live" aria-live="polite"></p>
  `;

  const board = must<HTMLElement>(root, "#vase-board");
  const note = must<HTMLElement>(root, "#sort-note");
  const done = must<HTMLElement>(root, "#sort-done");
  const layer = must<HTMLElement>(root, "#pour-layer");
  root.querySelector("#sort-back")?.addEventListener("click", () => ctx.back());
  board.addEventListener("click", (event) => {
    const vase = (event.target as Element | null)?.closest<HTMLButtonElement>(".vase");
    if (!vase) return;
    const index = Number(vase.dataset.jar);
    if (Number.isInteger(index)) void onTap(index);
  });
  must<HTMLButtonElement>(root, "#sort-undo").addEventListener("click", () => undo());
  must<HTMLButtonElement>(root, "#sort-restart").addEventListener("click", () => restart());
  must<HTMLButtonElement>(root, "#sort-hint").addEventListener("click", () => void hint());
  must<HTMLButtonElement>(root, "#sort-extra").addEventListener("click", () => addVase());

  paint();
  if (isWon(jars)) showWin(false);

  function alive(mark: number): boolean {
    return mark === generation;
  }

  function paint(splash?: { settleJar: number; settleCount: number; fresh: boolean[]; shown?: { jar: number; slot: number } }): void {
    const cols = jars.length <= 4 ? jars.length : Math.ceil(jars.length / 2);
    const bit = cols <= 3 ? 44 : cols === 4 ? 36 : cols === 5 ? 32 : 28;
    const width = cols <= 3 ? 62 : cols === 4 ? 52 : cols === 5 ? 46 : 40;
    board.style.setProperty("--cols", String(cols));
    board.style.setProperty("--bit-size", `${bit}px`);
    board.style.setProperty("--jar-size", `${width}px`);
    board.replaceChildren();
    jars.forEach((jar, index) => {
      const sealed = isCompleteJar(jar);
      const fresh = Boolean(splash?.fresh[index]);
      const narrow = jar.cap < 4;
      const tall = jar.cap > 4;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `vase${narrow ? " is-narrow" : ""}${tall ? " is-tall" : ""}${sealed ? " is-sealed" : ""}${fresh ? " is-fresh" : ""}`;
      button.dataset.jar = String(index);
      button.style.setProperty("--cap", String(jar.cap));
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `Vase ${index + 1} of ${jars.length}, ${jarWords(jar)}`);
      const glints = [0, 1, 2, 3, 4]
        .map((n) => {
          const angle = (-150 + n * 36) * (Math.PI / 180);
          const dx = Math.round(Math.cos(angle) * 22);
          const dy = Math.round(Math.sin(angle) * 20);
          return `<i class="glint" style="--dx:${dx}px;--dy:${dy}px;--delay:${n * 40}ms"></i>`;
        })
        .join("");
      const bits = jar.slots
        .map((slot, slotIndex) => {
          const settle = splash?.settleJar === index && slotIndex >= jar.slots.length - (splash?.settleCount ?? 0);
          const shown = splash?.shown?.jar === index && splash.shown.slot === slotIndex;
          return `<span class="bit${slot.hidden ? " is-hidden" : ""}${settle ? " is-settle" : ""}${shown ? " is-shown" : ""}" data-slot="${slotIndex}">${bitMarkup(slot.color, slot.hidden)}</span>`;
        })
        .join("");
      button.innerHTML = `<span class="glints" aria-hidden="true">${glints}</span><span class="lid" aria-hidden="true"></span><span class="mouth"></span><span class="glass"><span class="stack">${bits}</span></span><span class="foot"></span>`;
      board.append(button);
    });
    note.textContent = spec.note(history);
    const won = isWon(jars);
    const extra = history.some((step) => step.kind === "extra");
    must<HTMLButtonElement>(root, "#sort-undo").disabled = busy || history.length === 0;
    must<HTMLButtonElement>(root, "#sort-restart").disabled = busy;
    must<HTMLButtonElement>(root, "#sort-hint").disabled = busy || won;
    must<HTMLButtonElement>(root, "#sort-extra").disabled = busy || extra || won;
    if (!won) done.hidden = true;
    markLift();
  }

  function markLift(): void {
    board.querySelectorAll<HTMLButtonElement>(".vase").forEach((vase) => {
      const index = Number(vase.dataset.jar);
      const on = index === lifted;
      vase.classList.toggle("is-source", on);
      vase.setAttribute("aria-pressed", on ? "true" : "false");
      const stack = [...vase.querySelectorAll<HTMLElement>(".bit")];
      const run = on ? (topRun((jars[index]?.slots ?? []).map((slot) => slot.color))?.count ?? 0) : 0;
      stack.forEach((bit, indexInStack) => bit.classList.toggle("is-up", on && indexInStack >= stack.length - run));
    });
  }

  function clearLift(): void {
    lifted = null;
    markLift();
  }

  async function onTap(index: number): Promise<void> {
    if (busy || isWon(jars)) return;
    window.clearTimeout(hintTimer);
    board.querySelectorAll(".is-hint").forEach((node) => node.classList.remove("is-hint"));
    const jar = jars[index];
    if (!jar) return;
    if (lifted === null) {
      if (!jar.slots.length) {
        ctx.say("This vase is empty.");
        return;
      }
      lifted = index;
      markLift();
      const run = topRun(jar.slots.map((slot) => slot.color));
      ctx.say(run ? `${toneName(run.color)} lifted.` : "Lifted.");
      return;
    }
    if (lifted === index) {
      clearLift();
      ctx.say("Set back down.");
      return;
    }
    const amount = pourAmount(jars, lifted, index);
    if (!amount) {
      clearLift();
      ctx.say("Those don't pour together.");
      return;
    }
    const from = lifted;
    const mark = generation;
    busy = true;
    board.classList.add("is-busy");
    syncTools();
    await fly(from, index, amount);
    if (!alive(mark)) return;
    const before = jars.map((one) => isCompleteJar(one));
    const old = jars[from];
    const next = pour(jars, from, index);
    if (!next || !old) {
      busy = false;
      board.classList.remove("is-busy");
      clearLift();
      syncTools();
      return;
    }
    const shownIndex = next[from] && next[from].slots.length > 0 ? next[from].slots.length - 1 : -1;
    const shown = shownIndex >= 0 && old.slots[shownIndex]?.hidden ? { jar: from, slot: shownIndex } : undefined;
    history = [...history, { kind: "pour", from, to: index }];
    jars = next;
    lifted = null;
    const fresh = next.map((one, jarIndex) => isCompleteJar(one) && !before[jarIndex]);
    paint({ settleJar: index, settleCount: amount, fresh, shown });
    busy = false;
    board.classList.remove("is-busy");
    syncTools();
    ctx.haptic();
    const won = isWon(jars);
    ctx.cue("clink");
    if (fresh.some(Boolean) && !won) ctx.cue("sparkle");
    if (won) ctx.cue("win");
    spec.onCommit(history, won);
    note.textContent = spec.note(history);
    if (won) {
      showWin(true);
      ctx.say(`Sorted, in ${pourCount(history)} pours.`);
    } else {
      const run = topRun((jars[index]?.slots ?? []).map((slot) => slot.color));
      ctx.say(run ? `${toneName(run.color)} poured.` : "Poured.");
    }
  }

  async function fly(from: number, to: number, amount: number): Promise<void> {
    if (reduce) {
      board.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
      await wait(150);
      return;
    }
    const source = board.querySelector<HTMLElement>(`.vase[data-jar="${from}"] .stack`);
    const destGlass = board.querySelector<HTMLElement>(`.vase[data-jar="${to}"] .glass`);
    if (!source || !destGlass) return;
    const bits = [...source.querySelectorAll<HTMLElement>(".bit")];
    const moving = bits.slice(-amount);
    for (const bit of bits) {
      if (!moving.includes(bit)) bit.classList.remove("is-up");
    }
    const glassRect = destGlass.getBoundingClientRect();
    const destCount = jars[to]?.slots.length ?? 0;
    const flights: Promise<void>[] = [];
    layer.replaceChildren();
    moving.forEach((bit, index) => {
      const rect = bit.getBoundingClientRect();
      bit.style.visibility = "hidden";
      const clone = document.createElement("span");
      clone.className = "bit is-flight";
      clone.innerHTML = bit.innerHTML;
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      layer.append(clone);
      const endX = glassRect.left + (glassRect.width - rect.width) / 2;
      const endY = glassRect.bottom - 4 - (destCount + index + 1) * rect.height;
      const dx = endX - rect.left;
      const dy = endY - rect.top;
      const arc = -Math.min(96, 52 + Math.abs(dx) * 0.16);
      const anim = clone.animate(
        [
          { transform: "translate3d(0px, 0px, 0)" },
          { transform: `translate3d(${(dx * 0.5).toFixed(1)}px, ${(dy * 0.38 + arc).toFixed(1)}px, 0)`, offset: 0.55 },
          { transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)` },
        ],
        { duration: 420, delay: index * 42, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
      );
      flights.push(anim.finished.then(() => undefined).catch(() => undefined));
    });
    await Promise.all(flights);
    layer.replaceChildren();
  }

  function undo(): void {
    if (busy || !history.length) return;
    window.clearTimeout(hintTimer);
    history = history.slice(0, -1);
    jars = replay(base, history) ?? cloneJars(base);
    lifted = null;
    paint();
    spec.onCommit(history, isWon(jars));
    note.textContent = spec.note(history);
    ctx.say("Undone.");
  }

  function restart(): void {
    if (busy) return;
    window.clearTimeout(hintTimer);
    history = [];
    jars = cloneJars(base);
    lifted = null;
    paint();
    spec.onCommit(history, false);
    note.textContent = spec.note(history);
    ctx.say("The table is set again.");
  }

  function addVase(): void {
    if (busy || isWon(jars) || history.some((step) => step.kind === "extra")) return;
    clearLift();
    history = [...history, { kind: "extra" }];
    jars = replay(base, history) ?? jars;
    paint();
    spec.onCommit(history, false);
    note.textContent = spec.note(history);
    ctx.say("An empty vase is on the table.");
  }

  async function hint(): Promise<void> {
    if (busy || isWon(jars)) return;
    clearLift();
    const move = solveMove(jars);
    if (!move) {
      ctx.say("There is no pour from here.");
      return;
    }
    const mark = generation;
    await pulse(move.from, mark);
    if (!alive(mark)) return;
    await pulse(move.to, mark);
    if (!alive(mark)) return;
    const run = topRun((jars[move.from]?.slots ?? []).map((slot) => slot.color));
    const name = run ? toneName(run.color).toLowerCase() : "pieces";
    ctx.say(`Try the ${name}. The highlighted vases pour together.`);
  }

  function pulse(index: number, mark: number): Promise<void> {
    if (!alive(mark)) return Promise.resolve();
    board.querySelectorAll(".is-hint").forEach((node) => node.classList.remove("is-hint"));
    board.querySelector(`.vase[data-jar="${index}"]`)?.classList.add("is-hint");
    return new Promise((resolve) => {
      hintTimer = window.setTimeout(() => {
        if (alive(mark)) board.querySelector(`.vase[data-jar="${index}"]`)?.classList.remove("is-hint");
        resolve();
      }, reduce ? 180 : 720);
    });
  }

  function showWin(celebrate: boolean): void {
    const moves = pourCount(history);
    const plan = spec.winActions(moves);
    const copy = must<HTMLElement>(root, "#sort-done-copy");
    const actions = must<HTMLElement>(root, "#sort-done-actions");
    copy.textContent = plan.copy;
    actions.replaceChildren();
    for (const action of plan.actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      if (action.primary) button.className = "primary";
      button.addEventListener("click", () => action.run());
      actions.append(button);
    }
    done.hidden = false;
    if (!celebrate) return;
  }

  function syncTools(): void {
    const won = isWon(jars);
    const extra = history.some((step) => step.kind === "extra");
    must<HTMLButtonElement>(root, "#sort-undo").disabled = busy || history.length === 0;
    must<HTMLButtonElement>(root, "#sort-restart").disabled = busy;
    must<HTMLButtonElement>(root, "#sort-hint").disabled = busy || won;
    must<HTMLButtonElement>(root, "#sort-extra").disabled = busy || extra || won;
  }

  function applyAnother(next: { base: Jar[]; eyebrow: string; title: string }): void {
    base = cloneJars(next.base);
    history = [];
    jars = cloneJars(base);
    lifted = null;
    const eyebrow = root.querySelector("#sort-eyebrow");
    const title = root.querySelector("#sort-title");
    if (eyebrow) eyebrow.textContent = next.eyebrow;
    if (title) title.textContent = next.title;
    paint();
    ctx.say("A new table.");
  }

  if (spec.onAnother) {
    const reset = spec.onAnother;
    const win = spec.winActions;
    spec.winActions = (moves) => {
      const plan = win(moves);
      return {
        copy: plan.copy,
        actions: plan.actions.map((action) =>
          action.label === "Another table" ? { ...action, run: () => applyAnother(reset()) } : action,
        ),
      };
    };
  }

  return () => {
    generation += 1;
    window.clearTimeout(hintTimer);
    layer.replaceChildren();
  };
}

function renderLocked(root: HTMLElement, id: number, ctx: SortCtx): () => void {
  root.innerHTML = `
    <header class="top gallery-top">
      <button type="button" class="icon-btn" id="sort-back" aria-label="Back to tables">${icon("back")}</button>
      <div class="title-block">
        <p class="eyebrow">Sort</p>
        <h1>Table ${id}</h1>
      </div>
      ${ctx.soundHtml}
    </header>
    <main class="gallery">
      <div class="empty">
        <p>This table is still waiting.</p>
        <p>Sort table ${id - 1} and it will open. There is nothing to lose.</p>
      </div>
    </main>
    <p class="live" id="live" aria-live="polite"></p>
  `;
  root.querySelector("#sort-back")?.addEventListener("click", () => ctx.back());
  ctx.say(`Table ${id} opens after table ${id - 1}.`);
  return () => {};
}

function renderMissing(root: HTMLElement, ctx: SortCtx): () => void {
  root.innerHTML = `
    <header class="top gallery-top">
      <button type="button" class="icon-btn" id="sort-back" aria-label="Back to tables">${icon("back")}</button>
      <div class="title-block">
        <p class="eyebrow">Sort</p>
        <h1>Missing table</h1>
      </div>
      ${ctx.soundHtml}
    </header>
    <main class="gallery">
      <div class="empty">
        <p>That table is not on the list.</p>
        <p>The tables run from 1 to ${LEVEL_COUNT}.</p>
      </div>
    </main>
    <p class="live" id="live" aria-live="polite"></p>
  `;
  root.querySelector("#sort-back")?.addEventListener("click", () => ctx.back());
  return () => {};
}

function must<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node as T;
}
