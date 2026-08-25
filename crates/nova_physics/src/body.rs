#[derive(Clone, Debug)]
enum Shape {
    Polygon { vertices: Vec<Vec2> },
    Ellipse { radius_x: f64, radius_y: f64 },
}

impl Shape {
    fn support(&self, position: Vec2, angle: f64, direction: Vec2) -> Vec2 {
        let direction = direction.normalized_or(Vec2::new(1.0, 0.0));
        match self {
            Self::Polygon { vertices } => {
                let local_direction = inverse_rotate(direction, angle);
                let mut best = vertices[0];
                let mut best_projection = best.dot(local_direction);
                for vertex in vertices.iter().skip(1) {
                    let projection = vertex.dot(local_direction);
                    if projection > best_projection {
                        best = *vertex;
                        best_projection = projection;
                    }
                }
                position.add(rotate(best, angle))
            }
            Self::Ellipse { radius_x, radius_y } => {
                let local_direction = inverse_rotate(direction, angle);
                let denominator =
                    (radius_x * local_direction.x).hypot(radius_y * local_direction.y);
                if denominator <= EPSILON {
                    return position;
                }
                let local_support = Vec2::new(
                    radius_x * radius_x * local_direction.x / denominator,
                    radius_y * radius_y * local_direction.y / denominator,
                );
                position.add(rotate(local_support, angle))
            }
        }
    }

    fn area(&self) -> f64 {
        match self {
            Self::Ellipse { radius_x, radius_y } => std::f64::consts::PI * radius_x * radius_y,
            Self::Polygon { vertices } => {
                let mut twice_area = 0.0;
                for index in 0..vertices.len() {
                    twice_area += vertices[index].cross(vertices[(index + 1) % vertices.len()]);
                }
                twice_area.abs() * 0.5
            }
        }
    }

    fn inertia(&self, mass: f64) -> f64 {
        match self {
            Self::Ellipse { radius_x, radius_y } => {
                mass * (radius_x * radius_x + radius_y * radius_y) * 0.25
            }
            Self::Polygon { vertices } => {
                let mut cross_sum = 0.0;
                let mut weighted_sum = 0.0;
                for index in 0..vertices.len() {
                    let a = vertices[index];
                    let b = vertices[(index + 1) % vertices.len()];
                    let cross = a.cross(b);
                    let term = a.dot(a) + a.dot(b) + b.dot(b);
                    cross_sum += cross;
                    weighted_sum += cross * term;
                }
                if cross_sum.abs() <= MIN_AREA {
                    mass
                } else {
                    (mass * weighted_sum / (6.0 * cross_sum)).abs()
                }
            }
        }
        .max(MIN_INERTIA)
    }

    fn characteristic_extent(&self) -> f64 {
        match self {
            Self::Ellipse { radius_x, radius_y } => radius_x.min(*radius_y),
            Self::Polygon { vertices } => {
                let mut minimum_edge = f64::INFINITY;
                for index in 0..vertices.len() {
                    let edge = vertices[(index + 1) % vertices.len()].sub(vertices[index]);
                    minimum_edge = minimum_edge.min(edge.length());
                }
                minimum_edge * 0.5
            }
        }
        .max(MIN_DIMENSION)
    }

    fn aabb(&self, position: Vec2, angle: f64) -> Aabb {
        match self {
            Self::Ellipse { radius_x, radius_y } => {
                let (sin, cos) = angle.sin_cos();
                let extent_x = (radius_x * cos).hypot(radius_y * sin);
                let extent_y = (radius_x * sin).hypot(radius_y * cos);
                Aabb {
                    min_x: position.x - extent_x,
                    max_x: position.x + extent_x,
                    min_y: position.y - extent_y,
                    max_y: position.y + extent_y,
                }
            }
            Self::Polygon { vertices } => {
                let mut aabb = Aabb {
                    min_x: f64::INFINITY,
                    max_x: f64::NEG_INFINITY,
                    min_y: f64::INFINITY,
                    max_y: f64::NEG_INFINITY,
                };
                for vertex in vertices {
                    let world = position.add(rotate(*vertex, angle));
                    aabb.min_x = aabb.min_x.min(world.x);
                    aabb.max_x = aabb.max_x.max(world.x);
                    aabb.min_y = aabb.min_y.min(world.y);
                    aabb.max_y = aabb.max_y.max(world.y);
                }
                aabb
            }
        }
    }
}

