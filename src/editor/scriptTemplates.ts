export type ScriptTemplateId = 'component' | 'ui' | 'physics' | 'animation-event' | 'test'
export interface ScriptTemplate { id: ScriptTemplateId; name: string; description: string; source: string }

export const DEFAULT_SCRIPT_SOURCE = `// @nova strict deterministic
// @requires component RigidBody2D
// @budget commands 64
// @budget logs 16

@export(type="float", min=0, max=100, step=0.1, group="Movement", tooltip="Horizontal acceleration in newtons") let move_speed = 5.0;
@export(type="float", min=0, max=1000, step=0.1, group="Movement", tooltip="Instant vertical impulse in N·s") let jump_force = 10.0;

fn awake() {
  log_info("Awake: " + entity_name());
}

fn start() { }

fn fixed_update(dt) {
  let horizontal = input_axis("Horizontal");
  if horizontal != 0.0 {
    apply_force(horizontal * move_speed, 0.0);
  }
  if input_pressed("Jump") {
    apply_impulse(0.0, jump_force);
  }
}

fn update(dt) { }
fn late_update(dt) { }

fn on_collision_enter(other, point_x, point_y, normal_x, normal_y, relative_x, relative_y) { }
`

export const SCRIPT_TEMPLATES: readonly ScriptTemplate[] = [
  { id: 'component', name: 'Component', description: 'General lifecycle and movement component.', source: DEFAULT_SCRIPT_SOURCE },
  { id: 'ui', name: 'UI behavior', description: 'Button callbacks, signals, and UI value updates.', source: `// @nova strict deterministic
// @budget commands 32
// @budget logs 16
@export(type="string", group="UI", tooltip="Label shown by the UI element") let label = "Ready";
fn awake() { ui_set_text(label); }
fn on_pressed() { signal_emit("ui.pressed", entity()); }
fn on_hover_enter() { log_debug("hover enter"); }
fn on_hover_exit() { log_debug("hover exit"); }
fn on_signal(name, payload, source) { if name == "ui.progress" { ui_set_value(payload); } }
` },
  { id: 'physics', name: 'Physics behavior', description: 'Fixed-step force, impulse, and contact callbacks.', source: `// @nova strict deterministic
// @requires component RigidBody2D
// @budget commands 64
// @budget logs 16
@export(type="float", min=0, max=1000, step=0.1, group="Physics", tooltip="Continuous force in newtons") let force = 12.0;
fn fixed_update(dt) { apply_force(input_axis("Horizontal") * force, 0.0); }
fn on_collision_enter(other, px, py, nx, ny, rvx, rvy) { log_info("collision: " + other); }
fn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) { signal_emit("physics.trigger", #{ other: other, point: [px, py] }); }
` },
  { id: 'animation-event', name: 'Animation event', description: 'Animator control and queued animation signals.', source: `// @nova strict deterministic
// @requires component Animator
// @budget commands 32
// @budget logs 8
@export(type="string", group="Animation", tooltip="State played at startup") let initial_state = "Idle";
fn start() { animator_play(initial_state); }
fn on_signal(name, payload, source) { if name == "animation.event" { animator_trigger(payload); } }
fn update(dt) { animator_set_float("speed", rigid_body().velocity_x); }
` },
  { id: 'test', name: 'Script test', description: 'Deterministic setup, cases, tags, and assertions.', source: `// @nova strict deterministic
// @budget commands 16
// @budget logs 16
@export(type="integer", min=0, max=100, step=1, group="Tests") let value = 0;
fn before_each() { value = 2; }
// @test tags=unit,fast timeout=1000 seed=42 cases=first|second
fn test_example() { expect(value + 2 == 4, "expected deterministic arithmetic"); }
fn after_each() { value = 0; }
` }
] as const

export function scriptTemplate(id: ScriptTemplateId): ScriptTemplate { return SCRIPT_TEMPLATES.find(item => item.id === id) ?? SCRIPT_TEMPLATES[0] }
