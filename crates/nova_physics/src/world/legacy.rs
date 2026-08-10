fn determine_sub_steps(bodies: &[Body], dt: f64, global_gravity: f64) -> usize {
    let mut required = BASE_SUB_STEPS;
    for body in bodies {
        if body.is_static || !body.continuous_collision {
            continue;
        }
        let gravity_acceleration =
            (global_gravity + body.local_gravity).abs() * body.gravity_scale.abs();
        let force_acceleration = body.force.length() * body.inv_mass;
        let estimated_speed = body.velocity.length()
            + (body.acceleration.length() + gravity_acceleration + force_acceleration) * dt;
        let angular_surface_speed =
            body.angular_velocity.abs() * body.shape.characteristic_extent();
        let travel = (estimated_speed + angular_surface_speed) * dt;
        let permitted_travel = body.shape.characteristic_extent() * 0.25;
        if permitted_travel > 0.0 {
            required = required.max((travel / permitted_travel).ceil() as usize);
        }
    }
    required.clamp(BASE_SUB_STEPS, MAX_SUB_STEPS)
}

fn reset_contact_diagnostics(data: &mut [f64], body_count: usize) {
    for body_index in 0..body_count {
        let index = body_index * STRIDE;
        data[index + 29..index + 33].fill(0.0);
    }
}

fn read_bodies(data: &[f64], body_count: usize) -> Vec<Body> {
    (0..body_count)
        .map(|body_index| Body::from_data(data, body_index * STRIDE))
        .collect()
}

fn read_constraints(
    connection_data: &[f64],
    body_count: usize,
    bodies: &[Body],
) -> Vec<ConnectionConstraint> {
    let connection_count = connection_data.len() / CONNECTION_STRIDE;
    (0..connection_count)
        .filter_map(|connection_index| {
            ConnectionConstraint::from_data(
                connection_data,
                connection_index * CONNECTION_STRIDE,
                body_count,
            )
        })
        .filter(|constraint| bodies[constraint.body_a].layer == bodies[constraint.body_b].layer)
        .collect()
}

fn active_bound_pairs(
    constraints: &[ConnectionConstraint],
    body_count: usize,
) -> HashSet<(usize, usize)> {
    let mut adjacency = vec![Vec::new(); body_count];
    for constraint in constraints
        .iter()
        .filter(|constraint| constraint.binding && constraint.active)
    {
        adjacency[constraint.body_a].push(constraint.body_b);
        adjacency[constraint.body_b].push(constraint.body_a);
    }
    let mut pairs = HashSet::new();
    for start in 0..body_count {
        let mut pending = vec![start];
        let mut visited = vec![false; body_count];
        visited[start] = true;
        while let Some(current) = pending.pop() {
            for &next in &adjacency[current] {
                if !visited[next] {
                    visited[next] = true;
                    pending.push(next);
                }
            }
        }
        for (other, connected) in visited.into_iter().enumerate().skip(start + 1) {
            if connected {
                pairs.insert((start, other));
            }
        }
    }
    pairs
}

fn record_contact_diagnostics(data: &mut [f64], body_a: &Body, body_b: &Body, manifold: &Manifold) {
    let data_a = body_a.data_index;
    let data_b = body_b.data_index;
    data[data_a + 29] += 1.0;
    data[data_b + 29] += 1.0;
    if manifold.depth >= data[data_a + 32] {
        data[data_a + 30] = manifold.normal.x;
        data[data_a + 31] = manifold.normal.y;
        data[data_a + 32] = manifold.depth;
    }
    if manifold.depth >= data[data_b + 32] {
        data[data_b + 30] = -manifold.normal.x;
        data[data_b + 31] = -manifold.normal.y;
        data[data_b + 32] = manifold.depth;
    }
}