#[derive(Clone, Debug)]
struct Body {
    data_index: usize,
    shape: Shape,
    position: Vec2,
    velocity: Vec2,
    acceleration: Vec2,
    angle: f64,
    angular_velocity: f64,
    force: Vec2,
    torque: f64,
    mass: f64,
    inv_mass: f64,
    inertia: f64,
    inv_inertia: f64,
    gravity_scale: f64,
    local_gravity: f64,
    linear_damping: f64,
    angular_damping: f64,
    restitution: f64,
    restitution_threshold: f64,
    static_friction: f64,
    dynamic_friction: f64,
    friction_combine: u8,
    restitution_combine: u8,
    is_static: bool,
    is_kinematic: bool,
    is_sensor: bool,
    layer: u32,
    collision_mask: u32,
    collider_offset: Vec2,
    collider_angle_offset: f64,
    freeze_rotation: bool,
    continuous_collision: bool,
    sleeping_allowed: bool,
    sleeping: bool,
    sleep_timer: f64,
    one_way: bool,
    one_way_normal: Vec2,
}

impl Body {
    fn from_data(data: &[f64], data_index: usize) -> Self {
        // Shape codes are part of the stable editor/native ABI: 0 polygon/box,
        // 1 circle/ellipse, 2 capsule, and 3 finite segment.  Higher-level
        // chain and concave shapes remain query-only and are not submitted to
        // the dynamic solver by the editor.
        let shape_code = finite_or(data[data_index + 1], 0.0).round() as i32;
        let is_static = data[data_index + 9] > 0.5;
        let is_kinematic = !is_static && data[data_index + 24] > 0.5;
        let mass = positive(data[data_index + 8], 1.0);
        let scale_width = positive(data[data_index + 12].abs(), 1.0);
        let scale_height = positive(data[data_index + 13].abs(), 1.0);

        let shape = if shape_code == 1 {
            Shape::Ellipse {
                radius_x: scale_width,
                radius_y: scale_height,
            }
        } else if shape_code == 2 {
            // The current native shape representation is convex polygonal, so
            // capsules use a fixed-sample approximation.  A fixed sample count
            // keeps collision ordering and replays deterministic on every host.
            let width = scale_width.max(MIN_DIMENSION);
            let height = scale_height.max(MIN_DIMENSION);
            let radius = (width.min(height) * 0.5).max(MIN_DIMENSION * 0.5);
            let vertical = height >= width;
            let straight = ((if vertical { height } else { width }) * 0.5 - radius).max(0.0);
            let mut vertices = Vec::with_capacity(12);
            for sample in 0..12 {
                let angle = std::f64::consts::TAU * sample as f64 / 12.0;
                let direction = Vec2::new(angle.cos(), angle.sin());
                let center = if vertical {
                    Vec2::new(0.0, if direction.y >= 0.0 { straight } else { -straight })
                } else {
                    Vec2::new(if direction.x >= 0.0 { straight } else { -straight }, 0.0)
                };
                vertices.push(center.add(direction.mul(radius)));
            }
            Shape::Polygon { vertices: convex_hull(vertices) }
        } else if shape_code == 3 {
            // A zero-area mathematical segment cannot produce a stable contact
            // manifold.  Nova_A therefore models it as a finite, explicitly
            // sized segment whose minor axis is never below MIN_DIMENSION.
            let half_width = scale_width.max(MIN_DIMENSION) * 0.5;
            let half_height = scale_height.max(MIN_DIMENSION) * 0.5;
            Shape::Polygon { vertices: vec![
                Vec2::new(-half_width, -half_height),
                Vec2::new(half_width, -half_height),
                Vec2::new(half_width, half_height),
                Vec2::new(-half_width, half_height),
            ] }
        } else {
            let mut vertices = Vec::new();
            for vertex_index in 0..4 {
                let vertex = Vec2::new(
                    finite_or(data[data_index + 34 + vertex_index * 2], 0.0),
                    finite_or(data[data_index + 35 + vertex_index * 2], 0.0),
                );
                if !vertices.iter().any(|existing: &Vec2| {
                    existing.sub(vertex).length_squared() <= EPSILON * EPSILON
                }) {
                    vertices.push(vertex);
                }
            }
            let mut vertices = convex_hull(vertices);
            if vertices.len() < 3
                || (Shape::Polygon {
                    vertices: vertices.clone(),
                })
                .area()
                    <= MIN_AREA
            {
                let half_width = scale_width * 0.5;
                let half_height = scale_height * 0.5;
                vertices = vec![
                    Vec2::new(-half_width, -half_height),
                    Vec2::new(half_width, -half_height),
                    Vec2::new(half_width, half_height),
                    Vec2::new(-half_width, half_height),
                ];
            }
            Shape::Polygon { vertices }
        };

        let auto_inertia = data[data_index + 25] > 0.5;
        let collider_offset = Vec2::new(
            finite_or(data[data_index + 43], 0.0),
            finite_or(data[data_index + 44], 0.0),
        );
        let shape_inertia = shape.inertia(mass) + mass * collider_offset.length_squared();
        let inertia = if auto_inertia {
            shape_inertia
        } else {
            positive_with_minimum(data[data_index + 26], shape_inertia, MIN_INERTIA)
        };
        let movable = !is_static && !is_kinematic;
        let freeze_rotation = data[data_index + 46] > 0.5;

        let requested_sleep = data[data_index + 49] > 0.5;
        let externally_driven = Vec2::new(
            finite_or(data[data_index + 4], 0.0),
            finite_or(data[data_index + 5], 0.0),
        )
        .length_squared() > 1.0e-12
            || Vec2::new(
                finite_or(data[data_index + 6], 0.0),
                finite_or(data[data_index + 7], 0.0),
            )
            .length_squared() > 1.0e-12
            || Vec2::new(
                finite_or(data[data_index + 21], 0.0),
                finite_or(data[data_index + 22], 0.0),
            )
            .length_squared() > 1.0e-12
            || finite_or(data[data_index + 16], 0.0).abs() > 1.0e-12;
        Self {
            data_index,
            shape,
            position: Vec2::new(
                finite_or(data[data_index + 2], 0.0),
                finite_or(data[data_index + 3], 0.0),
            ),
            velocity: Vec2::new(
                finite_or(data[data_index + 4], 0.0),
                finite_or(data[data_index + 5], 0.0),
            ),
            acceleration: Vec2::new(
                finite_or(data[data_index + 6], 0.0),
                finite_or(data[data_index + 7], 0.0),
            ),
            angle: normalize_angle(data[data_index + 14]),
            angular_velocity: if freeze_rotation { 0.0 } else { finite_or(data[data_index + 15], 0.0) },
            force: Vec2::new(
                finite_or(data[data_index + 21], 0.0),
                finite_or(data[data_index + 22], 0.0),
            ),
            torque: finite_or(data[data_index + 16], 0.0),
            mass,
            inv_mass: if movable { 1.0 / mass } else { 0.0 },
            inertia,
            inv_inertia: if movable && !freeze_rotation { 1.0 / inertia } else { 0.0 },
            gravity_scale: finite_or(data[data_index + 17], 1.0),
            local_gravity: finite_or(data[data_index + 23], 0.0),
            linear_damping: non_negative(data[data_index + 18], 0.0),
            angular_damping: non_negative(data[data_index + 19], 0.0),
            restitution: unit_interval(data[data_index + 10]),
            restitution_threshold: non_negative(data[data_index + 27], 1.0),
            static_friction: non_negative(data[data_index + 20], 0.0),
            dynamic_friction: non_negative(data[data_index + 11], 0.0),
            friction_combine: finite_or(data[data_index + 54], 0.0).round().clamp(0.0, 3.0) as u8,
            restitution_combine: finite_or(data[data_index + 55], 3.0).round().clamp(0.0, 3.0) as u8,
            is_static,
            is_kinematic,
            is_sensor: data[data_index + 28] > 0.5,
            layer: finite_or(data[data_index + 33], 0.0).round().clamp(0.0, 31.0) as u32,
            collision_mask: finite_or(data[data_index + 42], 0.0)
                .round()
                .clamp(0.0, u32::MAX as f64) as u32,
            collider_offset,
            collider_angle_offset: normalize_angle(data[data_index + 45]),
            freeze_rotation,
            continuous_collision: data[data_index + 47] > 0.5,
            sleeping_allowed: data[data_index + 48] > 0.5,
            sleeping: requested_sleep && !externally_driven,
            sleep_timer: non_negative(data[data_index + 50], 0.0),
            one_way: data[data_index + 51] > 0.5,
            one_way_normal: Vec2::new(
                finite_or(data[data_index + 52], 0.0),
                finite_or(data[data_index + 53], 1.0),
            )
            .normalized_or(Vec2::new(0.0, 1.0)),
        }
    }

