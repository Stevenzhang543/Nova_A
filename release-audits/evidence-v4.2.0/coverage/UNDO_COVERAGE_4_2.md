# Nova_A 4.2 undo/redo coverage

The central document command stores a stable ID, user-facing label, timestamp, affected resource, mutation scope, before/after canonical project documents, and estimated memory. It supports merge windows, named groups, nested groups, reverse-order cancellation, redo invalidation after a branch edit, a 500-entry editor default, and a 64 MiB editor memory budget. Project open, successful migration, external disk reload, and explicit clear establish documented history boundaries.

| Scope | Routed mutations | Coverage |
| --- | --- | --- |
| Scene/hierarchy/inspector | create, delete, paste, duplicate, transforms, components, connections, scene properties | Explicit commands plus stable-control mutation router |
| Assets/scripts | import/create/edit metadata, script source, recoverable trash restore/purge | Document command and recoverable trash state |
| Animation/UI | clips, keys, controllers, Canvas/control properties/layout | Stable-control router and explicit creation commands |
| Settings/packages/build | project/runtime settings, package state/lock, build presets | Stable-control router and project transaction scopes |

Exceptions: runtime play-state telemetry, viewport camera navigation, panel docking/preferences, search/filter text, dialog selection, generated importer progress, and diagnostics do not change authored project data and intentionally do not enter project undo. Permanent trash purge requires an exact-count destructive confirmation; clearing history may make it irreversible.

`verify:v4.2` executes 10,000 mixed commands over seven authored scopes, 2,000 undos, 1,500 redos, a branch edit, nested grouping, count pruning, and memory-budget assertions. The Undo History panel exposes applied/redo state, label, resource, scope, timestamp, and memory use.
