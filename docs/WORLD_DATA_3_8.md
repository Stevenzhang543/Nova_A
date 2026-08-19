# Nova_A 3.8 world-data architecture

## Tilemap 2.0

TileMap2D stores ordered layers with independent visibility, lock, opacity, blend mode, parallax, z order and collision/navigation/occlusion participation. A TileSet v2 can use multiple atlas sources and explicit regions. Tiles may carry collision and navigation polygons, an occlusion polygon, gameplay metadata, scene/prefab placement, animation and weighted variants. Brush, stamp, pattern, line, rectangle, fill, replace, selection, clipboard, rotate and mirror operations are transactional and chunk-invalidating. Runtime chunk read/write, metadata lookup, and scene/prefab placement descriptors are bounded by a requested chunk. Rendering, collision and navigation share the same rotate/mirror transform. Diagnostics report missing tiles, terrain gaps, overdraw, collision/navigation coverage and scene placement.

## Navigation 2D

NavigationRegion2D supports a clearance-aware grid or polygon visibility graph. Costs, masks, dynamic obstacles, off-mesh links, agent radius, smoothing and local avoidance feed deterministic A*. Grid regions can bake directly from TileMap layers, including zero-cost blockers, weighted travel costs and transformed per-tile navigation polygons. Bake, rebake, clear and profile actions live beside the scene component and tile workflow. Debug paths use the same solved data consumed by agents.

## World streaming

WorldChunk2D defines explicit bounds, ownership, optional scene, dependencies, prefetch/load/unload distances, memory estimate, cache policy and save-state key. The core runtime asynchronously moves cells through unloaded, loaded and active states; cancellation retargets safely, dependencies are prefetched, budgets are enforced, children activate with their owner, and save handoff survives unload/reload. The viewport overlay and profiler expose state, event timing and memory peaks. Streaming Tools is an optional authoring/diagnostics package, not a runtime dependency.

## Save and optional packages

Save envelope version 2 provides checksummed atomic commits, backup/recovery, project-defined save-schema migrations, async progress/cancellation, metadata, custom serializers and Debug inspection. Object Pool is optional and defines capacity, prewarm, bounded expansion, lifetime and reset contracts with reuse/leak counters. AI authoring is optional; disabling either package hides creation surfaces but preserves serialized components so reinstalling cannot corrupt a project. Navigation and streaming-cell execution remain core.

## Scale and limits

One world unit remains one configured grid unit and one metre by default. Tilemaps are bounded to 4,194,304 cells per component and 65,536 TileSet definitions. Save envelopes are bounded to 10 MB and nesting depth 16. Streaming memory estimates are author-provided budgeting hints; platform memory and GPU limits still apply. Use Project Health and the runtime profilers before shipping a large world.
