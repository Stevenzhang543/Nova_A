# Nova_A 26.44 — development plan and status

Maintainer's brief for 26.44 (20 Oct 2026), with the choices made when asked:

1. Fix, check or correct the shortcomings found in earlier rounds that were not changed yet (no new problems reported: work from the list of leftovers).
2. Keep upgrading the physics backend: solver and joints first, then character and platform feel, then performance and large scenes.
3. More features: the animation system, level tools, finishing the editor window structure, and debug tools.
4. Scale about the same as 26.43. Release 26.44 with the full release set at the end.

File-by-file record: `docs/EDIT_LEDGER_26_44.md`. No Git writes; the maintainer commits by hand.

## Plan

| Area | Work | Checks |
|---|---|---|
| Solver and joints | Box2D v3 style Soft Step: contacts collected once per step with a speculative margin, soft contact constraints (frequency, damping ratio, capped push-out), one biased solve and one relax pass per substep, restitution after the substeps, warm starting keyed by contact features, 2-point block solver. Distance, spring, revolute and prismatic joints as soft constraints with limits and motors. | `cargo test`, random pile stress example, `physics_bench` |
| Broad phase and large scenes | Dynamic AABB tree; resting pairs kept without re-colliding; large tile-level bench. | `physics_bench` (level scenes) |
| Character and platforms | Slopes, moving-platform carry (also teleported kinematic platforms), one-way drop-through, coyote time and jump buffer, Platformer gravity from the world. | Rust regressions, runtime verify script |
| Animation | State machine: any-state transitions, enter/exit events, crossfade, script API; tweens with Penner easing; Blocks; Inspector UI. | unit tests, verify script |
| Level tools | Auto-tile (8-neighbour / 47 blob) for every tile tool, prefab instance refresh, animated tile chunk cache. | unit tests, verify script |
| Editor structure | Bottom panel preset heights, Inspector two-row header with filter menu, side bar merge. | editor verify scripts |
| Debug tools | Script breakpoints and stepping; physics recording ring buffer with scrub and replay. | unit tests, verify script |
| Leftovers | Latency probe records, deterministic sine/cosine for any angle. | — |

## Status

| Area | Result | Checks |
|---|---|---|
| Solver and joints | Soft Step with block solver, speculative contacts, restitution after the substeps; soft distance/spring/revolute/prismatic joints with limits and motors; revolute position projection. Stale friction impulse and tile-seam fall-through (26.43 too) fixed. Random pile stress: 144 runs, 0 failures (26.43: 20 failures). | `cargo test` (nova_physics 117), `physics_stress`, `physics_bench` |
| Broad phase and large scenes | AABB tree, resting pairs kept, early wake; release bench 26.43 → 26.44 (ms per step): pyramid-20 3.56 → 0.51, 1,600 tiles + 1,000 boxes 12.0 → 1.56, 2,000 tiles + 3,000 boxes 38.5 → 4.39; TypeScript frame of the 1,000-box level 12.2 → 5.5 ms mean, queries 4 → 0.2 ms. | `physics_bench`, `.cache/perf/world-sync.mjs` (container) |
| Character and platforms | Recovery from overlaps, floor velocity at the feet (rotating platforms), floors moved by scripts or animations carry the character, one-way drop-through (script and Platform Controller), jump buffer, jump cut, world gravity for the Platformer. | Rust regressions; `verify-2644-animation` (drop-through); 2643 character-edge 3/3 |
| Animation | Any State, crossfade, state signals, script reads; tweens with 31 easings; 7 new Blocks; Any State in the controller graph. | `verify-2644-animation` 5/5, nova_script tests, blocks fixture |
| Level tools | Terrain auto-tiling (16 or 47 tiles, connected terrains, per-map rules, every tool, template layout); animated tiles rebuild only their chunks. Prefab instances in other scenes are not refreshed (see below). | `verify-2644-level-tools` 7/7 |
| Editor structure | Context tools merged into the Hierarchy panel; Inspector two-row header with a filter menu; three dock heights. | `verify-2644-editor-structure` 5/5; 2640 7/7, 2641 6/6, 2643 shell 5/5 |
| Debug tools | Rhai line breakpoints and stepping with VM locals and call stack (re-run to the stop); physics recording with scrub and continue. | `verify-2644-debugger` 6/6 (real WASM), nova_script test |
| Leftovers | Engine-independent sine/cosine (bit-identical to the WASM core's libm); latency probe through the desktop host. | `verify-2644-trig` 2/2; probe: see release evidence |

Container checks used Chromium (SwiftShader) and the 26.44 WASM built on Windows.

## Not done in 26.44

- Prefab instances in scenes that are not open are not refreshed when their prefab changes: the stored overrides are not complete enough to rebuild them safely (a moved instance could jump back). Open scenes are refreshed when Apply is used, as before. Prefab variants stay snapshots of their base.
- Line debugging covers text Rhai scripts; visual graphs still step through their commands. The VM is not suspended mid-call: a stop re-runs the callback from its start, so a stop inside a very long callback costs one extra run per step.
- Physics recording rewinds bodies only; scripts, timers, animations and audio keep their current state.
- Real Safari/iPad testing, Linux and macOS packages.

## Release

Released on 20 October 2026 to `releases/v26.44` (eleven files, all matching `SHA256SUMS.txt`) by `.cache/_latency/release-26.44.cmd`: Rhai signatures, both builds and every check (33 of 33 steps pass; `.cache/evidence-26.44/checks-release`), then `scripts/package-release-26.44.ps1`. The released editor made and played a Platformer project, recorded and rewound physics in the Physics Monitor, and exported it for Windows and Web; both games were played and the exported Windows game delivered latency probe records (`.cache/evidence-26.44/README.md`). Notes: `docs/RELEASE_NOTES_26_44.md`. To repackage after a document change without rebuilding: `.cache/_latency/repackage-26.44.cmd`.
