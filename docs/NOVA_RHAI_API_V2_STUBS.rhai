// Nova_A Rhai API v2 编辑器提示资料：由接口清单生成，仅用于说明，不执行或打包进游戏。
// Nova_A Rhai API v2 generated editor stubs.
// Metadata only: this file is not executed or bundled into a game.
// API 2; generated from src/editor/scriptApi.ts.

// 接口 awake；模块 lifecycle；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn awake()
// Runs once when this instance enters play.
// 接口 start；模块 lifecycle；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn start()
// Runs after every active instance has awakened.
// 接口 fixed_update；模块 lifecycle；生命周期 callback；线程约束 fixed-step；确定性 deterministic。
// @nova-api module=lifecycle lifetime=callback thread=fixed-step determinism=deterministic
// fn fixed_update(dt)
// Runs once per fixed physics tick.
// 接口 update；模块 lifecycle；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn update(dt)
// Runs once per rendered gameplay frame.
// 接口 late_update；模块 lifecycle；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn late_update(dt)
// Runs after update in the same frame.
// 接口 on_destroy；模块 lifecycle；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_destroy()
// Runs before the owning entity is removed.
// 接口 on_timer；模块 lifecycle；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=lifecycle lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_timer(name)
// Receives an expired named timer.
// 接口 on_task；模块 tasks；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_task(name)
// Receives completion of a deferred task.
// 接口 on_signal；模块 signals；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=signals lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_signal(name, payload, source)
// Receives a queued signal at a safe boundary.
// 接口 on_collision_enter；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_collision_enter(other, px, py, nx, ny, rvx, rvy)
// Receives the first solid contact tick.
// 接口 on_collision_stay；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_collision_stay(other, px, py, nx, ny, rvx, rvy)
// Receives each continuing solid contact tick.
// 接口 on_collision_exit；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_collision_exit(other, px, py, nx, ny, rvx, rvy)
// Receives the end of a solid contact.
// 接口 on_trigger_enter；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_trigger_enter(other, px, py, nx, ny, rvx, rvy)
// Receives the first sensor overlap tick.
// 接口 on_trigger_stay；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_trigger_stay(other, px, py, nx, ny, rvx, rvy)
// Receives each continuing sensor overlap tick.
// 接口 on_trigger_exit；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// fn on_trigger_exit(other, px, py, nx, ny, rvx, rvy)
// Receives the end of a sensor overlap.
// 接口 entity_handle；模块 object；生命周期 scene；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=scene thread=callback-boundary determinism=deterministic
// entity_handle() -> Handle<Entity>
// Returns this entity as a stable versioned handle.
// 接口 find_entity_handle；模块 object；生命周期 scene；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=scene thread=callback-boundary determinism=deterministic
// find_entity_handle(name) -> Handle<Entity>
// Finds an entity or returns an invalid handle with an error.
// 接口 entity；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity() -> string
// Returns the current entity UUID.
// 接口 entity_name；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_name() -> string
// Returns the current entity display name.
// 接口 find_entity；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// find_entity(name) -> string
// Compatibility UUID lookup.
// DEPRECATED: use find_entity_handle; removal API v3.
// 接口 query_tag；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// query_tag(tag, limit) -> Array<Handle<Entity>>
// Returns at most 256 stable entity handles with a tag.
// 接口 query_group；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// query_group(group, limit) -> Array<Handle<Entity>>
// Returns at most 256 stable entity handles in a group.
// 接口 query_component；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// query_component(kind, limit) -> Array<Handle<Entity>>
// Returns at most 256 entity handles owning a component kind.
// 接口 query_radius；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// query_radius(x, y, radius, limit) -> Array<Handle<Entity>>
// Returns bounded handles inside a finite world-space radius.
// 接口 entity_name_on；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_name_on(handle) -> string
// Reads the query-snapshot name for an entity handle.
// 接口 entity_enabled_on；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_enabled_on(handle) -> bool
// Reads the query-snapshot enabled state for an entity handle.
// 接口 entity_position_x_on；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_position_x_on(handle) -> float
// Reads query-snapshot world X for an entity handle.
// 接口 entity_position_y_on；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_position_y_on(handle) -> float
// Reads query-snapshot world Y for an entity handle.
// 接口 entity_set_position；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_set_position(handle, x, y)
// Queues a finite world position for a validated entity handle.
// 接口 entity_set_rotation；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_set_rotation(handle, radians)
// Queues a world rotation for a validated entity handle.
// 接口 entity_set_scale；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_set_scale(handle, x, y)
// Queues a non-zero world scale for a validated entity handle.
// 接口 entity_set_enabled；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_set_enabled(handle, enabled)
// Enables or disables a validated entity.
// 接口 entity_add_tag；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_add_tag(handle, tag)
// Adds one bounded tag to a validated entity.
// 接口 entity_remove_tag；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_remove_tag(handle, tag)
// Removes one tag from a validated entity.
// 接口 entity_add_group；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_add_group(handle, group)
// Adds a validated entity to a bounded group.
// 接口 entity_remove_group；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_remove_group(handle, group)
// Removes a validated entity from a group.
// 接口 entity_destroy；模块 object；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=object lifetime=callback thread=callback-boundary determinism=deterministic
// entity_destroy(handle)
// Safely destroys the validated target at the structural boundary.
// 接口 component_handle；模块 component；生命周期 scene；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=component lifetime=scene thread=callback-boundary determinism=deterministic
// component_handle(kind) -> Handle<Component>
// Returns a stable component handle or explicit invalid handle.
// 接口 has_component；模块 component；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=component lifetime=callback thread=callback-boundary determinism=deterministic
// has_component(kind) -> bool
// Reports whether this entity owns an enabled component.
// 接口 get_component；模块 component；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=component lifetime=callback thread=callback-boundary determinism=deterministic
// get_component(kind) -> string
// Legacy component URI lookup.
// DEPRECATED: use component_handle; removal API v3.
// 接口 component_set_enabled_on；模块 component；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=component lifetime=callback thread=callback-boundary determinism=deterministic
// component_set_enabled_on(handle, component, enabled)
// Enables or disables an existing target component.
// 接口 transform；模块 transform；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=transform lifetime=callback thread=callback-boundary determinism=deterministic
// transform() -> TransformSnapshot
// Reads one coherent world-transform snapshot.
// 接口 set_position；模块 transform；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=transform lifetime=callback thread=callback-boundary determinism=deterministic
// set_position(x, y)
// Queues an exact finite world position.
// 接口 set_rotation；模块 transform；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=transform lifetime=callback thread=callback-boundary determinism=deterministic
// set_rotation(radians)
// Queues world rotation in radians.
// 接口 set_scale；模块 transform；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=transform lifetime=callback thread=callback-boundary determinism=deterministic
// set_scale(x, y)
// Queues world scale.
// 接口 input_down；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_down(action) -> bool
// True while an action is held.
// 接口 input_pressed；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_pressed(action) -> bool
// True on an action press edge.
// 接口 input_released；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_released(action) -> bool
// True on an action release edge.
// 接口 input_performed；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_performed(action) -> bool
// True when Press, Hold, Tap, or Multi-tap reaches Performed.
// 接口 input_cancelled；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_cancelled(action) -> bool
// True when an interaction is released before completion.
// 接口 input_phase；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_phase(action) -> string
// Returns idle, started, performed, or cancelled.
// 接口 input_duration；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_duration(action) -> float
// Returns the current held duration in seconds.
// 接口 input_context_active；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_context_active(name) -> bool
// Reports whether an input context is active.
// 接口 input_map_active；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_map_active(name) -> bool
// Reports whether an action map is active.
// 接口 input_scheme；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_scheme() -> string
// Returns the active control scheme.
// 接口 input_context_push；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_context_push(name, priority, consume)
// Pushes or updates a bounded input context.
// 接口 input_context_pop；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_context_pop(name)
// Removes an active non-root input context.
// 接口 input_map_enable；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_map_enable(name)
// Enables a bounded named action map.
// 接口 input_map_disable；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_map_disable(name)
// Disables a named non-default action map.
// 接口 input_scheme_set；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_scheme_set(name)
// Selects a named input scheme.
// 接口 input_axis；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_axis(action) -> float
// Reads a scalar action.
// 接口 input_vector；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_vector(action) -> Vec2
// Reads a Vector2 action.
// 接口 input_vector_x；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_vector_x(action) -> float
// Reads a Vector2 x component.
// 接口 input_vector_y；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// input_vector_y(action) -> float
// Reads a Vector2 y component.
// 接口 mouse_x；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 host-dependent。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=host-dependent
// mouse_x() -> float
// Reads pointer x in the viewport.
// 接口 mouse_y；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 host-dependent。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=host-dependent
// mouse_y() -> float
// Reads pointer y in the viewport.
// 接口 mouse_world_x；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// mouse_world_x() -> float
// Reads pointer x in game-camera world units.
// 接口 mouse_world_y；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// mouse_world_y() -> float
// Reads pointer y in game-camera world units.
// 接口 view_min_x；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// view_min_x() -> float
// Reads the active game camera left world bound.
// 接口 view_max_x；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// view_max_x() -> float
// Reads the active game camera right world bound.
// 接口 view_min_y；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// view_min_y() -> float
// Reads the active game camera bottom world bound.
// 接口 view_max_y；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// view_max_y() -> float
// Reads the active game camera top world bound.
// 接口 viewport_width；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// viewport_width() -> float
// Reads the current game viewport width in CSS pixels.
// 接口 viewport_height；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// viewport_height() -> float
// Reads the current game viewport height in CSS pixels.
// 接口 wheel_x；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 host-dependent。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=host-dependent
// wheel_x() -> float
// Reads horizontal wheel delta.
// 接口 wheel_y；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 host-dependent。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=host-dependent
// wheel_y() -> float
// Reads vertical wheel delta.
// 接口 is_down；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// is_down(action) -> bool
// Legacy held-action alias.
// DEPRECATED: use input_down; removal API v3.
// 接口 was_pressed；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// was_pressed(action) -> bool
// Legacy press-edge alias.
// DEPRECATED: use input_pressed; removal API v3.
// 接口 was_released；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// was_released(action) -> bool
// Legacy release-edge alias.
// DEPRECATED: use input_released; removal API v3.
// 接口 axis；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// axis(action) -> float
// Legacy scalar-action alias.
// DEPRECATED: use input_axis; removal API v3.
// 接口 vector；模块 input；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=input lifetime=callback thread=callback-boundary determinism=deterministic
// vector(action) -> Vec2
// Legacy Vector2-action alias.
// DEPRECATED: use input_vector; removal API v3.
// 接口 rigid_body；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// rigid_body() -> RigidBodySnapshot
// Reads body velocity, angular velocity, mass and type.
// 接口 apply_force；模块 physics；生命周期 callback；线程约束 fixed-step；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// apply_force(x, y)
// Applies force in newtons during a fixed step.
// 接口 apply_impulse；模块 physics；生命周期 callback；线程约束 fixed-step；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// apply_impulse(x, y)
// Applies instantaneous impulse in N·s.
// 接口 set_velocity；模块 physics；生命周期 callback；线程约束 fixed-step；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// set_velocity(x, y)
// Sets linear velocity in world units per second.
// 接口 set_angular_velocity；模块 physics；生命周期 callback；线程约束 fixed-step；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// set_angular_velocity(radians_per_second)
// Sets angular velocity.
// 接口 character_is_on_floor；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_is_on_floor() -> bool
// Reads authoritative floor state.
// 接口 character_is_on_wall；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_is_on_wall() -> bool
// Reads authoritative wall state.
// 接口 character_is_on_ceiling；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_is_on_ceiling() -> bool
// Reads authoritative ceiling state.
// 接口 can_coyote_jump；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// can_coyote_jump() -> bool
// Reports floor contact or an active coyote window.
// 接口 character_can_coyote_jump；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_can_coyote_jump() -> bool
// Legacy coyote-window name.
// DEPRECATED: use can_coyote_jump; removal API v3.
// 接口 character_floor_normal；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_floor_normal() -> Vec2
// Returns the current floor normal.
// 接口 character_platform_velocity；模块 physics；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=callback-boundary determinism=deterministic
// character_platform_velocity() -> Vec2
// Returns supporting-platform velocity.
// 接口 move_character；模块 physics；生命周期 callback；线程约束 fixed-step；确定性 deterministic。
// @nova-api module=physics lifetime=callback thread=fixed-step determinism=deterministic
// move_character(x, y)
// Queues CharacterBody2D displacement for the next fixed step.
// 接口 ui_set_text；模块 ui；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=ui lifetime=callback thread=callback-boundary determinism=deterministic
// ui_set_text(text)
// Sets Text or TextRenderer2D content on this entity.
// 接口 ui_set_value；模块 ui；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=ui lifetime=callback thread=callback-boundary determinism=deterministic
// ui_set_value(value)
// Sets Slider, ProgressBar or Checkbox value.
// 接口 ui_set_text_on；模块 ui；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=ui lifetime=callback thread=callback-boundary determinism=deterministic
// ui_set_text_on(handle, text)
// Sets text on a validated target UI/world-text entity.
// 接口 ui_set_value_on；模块 ui；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=ui lifetime=callback thread=callback-boundary determinism=deterministic
// ui_set_value_on(handle, value)
// Sets a validated target Slider, ProgressBar, or Checkbox.
// 接口 animator_handle；模块 animation；生命周期 scene；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=animation lifetime=scene thread=callback-boundary determinism=deterministic
// animator_handle() -> Handle<Animator>
// Returns this Animator as a stable handle.
// 接口 animator；模块 animation；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator() -> string
// Legacy Animator URI lookup.
// DEPRECATED: use animator_handle; removal API v3.
// 接口 animator_set_bool；模块 animation；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_set_bool(name, value)
// Sets a Boolean Animator parameter.
// 接口 animator_set_float；模块 animation；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_set_float(name, value)
// Sets a float Animator parameter.
// 接口 animator_set_integer；模块 animation；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_set_integer(name, value)
// Sets an integer Animator parameter.
// 接口 animator_trigger；模块 animation；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_trigger(name)
// Raises an Animator trigger.
// 接口 animator_play；模块 animation；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=animation lifetime=callback thread=callback-boundary determinism=deterministic
// animator_play(state)
// Requests an Animator state.
// 接口 audio_source_handle；模块 audio；生命周期 scene；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=audio lifetime=scene thread=callback-boundary determinism=deterministic
// audio_source_handle() -> Handle<AudioSource>
// Returns this AudioSource as a stable handle.
// 接口 audio_source；模块 audio；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=audio lifetime=callback thread=callback-boundary determinism=deterministic
// audio_source() -> string
// Legacy AudioSource URI lookup.
// DEPRECATED: use audio_source_handle; removal API v3.
// 接口 audio_play；模块 audio；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=audio lifetime=callback thread=callback-boundary determinism=deterministic
// audio_play()
// Plays this entity AudioSource.
// 接口 audio_pause；模块 audio；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=audio lifetime=callback thread=callback-boundary determinism=deterministic
// audio_pause()
// Pauses this entity AudioSource.
// 接口 audio_stop；模块 audio；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=audio lifetime=callback thread=callback-boundary determinism=deterministic
// audio_stop()
// Stops this entity AudioSource.
// 接口 navigation_set_target；模块 navigation；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=navigation lifetime=callback thread=callback-boundary determinism=deterministic
// navigation_set_target(x, y)
// Sets this NavigationAgent2D world target.
// 接口 instantiate；模块 scene；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// instantiate(prefab)
// Queues a prefab instance.
// 接口 spawn_at；模块 scene；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// spawn_at(prefab, x, y, rotation, scale_x, scale_y) -> Handle<Entity>
// Queues a prefab at an exact transform and returns a stable pending handle.
// 接口 destroy；模块 scene；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// destroy()
// Queues safe entity destruction.
// 接口 despawn；模块 scene；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// despawn()
// Returns a pooled object or safely destroys it.
// 接口 scene_load；模块 scene；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// scene_load(scene)
// Queues a scene switch.
// 接口 scene_reload；模块 scene；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// scene_reload()
// Queues active-scene reload.
// 接口 scene_quit；模块 scene；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=scene lifetime=callback thread=callback-boundary determinism=deterministic
// scene_quit()
// Requests clean runtime shutdown.
// 接口 game_pause；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// game_pause(paused)
// Pauses or resumes scaled gameplay while input/update callbacks remain available.
// 接口 game_paused；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// game_paused() -> bool
// Reports the current gameplay pause state.
// 接口 checkpoint_set；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// checkpoint_set(name)
// Captures bounded scene transforms, health, score, and session state.
// 接口 checkpoint_has；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// checkpoint_has(name) -> bool
// Reports whether a runtime checkpoint exists.
// 接口 checkpoint_restore；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// checkpoint_restore(name)
// Restores a same-scene checkpoint or fails explicitly.
// 接口 score_get；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// score_get() -> float
// Returns the bounded session score.
// 接口 score_set；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// score_set(value)
// Sets the bounded session score.
// 接口 score_add；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// score_add(value)
// Adds to the bounded session score.
// 接口 session_get；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// session_get(key, fallback) -> value
// Reads a bounded serializable session value.
// 接口 session_set；模块 gameplay；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=gameplay lifetime=callback thread=callback-boundary determinism=deterministic
// session_set(key, value)
// Writes a bounded serializable session value.
// 接口 network_enabled；模块 network；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=network lifetime=callback thread=callback-boundary determinism=deterministic
// network_enabled() -> bool
// Reports whether reviewed project networking and explicit permission are enabled.
// 接口 network_connected；模块 network；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=network lifetime=callback thread=callback-boundary determinism=deterministic
// network_connected() -> bool
// Reports whether the optional runtime has an active session transport.
// 接口 network_is_authority；模块 network；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=network lifetime=callback thread=callback-boundary determinism=deterministic
// network_is_authority() -> bool
// Reports whether this peer owns server or host authority.
// 接口 network_peer_count；模块 network；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=network lifetime=callback thread=callback-boundary determinism=deterministic
// network_peer_count() -> int
// Returns the bounded number of known remote peers.
// 接口 network_local_peer；模块 network；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=network lifetime=callback thread=callback-boundary determinism=deterministic
// network_local_peer() -> string
// Returns the current bounded local peer identifier.
// 接口 network_role；模块 network；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=network lifetime=callback thread=callback-boundary determinism=deterministic
// network_role() -> string
// Returns client, server, or host.
// 接口 network_tick；模块 network；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=network lifetime=callback thread=callback-boundary determinism=deterministic
// network_tick() -> int
// Returns the authoritative network tick observed at this callback boundary.
// 接口 network_rpc；模块 network；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=network lifetime=callback thread=callback-boundary determinism=deterministic
// network_rpc(name, payload)
// Queues a declared RPC through explicit permission, authority, direction, schema, rate, payload, and bandwidth checks.
// 接口 time；模块 timing；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time() -> TimeSnapshot
// Returns delta, fixed delta, elapsed, scale and frame.
// 接口 time_delta；模块 timing；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_delta() -> float
// Returns render delta seconds.
// 接口 time_fixed_delta；模块 timing；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_fixed_delta() -> float
// Returns fixed-step seconds.
// 接口 time_elapsed；模块 timing；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_elapsed() -> float
// Returns scaled elapsed seconds.
// 接口 time_scale；模块 timing；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_scale() -> float
// Returns active time scale.
// 接口 time_frame；模块 timing；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=deterministic
// time_frame() -> int
// Returns deterministic frame number.
// 接口 random；模块 timing；生命周期 callback；线程约束 callback-boundary；确定性 seeded。
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=seeded
// random() -> float
// Returns a deterministic seeded value in [0, 1).
// 接口 random_range；模块 timing；生命周期 callback；线程约束 callback-boundary；确定性 seeded。
// @nova-api module=timing lifetime=callback thread=callback-boundary determinism=seeded
// random_range(minimum, maximum) -> float
// Returns a deterministic value in a finite range.
// 接口 timer_start；模块 tasks；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// timer_start(name, seconds, repeat)
// Starts a validated entity-owned timer.
// 接口 timer_pause；模块 tasks；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// timer_pause(name)
// Pauses a timer.
// 接口 timer_resume；模块 tasks；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// timer_resume(name)
// Resumes a timer.
// 接口 timer_cancel；模块 tasks；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// timer_cancel(name)
// Cancels a timer.
// 接口 task_wait；模块 tasks；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// task_wait(name, seconds)
// Schedules a cancellable deferred task.
// 接口 task_cancel；模块 tasks；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=tasks lifetime=callback thread=callback-boundary determinism=deterministic
// task_cancel(name)
// Cancels an entity-owned task.
// 接口 signal_emit；模块 signals；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=signals lifetime=callback thread=callback-boundary determinism=deterministic
// signal_emit(name, payload)
// Queues a serializable broadcast signal.
// 接口 signal_emit_to；模块 signals；生命周期 callback；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=signals lifetime=callback thread=callback-boundary determinism=deterministic
// signal_emit_to(entity_id, name, payload)
// Queues a serializable targeted signal.
// 接口 save_has；模块 save；生命周期 persistent-save；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_has(key) -> bool
// Reports whether a save key exists.
// 接口 save_get；模块 save；生命周期 persistent-save；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_get(key, fallback) -> value
// Reads a safe persistent value.
// 接口 save_set；模块 save；生命周期 persistent-save；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_set(key, value)
// Queues a serializable persistent value.
// 接口 save_delete；模块 save；生命周期 persistent-save；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_delete(key)
// Deletes a persistent key.
// 接口 save_clear；模块 save；生命周期 persistent-save；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_clear()
// Clears in-memory save state.
// 接口 save_load；模块 save；生命周期 persistent-save；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_load(slot)
// Queues a named slot load.
// 接口 save_commit；模块 save；生命周期 persistent-save；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=save lifetime=persistent-save thread=callback-boundary determinism=deterministic
// save_commit(slot)
// Atomically commits a named slot.
// 接口 log_debug；模块 logging；生命周期 callback；线程约束 worker-safe；确定性 deterministic。
// @nova-api module=logging lifetime=callback thread=worker-safe determinism=deterministic
// log_debug(message)
// Writes a bounded Debug console event.
// 接口 log_info；模块 logging；生命周期 callback；线程约束 worker-safe；确定性 deterministic。
// @nova-api module=logging lifetime=callback thread=worker-safe determinism=deterministic
// log_info(message)
// Writes a bounded Info console event.
// 接口 log_warning；模块 logging；生命周期 callback；线程约束 worker-safe；确定性 deterministic。
// @nova-api module=logging lifetime=callback thread=worker-safe determinism=deterministic
// log_warning(message)
// Writes a bounded Warning console event.
// 接口 log_error；模块 logging；生命周期 callback；线程约束 worker-safe；确定性 deterministic。
// @nova-api module=logging lifetime=callback thread=worker-safe determinism=deterministic
// log_error(message)
// Writes a bounded Error event without crashing.
// 接口 resource_handle；模块 resources；生命周期 project；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// resource_handle(reference, type) -> Handle<Resource>
// Validates an asset URI and returns a stable typed handle.
// 接口 api_version；模块 resources；生命周期 project；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// api_version() -> int
// Returns the API version selected for this script asset.
// 接口 api_current_version；模块 resources；生命周期 project；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// api_current_version() -> int
// Returns the newest API implemented by this engine.
// 接口 api_minimum_version；模块 resources；生命周期 project；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// api_minimum_version() -> int
// Returns the oldest API version supported by the compatibility adapter.
// 接口 api_namespace；模块 resources；生命周期 project；线程约束 callback-boundary；确定性 deterministic。
// @nova-api module=resources lifetime=project thread=callback-boundary determinism=deterministic
// api_namespace(symbol) -> string
// Returns the documentation namespace of a flat symbol.
// 接口 expect；模块 testing；生命周期 callback；线程约束 worker-safe；确定性 deterministic。
// @nova-api module=testing lifetime=callback thread=worker-safe determinism=deterministic
// expect(condition, message) -> bool
// Records a test assertion without corrupting another instance.
