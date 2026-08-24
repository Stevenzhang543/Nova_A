# Nova_A 4.4.0 release notes

Nova_A 4.4 delivers deterministic daily 2D content production without deleting prior features or animations.

## Added and improved

- Importer 3.0 with versioned presets, full source/artifact provenance, explicit cache invalidation, validated reimport, Compare/Revert, and no silent invalid fallback.
- Production dependency graph, cycle/missing/duplicate repair information, content groups/closure, transactional folder moves, watcher choices, tags, favorites, collections, searches, list/grid, thumbnail cache, and 20,000-asset incremental browsing.
- Complete sprite, slicing, atlas, SVG, TileSet/TileMap, camera, parallax, reusable spline path/follower, and multilingual font workflows.
- Softer iOS-inspired materials, rounded bundled fonts, unified role-based control text, purposeful GPU-friendly motion, and reduced-motion compliance.

## Compatibility

Project Format 2 remains schema 29. Runtime API 1, Plugin API 2, Package Manifest 1, Build CLI 1, and physics ABI are unchanged. Importer cache v2 is intentionally invalidated; existing verified artifacts remain usable and reimport creates v3 provenance. External gates are listed in docs/KNOWN_ISSUES_4_4.md.