fn contact_from_manifold(
    bodies: &[Body],
    body_a_index: usize,
    body_b_index: usize,
    manifold: Manifold,
    position_weight: f64,
) -> Contact {
    let body_a = &bodies[body_a_index];
    let body_b = &bodies[body_b_index];
    let radius_a = manifold.point.sub(body_a.position);
    let radius_b = manifold.point.sub(body_b.position);
    let initial_relative_velocity = body_b
        .point_velocity(radius_b)
        .sub(body_a.point_velocity(radius_a));
    let initial_normal_velocity = initial_relative_velocity.dot(manifold.normal);
    let threshold = body_a
        .restitution_threshold
        .max(body_b.restitution_threshold);
    let restitution_bias = if initial_normal_velocity < -threshold {
        -body_a.restitution.max(body_b.restitution) * initial_normal_velocity
    } else {
        0.0
    };
    let dynamic_friction = (body_a.dynamic_friction * body_b.dynamic_friction).sqrt();
    let static_friction = (body_a.static_friction * body_b.static_friction)
        .sqrt()
        .max(dynamic_friction);
    Contact {
        body_a: body_a_index,
        body_b: body_b_index,
        normal: manifold.normal,
        tangent: manifold.normal.perp(),
        depth: manifold.depth,
        radius_a,
        radius_b,
        restitution_bias,
        static_friction,
        dynamic_friction,
        normal_impulse: 0.0,
        tangent_impulse: 0.0,
        is_sensor: body_a.is_sensor || body_b.is_sensor,
        position_weight,
    }
}

fn collect_contacts(
    bodies: &[Body],
    bound_pairs: &HashSet<(usize, usize)>,
    data: &mut [f64],
    record_diagnostics: bool,
) -> Vec<Contact> {
    let mut broad_phase: Vec<(usize, Aabb)> = bodies
        .iter()
        .enumerate()
        .map(|(index, body)| {
            (
                index,
                body.shape.aabb(body.collider_position(), body.collider_angle()),
            )
        })
        .collect();
    broad_phase.sort_by(|a, b| a.1.min_x.total_cmp(&b.1.min_x));

    let mut contacts = Vec::new();
    for sorted_a in 0..broad_phase.len() {
        for sorted_b in (sorted_a + 1)..broad_phase.len() {
            let (body_a_index, aabb_a) = broad_phase[sorted_a];
            let (body_b_index, aabb_b) = broad_phase[sorted_b];
            if aabb_b.min_x > aabb_a.max_x {
                break;
            }
            if !aabb_a.overlaps(aabb_b) {
                continue;
            }
            let ordered_pair = (
                body_a_index.min(body_b_index),
                body_a_index.max(body_b_index),
            );
            if bound_pairs.contains(&ordered_pair) {
                continue;
            }
            let body_a = &bodies[body_a_index];
            let body_b = &bodies[body_b_index];
            if !body_a.can_collide_with(body_b) {
                continue;
            }
            let manifolds = collide(body_a, body_b);
            let position_weight = 1.0 / manifolds.len().max(1) as f64;
            for manifold in manifolds {
                if record_diagnostics {
                    record_contact_diagnostics(data, body_a, body_b, &manifold);
                }
                contacts.push(contact_from_manifold(
                    bodies,
                    body_a_index,
                    body_b_index,
                    manifold,
                    position_weight,
                ));
            }
        }
    }
    contacts
}

#[derive(Clone, Copy)]
struct SubStepContext {
    dt: f64,
    global_gravity: f64,
    air_friction: f64,
    record_diagnostics: bool,
}

