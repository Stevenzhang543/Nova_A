# Nova_A 7.0 stable creator platform

Nova_A 7.0 is a stability, consolidation, teaching, and release-evidence milestone for the complete local-first 2D creator platform. It does not add 3D scope and does not use the major product version as permission to break projects.

## Contract decision

The reviewed decision is to retain every existing public contract:

**No schema change is approved for 7.0.0.** A major product number does not authorize a breaking migration; the next contract decision remains deferred until the observation and external qualification gates are complete.

| Contract | Stable identity | 7.0 decision |
| --- | --- | --- |
| Project | Project Format 2 / schema 29 | Retained; schemas 5–29 use preview, backup, deterministic in-memory migration, validation, canonical output, semantic diff, and rollback. |
| Script | Rhai API 2 | Retained; API 1 remains compatibility-only. |
| Visual programming | Visual Graph 1 | Retained with synchronized Rhai API 2 behavior. |
| Extension | Plugin API 2 | Retained with explicit capabilities, sandbox limits, failure isolation, and clean unload. |
| Package | Package Manifest 1 | Retained with hashes, signatures, trust, revocation, vulnerability, provenance, and deterministic archive rules. |
| Build | Build CLI 1 | Retained; commands, exit behavior, JSONL, deterministic export, and host gates stay compatible. |
| Workspace | Workspace document 3 | Retained; old layouts normalize without changing project data. |

No next contract is frozen in this release. The current contracts express the complete 7.0 feature set additively, the observation window is unfinished, and independent external certification is incomplete. A future contract requires an actual demonstrated need plus preview, complete backup, deterministic migration, semantic diff, validation, rollback, golden fixtures, documentation, and an independently reviewed compatibility plan.

## 6.x to 7.x compatibility seal

Existing 6.x documents commonly declare `maximumExclusive: 7.0.0`. Nova_A 7.0 recognizes that reviewed historical boundary. Import preview shows the exact metadata-only seal to `<8.0.0`; schema remains 29 and authored data is not rewritten for the product version alone. The normal migration workflow remains mandatory:

1. Parse without executing project content.
2. Show format, schema, engine range, scene/entity/asset counts, packages, warnings, and exact steps.
3. Download and retain the complete original project.
4. Store the bounded machine-local rollback copy when storage permits.
5. Run the full migration twice in memory and require byte-identical canonical output.
6. Show semantic changes and validation results before committing.
7. Serialize, reparse, and validate every authoritative section.
8. Replace the editor session only after all blocking checks pass.
9. Keep the rollback available; future formats stay non-mutating/read-only.

## Complete feature-readiness model

The Learning Center → Platform readiness view derives from the same public teaching registry as the manuals. Every operation has seven explicit dimensions:

- **Binding:** stable catalog ID, owning panel, reachable workspace, and actual control/logic route.
- **Validation:** prerequisites and finite/permission/host/package validation owned by the subsystem.
- **Undo:** Undo/Redo, subsystem rollback, confirmation/recovery, or an explicit non-mutating classification.
- **Persistence:** canonical project/scene/component/asset/settings ownership, or an explicit editor-only exclusion.
- **Runtime/export:** Play/save/reload/standalone behavior, deterministic build input, or an explicit not-applicable result.
- **Documentation:** EN/DE/ZH classification, prerequisites, exact steps, expected result, persistence, recovery, mistakes, accessibility, and Rhai/Graph equivalents.
- **Tests:** named automated family plus normal-user matrix, or an honest matching-host/hardware/independent external gate.

An absent dimension is release-blocking. `not-applicable` and `external` are explicit results, never silently counted as local passes.

## UI consolidation rules

- One owner for each operation; contextual editors open from the selected asset/object rather than duplicating full settings.
- Canonical names and icons remain stable across command palette, menus, panels, manuals, diagnostics, and shortcuts.
- Every interactive control has a name, keyboard route, visible focus, disabled reason, error recovery, and minimum target size.
- Empty states state what is missing and the next safe action.
- Errors identify the failed value/path, preserve the last valid state, and never hide fatal failures.
- Typography uses the bundled rounded variable families and audited tokens; code uses the bundled mono family.
- Colors use semantic tokens and retain high-contrast variants; color is never the only state signal.
- Motion is short, interruptible, compositor-friendly, and removed by the existing reduced-motion preference without removing state feedback.
- EN/DE/ZH, 100–200% UI scale, high contrast, dark/light themes, narrow windows, high DPI, touch, gamepad, and keyboard must remain contained.

## Support matrix

- **Windows editor/player — Tier 1 local:** editor, portable game, MSI, setup, deterministic package, and launch smoke are local gates.
- **Web editor/player — Tier 1 local:** Web/WASM production output is packaged; serve it through HTTP(S), not `file://`.
- **Linux — matching-host external:** source and pipeline exist; matching-host graphics/audio/input/install evidence is required.
- **macOS — matching-host external:** Xcode, signing, notarization, hardware, and lifecycle evidence are required.
- **Android — optional gated:** JDK, SDK, NDK, reviewed template, permissions, signing, device, input/audio/sensor, and store gates remain explicit.
- **iOS — deferred/matching-host:** no Windows-local claim is made.
- **Console SDKs — excluded:** proprietary SDKs and agreements are not bundled.
- **3D/XR/ray tracing — out of scope:** Nova_A remains a focused 2D engine.

## Release completion

Local completion requires TS, Rust, WASM, Web, native, manual/editor/script/render/animation/typography, template/reference/history/migration, graph parity, physics/renderer/audio/network determinism, plugin lifecycle, interaction/layout, benchmark, stability, dependency/security, deterministic export, Windows editor/game smoke, evidence, exact eleven artifacts, and independent archive/checksum verification. Severity 0/1 must be zero.

Publisher signing, another physical clean machine, second-machine byte reproduction, matching-host Linux/macOS/Android/iOS work, independent beginner/expert/accessibility/security observations, real low-end hardware, and a real wall-clock soak remain external until evidence is attached.
