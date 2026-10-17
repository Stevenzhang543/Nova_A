# Nova_A 26.40

Engine 26.40.0. Project format 2 / schema 29 is unchanged; 26.38 and 26.39 projects open without migration.

## Fixes

| Area | What was wrong | Now |
| --- | --- | --- |
| Exported games | The Player cloned its camera with `structuredClone`, which drops the class, so every mouse or pointer event in an exported game threw `screenToWorld is not a function`. | The runtime bootstrap and the Player keep the camera's class; pointer input in exported games works. |
| Physics | Changing one body (a scripted or kinematic move, `set_velocity`, a material edit) marked the whole solver dirty and rebuilt every body on the next step, which also discarded contact warm-starting. | Non-structural changes refresh that one body inside the retained solver; order, layer and body-set changes still rebuild. Results are identical to a rebuild (covered by new Rust tests). |
| New Project | Below roughly 920 px of window height the Create Project button was pushed out of the dialog. | Name, location, Cancel and Create are pinned in the dialog footer at every height. |
| Opening projects | Every open went through the "Project upgrade" confirmation, even 26.40 → 26.40, and the dialog briefly flashed. | Current projects with nothing to migrate, no lock and no package warning open directly (the same dry run and validation still run). |
| Scene editing | With the Select tool, dragging an object did nothing. | Dragging a selected (or just-clicked) object moves it after a 4 px threshold; a plain click still only selects; Undo restores. |
| Web export | Dismissing the folder picker was reported as a failed build with an error notification. | It is a cancellation: no failed task, status "Export cancelled". |
| Browser editor | New projects defaulted the build target to the desktop OS, which the browser cannot build. | The browser editor defaults to Web. |
| Browser saving | Every Ctrl+S asked for a destination again. | The chosen file is reused for the rest of the session; a revoked handle falls back to asking. |
| Title bar state | "Saved" could show while project scopes were unsaved. | One dirty state: document history or any unsaved scope. |
| Quitting | Closing the desktop window (or the browser tab) discarded unsaved project changes without a word. | With unsaved changes, closing asks first: Quit without saving or Keep editing. |
| UI workspace | The Safe area and RTL checkboxes in the responsive preview were squeezed to a 2 px line. | Checkboxes keep their size in narrow property rows; the preview options sit inline. |
| New Project | Renaming the project left the suggested folder at `Projects/My Game`. | The suggested folder follows the name until the location is edited. |
| Hosting notes | The 26.40 Web hosting notes were saved with a broken encoding (garbled arrows, German and Chinese). | Regenerated as UTF-8. |
| Development server | Vite watched `releases/`, `release-audits/`, `.cache/` and build folders. | Those trees are ignored. |
| Rust gates | One `rustfmt` regression from the previous round in `nova_script` tests. | Formatted; `cargo fmt --check` and `clippy -D warnings` pass. |

## Editor interface

- One 44 px title bar replaces three stacked bars: menus, a segmented workspace switcher with a gliding selection, the project name with its Saved/Edited state, the run controls and a command field. The viewport keeps about 100 px more height.
- Run state is visible at a glance: the run capsule and the viewport frame turn green while playing and amber while paused.
- The scene tools and scene tabs share one header above the viewport; the layer bar floats over the canvas.
- Typography, spacing, radii, shadows and every surface tone are derived from one token file and the five user palettes (Midnight Blue, Night Garden, Cloud Blue, Meadow Cream, Blush Berry); light and dark, compact density, interface scale and increased contrast follow the same source.
- Controls: quiet buttons with filled primary actions, pill switches, inset fields with a focus ring, custom checkboxes and selects, slim sliders.
- Hierarchy: type icons (camera, tile map, light, text, UI, character, sprite) instead of identical squares, no reserved empty row, and a fixed path bar at the bottom so selecting a nested object never shifts the list.
- Inspector: the object name is the heading with type and id beside it; categories wrap instead of scrolling; defaults and write destinations moved from a "Property details" row under every field into the tooltip and context menu; prefab overrides stay visible.
- Launcher, New Project, menus, the command palette, notifications and the task center use the same materials; menus open with a short settle and close faster than they open.
- Workspace switching shows the selection on the next frame and swaps the panel right after, so a heavy workspace never delays the feedback.
- Reduced motion shortens every transition and removes spatial travel; translucency is limited to transient menus and turns off with reduced motion or increased contrast.

## Verification

Recorded in the release evidence archive:

- `vue-tsc --noEmit` and the node configuration typecheck pass; the production Vite build succeeds.
- `cargo test --workspace` (198 tests), `cargo fmt --check` and `cargo clippy --workspace --all-targets -D warnings` pass.
- The new `scripts/verify-2640-editor-workflow.mjs` drives the built editor with real pointer and keyboard input (New Project at 1366×768 and 1280×720, create a platformer, drag and Undo, Play/Stop restore, cancelled Web export, leave prompt with unsaved changes, reopen without migration prompt): 7/7 pass.
- Ten existing engine verifiers from the previous rounds (signals, run commands, shortcut labels, component schema, input consumption, gizmo cancel, signal queue, transform oracle and hierarchy): 92/92 checks pass.
- A Web game exported from the built editor was extracted, served over HTTP and played with keyboard and pointer input without errors.

## Windows

- Built on Windows x64 with `scripts/build-release-26.40.cmd`: WebAssembly core, `vue-tsc`, Vite build, Tauri release build, MSI (WiX) and NSIS installer; product versions checked as 26.40.0 by the packaging script.
- The portable executable was started from this release folder: the launcher shows 26.40, a Platformer project was created, the player was dragged with the Select tool and restored with Ctrl+Z, Play moved and jumped the character with D and Space, and Stop restored the scene.
- After the last fixes the release was rebuilt and the new portable executable started again: the suggested project folder followed the typed name, the UI workspace showed full-size Safe area and RTL checkboxes and the full project name in the title bar, closing with unsaved changes asked first (Keep editing kept the window, Quit without saving closed it), and closing from the launcher closed at once. The drag, Play and Stop checks above were made on the first build of the same day.
- The installers were built and versioned but not installed on the build machine.

## Limits

Browser checks ran in headless Chromium with software rendering, so they measure behaviour and layout, not GPU frame time or input-to-display latency on real hardware. The Player still depends on editor modules (`WorldCanvas`, editor stores); a fully separate Player remains open work. Linux desktop packages, macOS and physical mobile devices are not part of this release.
