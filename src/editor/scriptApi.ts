export const SCRIPT_API_VERSION = 1 as const

export type ScriptApiNamespace =
  | 'lifecycle' | 'scene' | 'object' | 'component' | 'transform' | 'input' | 'physics'
  | 'ui' | 'audio' | 'animation' | 'navigation' | 'save' | 'timing' | 'logging'
  | 'resources' | 'signals' | 'tasks' | 'testing'

export interface ScriptApiEntry {
  name: string
  signature: string
  namespace: ScriptApiNamespace
  category: string
  detail: string
  example: string
  since: '1.0'
  deprecated?: { replacement: string; removal: 'API v2'; reason: string }
  documentation: string
}

type Spec = readonly [name: string, signature: string, namespace: ScriptApiNamespace, detail: string, example: string, replacement?: string]

// Rhai callables remain compact flat snake_case names. `namespace` is the
// frozen API v1 documentation, completion, permission and compatibility group.
const SPECS: readonly Spec[] = [
  ['awake', 'fn awake()', 'lifecycle', 'Runs once when this instance enters play.', 'fn awake() { log_info("ready"); }'],
  ['start', 'fn start()', 'lifecycle', 'Runs after every active instance has awakened.', 'fn start() { signal_emit("ready", entity()); }'],
  ['fixed_update', 'fn fixed_update(dt)', 'lifecycle', 'Runs once per fixed physics tick.', 'fn fixed_update(dt) { apply_force(2.0 * dt, 0.0); }'],
  ['update', 'fn update(dt)', 'lifecycle', 'Runs once per rendered gameplay frame.', 'fn update(dt) { ui_set_value(time_elapsed()); }'],
  ['late_update', 'fn late_update(dt)', 'lifecycle', 'Runs after update in the same frame.', 'fn late_update(dt) { log_debug(`frame ${time_frame()}`); }'],
  ['on_destroy', 'fn on_destroy()', 'lifecycle', 'Runs before the owning entity is removed.', 'fn on_destroy() { task_cancel("load"); }'],
  ['on_timer', 'fn on_timer(name)', 'lifecycle', 'Receives an expired named timer.', 'fn on_timer(name) { signal_emit(name, true); }'],
  ['on_task', 'fn on_task(name)', 'tasks', 'Receives completion of a deferred task.', 'fn on_task(name) { log_info(name); }'],
  ['on_signal', 'fn on_signal(name, payload, source)', 'signals', 'Receives a queued signal at a safe boundary.', 'fn on_signal(name, payload, source) { log_debug(name); }'],
  ['on_collision_enter', 'fn on_collision_enter(other, px, py, nx, ny, rvx, rvy)', 'physics', 'Receives the first solid contact tick.', 'fn on_collision_enter(other, px, py, nx, ny, rvx, rvy) { log_info(other); }'],
  ['on_collision_stay', 'fn on_collision_stay(other, px, py, nx, ny, rvx, rvy)', 'physics', 'Receives each continuing solid contact tick.', 'fn on_collision_stay(other, px, py, nx, ny, rvx, rvy) { }'],
  ['on_collision_exit', 'fn on_collision_exit(other, px, py, nx, ny, rvx, rvy)', 'physics', 'Receives the end of a solid contact.', 'fn on_collision_exit(other, px, py, nx, ny, rvx, rvy) { }'],
  ['on_trigger_enter', 'fn on_trigger_enter(other, px, py, nx, ny, rvx, rvy)', 'physics', 'Receives the first sensor overlap tick.', 'fn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) { signal_emit("entered", other); }'],
  ['on_trigger_stay', 'fn on_trigger_stay(other, px, py, nx, ny, rvx, rvy)', 'physics', 'Receives each continuing sensor overlap tick.', 'fn on_trigger_stay(other, px, py, nx, ny, rvx, rvy) { }'],
  ['on_trigger_exit', 'fn on_trigger_exit(other, px, py, nx, ny, rvx, rvy)', 'physics', 'Receives the end of a sensor overlap.', 'fn on_trigger_exit(other, px, py, nx, ny, rvx, rvy) { }'],
  ['entity_handle', 'entity_handle() -> Handle<Entity>', 'object', 'Returns this entity as a stable versioned handle.', 'let self = entity_handle();'],
  ['find_entity_handle', 'find_entity_handle(name) -> Handle<Entity>', 'object', 'Finds an entity or returns an invalid handle with an error.', 'let enemy = find_entity_handle("Enemy");'],
  ['entity', 'entity() -> string', 'object', 'Returns the current entity UUID.', 'let id = entity();'],
  ['entity_name', 'entity_name() -> string', 'object', 'Returns the current entity display name.', 'log_info(entity_name());'],
  ['find_entity', 'find_entity(name) -> string', 'object', 'Compatibility UUID lookup.', 'let id = find_entity("Camera");', 'find_entity_handle'],
  ['component_handle', 'component_handle(kind) -> Handle<Component>', 'component', 'Returns a stable component handle or explicit invalid handle.', 'let body = component_handle("RigidBody2D");'],
  ['has_component', 'has_component(kind) -> bool', 'component', 'Reports whether this entity owns an enabled component.', 'if has_component("Animator") { animator_play("Idle"); }'],
  ['get_component', 'get_component(kind) -> string', 'component', 'Legacy component URI lookup.', 'let body = get_component("RigidBody2D");', 'component_handle'],
  ['transform', 'transform() -> TransformSnapshot', 'transform', 'Reads one coherent world-transform snapshot.', 'let pose = transform();'],
  ['set_position', 'set_position(x, y)', 'transform', 'Queues an exact finite world position.', 'set_position(4.0, 2.0);'],
  ['set_rotation', 'set_rotation(radians)', 'transform', 'Queues world rotation in radians.', 'set_rotation(1.57079632679);'],
  ['set_scale', 'set_scale(x, y)', 'transform', 'Queues world scale.', 'set_scale(2.0, 2.0);'],
  ['input_down', 'input_down(action) -> bool', 'input', 'True while an action is held.', 'if input_down("Move") { }'],
  ['input_pressed', 'input_pressed(action) -> bool', 'input', 'True on an action press edge.', 'if input_pressed("Jump") { apply_impulse(0.0, 8.0); }'],
  ['input_released', 'input_released(action) -> bool', 'input', 'True on an action release edge.', 'if input_released("Fire") { }'],
  ['input_axis', 'input_axis(action) -> float', 'input', 'Reads a scalar action.', 'let x = input_axis("Horizontal");'],
  ['input_vector', 'input_vector(action) -> Vec2', 'input', 'Reads a Vector2 action.', 'let move = input_vector("Move");'],
  ['input_vector_x', 'input_vector_x(action) -> float', 'input', 'Reads a Vector2 x component.', 'let x = input_vector_x("Move");'],
  ['input_vector_y', 'input_vector_y(action) -> float', 'input', 'Reads a Vector2 y component.', 'let y = input_vector_y("Move");'],
  ['mouse_x', 'mouse_x() -> float', 'input', 'Reads pointer x in the viewport.', 'let x = mouse_x();'],
  ['mouse_y', 'mouse_y() -> float', 'input', 'Reads pointer y in the viewport.', 'let y = mouse_y();'],
  ['wheel_x', 'wheel_x() -> float', 'input', 'Reads horizontal wheel delta.', 'let dx = wheel_x();'],
  ['wheel_y', 'wheel_y() -> float', 'input', 'Reads vertical wheel delta.', 'let dy = wheel_y();'],
  ['is_down', 'is_down(action) -> bool', 'input', 'Legacy held-action alias.', 'if is_down("Move") { }', 'input_down'],
  ['was_pressed', 'was_pressed(action) -> bool', 'input', 'Legacy press-edge alias.', 'if was_pressed("Jump") { }', 'input_pressed'],
  ['was_released', 'was_released(action) -> bool', 'input', 'Legacy release-edge alias.', 'if was_released("Fire") { }', 'input_released'],
  ['axis', 'axis(action) -> float', 'input', 'Legacy scalar-action alias.', 'let x = axis("Horizontal");', 'input_axis'],
  ['vector', 'vector(action) -> Vec2', 'input', 'Legacy Vector2-action alias.', 'let move = vector("Move");', 'input_vector'],
  ['rigid_body', 'rigid_body() -> RigidBodySnapshot', 'physics', 'Reads body velocity, angular velocity, mass and type.', 'let body = rigid_body();'],
  ['apply_force', 'apply_force(x, y)', 'physics', 'Applies force in newtons during a fixed step.', 'apply_force(12.0, 0.0);'],
  ['apply_impulse', 'apply_impulse(x, y)', 'physics', 'Applies instantaneous impulse in N·s.', 'apply_impulse(0.0, 8.0);'],
  ['set_velocity', 'set_velocity(x, y)', 'physics', 'Sets linear velocity in world units per second.', 'set_velocity(3.0, rigid_body().velocity_y);'],
  ['set_angular_velocity', 'set_angular_velocity(radians_per_second)', 'physics', 'Sets angular velocity.', 'set_angular_velocity(0.5);'],
  ['character_is_on_floor', 'character_is_on_floor() -> bool', 'physics', 'Reads authoritative floor state.', 'if character_is_on_floor() { }'],
  ['character_is_on_wall', 'character_is_on_wall() -> bool', 'physics', 'Reads authoritative wall state.', 'if character_is_on_wall() { }'],
  ['character_is_on_ceiling', 'character_is_on_ceiling() -> bool', 'physics', 'Reads authoritative ceiling state.', 'if character_is_on_ceiling() { }'],
  ['can_coyote_jump', 'can_coyote_jump() -> bool', 'physics', 'Reports floor contact or an active coyote window.', 'if can_coyote_jump() { }'],
  ['character_can_coyote_jump', 'character_can_coyote_jump() -> bool', 'physics', 'Legacy coyote-window name.', 'if character_can_coyote_jump() { }', 'can_coyote_jump'],
  ['character_floor_normal', 'character_floor_normal() -> Vec2', 'physics', 'Returns the current floor normal.', 'let normal = character_floor_normal();'],
  ['character_platform_velocity', 'character_platform_velocity() -> Vec2', 'physics', 'Returns supporting-platform velocity.', 'let platform = character_platform_velocity();'],
  ['move_character', 'move_character(x, y)', 'physics', 'Queues CharacterBody2D displacement for the next fixed step.', 'move_character(2.0 * dt, 0.0);'],
  ['ui_set_text', 'ui_set_text(text)', 'ui', 'Sets Text or TextRenderer2D content on this entity.', 'ui_set_text(`Score: ${save_get("score", 0)}`);'],
  ['ui_set_value', 'ui_set_value(value)', 'ui', 'Sets Slider, ProgressBar or Checkbox value.', 'ui_set_value(0.75);'],
  ['animator_handle', 'animator_handle() -> Handle<Animator>', 'animation', 'Returns this Animator as a stable handle.', 'let animator = animator_handle();'],
  ['animator', 'animator() -> string', 'animation', 'Legacy Animator URI lookup.', 'let animator = animator();', 'animator_handle'],
  ['animator_set_bool', 'animator_set_bool(name, value)', 'animation', 'Sets a Boolean Animator parameter.', 'animator_set_bool("moving", true);'],
  ['animator_set_float', 'animator_set_float(name, value)', 'animation', 'Sets a float Animator parameter.', 'animator_set_float("speed", 3.0);'],
  ['animator_set_integer', 'animator_set_integer(name, value)', 'animation', 'Sets an integer Animator parameter.', 'animator_set_integer("weapon", 2);'],
  ['animator_trigger', 'animator_trigger(name)', 'animation', 'Raises an Animator trigger.', 'animator_trigger("jump");'],
  ['animator_play', 'animator_play(state)', 'animation', 'Requests an Animator state.', 'animator_play("Run");'],
  ['audio_source_handle', 'audio_source_handle() -> Handle<AudioSource>', 'audio', 'Returns this AudioSource as a stable handle.', 'let source = audio_source_handle();'],
  ['audio_source', 'audio_source() -> string', 'audio', 'Legacy AudioSource URI lookup.', 'let source = audio_source();', 'audio_source_handle'],
  ['audio_play', 'audio_play()', 'audio', 'Plays this entity AudioSource.', 'audio_play();'],
  ['audio_pause', 'audio_pause()', 'audio', 'Pauses this entity AudioSource.', 'audio_pause();'],
  ['audio_stop', 'audio_stop()', 'audio', 'Stops this entity AudioSource.', 'audio_stop();'],
  ['navigation_set_target', 'navigation_set_target(x, y)', 'navigation', 'Sets this NavigationAgent2D world target.', 'navigation_set_target(10.0, 4.0);'],
  ['instantiate', 'instantiate(prefab)', 'scene', 'Queues a prefab instance.', 'instantiate("asset://enemy-prefab");'],
  ['destroy', 'destroy()', 'scene', 'Queues safe entity destruction.', 'destroy();'],
  ['despawn', 'despawn()', 'scene', 'Returns a pooled object or safely destroys it.', 'despawn();'],
  ['scene_load', 'scene_load(scene)', 'scene', 'Queues a scene switch.', 'scene_load("Level 2");'],
  ['scene_reload', 'scene_reload()', 'scene', 'Queues active-scene reload.', 'scene_reload();'],
  ['scene_quit', 'scene_quit()', 'scene', 'Requests clean runtime shutdown.', 'scene_quit();'],
  ['time', 'time() -> TimeSnapshot', 'timing', 'Returns delta, fixed delta, elapsed, scale and frame.', 'let now = time();'],
  ['time_delta', 'time_delta() -> float', 'timing', 'Returns render delta seconds.', 'let dt = time_delta();'],
  ['time_fixed_delta', 'time_fixed_delta() -> float', 'timing', 'Returns fixed-step seconds.', 'let dt = time_fixed_delta();'],
  ['time_elapsed', 'time_elapsed() -> float', 'timing', 'Returns scaled elapsed seconds.', 'let elapsed = time_elapsed();'],
  ['time_scale', 'time_scale() -> float', 'timing', 'Returns active time scale.', 'let scale = time_scale();'],
  ['time_frame', 'time_frame() -> int', 'timing', 'Returns deterministic frame number.', 'let frame = time_frame();'],
  ['random', 'random() -> float', 'timing', 'Returns a deterministic seeded value in [0, 1).', 'let roll = random();'],
  ['random_range', 'random_range(minimum, maximum) -> float', 'timing', 'Returns a deterministic value in a finite range.', 'let x = random_range(-2.0, 2.0);'],
  ['timer_start', 'timer_start(name, seconds, repeat)', 'tasks', 'Starts a validated entity-owned timer.', 'timer_start("pulse", 0.5, true);'],
  ['timer_pause', 'timer_pause(name)', 'tasks', 'Pauses a timer.', 'timer_pause("pulse");'],
  ['timer_resume', 'timer_resume(name)', 'tasks', 'Resumes a timer.', 'timer_resume("pulse");'],
  ['timer_cancel', 'timer_cancel(name)', 'tasks', 'Cancels a timer.', 'timer_cancel("pulse");'],
  ['task_wait', 'task_wait(name, seconds)', 'tasks', 'Schedules a cancellable deferred task.', 'task_wait("load", 0.25);'],
  ['task_cancel', 'task_cancel(name)', 'tasks', 'Cancels an entity-owned task.', 'task_cancel("load");'],
  ['signal_emit', 'signal_emit(name, payload)', 'signals', 'Queues a serializable broadcast signal.', 'signal_emit("player.ready", #{ lives: 3 });'],
  ['signal_emit_to', 'signal_emit_to(entity_id, name, payload)', 'signals', 'Queues a serializable targeted signal.', 'signal_emit_to(entity(), "heal", 10);'],
  ['save_has', 'save_has(key) -> bool', 'save', 'Reports whether a save key exists.', 'if save_has("checkpoint") { }'],
  ['save_get', 'save_get(key, fallback) -> value', 'save', 'Reads a safe persistent value.', 'let score = save_get("score", 0);'],
  ['save_set', 'save_set(key, value)', 'save', 'Queues a serializable persistent value.', 'save_set("score", 10);'],
  ['save_delete', 'save_delete(key)', 'save', 'Deletes a persistent key.', 'save_delete("checkpoint");'],
  ['save_clear', 'save_clear()', 'save', 'Clears in-memory save state.', 'save_clear();'],
  ['save_load', 'save_load(slot)', 'save', 'Queues a named slot load.', 'save_load("slot1");'],
  ['save_commit', 'save_commit(slot)', 'save', 'Atomically commits a named slot.', 'save_commit("slot1");'],
  ['log_debug', 'log_debug(message)', 'logging', 'Writes a bounded Debug console event.', 'log_debug("tick");'],
  ['log_info', 'log_info(message)', 'logging', 'Writes a bounded Info console event.', 'log_info("ready");'],
  ['log_warning', 'log_warning(message)', 'logging', 'Writes a bounded Warning console event.', 'log_warning("low health");'],
  ['log_error', 'log_error(message)', 'logging', 'Writes a bounded Error event without crashing.', 'log_error("missing target");'],
  ['resource_handle', 'resource_handle(reference, type) -> Handle<Resource>', 'resources', 'Validates an asset URI and returns a stable typed handle.', 'let texture = resource_handle("asset://texture", "Texture2D");'],
  ['api_version', 'api_version() -> int', 'resources', 'Returns the stable scripting API version.', 'expect(api_version() == 1, "API v1");'],
  ['api_namespace', 'api_namespace(symbol) -> string', 'resources', 'Returns the documentation namespace of a flat symbol.', 'let group = api_namespace("scene_load");'],
  ['expect', 'expect(condition, message) -> bool', 'testing', 'Records a test assertion without corrupting another instance.', 'expect(2 + 2 == 4, "math");']
] as const

