# FUI SCATTER

Browser-only modular SVG composition editor. Serve `dist/` with any static HTTP server.

- Add, duplicate, hide, delete and reorder independent SVG layers.
- English interface. Layers default to `Layer 1`, `Layer 2`, etc. Layer rows show stacking order (topmost first) and contain reorder/duplicate controls.
- SVG import treats object groups and standalone geometry as shapes, skipping exported Illustrator/Inkscape layer containers and single outer wrappers. Layer containers may mix groups and compound paths. Compound objects retain their paths and nested groups, ancestor transforms, opacity, clip paths and strokes. Scripts, raster images and external references are removed. Ambiguous custom nesting should use named object groups.
- Presets: random, mirror X, mirror Y, both mirrors, kaleidoscope, grid.
- Kaleidoscope has 2–32 adjustable rays (four by default), each made of two mirrored wedges; three or six rays give threefold or sixfold rotational symmetry.
- Each layer has one manual global seed and independent offsets for positions, shape selection, size, opacity, rotation and color. A fresh size multiplier is sampled per original placement, including repeated selections of the same SVG shape. All its mirror and kaleidoscope copies inherit that multiplier, along with the other attributes. `Randomize all` generates distinct new seeds for every layer (including hidden layers) and preserves parameter values and fine-tuning offsets.
- Size is a multiplier of original SVG geometry: 1× maps one SVG viewBox unit to one canvas pixel, 0.5× halves dimensions, 2× doubles them. Objects are centered individually without normalizing their width/height; source proportions and relative text heights remain intact. Ancestor transforms are preserved. Density is objects per 10,000 px²; mirrors preserve approximately the same overall density. Kaleidoscope fills the largest inscribed circle. Grid uses rows, columns and seeded fill percentage.
- Size and opacity each have a shared track with minimum/maximum handles and exact numeric fields. Mouse, touch and keyboard changes stay synchronized; crossed bounds move the other endpoint to keep a valid interval.
- The size multiplier UI spans 0.01×–10×, with 0.8×–1.2× defaults for new layers. Raster masks are prepared at each shape's source extent multiplied by its maximum scale and export resolution, then drawn at their original physical extent; PNG and vector preview use the same geometry proportions. The tiny Blender-derived ABC demo SVG is uniformly scaled to conventional SVG units, without changing ratios between its shapes.
- Solid color, random hue offsets, or random sampling from a two-color ramp.
- Normal, additive and multiply blending at object and whole-composition level.
- Geometry and source assets remain vector data. Both settings tabs use a cached Canvas preview with active postprocessing. PNG export renders afresh from the original source geometry at export resolution.
- Bloom (brightness threshold, intensity, radius), followed by red/blue chromatic shift. Directional offset/angle and radial offset can be combined. Radial offset grows from zero at canvas center to the configured distance at the corners. Bilinear sampling and export-scale compensation preserve smoothness and effect proportions.
- Grain is the last effect, with amount, cell size and seed controls. It uses stable monochrome noise, preserves alpha and scales grain cell dimensions with export resolution. Grain is disabled by default.
- PNG export at 1×, 2× or 4× regenerates from vector assets at export resolution and applies active effects.

Limits protect browser memory: canvas dimensions 128–4096 px; output up to 8192 px on one side and 24 megapixels; 24,000 placements per layer. Layer count has no fixed limit. Imported layers and settings currently live in the open browser session; there is no project persistence.

Modules: `engine.js` (seeded placements), `svg-assets.js` (vector import), `render.js` (Canvas rendering, layer cache and effects), `composition-presets.js` (portable presets and local storage), `app.js` (state and interface). See `PRESETS.md` for built-in preset configuration.

`effects.js` contains pure chromatic sampling; `node test-effects.mjs` validates directional/radial displacement, a stationary radial center, opposite red/blue channels, subpixel sampling, green/alpha preservation and export scaling. Engine tests also check three-, four- and six-ray rotational symmetry.

`node test-source-scale.mjs` guards original SVG units, equal-height text with differing widths, 1×/2× multipliers, centering without per-object normalization and raster mask resolution. Engine tests verify identical scale within each mirror/kaleidoscope family and varying scales between independent placements of the same shape.

Validation: `node test-engine.mjs` checks reproducibility, independent offsets, exact mirrored transforms, grid filling and kaleidoscope bounds. Browser QA covers transformed group imports with clip paths, layer addition/visibility, grid controls, color ramps, kaleidoscope, Bloom/chromatic preview and an actual valid 1200×1200 PNG download.

Import regression: `y2k.Badges.svg` contains an Illustrator layer wrapper with eight object groups. Browser import produces eight independent symbols containing 5, 2, 5, 11, 4, 12, 2 and 8 contours respectively; no badge is split into individual contours.

`y2k.Japan.svg` mixes one compound path and four text-shaped groups within the same Illustrator layer. Import produces five independent objects with 1, 7, 2, 4 and 3 contours, preserving each complete inscription. `node test-grain.mjs` checks repeatability, seed changes, monochrome cell structure, alpha preservation and matching grain patterns at different export scales.

## Published application

https://sashamartinsen.github.io/fui-scatter/

The application starts with B1-Verge EP Cover-art. Seven bundled presets are available across B1, Y2K, FUI and UAV, with one built-in default per shape set. Local defaults override bundled defaults only in the visitor's browser. All SVG assets, including repaired visual groups, are bundled.

GitHub Pages serves the `gh-pages` branch. The `main` branch contains the application in `dist/` and its checks. To publish an update after testing, run `git subtree split --prefix dist -b pages-next`, then `git push origin pages-next:gh-pages`. The app uses relative URLs and works under the repository path. No backend or build dependencies are needed.

Canvas resizing uses a fixed 1200 × 1200 composition space. Preset values stay unchanged: placements and edge insets follow width/height ratios, shapes retain uniform proportions using the smaller ratio, and spatial raster effects use that same ratio in preview and PNG export. Density therefore preserves placement count at every output size. `node test-canvas-scaling.mjs` covers every distribution, exact base-size compatibility, square and rectangular output, mirrored scales, deterministic attributes and immutable preset settings.
