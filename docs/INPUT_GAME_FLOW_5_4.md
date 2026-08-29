# Nova_A 5.4 input and game flow

## Action configuration

Open **Manage → Project Settings → Input Map**. An action has a unique name, button/axis/Vector2 type, bindings, enabled flag, context, action map, optional control schemes, interaction, consumption, priority, and optional Rhai callback. Bindings retain device identity, modifiers, chords, response curve, threshold, dead zone, inversion, and vector contribution.

Interactions are:

- **Press:** performs on the down edge.
- **Hold:** performs once after `holdSeconds`; releasing early cancels.
- **Tap:** performs on release within `tapSeconds`; a late release cancels.
- **Multi-tap:** performs after 2–16 valid taps within the bounded tap window.

Read state with `input_down`, `input_pressed`, `input_released`, `input_performed`, `input_cancelled`, `input_phase`, `input_duration`, `input_axis`, and `input_vector`. A callback name invokes that function on enabled Script2D components when the action performs or cancels and emits `input.<action>.performed/cancelled`.

## Contexts, maps, schemes, and priority

`Gameplay` context and `Default` action map start active. Use `input_context_push(name, priority, consume)` and `input_context_pop(name)` for menus, dialogue, vehicles, and modal gameplay. Use `input_map_enable/disable` for groups of actions and `input_scheme_set` for KeyboardMouse/Gamepad/Touch variants. Read them with `input_context_active`, `input_map_active`, and `input_scheme`.

Actions are sampled by context priority, then action priority, then stable name. An action or context marked Consume claims its non-zero physical bindings so lower-priority actions cannot also perform. The context stack and map set are each capped at 32; schemes per action are capped at 16. `Default` cannot be disabled, preventing an accidental no-input project.

## Game flow API

- `game_pause(bool)` preserves the prior non-zero time scale and sets physics time scale to zero while paused.
- `scene_reload()` restarts; `scene_load(scene)` transitions; `scene_quit()` requests exit.
- `checkpoint_set(name)`, `checkpoint_has(name)`, and `checkpoint_restore(name)` capture/restore the active scene's first 10,000 object transforms, enabled state, Health current value, score, and bounded session data. There are at most 32 checkpoints and cross-scene restore fails explicitly.
- `score_get`, `score_set`, and `score_add` maintain a finite runtime score.
- `session_get(key, fallback)` and `session_set(key, value)` store at most 512 JSON-safe, 64 KiB values for the current play session.

Game-flow state resets on a new play session. Save API v2 is still the correct choice for durable data across application launches.

## Replay guarantees

Input recording stores phases, performed/cancelled edges, durations, tap counts, consumption, contexts, maps, scheme, devices, axes, and vectors. Replay and fixed-step catch-up clone those values; edge events are not repeated on a second catch-up step.