fn simulate_sub_step(
    bodies: &mut [Body],
    constraints: &mut [ConnectionConstraint],
    bound_pairs: &HashSet<(usize, usize)>,
    data: &mut [f64],
    context: SubStepContext,
) -> Vec<SolverContactSnapshot> {
    for body in bodies.iter_mut() {
        body.integrate(context.dt, context.global_gravity, context.air_friction);
    }
    for constraint in constraints.iter_mut() {
        integrate_rope_nodes(
            constraint,
            context.dt,
            context.global_gravity,
            context.air_friction,
        );
    }

    let mut contacts = collect_contacts(bodies, bound_pairs, data, context.record_diagnostics);
    for constraint in constraints.iter_mut() {
        resolve_rope_collisions(bodies, constraint);
    }
    for _ in 0..SOLVER_ITERATIONS {
        for constraint in constraints.iter_mut() {
            solve_connection_velocity(bodies, constraint, context.dt);
        }
        for contact in &mut contacts {
            solve_contact_velocity(bodies, contact);
        }
    }
    for constraint in constraints.iter_mut() {
        correct_connection_position(bodies, constraint);
    }
    for contact in &contacts {
        correct_contact_position(bodies, contact);
    }
    for constraint in constraints.iter_mut() {
        constraint.evaluate_failure(bodies);
    }
    for constraint in constraints.iter() {
        if constraint.binding {
            correct_binding_position(bodies, constraint);
        }
        synchronize_binding_motion(bodies, constraint);
    }
    contacts
        .iter()
        .map(|contact| {
            let body_a = &bodies[contact.body_a];
            let body_b = &bodies[contact.body_b];
            let point_a = body_a.position.add(contact.radius_a);
            let point_b = body_b.position.add(contact.radius_b);
            SolverContactSnapshot {
                body_a: contact.body_a,
                body_b: contact.body_b,
                point: point_a.add(point_b).mul(0.5),
                normal: contact.normal,
                relative_velocity: body_b
                    .point_velocity(contact.radius_b)
                    .sub(body_a.point_velocity(contact.radius_a)),
                penetration: contact.depth,
                sensor: contact.is_sensor,
            }
        })
        .collect()
}

fn write_bodies(data: &mut [f64], bodies: &[Body]) {
    for body in bodies {
        let index = body.data_index;
        data[index + 2] = finite_or(body.position.x, 0.0);
        data[index + 3] = finite_or(body.position.y, 0.0);
        data[index + 4] = finite_or(body.velocity.x, 0.0);
        data[index + 5] = finite_or(body.velocity.y, 0.0);
        data[index + 8] = body.mass;
        data[index + 14] = normalize_angle(body.angle);
        data[index + 15] = finite_or(body.angular_velocity, 0.0);
        data[index + 26] = body.inertia;
        data[index + 49] = if body.sleeping { 1.0 } else { 0.0 };
        data[index + 50] = finite_or(body.sleep_timer, 0.0).max(0.0);
    }
}

fn write_constraints(connection_data: &mut [f64], constraints: &[ConnectionConstraint]) {
    for constraint in constraints {
        let index = constraint.data_index;
        connection_data[index + 16] = if constraint.active { 1.0 } else { 0.0 };
        connection_data[index + 17] = constraint.broken_code as f64;
        connection_data[index + 18] = finite_or(constraint.tension, 0.0).max(0.0);
        connection_data[index + 19] = finite_or(constraint.strain, 0.0).max(0.0);
        connection_data[index + 27] = constraint.rope_nodes.len() as f64;
        connection_data[index + 28] = constraint.break_link.map_or(-1.0, |link| link as f64);
        for (node_index, node) in constraint
            .rope_nodes
            .iter()
            .enumerate()
            .take(ROPE_NODE_CAPACITY)
        {
            let offset = index + ROPE_NODE_DATA_OFFSET + node_index * 4;
            connection_data[offset] = finite_or(node.position.x, 0.0);
            connection_data[offset + 1] = finite_or(node.position.y, 0.0);
            connection_data[offset + 2] = finite_or(node.velocity.x, 0.0);
            connection_data[offset + 3] = finite_or(node.velocity.y, 0.0);
        }
    }
}

struct SolverWorld {
    data: Vec<f64>,
    connection_data: Vec<f64>,
    bodies: Vec<Body>,
    constraints: Vec<ConnectionConstraint>,
    contacts: Vec<SolverContactSnapshot>,
}

#[derive(Clone, Copy, Debug)]
struct SolverContactSnapshot {
    body_a: usize,
    body_b: usize,
    point: Vec2,
    normal: Vec2,
    relative_velocity: Vec2,
    penetration: f64,
    sensor: bool,
}

impl SolverWorld {
    fn new(input: &[f64], connection_input: &[f64]) -> Self {
        let mut data = input.to_vec();
        let connection_data = connection_input.to_vec();
        let body_count = data.len() / STRIDE;
        reset_contact_diagnostics(&mut data, body_count);
        let bodies = read_bodies(&data, body_count);
        let constraints = read_constraints(&connection_data, body_count, &bodies);
        Self { data, connection_data, bodies, constraints, contacts: Vec::new() }
    }

