#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsQueryHit {
    pub handle: u32,
    pub point: [f64; 2],
    pub normal: [f64; 2],
    pub distance: f64,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterMoveResult {
    pub position: [f64; 2],
    pub applied_motion: [f64; 2],
    pub remaining_motion: [f64; 2],
    pub floor_normal: [f64; 2],
    pub wall_normal: [f64; 2],
    pub ceiling_normal: [f64; 2],
    pub platform_velocity: [f64; 2],
    pub on_floor: bool,
    pub on_wall: bool,
    pub on_ceiling: bool,
    pub slide_count: u32,
}

fn query_enabled(mask: u32, body: &Body) -> bool {
    mask & (1_u32 << body.layer) != 0
}

fn polygon_contains(vertices: &[Vec2], point: Vec2) -> bool {
    if vertices.len() < 3 {
        return false;
    }
    let mut sign = 0.0;
    for index in 0..vertices.len() {
        let cross = vertices[(index + 1) % vertices.len()]
            .sub(vertices[index])
            .cross(point.sub(vertices[index]));
        if cross.abs() <= EPSILON {
            continue;
        }
        if sign == 0.0 {
            sign = cross.signum();
        } else if sign * cross < 0.0 {
            return false;
        }
    }
    true
}

fn point_in_body(body: &Body, point: Vec2) -> bool {
    let local = inverse_rotate(point.sub(body.collider_position()), body.collider_angle());
    match &body.shape {
        Shape::Ellipse { radius_x, radius_y } => {
            (local.x / radius_x).powi(2) + (local.y / radius_y).powi(2) <= 1.0 + EPSILON
        }
        Shape::Polygon { vertices } => polygon_contains(vertices, local),
    }
}

fn ray_body(body: &Body, origin: Vec2, direction: Vec2, distance: f64) -> Option<PhysicsQueryHit> {
    let direction = direction.normalized_or(Vec2::new(1.0, 0.0));
    if point_in_body(body, origin) {
        return Some(PhysicsQueryHit {
            handle: 0,
            point: [origin.x, origin.y],
            normal: [-direction.x, -direction.y],
            distance: 0.0,
        });
    }
    match &body.shape {
        Shape::Ellipse { radius_x, radius_y } => {
            let local_origin = inverse_rotate(origin.sub(body.collider_position()), body.collider_angle());
            let local_direction = inverse_rotate(direction, body.collider_angle());
            let a = (local_direction.x / radius_x).powi(2) + (local_direction.y / radius_y).powi(2);
            let b = 2.0 * (local_origin.x * local_direction.x / radius_x.powi(2)
                + local_origin.y * local_direction.y / radius_y.powi(2));
            let c = (local_origin.x / radius_x).powi(2) + (local_origin.y / radius_y).powi(2) - 1.0;
            let discriminant = b * b - 4.0 * a * c;
            if a <= EPSILON || discriminant < 0.0 {
                return None;
            }
            let root = discriminant.sqrt();
            let t = [(-b - root) / (2.0 * a), (-b + root) / (2.0 * a)]
                .into_iter()
                .filter(|value| *value >= 0.0 && *value <= distance)
                .min_by(f64::total_cmp)?;
            let local_point = local_origin.add(local_direction.mul(t));
            let local_normal = Vec2::new(local_point.x / radius_x.powi(2), local_point.y / radius_y.powi(2))
                .normalized_or(local_direction.neg());
            let normal = rotate(local_normal, body.collider_angle());
            let point = origin.add(direction.mul(t));
            Some(PhysicsQueryHit { handle: 0, point: [point.x, point.y], normal: [normal.x, normal.y], distance: t })
        }
        Shape::Polygon { vertices } => {
            let world_vertices: Vec<Vec2> = vertices.iter().map(|vertex| body.collider_position().add(rotate(*vertex, body.collider_angle()))).collect();
            let signed_area: f64 = (0..world_vertices.len()).map(|index| world_vertices[index].cross(world_vertices[(index + 1) % world_vertices.len()])).sum();
            let mut closest: Option<(f64, Vec2)> = None;
            for index in 0..world_vertices.len() {
                let a = world_vertices[index];
                let b = world_vertices[(index + 1) % world_vertices.len()];
                let edge = b.sub(a);
                let denominator = direction.cross(edge);
                if denominator.abs() <= EPSILON { continue; }
                let delta = a.sub(origin);
                let ray_t = delta.cross(edge) / denominator;
                let edge_t = delta.cross(direction) / denominator;
                if ray_t < 0.0
                    || ray_t > distance
                    || !(-EPSILON..=1.0 + EPSILON).contains(&edge_t)
                {
                    continue;
                }
                let raw = if signed_area >= 0.0 { Vec2::new(edge.y, -edge.x) } else { Vec2::new(-edge.y, edge.x) };
                let normal = raw.normalized_or(direction.neg());
                if closest.map_or(true, |value| ray_t < value.0) { closest = Some((ray_t, normal)); }
            }
            closest.map(|(t, normal)| {
                let point = origin.add(direction.mul(t));
                PhysicsQueryHit { handle: 0, point: [point.x, point.y], normal: [normal.x, normal.y], distance: t }
            })
        }
    }
}

