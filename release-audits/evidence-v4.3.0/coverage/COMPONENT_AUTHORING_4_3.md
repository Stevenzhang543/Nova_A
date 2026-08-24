# Component authoring — Nova_A 4.3

The Add Component palette is searchable and grouped by Core, 2D, Physics, UI, Audio, Camera, Navigation, Script, and Packages. Entries show compatibility, purpose, prerequisites, and conflicts; favorites and recent choices are local editor preferences.

Each active component has a stable UUID, enabled state, deterministic data record, and stack order. Inspector component tools enable/disable, reset, copy, paste, save/apply a preset, reorder, and remove where allowed. Transform2D is mandatory and cannot be removed. Adding a component resolves declared prerequisites first and blocks declared conflicts. CharacterBody2D and joints require RigidBody2D; AreaEffectors require Area2D; Area2D requires a collider; UI controls require RectTransform; Canvas conflicts with RigidBody2D. Project Health reports unavailable components, missing prerequisites, conflicts, invalid IDs, and invalid enabled states.

Nova_A's current runtime exposes one active component per concrete `ComponentKind`; the different joint kinds are separate kinds. “Duplicate” workflows therefore use copy/paste or named presets across selected objects rather than creating an ambiguous second component of the same kind. This makes runtime lookup, serialization, and reset deterministic without hiding unsupported duplicates.

Inspector properties support context help, default/reset, prefab revert, value/path copy, keyframe, pin, modified-only filtering, units, bounded sliders, asset pickers, curves/gradients where the component supplies them, and safe numeric expressions. Expressions accept numbers, `current`, `pi`, `tau`, parentheses, and `+ - * /`; they are bounded, do not use `eval`, and reject division by zero/non-finite output.
