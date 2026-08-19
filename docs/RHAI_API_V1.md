# Nova Rhai API v1

Nova_A 3.5 freezes this contract through the 3.x line. Callable names remain flat `snake_case` because that is idiomatic Rhai; each symbol also has a stable namespace used by completion, documentation, permissions, diagnostics, and compatibility tooling.

## Contract rules

- Scripts are sandboxed: no filesystem, network, process, DOM, `eval`, or raw Rhai `import`. Project modules use `use "Module.rhai";` and are resolved under `Assets/Scripts`.
- Entity, component, and resource handles contain `valid`, `kind`, `id`, `error`, `api_version`, and a deterministic `generation`. Invalid handles are values, not host exceptions.
- Runtime commands are queued and applied at safe engine boundaries. Non-finite or invalid arguments report script errors instead of silently mutating state.
- Missing lifecycle callbacks are optional. A present callback that throws is reported with its source and does not replace the last valid hot-reload program.
- Deprecated aliases run throughout API v1, produce `NOVA-COMPAT-001`/`NOVA-SCRIPT-DEPRECATED`, and list their API-v2 replacement.

## Exported properties

`@export(type="float", min=0, max=20, step=0.1, enum="A|B", resource="Texture2D", group="Movement", tooltip="Speed", serialize=true) let speed = 5.0;`

Supported metadata: type, default value, minimum, maximum, step, enum choices, resource type, group, tooltip, and serialization. The Inspector derives its control and validation directly from this metadata. Old `@export let value = ...;` declarations remain valid.

## Events, tasks, and reload

Signals are bounded, serializable, delivered at a safe frame boundary, and may have editor-visible signal-to-callback connections. Timers and deferred tasks are owned by the entity/scene and support cancellation. Hot reload validates the complete module graph first; Preserve keeps type-compatible state, Recreate resets defaults and lifecycle, Disabled opts out. A failed compile retains the prior AST and state.

## Tests and debugger

Use `// @test tags=unit timeout=1000 seed=42 cases=a|b` before `fn test_*`. Optional `before_all`, `before_each`, `after_each`, and `after_all` callbacks are isolated per case. The headless runner returns non-zero on failures and emits JSON or JUnit. The debugger supports line/function/conditional/hit-count breakpoints, logpoints, callback-safe stepping, call stack, locals, watches, evaluation, restart, persistence, and break-on-error.

## lifecycle

- `fn awake()` — Runs once when this instance enters play.

  Example: `fn awake() { log_info("ready"); }`
- `fn start()` — Runs after every active instance has awakened.

  Example: `fn start() { signal_emit("ready", entity()); }`
- `fn fixed_update(dt)` — Runs once per fixed physics tick.

  Example: `fn fixed_update(dt) { apply_force(2.0 * dt, 0.0); }`
- `fn update(dt)` — Runs once per rendered gameplay frame.

  Example: `fn update(dt) { ui_set_value(time_elapsed()); }`
- `fn late_update(dt)` — Runs after update in the same frame.

  Example: `fn late_update(dt) { log_debug(\`frame ${time_frame()}\`); }`
- `fn on_destroy()` — Runs before the owning entity is removed.

  Example: `fn on_destroy() { task_cancel("load"); }`
- `fn on_timer(name)` — Receives an expired named timer.

  Example: `fn on_timer(name) { signal_emit(name, true); }`

## tasks

- `fn on_task(name)` — Receives completion of a deferred task.

  Example: `fn on_task(name) { log_info(name); }`
- `timer_start(name, seconds, repeat)` — Starts a validated entity-owned timer.

  Example: `timer_start("pulse", 0.5, true);`
- `timer_pause(name)` — Pauses a timer.

  Example: `timer_pause("pulse");`
- `timer_resume(name)` — Resumes a timer.

  Example: `timer_resume("pulse");`
- `timer_cancel(name)` — Cancels a timer.

  Example: `timer_cancel("pulse");`
- `task_wait(name, seconds)` — Schedules a cancellable deferred task.

  Example: `task_wait("load", 0.25);`
- `task_cancel(name)` — Cancels an entity-owned task.

  Example: `task_cancel("load");`

## signals