fn query_shape(shape: Shape, position: Vec2, angle: f64) -> Body {
    Body {
        data_index: usize::MAX,
        shape,
        position,
        velocity: Vec2::ZERO,
        acceleration: Vec2::ZERO,
        angle,
        angular_velocity: 0.0,
        force: Vec2::ZERO,
        torque: 0.0,
        mass: 1.0,
        inv_mass: 0.0,
        inertia: 1.0,
        inv_inertia: 0.0,
        gravity_scale: 0.0,
        local_gravity: 0.0,
        linear_damping: 0.0,
        angular_damping: 0.0,
        restitution: 0.0,
        restitution_threshold: 0.0,
        static_friction: 0.0,
       dynamic_friction: 0.0,
        friction_combine: 0,
        restitution_combine: 3,
        is_static: true,
        is_kinematic: false,
        is_sensor: true,
        layer: 0,
        collision_mask: u32::MAX,
        collider_offset: Vec2::ZERO,
        collider_angle_offset: 0.0,
        freeze_rotation: true,
        continuous_collision: false,
        sleeping_allowed: false,
        sleeping: false,
        sleep_timer: 0.0,
        one_way: false,
        one_way_normal: Vec2::new(0.0, 1.0),
        auto_inertia: false,
        collider_children: Vec::new(),
    }
}

fn box_shape(half_width: f64, half_height: f64) -> Shape {
    Shape::Polygon { vertices: vec![
        Vec2::new(-half_width, -half_height), Vec2::new(half_width, -half_height),
        Vec2::new(half_width, half_height), Vec2::new(-half_width, half_height),
    ] }
}

fn ray_aabb_interval(origin: Vec2, direction: Vec2, distance: f64, bounds: Aabb) -> Option<(f64, f64)> {
    let mut entry: f64 = 0.0;
    let mut exit = distance;
    for (origin_axis, direction_axis, minimum, maximum) in [
        (origin.x, direction.x, bounds.min_x, bounds.max_x),
        (origin.y, direction.y, bounds.min_y, bounds.max_y),
    ] {
        if direction_axis.abs() <= EPSILON {
            if origin_axis < minimum || origin_axis > maximum { return None; }
            continue;
        }
        let first = (minimum - origin_axis) / direction_axis;
        let second = (maximum - origin_axis) / direction_axis;
        entry = entry.max(first.min(second));
        exit = exit.min(first.max(second));
        if entry > exit { return None; }
    }
    (exit >= 0.0 && entry <= distance).then_some((entry.max(0.0), exit.min(distance)))
}

impl PhysicsWorld {
    fn query_records(&self) -> Vec<(u32, Body)> {
        self.bodies.iter().map(|record| (record.handle, Body::from_data(&record.values, 0))).collect()
    }

    pub fn raycast_all(&self, origin: [f64; 2], direction: [f64; 2], distance: f64, mask: u32) -> Vec<PhysicsQueryHit> {
        let origin = Vec2::new(finite_or(origin[0], 0.0), finite_or(origin[1], 0.0));
        let direction = Vec2::new(finite_or(direction[0], 1.0), finite_or(direction[1], 0.0));
        let distance = non_negative(distance, 0.0);
        let mut hits: Vec<_> = self.query_records().into_iter().filter_map(|(handle, body)| {
            if !query_enabled(mask, &body) { return None; }
            ray_body(&body, origin, direction, distance).map(|mut hit| { hit.handle = handle; hit })
        }).collect();
        hits.sort_by(|first, second| first.distance.total_cmp(&second.distance).then(first.handle.cmp(&second.handle)));
        hits
    }

