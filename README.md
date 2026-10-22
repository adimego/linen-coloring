# Linen

A quiet coloring book for your phone. Tap a region, fill it with a pastel, and pick it up again later. There are no ads and no timers. Progress stays in this browser.

The gallery is a soft pink room. Each picture opens on warm paper so the colors stay easy to see.

## Theme packs

Two packs of original line art, drawn as dense adult coloring pages: fine interior patterns, floral and geometric fills, and a repeating border. They are inspired by a mood, not by official artwork. There are no portraits, likenesses, logos, album covers, or lyrics, and the app is not affiliated with either artist. Pinch in when a region is small.

**Taylor Swift** — concert lights, a sparkly acoustic guitar, friendship bracelets, two cats, a snake in flowers, a cardigan, and a mirrorball.

**Old Dominion** — a pickup on a country road, a hat and boots, a banjo and guitar, a water tower at sunset, a bonfire under string lights, and a sailboat.

Switch packs with the buttons at the top of the gallery.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The layout is meant for a phone held upright. On a computer, use a narrow window or the device toolbar.

## How to play

- Choose a pack, then a picture.
- Tap a pastel, then tap a region. The fill eases in. Phones that support `navigator.vibrate` give a short tap.
- Pinch to zoom and drag to move around small spots. The minus, plus, and Fit buttons do the same thing.
- Undo and redo sit in the top bar. Erase clears a region.
- Numbers turns on color-by-number hints. The numbers match the swatches in the current palette.
- Petal, Lake, Dusk, Meadow, and Moon are swappable pastel sets. Colors you already placed stay put.
- The speaker button plays a soft generated tone (Web Audio only — no recordings).
- When every region is filled, the picture is marked Finished in the gallery.
- Save PNG downloads the picture, or opens the share sheet when the phone supports it.
- Progress, the palette, hints, and the sound setting save themselves in `localStorage`.

## Install and play offline

```bash
npm run build
npm run preview
```

The production build is an installable PWA. Add it to your home screen from the browser. The service worker caches the app after the first visit, so it opens again without a network.

## Wrap it with Capacitor later

Asset paths are relative, and `capacitor.config.json` already points `webDir` at `dist`. From this folder:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

Then open the native project with `npx cap open ios` or `npx cap open android`. iOS does not support vibration; the rest of the app still works there.

## Project map

- `src/pictures` — the SVG regions for both packs, plus the palettes
- `src/app.ts` — gallery, coloring screen, and controls
- `src/gestures.ts` — tap, pan, and pinch
- `src/audio.ts` — the generated ambient tone
- `src/state.ts` — undo, redo, and `localStorage`
- `vite.config.ts` — emits the service worker into the production build
