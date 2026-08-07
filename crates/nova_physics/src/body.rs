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
    is_static: bool,
    is_kinematic: bool,
    is_sensor: bool,
    layer: i64,
}

impl Body {
    fn from_data(data: &[f64], data_index: usize) -> Self {
        let is_ellipse = finite_or(data[data_index + 1], 0.0).round() == 1.0;
        let is_static = data[data_index + 9] > 0.5;
        let is_kinematic = !is_static && data[data_index + 24] > 0.5;
        let mass = positive(data[data_index + 8], 1.0);
        let scale_width = positive(data[data_index + 12].abs(), 1.0);
        let scale_height = positive(data[data_index + 13].abs(), 1.0);

        let shape = if is_ellipse {
            Shape::Ellipse {
                radius_x: scale_width,
                radius_y: scale_height,
            }
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
        let inertia = if auto_inertia {
            shape.inertia(mass)
        } else {
            positive_with_minimum(data[data_index + 26], shape.inertia(mass), MIN_INERTIA)
        };
        let movable = !is_static && !is_kinematic;

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
            angular_velocity: finite_or(data[data_index + 15], 0.0),
            force: Vec2::new(
                finite_or(data[data_index + 21], 0.0),
                finite_or(data[data_index + 22], 0.0),
            ),
            torque: finite_or(data[data_index + 16], 0.0),
            mass,
            inv_mass: if movable { 1.0 / mass } else { 0.0 },
            inertia,
            inv_inertia: if movable { 1.0 / inertia } else { 0.0 },
            gravity_scale: finite_or(data[data_index + 17], 1.0),
            local_gravity: finite_or(data[data_index + 23], 0.0),
            linear_damping: non_negative(data[data_index + 18], 0.0),
            angular_damping: non_negative(data[data_index + 19], 0.0),
            restitution: unit_interval(data[data_index + 10]),
            restitution_threshold: non_negative(data[data_index + 27], 1.0),
            static_friction: non_negative(data[data_index + 20], 0.0),
            dynamic_friction: non_negative(data[data_index + 11], 0.0),
            is_static,
            is_kinematic,
            is_sensor: data[data_index + 28] > 0.5,
            layer: finite_or(data[data_index + 33], 1.0).round() as i64,
        }
    }

    fn integrate(&mut self, dt: f64, global_gravity: f64, air_friction: f64) {
        if self.is_static {
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
        self.angle = normalize_angle(self.angle + self.angular_velocity * dt);
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
    }
}