    pub fn raycast(&self, origin: [f64; 2], direction: [f64; 2], distance: f64, mask: u32) -> Option<PhysicsQueryHit> {
        self.raycast_all(origin, direction, distance, mask).into_iter().next()
    }

    pub fn overlap_point(&self, point: [f64; 2], mask: u32) -> Vec<u32> {
        let point = Vec2::new(finite_or(point[0], 0.0), finite_or(point[1], 0.0));
        self.query_records().into_iter().filter_map(|(handle, body)| (query_enabled(mask, &body) && point_in_body(&body, point)).then_some(handle)).collect()
    }

    pub fn overlap_circle(&self, center: [f64; 2], radius: f64, mask: u32) -> Vec<u32> {
        let query = query_shape(Shape::Ellipse { radius_x: positive(radius, MIN_DIMENSION), radius_y: positive(radius, MIN_DIMENSION) }, Vec2::new(finite_or(center[0], 0.0), finite_or(center[1], 0.0)), 0.0);
        self.overlap_shape(&query, mask)
    }

    pub fn overlap_box(&self, center: [f64; 2], size: [f64; 2], angle: f64, mask: u32) -> Vec<u32> {
        let query = query_shape(box_shape(positive(size[0].abs(), MIN_DIMENSION) * 0.5, positive(size[1].abs(), MIN_DIMENSION) * 0.5), Vec2::new(finite_or(center[0], 0.0), finite_or(center[1], 0.0)), normalize_angle(angle));
        self.overlap_shape(&query, mask)
    }

    fn overlap_shape(&self, query: &Body, mask: u32) -> Vec<u32> {
        self.query_records().into_iter().filter_map(|(handle, body)| (query_enabled(mask, &body) && !collide(query, &body).is_empty()).then_some(handle)).collect()
    }

    pub fn shape_cast(&self, center: [f64; 2], size: [f64; 2], angle: f64, direction: [f64; 2], distance: f64, mask: u32) -> Option<PhysicsQueryHit> {
        self.shape_cast_excluding(center, size, angle, direction, distance, mask, None)
    }