- `fn on_signal(name, payload, source)` — Receives a queued signal at a safe boundary.

  Example: `fn on_signal(name, payload, source) { log_debug(name); }`
- `signal_emit(name, payload)` — Queues a serializable broadcast signal.

  Example: `signal_emit("player.ready", #{ lives: 3 });`
- `signal_emit_to(entity_id, name, payload)` — Queues a serializable targeted signal.

  Example: `signal_emit_to(entity(), "heal", 10);`

## physics

- `fn on_collision_enter(other, px, py, nx, ny, rvx, rvy)` — Receives the first solid contact tick.

  Example: `fn on_collision_enter(other, px, py, nx, ny, rvx, rvy) { log_info(other); }`
- `fn on_collision_stay(other, px, py, nx, ny, rvx, rvy)` — Receives each continuing solid contact tick.

  Example: `fn on_collision_stay(other, px, py, nx, ny, rvx, rvy) { }`
- `fn on_collision_exit(other, px, py, nx, ny, rvx, rvy)` — Receives the end of a solid contact.

  Example: `fn on_collision_exit(other, px, py, nx, ny, rvx, rvy) { }`
- `fn on_trigger_enter(other, px, py, nx, ny, rvx, rvy)` — Receives the first sensor overlap tick.

  Example: `fn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) { signal_emit("entered", other); }`
- `fn on_trigger_stay(other, px, py, nx, ny, rvx, rvy)` — Receives each continuing sensor overlap tick.

  Example: `fn on_trigger_stay(other, px, py, nx, ny, rvx, rvy) { }`
- `fn on_trigger_exit(other, px, py, nx, ny, rvx, rvy)` — Receives the end of a sensor overlap.

  Example: `fn on_trigger_exit(other, px, py, nx, ny, rvx, rvy) { }`
- `rigid_body() -> RigidBodySnapshot` — Reads body velocity, angular velocity, mass and type.

  Example: `let body = rigid_body();`
- `apply_force(x, y)` — Applies force in newtons during a fixed step.

  Example: `apply_force(12.0, 0.0);`
- `apply_impulse(x, y)` — Applies instantaneous impulse in N·s.

  Example: `apply_impulse(0.0, 8.0);`
- `set_velocity(x, y)` — Sets linear velocity in world units per second.

  Example: `set_velocity(3.0, rigid_body().velocity_y);`
- `set_angular_velocity(radians_per_second)` — Sets angular velocity.

  Example: `set_angular_velocity(0.5);`
- `character_is_on_floor() -> bool` — Reads authoritative floor state.

  Example: `if character_is_on_floor() { }`
- `character_is_on_wall() -> bool` — Reads authoritative wall state.

  Example: `if character_is_on_wall() { }`
- `character_is_on_ceiling() -> bool` — Reads authoritative ceiling state.

  Example: `if character_is_on_ceiling() { }`
- `can_coyote_jump() -> bool` — Reports floor contact or an active coyote window.

  Example: `if can_coyote_jump() { }`
- `character_can_coyote_jump() -> bool` — Legacy coyote-window name. **Deprecated:** use `can_coyote_jump`; removal API v2.

  Example: `if character_can_coyote_jump() { }`
- `character_floor_normal() -> Vec2` — Returns the current floor normal.

  Example: `let normal = character_floor_normal();`
- `character_platform_velocity() -> Vec2` — Returns supporting-platform velocity.

  Example: `let platform = character_platform_velocity();`
- `move_character(x, y)` — Queues CharacterBody2D displacement for the next fixed step.

  Example: `move_character(2.0 * dt, 0.0);`

## object

- `entity_handle() -> Handle<Entity>` — Returns this entity as a stable versioned handle.

  Example: `let self = entity_handle();`
- `find_entity_handle(name) -> Handle<Entity>` — Finds an entity or returns an invalid handle with an error.

  Example: `let enemy = find_entity_handle("Enemy");`
- `entity() -> string` — Returns the current entity UUID.

  Example: `let id = entity();`
- `entity_name() -> string` — Returns the current entity display name.

  Example: `log_info(entity_name());`
- `find_entity(name) -> string` — Compatibility UUID lookup. **Deprecated:** use `find_entity_handle`; removal API v2.

  Example: `let id = find_entity("Camera");`

