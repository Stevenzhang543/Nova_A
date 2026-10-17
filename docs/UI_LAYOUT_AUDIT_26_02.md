# Nova_A 26.02 UI and localization layout audit

## Event Sheet Studio

The desktop layout uses `238px / minmax(420px, 1fr) / 284px`: asset browser, independently scrolling event table, and validation/Object Blueprint details. Every flex/grid child has a shrinkable minimum. Event rows use explicit field ownership; long names and paths ellipsize only where the full value is available through the input or asset selection.

Below 1180 effective pixels, details become a bounded right overlay and the object context becomes two columns. Below 760 pixels, the sheet browser becomes a bounded overlay, details hide from the compact visual layout, the editor remains reachable, event fields wrap to additional rows, and the top mode tabs share width. No whole-window horizontal scrollbar is required.

English, German, and Chinese provide complete strings for all new tabs, controls, event families, hints, validation, graph navigation, and guided workflow. Compact Chinese text remains horizontal and wraps; German compound labels have shrink/wrap ownership. Public controls use native button/input/select semantics and named labels.

## Visual Graph

Canvas controls remain above the graph with a bounded slider. The help strip is centered only when at least 430 pixels remain around fixed overlays and hides below 900 pixels. Palette/details retain independent scroll owners. Capture-phase wheel zoom does not scroll an ancestor panel. Compatible-pin focus is visible without relying on color alone through scale plus halo.

## Retained global contract

All Vue surfaces remain covered by the shared 26.01 containment rules: wrapping labels/buttons, `minmax(0, 1fr)` fields, independent tab scrolling, bounded dialogs/docks, accessible focus, long-text wrapping, and stable loading/empty/error states. Qualification targets 1024×640, 1024×768, 1366×768, 1920×1080, and 2560×1440 at 100%, 150%, and 200% UI scale, EN/DE/ZH, light/dark/high contrast, and reduced motion.

Independent screen-reader hardware review and user observation remain external evidence; local automated layout results do not claim them.

