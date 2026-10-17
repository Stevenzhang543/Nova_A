# Nova_A 4.4 asset-production pipeline

Nova_A 4.4 introduces importer protocol **3.0.0** without changing Project Format 2, schema 29. Every imported artifact records its importer ID/version, preset, platform, source SHA-256, normalized source settings, normalized artifact settings, settings hashes, artifact SHA-256, cache key, diagnostics, reproducibility state, dependencies, reverse dependencies, and the exact cache decision. The v2 import cache is intentionally invalidated; reimporting creates v3 provenance.

## Asset Database

- Stable GUID references survive rename and transactional folder moves. Folder moves reject destinations outside `Assets`, self-descendants, duplicate paths, and roll back path/source changes after an injected interruption.
- The production dependency graph reports inbound/outbound edges, missing references, cycles, duplicate sources, build ownership, unused content, and transitive inclusion closure.
- Content groups are `embedded`, `downloadable`, or `excluded`; editor-only assets never enter runtime closure. A required excluded dependency is a blocking health error.
- Tags, favorites, collections, saved searches, grid/list layouts, a bounded thumbnail cache, and an incrementally virtualized 20,000-asset view keep the browser responsive.
- The primary toolbar contains daily actions. Export Folder remains available under `•••`; no function was deleted.

## Import contract

The Asset Importer has Source, Import, Dependencies, Provenance, and Platform Overrides tabs. Reimport never silently substitutes invalid bytes: unsafe paths, invalid magic, undecodable images, active SVG content, forbidden external SVG resources, oversized sources, or corrupt input fail with actionable diagnostics while preserving the last verified artifact. Compare displays every provenance field; Revert restores the last verified artifact.

Import presets are versioned by their normalized settings and importer version. Platform overrides explicitly declare compression, maximum size, and target format. Batch reimport uses the same validated pipeline. External watcher conflicts always require an explicit Reimport, Keep Current, or Import as Copy choice.

## Determinism and security

Settings are key-sorted before hashing. Atlas inputs are sorted by group, longest edge, size, then GUID. TileSet/TileMap writes are transactional and canonical. Security validation rejects path traversal, signature mismatches, SVG scripts/event handlers/JavaScript URLs, and undeclared network resources. Limits bound source size, sprites, glyph declarations, paths, layers, tiles, tags, collections, and graph traversal.

## Compatibility

Old projects open unchanged. Existing assets remain usable from their verified artifact, but Project Health requests reimport until v3 provenance exists. Runtime API 1, Plugin API 2, Package Manifest 1, Build CLI 1, physics ABI, and schema 29 are unchanged.
