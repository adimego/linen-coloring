# Linen

A quiet color-by-number book, plus a gentle match game, for your phone. In Color, each region has a number and a color that belongs to it. Tap the matching swatch, then tap the region. In Match, swap pastel pieces to uncover a finished picture. There are no ads, no timers, and no way to lose. Progress stays in this browser.

The gallery is a soft pink room. Each card shows the finished picture. Open one and the page becomes a numbered line drawing on warm paper.

## Pictures

Music and Relaxing Landscapes are adapted from public-domain art on Wikimedia Commons: instrument still lifes, an Art Nouveau music poster, Japanese prints of musicians, and Hiroshige and Hokusai landscapes. The other pages are original illustrations drawn for Linen — not copied from another coloring app. Beach, city, and peaceful places sit beside animals, flowers, mandalas, landscapes, food, butterflies, birds, and home. Every page has its own palette, about 10–28 numbered colors, and about 120–220 regions. Broad areas such as sky, water, petals, and hills are split into a few smooth light-to-dark bands that follow the shape. Simple subjects stay nearer the low end rather than being filled with extra pieces. The smallest region is still large enough to tap on a phone. Sources are listed on the Image credits screen and in [CREDITS.md](CREDITS.md).

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
- The speaker button plays a soft generated tone (Web Audio only — no recordings). The same mute setting covers Color, Match, Sort, and Zen. The waves button opens soundscapes: rain, ocean, birdsong, piano, forest, or the original Linen drone, plus a volume slider. The choice is saved in `localStorage` under `linen.settings.v1`.
- The sun, moon, or monitor button cycles Light, Night, and System. Night is a warm dim room. The picture paper stays the same color so the art does not invert. That choice is in `linen.settings.v1` too.
- Coloring progress and the mute setting save themselves in `localStorage` under `linen.coloring.v2`.

## Match

The home page has Color, Match, and Sort tabs. Match is a quiet match-3: drag or tap two pieces that touch. The two pieces slide past each other, and a swap that does not match slides back. A line of three or more shells, flowers, tulips, gems, leaves, or hearts glows, then pops with a small sparkle in that piece’s color, a soft chime, and a light vibration when the phone allows it. Mute turns the chime off. The pieces underneath slide down into the gaps and new ones fall from above, with a small settle as they land. A chain plays one step at a time. If the phone asks for less motion, matched pieces fade instead. Each level sits over one of Linen’s original pictures. Tiles start under leaves or dust; a match lifts the cover on those tiles, and a few later levels have a second layer. The level is won when the whole board is uncovered. There is no clock, no lives, and no fail state. If no swap is left, the pieces reshuffle themselves. After a few quiet seconds a possible swap glows. Twenty levels open one by one, from a small square to shaped boards. Progress saves in `localStorage` under `linen.match.v1`, separate from coloring, and the same pages work offline once the app is installed.

Zen, on the Match home page, is the same pieces with no levels and no goal. Matches refill the board. Pause stops the board and the hint. Today’s picture can fade in slowly behind the pieces.

## Sort

Sort is a quiet pouring puzzle on the same home page. Vases hold sea glass, beads, petals, candies, gems, and the other pastel pieces drawn for Linen. Tap a vase to lift the top run of one color, then tap another. They pour across if that vase is empty or its top color matches, and only as many as will fit. A table is finished when every vase is a single color or empty. A finished vase gets a lid and a small sparkle, and the pieces clink as they land. Mute turns the clink off. If the phone asks for less motion, the pieces fade into place instead of arcing.

There is no clock and no way to lose. Undo, Again, and a hint (the next pour a solver would make) are always there, and each table can add one empty vase. One hundred ten tables are made on the phone and checked with a solver before they open, from four colors up to twelve, with fewer spare vases as you go. Later tables sometimes hide buried pieces until they reach the top, or include a narrower vase or a taller one. Tables open one by one. Progress saves in `localStorage` under `linen.sort.v1`, separate from coloring and Match. Zen Sort deals another solvable table whenever you ask.

## Daily pictures

From 22 October 2026, each calendar day has one picture. It is built on the phone from that date, so the same day is the same picture everywhere, and older days can be opened again from Daily. Twenty gallery drawings take turns — the monarch, the cat, the tea table, the flamingo, the peony, the cherry tree, and the rest — so the same scene does not return within a week. The next visit recolors that drawing for dawn, day, dusk, or night, and night also turns it around. The regions are the gallery paths, bands included, about 166–210 a page. Today sits at the top of the color home. Coloring progress uses the same save as the rest of the book.

## Your photo

Your photo picks or takes a picture and turns it into a numbered page on the device: it is scaled, posterized, and merged so regions stay large enough to tap. A slider asks for fewer or more regions. The page is kept in My photos on this phone (IndexedDB). Delete removes the page and its coloring progress. The file is never uploaded.

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
- `src/app.ts` — gallery, coloring screen, match screens, and controls
- `src/match` — match-3 rules, twenty levels, and saved progress
- `src/sort` — vase-sort rules, the solver, 110 tables, and saved progress (`npm run test:sort`)
- `src/gestures.ts` — tap, pan, pinch, and find-next zoom
- `src/audio.ts` — generated beds: the Linen drone, rain, ocean, birds, piano, and forest
- `src/daily` — date-seeded pictures and the quality gate (`npm run test:daily`)
- `src/photo` — on-device posterize and the My photos store
- `src/settings.ts` — theme, soundscape, and volume
- `src/state.ts` — undo, redo, and `localStorage`
- `vite.config.ts` — emits the service worker into the production build