    fn step(&mut self, dt: f64, global_gravity: f64, air_friction: f64) {
        let body_count = self.bodies.len();
        reset_contact_diagnostics(&mut self.data, body_count);
        let dt = finite_or(dt, 0.0).clamp(0.0, 0.25);
        if body_count == 0 || dt <= 0.0 {
            self.contacts.clear();
            write_bodies(&mut self.data, &self.bodies);
            write_constraints(&mut self.connection_data, &self.constraints);
            return;
        }
        let global_gravity = finite_or(global_gravity, 0.0);
        let air_friction = non_negative(air_friction, 0.0);
        let bound_pairs = active_bound_pairs(&self.constraints, self.bodies.len());
        let sub_steps = determine_sub_steps(&self.bodies, dt, global_gravity);
        let sub_dt = dt / sub_steps as f64;
        for sub_step in 0..sub_steps {
            let contacts = simulate_sub_step(
                &mut self.bodies,
                &mut self.constraints,
                &bound_pairs,
                &mut self.data,
                SubStepContext {
                    dt: sub_dt,
                    global_gravity,
                    air_friction,
                    record_diagnostics: sub_step + 1 == sub_steps,
                },
            );
            if sub_step + 1 == sub_steps {
                self.contacts = contacts;
            }
        }
        for body in &mut self.bodies {
            let has_contact = self.data[body.data_index + 29] > 0.0;
            body.update_sleep_state(dt, has_contact);
        }
        write_bodies(&mut self.data, &self.bodies);
        write_constraints(&mut self.connection_data, &self.constraints);
    }

    fn copy_state(&self, bodies: &mut Vec<f64>, connections: &mut Vec<f64>) {
        bodies.clear();
        bodies.extend_from_slice(&self.data);
        connections.clear();
        connections.extend_from_slice(&self.connection_data);
    }

    fn contacts(&self) -> &[SolverContactSnapshot] {
        &self.contacts
    }

    fn into_output(self) -> Vec<f64> {
        let mut output = self.data;
        output.extend(self.connection_data);
        output
    }
}

pub fn step_physics(input: &[f64], dt: f64, global_gravity: f64, air_friction: f64) -> Vec<f64> {
    step_physics_with_connections(input, &[], dt, global_gravity, air_friction)
}

pub fn step_physics_with_connections(
    input: &[f64],
    connection_input: &[f64],
    dt: f64,
    global_gravity: f64,
    air_friction: f64,
) -> Vec<f64> {
    let source_stride = if input.is_empty() || input.len() % STRIDE == 0 {
        STRIDE
    } else if input.len() % V1_2_STRIDE == 0 {
        V1_2_STRIDE
    } else if input.len() % LEGACY_STRIDE == 0 {
        LEGACY_STRIDE
    } else {
        STRIDE
    };
    let legacy = source_stride != STRIDE;
    let upgraded = if legacy {
        let mut records = vec![0.0; input.len() / source_stride * STRIDE];
        for (record_index, source) in input.chunks_exact(source_stride).enumerate() {
            let target = &mut records[record_index * STRIDE..(record_index + 1) * STRIDE];
            target[..source_stride].copy_from_slice(source);
            if source_stride == LEGACY_STRIDE {
                let layer = finite_or(source[33], 0.0).round().clamp(0.0, 31.0) as u32;
                target[42] = (1_u32 << layer) as f64;
            }
            target[47] = 1.0;
            target[48] = 1.0;
        }
        records
    } else {
        input.to_vec()
    };
    let mut world = SolverWorld::new(&upgraded, connection_input);
    world.step(dt, global_gravity, air_friction);
    let output = world.into_output();
    if !legacy {
        return output;
    }
    let body_count = upgraded.len() / STRIDE;
    let mut downgraded = Vec::with_capacity(body_count * source_stride + connection_input.len());
    for record in output[..body_count * STRIDE].chunks_exact(STRIDE) {
        downgraded.extend_from_slice(&record[..source_stride]);
    }
    downgraded.extend_from_slice(&output[body_count * STRIDE..]);
    downgraded
}

