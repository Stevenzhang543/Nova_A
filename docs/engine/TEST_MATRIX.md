# Phase II test matrix — 26.34

Baseline da2182569b7dddb227e7623ce38bf92485d88807. Current baseline Rust all-target and real WASM/frontend build passed before edits. Logs:.cache/v2634-baseline-rust.log and v2634-baseline-build.log. Final candidate commands run sequentially against frozen source; all report freshness and source/artifact hashes are checked. Final authority: release-evidence archive.

| Risk / acceptance | Current test or release gate | Evidence scope |
|---|---|---|
| Lossless nested saves, one snapshot, cancellation and project switches | verify-v26.34-save-transactions + verify-engine-save |15 new +10 retained actual-module checks; five original failures and two newly introduced staging races preserved before repair |
| Read-only particle preview, zoomed/rotated/subviewport camera | verify-v26.34-render-media |9 numerical/runtime/serialized checks; initial five failures preserved |
| Wheel UI/game ownership | verify-v26.34-input-ownership + verify-v26.34-input-user |7 module contracts plus actual normal project/ScrollPanel/native field/Inspector/Design/Game/keyboard input; no private state injection |
| Profiler evidence correctness | verify-v26.34-performance-evidence |8 controlled telemetry tests, six before failures; estimates/unavailable GPU never become measured certification |
| Hierarchy identity/prefab history | verify-engine-foundations + verify-v26.34-authoring-user |7 module cases; actual empty project/import/nested reuse/undo/redo/download/reopen |
| Existing joints/components | verify-engine-component-registry |4 actual composition/toggle/serialized contracts |
| Animation/audio/resource persistence | verify-v26.28-media + verify-v26.28-media-bindings |6 media +9 binding cases on current source; controlled audio host is explicit |
| Game UI layout/focus/native forms/localization | verify-v26.28-game-ui + game-scenarios + browser workflows |6 module cases and actual responsive starter interactions; no physical AT/IME claim |
| Scene/navigation lifetime | verify-v26.29-world + verify-v26.17-world-streaming |5 navigation/ownership +16 compiled-WASM scene/streaming checks; no full rollback/navmesh claim |
| Platformer/top-down/UI-heavy integration | verify-v26.34-game-scenarios |Actual template generation/parser/migration/serializer/runtime/compiled WASM physics/Rhai; host canvas/audio/storage fixtures identified |
| Fresh user workflows | verify-engine-workflows |3 launcher templates, actual saved project/reopen/game input/stop, Unicode input and Rhai secondary-slot save |
| Actual authored game export | verify-v26.34-reference-game |Code/graph mode roundtrip, speed edit/undo/redo/save/reopen; exact packed source; screenshot-guided6-checkpoint completion and R restart |
| Static hosting and relocation | verify-v26.34-static-host-user |Actual root/subpath editor/PWA files, Unicode/spaces moved project, ZIP/export/source native-WASM parity, independent player startup |
| UI V2 containment and navigation | verify-ui-rebuild-layout-user --final |Actual docked/maximized/disclosed panel routes,1366/1600/1920, representative locales/scales/palettes, shared fields/sliders, pending save/undo; captured PNGs require visual review |
| Engine/build/environment | native-build/rust/wasm/web/typescript/focus |Real current compilers, exact binary versions and actual runtime bridge; build warnings do not conceal failures |
| Windows/native integration | windows/headless + verify-v26.34-native-headless |Real local Windows processes, export startup and native physics JSONL bounds/replay/disposal; no clean-install/non-Windows/full native-scripted-server claim |
| Source/archive integrity/manual | hygiene/manual/product + independent packaging |Frozen source, fresh reports/attachments, three-language current manual, eleven artifact names and actual SHA256 checks |

Declared catalogs are discovery indexes, not executed tests. A passed controlled Canvas recorder does not establish browser pixels; module callbacks do not establish hardware audio. Before reports are retained separately; qualification never relabels old reports. Long-duration soak, unrelated vulnerability certification, duplicate historical geometry matrices and hardware-wide performance are explicitly omitted in the risk plan.

Low-priority recorded follow-up: manually constructed valid-frame captures with nonfinite GPU/draw-call/texture telemetry may produce nonfinite comparison deltas. Their measured budgets correctly fail, current renderer telemetry is normalized, and no actual-user regression was observed. Harden arbitrary externally fabricated telemetry if capture import becomes supported; do not infer hardware timing from these fields.
