# DiceMaster

A browser workshop for forging **custom polyhedral dice masters** and exporting them as millimetre-accurate **STL** files for 3D printing. Designed for D&D and other tabletop RPGs: start from a kit, change the typeface, park crests where numbers do not belong, then send the set to a resin printer.

## What you can make

- **Standard polyhedral set** — D4, D6, D8, D10, D%, D12, D20
- **Mini** travel sizes
- **Chonk** oversized sets and a dedicated chonk D20
- **Giant** display-scale pieces
- Crystal D4, D2 coin, pip-style D6
- Maker tokens (coin, shield, hex, octagon, diamond, triangle, almond) at 25×3.5mm
- Custom TTF/OTF fonts, 37 built-in OFL faces (fantasy, sci-fi, arcade), SVG/PNG logos, and a symbol vault
- Per-face offset, rotation, scale, 6/9 orientation marks (underline, dot, or arrow), corner emblems, bumpers, engrave or emboss
- Project save/load (JSON) and STL export (single file or ZIP)
- Packed plate STLs sit vertex-down (tokens on a rim) with an 8 mm support-tree gap for resin auto-supports

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

The app is a Vite + React client with a small Node account API. Geometry and CSG engraving still run in the browser. Sign in to keep sets, logos, fonts, and workshop position in a private vault; guests keep working in local storage.

## Accounts and vault

```bash
npm install
npm run dev
```

This starts the workshop on port 5173 and the account API on port 8787 (`/api` is proxied). Data lives in `./data` (override with `DATA_DIR`). After `npm run build`, `npm start` serves the API and the built site together.

- **Sign up / Sign in** — cookie session (30 days) after email confirmation. New passwords need 12+ characters with mixed case, a number, and a symbol. Confirm the password on sign-up. Returning visits restore the last set, selected face, and panel.
- **Google** — optional. Set `GOOGLE_CLIENT_ID` (a Google Cloud OAuth Web client) and add this origin to Authorized JavaScript origins. The workshop then shows Continue with Google on `/login` and `/signup`. Google accounts are treated as verified. Existing email accounts with the same address are linked.
- **Profile** — `/account` to change display name, email, or password.
- **Saved sets** — named snapshots in your vault; Save to vault from the workshop.
- **Logos and fonts** — uploads are stored as blobs per account and can be reused across sets.

Guest mode still works offline. Creating an account copies the current local set into the vault after you confirm your email.

Verification mail is sent with Resend from `admin@readywriter.one` (override with `DICEMASTER_FROM_EMAIL` / `RESEND_API_KEY`). Sign-in reminds you if the address is still unconfirmed.

## Admin console

First boot creates an administrator:

- Email: `admin@dicemaster.local`
- Password: `ForgeMaster#1`

Open `/admin/login` (or the **Admin** button once signed in). Change that password immediately. Override the seed with `ADMIN_EMAIL` and `ADMIN_PASSWORD` before the first start.

The console can:

- Create, disable, promote, and delete user accounts
- Publish banner announcements visible to every visitor
- Hide or add site-wide fonts (TTF/OTF) and symbols (SVG paths)

Hidden bundled faces stay off the picker but still render on existing dice.

## Fonts

Bundled typefaces are licensed under the SIL Open Font License (37 faces):

- **Print & numerals** — Oswald, Anton, Archivo Black, Alfa Slab One, Bebas Neue
- **Fantasy & historic** — Cinzel, Cinzel Decorative, Uncial Antiqua, Medieval Sharp, Pirata One, Metamorphous
- **Sci-fi** — Orbitron, Audiowide, Michroma, Oxanium, Chakra Petch, Electrolize, Zen Dots, Turret Road, Quantico, Iceberg, Aldrich, Bruno Ace, Geo, Share Tech Mono
- **Arcade & gamer** — Black Ops One, Bungee, Russo One, Press Start 2P, Silkscreen, Goldman, Bangers, Wallpoet, Titan One, Bowlby One SC, Righteous, Changa One

## Symbols

The vault uses filled silhouettes from [Game-icons.net](https://game-icons.net) (Lorc, Delapouite, and contributors), licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Attribution is shown in the workshop and on the homepage. License text: `src/assets/licenses/game-icons.txt`.
