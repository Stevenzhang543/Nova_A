# CharacterBody2D controller workflow

CharacterBody2D is a controlled kinematic character workflow. It classifies collision normals as floor, wall, or ceiling, honors maximum slope angle, attempts configured step height, transfers moving-platform velocity, snaps to nearby floor, caps slide iterations, and exposes its current contact state.

## Platformer separation

1. In frame input, read left/right and jump actions into a small command state. Do not move the transform.
2. At the fixed physics step, convert the latest command to desired horizontal velocity. Apply gravity to the controller velocity.
3. Permit jump while `onFloor` or while `secondsSinceFloor <= coyoteTime`.
4. Call `Physics2D.moveAndSlide(characterEntity, velocity, fixedDelta)` once.
5. Read `Physics2D.characterState` for floor/wall/ceiling normals and platform velocity. Use those results for animation in the next frame.

Recommended starting values are a 45° slope limit, 0.35 m step, 0.15 m floor snap, 0.001 m safe margin, four slides, and 0.12 s coyote time. Tune in world units; a 0.35 step is not 35 pixels unless the project camera mapping makes that equivalence.

## Top-down separation

Normalize the two-axis input before multiplying by speed so diagonal movement is not faster. Submit planar velocity at the fixed step and omit platformer gravity/jump policy. Contacts remain useful for pushing/sliding and trigger-driven interaction.

## Moving and one-way surfaces

Animatable/kinematic platforms own their authored motion. A grounded character receives `platformVelocity` when transfer is enabled. Floor snap is skipped for deliberate upward motion. One-way surfaces classify as floor only from the blocking side; dropping through should temporarily adjust the character mask or documented one-way policy rather than teleporting through a live collider.

## Fixed-rate consistency

Desired velocity is expressed in m/s and `moveAndSlide` receives seconds. Never pre-scale velocity in the frame loop and scale it again in physics. The v4.5 reference projects test Accurate, Balanced, and Fast profiles with tolerances recorded in the evidence archive.

