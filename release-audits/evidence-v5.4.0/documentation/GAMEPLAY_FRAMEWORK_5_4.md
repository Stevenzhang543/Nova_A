# Nova_A 5.4 gameplay framework

Nova_A 5.4 provides small, composable fixed-step components for common 2D games. They are ordinary Project Format 2/schema 29 components: add them from the Inspector, save them with a scene or prefab, and combine them with Rhai or visual scripts without a second runtime.

## Movement

- **Grid Mover 2D** reads a Vector2 action, advances by the configured cell size, optionally repeats while held, can reject diagonals, and can interpret direction in local space. Use it for Snake, Sokoban, tactics, and board games.
- **Platform Controller 2D** requires CharacterBody2D (and therefore RigidBody2D). It reads an axis and jump action, applies acceleration and air control, honors CharacterBody floor/coyote state, and clamps fall speed. Gravity is 9.80665 world units/s².
- **Top-down Controller 2D** requires CharacterBody2D, normalizes its Vector2 input, accelerates without diagonal speed gain, and can rotate the object toward movement.
- **Camera Follow 2D** operates on an object with Camera2D. It resolves an exact target UUID first, then a target tag; offset, dead zone, exponential smoothing, and independent axes are supported.

Do not place Platform Controller and Top-down Controller on the same object. The component dependency validator rejects that ambiguous ownership.

## Health, contact, and rewards

**Health 2D** bounds current health to `[0, maximum]`, applies an invulnerability interval, emits damaged/died signals, and can destroy its object at zero. **Damage Hitbox 2D** applies bounded damage and knockback through collision or trigger events, filters by target tag, rate-limits each source/target pair, and can remove itself after a successful hit. **Projectile 2D** initializes linear velocity from a normalized direction, ignores its owner UUID, applies damage on contact, and expires using runtime-only lifetime state. **Collectible 2D** filters the collector tag, adds to the runtime score, emits its signal, and optionally despawns.

Collision masks still decide whether a physics contact exists. These components never bypass layers or the collision matrix.

## Spawning, pooling, cooldown, and lifetime

**Spawner 2D** resolves a prefab asset, respects initial delay/interval/burst/maximum-alive bounds, inherits the owner's position and optional rotation, and uses a matching Object Pool 2D when available. Every acquired or instantiated object is reinitialized before its first fixed step. **Lifetime 2D** removes an object after a bounded duration and requests pool return when configured. **Cooldown 2D** exposes deterministic ready/remaining runtime state and a ready signal; use a script callback, state transition, or component enable cycle to control when gameplay may proceed.

Authored values are never decremented for runtime bookkeeping. Replay, stop/play, and pooled reuse start from the serialized duration.

## Behavior trees and state machines

Behavior Tree 2D and State Machine 2D remain optional `nova.gameplay-ai` features. Their asset nodes/states now submit the same ordered trace records used by Visual Graph debugging. Debug shows active node/state, edge/transition, coverage, errors, call depth, and per-node timing; Profiler lists `BehaviorTree.tick` and `StateMachine.tick`. Documents are bounded (10,000 nodes/states, 100,000 transitions, depth 32), and cycles or missing targets fail visibly.

## Runtime order

For each fixed tick Nova_A reads the frame snapshot, runs script `fixed_update`, flushes dynamic object commands, updates gameplay components, runs world gameplay systems, animation and character motion, steps physics, dispatches contact/gameplay signals, and then flushes structural work. Performed/cancelled input edges are visible only on the first catch-up tick so a delayed frame cannot duplicate a jump, tap, or callback.

## Authoring checklist

1. Define input actions in **Manage → Project Settings → Input Map**.
2. Add the component to a scene object or prefab and choose actions/resources from the Inspector.
3. Set tags (`player`, `damageable`, and so on) and physics collision layers deliberately.
4. Press Play and inspect Console, Physics Monitor, Visual Debugger, and Profiler.
5. Test stop/play and pooled reuse; authored health/duration values must return to their serialized state.

