# Neon Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/butterscotchcode/neon-coast-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/butterscotchcode/neon-coast-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns any photo and a caption into GTA 6-style
poster cover art — the multi-panel poster look with bold lettering and a
Vice City sunset or neon colour grade — and exports it as a PNG to share.

Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
bounty on [make.fun](https://make.fun).

## What it does

- **Any photo**: add your own photos from your machine, or use the four
  built-in Vice City scenes. Click a panel to select it, drag to move the
  photo, scroll to zoom. Fill several panels with one photo or several.
- **Six layouts**: Palm Grid (3×3), Hero + Three, Sunset Sleeve, Vice Duo,
  Full Bleed and Tilted Snapshots (polaroid prints).
- **Five grades**: Sunset, Neon Night, Palm Dusk, Golden Hour and Noir —
  each sets the background, the panel tint and the title colours.
- **Caption**: edit the big title, the script subtitle, the badge ribbon
  and the five-star heat meter.
- **Fast export**: one click writes a PNG in 1080×1080, 1080×1350 or
  1920×1080. Undo and redo are one key away (Ctrl+Z / Ctrl+Shift+Z).
- **100% offline**: every file the app loads lives under `app/`; photos
  are read on your own machine and never uploaded.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## How it is built

- `app/index.html` + `app/style.css` — the editor page.
- `app/src/cover.js` — the cover renderer: background grade, panels,
  title block, badge ribbon, heat meter and print grain, all on canvas.
- `app/src/layouts.js` — the six layouts, each a pure function of the
  cover size, so every export size gets the same composition.
- `app/src/main.js` — the editor: state, undo/redo, drag and zoom,
  photo uploads and the PNG export.
- `app/src/shots.js` — `?shot=cover` mode: paints one exported cover
  full-frame so headless Chrome can screenshot it.
- `app/fonts/` — Anton and Pacifico under the SIL Open Font License
  (their OFL texts sit beside them).
- `app/samples/` — four built-in Vice City scenes.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` with `vendor/makefun-app.ts`.
- `screenshots/` — the cover and the editor, as the judge sees them.

No Rockstar Games logo, artwork or font is used anywhere: the lettering
is Anton and Pacifico, the scenes are original flat illustrations, and
every title is invented.

## License

MIT — see [LICENSE](LICENSE). Fonts under the SIL Open Font License 1.1.
