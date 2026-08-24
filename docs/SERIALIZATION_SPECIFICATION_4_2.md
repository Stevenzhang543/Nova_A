# Nova_A 4.2 deterministic serialization specification

Status: frozen for Project Format 2, schema 29. The authoritative implementations are `src/projects/projectData.ts` and `crates/nova_format`.

## Text and values

- Encoding is UTF-8 without BOM. Newlines are LF. Every document ends with one LF.
- JSON uses two-space indentation and no trailing whitespace. Object keys are ordered by Unicode code-point/locale-independent ordinal intent; serialized arrays keep authored order except declared sets.
- Numbers use JSON's shortest round-trip decimal form. `-0` becomes `0`. NaN and infinities are rejected before a write begins.
- UUID-bearing fields and `asset://`, `scene://`, `prefab://`, and `resource://` UUID references are lowercase. UUID identity does not depend on name, index, hierarchy position, or path.
- `assets` sort by normalized path then UUID. Build preset, dependency, reverse-dependency, and asset-folder sets are deduplicated and sorted. Entity, component, scene, animation-key, and UI child arrays preserve meaningful authored order.
- Unknown forward-compatible fields survive Rust migration through flattened ordered maps. A future schema or format major is rejected rather than guessed.

## Authorities and generated data

`project.nova`, scene documents, asset metadata, Project Settings, build presets, UI/animation sources, and `Packages.lock` are authored authorities. Import status, cache-hit state, transient errors, last-valid source, thumbnails, atlases, and compiled artifacts are generated data below `.nova/imported` or `.nova/cache`; they may be rebuilt and never replace authored input.

## Validation and comparison

Validation runs before transaction preparation and again on migration output. It checks format/schema/manifest identity, safe paths, stable and nonduplicated UUIDs, SHA-256 asset metadata, component dependencies, package/engine compatibility, and unresolved asset references. Deterministic re-save canonicalizes twice and requires byte identity. Semantic diff compares scene, prefab, and resource UUIDs and records kind, path, before checksum, and after checksum.

## Compatibility rule

The web/TypeScript serializer is the editor authority and Rust `nova_format` is the migration/build authority. Both freeze Project Format 2/schema 29 for v4.2. Tests cover byte stability, schema 5–29 migrations, unknown-field preservation, reference round-trip, malformed/future inputs, and bounded mutation fuzzing.