    fn collider_position(&self) -> Vec2 {
        self.position.add(rotate(self.collider_offset, self.angle))
    }

    fn collider_angle(&self) -> f64 {
        normalize_angle(self.angle + self.collider_angle_offset)
    }

    fn can_collide_with(&self, other: &Self) -> bool {
        (self.collision_mask & (1_u32 << other.layer)) != 0
            && (other.collision_mask & (1_u32 << self.layer)) != 0
    }

    fn accepts_one_way_contact(&self, other: &Self, normal_to_other: Vec2) -> bool {
        if !self.one_way {
            return true;
        }
        let allowed = rotate(self.one_way_normal, self.collider_angle())
            .normalized_or(Vec2::new(0.0, 1.0));
        let on_blocking_side = other
            .collider_position()
            .sub(self.collider_position())
            .dot(allowed)
            >= -POSITION_SLOP;
        let approaching_or_resting = other.velocity.sub(self.velocity).dot(allowed) <= 0.05;
        normal_to_other.dot(allowed) >= 0.5 && on_blocking_side && approaching_or_resting
    }

    fn integrate(&mut self, dt: f64, global_gravity: f64, air_friction: f64) {
        if self.is_static {
            return;
        }
        if self.sleeping {
            self.velocity = Vec2::ZERO;
            self.angular_velocity = 0.0;
            return;
        }

        if !self.is_kinematic {
            let acceleration = self
                .acceleration
                .add(self.force.mul(self.inv_mass))
                .add(Vec2::new(
                    0.0,
                    -(global_gravity + self.local_gravity) * self.gravity_scale,
                ));
            self.velocity = self.velocity.add(acceleration.mul(dt));
            self.angular_velocity += self.torque * self.inv_inertia * dt;

            let linear_decay = (-(self.linear_damping + air_friction) * dt).exp();
            let angular_decay = (-self.angular_damping * dt).exp();
            self.velocity = self.velocity.mul(linear_decay);
            self.angular_velocity *= angular_decay;
        }

        let previous_position = self.position;
        self.position = self
            .position
            .add(self.velocity.mul(dt))
            .finite_or(previous_position);
        self.velocity = self.velocity.finite_or(Vec2::ZERO);
        self.angle = if self.freeze_rotation {
            self.angular_velocity = 0.0;
            self.angle
        } else {
            normalize_angle(self.angle + self.angular_velocity * dt)
        };
        self.angular_velocity = finite_or(self.angular_velocity, 0.0);
    }

