# Nova_A Project Format 2 — schema 24

Nova_A 3.4.0 writes Project Format 2 schema 24. Schema 24 adds production-physics metadata without renumbering or reinterpreting existing collision bits.

## Additive fields

- `globalSettings.interpolation`: `Interpolate` or `None`.
- `globalSettings.layers`: exactly 32 records containing stable numeric `id`, unique `name`, optional `description`, and `#RRGGBB` debug `color`.
- Collider shape model and physics-material asset reference, including density and friction/restitution combine modes.
- Physics/animation transform ownership, expanded joint options, motors, and break thresholds.

## Migration

Schemas 5–23 migrate in memory and are validated before replacing the current editor session. For schema 23, every collision matrix row and every collider `physicsLayer`/`collisionMask` value remains byte-for-byte equivalent after normalization. Layer bit 0 becomes `Default`; bits 1–31 become `Layer N`. Users can rename and recolor them without changing collision behavior.

The importer creates a rollback copy when storage allows, presents the migration plan, preserves unknown compatible fields, and rejects future schemas into the read-only compatibility viewer. Saving the migrated document is explicit. Downgrading schema 24 is not supported; use the pre-migration backup with an older Nova_A release.

## Compatibility contracts

Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 are unchanged. The native physics body ABI grows from 54 to 56 values to carry material combine modes; the runtime accepts and losslessly returns 54-value v3.3 records through its compatibility adapter.
