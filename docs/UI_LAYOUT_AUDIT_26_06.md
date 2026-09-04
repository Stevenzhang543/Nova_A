# Nova_A 26.06 all-panel typography and layout audit

This audit covers the complete editor shell, not only the new Simulation surface. The release requirement is readable, contained UI in English, German, and Chinese at 1024×640, 1024×768, 1366×768, 1920×1080, and 2560×1440, using 80%, 100%, 125%, and 150% UI scale where supported.

## Shared typography contract

- Normal interface copy uses the local Nunito Sans variable font; Chinese falls back to the local Noto Sans SC variable font; code and evidence hashes use JetBrains Mono.
- Shared body and control line height is at least 1.35; compact labels remain at least 1.25. Letter spacing is positive but restrained so German nouns and Chinese labels remain legible rather than widely scattered.
- Buttons, tabs, menu items, badges, tree rows, toolbar controls, property rows, help copy, and status rows inherit the same tokens instead of introducing one-off font sizes.
- Single-line `input`, `select`, and button text is vertically and horizontally centered. Single-line placeholders use the same center alignment. Multiline textareas, code editors, numeric tables, and prose remain left aligned because centering would damage editing and scanning.
- Text may wrap inside cards and rows. It may not escape a control, overlap a sibling, disappear under a fixed bar, or force a root horizontal scrollbar.

## Panel containment matrix

| Surface | Narrow/translated expectation | Owner |
|---|---|---|
| Top bars, workspaces, scene tools | controls wrap or use owned overflow; canvas labels never sit beneath tool clusters | editor shell |
| Hierarchy, Inspector, component forms | property labels and centered controls use `minmax(0, 1fr)`; long names wrap | inspector |
| Assets/content importer | tree, library and inspector each own scrolling; long paths/hashes wrap | content |
| Script, Event Sheet, Visual Graph | editor remains usable; graph stage pans/zooms independently; right inspector stays inside its column | scripting |
| Animation, Profiler, Tilemap, Console | timelines/tables own horizontal scrolling; tabs and actions stay reachable | bottom panel |
| Rendering, Audio, World/Simulation | cards reflow to one column; diagnostics and “How to fix” remain visible | production tools |
| Project/Build/Package settings | labels, selectors and template errors wrap without covering actions | settings/build |
| Dialogs, toasts, launcher | viewport-bounded max sizes and owned scrolling; no native browser confirm | shared overlays |

## Visual Graph inspector containment

The graph stage and inspector are separate min-width-zero grid children. The graph owns pan/zoom and never uses page scroll as a substitute. Node titles, pins, block fields and wire labels remain inside node bounds. The right inspector owns vertical scrolling; single-line fields are centered, while source previews stay left aligned. Tidy/fit/reset/zoom actions remain reachable at every required locale and scale.

## Evidence status

Automated checks verify source-level shared tokens, min-width/overflow ownership, centered single-line controls/placeholders, graph-stage/inspector containment selectors, localized-key parity, and the required viewport/scale/locale matrix declaration. The browser qualifier records geometry, root overflow, overlaps, clipping, target sizes, focus reachability, and screenshots when a browser is available.

Evidence that depends on rendered glyphs, OS text rasterization, assistive technology, unusual IMEs, independent user observation, or real 80/125/150% display scaling remains a manual/external gate until the matching evidence is captured. Source checks must never be reported as proof that every glyph rendered correctly.

Run `pnpm qualify:v26.06:layout`. Review `release-audits/v26.06-layout-browser.json` and `release-audits/screenshots/v26.06/`; any missing required state or geometry violation blocks release packaging.
