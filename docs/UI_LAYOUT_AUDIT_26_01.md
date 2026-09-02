# Nova_A 26.01 complete panel-layout audit

## Contract

Every editor panel must remain readable at 1024×640 through 2560×1440, at 100%, 150%, and 200% UI scale, in English, German, and Chinese. A panel may scroll its own content; it may not enlarge the app root, hide an action without a reachable scroll path, clip translated text, or overlap another dock.

The 26.01 containment layer gives every panel/grid/flex descendant `min-width: 0`, bounds all form controls to their owner, wraps descriptive text, gives tabs an explicit horizontal overflow path, clips only card-level horizontal paint, and collapses multi-column studio grids below 1100 px. Canvas, timeline, code, graph, and table surfaces retain their purpose-built pan/scroll behavior.

## Panel-by-panel disposition

| Surface | 26.01 layout rule | Interaction check |
|---|---|---|
| Project Manager | Search + difficulty filters use a responsive grid; cards have bounded independent scrolling and explicit no-result state. | Search, filter, select details, create all 20 templates. |
| Workspace/Top/Tool bars | Controls shrink by existing icon-first rules; translated labels never alter the viewport document. | Switch every workspace at 3 locales and 3 UI scales. |
| Hierarchy / Scene tabs | Dock owns vertical scrolling; tab rows own horizontal scrolling. | Search, multi-select, rename, reorder, additive scene switch. |
| Scene/Game viewport | Never becomes the scroll owner; overlays remain bounded and pointer coordinates remain viewport-local. | Draw, select, drag, resize, snap, play/pause/step. |
| Inspector / Config | Sticky header remains visible; categories and view controls scroll horizontally; fields shrink/wrap. | Single/multi-edit every component family and expression field. |
| Assets / importer | Folder, grid/list, and Inspector remain independent panes; long paths and localized actions wrap. | Search/filter/import/reimport/create/open/delete/recover. |
| Script Studio | Explorer, editor, and details may collapse through existing layout settings; status text wraps without reducing the code viewport to zero. | Open existing `.rhai`, edit/save, code↔visual handoff, diagnostics/debug. |
| Visual Graph | Palette, canvas, minimap, and details remain separately bounded; graph canvas keeps pan/zoom. | Open linked graph, drag blocks, connect pins, edit values, save/generate code. |
| Animation / Timeline | Toolbars wrap or scroll; track/timeline surfaces keep horizontal scroll and inspectors keep vertical scroll. | Create clip/track/key, scrub, zoom, preview and record. |
| Interface / Presentation | Cards collapse to one column under 1100 px; localization tables and previews own their scroll. | Locale/RTL/pseudolocale/theme/focus/accessibility checks. |
| Debug / Console / Profiler / Physics monitor | Tab bars scroll; traces/tables remain in bounded panel scroll regions. | Filter, clear, capture, inspect runtime values and collisions. |
| Rendering / Audio / World / Network | Dense studio grids collapse; labels and values wrap inside cards. | Toggle every setting and verify runtime/project persistence. |
| Settings / Project Health / Packages / Automation | Cards and dialogs stay within the viewport; long identifiers and permissions wrap. | Search scopes, edit values, validate, dry-run/apply/undo, close dialogs. |
| Build Settings | Target/profile/forms remain bounded; issue text wraps; Build/Run actions stay reachable. | Validate every registered target and untouched template defaults. |
| Dialogs / menus / overlays | Existing max-viewport contract plus 26.01 text containment. | Keyboard focus, Escape/cancel, confirm, 200% scale. |

## Automated gates

`scripts/audit-v26.01.mjs` statically accounts for every Vue file and risky fixed/no-wrap declarations. `scripts/qualify-layout-v26.01.mjs` executes the browser matrix across required sizes, scales, and locales. External screen-reader and independent usability observation remain explicit release gates rather than being claimed by local automation.
