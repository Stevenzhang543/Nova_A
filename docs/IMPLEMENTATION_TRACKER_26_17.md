# Nova_A 26.17 implementation and acceptance checklist

Baseline: clean commit `571eda5` (update v26.16), independently packaged 26.16.0 source digest `63d36be333401e083e38eb29eeb3195de0401b3cccaf18ac5c2532e7d1efbe2e`. Preserve every existing release directory. The authoritative scope is the 26.17 section of ROADMAP_26_11_TO_26_20.md. This checklist records incomplete work honestly; an implementation claim requires the named executed evidence.

## Implementation and programmer acceptance

- [x] Inventory every public rigid body, collider, joint and Rope2D property, the supported cloth lattice, character, area, navigation, AI, chunk and portal field. Identify authored versus observed values and trace validation, Inspector/World Studio edit, save/undo, Rust or runtime evaluation and export. No field may silently do nothing.
- [x] Retained Rust bindings: edit each body/material/mask/geometry/mass/inertia/CCD/sleep and joint anchor/limit/motor/break/rope setting after creation. Preserve stable handles and live dynamic state unless an explicit transform or velocity edit commands a change. Test disabled/removed/recreated objects and parent transforms.
- [x] Physics queries: apply exclusions and sensor/layer selection before nearest-hit choice and owner deduplication. Preserve actual compound-child identity. Replace angular sampling for nearest with a bounded geometric closest-point calculation. Verify small off-ray targets, inside hits, rotated shapes, compounds, sensors, masks, exclusions, deterministic ties, malformed input and live reconfiguration in native Rust and compiled WASM/World.
- [x] Character motion: collision-safe step-up, ceiling clearance, floor snap, slopes, one-way surfaces, moving platforms, idle contact refresh, mirrored/parented geometry, disabled/stale handles and one movement integration per fixed tick.
- [x] Solver: analytical force/mass/inertia and units, gravity partitioning, restitution/friction, rotational/translational tunneling, stacking, sleeping/waking islands, contact start/stay/end ordering, joint stress/break behavior, rope collision and cloth lattice. Seeded malformed geometry cases must remain bounded and finite or reject explicitly.
- [x] Navigation: all source modes, clearance and masks; correct cache invalidation after authored geometry, transforms, radius, source tile/asset edits and disabled entities; AStar/HierarchicalAStar/FlowField/polygon paths, costs/links, dynamic obstacles, avoidance and repath budgets. Cooperative baking must refuse stale publication and cancel without partial results.
- [x] AI: perception scale/field of view/tags/limits, lifecycle and blackboard behavior, stable order, disabled entities/packages and bounded budgets. Exercise actual behavior documents with navigation and streamed lifetimes.
- [x] Streaming: actual owned scene/entity activation and deactivation, dependency/budget/cancellation/error behavior, preserved UUIDs and authored enable flags, runtime lifecycle and save handoff, shared scene ownership, stale async completion and cleanup. A loaded document flag alone does not count as simulation streaming.
- [x] Origin shift: preserve body handles, velocity, sleeping/contact state, constraints/rope points, world-space navigation targets/paths, streamed handoffs and scene coordinates. Verify repeated shifts and parented/persistent entities, fixed-step replay and equivalent relative outcomes.
- [x] Measure actual native/WASM physics, query, navigation/avoidance/AI and streamed large-world workloads with host metadata and bounded memory/work. Timings are observations; deterministic replay and cleanup assertions are acceptance gates. Do not promise universal maximum performance.
- [x] Serialize and reopen/export every authored field and supported enum through the actual project format and NovaPak. Retain Project Format 2/schema29 and existing graph/API contracts unless a separately justified migration is required.

## GUI and actual user acceptance

- [x] Readable Physics/Collider/Connection/Character/Area/Navigation/AI/Streaming controls with units, ranges and contextual errors; runtime values separated from authored settings. Resize/scroll/reset must retain reachable fields and meaningful labels.
- [x] Navigation bake and streaming progress, cancellation, invalidation and failure reasons reflect actual work. Invalid authoring drafts and Undo/Redo must preserve the last valid saved/runtime state.
- [ ] EN/DE/ZH, both themes, 100/150/200 percent text and narrow/normal/wide containers for every changed panel. Use actual keyboard/mouse navigation, measured geometry and retained screenshots; programmer DOM fixtures are identified separately.
- [x] Build/edit a playable platformer: change body material/masks/one-way/character settings; Play/Pause/Step, Undo/Redo, save/reopen and compare the exact exported player.
- [x] Build/edit a top-down navigation scene: bake, cancel, move an obstacle, change clearance/costs, observe AI navigation and streamed scene activation, shift the origin, undo/reload and compare the exact exported player.
- [x] Build/edit a physics puzzle: compound bodies, joints and rope/cloth connections; change anchors/materials/masks, observe contact and break behavior, pause/step, undo/reload and compare the exact exported player.

## Teaching and separate release

- [x] Complete matching EN/DE/ZH workflow lessons, current notes and exhaustive edit ledger with all additions/removals and consequences. Preserve historical lessons and the 40 library starters. Add separate 26.17 references with exact engine/schema, controls and expected outcomes.
- [x] Update only current release metadata to 26.17/26.17.0 after implementation review. Freeze all actual authored files, including untracked ones, and qualify the exact candidate.
- [ ] Run all common production gates plus the complete focused and actual-authoring suites. Native artifacts, compiled WASM, Web player, manuals and reports must agree with the source snapshot. Keep failures and create a new candidate after any authored change.
- [ ] Generate and independently verify the existing eleven-file release contract in `releases/v26.17`: portable EXE, setup EXE, MSI, Web ZIP, source ZIP, reference ZIP, evidence ZIP, notes, edit ledger, license and SHA256SUMS. Never overwrite 26.12–26.16.

Physical assistive technology, minimum-device performance, other hosts, publisher signing, disposable installation, public services and long-duration soak remain the roadmap's explicit external qualifications. Local programmer fixtures do not substitute for actual user-input observations.
## Candidate acceptance status

Implementation and focused development checks are integrated. The journal retains intermediate failures and fixes. Final1134-surface layout, common/focus/user/native gates and independent11-file packaging remain execution requirements; the frozen source cannot be edited to tick those boxes afterwards. Their definitive completion status is recorded in the source-bound release evidence and `release-audits/COMPLETION_26_17.md`. No development report qualifies the release.
