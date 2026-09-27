# 26.31 audit scope and findings

## Architecture and environment

The Vue editor enters through `src/main.ts` and `App.vue`; the player enters through `src/player.ts` and `PlayerApp.vue`. Authoring/history is owned by `src/store/physics.ts` and project transactions. TypeScript orchestrates gameplay, rendering and browser services. `src/world/World.ts` bridges the retained world into WASM. Rust crates provide math, physics, runtime services, Rhai execution, format validation/migration and WASM bindings. `src-tauri` provides native commands, filesystem access, export and the desktop shell. There is no required HTTP application backend for local authoring.

`node_modules`, `dist`, `target`, `src-tauri/target`, `nova_core/pkg` and `release-audits` are generated. `scripts`, `tests`, `templates`, `public` and `reference-projects` support the working product. `godot-master` is a junction to `.cache/reference-sources/godot-master-user-20260919`, reviewed as reference and excluded from release source. Historical documentation and verification wrappers are retained, not treated as current proof.

The available Node 22.22.2 and pnpm 10.30.0 match `.node-version` and package authority. Rust is pinned by `rust-toolchain.toml` to 1.92.0 with the WASM target. Cargo/Tauri/frontend versions are synchronized by a transactional script. No dependency, permission or CSP expansion is part of this release. The initial Windows sandbox failed before process creation; approved commands ran outside it. This is an execution-environment issue, not evidence that the project configuration is broken.

## Reproduced or directly established issues

| Finding | Correction / verification |
|---|---|
| Collapsed dock reserved 34px around controls at least 36px high plus padding | Use intrinsic collapsed height; real-browser containment assertion verifies header stays inside the dock. |
| Short-window Manage header consumes substantial vertical space, especially at 200% text | Compact the heading and hide its decorative lifecycle card at heights up to 800px; retain descriptions and all actions. |
| Some card layouts and section labels rely on fixed side-by-side or ellipsized text | Extend shared container-based stacking to studio cards and wrap section labels/descriptions/actions; test real navigation with representative scales/locales. |
| Font-dependent action glyphs and unnamed compact dock controls | Original shared SVGs; explicit translated accessible names and expanded state; preserve all existing handlers. |
| Version setter rejects already-dynamic i18n release labels | Validate their shared import and six dynamic labels; successful transactional update follows the failed no-write preflight. |
| README calls historical commands/current engine values current | Clarify historical workflow and current version/prerequisites. |
| Previous layout audit mostly maximized tools | Add docked route inspection and collapsed-header containment; preserve save/focus/localization checks. |
| Automatic CI calls an audit hard-coded to 4.0.0; default audit consumes 26.10 evidence; Rust setup differs from 1.92.0 pin | Use version-neutral source/manual/template/environment checks, align Rust setup in four workflows, and add local configuration assertions. The old purported Android-only invocation ignored its argument and ran the obsolete aggregate; the job now accurately checks export templates. Hosted CI and non-Windows runs remain unverified. |

## Feature linkage and completeness

The generated inventory lists 402 registered public operations, 58 component kinds, 169 Rhai API entries and 208 core/API graph-node definitions. For each public operation it lists declared binding, validation, undo, persistence, runtime/export and test routes. These are source declarations, not universal execution guarantees. Read-only/session-only controls do not necessarily belong in project history or export. Presentation changes retain handlers, state bindings and serialized schemas; browser checks exercise pending numeric edit, resize/maximize, save and a downloaded game, while Rust tests cover the existing engine and format suites.

All source/config/fixture files selected by the inventory script are indexed and hashed. All Vue templates are parsed into panel/control/branch records. This is **not** a line-by-line semantic review of all Nova_A or Godot code. No claim that all code errors are fixed, every feature combination works, every conditional UI state was visually inspected, or most text buttons were replaced is made. Conditional plugins, device services, uncommon error states and long-running sessions remain broader coverage work.

## Effective verification

Run current builds and checks tied to the edited shared CSS, icon controls, resize/workspace behavior, save/export and release identities. Preserve failed attempts and screenshots in the qualification run. Full historical Cartesian layout, performance/soak and unrelated algorithm/security suites are explicitly omitted with reasons in `prepare-release-26.31.mjs`. Baseline 26.30 reports remain baseline evidence. Final source-bound 26.31 reports establish release acceptance; no static inventory can substitute for them.
