# Neon Coast — Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/butterscotchcode/neon-coast-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/butterscotchcode/neon-coast-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn any photo and a caption into GTA-style multi-panel poster cover art,
offline in your browser. Your photos never leave your machine.

## What it does

- **Six layouts** — nine-panel Palm Grid, Hero + Three, Sunset Sleeve,
  Vice Duo, Full Bleed, and Tilted Snapshots (polaroid frames).
- **Five colour grades** — Vice Sunset, Neon Nights, Palm Gold, Ocean Dusk,
  Noir Heat — plus film grain and a vignette on every cover.
- **Any photo** — add your own photos, crop and position each panel by
  dragging (scroll to zoom), fill several panels with one photo or several.
- **Bold lettering** — Anton display titles with sunset-gradient, neon-glow
  or solid-white lettering, a Pacifico neon script subtitle, a badge ribbon
  and a five-star heat meter.
- **Fast export** — one click exports all three post sizes as PNGs:
  1080 × 1080, 1080 × 1350 and 1920 × 1080.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: every script, font and sample scene is
a file under `app/`.

## Entry

Built for the [make.fun](https://make.fun/bounty/gta6-cover-art-01) competition `gta6-cover-art-01`. `main.ts` (Node 22)
copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Credits

- Lettering: Anton and Pacifico, SIL Open Font License (licences in
  `app/fonts/`).
- Sample scenes: original flat illustrations drawn with code.
- No Rockstar Games logo, artwork, character or font is used anywhere.
