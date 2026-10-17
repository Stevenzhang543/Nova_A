# Nova_A 4.4 sprites, TileMap, composition, and fonts

## Sprites and atlases

Image import exposes color space, filtering, mipmaps, compression, pixel-art mode, transparency, pixels per unit, pivot presets, manual/grid/automatic slicing, transparent trim, nine-slice borders, polygon outline, collision generation, animation-frame extraction, atlas group/padding/rotation/trim, SVG import-time or runtime rasterization, and per-platform overrides. Automatic slicing uses connected alpha regions with a 4,096-region output limit. Atlas output is deterministic and includes utilization, placement, page, rotation, overflow, and key reports.

## TileSet and TileMap

TileSet sources support atlas regions, alternatives/weighted variants, names, terrain metadata, collision, navigation, occlusion, custom data, animation, scene/prefab placement, and previews. The TileMap palette is searchable. Brush, stamp, pattern, line, rectangle, fill, replace, eyedropper, selection, erase, rotation, mirroring, terrain randomization, copy, and transform tools share one stroke transaction.

Layers independently control visibility, lock, blend, parallax, Z order, collision, navigation, and occlusion. World-coordinate selection readouts, deterministic RLE storage, bounded change history, chunk boundaries, streaming radius, baking, and diagnostics support large maps. All saved layers sort deterministically and transactionally preserve the last valid source.

## Composition

Camera2D provides bounds, smoothing, drag margins, editor previews, resolution/safe-frame overlays, priorities, stacking, viewports, render textures, and culling. Parallax layers now repeat and optionally mirror sprites, expose depth ordering, and retain camera-relative motion scale. Paths expose editable points, incoming/outgoing tangents, closed splines, smoothing, reusable `.nova-path` resources, and deterministic runtime followers with progress, speed, and orientation.

## Fonts

Font import exposes scalable/bitmap modes, fallback families/assets, shaping, OpenType features, hinting, oversampling, outlines, SDF/MSDF and range, bitmap size, editor-font ownership, declared languages, and target overrides. Glyph reports cover English, German, Chinese, RTL samples, combining marks, and emoji, and provide an action for every missing declaration. The editor uses bundled Nunito Sans Variable with Noto Sans SC fallback; game fonts remain project-controlled.

No undeclared glyph set is treated as valid without a diagnostic. Browser shaping still depends on the target browser/font implementation; Windows and Chromium results are captured locally, while macOS/Linux/Firefox matching-host verification remains an external gate.
