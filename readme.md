# Stream Systems Visual

Generative “starting soon” background for live streams (OBS browser source). Canvas 2D living-systems diagram: sparse graph, signal pulses, slow topology drift, contour/grid field, camera drift.

## Quick start

```bash
npm install
npm run dev
```

Build static assets for OBS:

```bash
npm run build
npm run preview
# or serve dist/ with any static host
```

## URL configuration

| Param | Description | Default |
|-------|-------------|---------|
| `seed` | Deterministic RNG seed | `42` |
| `density` | Graph density `0.15`–`0.85` | `0.45` |
| `speed` | Animation speed multiplier | `1` |
| `title` | Stored on `<html data-title>` (not rendered) | — |
| `subtitle` | `data-subtitle` | — |
| `startingSoon` | `data-starting-soon` (alias: `soon`) | — |

## Routes

| Path | Visual |
|------|--------|
| `/` | Index (pick a visual) |
| `/v/systems` | Living systems diagram |
| `/v/orb-field` | Glowing orb warp field (Three.js + bloom) |
| `/v/flow-ribbons` | Curl-noise flow ribbons (Canvas 2D trails) |
| `/v/resonance` | Interference wave resonance (Canvas 2D) |
| `/v/strata` | Drifting horizontal strata bands (Canvas 2D) |
| `/v/saber` | Glowing energy blade duel (Canvas 2D) |

Add entries in `src/routes.ts` when you create a new visual. The index uses plain `<a href>` links; in-app transitions use the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) (`src/navigation/navigation-api.ts`), not `window.history`.

Orb field uses **Three.js** (`src/visualizations/orb-field/three-scene.ts`). Systems and flow ribbons use Canvas 2D.

Example OBS URL:

```
http://localhost:5173/v/systems?seed=123&density=0.5&speed=0.8
```

Old root URLs with `?seed=` still redirect to `/v/systems`.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space | Pause / resume |
| R | Reseed (random) |
| O | Toggle overlay chrome |
| D | Toggle debug stats |

## OBS

1. Add **Browser** source → local dev URL or `file://` / hosted `dist/index.html`
2. Width/height = stream resolution (e.g. 1920×1080)
3. Add text layers in OBS; optional query params sync to `document.documentElement.dataset` for custom CSS/JS overlays

No on-canvas text by design — add titles in OBS.
