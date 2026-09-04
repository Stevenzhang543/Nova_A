# Nova_A 26.10 stable lightweight creator platform

Nova_A 26.10 consolidates the local-first 2D engine and editor without deleting a feature, authoring route, visual component, animation, runtime tick or exported behavior. Stability means that every advertised operation has an owner, validation route, recovery disposition, persistence owner, runtime/export disposition, documentation anchor and evidence family. It does not mean every external platform or independent study was run locally.

## Contract decision

No breaking contract or schema change is approved for 26.10. The retained authorities are:

| Contract | Authority | 26.10 decision |
| --- | --- | --- |
| Project | Project Format 2 / schema 29 | Retain; supported historical schemas migrate only after preview, complete backup, deterministic conversion, semantic diff, validation and rollback. |
| Gameplay script | Rhai API 2 | Retain; API 1 is compatibility-only and may not bypass API 2 permissions or limits. |
| Visual programming | Visual Graph Format 1 | Retain; stable identities and bounded Code blocks preserve source that cannot be structurally represented. |
| Extension | Plugin API 2 | Retain; capability review, WASM limits, fault isolation and clean unload remain mandatory. |
| Package | Package Manifest 1 | Retain; dependency hashes, trust, advisories, provenance and deterministic archive rules are additive. |
| Build | Build CLI 1 | Retain; commands, exit status, JSONL, deterministic output and host gates stay compatible. |
| Workspace | Workspace document 3 | Retain; old layouts normalize without rewriting project content. |

A future contract opens only when a demonstrated incompatibility cannot be solved additively. Approval requires migration preview, complete backup, deterministic conversion, semantic diff, validation, rollback, golden fixtures, ecosystem impact evidence and an independently reviewed compatibility plan.

## Readiness authority

`src/runtime/stableCreatorPlatform.ts` maps every Learning Center operation through one exact domain policy. There is no catch-all policy. Module initialization fails if an operation matches zero policies or more than one.

Each dimension has a status, authority, source, route and concrete explanation:

- **Binding:** owning component or runtime module and exact operation identity.
- **Validation:** subsystem that rejects invalid state before mutation.
- **Undo:** project transaction, workspace rollback, recovery boundary, or explicit non-mutating exclusion.
- **Persistence:** canonical project, scene, asset, settings or workspace owner, or explicit ephemeral exclusion.
- **Runtime/export:** shared Preview/Play/player/build route, or explicit editor-only exclusion.
- **Documentation:** stable EN/DE/ZH manual anchor. Manual content and link parity are release gates rather than assumptions.
- **Tests:** named executable family. A mapping is not a passed result; the release report records the outcome.

`covered` means a concrete route exists. `not-applicable` means the scope contract excludes that dimension. `external` means evidence cannot be produced by the local run. External platform-wide gaps are kept in the typed gap register rather than being silently counted as local success.

## Product and interface rules

- Every public name, icon meaning, shortcut, empty state and error must be consistent across menus, command palette, contextual panels, manuals and diagnostics.
- One workspace owns each operation. Contextual editors appear for the selected object or asset instead of duplicating every setting in the right panel.
- Every control has a stable identity, accessible name, keyboard path, visible focus, disabled reason, validation result and recovery action.
- Destructive operations name their target and recovery boundary. Fatal failures remain visible until repaired or deliberately acknowledged.
- EN/DE/ZH, long and pseudo-localized text, light/dark/high contrast, reduced motion, keyboard-only use, 100–200% editor scale, high DPI and 1024×640 through 4K layouts must remain contained and reachable.
- Motion communicates hierarchy and state, remains interruptible, and uses compositor-friendly properties. Reduced motion removes travel, never the resulting state or feedback.

## Performance invariant

Performance work may cache, virtualize, index, coalesce pointer samples, batch render work, schedule bounded workers, stream assets and lazy-load mutually exclusive editor areas. It may not remove controls, visual feedback, animations, render paths, simulation behavior or authoring capability.

Every accepted optimization compares the same fixture and input trace before and after. Canonical serialized output, runtime checksums, event order and representative screenshots must stay equivalent. Measure cold start, workspace switch, Inspector open, drawing and dragging input-to-pixel latency, Visual Graph pan/zoom/drag, p95 and worst frame, one-percent-low frame rate, memory slope, worker fallback and 10k/50k/100k data sets. A source-token scan or generous timeout alone is not performance evidence.

## Release qualification

The local candidate must pass TypeScript, all Rust targets, release WebAssembly, production Web and Tauri builds, templates, full history/migration/reference projects, Rhai↔Graph↔Event parity, fuzz/security, renderer/physics/audio/network determinism, plugin lifecycle, native/Web exports, absolute control traversal, localized layout/accessibility, performance equivalence, memory/stability, dependency/repository hygiene and exact release-package verification. Severity 0 and 1 must both be zero.

The authoritative limitations are in `PLATFORM_GAP_REGISTER_26_10.md` and `SUPPORT_MATRIX_26_10.md`. Publisher signing, disposable clean-machine lifecycle, another-machine reproducibility, matching-host platforms, device/browser/assistive-tech matrices, independent user/security studies, real low-end hardware and the real 72-hour soak remain `deferred-external` until evidence is attached.

Related documents: `API_SDK_26_10.md`, `MIGRATION_26_10.md`, `TROUBLESHOOTING_26_10.md`, `REPRODUCIBILITY_26_10.md`, `CLEAN_MACHINE_QUALIFICATION_26_10.md`, and `INDEPENDENT_USABILITY_26_10.md`.
