export interface ScriptApiEntry {
  name: string
  signature: string
  category: 'Lifecycle' | 'Entity' | 'Input' | 'Time' | 'Physics' | 'Animation' | 'Audio' | 'Scene' | 'Tasks' | 'Signals' | 'Save' | 'Testing'
  detail: string
}

// One catalogue powers completion, signature help, hover documentation and
// the generated in-editor reference. scripts/audit-script-studio.mjs checks
// these callable names against the Rust registrations.
export const SCRIPT_API: readonly ScriptApiEntry[] = [
  { name: 'awake', signature: 'fn awake()', category: 'Lifecycle', detail: 'Runs once when the script instance enters a play session.' },
  { name: 'start', signature: 'fn start()', category: 'Lifecycle', detail: 'Runs after every script instance has awakened.' },
  { name: 'fixed_update', signature: 'fn fixed_update(dt)', category: 'Lifecycle', detail: 'Runs once per fixed physics tick.' },
  { name: 'update', signature: 'fn update(dt)', category: 'Lifecycle', detail: 'Runs once per rendered frame.' },
  { name: 'late_update', signature: 'fn late_update(dt)', category: 'Lifecycle', detail: 'Runs after update in the same frame.' },
  { name: 'on_destroy', signature: 'fn on_destroy()', category: 'Lifecycle', detail: 'Runs before an entity or scene-owned script is removed.' },
  { name: 'on_timer', signature: 'fn on_timer(name)', category: 'Lifecycle', detail: 'Receives an expired named timer.' },
  { name: 'on_task', signature: 'fn on_task(name)', category: 'Tasks', detail: 'Resumes work scheduled with task_wait. Tasks are cancelled with their entity or scene.' },
  { name: 'on_signal', signature: 'fn on_signal(name, payload, source)', category: 'Signals', detail: 'Receives queued custom, physics, UI, animation, or scene signals at a safe frame boundary.' },
  { name: 'entity_handle', signature: 'entity_handle() -> Handle', category: 'Entity', detail: 'Returns a typed Entity handle with valid, kind, id, and error fields.' },
  { name: 'find_entity_handle', signature: 'find_entity_handle(name) -> Handle', category: 'Entity', detail: 'Returns a typed Entity handle or an explicit invalid handle and error.' },
  { name: 'component_handle', signature: 'component_handle(kind) -> Handle', category: 'Entity', detail: 'Returns a typed component handle or an explicit error value.' },
  { name: 'animator_handle', signature: 'animator_handle() -> Handle', category: 'Animation', detail: 'Returns a typed Animator handle or an explicit invalid handle.' },
  { name: 'audio_source_handle', signature: 'audio_source_handle() -> Handle', category: 'Audio', detail: 'Returns a typed AudioSource handle or an explicit invalid handle.' },
  { name: 'has_component', signature: 'has_component(kind) -> bool', category: 'Entity', detail: 'Reports whether this entity owns an enabled component of the requested kind.' },
  { name: 'transform', signature: 'transform() -> Map', category: 'Entity', detail: 'Reads the current world transform snapshot.' },
  { name: 'rigid_body', signature: 'rigid_body() -> Map', category: 'Physics', detail: 'Reads velocity and mass; valid is false when no rigid body exists.' },
  { name: 'input_down', signature: 'input_down(action) -> bool', category: 'Input', detail: 'True while the named action is held.' },
  { name: 'input_pressed', signature: 'input_pressed(action) -> bool', category: 'Input', detail: 'True on the action press edge.' },
  { name: 'input_released', signature: 'input_released(action) -> bool', category: 'Input', detail: 'True on the action release edge.' },
  { name: 'input_axis', signature: 'input_axis(action) -> float', category: 'Input', detail: 'Reads a mapped one-dimensional action.' },
  { name: 'input_vector', signature: 'input_vector(action) -> Map', category: 'Input', detail: 'Reads a mapped two-dimensional action.' },
  { name: 'time', signature: 'time() -> Map', category: 'Time', detail: 'Returns delta, fixed_delta, elapsed, scale, and frame.' },
  { name: 'random', signature: 'random() -> float', category: 'Time', detail: 'Returns a deterministic seeded value in [0, 1) for replay-safe gameplay.' },
  { name: 'random_range', signature: 'random_range(minimum, maximum) -> float', category: 'Time', detail: 'Returns a deterministic seeded value in the requested finite range.' },
  { name: 'apply_force', signature: 'apply_force(x, y)', category: 'Physics', detail: 'Applies force in newtons during a fixed update.' },
  { name: 'apply_impulse', signature: 'apply_impulse(x, y)', category: 'Physics', detail: 'Applies an instantaneous impulse in N·s.' },
  { name: 'set_velocity', signature: 'set_velocity(x, y)', category: 'Physics', detail: 'Sets rigid-body linear velocity in world units per second.' },
  { name: 'set_position', signature: 'set_position(x, y)', category: 'Physics', detail: 'Sets the entity world position.' },
  { name: 'set_rotation', signature: 'set_rotation(radians)', category: 'Physics', detail: 'Sets world rotation in radians.' },
  { name: 'character_is_on_floor', signature: 'character_is_on_floor() -> bool', category: 'Physics', detail: 'Reads the authoritative CharacterBody2D floor state.' },
  { name: 'character_is_on_wall', signature: 'character_is_on_wall() -> bool', category: 'Physics', detail: 'Reads the authoritative CharacterBody2D wall state.' },
  { name: 'character_is_on_ceiling', signature: 'character_is_on_ceiling() -> bool', category: 'Physics', detail: 'Reads the authoritative CharacterBody2D ceiling state.' },
  { name: 'can_coyote_jump', signature: 'can_coyote_jump() -> bool', category: 'Physics', detail: 'Reports floor contact or an active CharacterBody2D coyote-time window.' },
  { name: 'character_floor_normal', signature: 'character_floor_normal() -> Map', category: 'Physics', detail: 'Returns the current floor normal in exact world coordinates.' },
  { name: 'character_platform_velocity', signature: 'character_platform_velocity() -> Map', category: 'Physics', detail: 'Returns supporting platform velocity in world units per second.' },
  { name: 'move_character', signature: 'move_character(x, y)', category: 'Physics', detail: 'Queues an exact-unit CharacterBody2D displacement for the next fixed step.' },
  { name: 'animator_play', signature: 'animator_play(state)', category: 'Animation', detail: 'Requests an Animator state by name.' },
  { name: 'audio_play', signature: 'audio_play()', category: 'Audio', detail: 'Plays this entity’s AudioSource.' },
  { name: 'instantiate', signature: 'instantiate(prefab)', category: 'Scene', detail: 'Queues a prefab instance at the entity position.' },
  { name: 'despawn', signature: 'despawn()', category: 'Scene', detail: 'Returns a pooled prefab instance or safely destroys the entity.' },
  { name: 'scene_load', signature: 'scene_load(scene)', category: 'Scene', detail: 'Queues a scene switch after the current frame.' },
  { name: 'timer_start', signature: 'timer_start(name, seconds, repeat)', category: 'Tasks', detail: 'Starts an entity-owned timer.' },
  { name: 'task_wait', signature: 'task_wait(name, seconds)', category: 'Tasks', detail: 'Schedules a cancellable entity-owned task and later calls on_task.' },
  { name: 'task_cancel', signature: 'task_cancel(name)', category: 'Tasks', detail: 'Cancels a task owned by this entity.' },
  { name: 'signal_emit', signature: 'signal_emit(name, payload)', category: 'Signals', detail: 'Queues a serializable signal for all active scripts.' },
  { name: 'signal_emit_to', signature: 'signal_emit_to(entity_id, name, payload)', category: 'Signals', detail: 'Queues a serializable signal for one entity.' },
  { name: 'save_get', signature: 'save_get(key, fallback)', category: 'Save', detail: 'Reads a safe persistent value.' },
  { name: 'save_set', signature: 'save_set(key, value)', category: 'Save', detail: 'Queues a serializable persistent value.' },
  { name: 'expect', signature: 'expect(condition, message) -> bool', category: 'Testing', detail: 'Reports a test failure without crashing another script instance.' }
] as const

export function apiEntry(name: string): ScriptApiEntry | undefined {
  return SCRIPT_API.find(entry => entry.name === name)
}

export function generatedApiMarkdown(): string {
  const categories = [...new Set(SCRIPT_API.map(entry => entry.category))]
  return categories.map(category => {
    const lines = SCRIPT_API.filter(entry => entry.category === category)
      .map(entry => `- \`${entry.signature}\` — ${entry.detail}`)
    return `## ${category}\n\n${lines.join('\n')}`
  }).join('\n\n')
}
