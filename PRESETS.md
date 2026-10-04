# Composition presets

Save as creates a named local preset and downloads a `.scatter.json` file. Update replaces the selected local preset and downloads the updated file. Import validates and resolves every SVG before replacing the current composition. All layer settings, order/visibility, canvas settings, export scale, seed offsets, Echo and post effects are included. Built-in library assets use stable IDs; other assets include original SVG source.

Local presets live in the visitor's IndexedDB, scoped to the site origin. Save as default snapshots the current composition into IndexedDB and stores its per-shape-set preference in localStorage. It updates a selected local preset, or creates an editable default copy from Standard / a built-in preset. Neither is uploaded to the Site automatically. Keep downloaded files as portable backups.

## Promote selected files to built-in presets

Copy the user's chosen `.scatter.json` files into `dist/presets/`. Add metadata to `dist/presets/manifest.json`, for example:

```json
[
  {"id":"b1-red-signal","name":"Red Signal","shapeSet":"b1","url":"presets/b1-red-signal.scatter.json","default":true}
]
```

Supported shape sets: `b1`, `y2k`, `fui`, `uav`, or `custom`. The JSON's `shapeSet` must agree with its manifest metadata. Use at most one built-in default per set. A visitor's explicitly selected local default overrides it. Built-in presets are read-only originals; Save as makes an editable local copy. Publish the Site through its normal workflow after updating files and manifest.

## Canvas preview

Both settings tabs show the same Canvas composition including active post effects. Original SVG geometry remains available for a fresh render at export resolution. Preview transparent layers are cached under a 96 MiB budget; settings/seed/source/resolution changes invalidate the affected layer, while global background and blending reuse transparent layer images. The base composition is cached separately from post effects. Pixel effects currently run on the main thread; this is Canvas 2D caching, not a GPU shader pipeline.

Validation: `node test-presets.mjs`, existing engine/source-scale/effects tests, plus the local browser integration checks for pixel equality, cache invalidation, import handler and portable embedded SVGs.

Pixel / CRT Display combines pixel averaging, unsharp contrast, scanlines, RGB phosphor mask and vignette. Its controls are included in local and portable presets. All sizes follow canvas units at export scale.
