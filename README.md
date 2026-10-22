# Linen

A quiet color-by-number book for your phone. Each region has a number and a color that belongs to it. Tap the matching swatch, then tap the region. There are no ads and no timers. Progress stays in this browser.

The gallery is a soft pink room. Each card shows the finished picture. Open one and the page becomes a numbered line drawing on warm paper.

## Pictures

Music and Relaxing Landscapes are adapted from public-domain art on Wikimedia Commons: instrument still lifes, an Art Nouveau music poster, Japanese prints of musicians, and Hiroshige and Hokusai landscapes. The other pages are original illustrations drawn for Linen — not copied from another coloring app. Beach, city, and peaceful places sit beside animals, flowers, mandalas, landscapes, food, butterflies, birds, and home. Every page has its own palette and about 100–300 regions. Sources are listed on the Image credits screen and in [CREDITS.md](CREDITS.md).

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The layout is meant for a phone held upright. On a computer, use a narrow window or the device toolbar.

## How to play

- Pick a category, then a picture.
- The palette is numbered. The selected color highlights every region that still needs it, and the bar under the tools shows how many of those regions are filled.
- Tap a region with the right number and it fills. A wrong number shakes the page and leaves the region empty. There is no free-color mode and no eraser.
- When a color is finished, the next unfinished color is selected for you.
- Find zooms to an open region of the selected color. Pinch to zoom and drag to move. Minus, plus, and Fit do the same.
- Undo and redo sit in the top bar.
- When the last region is filled, the numbers and outlines fade and the finished picture stays in the gallery.
- Save PNG downloads the picture, or opens the share sheet when the phone supports it.
- The speaker button plays a soft generated tone (Web Audio only — no recordings).
- Progress and the sound setting save themselves in `localStorage` under `linen.coloring.v2`.

## Install and play offline

```bash
npm run build
npm run preview
```

Production builds use the base path `/linen-coloring/`, so preview serves the app at [http://127.0.0.1:43123/linen-coloring/](http://127.0.0.1:43123/linen-coloring/). That is the same path as the GitHub Pages site, [https://adimego.github.io/linen-coloring/](https://adimego.github.io/linen-coloring/). The manifest `start_url` and `scope` are `/linen-coloring/`, and the service worker is registered there. Pushes to `main` deploy `dist` with GitHub Actions.

The production build is an installable PWA. Add it to your home screen from the browser. The service worker caches the app after the first visit, so it opens again without a network.

## Wrap it with Capacitor later

`capacitor.config.json` points `webDir` at `dist`. The Pages build uses an absolute `/linen-coloring/` base, so a native wrap needs a separate build with `base` set to `./`. From this folder:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

Then open the native project with `npx cap open ios` or `npx cap open android`. iOS does not support vibration; the rest of the app still works there.

## Project map

- `src/pictures` — original color-by-number pages and their palettes
- `scripts/make_pages.py` — redraws the original pages
- `scripts/trace_landscapes.py` — rebuilds Relaxing Landscapes from the public-domain prints
- `scripts/trace_music.py` — rebuilds Music from the public-domain artworks
- `CREDITS.md` — authorship for every page
- `src/app.ts` — gallery, coloring screen, and controls
- `src/gestures.ts` — tap, pan, pinch, and find-next zoom
- `src/audio.ts` — the generated ambient tone
- `src/state.ts` — undo, redo, and `localStorage`
- `vite.config.ts` — emits the service worker into the production build