## component

- `component_handle(kind) -> Handle<Component>` — Returns a stable component handle or explicit invalid handle.

  Example: `let body = component_handle("RigidBody2D");`
- `has_component(kind) -> bool` — Reports whether this entity owns an enabled component.

  Example: `if has_component("Animator") { animator_play("Idle"); }`
- `get_component(kind) -> string` — Legacy component URI lookup. **Deprecated:** use `component_handle`; removal API v2.

  Example: `let body = get_component("RigidBody2D");`

## transform

- `transform() -> TransformSnapshot` — Reads one coherent world-transform snapshot.

  Example: `let pose = transform();`
- `set_position(x, y)` — Queues an exact finite world position.

  Example: `set_position(4.0, 2.0);`
- `set_rotation(radians)` — Queues world rotation in radians.

  Example: `set_rotation(1.57079632679);`
- `set_scale(x, y)` — Queues world scale.

  Example: `set_scale(2.0, 2.0);`

## input

- `input_down(action) -> bool` — True while an action is held.

  Example: `if input_down("Move") { }`
- `input_pressed(action) -> bool` — True on an action press edge.

  Example: `if input_pressed("Jump") { apply_impulse(0.0, 8.0); }`
- `input_released(action) -> bool` — True on an action release edge.

  Example: `if input_released("Fire") { }`
- `input_axis(action) -> float` — Reads a scalar action.

  Example: `let x = input_axis("Horizontal");`
- `input_vector(action) -> Vec2` — Reads a Vector2 action.

  Example: `let move = input_vector("Move");`
- `input_vector_x(action) -> float` — Reads a Vector2 x component.

  Example: `let x = input_vector_x("Move");`
- `input_vector_y(action) -> float` — Reads a Vector2 y component.

  Example: `let y = input_vector_y("Move");`
- `mouse_x() -> float` — Reads pointer x in the viewport.

  Example: `let x = mouse_x();`
- `mouse_y() -> float` — Reads pointer y in the viewport.

  Example: `let y = mouse_y();`
- `wheel_x() -> float` — Reads horizontal wheel delta.

  Example: `let dx = wheel_x();`
- `wheel_y() -> float` — Reads vertical wheel delta.

  Example: `let dy = wheel_y();`
- `is_down(action) -> bool` — Legacy held-action alias. **Deprecated:** use `input_down`; removal API v2.

  Example: `if is_down("Move") { }`
- `was_pressed(action) -> bool` — Legacy press-edge alias. **Deprecated:** use `input_pressed`; removal API v2.

  Example: `if was_pressed("Jump") { }`
- `was_released(action) -> bool` — Legacy release-edge alias. **Deprecated:** use `input_released`; removal API v2.

  Example: `if was_released("Fire") { }`
- `axis(action) -> float` — Legacy scalar-action alias. **Deprecated:** use `input_axis`; removal API v2.

  Example: `let x = axis("Horizontal");`
- `vector(action) -> Vec2` — Legacy Vector2-action alias. **Deprecated:** use `input_vector`; removal API v2.

  Example: `let move = vector("Move");`

## ui

- `ui_set_text(text)` — Sets Text or TextRenderer2D content on this entity.

  Example: `ui_set_text(\`Score: ${save_get("score", 0)}\`);`
- `ui_set_value(value)` — Sets Slider, ProgressBar or Checkbox value.

  Example: `ui_set_value(0.75);`

## animation

- `animator_handle() -> Handle<Animator>` — Returns this Animator as a stable handle.

  Example: `let animator = animator_handle();`
- `animator() -> string` — Legacy Animator URI lookup. **Deprecated:** use `animator_handle`; removal API v2.

  Example: `let animator = animator();`
- `animator_set_bool(name, value)` — Sets a Boolean Animator parameter.

  Example: `animator_set_bool("moving", true);`
- `animator_set_float(name, value)` — Sets a float Animator parameter.

  Example: `animator_set_float("speed", 3.0);`
- `animator_set_integer(name, value)` — Sets an integer Animator parameter.

  Example: `animator_set_integer("weapon", 2);`
