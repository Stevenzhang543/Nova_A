# Nova_A 26.03 release notes

Machine version: **26.3.0**. Project Format: **2**. Schema: **29**. Rhai API: **2**. Visual Graph: **1**.

## Added

- Comment-safe optional types, inference, map-backed structure/data contracts, and constrained generic-like helper documentation.
- Stable statement identities, exact statement-bound breakpoints, edit remapping, project module cycles, and expanded diagnostics.
- Cancellable script tasks, richer object watches, call-stack inspection, and current values rendered on Visual Graph blocks.
- Structural code↔graph conversion coverage with explicit Execute Rhai module/statement/expression blocks.
- Standard LSP 3.17 `Content-Length` stdio server; legacy JSON-lines and in-app Worker services remain supported.
- 26.03 programmer, normal-user, localization/layout, performance, stability, build, evidence, and release-package gates.

## Changed

- Script Studio has a dedicated Types & Statements Inspector view and exposes module-cycle failures before execution.
- Breakpoints are remapped on save by stable statement identity instead of remaining attached to stale line numbers.
- Visual Graph Code reports native versus escape coverage and keeps unsupported source explicit and reviewable.
- Release authorities now use public 26.03 / machine 26.3.0.

## Removed

Nothing. No feature, animation, visual component, public format, or compatibility path was deleted.

## Compatibility and external gates

26.03 is additive over 26.02. Historical projects, templates, Rhai scripts, visual graphs, packages, plugins, workspaces, builds, and players retain their current contracts. Publisher signing, independent clean-machine/usability/accessibility/security review, matching-host non-Windows builds, hardware/store certification, and real 72-hour soak are not represented as locally complete.
