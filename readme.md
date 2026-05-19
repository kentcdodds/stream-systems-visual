# Stream Systems Visual

Generative “starting soon” backgrounds for live streams (OBS browser source). Fifteen full-screen Canvas 2D visuals with shared `seed`, `density`, and `speed` URL params.

## Quick start

```bash
npm install
npm run dev
```

Build static assets for OBS:

```bash
npm run build
npm run preview
```

## URL configuration

| Param | Description | Default |
|-------|-------------|---------|
| `seed` | Deterministic RNG seed | per visual |
| `density` | Scene density `0.15`–`0.85` | per visual |
| `speed` | Animation speed multiplier | per visual |
| `scale` | Extra layout multiplier on top of resolution scaling (`0.5`–`2`) | auto from viewport |
| `dpr` | Canvas pixel ratio cap for sharpness (`1`–`3`) | `min(devicePixelRatio, 2)` |
| `title` | Stored on `<html data-title>` (not rendered) | — |
| `subtitle` | `data-subtitle` | — |
| `startingSoon` | `data-starting-soon` (alias: `soon`) | — |

### Cycle slideshow (OBS)

Open **`/cycle`** — fullscreen random rotation through all visuals. No button click required.

| Param | Description | Default |
|-------|-------------|---------|
| `interval` | Seconds per visual (alias: `seconds`) | `10` |

**OBS browser source URL:**

```
https://your-host/cycle?interval=10
```

Uses View Transitions crossfades. Single history entry on `/cycle` (no per-visual routes in the stack). Refresh to stop.

Legacy `/?cycle=1&interval=10` redirects to `/cycle?interval=10`.

## Routes

| Path | Visual |
|------|--------|
| `/` | Index (pick a visual) |
| `/cycle` | Random visual slideshow (OBS) |
| `/v/systems` | Living systems diagram |
| `/v/flow-ribbons` | Curl-noise flow ribbons |
| `/v/resonance` | Interference wave resonance |
| `/v/strata` | Drifting horizontal strata |
| `/v/saber` | Energy blade duel |
| `/v/ember` | Rising embers |
| `/v/sonar` | Sonar rings |
| `/v/mesh` | Drifting node mesh |
| `/v/void` | Starfield and comets |
| `/v/weave` | Moiré sine weave |
| `/v/pulse` | Grid pulse waves |
| `/v/aurora` | Vertical aurora veils |
| `/v/sparks` | Electric arcs |
| `/v/drift` | Soft bokeh drift |
| `/v/contour` | Contour heightfield |

Register new visuals in `src/routes/route-config.ts` and `src/routes.ts`.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space | Pause / resume |
| R | Reseed (random) |
| O | Toggle overlay chrome (systems) |
| D | Toggle debug stats (systems) |

## OBS

1. Add **Browser** source → dev URL or hosted `dist/`
2. Set **Width** and **Height** to your stream canvas (e.g. `3840`×`2160` for 4K, `1920`×`1080` for 1080p)
3. Enable **Control audio via OBS** if you use background music
4. Text layers in OBS; query params sync to `document.documentElement.dataset`

Visuals scale from a **1080p reference**: at 4K, strokes, links, and particle sizes grow with the viewport so the scene stays full-frame, not tiny. Optional fine-tune: `?scale=1.1` or `?dpr=2` (heavier GPU).

No on-canvas text by design.
