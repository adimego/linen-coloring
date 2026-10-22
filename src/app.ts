import { Ambience } from "./audio.ts";
import { exportPng } from "./exportPng.ts";
import { GestureController } from "./gestures.ts";
import { icon } from "./icons.ts";
import { getPicture, packs, picturesIn } from "./pictures/index.ts";
import { paletteById, palettes } from "./pictures/palettes.ts";
import type { PackId, Picture } from "./pictures/types.ts";
import { renderSvg, setRegionFill } from "./render.ts";
import {
  applyFill,
  applyRedo,
  applyUndo,
  filledCount,
  isComplete,
  loadSave,
  pictureSave,
  selectedColor,
  writeSave,
  type Filter,
  type SaveData,
} from "./state.ts";

function pictureIdFromHash(): string | null {
  const match = /^#p=([a-z0-9-]+)$/.exec(location.hash);
  return match?.[1] ?? null;
}

function haptic(): void {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* This browser does not vibrate. */
  }
}

export class App {
  private save: SaveData;
  private readonly audio = new Ambience();
  private gestures: GestureController | null = null;
  private viewCleanups: Array<() => void> = [];
  private wasComplete = false;
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.save = loadSave();
    if (this.save.pack !== "swift" && this.save.pack !== "dominion") this.save.pack = "swift";
    this.installHistory();
    this.armSound();
    this.render();
  }

  private installHistory(): void {
    const hash = location.hash;
    const base = location.pathname + location.search;
    if (hash.startsWith("#p=")) {
      history.replaceState({ view: "gallery" }, "", base);
      history.pushState({ view: "color" }, "", hash);
    } else {
      history.replaceState({ view: "gallery" }, "", base || "./");
    }
    window.addEventListener("popstate", () => this.render());
  }

  private armSound(): void {
    const arm = () => {
      if (this.save.sound) this.audio.start();
      window.removeEventListener("pointerdown", arm);
    };
    window.addEventListener("pointerdown", arm);
  }

  private cleanupView(): void {
    this.gestures?.destroy();
    this.gestures = null;
    for (const fn of this.viewCleanups) fn();
    this.viewCleanups = [];
  }

  private render(): void {
    this.cleanupView();
    const picture = this.currentPicture();
    if (picture) this.renderStudio(picture);
    else this.renderGallery();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", picture ? "#f6efe8" : "#f6d0dc");
  }

  private currentPicture(): Picture | undefined {
    const id = pictureIdFromHash();
    if (!id) return undefined;
    const picture = getPicture(id);
    if (!picture) {
      history.replaceState({ view: "gallery" }, "", location.pathname + location.search);
      return undefined;
    }
    return picture;
  }

  private renderGallery(): void {
    const pack = packs.find((item) => item.id === this.save.pack) ?? packs[0];
    const inPack = picturesIn(pack.id);
    const finishedCount = inPack.filter((picture) => isComplete(picture, this.save)).length;
    const visible = inPack.filter((picture) => this.save.filter === "all" || isComplete(picture, this.save));

    this.root.className = "app is-gallery";
    this.root.innerHTML = `
      <header class="top gallery-top">
        <div class="brand">
          <span class="mark" aria-hidden="true"></span>
          <div>
            <p class="eyebrow">Quiet coloring</p>
            <h1>Linen</h1>
          </div>
        </div>
        ${this.soundButton()}
      </header>
      <main class="gallery">
        <div class="pack-switch" role="tablist" aria-label="Theme packs">
          ${packs
            .map(
              (item) => `
            <button type="button" role="tab" data-pack="${item.id}" aria-selected="${item.id === pack.id}">
              ${item.name}
            </button>`,
            )
            .join("")}
        </div>
        <p class="blurb">${pack.blurb}</p>
        <p class="note">Original line art inspired by the mood of each — no portraits, logos, or lyrics.</p>
        <div class="filters" role="group" aria-label="Show">
          <button type="button" data-filter="all" aria-pressed="${this.save.filter === "all"}">All</button>
          <button type="button" data-filter="finished" aria-pressed="${this.save.filter === "finished"}">Finished${finishedCount ? ` · ${finishedCount}` : ""}</button>
        </div>
        ${
          visible.length
            ? `<div class="grid">${visible.map((picture) => this.card(picture)).join("")}</div>`
            : `<div class="empty"><p>Nothing finished yet.</p><p>Color every region of a picture and it will wait here.</p></div>`
        }
        <p class="install-note">Add Linen to your home screen to keep coloring offline.</p>
      </main>
      <p class="live" id="live" aria-live="polite"></p>
    `;

    for (const picture of visible) {
      const host = this.root.querySelector(`#thumb-${picture.id}`);
      host?.append(
        renderSvg(picture, pictureSave(this.save, picture.id).fills, {
          interactive: false,
          hints: false,
          layout: "thumb",
        }),
      );
    }

    this.root.querySelectorAll<HTMLButtonElement>("[data-pack]").forEach((button) => {
      button.addEventListener("click", () => {
        const packId = button.dataset.pack;
        if (packId !== "swift" && packId !== "dominion") return;
        this.setPack(packId);
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter === "finished" ? "finished" : "all";
        this.setFilter(filter);
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>(".card").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        if (id) this.open(id);
      });
    });
    this.bindSound();
  }

  private card(picture: Picture): string {
    const total = picture.regions.length;
    const filled = filledCount(picture, this.save);
    const done = filled === total;
    const pct = Math.round((filled / total) * 100);
    return `
      <button type="button" class="card${done ? " is-done" : ""}" data-id="${picture.id}" aria-label="${picture.title}, ${filled} of ${total} regions${done ? ", finished" : ""}">
        <span class="thumb" id="thumb-${picture.id}"></span>
        <span class="meta">
          <span class="meta-row">
            <span class="card-title">${picture.title}</span>
            ${done ? '<span class="seal">Finished</span>' : ""}
          </span>
          <span class="caption">${picture.caption}</span>
          <span class="bar" aria-hidden="true"><span style="width:${pct}%"></span></span>
          <span class="count">${filled} of ${total}</span>
        </span>
      </button>
    `;
  }

  private renderStudio(picture: Picture): void {
    const data = pictureSave(this.save, picture.id);
    const palette = paletteById(this.save.paletteId);
    const filled = filledCount(picture, this.save);
    this.wasComplete = filled === picture.regions.length;
    this.root.className = `app is-studio${this.save.tool === "erase" ? " is-erasing" : ""}${this.save.hints ? " show-hints" : ""}`;
    this.root.innerHTML = `
      <header class="top">
        <button type="button" class="icon-btn" id="back" aria-label="Back to gallery">${icon("back")}</button>
        <div class="title-block">
          <h1>${picture.title}</h1>
          <p id="progress">${filled} of ${picture.regions.length}</p>
        </div>
        <div class="top-actions">
          <button type="button" class="icon-btn" id="undo" aria-label="Undo"${data.undo.length ? "" : " disabled"}>${icon("undo")}</button>
          <button type="button" class="icon-btn" id="redo" aria-label="Redo"${data.redo.length ? "" : " disabled"}>${icon("redo")}</button>
          <button type="button" class="icon-btn" id="export" aria-label="Save PNG">${icon("download")}</button>
          ${this.soundButton()}
        </div>
      </header>
      <div class="studio">
        <div class="viewport" id="viewport">
          <div class="done" id="done"${this.wasComplete ? "" : " hidden"}>
            <p>Finished. It's saved in your gallery.</p>
            <button type="button" id="done-export">Save PNG</button>
          </div>
        </div>
        <div class="dock">
          <div class="tools">
            <button type="button" class="tool" id="eraser" aria-pressed="${this.save.tool === "erase"}">${icon("eraser")}<span>Erase</span></button>
            <button type="button" class="tool" id="hints" aria-pressed="${this.save.hints}">${icon("hint")}<span>Numbers</span></button>
            <button type="button" class="tool icon-only" id="zoom-out" aria-label="Zoom out">${icon("minus")}</button>
            <button type="button" class="tool icon-only" id="zoom-in" aria-label="Zoom in">${icon("plus")}</button>
            <button type="button" class="tool" id="zoom-fit" aria-label="Fit picture">${icon("fit")}<span>Fit</span></button>
          </div>
          <div class="palette-wrap">
            <div class="palette-pop" id="palette-pop" hidden>
              ${palettes
                .map(
                  (item) => `
                <button type="button" class="palette-option" data-palette="${item.id}" aria-pressed="${item.id === palette.id}">
                  <span>${item.name}</span>
                  <span class="dots">${item.colors.map((color) => `<i style="background:${color}"></i>`).join("")}</span>
                </button>`,
                )
                .join("")}
            </div>
            <button type="button" class="palette-btn" id="palette-btn" aria-expanded="false" aria-controls="palette-pop">${palette.name} palette</button>
          </div>
          <div class="swatches" id="swatches" role="listbox" aria-label="Colors"></div>
        </div>
      </div>
      <p class="live" id="live" aria-live="polite"></p>
    `;

    const viewport = this.must("#viewport");
    const svg = renderSvg(picture, data.fills, { interactive: true, hints: this.save.hints, layout: "stage" });
    viewport.prepend(svg);
    this.gestures = new GestureController(viewport, svg, (x, y) => this.tap(picture, x, y));
    this.paintSwatches();
    this.bindStudio(picture);
    this.bindSound();
  }

  private soundButton(): string {
    const on = this.save.sound;
    return `<button type="button" class="icon-btn sound-btn" id="sound" aria-pressed="${on}" aria-label="${on ? "Turn sound off" : "Play soft sound"}">${icon(on ? "sound" : "mute")}</button>`;
  }

  private bindSound(): void {
    this.must<HTMLButtonElement>("#sound").addEventListener("click", () => {
      this.save.sound = !this.save.sound;
      writeSave(this.save);
      if (this.save.sound) this.audio.start();
      else this.audio.stop();
      const button = this.must<HTMLButtonElement>("#sound");
      button.setAttribute("aria-pressed", String(this.save.sound));
      button.setAttribute("aria-label", this.save.sound ? "Turn sound off" : "Play soft sound");
      button.innerHTML = icon(this.save.sound ? "sound" : "mute");
      this.say(this.save.sound ? "Soft sound on." : "Sound off.");
    });
  }

  private bindStudio(picture: Picture): void {
    this.must("#back").addEventListener("click", () => history.back());
    this.must("#undo").addEventListener("click", () => this.step(picture, "undo"));
    this.must("#redo").addEventListener("click", () => this.step(picture, "redo"));
    this.must("#export").addEventListener("click", () => void this.savePng(picture));
    this.must("#done-export").addEventListener("click", () => void this.savePng(picture));
    this.must("#eraser").addEventListener("click", () => {
      this.save.tool = this.save.tool === "erase" ? "fill" : "erase";
      writeSave(this.save);
      this.root.classList.toggle("is-erasing", this.save.tool === "erase");
      this.syncTools();
      this.say(this.save.tool === "erase" ? "Eraser." : "Brush.");
    });
    this.must("#hints").addEventListener("click", () => {
      this.save.hints = !this.save.hints;
      writeSave(this.save);
      this.root.classList.toggle("show-hints", this.save.hints);
      this.root.querySelector(".stage-svg")?.classList.toggle("hints-on", this.save.hints);
      this.syncTools();
      this.say(this.save.hints ? "Numbers on." : "Numbers off.");
    });
    this.must("#zoom-in").addEventListener("click", () => this.gestures?.zoomBy(1.25));
    this.must("#zoom-out").addEventListener("click", () => this.gestures?.zoomBy(0.8));
    this.must("#zoom-fit").addEventListener("click", () => this.gestures?.reset());

    const pop = this.must<HTMLElement>("#palette-pop");
    const paletteBtn = this.must<HTMLButtonElement>("#palette-btn");
    paletteBtn.addEventListener("click", () => {
      const open = pop.hidden;
      pop.hidden = !open;
      paletteBtn.setAttribute("aria-expanded", String(open));
    });
    pop.querySelectorAll<HTMLButtonElement>("[data-palette]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.palette;
        if (!id) return;
        this.save.paletteId = id;
        const colors = paletteById(id).colors;
        if (this.save.colorIndex >= colors.length) this.save.colorIndex = 0;
        writeSave(this.save);
        paletteBtn.textContent = `${paletteById(id).name} palette`;
        pop.hidden = true;
        paletteBtn.setAttribute("aria-expanded", "false");
        pop.querySelectorAll<HTMLButtonElement>("[data-palette]").forEach((option) => {
          option.setAttribute("aria-pressed", String(option.dataset.palette === id));
        });
        this.paintSwatches();
      });
    });
    const onDoc = (event: PointerEvent) => {
      if (pop.hidden) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (pop.contains(target) || paletteBtn.contains(target)) return;
      pop.hidden = true;
      paletteBtn.setAttribute("aria-expanded", "false");
    };
    document.addEventListener("pointerdown", onDoc);
    this.viewCleanups.push(() => document.removeEventListener("pointerdown", onDoc));
  }

  private paintSwatches(): void {
    const host = this.must("#swatches");
    const palette = paletteById(this.save.paletteId);
    host.replaceChildren();
    palette.colors.forEach((color, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "swatch";
      button.style.background = color;
      button.setAttribute("role", "option");
      button.setAttribute("aria-label", `Color ${index + 1}`);
      button.setAttribute("aria-pressed", String(this.save.tool === "fill" && this.save.colorIndex === index));
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = String(index + 1);
      button.append(num);
      button.addEventListener("click", () => {
        this.save.tool = "fill";
        this.save.colorIndex = index;
        writeSave(this.save);
        this.root.classList.remove("is-erasing");
        this.syncTools();
      });
      host.append(button);
    });
  }

  private syncTools(): void {
    this.must<HTMLButtonElement>("#eraser").setAttribute("aria-pressed", String(this.save.tool === "erase"));
    this.must<HTMLButtonElement>("#hints").setAttribute("aria-pressed", String(this.save.hints));
    this.root.querySelectorAll<HTMLButtonElement>(".swatch").forEach((button, index) => {
      button.setAttribute("aria-pressed", String(this.save.tool === "fill" && this.save.colorIndex === index));
    });
  }

  private tap(picture: Picture, clientX: number, clientY: number): void {
    const hit = document.elementFromPoint(clientX, clientY);
    const group = hit?.closest("[data-region]");
    const regionId = group?.getAttribute("data-region");
    if (!regionId || !picture.regions.some((region) => region.id === regionId)) return;
    const color = this.save.tool === "erase" ? null : selectedColor(this.save);
    const next = applyFill(this.save, picture, regionId, color);
    if (next === this.save) return;
    this.save = next;
    writeSave(this.save);
    const svg = this.root.querySelector(".stage-svg");
    if (svg instanceof SVGSVGElement) setRegionFill(svg, regionId, color);
    haptic();
    this.syncProgress(picture);
  }

  private step(picture: Picture, direction: "undo" | "redo"): void {
    const data = pictureSave(this.save, picture.id);
    const action = direction === "undo" ? data.undo[data.undo.length - 1] : data.redo[data.redo.length - 1];
    if (!action) return;
    this.save = direction === "undo" ? applyUndo(this.save, picture.id) : applyRedo(this.save, picture.id);
    writeSave(this.save);
    const svg = this.root.querySelector(".stage-svg");
    const color = direction === "undo" ? action.from : action.to;
    if (svg instanceof SVGSVGElement) setRegionFill(svg, action.regionId, color);
    this.syncProgress(picture);
  }

  private syncProgress(picture: Picture): void {
    const data = pictureSave(this.save, picture.id);
    const undo = this.must<HTMLButtonElement>("#undo");
    const redo = this.must<HTMLButtonElement>("#redo");
    undo.disabled = data.undo.length === 0;
    redo.disabled = data.redo.length === 0;
    const filled = filledCount(picture, this.save);
    this.must("#progress").textContent = `${filled} of ${picture.regions.length}`;
    const complete = isComplete(picture, this.save);
    this.must<HTMLElement>("#done").hidden = !complete;
    if (complete && !this.wasComplete) this.say("Finished. It's saved in your gallery.");
    if (!complete) this.wasComplete = false;
    else this.wasComplete = true;
  }

  private async savePng(picture: Picture): Promise<void> {
    try {
      await exportPng(picture, pictureSave(this.save, picture.id).fills);
      this.say("Picture saved as a PNG.");
    } catch {
      this.say("Couldn't save the image. Try again.");
    }
  }

  private setPack(pack: PackId): void {
    if (this.save.pack === pack) return;
    this.save.pack = pack;
    writeSave(this.save);
    this.render();
  }

  private setFilter(filter: Filter): void {
    if (this.save.filter === filter) return;
    this.save.filter = filter;
    writeSave(this.save);
    this.render();
  }

  private open(id: string): void {
    history.pushState({ view: "color" }, "", `#p=${id}`);
    this.render();
  }

  private say(message: string): void {
    const live = this.root.querySelector("#live");
    if (live) live.textContent = message;
  }

  private must<T extends Element = HTMLElement>(selector: string): T {
    const node = this.root.querySelector(selector);
    if (!node) throw new Error(`Missing ${selector}`);
    return node as T;
  }
}