    #[allow(clippy::too_many_arguments)]
    fn shape_cast_excluding(
        &self,
        center: [f64; 2],
        size: [f64; 2],
        angle: f64,
        direction: [f64; 2],
        distance: f64,
        mask: u32,
        excluded_handle: Option<u32>,
    ) -> Option<PhysicsQueryHit> {
        let start = Vec2::new(finite_or(center[0], 0.0), finite_or(center[1], 0.0));
        let direction = Vec2::new(finite_or(direction[0], 1.0), finite_or(direction[1], 0.0)).normalized_or(Vec2::new(1.0, 0.0));
        let distance = non_negative(distance, 0.0);
        let shape = box_shape(positive(size[0].abs(), MIN_DIMENSION) * 0.5, positive(size[1].abs(), MIN_DIMENSION) * 0.5);
        let query_extent = shape.characteristic_extent();
        let query_bounds = shape.aabb(Vec2::ZERO, normalize_angle(angle));
        let query_half_width = query_bounds.max_x.abs().max(query_bounds.min_x.abs());
        let query_half_height = query_bounds.max_y.abs().max(query_bounds.min_y.abs());
        let mut best: Option<PhysicsQueryHit> = None;
        for (handle, body) in self.query_records() {
            if Some(handle) == excluded_handle || !query_enabled(mask, &body) { continue; }
            if body.one_way {
                let allowed = rotate(body.one_way_normal, body.collider_angle())
                    .normalized_or(Vec2::new(0.0, 1.0));
                let starts_on_blocking_side = start.sub(body.collider_position()).dot(allowed) >= -POSITION_SLOP;
                if direction.dot(allowed) >= -EPSILON || !starts_on_blocking_side { continue; }
            }
            let target_bounds = body.shape.aabb(body.collider_position(), body.collider_angle());
            let expanded = Aabb {
                min_x: target_bounds.min_x - query_half_width,
                max_x: target_bounds.max_x + query_half_width,
                min_y: target_bounds.min_y - query_half_height,
                max_y: target_bounds.max_y + query_half_height,
            };
            let Some((entry, exit)) = ray_aabb_interval(start, direction, distance, expanded) else { continue; };
            let collides_at = |travel: f64| {
                let query = query_shape(shape.clone(), start.add(direction.mul(travel)), normalize_angle(angle));
                collide(&query, &body).into_iter().next()
            };
            if let Some(manifold) = collides_at(0.0) {
                let surface_normal = manifold.normal.neg();
                let hit = PhysicsQueryHit { handle, point: [manifold.point.x, manifold.point.y], normal: [surface_normal.x, surface_normal.y], distance: 0.0 };
                if best.map_or(true, |current| hit.distance < current.distance) { best = Some(hit); }
                continue;
            }
            let span = (exit - entry).max(0.0);
            let sample_scale = query_extent.min(body.shape.characteristic_extent()).max(MIN_DIMENSION);
            let steps = ((span / sample_scale * 8.0).ceil() as usize).clamp(8, 4096);
            let mut previous = entry;
            for step in 1..=steps {
                let travel = entry + span * step as f64 / steps as f64;
                let Some(mut manifold) = collides_at(travel) else { previous = travel; continue; };
                let mut low = previous;
                let mut high = travel;
                for _ in 0..48 {
                    let middle = (low + high) * 0.5;
                    if let Some(value) = collides_at(middle) { high = middle; manifold = value; } else { low = middle; }
                }
                let surface_normal = manifold.normal.neg();
                let hit = PhysicsQueryHit { handle, point: [manifold.point.x, manifold.point.y], normal: [surface_normal.x, surface_normal.y], distance: high };
                if best.map_or(true, |current| hit.distance < current.distance) { best = Some(hit); }
                break;
            }
        }
        best
    }

    #[allow(clippy::too_many_arguments)]
    pub fn move_character_box(
        &mut self,
        handle: u32,
        size: [f64; 2],
        displacement: [f64; 2],
        max_slope_angle: f64,
        step_height: f64,
        floor_snap: f64,
        max_slides: u32,
        safe_margin: f64,
        mask: u32,
    ) -> Result<CharacterMoveResult, &'static str> {
        let Some(body_index) = self.body_index.get(&handle).copied() else {
            return Err("character body handle does not exist");
        };
        let start = Vec2::new(
            finite_or(self.bodies[body_index].values[2], 0.0),
            finite_or(self.bodies[body_index].values[3], 0.0),
        );
        let angle = normalize_angle(self.bodies[body_index].values[14]);
        let size = [
            positive(size[0].abs(), MIN_DIMENSION),
            positive(size[1].abs(), MIN_DIMENSION),
        ];
        let requested = Vec2::new(finite_or(displacement[0], 0.0), finite_or(displacement[1], 0.0));
        let slope_cosine = finite_or(max_slope_angle, std::f64::consts::FRAC_PI_4)
            .clamp(0.0, std::f64::consts::FRAC_PI_2)
            .cos();
        let step_height = non_negative(step_height, 0.0);
        let floor_snap = non_negative(floor_snap, 0.0);
        let margin = non_negative(safe_margin, 1.0e-5).max(1.0e-9);
        let maximum_slides = max_slides.clamp(1, 32);
        let mut result = CharacterMoveResult {
            position: [start.x, start.y],
            remaining_motion: [requested.x, requested.y],
            ..CharacterMoveResult::default()
        };
        let mut position = start;
        let mut remaining = requested;

