# Phase II test matrix

Evidence belongs to its executed source; historical reports are discovery aids. Baseline commit: 050ed885c9d1bdb151eef3ab136c98cd121c848f.

| Layer | Command / scope | Current result |
|---|---|---|
| Rust unit/integration/examples | cargo test --workspace --all-targets | PASS: 185 tests; .cache/phase2-baseline-rust.log |
| Rust lint | cargo clippy --workspace --all-targets -- -D warnings | PASS |
| WASM + frontend | pnpm build | PASS; existing chunk-size advisory |
| Native backend | cargo check --manifest-path src-tauri/Cargo.toml | PASS |
| Docs and environment | pnpm audit:manual; pnpm audit:environment | PASS: three-language manual/web checks and five environment checks; hosted CI not executed |
| Frontend foundational behavior | Hierarchy, component lifecycle, schema, assets, history, saves | Select applicable existing assertions, add regressions for reproduced defects |
| Cross-system runtime | Physics events; animation/renderer; tile collision/nav; game UI/input; script host | PASS selected contracts; see counts and limits below |
| Real editor workflows | Create/edit/duplicate/delete/undo/save/close/reopen/export | PASS starter creation/save/reopen/play/stop and actual Web export |
| Representative platformer | Sprites/actions/character/tiles/camera/animation/audio/UI/scene transitions | Verified subset below; full combination not claimed |
| Representative top-down | Movement/collision/animation/camera/navigation/interaction/UI | Verified subset below; full combination not claimed |
| Representative UI-heavy game | Layout/buttons/text/settings/menu/runtime save/load | Verified subset below; full combination not claimed |
| Stability/performance | Scene cycles, sprites/physics/tile stress, meaningful timing/memory | Verified subset below; full combination not claimed |
| UI V2 visual regression | 1366/1600/1920, locales/scales/docks/new contextual workflows | PASS: 197 routes / ten assertions; contact sheets reviewed |
| Release | Web and Windows outputs, dependency closure, reopen, hashes/artifact set | GATED |

No aggregate COMPLETE result until required layers pass. Physics-only native tests are not substituted for an exported game test. Browser geometry is not a physical accessibility or native installer certification.

Current production-module checks: foundations 7; runtime save 10; media 6; project transaction recovery 9; game UI 6; runtime/debugger 3; native/WASM Rhai semantics 14. Sixteen retained suites passed across the initial run and the component-primitives rerun (1,414 boundary checks). Initial failures remain preserved. These checks do not substitute for real browser workflows or exported-game qualification. Exact cases and scope: reports/phase2/.

Additional current-source results: registry 4, world lifecycle 5, streaming 16, physics/gameplay bindings 18, representative browser workflows 3 (with actual movement/jump/UI interactions), editor-authored runtime-save scenario, and static Web export/relocation/player checks 4 all pass. The complete workflow run predates only the added save scenario; the targeted top-down rerun verifies that extension. Preserve both reports, not a fabricated aggregate run.

Measurements: 20 scenes × 10 entities × 5 cycles = 100 activations in 244.2 ms in this Node/WASM fixture, ending at zero entities/cached scenes. A separate 1,000-body fixture took 1,064.4 ms for 30 physics frames and 1,240.9 ms for 100 queries, with one configuration rebuild. These are local observations, not realtime performance guarantees.
