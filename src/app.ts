import { Ambience, type Cue } from "./audio.ts";
import { archiveDates, buildDaily, dailyPicture, formatDailyLabel, isIsoDate, LAUNCH_DATE, localDateISO } from "./daily/generate.ts";
import { exportPng } from "./exportPng.ts";
import { GestureController, installPalmRejection } from "./gestures.ts";
import { icon } from "./icons.ts";
import { renderZen } from "./match/zen.ts";
import { levelFromHash } from "./match/levels.ts";
import { renderMatchHome, renderMatchLevel, type MatchCtx } from "./match/view.ts";
import { LEVEL_COUNT as SORT_COUNT } from "./sort/logic.ts";
import { renderSortHome, renderSortLevel, renderSortZen, type SortCtx } from "./sort/view.ts";
import { difficultyPlan, posterizeFile } from "./photo/posterize.ts";
import { deletePhoto, loadPhotoCache, photoById, photoRecords, savePhoto } from "./photo/store.ts";
import { getPicture, picturesIn } from "./pictures/index.ts";
import { categories, type Picture, type Region } from "./pictures/types.ts";
import { markHot, referenceFills, renderSvg, setRegionFill } from "./render.ts";
import { applyTheme, cycleTheme, loadSettings, SCAPES, themeLabel, writeSettings, type ScapeId } from "./settings.ts";
import {
  applyFill,
  applyRedo,
  applyUndo,
  colorProgress,
  filledCount,
  firstOpenIndex,
  forgetPicture,
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

function sortIdFromHash(hash: string): number | undefined {
  const match = /^#s=(\d+)$/.exec(hash);
  if (!match) return undefined;
  const id = Number(match[1]);
  if (id < 1 || id > SORT_COUNT) return undefined;
  return id;
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
  private lastMiss = "";
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    installPalmRejection();
    this.save = loadSave();
    if (this.save.category !== "all" && !categoryIds.has(this.save.category)) this.save.category = "all";
    const settings = loadSettings();
    this.audio.setScape(settings.scape);
    this.audio.setVolume(settings.volume);
    window.addEventListener("linen-theme", () => this.paintThemeColor());
    this.installHistory();
    this.armSound();
    const waitForPhotos = location.hash.startsWith("#p=photo-") || location.hash === "#photos" || location.hash === "#photo";
    if (!waitForPhotos) this.render();
    void this.boot(waitForPhotos);
  }

  private async boot(waitForPhotos: boolean): Promise<void> {
    try {
      await loadPhotoCache();
    } catch {
      /* Storage can be blocked. The rest of Linen still opens. */
    }
    if (waitForPhotos) this.render();
  }

  private installHistory(): void {
    const hash = location.hash;
    const base = location.pathname + location.search;
    const matchLevel = /^#m=\d+$/.test(hash);
    const sortLevel = /^#s=\d+$/.test(hash);
    const pictureId = pictureIdFromHash() ?? "";
    const stacked =
      hash.startsWith("#p=") ||
      hash === "#credits" ||
      hash === "#match" ||
      matchLevel ||
      hash === "#zen" ||
      hash === "#sort" ||
      sortLevel ||
      hash === "#sort-zen" ||
      hash === "#daily" ||
      hash === "#photos" ||
      hash === "#photo" ||
      hash === "#tones";
    if (stacked) {
      history.replaceState({ view: "gallery" }, "", base);
      if (matchLevel || hash === "#zen") history.pushState({ view: "match" }, "", "#match");
      if (sortLevel || hash === "#sort-zen") history.pushState({ view: "sort" }, "", "#sort");
      if (hash === "#photo" || pictureId.startsWith("photo-")) history.pushState({ view: "photos" }, "", "#photos");
      if (pictureId.startsWith("daily-")) history.pushState({ view: "daily" }, "", "#daily");
      const view = hash === "#credits"
        ? "credits"
        : hash === "#match"
          ? "match"
          : matchLevel
            ? "level"
            : hash === "#zen"
              ? "zen"
              : hash === "#sort"
                ? "sort"
                : sortLevel
                  ? "sort-level"
                  : hash === "#sort-zen"
                    ? "sort-zen"
                    : hash.startsWith("#")
                      ? hash.slice(1)
                      : "color";
      history.pushState({ view }, "", hash);
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
    const hash = location.hash;
    const matchRoute = hash === "#match" || hash.startsWith("#m=");
    const sortRoute = hash === "#sort" || hash.startsWith("#s=") || hash === "#sort-zen";
    const credits = hash === "#credits";
    const picture = credits || matchRoute || sortRoute || hash === "#zen" || hash === "#daily" || hash === "#photos" || hash === "#photo" || hash === "#tones"
      ? undefined
      : this.currentPicture();
    if (credits) this.renderCredits();
    else if (hash === "#zen") this.renderZenRoute();
    else if (hash === "#sort-zen") this.renderSortZen();
    else if (sortRoute) this.renderSortRoute();
    else if (matchRoute) this.renderMatchRoute();
    else if (hash === "#tones") this.renderTones();
    else if (hash === "#daily") this.renderDaily();
    else if (hash === "#photos") this.renderPhotos();
    else if (hash === "#photo") this.renderPhotoMaker();
    else if (picture) this.renderStudio(picture);
    else this.renderGallery();
    this.paintThemeColor();
    this.finishChrome();
  }

  private paintThemeColor(): void {
    const night = document.documentElement.dataset.theme === "night";
    const studio = this.root.classList.contains("is-studio");
    const color = night ? "#2a2422" : studio ? "#f6efe8" : "#f6d0dc";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }

  private currentPicture(): Picture | undefined {
    const id = pictureIdFromHash();
    if (!id) return undefined;
    if (id.startsWith("daily-")) {
      const iso = id.slice("daily-".length);
      const today = localDateISO();
      if (!isIsoDate(iso) || iso < LAUNCH_DATE || iso > today) {
        this.bounceGallery();
        return undefined;
      }
      try {
        return dailyPicture(iso);
      } catch {
        this.bounceGallery();
        return undefined;
      }
    }
    if (id.startsWith("photo-")) {
      const photo = photoById(id);
      if (!photo) {
        this.bounceGallery();
        return undefined;
      }
      return photo;
    }
    const picture = getPicture(id);
    if (!picture) {
      this.bounceGallery();
      return undefined;
    }
    return picture;
  }

  private bounceGallery(): void {
    history.replaceState({ view: "gallery" }, "", location.pathname + location.search);
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
        ${this.headerTools()}
      </header>
      ${this.modeSwitch("color")}
      <main class="gallery">
        ${this.todayCard()}
        <div class="home-links">
          <button type="button" data-go="daily">Daily</button>
          <button type="button" data-go="photo">Your photo</button>
          <button type="button" data-go="photos">My photos</button>
        </div>
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
        <p class="note">A wrong number never fills — only the matching color does. Music and Relaxing Landscapes come from public-domain art. The other pages are drawn for Linen.</p>
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
        <p class="install-note">Add Linen to your home screen to keep it offline.</p>
      </main>
      <p class="live" id="live" aria-live="polite"></p>
    `;

    for (const picture of visible) {
      const host = this.root.querySelector(`#thumb-${picture.id}`);
      host?.append(renderSvg(picture, referenceFills(picture), { interactive: false, numbers: false, lines: false, layout: "thumb" }));
    }
    const todayHost = this.root.querySelector("#today-thumb");
    const todayIso = this.root.querySelector<HTMLElement>("#today")?.dataset.iso;
    if (todayHost && todayIso) {
      try {
        const todayPicture = dailyPicture(todayIso);
        todayHost.append(renderSvg(todayPicture, referenceFills(todayPicture), { interactive: false, numbers: false, lines: false, layout: "thumb" }));
      } catch {
        /* The card already explains a failed day. */
      }
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
    this.root.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((button) => {
      button.addEventListener("click", () => {
        const go = button.dataset.go;
        if (go === "daily") this.openDaily();
        else if (go === "photo") this.openPhotoMaker();
        else if (go === "photos") this.openPhotos();
      });
    });
    const today = this.root.querySelector<HTMLButtonElement>("#today");
    today?.addEventListener("click", () => {
      const iso = today.dataset.iso;
      if (iso) this.open(`daily-${iso}`);
    });
    const tabRow = this.root.querySelector<HTMLElement>(".categories");
    const selectedTab = this.root.querySelector<HTMLElement>('[data-category][aria-selected="true"]');
    if (tabRow && selectedTab) tabRow.scrollLeft = Math.max(0, selectedTab.offsetLeft - 16);
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
        <p class="note">Music and Relaxing Landscapes are adapted from public-domain art. Every other page is an original illustration drawn for Linen, not copied from another coloring app.</p>
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
          ${this.themeButton()}
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
    this.gestures = new GestureController(viewport, svg, (x, y, phase) => this.tap(picture, x, y, phase));
    if (!this.wasComplete) markHot(svg, colorIndex + 1);
    this.paintSwatches(picture);
    this.paintMeter(picture);
    this.bindStudio(picture);
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

  private regionAt(clientX: number, clientY: number): { id: string; n: number } | undefined {
    const svg = this.root.querySelector(".stage-svg");
    if (!(svg instanceof SVGSVGElement)) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const local = point.matrixTransform(ctm.inverse());
    const paths = svg.querySelectorAll<SVGPathElement>(".region");
    for (let i = paths.length - 1; i >= 0; i -= 1) {
      const path = paths[i];
      if (!path.isPointInFill(local)) continue;
      const id = path.dataset.region;
      const n = Number(path.dataset.n);
      if (id && Number.isInteger(n)) return { id, n };
    }
    return;
  }

  private tap(picture: Picture, clientX: number, clientY: number, phase: "down" | "move" | "up" = "down"): void {
    const region = this.regionAt(clientX, clientY);
    if (!region) return;
    const fills = pictureSave(this.save, picture.id).fills;
    if (fills[region.id]) return;
    const selected = this.colorIndexOf(picture);
    if (region.n !== selected + 1) {
      if (phase === "move" || (phase === "up" && this.lastMiss === region.id)) return;
      this.lastMiss = region.id;
      this.nudge();
      this.say(`That region needs color ${region.n}.`);
      return;
    }
    this.lastMiss = "";
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

  private openColor(): void {
    if (location.hash === "") return;
    history.pushState({ view: "gallery" }, "", location.pathname + location.search);
    this.render();
  }

  private openMatch(): void {
    if (location.hash === "#match") return;
    history.pushState({ view: "match" }, "", "#match");
    this.render();
  }

  private openLevel(id: number): void {
    history.pushState({ view: "level", id }, "", `#m=${id}`);
    this.render();
  }

  private renderMatchRoute(): void {
    this.root.className = "app is-gallery";
    const level = location.hash.startsWith("#m=") ? levelFromHash(location.hash) : undefined;
    if (!level) {
      this.viewCleanups.push(renderMatchHome(this.root, this.matchCtx()));
      return;
    }
    this.viewCleanups.push(renderMatchLevel(this.root, level, this.matchCtx()));
  }

  private matchCtx(): MatchCtx {
    return {
      soundHtml: this.headerTools(),
      openMatch: () => this.openMatch(),
      openLevel: (id) => this.openLevel(id),
      openZen: () => this.openZen(),
      back: () => history.back(),
      say: (message) => this.say(message),
      cue: (kind) => this.playCue(kind),
      haptic: () => haptic(),
    };
  }

  private modeSwitch(active: "color" | "match" | "sort"): string {
    return `
      <div class="modes" role="tablist" aria-label="Game">
        <button type="button" role="tab" data-mode="color" aria-selected="${active === "color"}">Color</button>
        <button type="button" role="tab" data-mode="match" aria-selected="${active === "match"}">Match</button>
        <button type="button" role="tab" data-mode="sort" aria-selected="${active === "sort"}">Sort</button>
      </div>
    `;
  }

  private bindModes(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.mode === "match") this.openMatch();
        else if (button.dataset.mode === "sort") this.openSort();
        else this.openColor();
      });
    });
  }

  private finishChrome(): void {
    if (this.root.querySelector("#sound")) this.bindSound();
    if (this.root.querySelector("#theme")) this.bindTheme();
    if (this.root.querySelector("#open-tones")) this.bindTonesNav();
    if (this.root.querySelector("[data-mode]")) this.bindModes();
  }

  private headerTools(): string {
    return `<div class="tool-cluster">${this.themeButton()}${this.tonesButton()}${this.soundButton()}</div>`;
  }

  private themeButton(): string {
    const theme = loadSettings().theme;
    const name = theme === "night" ? "moon" : theme === "system" ? "monitor" : "sun";
    return `<button type="button" class="icon-btn" id="theme" aria-label="Theme: ${themeLabel(theme)}. Switch theme.">${icon(name)}</button>`;
  }

  private tonesButton(): string {
    return `<button type="button" class="icon-btn" id="open-tones" aria-label="Soundscapes">${icon("waves")}</button>`;
  }

  private bindTheme(): void {
    this.must<HTMLButtonElement>("#theme").addEventListener("click", () => {
      const settings = loadSettings();
      const next = cycleTheme(settings.theme);
      writeSettings({ ...settings, theme: next });
      applyTheme(next);
      const button = this.must<HTMLButtonElement>("#theme");
      const name = next === "night" ? "moon" : next === "system" ? "monitor" : "sun";
      button.setAttribute("aria-label", `Theme: ${themeLabel(next)}. Switch theme.`);
      button.innerHTML = icon(name);
      this.say(`${themeLabel(next)} theme.`);
    });
  }

  private bindTonesNav(): void {
    this.must("#open-tones").addEventListener("click", () => this.openTones());
  }

  private todayCard(): string {
    const today = localDateISO();
    if (today < LAUNCH_DATE) {
      return `<section class="today-card is-waiting"><p class="eyebrow">Today</p><p>The first daily picture arrives on ${esc(formatDailyLabel(LAUNCH_DATE))}.</p></section>`;
    }
    try {
      const result = buildDaily(today);
      const picture = result.picture;
      const filled = filledCount(picture, this.save);
      const total = picture.regions.length;
      return `
        <button type="button" class="today-card" id="today" data-iso="${today}" aria-label="Today's picture, ${esc(picture.title)}, ${filled} of ${total}">
          <span class="thumb" id="today-thumb"></span>
          <span class="meta">
            <span class="eyebrow">Today</span>
            <span class="card-title">${esc(picture.title)}</span>
            <span class="caption">${esc(formatDailyLabel(today))}</span>
            <span class="count">${filled} of ${total}</span>
          </span>
        </button>`;
    } catch {
      return `<section class="today-card is-waiting"><p class="eyebrow">Today</p><p>Today's picture could not be drawn. Open Daily to try again.</p></section>`;
    }
  }

  private renderZenRoute(): void {
    this.root.className = "app is-gallery is-zen";
    let picture: Picture | null = null;
    const today = localDateISO();
    if (today >= LAUNCH_DATE) {
      try {
        picture = dailyPicture(today);
      } catch {
        picture = null;
      }
    }
    this.viewCleanups.push(
      renderZen(this.root, {
        toolsHtml: this.headerTools(),
        back: () => history.back(),
        say: (message) => this.say(message),
        cue: (kind) => this.playCue(kind),
        haptic: () => haptic(),
        picture,
      }),
    );
  }

  private renderDaily(): void {
    const dates = archiveDates();
    this.root.className = "app is-gallery";
    this.root.innerHTML = `
      <header class="top gallery-top">
        <button type="button" class="icon-btn" id="back" aria-label="Back to gallery">${icon("back")}</button>
        <div class="title-block">
          <p class="eyebrow">One each day</p>
          <h1>Daily</h1>
        </div>
        ${this.headerTools()}
      </header>
      <main class="gallery">
        <p class="blurb">A new picture every day, drawn from the date. Yesterday looks the same on every phone.</p>
        ${
          dates.length
            ? `<div class="grid" id="daily-grid"></div>`
            : `<div class="empty"><p>The daily pictures begin on ${esc(formatDailyLabel(LAUNCH_DATE))}.</p></div>`
        }
      </main>
      <p class="live" id="live" aria-live="polite"></p>
    `;
    this.must("#back").addEventListener("click", () => history.back());
    const grid = this.root.querySelector("#daily-grid");
    if (!grid) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const host = entry.target;
          if (!(host instanceof HTMLElement)) continue;
          const iso = host.dataset.iso;
          observer.unobserve(host);
          if (iso) this.paintDailyThumb(host, iso);
        }
      },
      { rootMargin: "240px" },
    );
    dates.forEach((iso, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "card";
      button.dataset.iso = iso;
      button.innerHTML = `
        <span class="thumb"></span>
        <span class="meta">
          <span class="card-title">${esc(formatDailyLabel(iso))}</span>
          <span class="caption">Drawing…</span>
        </span>`;
      button.addEventListener("click", () => this.open(`daily-${iso}`));
      grid.append(button);
      if (index < 2) this.paintDailyThumb(button, iso);
      else observer.observe(button);
    });
    this.viewCleanups.push(() => observer.disconnect());
  }

  private paintDailyThumb(host: HTMLElement, iso: string): void {
    try {
      const picture = dailyPicture(iso);
      const thumb = host.querySelector(".thumb");
      const title = host.querySelector(".card-title");
      const caption = host.querySelector(".caption");
      if (title) title.textContent = picture.title;
      const filled = filledCount(picture, this.save);
      if (caption) caption.textContent = `${formatDailyLabel(iso)} · ${filled} of ${picture.regions.length}`;
      host.setAttribute("aria-label", `${picture.title}, ${formatDailyLabel(iso)}, ${filled} of ${picture.regions.length}`);
      if (thumb && !thumb.childElementCount) {
        thumb.append(renderSvg(picture, referenceFills(picture), { interactive: false, numbers: false, lines: false, layout: "thumb" }));
      }
    } catch {
      const caption = host.querySelector(".caption");
      if (caption) caption.textContent = "This date could not be drawn.";
    }
  }

  private renderPhotos(): void {
    const records = photoRecords();
    this.root.className = "app is-gallery";
    this.root.innerHTML = `
      <header class="top gallery-top">
        <button type="button" class="icon-btn" id="back" aria-label="Back to gallery">${icon("back")}</button>
        <div class="title-block">
          <p class="eyebrow">On this phone</p>
          <h1>My photos</h1>
        </div>
        ${this.headerTools()}
      </header>
      <main class="gallery">
        <p class="blurb">Photos you turn into pages stay here. Nothing is uploaded.</p>
        <div class="home-links home-links-single">
          <button type="button" id="add-photo">Your photo</button>
        </div>
        ${
          records.length
            ? `<div class="grid" id="photo-grid"></div>`
            : `<div class="empty"><p>No photos yet.</p><p>Choose a picture from this phone and it becomes a numbered page.</p></div>`
        }
      </main>
      <p class="live" id="live" aria-live="polite"></p>
    `;
    this.must("#back").addEventListener("click", () => history.back());
    this.must("#add-photo").addEventListener("click", () => this.openPhotoMaker());
    const grid = this.root.querySelector("#photo-grid");
    for (const record of records) {
      const picture = record.picture;
      const filled = filledCount(picture, this.save);
      const card = document.createElement("div");
      card.className = "photo-card";
      card.innerHTML = `
        <button type="button" class="card" data-id="${esc(picture.id)}">
          <span class="thumb"></span>
          <span class="meta">
            <span class="card-title">${esc(picture.title)}</span>
            <span class="caption">${filled} of ${picture.regions.length}</span>
          </span>
        </button>
        <button type="button" class="text-link photo-delete" data-delete="${esc(picture.id)}">Delete</button>`;
      const thumb = card.querySelector(".thumb");
      thumb?.append(renderSvg(picture, referenceFills(picture), { interactive: false, numbers: false, lines: false, layout: "thumb" }));
      card.querySelector<HTMLButtonElement>(".card")?.addEventListener("click", () => this.open(picture.id));
      card.querySelector<HTMLButtonElement>(".photo-delete")?.addEventListener("click", () => {
        void this.removePhoto(picture.id);
      });
      grid?.append(card);
    }
  }

  private async removePhoto(id: string): Promise<void> {
    try {
      await deletePhoto(id);
    } catch {
      this.say("That photo could not be deleted.");
      return;
    }
    this.save = forgetPicture(this.save, id);
    writeSave(this.save);
    this.say("Photo deleted.");
    this.render();
  }

  private renderPhotoMaker(): void {
    const plan = difficultyPlan(0.45);
    this.root.className = "app is-gallery";
    this.root.innerHTML = `
      <header class="top gallery-top">
        <button type="button" class="icon-btn" id="back" aria-label="Back to my photos">${icon("back")}</button>
        <div class="title-block">
          <p class="eyebrow">On this phone</p>
          <h1>Your photo</h1>
        </div>
        ${this.headerTools()}
      </header>
      <main class="gallery photo-maker">
        <p class="blurb">Take or choose a photo. Linen turns it into a coloring page here, on this phone. Nothing is uploaded.</p>
        <label class="photo-pick">
          <input id="photo-file" type="file" accept="image/*" capture="environment">
          <span>Take or choose a photo</span>
        </label>
        <img id="photo-preview" alt="Chosen photo" hidden>
        <label class="volume" for="photo-difficulty">Regions</label>
        <input id="photo-difficulty" type="range" min="0" max="100" value="45" aria-describedby="photo-diff-label">
        <p class="note" id="photo-diff-label">${esc(plan.label)}</p>
        <button type="button" class="primary" id="photo-make" disabled>Make coloring page</button>
        <p class="note" id="photo-status"></p>
      </main>
      <p class="live" id="live" aria-live="polite"></p>
    `;
    this.must("#back").addEventListener("click", () => history.back());
    const input = this.must<HTMLInputElement>("#photo-file");
    const preview = this.must<HTMLImageElement>("#photo-preview");
    const range = this.must<HTMLInputElement>("#photo-difficulty");
    const make = this.must<HTMLButtonElement>("#photo-make");
    const label = this.must("#photo-diff-label");
    const status = this.must("#photo-status");
    let url = "";
    input.addEventListener("change", () => {
      if (url) URL.revokeObjectURL(url);
      const file = input.files?.[0];
      if (!file) {
        preview.hidden = true;
        make.disabled = true;
        status.textContent = "";
        return;
      }
      url = URL.createObjectURL(file);
      preview.src = url;
      preview.hidden = false;
      make.disabled = false;
      status.textContent = "";
    });
    range.addEventListener("input", () => {
      label.textContent = difficultyPlan(Number(range.value) / 100).label;
    });
    make.addEventListener("click", () => {
      const file = input.files?.[0];
      if (!file) return;
      void this.makePhoto(file, Number(range.value) / 100, make, status);
    });
    this.viewCleanups.push(() => {
      if (url) URL.revokeObjectURL(url);
    });
  }

  private async makePhoto(file: File, amount: number, button: HTMLButtonElement, status: HTMLElement): Promise<void> {
    button.disabled = true;
    status.textContent = "Painting the page…";
    this.say("Painting the page.");
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    const hour = new Date().getHours();
    const title = hour < 11 ? "Morning photo" : hour < 17 ? "Afternoon photo" : hour < 21 ? "Evening photo" : "Night photo";
    const id = `photo-${Date.now().toString(36)}`;
    try {
      const picture = await posterizeFile(file, amount, { id, title });
      await savePhoto(picture);
      this.say(`${picture.regions.length} regions, ${picture.colors.length} colors.`);
      this.open(picture.id);
    } catch {
      status.textContent = "That image could not be read. Try another photo.";
      button.disabled = false;
      this.say("That image could not be read.");
    }
  }

  private renderTones(): void {
    const settings = loadSettings();
    this.root.className = "app is-gallery";
    this.root.innerHTML = `
      <header class="top gallery-top">
        <button type="button" class="icon-btn" id="back" aria-label="Back">${icon("back")}</button>
        <div class="title-block">
          <p class="eyebrow">Generated here</p>
          <h1>Sound</h1>
        </div>
        ${this.headerTools()}
      </header>
      <main class="gallery">
        <p class="blurb">Pick a bed. It plays in Color, Match, and Zen, and it follows the speaker button.</p>
        <p class="note">${this.save.sound ? "Sound is on." : "Sound is off. The speaker button turns it on."}</p>
        <div class="scape-list" role="listbox" aria-label="Soundscapes">
          ${SCAPES.map(
            (scape) => `
            <button type="button" role="option" data-scape="${scape.id}" aria-selected="${scape.id === settings.scape}">
              <span class="card-title">${esc(scape.name)}</span>
              <span class="caption">${esc(scape.note)}</span>
            </button>`,
          ).join("")}
        </div>
        <label class="volume" for="volume">Volume</label>
        <input id="volume" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}" aria-label="Volume">
      </main>
      <p class="live" id="live" aria-live="polite"></p>
    `;
    this.must("#back").addEventListener("click", () => history.back());
    this.root.querySelectorAll<HTMLButtonElement>("[data-scape]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.scape;
        if (!id || !SCAPES.some((scape) => scape.id === id)) return;
        const next = loadSettings();
        writeSettings({ ...next, scape: id as ScapeId });
        this.audio.setScape(id as ScapeId);
        this.root.querySelectorAll<HTMLButtonElement>("[data-scape]").forEach((other) => {
          other.setAttribute("aria-selected", other === button ? "true" : "false");
        });
        const name = SCAPES.find((scape) => scape.id === id)?.name ?? "Sound";
        this.say(this.save.sound ? `${name}.` : `${name} saved. Turn sound on to hear it.`);
      });
    });
    this.must<HTMLInputElement>("#volume").addEventListener("input", (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement)) return;
      const volume = Number(target.value) / 100;
      const next = loadSettings();
      writeSettings({ ...next, volume });
      this.audio.setVolume(volume);
    });
  }

  private openDaily(): void {
    history.pushState({ view: "daily" }, "", "#daily");
    this.render();
  }

  private openPhotos(): void {
    history.pushState({ view: "photos" }, "", "#photos");
    this.render();
  }

  private openPhotoMaker(): void {
    history.pushState({ view: "photo" }, "", "#photo");
    this.render();
  }

  private openTones(): void {
    history.pushState({ view: "tones" }, "", "#tones");
    this.render();
  }

  private openZen(): void {
    history.pushState({ view: "zen" }, "", "#zen");
    this.render();
  }

  private openSort(): void {
    if (location.hash === "#sort") return;
    history.pushState({ view: "sort" }, "", "#sort");
    this.render();
  }

  private openSortLevel(id: number): void {
    history.pushState({ view: "sort-level", id }, "", `#s=${id}`);
    this.render();
  }

  private openSortZen(): void {
    if (location.hash === "#sort-zen") return;
    history.pushState({ view: "sort-zen" }, "", "#sort-zen");
    this.render();
  }

  private renderSortRoute(): void {
    this.root.className = "app is-gallery";
    const id = sortIdFromHash(location.hash);
    if (!id) {
      this.viewCleanups.push(renderSortHome(this.root, this.sortCtx()));
      return;
    }
    this.viewCleanups.push(renderSortLevel(this.root, id, this.sortCtx()));
  }

  private renderSortZen(): void {
    this.root.className = "app is-gallery is-sort";
    this.viewCleanups.push(renderSortZen(this.root, this.sortCtx()));
  }

  private sortCtx(): SortCtx {
    return {
      soundHtml: this.headerTools(),
      openSort: () => this.openSort(),
      openLevel: (id) => this.openSortLevel(id),
      openZen: () => this.openSortZen(),
      back: () => history.back(),
      say: (message) => this.say(message),
      cue: (kind) => this.playCue(kind),
      haptic: () => haptic(),
    };
  }

  private playCue(kind: Cue): void {
    if (!this.save.sound) return;
    this.audio.start();
    this.audio.cue(kind);
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