        for _ in 0..maximum_slides {
            let distance = remaining.length();
            if distance <= EPSILON { break; }
            let direction = remaining.mul(1.0 / distance);
            let hit = self.shape_cast_excluding(
                [position.x, position.y], size, angle,
                [direction.x, direction.y], distance + margin, mask, Some(handle),
            );
            let Some(hit) = hit else {
                position = position.add(remaining);
                remaining = Vec2::ZERO;
                break;
            };
            let travel = (hit.distance - margin).clamp(0.0, distance);
            position = position.add(direction.mul(travel));
            let normal = Vec2::new(hit.normal[0], hit.normal[1]).normalized_or(direction.neg());
            if normal.y >= slope_cosine {
                result.on_floor = true;
                result.floor_normal = [normal.x, normal.y];
                if let Some(platform) = self.bodies.iter().find(|record| record.handle == hit.handle) {
                    result.platform_velocity = [
                        finite_or(platform.values[4], 0.0),
                        finite_or(platform.values[5], 0.0),
                    ];
                }
            } else if normal.y <= -slope_cosine {
                result.on_ceiling = true;
                result.ceiling_normal = [normal.x, normal.y];
            } else {
                result.on_wall = true;
                result.wall_normal = [normal.x, normal.y];
            }
            result.slide_count = result.slide_count.saturating_add(1);

            let untravelled = direction.mul((distance - travel).max(0.0));
            if result.on_wall && step_height > EPSILON && direction.y.abs() < 0.5 {
                let raised = position.add(Vec2::new(0.0, step_height));
                let step_hit = self.shape_cast_excluding(
                    [raised.x, raised.y], size, angle,
                    [direction.x, direction.y], untravelled.length(), mask, Some(handle),
                );
                if step_hit.is_none() {
                    position = raised.add(untravelled);
                    remaining = Vec2::ZERO;
                    break;
                }
            }
            let into_surface = untravelled.dot(normal);
            remaining = if into_surface < 0.0 {
                untravelled.sub(normal.mul(into_surface))
            } else {
                untravelled
            };
            if remaining.length() <= margin { remaining = Vec2::ZERO; break; }
        }

        if floor_snap > EPSILON && !result.on_floor && requested.y <= EPSILON {
            if let Some(hit) = self.shape_cast_excluding(
                [position.x, position.y], size, angle, [0.0, -1.0], floor_snap + margin, mask, Some(handle),
            ) {
                let normal = Vec2::new(hit.normal[0], hit.normal[1]).normalized_or(Vec2::new(0.0, 1.0));
                if normal.y >= slope_cosine {
                    position.y -= (hit.distance - margin).clamp(0.0, floor_snap);
                    result.on_floor = true;
                    result.floor_normal = [normal.x, normal.y];
                    if let Some(platform) = self.bodies.iter().find(|record| record.handle == hit.handle) {
                        result.platform_velocity = [finite_or(platform.values[4], 0.0), finite_or(platform.values[5], 0.0)];
                    }
                }
            }
        }

        self.set_transform(handle, position.x, position.y, angle)?;
        result.position = [position.x, position.y];
        result.applied_motion = [position.x - start.x, position.y - start.y];
        result.remaining_motion = [remaining.x, remaining.y];
        Ok(result)
    }
}

#[cfg(test)]
mod query_tests {
    use super::*;

    fn box_record(x: f64, y: f64, layer: u32) -> Vec<f64> {
        let mut record = vec![0.0; STRIDE];
        record[2] = x; record[3] = y; record[8] = 1.0; record[9] = 1.0;
        record[12] = 2.0; record[13] = 2.0; record[25] = 1.0; record[26] = 1.0;
        record[33] = layer as f64; record[42] = u32::MAX as f64;
        record
    }

    #[test]
    fn queries_return_sorted_masked_precise_hits() {
        let mut world = PhysicsWorld::new();
        world.create_body(20, 1, &box_record(5.0, 0.0, 1)).unwrap();
        world.create_body(10, 0, &box_record(2.0, 0.0, 0)).unwrap();
        let hits = world.raycast_all([0.0, 0.0], [1.0, 0.0], 10.0, u32::MAX);
        assert_eq!(hits.iter().map(|hit| hit.handle).collect::<Vec<_>>(), vec![10, 20]);
        assert!((hits[0].distance - 1.0).abs() < 1.0e-10);
        assert_eq!(world.raycast([0.0, 0.0], [1.0, 0.0], 10.0, 1 << 1).unwrap().handle, 20);
        assert_eq!(world.overlap_point([2.0, 0.0], 1), vec![10]);
        assert_eq!(world.overlap_circle([5.0, 0.0], 0.5, 1 << 1), vec![20]);
        assert_eq!(world.overlap_box([2.0, 0.0], [0.5, 0.5], 0.0, 1), vec![10]);
        let cast = world.shape_cast([0.0, 0.0], [0.5, 0.5], 0.0, [1.0, 0.0], 10.0, 1).unwrap();
        assert_eq!(cast.handle, 10);
        assert!((cast.distance - 0.75).abs() < 1.0e-6);
    }

