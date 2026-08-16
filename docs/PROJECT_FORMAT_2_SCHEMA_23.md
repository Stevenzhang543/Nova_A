# Nova_A Project Format 2 — Schema 23

Status: authoritative for Nova_A 3.2.0. The Rust `nova_format` crate owns compatibility validation and migrations; the TypeScript project-data module owns editor-side canonical text emission and repair previews.

## Identity and compatibility

Every project contains `projectFormat`, `projectFormatMajor`, `formatVersion`, `engineVersion`, `compatibility`, and a versioned `manifest`. The manifest contains a stable project UUID, human-readable name, minimum and maximum-exclusive engine versions, schema version, `Packages.lock`, build-preset references, and five directory roles:

| Role | Default | Ownership |
| --- | --- | --- |
| Source | `Assets` | Shared, authored input |
| Shared settings | `ProjectSettings` | Shared, authored project configuration |
| Generated | `.nova/imported` | Importer-owned; read-only in the editor |
| Cache | `.nova/cache` | Rebuildable local artifacts |
| User local | `.nova/user` | Per-user state, excluded from shared authoring |

Persistent resource references use `asset://<uuid>`. Paths are presentation and source-layout metadata, not identity. Scene, entity, component, connection, prefab-instance, and scene-instance records use stable UUIDs.

## Canonical text serialization

- Encoding: UTF-8 JSON text.
- Newlines: LF only, including one final LF.
- Indentation: two ASCII spaces.
- Object fields: lexicographic Unicode key order at every level.
- Numbers: finite JSON numbers only; negative zero is emitted as zero. NaN and infinities are rejected.
- Authoring arrays: order is preserved because it can affect hierarchy, components, scenes, or gameplay.
- Set-like arrays: asset folders, build presets, dependencies, and reverse dependencies are de-duplicated and sorted.
- Asset records: sorted by normalized path and UUID.
- Unknown fields: preserved recursively unless a migration explicitly owns and replaces that field.
- A second canonical save of unchanged data must be byte-identical to the first.

## Scenes and prefabs

Scene assets and prefab assets are text resources containing an entity bundle, connections, and stable source UUIDs. `sceneLayers` represents nested scene-instance membership. `prefabLayers` preserves nested prefab membership, source identities, and per-property overrides when an outer prefab is created or instantiated. Bundle duplication remaps entity/component/connection and instance UUIDs while preserving `asset://` resource identity.

Prefab operations are Apply, Revert, Reset property, Compare overrides, Unpack one layer, and refresh instances. Component validation requires `Transform2D` on every entity, `RigidBody2D` with `CharacterBody2D`, and a collider with `Area2D`.

## Asset metadata and imports

An asset metadata record includes UUID, path, type, importer version, source hash, imported-artifact hash, cache key, platform, status, dependencies, reverse dependencies, and the last valid source. Import cache writes are staged and verified before replacement. Failure retains the previous valid artifact. Generated artifacts are marked and cannot be directly edited.

The editor provides cancellation, retry, bounded logs, import presets, external-change detection, reimport/keep/copy conflict choices, previews, favorites, saved filters, dependency viewing, missing-reference repair, unused-resource reporting, and dependent previews before destructive operations.

## Migration and recovery

Schemas 5 through 23 are registered. Opening an older schema produces a dry-run plan and package/engine compatibility summary. The original is backed up, rollback data is stored, migration runs in memory, and the result is validated before it replaces the session. A validation failure reloads the prior valid project. A future schema is never downgraded; it can only be inspected and downloaded from the read-only compatibility viewer.

Project Validate reports structural, identity, dependency, metadata, and missing-reference issues. Project Repair previews conservative corrections, creates a backup, applies only unambiguous repairs, validates again, and rolls back on failure.
