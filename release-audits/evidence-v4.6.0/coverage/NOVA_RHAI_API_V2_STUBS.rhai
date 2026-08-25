// Nova_A Rhai API v2 generated editor stubs.
// Metadata only: this file is not executed or bundled into a game.
// API 2; generated from src/editor/scriptApi.ts.

// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn awake()
// Runs once when this instance enters play.
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn start()
// Runs after every active instance has awakened.
// @nova-api module=lifecycle lifetime=callback thread=fixed-step determinism=deterministic
// fn fixed_update(dt)
// Runs once per fixed physics tick.
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn update(dt)
// Runs once per rendered gameplay frame.
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn late_update(dt)
// Runs after update in the same frame.
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_destroy()
// Runs before the owning entity is removed.
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_timer(name)
// Receives an expired named timer.
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_task(name)
// Receives completion of a deferred task.
// @nova-api module=signals lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_signal(name, payload, source)
// Receives a queued signal at a safe boundary.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_collision_enter(other, px, py, nx, ny, rvx, rvy)
// Receives the first solid contact tick.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_collision_stay(other, px, py, nx, ny, rvx, rvy)
// Receives each continuing solid contact tick.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_collision_exit(other, px, py, nx, ny, rvx, rvy)
// Receives the end of a solid contact.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_trigger_enter(other, px, py, nx, ny, rvx, rvy)
// Receives the first sensor overlap tick.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_trigger_stay(other, px, py, nx, ny, rvx, rvy)
// Receives each continuing sensor overlap tick.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_trigger_exit(other, px, py, nx, ny, rvx, rvy)
// Receives the end of a sensor overlap.
// @nova-api module=object lifetime=scene thread=callback-boundary determinism=deterministic
// entity_handle() -> Handle<Entity>
// Returns this entity as a stable versioned handle.
// @nova-api module=object lifetime=scene thread=callback-boundary determinism=deterministic
// find_entity_handle(name) -> Handle<Entity>
// Finds an entity or returns an invalid handle with an error.
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity() -> string
// Returns the current entity UUID.
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_name() -> string
// Returns the current entity display name.
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// find_entity(name) -> string
// Compatibility UUID lookup.
// DEPRECATED: use find_entity_handle; removal API v3.
// @nova-api module=component lifetime=scene thread=callback-boundary determinism=deterministic
// component_handle(kind) -> Handle<Component>
// Returns a stable component handle or explicit invalid handle.
// @nova-api module=component lifetime=callback thread=callback-boundary determinism=deterministic
// has_component(kind) -> bool
// Reports whether this entity owns an enabled component.
// @nova-api module=component lifetime=callback thread=callback-boundary determinism=deterministic
// get_component(kind) -> string
// Legacy component URI lookup.
// DEPRECATED: use component_handle; removal API v3.
// @nova-api module=transform lifetime=callback thread=callback-boundary determinism=deterministic
// transform() -> TransformSnapshot
// Reads one coherent world-transform snapshot.
// @nova-api module=transform lifetime=callback thread=callback-boundary determinism=deterministic
// set_position(x, y)
// Queues an exact finite world position.
// @nova-api module=transform lifetime=callback thread=callback-boundary determinism=deterministic
// set_rotation(radians)
// Queues world rotation in radians.
// @nova-api module=transform lifetime=callback thread=callback-boundary determinism=deterministic
// set_scale(x, y)
// Queues world scale.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_down(action) -> bool
// True while an action is held.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_pressed(action) -> bool
// True on an action press edge.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_released(action) -> bool
// True on an action release edge.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_axis(action) -> float
// Reads a scalar action.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_vector(action) -> Vec2
// Reads a Vector2 action.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_vector_x(action) -> float
// Reads a Vector2 x component.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_vector_y(action) -> float
// Reads a Vector2 y component.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=host-dependent
// mouse_x() -> float
// Reads pointer x in the viewport.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=host-dependent
// mouse_y() -> float
// Reads pointer y in the viewport.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=host-dependent
// wheel_x() -> float
// Reads horizontal wheel delta.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=host-dependent
// wheel_y() -> float
// Reads vertical wheel delta.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// is_down(action) -> bool
// Legacy held-action alias.
// DEPRECATED: use input_down; removal API v3.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// was_pressed(action) -> bool
// Legacy press-edge alias.
// DEPRECATED: use input_pressed; removal API v3.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// was_released(action) -> bool
// Legacy release-edge alias.
// DEPRECATED: use input_released; removal API v3.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// axis(action) -> float
// Legacy scalar-action alias.
// DEPRECATED: use input_axis; removal API v3.
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// vector(action) -> Vec2
// Legacy Vector2-action alias.
// DEPRECATED: use input_vector; removal API v3.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// rigid_body() -> RigidBodySnapshot
// Reads body velocity, angular velocity, mass and type.
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// apply_force(x, y)
// Applies force in newtons during a fixed step.
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// apply_impulse(x, y)
// Applies instantaneous impulse in N·s.
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// set_velocity(x, y)
// Sets linear velocity in world units per second.
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// set_angular_velocity(radians_per_second)
// Sets angular velocity.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_is_on_floor() -> bool
// Reads authoritative floor state.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_is_on_wall() -> bool
// Reads authoritative wall state.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_is_on_ceiling() -> bool
// Reads authoritative ceiling state.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// can_coyote_jump() -> bool
// Reports floor contact or an active coyote window.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_can_coyote_jump() -> bool
// Legacy coyote-window name.
// DEPRECATED: use can_coyote_jump; removal API v3.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_floor_normal() -> Vec2
// Returns the current floor normal.
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_platform_velocity() -> Vec2
// Returns supporting-platform velocity.
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// move_character(x, y)
// Queues CharacterBody2D displacement for the next fixed step.
// @nova-api module=ui lifetime=callback thread=callback-boundary determinism=deterministic
// ui_set_text(text)
// Sets Text or TextRenderer2D content on this entity.
// @nova-api module=ui lifetime=callback thread=callback-boundary determinism=deterministic
// ui_set_value(value)
// Sets Slider, ProgressBar or Checkbox value.
// @nova-api module=animation lifetime=scene thread=callback-boundary determinism=deterministic
// animator_handle() -> Handle<Animator>
// Returns this Animator as a stable handle.
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator() -> string
// Legacy Animator URI lookup.
// DEPRECATED: use animator_handle; removal API v3.
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_set_bool(name, value)
// Sets a Boolean Animator parameter.
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_set_float(name, value)
// Sets a float Animator parameter.
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_set_integer(name, value)
// Sets an integer Animator parameter.
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_trigger(name)
// Raises an Animator trigger.
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_play(state)
// Requests an Animator state.
// @nova-api module=audio lifetime=scene thread=callback-boundary determinism=deterministic
// audio_source_handle() -> Handle<AudioSource>
// Returns this AudioSource as a stable handle.
// @nova-api module=audio lifetime=callback thread=callback-boundary determinism=deterministic
// audio_source() -> string
// Legacy AudioSource URI lookup.
// DEPRECATED: use audio_source_handle; removal API v3.
// @nova-api module=audio lifetime=callback thread=callback-boundary determinism=deterministic
// audio_play()
// Plays this entity AudioSource.
// @nova-api module=audio lifetime=callback thread=callback-boundary determinism=deterministic
// audio_pause()
// Pauses this entity AudioSource.
// @nova-api module=audio lifetime=callback thread=callback-boundary determinism=deterministic
// audio_stop()
// Stops this entity AudioSource.
// @nova-api module=navigation lifetime=callback thread=callback-boundary determinism=deterministic
// navigation_set_target(x, y)
// Sets this NavigationAgent2D world target.
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// instantiate(prefab)
// Queues a prefab instance.
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// destroy()
// Queues safe entity destruction.
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// despawn()
// Returns a pooled object or safely destroys it.
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// scene_load(scene)
// Queues a scene switch.
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// scene_reload()
// Queues active-scene reload.
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// scene_quit()
// Requests clean runtime shutdown.
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time() -> TimeSnapshot
// Returns delta, fixed delta, elapsed, scale and frame.
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_delta() -> float
// Returns render delta seconds.
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_fixed_delta() -> float
// Returns fixed-step seconds.
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_elapsed() -> float
// Returns scaled elapsed seconds.
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_scale() -> float
// Returns active time scale.
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_frame() -> int
// Returns deterministic frame number.
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=seeded
// random() -> float
// Returns a deterministic seeded value in [0, 1).
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=seeded
// random_range(minimum, maximum) -> float
// Returns a deterministic value in a finite range.
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// timer_start(name, seconds, repeat)
// Starts a validated entity-owned timer.
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// timer_pause(name)
// Pauses a timer.
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// timer_resume(name)
// Resumes a timer.
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// timer_cancel(name)
// Cancels a timer.
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// task_wait(name, seconds)
// Schedules a cancellable deferred task.
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// task_cancel(name)
// Cancels an entity-owned task.
// @nova-api module=signals lifetime=callback thread=callback-boundary determinism=deterministic
// signal_emit(name, payload)
// Queues a serializable broadcast signal.
// @nova-api module=signals lifetime=callback thread=callback-boundary determinism=deterministic
// signal_emit_to(entity_id, name, payload)
// Queues a serializable targeted signal.
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_has(key) -> bool
// Reports whether a save key exists.
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_get(key, fallback) -> value
// Reads a safe persistent value.
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_set(key, value)
// Queues a serializable persistent value.
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_delete(key)
// Deletes a persistent key.
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_clear()
// Clears in-memory save state.
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_load(slot)
// Queues a named slot load.
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_commit(slot)
// Atomically commits a named slot.
// @nova-api module=logging lifetime=callback thread=worker-safe determinism=deterministic
// log_debug(message)
// Writes a bounded Debug console event.
// @nova-api module=logging lifetime=callback thread=worker-safe determinism=deterministic
// log_info(message)
// Writes a bounded Info console event.
// @nova-api module=logging lifetime=callback thread=worker-safe determinism=deterministic
// log_warning(message)
// Writes a bounded Warning console event.
// @nova-api module=logging lifetime=callback thread=worker-safe determinism=deterministic
// log_error(message)
// Writes a bounded Error event without crashing.
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// resource_handle(reference, type) -> Handle<Resource>
// Validates an asset URI and returns a stable typed handle.
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// api_version() -> int
// Returns the API version selected for this script asset.
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// api_current_version() -> int
// Returns the newest API implemented by this engine.
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// api_minimum_version() -> int
// Returns the oldest API version supported by the compatibility adapter.
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// api_namespace(symbol) -> string
// Returns the documentation namespace of a flat symbol.
// @nova-api module=testing lifetime=callback thread=worker-safe determinism=deterministic
// expect(condition, message) -> bool
// Records a test assertion without corrupting another instance.
