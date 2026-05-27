# Principles of visualizations

Guidelines for building and reviewing visuals in **Stream Systems Visual**. The app targets OBS browser sources: fullscreen generative backgrounds for “starting soon” and scene transitions—not interactive demos or data dashboards.

**Agents:** When a user gives durable preferences or corrections, update this document in the same session (see [AGENTS.md](../AGENTS.md)). Do not wait to be asked.

## Purpose

- **Ambient, not attention-grabbing.** Motion should feel calm and satisfying at a glance, not busy or anxious.
- **Readable behind overlays.** Streamers add title, webcam, and chat in OBS. The canvas stays free of text; copy lives in `data-*` attributes for external layers.
- **Deterministic when seeded.** Same `seed`, `density`, and `speed` must reproduce the same scene for debugging, thumbnails, and shareable URLs.
- **Resolution-agnostic.** Layout must fill 1080p and 4K canvases without tiny islands of content in a corner.

## Technical constraints

| Rule | Why |
|------|-----|
| **Canvas 2D only** | Single rendering path, predictable in OBS browser sources. |
| **No on-canvas text** | Text is OBS’s job; avoids font/DPI issues. |
| **Sim state in refs** | Per-frame updates must not go through React state. |
| **`requestAnimationFrame` loop** | Use `useAnimationLoop`; cap `dt` (already done in the hook). |
| **Lazy route chunks** | Each visual is a separate import in `routes.ts`. |

## Visual language

- **Dark, low-contrast base.** Backgrounds sit around `#050608`–`#080a0c`. Catalog engines use `palettes.ts`; hand-tuned visuals follow the same restraint as `rendering/palette.ts`.
- **`globalCompositeOperation = 'lighter'`** for glows, particles, and lines—keeps highlights soft on dark fields.
- **Semi-transparent trail clears** instead of full clears every frame: opaque fill on `firstFrame`, then `rgba(bg, ~0.15)` overlay for motion blur. Reset `firstFrame` on resize/buffer reset.
- **Hue accents, not rainbow noise.** Prefer one family of hues per visual with modest variation (`hue + offset`), not unrelated colors per particle.

## Motion and simulation

- **Infinite or self-cycling.** Particles and effects should spawn and despawn (or loop) so nothing piles up at a single point (e.g. vortex center) or stalls off-screen.
- **Slope/pile sims must keep moving.** When grains or particles settle on a surface, recycle resting ones back to an emitter and keep a steady drip—do not let the scene freeze after the initial fall.
- **Speed scales with `speed` param and layout `scale`.** Use `scaled(value, state.scale)` from `resolution-scale.ts` for distances, velocities, and stroke widths.
- **Density drives counts, with caps.** Use helpers like `particleCount(density, base, spread, max)`—never unbounded loops over viewport pixels at full resolution.
- **All randomness through `createRng(seed)`** and `rng.fork(salt)` so respawns and layout stay reproducible.
- **Path tracers:** When a trail is drawn as one polyline, break the stroke on long nearly-collinear runs (do not `lineTo` across them) so parametric curves do not cut chords through dense knots.

## Layout and performance

- **Fill the viewport.** Grid-based visuals (hex, pulse, etc.) must compute columns/rows or cell size from `width`/`height`, center the field, and avoid fixed pixel offsets that only work at one resolution. **Feature size** (flame height, ripple radius, branch length, fabric wave amplitude, etc.) should use fractions of `Math.min(width, height)` — not reference-pixel ranges like `scaled(60, 130)` that stay tiny on large canvases.
- **Cap expensive work.** Examples: grid cells ≤ ~32×32 logical units; mesh nodes ≤ ~36; ring lists trimmed; no per-frame `getImageData` over full canvas unless downsampled (see resonance).
- **Avoid per-particle gradients when count is high.** Simple arcs or strokes for dense particle fields; reserve `createRadialGradient` for smaller counts (orbs, ember).
- **DPR capped at 2 by default** (`readCanvasDpr`). Document if a visual needs `?dpr=` for crisp 4K.

## URL parameters

Shared params (`config/params.ts`):

- **`seed`** — Mulberry32 RNG root.
- **`density`** — Typically `0.15`–`0.85`; maps to counts/spacing.
- **`speed`** — Animation multiplier.

Sync to `document.documentElement.dataset` for OBS/browser tooling. Per-visual defaults via `createVisualParamsReader` in `config/*-params.ts`.

## Two ways to add a visual

### Hand-tuned (preferred for flagship looks)

1. Implement `create` / `step` / `draw` (+ optional `resize`) under `src/visualizations/<name>/`.
2. Thin page with `createCanvasVisualPage` in `src/pages/<name>-visual-page.tsx`.
3. Register in `src/routes/route-config.ts` and lazy `visualizationPagesById` in `src/routes.ts`.

### Catalog (shared engines)

1. Add or extend an engine in `src/visual-catalog/engines.ts`.
2. Add **one** row to `CATALOG_SEEDS` in `catalog-definitions.ts`—only if the look is **not** already covered by a hand-tuned visual.
3. Do **not** add five palette swaps of the same motion; one distinctive variant per engine.

**Overlap to avoid:** catalog `particles` vs Ember/Cascade, `rings` vs Sonar, `orbs` vs Drift, `grid` vs Pulse, `lines` vs Weave, `veils` vs Aurora, `contours` vs Contour, `stars` vs Void, `mesh` vs Mesh, `waves` vs Strata. Starfield + shooting comets belong in **Void** only—do not add a separate catalog comet visual.

## Review checklist

Before merging a new or changed visual:

- [ ] Fills the frame at 1920×1080 and 3840×2160 (or intended aspect).
- [ ] Runs indefinitely without clumping, freezing, or empty regions after ~30s.
- [ ] Stable at `speed=0` (pause) and reasonable at `speed=2`.
- [ ] Same URL params → same frame after reload.
- [ ] No runaway CPU from particle count or O(n²) links on large N.
- [ ] Distinct from an existing route (motion **and** composition, not just hue).
- [ ] Homepage thumbnail updated: `npm run capture-thumbnails` (or `:only` after build). The capture script waits several seconds for the canvas to warm up and polls pixel brightness before screenshotting; pass route ids to recapture specific tiles.

## Navigation and OBS integration

- Arrow keys step through `visualizationRouteConfigs` order (disabled in `/cycle` via `suppressNavigation`).
- `/cycle` crossfades between visuals for slideshow mode.
- Keyboard: Space pause, R reseed, arrows prev/next.

## What we optimize for

| Optimize | De-prioritize |
|----------|----------------|
| Long-run ambient viewing | Interactive UI on canvas |
| OBS static hosting | WebGL-only effects |
| Small bundle per route | One-off 100-variant catalogs |
| Shareable URLs | Saving state server-side |

When in doubt, compare against **Ember**, **Sonar**, or **Hex Pulse**: calm density, full-frame layout, continuous motion, and clear identity in under three seconds.
