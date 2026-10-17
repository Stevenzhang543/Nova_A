# Nova_A 26.02 release notes

Machine version: **26.2.0**. Project Format: **2**. Schema: **29**. Rhai API: **2**. Visual Graph: **1**.

## Added

- Event Sheet assets with entity/component ownership; lifecycle, input, timer, signal, collision, trigger, UI, animation, and network rows; search, enable, priority, selector, callback completion, inheritance, override, validation, deterministic seed, and direct Inspector/Asset/Script-workspace access.
- Runtime dispatch for custom Event Sheet callbacks at existing deterministic boundaries with canonical callback de-duplication and a 10,000-callback ceiling.
- Object Blueprint assets with prefab composition, base inheritance, component conflict validation, tags/groups, instantiation, and stable dependency closure.
- Guided Rectangle/Sprite → Logic → Event Sheet → Prefab → Object Blueprint → Scene workflow.
- Visual Graph focal wheel zoom, zoom slider/buttons/reset, direct drag-to-connect with compatible targets, double-click insertion, explicit Tidy blocks, navigation hints, large-graph low-detail paint mode, and tested O(nodes + edges) iterative layout.

## Changed

- Graph pointer, drag, pan, and pending-wire updates are animation-frame coalesced; history is recorded per gesture; pure viewport work no longer recompiles logic.
- Block/node mode changes and graph opening preserve saved node positions. Automatic layout remains available explicitly and undoably.
- Script2D serialization additively stores Event Sheet and Object Blueprint references. Asset import/read/update/load supports `.nova-events` and `.nova-object` without changing schema 29.
- EN/DE/ZH manuals/inventory and panel containment include all 26.02 controls.

## Removed

Nothing. No feature, animation, visual component, shortcut, stable contract, or authored value was removed.

## Known external gates

Publisher identity/signing, disposable clean-machine lifecycle, second-machine byte reproduction, Linux/macOS matching-host builds, independent beginner/expert and accessibility/security review, and real-duration 72-hour soak are not claimed by local evidence.

