# Nova_A 26.22 release notes

Public version 26.22 · Engine 26.22.0 · Project Format 2/schema 29 unchanged.

Release identity and successful gates are established by the packaged source snapshot, qualification evidence and SHA-256 manifest. The release notes do not substitute for those checks.

## Changes

- Retain invalid numeric expressions for correction and support Escape to restore the authored value. Apply validated values before parent normalization handlers. Preserve fractional/default stepping and the original free numeric ranges accompanying sliders.
- Add field/resource identities and readable wrapping numeric controls across the main, runtime, gameplay, world, asset, presentation, project-physics, device-input and rendering inspectors.
- Keep separate field edits independently undoable. Group long inspector and mixer slider gestures into one transaction. Settle pending edits at document boundaries and reject stale control callbacks after resource/project replacement.
- Preserve recoverable transactions after serialization failures. Improve grouped failure compensation, redo cursor recovery, nested history handling, scene navigation and reviewed semantic-merge identity.
- Reject nonfinite public Entity numeric/vector/color writes before modifying their component owner. Validate component scalar enums and malformed project records before partial load/paste changes.
- Preserve live collider replacements despite retained removed records. Keep explicit unlimited joint limits, canonical prefab override comparisons and unchanged text-asset writes without redundant invalidation.
- Preserve zero-valued audio import settings and loop-region identities. Prevent crossed loop endpoint drafts from silently deleting the region.
- Preserve Save/Undo/Redo by separating Recent Projects timestamps from authored metadata. Enforce history memory limits after merged edits grow. Initialize asset metadata at creation so first Undo restores the same record.
- Retain connection-dialog numeric drafts, block invalid saves, and preserve unlimited legacy rope thresholds through migration and JSON reopening.
- Add separate canonical property, document-boundary, direct API, media, import and actual-user regression suites. Add six current reference projects, localized lessons, starter walkthroughs and migration guidance.

## Qualification status

The detailed implementation tracker and source-bound evidence distinguish accepted field values, rejected drafts, runtime effects and actual browser interactions. All enumerated fields and public operations have named dispositions. Input-domain, structural and runtime limits remain explicit; development passes alone do not authorize packaging. No feature or animation has been intentionally removed, and no universal FPS or device-quality improvement is claimed.

Only this Windows/Web environment is available locally. Other platforms, independent users and assistive technology, production signing, disposable installation lifecycle, physical device audio and true-duration soak remain separate external acceptance checks.

## Release files

Following final builds, source freeze and qualification, `releases/v26.22` must contain exactly eleven verified files: release notes, edit ledger, license, SHA-256 checksums, source/Web/reference/evidence ZIPs and Windows portable/setup/MSI binaries. Preserve prior releases and verify their hashes independently. No earlier binary or report may be relabelled as a new 26.22 output.

Material graph numeric controls retain invalid drafts and support bounded expressions. Material Save validates pending graph input. After saving, Undo and Redo refresh the still-open material graph; unsaved local drafts are preserved. Three browser cases verify these behaviors.

Typed scalar and vector material uniforms support retained expression drafts and readable wrapping. Rendering navigation uses full-width rows and a bounded scrolling header so large text does not consume the editing area. The material UI audit verifies field reachability across 27 language/scale/viewport combinations. Asset-library folder, collection, favorite, filter, preset and trash operations have six additional whole-document history regressions.

The authored Inspector now blocks keyboard focus as well as pointer edits during Play and Pause. Stop restores normal authoring interaction; the eight-case property user suite verifies restoration and existing edit/history workflows.

Development additions: Inspector numeric widths now use the actual scaled input typography, and Property Details wrap below coordinate controls. Material Save now detects a replaced asset source and retains the draft with localized explicit discard/reload recovery; its browser regression passed on the development build.

Particle graph development fixes: all fourteen scalar/vector numeric controls retain invalid expressions for correction; asset Save and Apply settle pending edits. Clean graph fields follow Undo/Redo, and stale drafts cannot overwrite a replaced asset. The particle card layout now scrolls without overlapping the asset selector and graph. These fixes have separate browser regression evidence; full release qualification remains pending.

Playback snapshot restoration now preserves authored component order, including removed collider records and UUIDs. Fifty exact rehydration comparisons and fifty real editor Play/Pause/Stop cycles passed on the isolated development build, followed by save/reopen. This is bounded development evidence, not long-duration or frozen release qualification.

Event-sheet development fixes: priorities and the saved seed use retained integer expressions with inline errors. Save/navigation validate pending fields; clean drafts follow Undo/Redo and dirty drafts retain explicit conflict recovery. Malformed authored API writes and incorrect asset destinations are rejected before mutation. The main event pane now scrolls so scaled headers do not obscure its controls; the targeted event-editor audit passed all 27 language/scale/viewport configurations. Full frozen-build layout qualification remains pending. The saved seed remains unbound to runtime random streams, as recorded in the gap register.

Component paste now validates declared primitive types before writing, preserving valid null/undefined and unlimited-joint semantics. Generated contract checks cover 595 concrete fields and 1,414 named boundary cases.

Public Entity boolean setters reject non-boolean values before mutation. Component paste ignores inherited schema keys, preventing a crash on reserved property names while preserving its prototype. Programmer audit runs now begin with an incomplete result so an interrupted rerun cannot retain an older passing report.

## Additional correctness fixes

- Global project Save, export, Play and Step validate numeric drafts and reject unsaved studio assets; animation asset audition remains available.
- Material and particle drafts retain exact text across selection and panel replacement; old tilemap bake requests cannot overwrite a replacement request’s progress.
- Graph unlink removes real link comments and metadata while preserving strings, block comments and other source bytes. Node replacement preserves compatible external wires.
- Triangle vertex writes reject invalid coordinates before changing renderer/collider state. Input rebinding rejects fractional and nonfinite indices.
- Repair previews are bound to reviewed project/source output and pending-draft checks; stale approvals cannot overwrite newer work.
- Embedded image names agree with stored paths, preserving paths on reopening.
- Additional executable audits cover automation with the real Rhai WASM VM, signed local security bulletins, asset recovery/import, prefab/scene ownership, tile strokes, animation reimport, skin weights, team metadata and package quarantine.

The review inventories include 2,854 named field entries and 2,010 public operations (1,461 linked to execution, 549 explicitly excluded). Observable effects are linked for 22 named families. These figures count scoped evidence and classification, not all possible input combinations or absence of all defects.