    fn point_velocity(&self, radius: Vec2) -> Vec2 {
        if self.is_static {
            Vec2::ZERO
        } else {
            self.velocity.add(Vec2::new(
                -self.angular_velocity * radius.y,
                self.angular_velocity * radius.x,
            ))
        }
    }

    fn apply_impulse(&mut self, impulse: Vec2, radius: Vec2) {
        if self.inv_mass <= 0.0 {
            return;
        }
        self.velocity = self.velocity.add(impulse.mul(self.inv_mass));
        self.angular_velocity += radius.cross(impulse) * self.inv_inertia;
        if impulse.length_squared() > 1.0e-16 {
            self.sleeping = false;
            self.sleep_timer = 0.0;
        }
    }

    fn update_sleep_state(
        &mut self,
        dt: f64,
        _has_contact: bool,
        linear_threshold: f64,
        angular_threshold: f64,
        time_to_sleep: f64,
    ) {
        if !self.sleeping_allowed || self.is_static || self.is_kinematic {
            self.sleeping = false;
            self.sleep_timer = 0.0;
            return;
        }
        let linear_threshold = non_negative(linear_threshold, 1.0e-3);
        let angular_threshold = non_negative(angular_threshold, 1.0e-3);
        let time_to_sleep = non_negative(time_to_sleep, 0.5);
        let slow = self.velocity.length_squared() <= linear_threshold * linear_threshold
            && self.angular_velocity.abs() <= angular_threshold;
        if slow {
            self.sleep_timer += dt;
            if self.sleep_timer >= time_to_sleep {
                self.sleeping = true;
                self.velocity = Vec2::ZERO;
                self.angular_velocity = 0.0;
            }
        } else {
            self.sleeping = false;
            self.sleep_timer = 0.0;
        }
    }
}

