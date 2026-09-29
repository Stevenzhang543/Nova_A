# Phase II implementation roadmap — 26.33

Status: core regression closure and representative workflows verified; category limits and final qualification remain under review. Follow engine → UX → UI V2 → release order. No arbitrary feature additions or new design-system replacement.

| Step | Status | Exit criteria |
|---|---|---|
| P0.0 Establish baseline | PASS | Clean starting commit, Rust tests/lints, native check, full WASM/frontend build, docs/environment checks recorded |
| P0.1 Systematic internal audit | IN PROGRESS | All A–Z/additional categories have runtime/persistence/editor/test traces and precise limits |
| P0.2 Current official competitor research | IN PROGRESS | Godot, Unity2D, GameMaker, Defold and Construct sources; granular evidence matrix |
| P0.3 Architectural prerequisites | IN PROGRESS | Reproduce foundational gaps; document consequences/acceptance before fixing |
| P1 Capability closure | IN PROGRESS | Required deficits integrated and validated across runtime/persistence/editor/history/docs |
| P1 Representative games | IN PROGRESS | Platformer, top-down and UI-heavy tests plus one coherent authored game without engine-source hacks |
| P1 Performance/stability | MEASURED SUBSET | Measured representative costs, load/unload lifetime checks, no speculative optimization |
| P2 UX audit and implementation | IN PROGRESS | Engine phase substantially complete; practical workflows validated |
| UI V2 integration | PLANNED | UX stable, UI_V2_PLAN.md created, shared design preserved and visual QA passed |
| 26.33 release | GATED | Final source-bound build/tests, game export/reopen, complete matrix, eleven artifacts and verified hashes |

## Release requirement

User explicitly requested release 26.33 after all Phase II edits. Stage only at the final verified source; preserve releases/26.32 and earlier. Expected files in releases/26.33: EDIT_LEDGER.md, LICENSE.md, Nova_A-v26.33-reference-projects.zip, Nova_A-v26.33-release-evidence.zip, Nova_A-v26.33-source.zip, Nova_A-v26.33-web.zip, Nova_A-v26.33-windows-x64.msi, Nova_A-v26.33-windows-x64-portable.exe, Nova_A-v26.33-windows-x64-setup.exe, RELEASE_NOTES.md, SHA256SUMS.txt. Native installer existence is distinct from tested clean-machine installation.

## First confirmed P0 prerequisite

P0-HIERARCHY-01: correct cached parent identities after in-place entity replacement. This is required for existing prefab workflows, not a new feature. Acceptance and consequences are recorded in ENGINE_CAPABILITY_AUDIT.md. Execute module regression first, fix index invalidation/resolution, then actual prefab/history integration checks. Continue category audit; this item alone does not complete Phase II.

## Current closure evidence

- P0 hierarchy, runtime save, keyboard ownership and joint registry defects are fixed with preserved pre-fix evidence.
- Three freshly authored starters pass creation/save/reopen/render/stop. Platformer movement/jump, top-down W/S, multilingual game-UI input/checkbox, and editor-authored Rhai secondary-slot saves pass.
- Web export bytes, project/assets, native/WASM imported script parity and independent nested-path player startup pass.
- Eighteen retained binding contracts and sixteen streaming contracts pass. A 100-activation streaming workload ends with zero cached scenes/entities. A 1,000-body/30-frame and 100-query workload records timings without claiming hardware FPS or absence of all memory leaks.
- Begin the dedicated UX/UI integration review now that these core paths are stable; do not replace the established design system. Required release qualification and reference-game completion remain pending.
