# Hierarchy, Inspector, and viewport workflow — Nova_A 4.3

## Hierarchy

The Hierarchy virtualizes rows with overscan, so a 10,000-object scene does not create 10,000 DOM controls. Click selects, Ctrl/Cmd-click toggles, Shift-click selects a range, and drag reparents. Shift-drag reorders siblings; Alt-drag keeps local transform, while the normal operation preserves world transform. Search matches name, runtime ID, tags, and component types and reveals ancestors. Type filters, a dedicated tag filter, saved searches, pinned rows, selection Back/Forward, breadcrumbs, prefab/scene/override markers, visibility, lock, enabled state, isolate, and context actions remain available.

Large-scene persistence avoids redundant scene clones and skips migration for already-current schema-29 documents. The supplied 10,000-object qualification creates, canonically saves, reloads, filters, and validates the full scene while preserving stable identities.

Scene tabs show dirty, external-change, validation, and prefab state. Back/Forward follows scene navigation history. The plus menu creates deterministic Empty 2D, Gameplay 2D, UI Overlay, or Camera Stage scenes. Scene settings manage template identity, runtime policy, inheritance, tags, named layers, and dependencies.

## Inspector

Inspector search and General/Physics/Rendering/Script/Advanced categories reduce scrolling. Pin and Modified-only narrow the view. Multi-selection exposes shared enabled/visible/locked/layer/position/tags/groups values and reports common component kinds; mixed values are explicit. Prefab instances show source, overrides, compare/reset, apply, revert, variant, unpack, conflict details, and source navigation. Inline validation explains missing dependencies, conflicts, hierarchy errors, and unsupported persistence combinations.

## Viewport

Move/rotate/scale and pivot/rect/path/polygon/collider/measure tools share selection and undo. Arrange provides align, distribute, mirror, rotate 90°, frame selection, isolate, focus camera, and grouping. Camera frame presets include Custom resolution. Rulers are world-unit aware; horizontal and vertical guides can be added, hidden, locked, or cleared. Snapping applies grid first, then the enabled pixel/vertex/edge/center/object candidates within a 10-pixel viewport tolerance; angle snap uses the configured degree step. Grid spacing and a `10`-unit Inspector move use the same world scale, so authored values and rendering remain exact.

All destructive actions use the Nova_A confirmation surface. Editor-only visibility/lock/isolation do not silently alter player rendering. Runtime changes stay isolated until deliberately authored back in editing mode.
