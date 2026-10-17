# Nova_A 5.4 dynamic object API

All functions below are additive Rhai API v2 functions and appear as typed Visual Graph nodes. Scripts cannot retain a raw host pointer. They receive a `{ valid, kind, id, generation, error }` handle and submit bounded commands that the TypeScript host validates at a fixed command boundary.

## Spawn and target

```rhai
let bullet = spawn_at("asset://prefab-guid", x, y, rotation, scale_x, scale_y);
entity_set_position(bullet, x + 2.0, y);
entity_set_rotation(bullet, 0.5);
entity_set_scale(bullet, 1.0, 1.0);
entity_add_tag(bullet, "player-projectile");
component_set_enabled_on(bullet, "DamageHitbox2D", true);
```

`spawn_at` returns a stable pending handle before instantiation. Commands later in the same callback resolve that handle after spawn. It rejects empty prefab references, non-finite transforms, or near-zero scale. A successful root becomes runtime-owned/transient and all members of the spawned prefab are gameplay-initialized.

Targeted operations are `entity_set_position`, `entity_set_rotation`, `entity_set_scale`, `entity_set_enabled`, `component_set_enabled_on`, `ui_set_text_on`, `ui_set_value_on`, `entity_add_tag`, `entity_remove_tag`, `entity_add_group`, `entity_remove_group`, and `entity_destroy`. Text is capped at 16,384 characters; tags/groups are capped at 80 characters and 32 members; UI values clamp to the target control's range.

## Scene queries

```rhai
let enemies = query_tag("enemy", 32);
let actors = query_group("actors", 64);
let damageables = query_component("Health2D", 128);
let nearby = query_radius(position_x(), position_y(), 8.0, 16);
```

Every query reads an immutable scene snapshot from the current script call. Limits clamp to 0–256, the runtime snapshot is capped at 100,000 objects, and source scene order is retained. Radius must be finite and non-negative. Queries never expose editor-only host state or component objects.

Use `entity_name_on(handle)`, `entity_enabled_on(handle)`, `entity_position_x_on(handle)`, and `entity_position_y_on(handle)` to inspect that same immutable callback snapshot. These reads return safe defaults and report an invalid/stale handle through the host error path; they never observe a half-applied queued mutation.

## Handle lifetime and failure

Generation is a deterministic 32-bit value derived from the handle ID. The host checks the generation and resolves pending IDs before every target command. Destroyed, despawned, scene-unloaded, unknown, or generation-mismatched handles produce a Console error (`Stale entity handle rejected`) and perform no mutation. Pending-resolution storage is capped at 10,000 and dead resolutions are pruned. Never manufacture a handle map or store one as a permanent save-game identity; store a durable game key and query again after load/scene transition.

## Compatibility

Project Format 2 remains schema 29, Rhai remains API v2, Graph remains Format 1, and old `instantiate(prefab)` remains supported. `spawn_at` and target/query functions are additive; no v1/v2 script is rewritten automatically.