    #[test]
    fn character_motion_uses_exact_units_and_excludes_its_own_collider() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &box_record(0.0, 0.0, 0)).unwrap();
        world.create_body(2, 1, &box_record(4.0, 0.0, 0)).unwrap();
        let moved = world.move_character_box(1, [2.0, 2.0], [10.0, 0.0], std::f64::consts::FRAC_PI_4, 0.0, 0.0, 4, 1.0e-5, 1).unwrap();
        assert!(moved.on_wall);
        assert!((moved.position[0] - 2.0).abs() < 1.0e-4);
        assert!((moved.applied_motion[0] - 2.0).abs() < 1.0e-4);
    }

    #[test]
    fn character_classifies_floor_ceiling_and_moving_platform_velocity() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &box_record(0.0, 0.0, 0)).unwrap();
        let mut floor = box_record(0.0, -3.0, 0);
        floor[4] = 2.5;
        world.create_body(2, 1, &floor).unwrap();
        world.create_body(3, 2, &box_record(0.0, 3.0, 0)).unwrap();
        let down = world.move_character_box(1, [2.0, 2.0], [0.0, -10.0], std::f64::consts::FRAC_PI_4, 0.0, 0.0, 4, 1.0e-5, 1).unwrap();
        assert!(down.on_floor && down.floor_normal[1] > 0.99);
        assert!((down.platform_velocity[0] - 2.5).abs() < 1.0e-10);
        world.set_transform(1, 0.0, 0.0, 0.0).unwrap();
        let up = world.move_character_box(1, [2.0, 2.0], [0.0, 10.0], std::f64::consts::FRAC_PI_4, 0.0, 0.0, 4, 1.0e-5, 1).unwrap();
        assert!(up.on_ceiling && up.ceiling_normal[1] < -0.99);
    }

    #[test]
    fn character_floor_snap_and_step_height_are_applied_in_world_units() {
        let mut snap_world = PhysicsWorld::new();
        snap_world.create_body(1, 0, &box_record(0.0, 0.2, 0)).unwrap();
        snap_world.create_body(2, 1, &box_record(0.0, -2.0, 0)).unwrap();
        let snapped = snap_world.move_character_box(1, [2.0, 2.0], [0.25, 0.0], std::f64::consts::FRAC_PI_4, 0.0, 0.5, 4, 1.0e-5, 1).unwrap();
        assert!(snapped.on_floor);
        assert!((snapped.position[1]).abs() < 1.0e-4);

        let mut step_world = PhysicsWorld::new();
        step_world.create_body(1, 0, &box_record(0.0, 0.0, 0)).unwrap();
        step_world.create_body(2, 1, &box_record(4.0, 0.0, 0)).unwrap();
        let stepped = step_world.move_character_box(1, [2.0, 2.0], [8.0, 0.0], std::f64::consts::FRAC_PI_4, 3.0, 0.0, 4, 1.0e-5, 1).unwrap();
        assert!(stepped.position[0] > 7.9);
        assert!((stepped.position[1] - 3.0).abs() < 1.0e-4);
    }

    #[test]
    fn character_accepts_a_rotated_surface_inside_the_slope_limit() {
        let mut world = PhysicsWorld::new();
        world.create_body(1, 0, &box_record(0.0, 4.0, 0)).unwrap();
        let mut slope = box_record(0.0, 0.0, 0);
        slope[12] = 10.0;
        slope[13] = 1.0;
        slope[14] = 0.25;
        for (index, (x, y)) in [(-5.0, -0.5), (5.0, -0.5), (5.0, 0.5), (-5.0, 0.5)].iter().enumerate() {
            slope[34 + index * 2] = *x;
            slope[35 + index * 2] = *y;
        }
        world.create_body(2, 1, &slope).unwrap();
        let result = world.move_character_box(1, [1.0, 2.0], [0.0, -8.0], 0.5, 0.0, 0.0, 4, 1.0e-5, 1).unwrap();
        assert!(result.on_floor);
        assert!(result.floor_normal[1] >= 0.5_f64.cos());
    }
}
