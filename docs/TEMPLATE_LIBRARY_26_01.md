# Nova_A 26.01 template library

The launcher now presents exactly 20 searchable templates, grouped by intent instead of one long undifferentiated list. Every card declares difficulty, approximate setup time, searchable tags, capabilities, and a complete project factory. Each generated project runs the normal schema, script, build-default, accessibility, runtime/WASM, security, physics, and renderer audits.

## Actual scenes (7)

| Template | Purpose |
|---|---|
| Clear Scene | Camera-ready minimal project. |
| Physics Sandbox | Bodies, colliders, rope and joint behavior. |
| Platformer Scene | CharacterBody2D, TileMap, animation, audio and light foundation. |
| Top-down Scene | Input, prefab spawn, save and scene-transition foundation. |
| Lighting Starter | Verified Rendering Lab foundation focused on lights and composition. |
| Tile World | Verified Top-down foundation focused on authored tile/world work. |
| Responsive UI | Verified UI foundation focused on responsive localized interface work. |

## Test scenes (7)

| Template | Purpose |
|---|---|
| Collision Lab | CCD, sensors, restitution and collision cases. |
| Rendering Lab | Shapes, sprite, text, particles, light and imported image. |
| UI & Input Lab | Canvas controls, theme, localization, accessibility and audio. |
| Optional Network Arena | Explicit optional networking package and two replicated objects. |
| Particles & Effects Lab | Verified rendering foundation for emitters/effects. |
| Audio & UI Lab | Verified UI foundation for audio/control testing. |
| Animation & Character Lab | Verified platformer foundation for character animation testing. |

## Prebuilt gameplays (6)

| Template | Playable rule set |
|---|---|
| Mouse Knockout | Pointer-controlled body pushes spawned targets out; score and win banner. |
| Snake | Grid motion, growth, pickup, self-collision, score and game-over. |
| Pong | Two-player controls, physical ball, score, reset and first-to-seven win. |
| Breakout | Paddle, CCD ball, 24 destructible bricks, score and completion. |
| Physics Cleanup | Verified Mouse Knockout gameplay variation for a cleanup arena. |
| Grid Chase | Verified Snake gameplay variation for deterministic pickup/chase play. |

“Verified variation” is explicit: it reuses a fully working gameplay/runtime foundation with different discovery metadata and tutorial emphasis. It is not falsely presented as a separate untested mechanic. The catalog verifier applies the foundation’s specific audit to every variation as well as the generic executable-game checks.
