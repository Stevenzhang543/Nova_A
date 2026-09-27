# Nova_A 26.32

Engine version **26.32.0**. This release refreshes the editor's shared GUI and control sizing while retaining Project Format 2/schema 29 and existing authoring/runtime behavior.

- Compact, flatter dock and card surfaces replace large rounded chrome. Management categories move into a horizontal strip, leaving more room for their forms.
- Workspace, playback, bottom-dock, asset, context-rail and management actions use a consistent SVG system. Ten icon geometries are adapted from Godot with the original MIT notice and a source/hash manifest.
- Ordinary text, selectors, searches, numeric expressions and sliders have bounded measures instead of stretching across wide panels. Labels and compound controls stack or wrap in narrow hosts. Text aligns to the start and numeric values to the end. Code editors keep their dedicated widths.
- Bottom tool tabs stay directly accessible on desktop and scroll when necessary, with a compact selector on genuinely narrow hosts. Existing labels, keyboard actions, dirty indicators, state bindings, animations and theme preferences remain.
- The visual audit visits workspace, bottom-tool, nested management and populated conditional routes, records a screenshot for each inspected state, checks field/card containment, and exercises resize, undo/redo and downloaded save.

## Verification and delivery

The executed-gates report in the release-evidence ZIP is the authority for final results. Current Windows/Web builds, TypeScript, Rust/WASM identity, workspace behavior, visual navigation, native launch/export/physics CLI, static hosting, manual and archive integrity checks are retained. Unrelated performance/soak/security/platform matrices are not rerun or claimed as fresh evidence.

The release directory contains the requested eleven artifacts: portable EXE, setup EXE, MSI, web/source/reference-project/evidence ZIPs, edit ledger, license, release notes and SHA256SUMS.txt. Godot icon notices travel in the root license and web/native assets. No old binary is renamed to a new version.

Windows signing, clean-machine installer lifecycle, physical devices and non-Windows builds remain unverified. The browser audit covers named reachable states, not every possible plugin/device/error combination. Native physics stdio remains distinct from the renderer-disabled full-game authority. Web hosting remains online-only.

Read the source archive's `docs/EDIT_LEDGER_26_32.md`, `docs/COMPETITIVE_REVIEW_26_32.md`, `docs/FORM_DESIGN_26_32.md`, `docs/UI_AUDIT_PLAN_26_32.md`, and `docs/ISSUE_CLOSURE_26_32.md` for exact changes, references and scope.
