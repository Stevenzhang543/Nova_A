# Nova_A 26.45

Engine 26.45.0. Project format 2 / schema 29 is unchanged; 26.38–26.44 projects open through the usual upgrade check with only the engine-version stamp updated. The plan and status for this round are in `docs/DEV_PLAN_26_45.md`; every changed file is listed with its reason in `EDIT_LEDGER.md`.

## Physics

- **Capsules and rounded shapes.** Colliders can be Capsules (Shape → Capsule): a rectangle with round ends, solved as a core segment plus a radius as in Box2D v3, so a lying capsule rests flat, a standing one tips over and rolls, and rays see the round ends.
- **Dynamic concave polygons.** A concave polygon on a moving body is split into convex pieces (ear clipping, then pieces merged while they stay convex, Hertel–Mehlhorn), so an L-shaped body is two pieces instead of five triangles.
- **Wheel joint.** Put a Wheel Joint 2D on each wheel and choose the chassis as its target: the wheel moves along a suspension axis on a spring (frequency and damping ratio) within travel limits, and a motor drives it (negative speeds roll to the right). A car with two wheels drives 20 m in four seconds on the test floor and stays level.
- **Soft weld, target joint, breaking.** The Weld joint can be soft (linear and angular frequency). The Target Joint 2D pulls a point of the body toward a target with a spring and a maximum force (drag objects with the pointer, carry or hold them); scripts call `target_joint_move(x, y)` and `target_joint_release()`. A joint that breaks above its force or torque threshold now tells the objects it joined with the `joint.broken` signal (payload `joint`, `kind`).
- **Surfaces.** A collider can be a conveyor (Surface speed, or `set_surface_speed(speed)` from a script; a box on the belt moves at the belt's speed) and have rolling resistance, so a rolling ball stops.
- **Buoyancy and point gravity.** Buoyancy areas push a body up by the fluid density times the area under the surface times gravity, applied at the centre of that part, with drag toward the flow and angular drag: a box of half the fluid's density floats half under, and a tilted plank rights itself. Point gravity pulls toward the area's centre with no, linear or inverse-square falloff. (26.44 applied a constant force; the 26.45 clipping first had an error in the crossing point that this release fixes before shipping.)
- **Bullets.** Fast bodies set to Continuous are swept against each other too, so two bullets meeting head-on stop at each other instead of passing through.
- **Snapshots.** The physics world can be saved and restored as a whole (bodies, contacts with their warm-start impulses, joints, sleep, ropes); a restored world replays the same steps bit for bit. The debugger's recording uses this (see Debugging).

## Prefabs

- **Apply to prefab reaches every instance.** The other instances in the open scene take the applied change and keep their own overrides. (Before 26.45 their overrides were compared with the new version after it was written, so the applied change was undone again on them.)
- **Scenes that are not open** are updated too: their stored instances are rebuilt from the new version with their own changes, and the scene is marked unsaved. The status line says how many closed scenes and variants followed.
- **Variants follow their base.** A variant keeps what it changed; records the base added appear in the variant, records it removed disappear, and the variant's own instances and variants follow in turn.
- Overrides now name one field of one component (`components.RigidBody2D.data.gravityScale`) instead of the whole component list, so a change to another field of the same component still reaches the instance; older projects' whole-list overrides still apply. Inspector rows with an overridden field are marked.

## Game input

- **Players' own key bindings.** A remap button in the game UI, or `input_rebind(action[, index])` from a script, waits for the next key, mouse button or gamepad button (Escape cancels) and sends `input.rebound` (or `input.rebind_cancelled`). The Player keeps the bindings that differ from the project's, per game, so they survive restarts; `input_bindings_reset()` puts the project's bindings back. In the editor the binding changes for the session.
- **Prompts for the device in use.** `input_prompt(action)` returns the key, button or symbol of an action on the device the player uses ("Space", "A", "✕", "LMB"), and a Text containing `{input:Jump}` shows it in a sentence ("Press {input:Jump} to start").

## Debugging

- **Breakpoints on blocks.** Block menu → Stop here puts a red dot on a block; the game stops before the block runs, with the block script's variables, and the block is outlined while paused. Nothing changes in the generated code.
- **Complete rewind.** The physics recording keeps complete keyframes (◆; every step in ordinary scenes, fewer in very large ones within a 64 MB budget): the solver state, the script instances (also variables the Inspector does not show), script properties, timers, tweens, animator and timeline playheads and the step counter. Continue from a keyframe restores all of it, so the game runs on exactly as it did the first time (checked: the replayed steps reach the same solver checksum, script counters and timer counts). Other steps rewind the bodies only, as in 26.44; "Nearest keyframe" jumps to one.

## Effects

- **Camera shake** with the trauma model: `camera_shake(amount)` adds trauma (0–1); the view moves and turns by trauma² with smooth noise and calms down by itself (Camera 2D → Shake distance, angle, frequency, recovery). Reduced motion keeps a quarter of the shake.
- `camera_zoom(zoom)`, `camera_follow(handle)` / `camera_follow_none()` and `screen_flash(r, g, b, seconds)` (not shown with reduced motion).
- **Particles collide through the physics world**: every collider shape and tile map, swept from where a particle was to where it moves, so fast particles bounce off a 0.1-unit floor instead of passing through. Without a physics world the previous approximate test is used. Sub-emitters start where particles end.

## Fixes and cleanup

- **Play after Stop showed static objects at the origin.** When Play began on a frame shorter than the physics step (common on 120 Hz screens) right after the scene was reloaded (Stop), the editor read the solver's state before it had one: floors and platforms were drawn and listed at (0, 0) for the whole session, although the game still collided with them where they belong. The state is now read only when it describes the current bodies. (Present in 26.44 as well; found in the release hand checks.)
- Exporting into a folder that already holds other files (a project folder, Documents) puts the game in a subfolder named after it instead of scattering its files there; empty folders and folders with an earlier build of a game are used as they are.
- The compatibility Player is a page of its own (`player-legacy.html`): the independent Player page no longer reaches any Vue or Editor code, even lazily (player.html's lazy chunks went from 903 KiB to 17 KiB). Web exports include the page; `?legacyPlayer=1` and the one-time fallback open it.
- The Editor's save facade moved from `src/runtime` to `src/editor` and an unused legacy module was removed; the engine boundary gate now passes for the Player and every Runtime owner, with the Editor's runtime composition reported as the one open migration gap.
- The repository was cleaned: unused reports, website delivery, one-off scripts of earlier versions and version documents of 26.39 and earlier were removed (2,100+ tracked files); one release script set replaces the per-version copies (`scripts\release.cmd`); `.gitignore` keeps code, the resources the build needs and documentation only. The manual describes 26.39–26.45 and presents 26.45.
- The Rhai API reference (`docs/RHAI_API_V2.md`, stubs and manifest) is regenerated; it had not listed the functions added since 26.43.

## Verification

Run on Windows by `scripts\release.cmd` (log: `checks-release/checks.log` in the evidence archive): Rust format, clippy and the workspace tests (with new tests for capsules, wheel, weld and target joints, conveyors and rolling resistance, bullets, snapshots, script instance snapshots, segment casts and the new script commands), the desktop host's tests, the physics stress and benchmarks, the repository checks (manual, template catalog, ignore rules, typography, engine boundaries, scheduler, asset admission, platform host) and the behaviour checks of 26.40–26.45 in the real runtime with the WebAssembly core and in Chromium/Edge. New in 26.45: `verify-2645-physics` (12 checks), `verify-2645-prefabs` (4), `verify-2645-input` (3), `verify-2645-debugger` (2), `verify-2645-effects` (4).

## Limits

- Rewinding restores the game state the runtime owns (physics, scripts, timers, tweens, animation); audio that already played and anything outside the game (files written, network messages) are not rewound. A keyframe only fits while the same bodies and joints exist: after an object was created or destroyed, Continue rewinds the bodies only.
- Prefab overrides are recorded per component field; a change to a list inside a component (polygon points, a gradient) is still recorded as the whole list.
- The Editor's runtime composition (`src/runtime/GameplayRuntime.ts`) still reaches Editor modules by design; exported games use the independent Player, which does not.
- Physical iPhone/iPad/Android devices, Firefox/WebKit and macOS/Linux builds remain unqualified, as in 26.44.
