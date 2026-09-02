# Nova_A 26.03 UI and localization layout audit

The 26.03 surface audit covers every existing Vue panel plus the new Script Studio Types view, module-cycle errors, cancellable tasks, live Visual Graph values, conversion-coverage card, and Execute Rhai source list.

## Containment contract

- The Script Studio grid keeps a shrinking code column, independently scrolling explorer/Inspector, dock-right/dock-bottom modes, and a one-column compact layout.
- Inspector tabs use equal flexible tracks and wrap long EN/DE/ZH labels instead of clipping them.
- Type, structure, helper, statement, breakpoint, task, watch, and module rows use `min-width: 0`, wrapping secondary text, bounded source previews, and reachable focus targets.
- Live block values are bounded to six values and 80 display characters each. Large-graph low-detail mode hides only this duplicate overlay; Debug trace data and every animation/authoring feature remain available.
- Conversion coverage uses a two-column card, wrapping explanation, independently bounded escape entries, and ellipsized source preview; full source remains in the generated-code area.
- No root document scrollbar, hidden primary action, vertical writing mode, toolbar overlap, or control text overflow is allowed.

## Matrix

Automated browser qualification exercises English, German, and Chinese at 1024×640, 1024×768, 1366×768, 1920×1080, and 2560×1440 with 100%, 150%, and 200% UI scale. The retained full traversal also inspects all workspaces, all Script Inspector tabs, bottom panels, page sidebars, themes, reduced motion, keyboard focus, empty/loading/error states, and console/fatal surfaces.

The required localized marker is “Types & statements” / “Typen & Anweisungen” / “类型与语句”. Screenshots and machine-readable results are stored under `release-audits/screenshots/v26.03` and `release-audits/v26.03-layout-browser.json`.
