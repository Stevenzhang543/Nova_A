# Nova_A 4.3.0 release notes

Nova_A 4.3 delivers production scene, hierarchy, component, Inspector, prefab, and viewport authoring without removing prior features.

## Added and improved

- Stable entity ownership, groups, named layers, editor-only and runtime-persistence metadata with strict identity/dependency/cycle validation.
- Loaded-scene tabs, navigation history, templates, status markers, runtime policy, inheritance, tags, named layers, and dependency inspection.
- Virtualized 10,000-object Hierarchy with type/tag/saved filters, pins, selection history, status badges, breadcrumbs, multi/range selection, drag reparent and reorder.
- Searchable component palette, favorites/recents, prerequisites/conflicts/documentation, component lifecycle tools and presets.
- Multi-Inspector editing, safe numeric expressions, property filters/help/defaults, units and prefab conflict visualization.
- Prefab document v2, nested sources, variants, checksums, Apply/Revert/Reset/Compare/Unpack, circular prevention, transactional writes, source navigation and safe replacement.
- Current-schema large scenes avoid redundant clone/migration passes; 10,000-object create/save/reload/filter/validation is captured in release evidence.
- Viewport rulers/guides plus retained arrange, measure, frame, camera overlay, gizmos and exact-unit snapping.

## Compatibility and gates

Project Format 2 remains schema 29; Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are unchanged. Prefab v1 remains readable and writes v2 when edited. Windows x64 and Chromium web are locally qualified. Signing, independent scanning/review, five clean builds, clean-machine lifecycle, 24-hour soak, physical DPI/accessibility, Firefox, Linux and macOS remain explicit external gates. See docs/KNOWN_ISSUES_4_3.md.