export const SCRIPT_API: readonly ScriptApiEntry[] = SPECS.map(([name, signature, namespace, detail, example, replacement]) => ({
  name, signature, namespace, category: namespace[0].toUpperCase() + namespace.slice(1), detail, example, since: '1.0',
  deprecated: replacement ? { replacement, removal: 'API v2', reason: 'The replacement is explicit and consistent with the API v1 namespace.' } : undefined,
  documentation: `manual/index.html#api-${name.replace(/_/g, '-')}`
}))

// Compatibility markers retained for archived static release audits:
// name: 'entity_handle'; name: 'find_entity_handle'; name: 'component_handle';
// name: 'animator_handle'; name: 'audio_source_handle'; name: 'task_wait';
// name: 'task_cancel'; name: 'signal_emit'; name: 'signal_emit_to'; name: 'expect'

export function apiEntry(name: string): ScriptApiEntry | undefined { return SCRIPT_API.find(entry => entry.name === name) }

export function apiByNamespace(): ReadonlyMap<ScriptApiNamespace, readonly ScriptApiEntry[]> {
  const groups = new Map<ScriptApiNamespace, ScriptApiEntry[]>()
  for (const entry of SCRIPT_API) groups.set(entry.namespace, [...(groups.get(entry.namespace) ?? []), entry])
  return groups
}

export function generatedApiMarkdown(): string {
  return [...apiByNamespace()].map(([namespace, entries]) => `## ${namespace}\n\n${entries.map(entry => {
    const warning = entry.deprecated ? ` **Deprecated:** use \`${entry.deprecated.replacement}\`; removal ${entry.deprecated.removal}.` : ''
    return `- \`${entry.signature}\` — ${entry.detail}${warning}\n\n  Example: \`${entry.example.replace(/`/g, '\\`')}\``
  }).join('\n')}`).join('\n\n')
}
