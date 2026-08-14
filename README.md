# DiceMaster

A browser workshop for forging **custom polyhedral dice masters** and exporting them as millimetre-accurate **STL** files for 3D printing. Designed for D&D and other tabletop RPGs: start from a kit, change the typeface, park crests where numbers do not belong, then send the set to a resin printer.

Inspired by [DiceMaker](https://ankhe.itch.io/dicemaker) by ankhee — the desktop tool for engraved dice masters — DiceMaster brings that craft to the web.

## What you can make

- **Standard polyhedral set** — D4, D6, D8, D10, D%, D12, D20
- **Mini** travel sizes
- **Chonk** oversized sets and a dedicated chonk D20
- **Giant** display-scale pieces
- Crystal D4, D2 coin, pip-style D6
- Custom TTF/OTF fonts, 37 built-in OFL faces (fantasy, sci-fi, arcade), SVG/PNG logos, and a symbol vault
- Per-face offset, rotation, scale, underscored 6/9, corner emblems, bumpers, engrave or emboss
- Project save/load (JSON) and STL export (single file or ZIP)

STL units are millimetres (`1` unit = `1` mm). Open the files in Chitubox, Lychee, PrusaSlicer, or similar.

## Develop

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

The app is a Vite + React client. Geometry and CSG engraving run in the browser; nothing is uploaded to a server.

## Fonts

Bundled typefaces are licensed under the SIL Open Font License (37 faces):

- **Print & numerals** — Oswald, Anton, Archivo Black, Alfa Slab One, Bebas Neue
- **Fantasy & historic** — Cinzel, Cinzel Decorative, Uncial Antiqua, Medieval Sharp, Pirata One, Metamorphous
- **Sci-fi** — Orbitron, Audiowide, Michroma, Oxanium, Chakra Petch, Electrolize, Zen Dots, Turret Road, Quantico, Iceberg, Aldrich, Bruno Ace, Geo, Share Tech Mono
- **Arcade & gamer** — Black Ops One, Bungee, Russo One, Press Start 2P, Silkscreen, Goldman, Bangers, Wallpoet, Titan One, Bowlby One SC, Righteous, Changa One

## Symbols

The vault uses filled silhouettes from [Game-icons.net](https://game-icons.net) (Lorc, Delapouite, and contributors), licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Attribution is shown in the workshop and on the homepage. License text: `src/assets/licenses/game-icons.txt`.
