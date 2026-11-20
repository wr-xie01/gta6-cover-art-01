# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wr-xie01/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/wr-xie01/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An entry for [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01): an offline web app that turns a photo and a caption into GTA 6-style cover art — a multi-panel poster with bold caption lettering and a sunset or neon colour grade — and exports it as a PNG to share.

## What it does

- **Any photo**: load your own photos from your machine, or use the two included samples. Click a panel to select it, drag it to reposition the photo, and zoom the selected panel.
- **Four layouts**: a four-panel grid, a hero panel with three small ones, a full-bleed single photo, and a nine-panel mosaic. Fill several panels with one photo or several.
- **Five colour grades**: Original, Vice Sunset, Neon Nights, Golden Hour and Noir, each a luminance ramp baked into the photo.
- **Bold caption**: a gradient Anton title with a white outline, a Yellowtail neon script subtitle, and a dark scrim band so the lettering reads over any photo.
- **Fast export**: one click renders the cover at full size and downloads the PNG in Square 1080 × 1080, Portrait 1080 × 1350 or Wide 1920 × 1080.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Everything is static files under `app/` — no build step, no network request. Photos are read on your own machine and never uploaded. The two sample photos (`app/samples/`) were made with an image model for make.fun and are free to use. The fonts are Anton (SIL Open Font License 1.1) and Yellowtail (Apache License 2.0); both licence texts ship under `app/fonts/`.

## Originality

Nothing here is Rockstar's: no logo, wordmark, official artwork, character or font. The sun mark, the wordmark, the layouts, the grades and every line of code are the maker's own.
