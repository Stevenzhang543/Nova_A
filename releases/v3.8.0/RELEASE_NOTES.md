# Nova_A 3.8.0 release notes

Nova_A 3.8.0 delivers the world-data milestone while retaining the complete 3.7 rendering/audio pipeline, Runtime API 1, Plugin API 2, production physics, Rhai scripting, animation, UI and export workflows.

## Tilemap 2.0

- TileMap2D layers independently control visibility, lock, opacity, blend, parallax, z order, collision, navigation and occlusion.
- TileSet v2 supports multiple atlas sources and slicing, explicit regions, animated tiles, weighted variants, transforms, terrain rules, collision/navigation/occlusion polygons, metadata and scene/prefab placement.
- Contextual tools include brush, stamp, pattern, line, rectangle, eraser, fill, replace, eyedropper, selection, copy/paste, rotate, mirror and deterministic random variants.
- Chunk read/write, metadata lookup, collision bake and diagnostics are bounded. A one-million-tile, 1,024-chunk qualification is recorded.

## Navigation, streaming and saves

- Core Navigation 2D provides clearance-aware grid A*, polygon visibility A*, masks, costs, links, dynamic obstacles, local avoidance, bake/rebake/clear, debug paths and profiling. Grid baking consumes transformed TileMap navigation polygons and weighted costs.
- Core world cells provide explicit bounds/ownership, dependencies, prefetch, asynchronous cancellable lifecycle, cache policy, memory budget, editor preview, save handoff and profiler events.
- Runtime save envelope 2 provides ordered migrations, deterministic bounded values, custom serializers, checksum, journal, verified temporary write, atomic commit, backup/recovery, asynchronous progress/cancellation and slot metadata.

## Focused editor and optional packages

- The permanent monolithic World Tools dock is removed. Tilemap is contextual, navigation is edited beside the selected scene/tile components, and searchable Inspector components own the rest.
- AI, Object Pool and Streaming Tools are optional. Disabling/uninstalling a package hides its creation surfaces without deleting serialized component data.
- Object Pool defines reset contracts, capacity/prewarm, bounded expansion, lifetime and created/reused/leak diagnostics.
- Project Health exposes world extent, tiles, chunks, navigation and streaming memory. Platformer and Top-down templates now contain real layered TileSets and navigation regions.

## Compatibility

Project Format 2 schema 28 reads schemas 5–28. Schema 27 TileSets/layers/navigation/chunks/pools receive additive defaults; authored tile arrays, collision bits, scripts, strokes, package data and unknown compatible fields are preserved. Older editors must use the automatic pre-migration backup. Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are unchanged.
