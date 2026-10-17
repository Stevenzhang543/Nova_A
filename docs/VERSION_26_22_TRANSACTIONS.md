# Nova_A 26.22 — document transactions and property application

Engine 26.22.0, Project Format 2/schema 29. Release qualification is established by the frozen snapshot and packaged gate reports. The inventories below retain scoped evidence and explicit limits; they do not certify every input or zero defects.

## Editing and rollback

Numeric and path fields retain invalid drafts with inline feedback. Escape restores the authored value. Valid values commit before parent normalization. Numeric steps, units, mixed values, destination identities and intentionally wider numeric companions remain available. Inspector/settings groups wrap and remain scrollable at enlarged text sizes.

History keys include the resource and field. Separate field edits remain separate; continuous inspector and mixer gestures form one transaction. Save, Undo/Redo, scene changes and playback settle pending edits. Stale callbacks cannot apply to a replacement owner. Serialization and nested-operation failures retain recoverable state. Scene navigation captures outgoing authored data.

Project Save/export/Play/Step reject unsaved studio asset drafts and identify the owning asset. Its editor must save or explicitly discard/reload it. Dedicated animation asset preview still auditions unsaved clips. Material/particle drafts retain exact text across asset and panel changes, including malformed advanced JSON; clean history refresh cannot replace recovered drafts.

Public Entity scalar/vector/color/boolean setters and Triangle vertices reject malformed values before mutation. Component paste/load validates declared primitive types and enums, ignores inherited schema keys, and preserves removed/live component identities. Fractional and nonfinite input binding indices are rejected. Legacy unlimited joint/rope thresholds retain explicit null/Infinity conversion; finite values and zero retain their supported semantics.

Prefab comparisons use canonical order. Selection, references, overrides and replacement ownership have separate tests. Reviewed semantic merges and repair previews reject stale source; repair also rejects altered proposed output and invalid/unsaved drafts. Embedded-image filenames match their stored paths. Recent-project timestamps and unchanged text writes do not introduce spurious document changes. History memory accounting includes grown merged commands. New asset records initialize hydration-compatible metadata.

Graph unlink clears metadata and real link comments while preserving strings, block comments and other bytes. Node replacement preserves compatible external wires and removes invalid endpoints. Tilemap bake status belongs only to the current request, so an older cancelled request cannot overwrite its replacement.

## Programmer audit

- The canonical component corpus covers owner writes, hydration, compiled WASM and deterministic NovaPak retention; 660 editable values have explicit whole-component Undo and field Redo checks. Primitive contracts cover 595 fields across 59 concrete component identities with 1,414 boundary cases.
- The settings corpus covers 451 fields and 580 candidates. The import corpus covers 113 fields and 178 candidates. The media corpus covers 155 paths with 255 accepted cases and 21 rejected candidates. Decoding, transcoding and physical-device quality are not inferred from stored values.
- Additional suites exercise entity/scene metadata, connections, materials, packages, event sheets, blueprints, UI themes, reference ownership, draft recovery, no-op/nested history, failure compensation, asset operations and native/export reopening.
- Direct action suites cover shape/gizmo/layer/clipboard operations, connection routing/binding, prefab/scene replacement, tile strokes, source recovery, animation reimport, skin weighting, team records, package quarantine and actual file import. Automation tests execute the real Rhai WASM VM and verify preview/apply/rollback, permissions, stale source, cancellation and partial failure. Local Ed25519 tests reject tampering and replay.
- Every one of the 2,010 enumerated public operations has execution evidence or an individually reviewed exclusion: 1,461 and 549 respectively. Excluded entries never acquire a passing execution case. Source-hashed supplemental traces remain separate from frozen qualification reports.
- All 2,854 field/declaration entries have named owners and six stage dispositions. Canonical aliases link their actual owners; container evidence explicitly identifies its populated-child scope. Runtime/input/structural limitations remain visible. Twenty-two named executable families link observable assertions independently of JSON equality. See the runtime gap register for unsupported behavior.

## Actual-user and panel checks

The source inventory parses all 84 Vue surfaces, enumerating 3,011 controls and 1,623 conditional/repeated sections. It is a structural index, not a passing interaction count. The browser matrix records visited panels and prerequisites across English/German/Chinese, five palettes, 1024/1366/1920 widths and 100/150/200 percent scale. Only recorded rendered states are qualified.

User suites exercise rapid independent edits, long gestures, mixed values, invalid drafts/Escape, selection changes, prefab apply/revert, cross-scene edits, external merge, immediate Save, reopening and exported gameplay. Additional checks cover floating/docked panels, retained material/particle/event drafts, playback rejection and fifty real Play/Pause/Stop cycles. Native screen-reader and independent human acceptance remain external.

## Teaching, compatibility and release

Six current references and forty templates retain their game/rendering behaviors. Three localized workshop lessons and 120 starter walkthroughs are included in the offline manual. No feature or animation was intentionally removed. No format/schema increase is required.

Freeze the completed source, run all fresh qualification gates, and package exactly eleven files in releases/v26.22: release notes, edit ledger, license, SHA-256 manifest, source/Web/reference/evidence ZIPs and Windows portable/setup/MSI binaries. Verify the archives, identities, hashes and all prior 26.21 artifact hashes. A passing development report does not replace a frozen gate.

Only Windows/Web are locally available. Other platforms, signing and disposable installation lifecycle, independent assistive technology, physical audio/device testing, live vulnerability advisories and genuine long-duration soak retain their separate acceptance requirements.
