# Architecture

This document explains how a holo card is built: what the tracker computes, how the layers are stacked, and how a rank is put together.

## The idea

JavaScript draws nothing. `bindTilt` turns the pointer position into six custom properties on the card root and eases them with a spring. Everything visible is CSS: a stack of translucent layers in one grid cell, each reading those properties and blending onto the layers below it. A rank changes only CSS, so a new kind of foil is a new stylesheet, not new code.

## Files

- `src/core/types.ts` — `RANKS` in rarity order, `HoloCardData`, default rank labels.
- `src/core/render.ts` — `renderCard`: builds the markup in the right layer order.
- `src/core/tilt.ts` — `bindTilt`: pointer and gyroscope tracking.
- `src/core/viewer.ts` — `openViewer`: the full-screen view with the flight animation.
- `src/core/index.ts` — `mountHoloCard` and the public exports.
- `src/styles/card.css` — geometry, layers, typography, gem, tier pips.
- `src/styles/ranks/*.css` — one file per rank.
- `src/styles/viewer.css` — the full-screen viewer.
- `src/textures/` — generated textures; `scripts/gen-textures.py` rebuilds them.

## What the tracker writes

| Property                     | Range          | Meaning                                |
|------------------------------|----------------|----------------------------------------|
| `--hc-px`, `--hc-py`         | 0–1            | pointer position inside the card       |
| `--hc-tilt-x`, `--hc-tilt-y` | ±`maxTilt` deg | rotation around the X and Y axes       |
| `--hc-active`                | 0–1            | 0 at rest, 1 while the card is handled |
| `--hc-dist`                  | 0–1            | pointer distance from the centre       |

The stylesheet derives everything else with `calc()`: gradient centres (`--hc-pointer`), texture offsets for parallax, the position of the art and of the glint on the gem.

While the pointer is over the card it has the class `is-active`, which turns on the coloured edge glow.

## Motion

- Each frame the current value covers a share of the distance to the target: 0.16 while the card is handled, 0.075 when it settles back. The card follows quickly and lands softly.
- The animation loop stops once every value is within 0.0005 of its target, so a resting card costs nothing.
- On phones the same channels are fed from `deviceorientation`; a pitch of about 40° is treated as neutral, the way a phone is held.
- With `prefers-reduced-motion: reduce` the tracker does not bind, and CSS animations are switched off.

## Layer stack

All children of `.hc-card__tilt` share one grid cell and are stacked by `z-index`:

| Layer               | z-index | Role                                           |
|---------------------|---------|------------------------------------------------|
| `.hc-card__face`    | auto    | frame, panel, art window, text, footer         |
| `.hc-card__grain`   | 2       | grain of the material                          |
| `.hc-card__foil`    | 3       | the rank effect, plus `::before` and `::after` |
| `.hc-card__glare`   | 4       | light that follows the pointer                 |
| `.hc-card__subject` | 5       | floating art, above the foil                   |
| `.hc-card__jewel`   | 6       | the rank gem set into the frame                |

The tilt element rotates as one flat plane. Inside a `preserve-3d` context browsers composite each layer separately and blend modes then apply only some of the time, so layers blink or disappear. Depth between layers is drawn with parallax instead: a layer that should look deeper shifts against the pointer, a layer in front shifts with it.

The order in the DOM is part of the effect. Floating art is rendered after the glare, so the foil does not tint it and it stays solid above the shimmer. Up to `rare` the art sits inside the window, and the foil and glare are masked out of the window, so the effect lives on the frame. From `epic` up the mask is removed and the foil covers the whole card.

A layer with a mask or with opacity below 1 is an isolated group: blend modes of its pseudo-elements mix only with the layer's own content. When a pseudo-element must blend with the card underneath, put the blend mode on the layer itself.

## Anatomy of a rank

A rank file sets tokens on `.hc-card[data-rank="<rank>"]` and, if it has a foil, styles `.hc-card__foil` and its pseudo-elements.

| Token                                                          | Used for                            |
|----------------------------------------------------------------|-------------------------------------|
| `--hc-frame`, `--hc-frame-blend`                               | outer bezel                         |
| `--hc-panel`, `--hc-panel-shadow`                              | inner panel                         |
| `--hc-window`, `--hc-window-line`                              | art window                          |
| `--hc-ink`, `--hc-copy`, `--hc-muted`, `--hc-line`             | text and rules                      |
| `--hc-edge`, `--hc-glow`, `--hc-pip`                           | active edge, glow, filled tier pips |
| `--hc-gem`, `--hc-gem-light`, `--hc-gem-dark`, `--hc-gem-glow` | the gem                             |
| `--hc-grain`, `--hc-glare`                                     | strength of the grain and the glare |
| `--hc-rest-shadow`                                             | shadow and glow at rest             |

To add a rank:

1. Copy a file in `src/styles/ranks/`, rename the selector and import it in `src/styles/index.css`.
2. Set the tokens above.
3. Describe the foil. Tie its strength to `--hc-active`, or it will show at rest.
4. Decide whether the foil should skip the window. To cover the whole card, set `mask: none` on the foil and the glare.
5. Add the rank to `RANKS` in `src/core/types.ts` at its place in the rarity order. From `epic` up the art floats automatically.
6. Switch off any idle animation under `prefers-reduced-motion: reduce`.
