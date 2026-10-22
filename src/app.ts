import { Ambience } from "./audio.ts";
import { exportPng } from "./exportPng.ts";
import { GestureController } from "./gestures.ts";
import { icon } from "./icons.ts";
import { getPicture, picturesIn } from "./pictures/index.ts";
import { categories, type Picture, type Region } from "./pictures/types.ts";
import { markHot, referenceFills, renderSvg, setRegionFill } from "./render.ts";
import {
  applyFill,
  applyRedo,
  applyUndo,
  colorProgress,
  filledCount,
  firstOpenIndex,
  isComplete,
  loadSave,
  pictureSave,
  withColor,
  writeSave,
  type CategoryFilter,
  type Filter,
  type SaveData,
} from "./state.ts";

const categoryIds = new Set<string>(categories.map((item) => item.id));

function pictureIdFromHash(): string | null {
  const match = /^#p=([a-z0-9-]+)$/.exec(location.hash);
  return match?.[1] ?? null;
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function haptic(): void {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* This browser does not vibrate. */
  }
}

function inkOn(hex: string): string {
  const raw = hex.replace("#", "");
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return y > 0.64 ? "#4a3040" : "#fffaf8";
}

export class App {
  private save: SaveData;
  private readonly audio = new Ambience();
  private gestures: GestureController | null = null;
  private viewCleanups: Array<() => void> = [];
  private wasComplete = false;
  private findCursor = -1;
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.save = loadSave();
    if (this.save.category !== "all" && !categoryIds.has(this.save.category)) this.save.category = "all";
    this.installHistory();
    this.armSound();
    this.render();
  }

  private installHistory(): void {
    const hash = location.hash;
    const base = location.pathname + location.search;
    if (hash.startsWith("#p=") || hash === "#credits") {
      history.replaceState({ view: "gallery" }, "", base);
      history.pushState({ view: hash === "#credits" ? "credits" : "color" }, "", hash);
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
    const credits = location.hash === "#credits";
    const picture = credits ? undefined : this.currentPicture();
    if (credits) this.renderCredits();
    else if (picture) this.renderStudio(picture);
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
    const category = this.save.category;
    const inView = picturesIn(category);
    const finishedCount = inView.filter((picture) => isComplete(picture, this.save)).length;
    const visible = inView.filter((picture) => this.save.filter === "all" || isComplete(picture, this.save));
    const chips: { id: CategoryFilter; name: string }[] = [{ id: "all", name: "All" }, ...categories];

    this.root.className = "app is-gallery";
    this.root.innerHTML = `
      <header class="top gallery-top">
        <div class="brand">
          <span class="mark" aria-hidden="true"></span>
          <div>
            <p class="eyebrow">Color by number</p>
            <h1>Linen</h1>
          </div>
        </div>
        ${this.soundButton()}
      </header>
      <main class="gallery">
        <p class="blurb">Choose a shade, then tap every region that wears its number.</p>
        <div class="categories" role="tablist" aria-label="Categories">
          ${chips
            .map(
              (item) => `
            <button type="button" role="tab" data-category="${item.id}" aria-selected="${item.id === category}">
              ${item.name}
            </button>`,
            )
            .join("")}
        </div>
        <p class="note">A wrong number never fills — only the matching color does. Relaxing Landscapes are adapted from public-domain prints. The other pages are drawn for Linen.</p>
        <button type="button" class="text-link" id="credits">Image credits</button>
        <div class="filters" role="group" aria-label="Show">
          <button type="button" data-filter="all" aria-pressed="${this.save.filter === "all"}">All</button>
          <button type="button" data-filter="finished" aria-pressed="${this.save.filter === "finished"}">Finished${finishedCount ? ` · ${finishedCount}` : ""}</button>
        </div>
        ${
          visible.length
            ? `<div class="grid">${visible.map((picture) => this.card(picture)).join("")}</div>`
            : `<div class="empty"><p>Nothing finished in this view.</p><p>Color every region and the picture will wait here.</p></div>`
        }
        <p class="install-note">Add Linen to your home screen to keep coloring offline.</p>
      </main>
      <p class="live" id="live" aria-live="polite"></p>
    `;

    for (const picture of visible) {
      const host = this.root.querySelector(`#thumb-${picture.id}`);
      host?.append(renderSvg(picture, referenceFills(picture), { interactive: false, numbers: false, lines: false, layout: "thumb" }));
    }

    this.root.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.category;
        if (id === "all" || (id && categoryIds.has(id))) this.setCategory(id as CategoryFilter);
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
    this.must("#credits").addEventListener("click", () => this.openCredits());
    const tabRow = this.root.querySelector<HTMLElement>(".categories");
    const selectedTab = this.root.querySelector<HTMLElement>('[data-category][aria-selected="true"]');
    if (tabRow && selectedTab) tabRow.scrollLeft = Math.max(0, selectedTab.offsetLeft - 16);
    this.bindSound();
  }

  private renderCredits(): void {
    this.root.className = "app is-gallery";
    const groups = categories
      .map((category) => ({ category, pictures: picturesIn(category.id) }))
      .filter((group) => group.pictures.length);
    this.root.innerHTML = `
      <header class="top gallery-top">
        <button type="button" class="icon-btn" id="back" aria-label="Back to gallery">${icon("back")}</button>
        <div class="title-block">
          <p class="eyebrow">Sources</p>
          <h1>Image credits</h1>
        </div>
      </header>
      <main class="gallery credits">
        <p class="note">Relaxing Landscapes are adapted from public-domain prints. Every other page is an original illustration drawn for Linen, not copied from another coloring app.</p>
        ${groups
          .map(
            (group) => `
          <section>
            <h2>${esc(group.category.name)}</h2>
            ${group.pictures
              .map(
                (picture) => `
              <article>
                <h3>${esc(picture.title)}</h3>
                <p>${esc(picture.caption)}</p>
                <ul>
                  ${(picture.credits?.length ? picture.credits : [{ work: "Original illustration", author: "Linen", sourceUrl: "", license: "Original work, created for Linen", licenseUrl: "" }])
                    .map(
                      (credit) => `
                  <li>
                    <span class="credit-work">${esc(credit.work)}</span>
                    <span>${esc(credit.author)}</span>
                    ${
                      credit.sourceUrl
                        ? `<a href="${esc(credit.sourceUrl)}" target="_blank" rel="noreferrer">Source</a>`
                        : "<span>Original illustration created for Linen</span>"
                    }
                    ${
                      credit.licenseUrl
                        ? `<a href="${esc(credit.licenseUrl)}" target="_blank" rel="noreferrer">${esc(credit.license)}</a>`
                        : `<span>${esc(credit.license)}</span>`
                    }
                  </li>`,
                    )
                    .join("")}
                </ul>
              </article>`,
              )
              .join("")}
          </section>`,
          )
          .join("")}
      </main>
    `;
    this.must("#back").addEventListener("click", () => history.back());
  }

  private card(picture: Picture): string {
    const total = picture.regions.length;
    const filled = filledCount(picture, this.save);
    const done = filled === total;
    const pct = Math.round((filled / total) * 100);
    return `
      <button type="button" class="card${done ? " is-done" : ""}" data-id="${picture.id}" aria-label="${esc(picture.title)}, ${filled} of ${total} regions${done ? ", finished" : ""}">
        <span class="thumb" id="thumb-${picture.id}"></span>
        <span class="meta">
          <span class="meta-row">
            <span class="card-title">${esc(picture.title)}</span>
            ${done ? '<span class="seal">Finished</span>' : ""}
          </span>
          <span class="caption">${esc(picture.caption)}</span>
          <span class="bar" aria-hidden="true"><span style="width:${pct}%"></span></span>
          <span class="count">${filled} of ${total}</span>
        </span>
      </button>
    `;
  }

  private renderStudio(picture: Picture): void {
    const stored = pictureSave(this.save, picture.id);
    const colorIndex = firstOpenIndex(picture, this.save, stored.colorIndex);
    if (colorIndex !== stored.colorIndex) {
      this.save = withColor(this.save, picture.id, colorIndex);
      writeSave(this.save);
    }
    const data = pictureSave(this.save, picture.id);
    const filled = filledCount(picture, this.save);
    this.wasComplete = filled === picture.regions.length;
    this.findCursor = -1;
    this.root.className = "app is-studio";
    this.root.innerHTML = `
      <header class="top">
        <button type="button" class="icon-btn" id="back" aria-label="Back to gallery">${icon("back")}</button>
        <div class="title-block">
          <h1>${esc(picture.title)}</h1>
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
            <p>That's the whole picture.</p>
            <button type="button" id="done-export">Save PNG</button>
          </div>
        </div>
        <div class="dock">
          <div class="tools">
            <button type="button" class="tool find" id="find">${icon("find")}<span>Find</span></button>
            <button type="button" class="tool icon-only" id="zoom-out" aria-label="Zoom out">${icon("minus")}</button>
            <button type="button" class="tool icon-only" id="zoom-in" aria-label="Zoom in">${icon("plus")}</button>
            <button type="button" class="tool" id="zoom-fit" aria-label="Fit picture">${icon("fit")}<span>Fit</span></button>
          </div>
          <div class="color-meter">
            <p><span id="color-label">Color ${colorIndex + 1}</span><span id="color-count"></span></p>
            <span class="bar" aria-hidden="true"><span id="color-bar"></span></span>
          </div>
          <div class="swatches" id="swatches" role="listbox" aria-label="Numbered colors"></div>
        </div>
      </div>
      <p class="live" id="live" aria-live="polite"></p>
    `;

    const viewport = this.must("#viewport");
    const svg = renderSvg(picture, data.fills, { interactive: true, numbers: true, lines: true, layout: "stage" });
    if (this.wasComplete) svg.classList.add("is-complete");
    viewport.prepend(svg);
    this.gestures = new GestureController(viewport, svg, (x, y) => this.tap(picture, x, y));
    if (!this.wasComplete) markHot(svg, colorIndex + 1);
    this.paintSwatches(picture);
    this.paintMeter(picture);
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
    this.must("#find").addEventListener("click", () => this.findNext(picture));
    this.must("#zoom-in").addEventListener("click", () => this.gestures?.zoomBy(1.25));
    this.must("#zoom-out").addEventListener("click", () => this.gestures?.zoomBy(0.8));
    this.must("#zoom-fit").addEventListener("click", () => this.gestures?.reset());
  }

  private colorIndexOf(picture: Picture): number {
    return pictureSave(this.save, picture.id).colorIndex;
  }

  private paintSwatches(picture: Picture): void {
    const host = this.must("#swatches");
    const selected = this.colorIndexOf(picture);
    host.replaceChildren();
    picture.colors.forEach((color, index) => {
      const n = index + 1;
      const progress = colorProgress(picture, this.save, n);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "swatch";
      if (progress.total > 0 && progress.done === progress.total) button.classList.add("is-done");
      button.style.background = color;
      button.style.color = inkOn(color);
      button.dataset.n = String(n);
      button.setAttribute("role", "option");
      button.setAttribute("aria-label", `Color ${n}, ${progress.done} of ${progress.total} filled`);
      button.setAttribute("aria-selected", String(selected === index));
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = String(n);
      button.append(num);
      button.addEventListener("click", () => {
        this.findCursor = -1;
        this.save = withColor(this.save, picture.id, index);
        writeSave(this.save);
        this.paintSwatches(picture);
        this.paintMeter(picture);
        this.refreshHot(picture);
        const left = progress.total - progress.done;
        this.say(left ? `Color ${n}. ${left} still open.` : `Color ${n} is already finished.`);
      });
      host.append(button);
    });
    const selectedButton = host.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (selectedButton) {
      host.scrollLeft = selectedButton.offsetLeft - host.clientWidth / 2 + selectedButton.clientWidth / 2;
    }
  }

  private paintMeter(picture: Picture): void {
    const index = this.colorIndexOf(picture);
    const progress = colorProgress(picture, this.save, index + 1);
    this.must("#color-label").textContent = `Color ${index + 1}`;
    this.must("#color-count").textContent = `${progress.done} of ${progress.total}`;
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    this.must<HTMLElement>("#color-bar").style.width = `${pct}%`;
    const find = this.must<HTMLButtonElement>("#find");
    find.disabled = progress.done === progress.total;
    find.setAttribute("aria-label", find.disabled ? "This color is finished" : "Find the next region of this color");
  }

  private refreshHot(picture: Picture): void {
    const svg = this.root.querySelector(".stage-svg");
    if (!(svg instanceof SVGSVGElement) || svg.classList.contains("is-complete")) return;
    markHot(svg, this.colorIndexOf(picture) + 1);
  }

  private tap(picture: Picture, clientX: number, clientY: number): void {
    const hit = document.elementFromPoint(clientX, clientY);
    const group = hit?.closest("[data-region]");
    const regionId = group?.getAttribute("data-region");
    const region = picture.regions.find((item) => item.id === regionId);
    if (!region) return;
    const fills = pictureSave(this.save, picture.id).fills;
    if (fills[region.id]) return;
    const selected = this.colorIndexOf(picture);
    if (region.n !== selected + 1) {
      this.nudge();
      this.say(`That region needs color ${region.n}.`);
      return;
    }
    const color = picture.colors[region.n - 1];
    if (!color) return;
    const next = applyFill(this.save, picture, region.id, color);
    if (next === this.save) return;
    this.save = next;
    writeSave(this.save);
    const svg = this.root.querySelector(".stage-svg");
    if (svg instanceof SVGSVGElement) setRegionFill(svg, region.id, color);
    haptic();
    this.afterPaint(picture, selected);
  }

  private afterPaint(picture: Picture, previousIndex: number): void {
    const complete = isComplete(picture, this.save);
    const svg = this.root.querySelector(".stage-svg");
    if (complete && svg instanceof SVGSVGElement) {
      svg.classList.add("is-complete");
      markHot(svg, 0);
    }
    const progress = colorProgress(picture, this.save, previousIndex + 1);
    if (!complete && progress.done === progress.total) {
      const nextIndex = firstOpenIndex(picture, this.save, previousIndex + 1);
      this.findCursor = -1;
      this.save = withColor(this.save, picture.id, nextIndex);
      writeSave(this.save);
      this.say(`Color ${previousIndex + 1} is finished. Color ${nextIndex + 1} is next.`);
    }
    if (complete && !this.wasComplete) {
      this.burst();
      this.say("That's the whole picture.");
    }
    if (!complete) this.wasComplete = false;
    else this.wasComplete = true;
    this.paintChrome(picture);
    if (!complete) this.refreshHot(picture);
  }

  private step(picture: Picture, direction: "undo" | "redo"): void {
    const data = pictureSave(this.save, picture.id);
    const action = direction === "undo" ? data.undo[data.undo.length - 1] : data.redo[data.redo.length - 1];
    if (!action) return;
    this.save = direction === "undo" ? applyUndo(this.save, picture.id) : applyRedo(this.save, picture.id);
    writeSave(this.save);
    const svg = this.root.querySelector(".stage-svg");
    const color = direction === "undo" ? action.from : action.to;
    if (svg instanceof SVGSVGElement) {
      setRegionFill(svg, action.regionId, color);
      const complete = isComplete(picture, this.save);
      svg.classList.toggle("is-complete", complete);
      if (!complete) this.root.querySelector(".burst")?.remove();
    }
    this.wasComplete = isComplete(picture, this.save);
    this.paintChrome(picture);
    this.refreshHot(picture);
  }

  private paintChrome(picture: Picture): void {
    const data = pictureSave(this.save, picture.id);
    this.must<HTMLButtonElement>("#undo").disabled = data.undo.length === 0;
    this.must<HTMLButtonElement>("#redo").disabled = data.redo.length === 0;
    const filled = filledCount(picture, this.save);
    this.must("#progress").textContent = `${filled} of ${picture.regions.length}`;
    this.must<HTMLElement>("#done").hidden = !isComplete(picture, this.save);
    this.paintSwatches(picture);
    this.paintMeter(picture);
  }

  private findNext(picture: Picture): void {
    const n = this.colorIndexOf(picture) + 1;
    const fills = pictureSave(this.save, picture.id).fills;
    const open = picture.regions.filter((region) => region.n === n && !fills[region.id]);
    if (!open.length) return;
    this.findCursor = (this.findCursor + 1) % open.length;
    const region = open[this.findCursor];
    if (!region) return;
    const svg = this.root.querySelector(".stage-svg");
    if (!(svg instanceof SVGSVGElement)) return;
    const path = svg.querySelector(`[data-region="${CSS.escape(region.id)}"]`);
    if (!(path instanceof SVGPathElement)) return;
    const [x, y] = this.focusPoint(region, path);
    this.gestures?.focus(x, y, 2.8);
    path.classList.remove("found");
    void path.getBoundingClientRect();
    path.classList.add("found");
    window.setTimeout(() => path.classList.remove("found"), 1400);
    this.say(`Color ${n}, region ${this.findCursor + 1} of ${open.length}.`);
  }

  private focusPoint(region: Region, path: SVGPathElement): [number, number] {
    if (region.label) return region.label;
    const box = path.getBBox();
    return [box.x + box.width / 2, box.y + box.height / 2];
  }

  private nudge(): void {
    const viewport = this.root.querySelector("#viewport");
    if (!(viewport instanceof HTMLElement)) return;
    viewport.classList.remove("nudge");
    void viewport.offsetWidth;
    viewport.classList.add("nudge");
  }

  private burst(): void {
    const viewport = this.root.querySelector("#viewport");
    if (!(viewport instanceof HTMLElement) || viewport.querySelector(".burst")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const burst = document.createElement("div");
    burst.className = "burst";
    burst.setAttribute("aria-hidden", "true");
    const colors = ["#f2c1c8", "#f7e3c2", "#e6c8ee", "#c9dfc4", "#fffaf8", "#f3d5b5"];
    for (let i = 0; i < 12; i += 1) {
      const bit = document.createElement("i");
      bit.style.left = `${6 + ((i * 37) % 88)}%`;
      bit.style.background = colors[i % colors.length] ?? "#f2c1c8";
      bit.style.animationDelay = `${i * 0.06}s`;
      const size = 8 + (i % 4) * 3;
      bit.style.width = `${size}px`;
      bit.style.height = `${size}px`;
      burst.append(bit);
    }
    viewport.append(burst);
  }

  private async savePng(picture: Picture): Promise<void> {
    try {
      await exportPng(picture, pictureSave(this.save, picture.id).fills);
      this.say("Picture saved as a PNG.");
    } catch {
      this.say("Couldn't save the image. Try again.");
    }
  }

  private setCategory(category: CategoryFilter): void {
    if (this.save.category === category) return;
    this.save.category = category;
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

  private openCredits(): void {
    history.pushState({ view: "credits" }, "", "#credits");
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
