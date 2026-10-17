# Godot editor study and Nova_A 26.32 shell changes

This is a targeted review of editor organization, dock controls, and numeric property widgets. It is not a claim to have read every Godot source file or tutorial. The user-provided `godot-master` tree was used as the source for copied icon geometry; upstream files are fingerprinted in `public/third-party/godot-editor-icons.json`.

## References studied

| Reference | Relevant structure | Nova adaptation |
| --- | --- | --- |
| [First look at Godot's interface](https://docs.godotengine.org/en/stable/getting_started/introduction/first_look_at_the_editor.html) | Main workspace selection, separate playtest controls, contextual toolbars, side docks and a collapsible bottom dock. | Distinct compact workspace and playback groups; flatter active tabs; recognizable SVG action icons. Existing Nova workspaces and commands remain available. |
| [Customizing the interface](https://docs.godotengine.org/en/stable/tutorials/editor/customizing_editor.html) | Resizable docks, saved layouts, display scale, themes and distraction-free workflows. | Preserve Nova resize, maximize, dock persistence and focus-mode handlers while refreshing their presentation. No new operating-system floating-window feature is implied. |
| [Inspector Dock](https://docs.godotengine.org/en/stable/tutorials/editor/inspector_dock.html) | Property filtering and expandable categories, labels near values, direct numeric editing and dragging, reset/link indicators. | Inform the companion form-layout work: controls must fit the dock, with readable labels and bounded intrinsic widths. Do not convert every label into an unexplained icon. |
| `godot-master/editor/gui/editor_bottom_panel.cpp` | Dock actions use theme icons, toggle states, accessible names, tooltips and shortcuts; pin and expand are distinct actions. | Keep labels/pressed states on Nova's icon-only actions and maintain dedicated dock controls outside the scrolling tab region. |
| `godot-master/editor/gui/editor_spin_slider.cpp` | Numeric minimum width is computed from widget content; height respects font and property-row requirements. Typed values and drag increments remain available. | Avoid stretching small values across wide cards; fit controls to available space while preserving existing editing semantics. No numeric interaction code was copied. |
| `godot-master/editor/editor_node.cpp` | Theme-provided toolbar icons, separate context regions, flexible spacers. | Replace font-dependent navigation glyphs with theme-aware SVG and let project context yield space before essential controls. |

## Directly copied material and license

Ten Godot SVG geometries are adapted in `src/components/EditorIcon.vue`: MainPlay, Pause, Stop, Pin, DistractionFree, Back, Forward, Search, FileList and Grid. Their original `#e0e0e0` color is replaced by `currentColor`; navigation arrows are centered in a square viewBox. All other geometry in this component is original Nova geometry.

Godot publishes these engine files under the [MIT license](https://godotengine.org/license/). The complete source-tree copyright and permission notice is copied unchanged into `public/third-party/godot-editor-icons-LICENSE.txt`. Vite includes that public file and the provenance manifest in the web distribution and Tauri resources built from it. The source distribution also contains them. The release-level LICENSE must retain the Godot notice for redistributions containing these icons. No manuals, screenshots, logos, or physics solver implementations were copied into Nova.

## Owned edit ledger

| File | Edit and consequence |
| --- | --- |
| `src/components/EditorIcon.vue` | Adds attributed Godot geometry and an exported icon-name type; extends original icons for editor navigation and studios. All SVG remains decorative and inherits its control's accessible name. Existing icon consumers receive consistent theme color and sizing. |
| `src/components/WorkspaceBar.vue` | Replaces navigation/layout/command Unicode glyphs; names responsive icon-only controls explicitly; flattens workspace chrome and active underline. Retains workspace selection, dirty markers, history, menus, focus mode, and project context. |
| `src/components/ActionBar.vue` | Uses a common SVG family for play/pause/step/stop; groups controls with explicit accessible names and pressed states; visually compacts status on narrow windows while keeping it accessible. Simulation and preflight functions are unchanged. |
| `src/components/EditorBottomPanel.vue` | Adds icon+label tabs, retains visible scrollable tabs until the dock is genuinely narrow, preserves the compact selector below 28em, replaces asset toolbar glyphs, and bounds asset search/folder inputs. Pin, collapse, maximize, tab ordering, asset operations, and persistent state bindings are unchanged. The tab-region width is spent on discoverable tools rather than replacing the whole strip with a selector on ordinary desktops. |
| `public/third-party/godot-editor-icons-LICENSE.txt` | Includes the original Godot MIT copyright and permission notice. |
| `public/third-party/godot-editor-icons.json` | Records exact upstream icon paths, source SHA-256 hashes, destination and modifications for reproducible attribution. |
| `docs/GODOT_UI_REFERENCE_26_32.md` | Records sources, interpretations, copied material, ownership and consequences. |
| `src/components/EventSheetEditor.vue` | Visual review found long handler source UUIDs colliding across the effective-order grid. Scoped rules now allow each cell to shrink and wrap its complete source identifier without truncation. |

The follow-up visual review inspected contact sheets 01–07, covering 56 captured routes (001–056): focused inspector; Design, Script, Animation, UI, Debug and Manage workspaces; Rhai/graph/event-sheet views; all ten script inspector categories; responsive UI/localization/accessibility; docked and maximized assets, console, animation and audio; all seven World Studio tabs and disclosures; six disabled Network Studio tabs; and Ecosystem extensions/package/export-template views. Full-resolution inspection confirmed the Event Sheet identifier collision and excessively tall raw numeric controls in responsive UI and streaming settings. Numeric sizing is addressed by the shared form rules. Known search-width failures were not counted twice.

The additional narrow-assets capture showed folder paths wrapping into tiny fragments. Folder rows now show their leaf name with depth indentation and deliberately scroll horizontally when necessary; the complete path remains in both the title and accessible name. Folder selection, storage keys, drag/drop paths and asset enumeration are unchanged.

## Relevant verification

TypeScript/Vue compilation must pass. Browser qualification must exercise the workspace toolbar at wide and narrow widths, scrolling and compact bottom-tab selection, tab drag/drop ordering, pin/maximize/collapse controls, translated labels, theme color changes, play/pause/step/stop state, and the existing save/edit/export route. These changes do not justify requalifying untouched physics algorithms against Godot or claiming behavioral parity with Godot.