- `animator_trigger(name)` — Raises an Animator trigger.

  Example: `animator_trigger("jump");`
- `animator_play(state)` — Requests an Animator state.

  Example: `animator_play("Run");`

## audio

- `audio_source_handle() -> Handle<AudioSource>` — Returns this AudioSource as a stable handle.

  Example: `let source = audio_source_handle();`
- `audio_source() -> string` — Legacy AudioSource URI lookup. **Deprecated:** use `audio_source_handle`; removal API v2.

  Example: `let source = audio_source();`
- `audio_play()` — Plays this entity AudioSource.

  Example: `audio_play();`
- `audio_pause()` — Pauses this entity AudioSource.

  Example: `audio_pause();`
- `audio_stop()` — Stops this entity AudioSource.

  Example: `audio_stop();`

## navigation

- `navigation_set_target(x, y)` — Sets this NavigationAgent2D world target.

  Example: `navigation_set_target(10.0, 4.0);`

## scene

- `instantiate(prefab)` — Queues a prefab instance.

  Example: `instantiate("asset://enemy-prefab");`
- `destroy()` — Queues safe entity destruction.

  Example: `destroy();`
- `despawn()` — Returns a pooled object or safely destroys it.

  Example: `despawn();`
- `scene_load(scene)` — Queues a scene switch.

  Example: `scene_load("Level 2");`
- `scene_reload()` — Queues active-scene reload.

  Example: `scene_reload();`
- `scene_quit()` — Requests clean runtime shutdown.

  Example: `scene_quit();`

## timing

- `time() -> TimeSnapshot` — Returns delta, fixed delta, elapsed, scale and frame.

  Example: `let now = time();`
- `time_delta() -> float` — Returns render delta seconds.

  Example: `let dt = time_delta();`
- `time_fixed_delta() -> float` — Returns fixed-step seconds.

  Example: `let dt = time_fixed_delta();`
- `time_elapsed() -> float` — Returns scaled elapsed seconds.

  Example: `let elapsed = time_elapsed();`
- `time_scale() -> float` — Returns active time scale.

  Example: `let scale = time_scale();`
- `time_frame() -> int` — Returns deterministic frame number.

  Example: `let frame = time_frame();`
- `random() -> float` — Returns a deterministic seeded value in [0, 1).

  Example: `let roll = random();`
- `random_range(minimum, maximum) -> float` — Returns a deterministic value in a finite range.

  Example: `let x = random_range(-2.0, 2.0);`

## save

- `save_has(key) -> bool` — Reports whether a save key exists.

  Example: `if save_has("checkpoint") { }`
- `save_get(key, fallback) -> value` — Reads a safe persistent value.

  Example: `let score = save_get("score", 0);`
- `save_set(key, value)` — Queues a serializable persistent value.

  Example: `save_set("score", 10);`
- `save_delete(key)` — Deletes a persistent key.

  Example: `save_delete("checkpoint");`
- `save_clear()` — Clears in-memory save state.

  Example: `save_clear();`
- `save_load(slot)` — Queues a named slot load.

  Example: `save_load("slot1");`
- `save_commit(slot)` — Atomically commits a named slot.

  Example: `save_commit("slot1");`

## logging

- `log_debug(message)` — Writes a bounded Debug console event.

  Example: `log_debug("tick");`
- `log_info(message)` — Writes a bounded Info console event.

  Example: `log_info("ready");`
- `log_warning(message)` — Writes a bounded Warning console event.

  Example: `log_warning("low health");`
- `log_error(message)` — Writes a bounded Error event without crashing.

  Example: `log_error("missing target");`

## resources

- `resource_handle(reference, type) -> Handle<Resource>` — Validates an asset URI and returns a stable typed handle.

  Example: `let texture = resource_handle("asset://texture", "Texture2D");`
- `api_version() -> int` — Returns the stable scripting API version.

  Example: `expect(api_version() == 1, "API v1");`
- `api_namespace(symbol) -> string` — Returns the documentation namespace of a flat symbol.

  Example: `let group = api_namespace("scene_load");`

## testing

- `expect(condition, message) -> bool` — Records a test assertion without corrupting another instance.

  Example: `expect(2 + 2 == 4, "math");`
