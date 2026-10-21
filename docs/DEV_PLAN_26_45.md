# Nova_A 26.45 — development plan and status

Maintainer's brief for 26.45 (21 Oct 2026), with the choices made when asked:

1. Fix, check or correct the shortcomings found in earlier rounds that were not changed yet (work from the list of leftovers).
2. Keep upgrading the physics backend: shapes and terrain collision, joint extensions, area forces and materials, continuous collision and determinism.
3. More features: finishing prefabs, game UI and input, finishing the debug tools, particles and visual effects.
4. Clean the project thoroughly: delete files that are no longer used, keep reusable caches; check `.gitignore` so Git holds code, the resources the build needs and the documentation only.
5. Scale about the same as 26.44. Release 26.45 with the full release set at the end.

Cleanup choices: delete `reports/`, `Claude outputs/`, `nova/` (26.35 website delivery), the verify scripts of v6–v26.39 that the current checks do not use (with their npm entries, fixtures and helpers) and the version documents of 26.39 and earlier; delete untracked leftovers (`release-audits/`, the one-off files in `.cache/`, `dist/`, export files in the repository root); keep `node_modules`, `.pnpm-store`, the Rust `target` folders, `.nova-build-cache`, TypeScript build info, `godot-master` and `.dsh`. `AGENTS.md` was deleted by the maintainer on purpose and stays deleted; its rules still apply (no Git writes).

File-by-file record: `docs/EDIT_LEDGER_26_45.md`. No Git writes; the maintainer commits by hand.

## Plan

| Area | Work | Checks |
|---|---|---|
| Cleanup | Delete unused scripts, documents, reports and website delivery; fix the manual and in-app references to deleted files; one generic release script set instead of per-version copies; `.gitignore` for code, build resources and documentation; repository checks that pass again (manual, template catalog, typography, hygiene, engine boundaries). | `pnpm audit`, build |
| Shapes and terrain | Concave polygons split into convex pieces (ear clipping + Hertel–Mehlhorn); rounded polygons and true capsules (Box2D v3 style core polygon + radius); tile colliders merged into larger rectangles. | `cargo test`, stress, bench |
| Joints | Weld, wheel (suspension spring + motor), mouse (target) joints; breakable joints (force/torque thresholds, `joint.broken` signal). | `cargo test`, verify script |
| Area forces and materials | Buoyancy areas (submerged polygon area/centroid, drag), wind/directional force and point gravity areas, conveyor surface velocity, friction/restitution combine modes. | `cargo test`, verify script |
| Continuous collision and determinism | Time of impact for fast dynamic bodies against dynamic bodies (bullets), full physics snapshot/restore, determinism hash check, recording uses snapshots. | `cargo test`, verify script |
| Prefabs | Refresh instances in scenes that are not open; variants inherit changes of their base. | verify script |
| Game UI and input | Runtime key rebinding stored in the player's settings, device-aware prompts, menu/HUD layout helpers. | verify script |
| Debug tools | Line/node breakpoints for visual graphs; recording extended to script variables, timers and animations. | verify script |
| Particles and effects | Particle collision with the world, sub-emitters, camera shake, post effects. | verify script |
| Leftovers | Export into a non-empty folder no longer scatters files; typography regression; manual version; other known defects. | — |

## Status

| Area | Result | Checks |
|---|---|---|
| Cleanup | Done: 2,104 tracked files deleted (reports, website delivery, outputs, one-off scripts and version documents of 26.39 and earlier, one unused legacy module), untracked leftovers removed, reusable caches kept; one generic release script set; `.gitignore` rewritten; references to deleted files fixed in README, docs, manual and in-app text; manual presents 26.45 with a 26.39–26.45 chapter; the Editor's save facade moved to `src/editor`. | manual, template catalog, hygiene, typography, scheduler, asset admission, platform host: pass; engine boundaries: pass except the Editor's runtime composition (known M1 gap, reported) |
| Shapes and terrain | Done: capsules (core polygon + radius), dynamic concave polygons (ear clipping + Hertel–Mehlhorn), tile polygons split into convex pieces. | `cargo test`, `verify-2645-physics` |
| Joints | Done: wheel (on the wheel, chassis as target), soft weld, target joint with script commands; breaking joints now send `joint.broken`. | `cargo test`, `verify-2645-physics` |
| Area forces and materials | Done: buoyancy from the submerged polygon at the solver pose (a clipping error found by the new check fixed), point gravity with falloff, conveyor surfaces, rolling resistance. Friction/restitution combine modes existed already. | `cargo test`, `verify-2645-physics` |
| Continuous collision and determinism | Done: bullets against bullets, whole-world snapshots (bit-exact replay), the recorder's complete keyframes (physics, script instances and variables, timers, tweens, animations). | `cargo test`, `verify-2645-physics` |
| Prefabs | Done: Apply reaches other instances (a bug undid the change on them), closed scenes and variants; overrides per component field. | `verify-2645-prefabs` |
| Game UI and input | Done: players' bindings stored per game by the Player, `input_rebind` / `input_bindings_reset` / `input_prompt`, `{input:Action}` in UI text. Device-aware prompt widgets and the UI layout helpers existed already. | `verify-2645-input` |
| Debug tools | Done: breakpoints on blocks (node breakpoints for visual graphs existed already); complete rewind keyframes. | `verify-2645-debugger`, `verify-2645-physics` |
| Particles and effects | Done: particles collide through the physics world (segment casts), camera shake (trauma), zoom, follow, screen flash. Sub-emitters and post-processing presets/volumes existed already. | `verify-2645-effects` |
| Leftovers | Done: export into a non-empty folder uses a game subfolder; static bodies no longer jump to (0, 0) when Play begins on a frame without a physics step (found in the hand checks, also in 26.44); compatibility Player split into its own page; desktop host tests in the release run; Rhai API reference regenerated. | `tauri-test`, `verify-2645-physics`, `verify-2643-player-boundary`, `verify-2643-web-player` |

## Not done in 26.45

- The Editor's runtime composition (`src/runtime/GameplayRuntime.ts`) still reaches Editor modules; making it editor-free is the remaining M1 migration step.
- Rewind keyframes do not cover audio already played or effects outside the game; they need the same set of bodies and joints (after a spawn or destroy, Continue rewinds bodies only).
- Prefab overrides inside lists (polygon points, gradients) are still recorded as the whole list.
- Script-driven post-processing values (beyond presets and volumes) were not added.

## Release

`scripts\release.cmd` on Windows: checks, editor, desktop installers and Web package, then the eleven files in `releases\v26.45` (portable, setup and MSI installers, Web, source and reference-project archives, evidence archive, release notes, edit ledger, license, SHA-256 sums). No Git writes.
