# Scene and prefab authoring schema — Nova_A 4.3

Nova_A 4.3 retains Project Format 2 schema 29. The authoring additions are backward-compatible fields; the scene-authoring and prefab payloads each have their own version marker.

## Stable identity and entity metadata

Every scene, entity, component, connection, prefab instance, and asset uses a lowercase UUID. Names, hierarchy paths, array indexes, tags, and layer names are presentation metadata and never identity. An entity persists `name`, `tags`, `groups`, `namedLayer`, `ownerUuid`, `ownership` (`Scene`, `Prefab`, or `Runtime`), `enabled`, `editorOnly`, `runtimePersistence` (`Scene`, `Session`, `SaveGame`, or `Transient`), and component records. Transform parents and owners reference UUIDs. Serialization rejects duplicates, missing parents/owners, cycles, non-finite numbers, invalid policies, and missing component dependencies.

## Scene authoring settings v2

`authoringSettings.sceneVersion` is `2`. The object contains `templateId`, `templateVersion`, `inheritanceSourceUuid`, sorted unique `tags`, stable `namedLayers` (`id`, `name`, `visible`, `locked`), and `runtimePolicy` (`Replace`, `Additive`, or `Overlay`). Scene documents also serialize their dependency list. Loaded/active state is editor session metadata; content remains deterministic. Scene inheritance must form a directed acyclic graph.

## Prefab document v2

A prefab text asset contains `prefabVersion: 2`, `name`, an identity-preserving entity/connection `bundle`, optional `variantOf`, `sourceChecksum`, and `createdAt`. The checksum covers the canonical bundle. Nested prefab layers preserve their source asset, instance UUID, source entity UUID, and overrides. Instantiation allocates new instance/entity/component identities while retaining source mapping.

Apply updates the source and refreshes other instances while retaining their explicit overrides. Revert recreates an instance from its source. Reset removes one override. Compare lists override paths. Unpack removes one prefab ownership layer. Variant creates a new prefab whose `variantOf` points at its base. Circular dependencies, missing/orphan sources, checksum mismatch, and overrides appear as explicit conflicts. Safe replacement removes the complete selected subtrees, preserves a shared external parent, reparents external children to the replacement root, and removes dangling connections.

## Determinism and compatibility

Canonical JSON sorts object keys, identity sets, dependencies, and other set-like arrays, normalizes UUID/reference casing, rejects non-finite numbers, uses two spaces and one LF, and preserves authored hierarchy/component order where order is semantic. Re-saving unchanged v4.3 scene/prefab content is byte-identical. Prefab v1 reads and normalizes in memory; it writes as v2 on the next authored update. Schema 29, Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 are unchanged.
