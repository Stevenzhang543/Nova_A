# Project Format 2 schema 28

Schema 28 is Nova_A 3.8's additive world-data schema. TypeScript and Rust authorities both write engine `3.8.0`, format major 2 and schema 28 while accepting public schemas 5–28.

## Migration

- TileSet JSON advances to version 2. A primary atlas source is synthesized from the previous texture reference; collision, terrain and tile indices are preserved. Navigation/occlusion polygons, metadata, scene/prefab references, atlas region, animation and weighted variants receive safe empty defaults.
- TileMap layers preserve their tile arrays and gain blend mode, parallax, z order, collision/navigation/occlusion switches and a same-sized transform array.
- Navigation regions gain grid/polygon mode, source selection, masks, agent radius, links and bake revision. Agents and obstacles gain mask/avoidance defaults.
- World cells gain ownership, dependency, prefetch, cache and save-handoff metadata. Object pools gain an explicit reset contract and maximum lifetime.
- Unknown compatible fields continue to round-trip. Migration is deterministic, validates after serialization and never removes optional-package data when a package is disabled.

Older Nova_A builds cannot safely edit schema 28. Use the pre-migration backup to downgrade; there is no lossy reverse migration.

## Save data

Runtime save envelopes are separate from project files. Save envelope version 2 contains the project's independently versioned save-data schema and uses deterministic structured values, a checksum, journal, verified temporary write, backup and explicit recovery. Custom serializers must return bounded save-compatible values. Cancellation is honored before the atomic commit boundary.
