# Nova_A 26.21 release notes

Public version 26.21 · Engine 26.21.0 · Project Format 2/schema 29.

26.21 improves editor readability and the reliability of editing history while retaining all existing features, animations, palettes and output-quality settings.

## Changes

- Remember Automatic/Above controls form labels, with English, German and Chinese help. Labels respond to panel width and text scale; numeric pairs, sliders, search and annotation fields retain usable space.
- Show the complete selected dropdown value on pointer hover or keyboard focus. The wrapping tooltip preserves native selection and authored descriptions; Escape dismisses it.
- Keep hierarchy headers and filters usable with large text. Virtual spacing stays inside the scroll container; row heights follow text scale, and full names remain available.
- Give context navigation text-scaled space and complete word wrapping, retaining accessible compact navigation and scrolling. Keep floating panels inside the available editor area and prevent Workspace Manager Escape from clearing the selected entity.
- Allow Ctrl/Cmd+S from focused form controls, committing blur-based changes before saving while preserving native text-editing shortcuts.
- Keep rapid X/Y edits independently undoable. Delayed edit callbacks retain originating project/control identity and cannot commit into a replacement or reloaded project. Unmount cancels pending work.
- Reduce repeated unbound-shape scans, control-label refreshes and document-wide control-ID collision searches without changing geometry resolution, effects or animations.
- Migrate historical partial production/Build settings using missing-only defaults. Preserve scripting API versions, supported pen/sensor bindings and known legacy script references. Repair three proven duplicate component UUIDs in authored references.
- Add six current reference projects, three localized lessons, current starter walkthroughs, source/feature/panel inventories, competitor comparisons and a ten-version implementation manual.

## Audit and compatibility boundaries

The release evidence is authoritative for executed gates and producing source hashes. Inventories are not proof that every possible field or conditional state works. Full-frame performance and large-scene loading remain separate from virtual-scroll correctness. No universal best-FPS claim is made.

Only Windows/Web can be qualified on this computer. Independent users, assistive technology, other platforms/devices, production signing, disposable installation lifecycle, public-network testing and true-duration soak remain external. Native authority retains its documented renderer-disabled WebView boundary.

## Files

The qualified release belongs in releases/v26.21 with exactly eleven files: this release note, the full edit ledger, license, checksums, source/Web/reference/evidence ZIPs, and Windows portable/setup/MSI binaries. Prior release directories are preserved. Packaging is permitted only after the current source-bound qualification gates pass; the presence of these notes alone does not mean the release is qualified.
