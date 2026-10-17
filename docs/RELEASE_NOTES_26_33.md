# Nova_A 26.33

Engine version: 26.33.0. Project Format 2 and the existing schema remain compatible.

This release incorporates the completed compact editor rebuild and Phase II integration fixes:

- Parent transforms stay current after in-place prefab/entity replacement.
- Runtime saves retain the selected slot and restore custom serializers. Verified primary saves remain usable when temporary cleanup is denied; obsolete recovery data cannot overwrite a newer commit.
- Editor transform shortcuts no longer consume gameplay keys during Play/Pause.
- Existing Weld, Motor and Rope Joint components are registered consistently for composition, validation and runtime toggles.
- Generated primitive contracts preserve their source header and compare consistently across Windows line endings.

The capability catalog lists every registered editor operation, component, Rhai API and graph definition. The engine comparison and test matrix distinguish declarations, tested contracts and remaining limits. The established SVG controls, shared field geometry and persistent shell are retained.

## Verification and limits

Development evidence includes Rust tests/lints/builds, real-module failure regressions, browser starter creation/save/reopen/play/stop, platformer movement/jump, multilingual game UI, editor-authored Rhai secondary-slot saves, Web export/player startup, and measured physics/streaming fixtures. Final release qualification must be read from the source-bound release-evidence archive; this document alone does not assert all gates passed.

No claim of zero bugs, exhaustive review of every possible state, realtime performance on all hardware, public-host certification, physical accessibility/audio testing, clean-machine installation, or native scripted game-server support. Native JSONL remains physics-only; the retained headless authority uses a renderer-disabled WebView. See docs/engine and docs/ux for precise evidence and unresolved scopes.

## Delivery

releases/26.33 contains the eleven requested files: ledger, license, release notes, SHA256SUMS, source/Web/reference/evidence ZIPs, portable Windows EXE, setup EXE and MSI. Verify hashes before distribution. Historical release archives are preserved.
