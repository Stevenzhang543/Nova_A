use std::collections::HashSet;
use wasm_bindgen::prelude::*;

const STRIDE: usize = 42;
const ROPE_NODE_CAPACITY: usize = 32;
const ROPE_NODE_DATA_OFFSET: usize = 29;
const CONNECTION_STRIDE: usize = ROPE_NODE_DATA_OFFSET + ROPE_NODE_CAPACITY * 4;
const EPSILON: f64 = 1.0e-14;
const MAX_MAGNITUDE: f64 = 1.0e50;
const MIN_DIMENSION: f64 = 1.0e-6;
const MIN_AREA: f64 = 1.0e-18;
const MIN_INERTIA: f64 = 1.0e-24;
const BASE_SUB_STEPS: usize = 8;
const MAX_SUB_STEPS: usize = 128;
const SOLVER_ITERATIONS: usize = 20;
const POSITION_SLOP: f64 = 1.0e-12;
const POSITION_CORRECTION: f64 = 0.75;
const STANDARD_GRAVITY: f64 = 9.80665;

#[derive(Clone, Copy, Debug, Default)]
struct Vec2 {
    x: f64,
    y: f64,
}

impl Vec2 {
    const ZERO: Self = Self { x: 0.0, y: 0.0 };

    fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    fn add(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y)
    }

    fn sub(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y)
    }

    fn mul(self, scalar: f64) -> Self {
        Self::new(self.x * scalar, self.y * scalar)
    }

    fn neg(self) -> Self {
        Self::new(-self.x, -self.y)
    }

    fn dot(self, other: Self) -> f64 {
        self.x * other.x + self.y * other.y
    }

    fn cross(self, other: Self) -> f64 {
        self.x * other.y - self.y * other.x
    }

    fn length_squared(self) -> f64 {
        self.dot(self)
    }

    fn length(self) -> f64 {
        self.x.hypot(self.y)
    }

    fn perp(self) -> Self {
        Self::new(-self.y, self.x)
    }

    fn normalized_or(self, fallback: Self) -> Self {
        let length = self.length();
        if length > EPSILON {
            self.mul(1.0 / length)
        } else {
            fallback
        }
    }

    fn finite_or(self, fallback: Self) -> Self {
        Self::new(finite_or(self.x, fallback.x), finite_or(self.y, fallback.y))
    }
}

fn finite_or(value: f64, fallback: f64) -> f64 {
    if value.is_finite() {
        value.clamp(-MAX_MAGNITUDE, MAX_MAGNITUDE)
    } else {
        fallback
    }
}

fn non_negative(value: f64, fallback: f64) -> f64 {
    finite_or(value, fallback).max(0.0)
}

fn positive(value: f64, fallback: f64) -> f64 {
    let value = finite_or(value, fallback);
    if value >= MIN_DIMENSION {
        value
    } else {
        fallback.max(MIN_DIMENSION)
    }
}

fn positive_with_minimum(value: f64, fallback: f64, minimum: f64) -> f64 {
    let value = finite_or(value, fallback);
    if value >= minimum {
        value
    } else {
        fallback.max(minimum)
    }
}

fn unit_interval(value: f64) -> f64 {
    finite_or(value, 0.0).clamp(0.0, 1.0)
}

fn normalize_angle(angle: f64) -> f64 {
    let angle = finite_or(angle, 0.0);
    (angle + std::f64::consts::PI).rem_euclid(std::f64::consts::TAU) - std::f64::consts::PI
}

fn rotate(vector: Vec2, angle: f64) -> Vec2 {
    let (sin, cos) = angle.sin_cos();
    Vec2::new(
        vector.x * cos - vector.y * sin,
        vector.x * sin + vector.y * cos,
    )
}

fn inverse_rotate(vector: Vec2, angle: f64) -> Vec2 {
    rotate(vector, -angle)
}

fn triple_product(a: Vec2, b: Vec2, c: Vec2) -> Vec2 {
    b.mul(a.dot(c)).sub(a.mul(b.dot(c)))
}

fn convex_hull(mut points: Vec<Vec2>) -> Vec<Vec2> {
    points.retain(|point| point.x.is_finite() && point.y.is_finite());
    points.sort_by(|a, b| a.x.total_cmp(&b.x).then(a.y.total_cmp(&b.y)));
    points.dedup_by(|a, b| a.sub(*b).length_squared() <= EPSILON * EPSILON);

    if points.len() <= 2 {
        return points;
    }

    let mut lower: Vec<Vec2> = Vec::new();
    for point in &points {
        while lower.len() >= 2 {
            let last = lower[lower.len() - 1];
            let previous = lower[lower.len() - 2];
            if last.sub(previous).cross((*point).sub(last)) > 0.0 {
                break;
            }
            lower.pop();
        }
        lower.push(*point);
    }

    let mut upper: Vec<Vec2> = Vec::new();
    for point in points.iter().rev() {
        while upper.len() >= 2 {
            let last = upper[upper.len() - 1];
            let previous = upper[upper.len() - 2];
            if last.sub(previous).cross((*point).sub(last)) > 0.0 {
                break;
            }
            upper.pop();
        }
        upper.push(*point);
    }

    lower.pop();
    upper.pop();
    lower.extend(upper);
    lower
}

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

#[derive(Clone, Copy, Debug)]
struct Aabb {
    min_x: f64,
    max_x: f64,
    min_y: f64,
    max_y: f64,
}

impl Aabb {
    fn overlaps(self, other: Self) -> bool {
        self.min_x <= other.max_x
            && self.max_x >= other.min_x
            && self.min_y <= other.max_y
            && self.max_y >= other.min_y
    }
}

#[derive(Clone, Copy, Debug)]
struct SupportPoint {
    point: Vec2,
    point_a: Vec2,
    point_b: Vec2,
}

fn minkowski_support(body_a: &Body, body_b: &Body, direction: Vec2) -> SupportPoint {
    let direction = direction.normalized_or(Vec2::new(1.0, 0.0));
    let point_a = body_a
        .shape
        .support(body_a.position, body_a.angle, direction);
    let point_b = body_b
        .shape
        .support(body_b.position, body_b.angle, direction.neg());
    SupportPoint {
        point: point_a.sub(point_b),
        point_a,
        point_b,
    }
}

fn handle_simplex(simplex: &mut Vec<SupportPoint>, direction: &mut Vec2) -> bool {
    let a = simplex[simplex.len() - 1];
    let ao = a.point.neg();

    if simplex.len() == 2 {
        let b = simplex[0];
        let ab = b.point.sub(a.point);
        if ab.dot(ao) > 0.0 {
            let mut next_direction = triple_product(ab, ao, ab);
            if next_direction.length_squared() <= EPSILON * EPSILON {
                next_direction = ab.perp();
                if next_direction.dot(ao) < 0.0 {
                    next_direction = next_direction.neg();
                }
            }
            *direction = next_direction;
        } else {
            simplex.clear();
            simplex.push(a);
            *direction = ao.normalized_or(Vec2::new(1.0, 0.0));
        }
        return false;
    }

    let b = simplex[1];
    let c = simplex[0];
    let ab = b.point.sub(a.point);
    let ac = c.point.sub(a.point);

    let ab_outside = triple_product(ac, ab, ab);
    if ab_outside.dot(ao) > 0.0 {
        simplex.remove(0);
        *direction = ab_outside;
        return false;
    }

    let ac_outside = triple_product(ab, ac, ac);
    if ac_outside.dot(ao) > 0.0 {
        simplex.remove(1);
        *direction = ac_outside;
        return false;
    }

    true
}

fn gjk(body_a: &Body, body_b: &Body) -> Option<Vec<SupportPoint>> {
    let mut direction = body_b
        .position
        .sub(body_a.position)
        .normalized_or(Vec2::new(1.0, 0.0));
    let first = minkowski_support(body_a, body_b, direction);
    let mut simplex = vec![first];
    direction = first.point.neg().normalized_or(Vec2::new(0.0, 1.0));

    for _ in 0..48 {
        let point = minkowski_support(body_a, body_b, direction);
        if point.point.dot(direction) <= 0.0 {
            return None;
        }
        if simplex
            .iter()
            .any(|existing| existing.point.sub(point.point).length_squared() <= EPSILON * EPSILON)
        {
            return None;
        }
        simplex.push(point);
        if handle_simplex(&mut simplex, &mut direction) {
            return Some(simplex);
        }
    }

    None
}

#[derive(Clone, Copy, Debug)]
struct Manifold {
    normal: Vec2,
    depth: f64,
    point: Vec2,
}

fn manifold_from_edge(
    edge_start: SupportPoint,
    edge_end: SupportPoint,
    normal: Vec2,
    depth: f64,
    center_direction: Vec2,
) -> Manifold {
    let edge = edge_end.point.sub(edge_start.point);
    let denominator = edge.length_squared();
    let interpolation = if denominator > EPSILON * EPSILON {
        (-edge_start.point.dot(edge) / denominator).clamp(0.0, 1.0)
    } else {
        0.0
    };
    let point_a = edge_start
        .point_a
        .add(edge_end.point_a.sub(edge_start.point_a).mul(interpolation));
    let point_b = edge_start
        .point_b
        .add(edge_end.point_b.sub(edge_start.point_b).mul(interpolation));
    let mut normal = normal;
    if normal.dot(center_direction) < 0.0 {
        normal = normal.neg();
    }
    Manifold {
        normal,
        depth: non_negative(depth, 0.0),
        point: point_a.add(point_b).mul(0.5),
    }
}

fn epa(body_a: &Body, body_b: &Body, mut polytope: Vec<SupportPoint>) -> Option<Manifold> {
    if polytope.len() != 3 {
        return None;
    }
    if polytope[1]
        .point
        .sub(polytope[0].point)
        .cross(polytope[2].point.sub(polytope[0].point))
        < 0.0
    {
        polytope.swap(1, 2);
    }

    let center_direction = body_b.position.sub(body_a.position);
    let tolerance = body_a
        .shape
        .characteristic_extent()
        .min(body_b.shape.characteristic_extent())
        * 1.0e-9;
    let mut best_edge = None;

    for _ in 0..96 {
        let mut minimum_distance = f64::INFINITY;
        let mut minimum_normal = Vec2::new(1.0, 0.0);
        let mut minimum_index = 0;

        for index in 0..polytope.len() {
            let next = (index + 1) % polytope.len();
            let edge = polytope[next].point.sub(polytope[index].point);
            let mut normal = Vec2::new(edge.y, -edge.x).normalized_or(Vec2::new(1.0, 0.0));
            let mut distance = normal.dot(polytope[index].point);
            if distance < 0.0 {
                normal = normal.neg();
                distance = -distance;
            }
            if distance < minimum_distance {
                minimum_distance = distance;
                minimum_normal = normal;
                minimum_index = index;
            }
        }

        let next_index = (minimum_index + 1) % polytope.len();
        best_edge = Some((
            polytope[minimum_index],
            polytope[next_index],
            minimum_normal,
            minimum_distance,
        ));
        let support = minkowski_support(body_a, body_b, minimum_normal);
        let support_distance = minimum_normal.dot(support.point);

        if support_distance - minimum_distance <= tolerance
            || polytope.iter().any(|existing| {
                existing.point.sub(support.point).length_squared() <= EPSILON * EPSILON
            })
        {
            return Some(manifold_from_edge(
                polytope[minimum_index],
                polytope[next_index],
                minimum_normal,
                minimum_distance,
                center_direction,
            ));
        }

        polytope.insert(next_index, support);
    }

    best_edge.map(|(start, end, normal, depth)| {
        manifold_from_edge(start, end, normal, depth, center_direction)
    })
}

fn collide_gjk(body_a: &Body, body_b: &Body) -> Option<Manifold> {
    let simplex = gjk(body_a, body_b)?;
    let manifold = epa(body_a, body_b, simplex)?;
    if manifold.depth.is_finite() && manifold.depth > 0.0 {
        Some(manifold)
    } else {
        None
    }
}

fn world_polygon_vertices(body: &Body) -> Option<Vec<Vec2>> {
    let Shape::Polygon { vertices } = &body.shape else {
        return None;
    };
    Some(
        vertices
            .iter()
            .map(|vertex| body.position.add(rotate(*vertex, body.angle)))
            .collect(),
    )
}

fn project_polygon(vertices: &[Vec2], axis: Vec2) -> (f64, f64) {
    let mut minimum = vertices[0].dot(axis);
    let mut maximum = minimum;
    for vertex in vertices.iter().skip(1) {
        let projection = vertex.dot(axis);
        minimum = minimum.min(projection);
        maximum = maximum.max(projection);
    }
    (minimum, maximum)
}

fn outward_edge_normal(vertices: &[Vec2], index: usize) -> Vec2 {
    let edge = vertices[(index + 1) % vertices.len()].sub(vertices[index]);
    Vec2::new(edge.y, -edge.x).normalized_or(Vec2::new(1.0, 0.0))
}

fn clip_segment_to_plane(points: &[Vec2], normal: Vec2, offset: f64) -> Vec<Vec2> {
    if points.len() < 2 {
        return Vec::new();
    }
    let first_distance = points[0].dot(normal) - offset;
    let second_distance = points[1].dot(normal) - offset;
    let mut clipped = Vec::with_capacity(2);
    if first_distance <= 0.0 {
        clipped.push(points[0]);
    }
    if second_distance <= 0.0 {
        clipped.push(points[1]);
    }
    if first_distance * second_distance < 0.0 {
        let interpolation = first_distance / (first_distance - second_distance);
        clipped.push(points[0].add(points[1].sub(points[0]).mul(interpolation)));
    }
    clipped.truncate(2);
    clipped
}

fn polygon_manifolds(body_a: &Body, body_b: &Body) -> Option<Vec<Manifold>> {
    let vertices_a = world_polygon_vertices(body_a)?;
    let vertices_b = world_polygon_vertices(body_b)?;
    let center_direction = body_b.position.sub(body_a.position);
    let mut minimum_overlap = f64::INFINITY;
    let mut collision_normal = Vec2::new(1.0, 0.0);
    let mut reference_is_a = true;

    for (vertices, from_a) in [(&vertices_a, true), (&vertices_b, false)] {
        for edge_index in 0..vertices.len() {
            let mut axis = outward_edge_normal(vertices, edge_index);
            let (minimum_a, maximum_a) = project_polygon(&vertices_a, axis);
            let (minimum_b, maximum_b) = project_polygon(&vertices_b, axis);
            let overlap = maximum_a.min(maximum_b) - minimum_a.max(minimum_b);
            if overlap <= 0.0 {
                return None;
            }
            if axis.dot(center_direction) < 0.0 {
                axis = axis.neg();
            }
            if overlap < minimum_overlap {
                minimum_overlap = overlap;
                collision_normal = axis;
                reference_is_a = from_a;
            }
        }
    }

    let (reference_vertices, incident_vertices, reference_normal) = if reference_is_a {
        (&vertices_a, &vertices_b, collision_normal)
    } else {
        (&vertices_b, &vertices_a, collision_normal.neg())
    };

    let reference_edge_index = (0..reference_vertices.len()).max_by(|left, right| {
        outward_edge_normal(reference_vertices, *left)
            .dot(reference_normal)
            .total_cmp(&outward_edge_normal(reference_vertices, *right).dot(reference_normal))
    })?;
    let incident_edge_index = (0..incident_vertices.len()).min_by(|left, right| {
        outward_edge_normal(incident_vertices, *left)
            .dot(reference_normal)
            .total_cmp(&outward_edge_normal(incident_vertices, *right).dot(reference_normal))
    })?;

    let reference_start = reference_vertices[reference_edge_index];
    let reference_end = reference_vertices[(reference_edge_index + 1) % reference_vertices.len()];
    let tangent = reference_end
        .sub(reference_start)
        .normalized_or(reference_normal.perp());
    let incident_segment = [
        incident_vertices[incident_edge_index],
        incident_vertices[(incident_edge_index + 1) % incident_vertices.len()],
    ];

    let clipped_to_start = clip_segment_to_plane(
        &incident_segment,
        tangent.neg(),
        -tangent.dot(reference_start),
    );
    let clipped = clip_segment_to_plane(&clipped_to_start, tangent, tangent.dot(reference_end));
    let reference_offset = reference_normal.dot(reference_start);
    let mut manifolds = Vec::with_capacity(2);
    for point in clipped {
        let separation = point.dot(reference_normal) - reference_offset;
        if separation <= 0.0 {
            manifolds.push(Manifold {
                normal: collision_normal,
                depth: (-separation).min(minimum_overlap),
                point: point.sub(reference_normal.mul(separation * 0.5)),
            });
        }
    }

    if manifolds.is_empty() {
        None
    } else {
        Some(manifolds)
    }
}

fn collide(body_a: &Body, body_b: &Body) -> Vec<Manifold> {
    if let Some(manifolds) = polygon_manifolds(body_a, body_b) {
        return manifolds;
    }
    collide_gjk(body_a, body_b).into_iter().collect()
}

#[derive(Clone, Debug)]
struct Contact {
    body_a: usize,
    body_b: usize,
    normal: Vec2,
    tangent: Vec2,
    depth: f64,
    radius_a: Vec2,
    radius_b: Vec2,
    restitution_bias: f64,
    static_friction: f64,
    dynamic_friction: f64,
    normal_impulse: f64,
    tangent_impulse: f64,
    is_sensor: bool,
    position_weight: f64,
}

fn two_bodies_mut(bodies: &mut [Body], a: usize, b: usize) -> (&mut Body, &mut Body) {
    debug_assert_ne!(a, b);
    if a < b {
        let (left, right) = bodies.split_at_mut(b);
        (&mut left[a], &mut right[0])
    } else {
        let (left, right) = bodies.split_at_mut(a);
        (&mut right[0], &mut left[b])
    }
}

fn apply_pair_impulse(
    bodies: &mut [Body],
    body_a: usize,
    body_b: usize,
    impulse: Vec2,
    radius_a: Vec2,
    radius_b: Vec2,
) {
    let (a, b) = two_bodies_mut(bodies, body_a, body_b);
    a.apply_impulse(impulse.neg(), radius_a);
    b.apply_impulse(impulse, radius_b);
}

fn solve_contact_velocity(bodies: &mut [Body], contact: &mut Contact) {
    if contact.is_sensor {
        return;
    }

    let (normal_mass, relative_normal_velocity) = {
        let a = &bodies[contact.body_a];
        let b = &bodies[contact.body_b];
        let relative_velocity = b
            .point_velocity(contact.radius_b)
            .sub(a.point_velocity(contact.radius_a));
        let cross_a = contact.radius_a.cross(contact.normal);
        let cross_b = contact.radius_b.cross(contact.normal);
        let denominator = a.inv_mass
            + b.inv_mass
            + cross_a * cross_a * a.inv_inertia
            + cross_b * cross_b * b.inv_inertia;
        (denominator, relative_velocity.dot(contact.normal))
    };

    if normal_mass > 0.0 {
        let impulse_delta = -(relative_normal_velocity - contact.restitution_bias) / normal_mass;
        let previous_impulse = contact.normal_impulse;
        contact.normal_impulse = (previous_impulse + impulse_delta).max(0.0);
        let applied_delta = contact.normal_impulse - previous_impulse;
        if applied_delta != 0.0 {
            apply_pair_impulse(
                bodies,
                contact.body_a,
                contact.body_b,
                contact.normal.mul(applied_delta),
                contact.radius_a,
                contact.radius_b,
            );
        }
    }

    let (tangent_mass, relative_tangent_velocity) = {
        let a = &bodies[contact.body_a];
        let b = &bodies[contact.body_b];
        let relative_velocity = b
            .point_velocity(contact.radius_b)
            .sub(a.point_velocity(contact.radius_a));
        let cross_a = contact.radius_a.cross(contact.tangent);
        let cross_b = contact.radius_b.cross(contact.tangent);
        let denominator = a.inv_mass
            + b.inv_mass
            + cross_a * cross_a * a.inv_inertia
            + cross_b * cross_b * b.inv_inertia;
        (denominator, relative_velocity.dot(contact.tangent))
    };

    if tangent_mass <= 0.0 || contact.normal_impulse <= 0.0 {
        return;
    }

    let tangent_delta = -relative_tangent_velocity / tangent_mass;
    let candidate = contact.tangent_impulse + tangent_delta;
    let static_limit = contact.static_friction * contact.normal_impulse;
    let dynamic_limit = contact.dynamic_friction * contact.normal_impulse;
    let new_tangent_impulse = if candidate.abs() <= static_limit {
        candidate
    } else {
        candidate.clamp(-dynamic_limit, dynamic_limit)
    };
    let applied_delta = new_tangent_impulse - contact.tangent_impulse;
    contact.tangent_impulse = new_tangent_impulse;
    if applied_delta != 0.0 {
        apply_pair_impulse(
            bodies,
            contact.body_a,
            contact.body_b,
            contact.tangent.mul(applied_delta),
            contact.radius_a,
            contact.radius_b,
        );
    }
}

fn correct_contact_position(bodies: &mut [Body], contact: &Contact) {
    if contact.is_sensor {
        return;
    }
    let inv_mass_sum = bodies[contact.body_a].inv_mass + bodies[contact.body_b].inv_mass;
    if inv_mass_sum <= 0.0 {
        return;
    }
    let correction_magnitude =
        ((contact.depth - POSITION_SLOP).max(0.0) * POSITION_CORRECTION * contact.position_weight)
            / inv_mass_sum;
    let correction = contact.normal.mul(correction_magnitude);
    let (a, b) = two_bodies_mut(bodies, contact.body_a, contact.body_b);
    a.position = a
        .position
        .sub(correction.mul(a.inv_mass))
        .finite_or(a.position);
    b.position = b
        .position
        .add(correction.mul(b.inv_mass))
        .finite_or(b.position);
}

#[derive(Clone, Debug)]
struct ConnectionConstraint {
    data_index: usize,
    body_a: usize,
    body_b: usize,
    local_anchor_a: Vec2,
    local_anchor_b: Vec2,
    rest_length: f64,
    stretchable: bool,
    bendable: bool,
    stiffness: f64,
    damping: f64,
    max_stretch_ratio: f64,
    bending_tolerance_mass: f64,
    stretching_tolerance_mass: f64,
    bend_amount: f64,
    collision_enabled: bool,
    collision_radius: f64,
    linear_density: f64,
    rope_nodes: Vec<RopeNode>,
    break_link: Option<usize>,
    link_tensions: Vec<f64>,
    binding: bool,
    bind_angle: f64,
    bind_offset: Vec2,
    active: bool,
    broken_code: u8,
    tension: f64,
    strain: f64,
}

#[derive(Clone, Copy, Debug)]
struct RopeNode {
    position: Vec2,
    velocity: Vec2,
}

impl ConnectionConstraint {
    fn from_data(data: &[f64], data_index: usize, body_count: usize) -> Option<Self> {
        let body_a = non_negative(data[data_index + 1], 0.0).round() as usize;
        let body_b = non_negative(data[data_index + 2], 0.0).round() as usize;
        if body_a >= body_count || body_b >= body_count || body_a == body_b {
            return None;
        }
        let rope_node_count = non_negative(data[data_index + 27], 0.0)
            .round()
            .min(ROPE_NODE_CAPACITY as f64) as usize;
        let rope_nodes = (0..rope_node_count)
            .map(|node_index| {
                let offset = data_index + ROPE_NODE_DATA_OFFSET + node_index * 4;
                RopeNode {
                    position: Vec2::new(
                        finite_or(data[offset], 0.0),
                        finite_or(data[offset + 1], 0.0),
                    ),
                    velocity: Vec2::new(
                        finite_or(data[offset + 2], 0.0),
                        finite_or(data[offset + 3], 0.0),
                    ),
                }
            })
            .collect();
        let link_count = rope_node_count + 1;
        let broken_code = non_negative(data[data_index + 17], 0.0)
            .round()
            .clamp(0.0, 2.0) as u8;
        let raw_break_link = finite_or(data[data_index + 28], -1.0).round() as isize;
        let break_link =
            if broken_code != 0 && raw_break_link >= 0 && (raw_break_link as usize) < link_count {
                Some(raw_break_link as usize)
            } else {
                None
            };
        Some(Self {
            data_index,
            body_a,
            body_b,
            local_anchor_a: Vec2::new(
                finite_or(data[data_index + 3], 0.0),
                finite_or(data[data_index + 4], 0.0),
            ),
            local_anchor_b: Vec2::new(
                finite_or(data[data_index + 5], 0.0),
                finite_or(data[data_index + 6], 0.0),
            ),
            rest_length: positive(data[data_index + 7], 1.0),
            stretchable: data[data_index + 8] > 0.5,
            bendable: data[data_index + 9] > 0.5,
            stiffness: non_negative(data[data_index + 10], 1200.0).min(1.0e12),
            damping: non_negative(data[data_index + 11], 35.0).min(1.0e9),
            max_stretch_ratio: positive(data[data_index + 12], 1.25).max(1.0),
            bending_tolerance_mass: non_negative(data[data_index + 13], 1.0e12),
            stretching_tolerance_mass: non_negative(data[data_index + 14], 1.0e12),
            bend_amount: non_negative(data[data_index + 15], 0.0),
            collision_enabled: data[data_index + 24] > 0.5 && rope_node_count > 0,
            collision_radius: positive(data[data_index + 25], 0.2).min(1.0e6),
            linear_density: positive(data[data_index + 26], 0.08),
            rope_nodes,
            break_link,
            link_tensions: vec![0.0; link_count],
            binding: data[data_index + 20] > 0.5,
            bind_angle: normalize_angle(data[data_index + 21]),
            bind_offset: Vec2::new(
                finite_or(data[data_index + 22], 0.0),
                finite_or(data[data_index + 23], 0.0),
            ),
            active: data[data_index + 16] > 0.5,
            broken_code,
            tension: 0.0,
            strain: 0.0,
        })
    }

    fn geometry(&self, bodies: &[Body]) -> (Vec2, Vec2, Vec2, f64, Vec2) {
        let a = &bodies[self.body_a];
        let b = &bodies[self.body_b];
        let radius_a = rotate(self.local_anchor_a, a.angle);
        let radius_b = rotate(self.local_anchor_b, b.angle);
        let point_a = a.position.add(radius_a);
        let point_b = b.position.add(radius_b);
        let delta = point_b.sub(point_a);
        let length = delta.length();
        let normal = delta.normalized_or(Vec2::new(1.0, 0.0));
        (radius_a, radius_b, normal, length, delta)
    }

    fn link_lengths(&self, bodies: &[Body], physical_rope: bool) -> Vec<f64> {
        if !physical_rope {
            return vec![self.geometry(bodies).3];
        }
        (0..rope_point_count(self) - 1)
            .map(|point| {
                rope_point_position(self, bodies, point + 1)
                    .sub(rope_point_position(self, bodies, point))
                    .length()
            })
            .collect()
    }

    fn strongest_stretch(&self) -> (usize, f64) {
        self.link_tensions
            .iter()
            .copied()
            .enumerate()
            .max_by(|a, b| a.1.total_cmp(&b.1))
            .unwrap_or((0, self.tension))
    }

    fn strongest_bend(&self, bodies: &[Body], physical_rope: bool) -> (usize, f64) {
        if !physical_rope {
            return (0, self.tension * self.bend_amount);
        }
        let positions: Vec<Vec2> = (0..rope_point_count(self))
            .map(|point| rope_point_position(self, bodies, point))
            .collect();
        let mut strongest = (0, 0.0);
        for point in 1..positions.len() - 1 {
            let incoming = positions[point]
                .sub(positions[point - 1])
                .normalized_or(Vec2::new(1.0, 0.0));
            let outgoing = positions[point + 1]
                .sub(positions[point])
                .normalized_or(incoming);
            let turn_sine_half = ((1.0 - incoming.dot(outgoing)).max(0.0) * 0.5).sqrt();
            let left_tension = self.link_tensions.get(point - 1).copied().unwrap_or(0.0);
            let right_tension = self.link_tensions.get(point).copied().unwrap_or(0.0);
            let force = 2.0 * left_tension.min(right_tension) * turn_sine_half;
            if force > strongest.1 {
                strongest = (
                    if left_tension >= right_tension {
                        point - 1
                    } else {
                        point
                    },
                    force,
                );
            }
        }
        strongest
    }

    fn break_at_stretch(
        &mut self,
        physical_rope: bool,
        link_lengths: &[f64],
        stretch_link: usize,
        stretch_force: f64,
    ) {
        self.broken_code = 2;
        let longest_link = link_lengths
            .iter()
            .copied()
            .enumerate()
            .max_by(|a, b| a.1.total_cmp(&b.1))
            .map(|entry| entry.0)
            .unwrap_or(stretch_link);
        self.break_link = physical_rope.then_some(if stretch_force > 0.0 {
            stretch_link
        } else {
            longest_link
        });
    }

    fn evaluate_failure(&mut self, bodies: &[Body]) {
        if !self.active || self.broken_code != 0 || self.binding {
            return;
        }
        let physical_rope = self.collision_enabled && !self.rope_nodes.is_empty();
        let link_lengths = self.link_lengths(bodies, physical_rope);
        let length: f64 = link_lengths.iter().sum();
        self.strain = ((length / self.rest_length) - 1.0).max(0.0);
        let (stretch_link, stretch_force) = self.strongest_stretch();
        let stretch_load_ratio = load_ratio(stretch_force, self.stretching_tolerance_mass);
        let stretch_geometry_ratio = length / self.rest_length / self.max_stretch_ratio;
        let (bend_link, bend_force) = self.strongest_bend(bodies, physical_rope);
        let bend_load_ratio = load_ratio(bend_force, self.bending_tolerance_mass);

        let should_tear = stretch_geometry_ratio > 1.0 || stretch_load_ratio > 1.0;
        let should_snap = bend_load_ratio > 1.0;
        if should_snap
            && (!should_tear || bend_load_ratio >= stretch_load_ratio.max(stretch_geometry_ratio))
        {
            self.broken_code = 1;
            self.break_link = physical_rope.then_some(bend_link);
        } else if should_tear {
            self.break_at_stretch(physical_rope, &link_lengths, stretch_link, stretch_force);
        }
        if self.broken_code != 0 && !physical_rope {
            self.active = false;
        }
    }
}

fn load_ratio(force: f64, tolerance_mass: f64) -> f64 {
    if tolerance_mass > 0.0 {
        force / STANDARD_GRAVITY / tolerance_mass
    } else if force > 0.0 {
        f64::INFINITY
    } else {
        0.0
    }
}

fn rope_point_count(constraint: &ConnectionConstraint) -> usize {
    constraint.rope_nodes.len() + 2
}

fn rope_node_inverse_mass(constraint: &ConnectionConstraint) -> f64 {
    let node_count = constraint.rope_nodes.len().max(1) as f64;
    let node_mass =
        (constraint.linear_density * constraint.rest_length / node_count).max(MIN_DIMENSION);
    1.0 / node_mass
}

fn rope_point_position(constraint: &ConnectionConstraint, bodies: &[Body], point: usize) -> Vec2 {
    if point == 0 {
        let body = &bodies[constraint.body_a];
        body.position
            .add(rotate(constraint.local_anchor_a, body.angle))
    } else if point + 1 == rope_point_count(constraint) {
        let body = &bodies[constraint.body_b];
        body.position
            .add(rotate(constraint.local_anchor_b, body.angle))
    } else {
        constraint.rope_nodes[point - 1].position
    }
}

fn rope_point_velocity(constraint: &ConnectionConstraint, bodies: &[Body], point: usize) -> Vec2 {
    if point == 0 {
        let body = &bodies[constraint.body_a];
        body.point_velocity(rotate(constraint.local_anchor_a, body.angle))
    } else if point + 1 == rope_point_count(constraint) {
        let body = &bodies[constraint.body_b];
        body.point_velocity(rotate(constraint.local_anchor_b, body.angle))
    } else {
        constraint.rope_nodes[point - 1].velocity
    }
}

fn rope_point_effective_inverse(
    constraint: &ConnectionConstraint,
    bodies: &[Body],
    point: usize,
    direction: Vec2,
) -> f64 {
    if point == 0 {
        let body = &bodies[constraint.body_a];
        let radius = rotate(constraint.local_anchor_a, body.angle);
        body.inv_mass + radius.cross(direction).powi(2) * body.inv_inertia
    } else if point + 1 == rope_point_count(constraint) {
        let body = &bodies[constraint.body_b];
        let radius = rotate(constraint.local_anchor_b, body.angle);
        body.inv_mass + radius.cross(direction).powi(2) * body.inv_inertia
    } else {
        rope_node_inverse_mass(constraint)
    }
}

fn apply_rope_point_impulse(
    constraint: &mut ConnectionConstraint,
    bodies: &mut [Body],
    point: usize,
    impulse: Vec2,
) {
    if point == 0 {
        let body = &mut bodies[constraint.body_a];
        let radius = rotate(constraint.local_anchor_a, body.angle);
        body.apply_impulse(impulse, radius);
    } else if point + 1 == rope_point_count(constraint) {
        let body = &mut bodies[constraint.body_b];
        let radius = rotate(constraint.local_anchor_b, body.angle);
        body.apply_impulse(impulse, radius);
    } else {
        let inverse_mass = rope_node_inverse_mass(constraint);
        let node = &mut constraint.rope_nodes[point - 1];
        node.velocity = node
            .velocity
            .add(impulse.mul(inverse_mass))
            .finite_or(node.velocity);
    }
}

fn apply_rope_point_correction(
    constraint: &mut ConnectionConstraint,
    bodies: &mut [Body],
    point: usize,
    correction: Vec2,
) {
    if point == 0 {
        let body = &mut bodies[constraint.body_a];
        let radius = rotate(constraint.local_anchor_a, body.angle);
        body.position = body
            .position
            .add(correction.mul(body.inv_mass))
            .finite_or(body.position);
        body.angle = normalize_angle(body.angle + radius.cross(correction) * body.inv_inertia);
    } else if point + 1 == rope_point_count(constraint) {
        let body = &mut bodies[constraint.body_b];
        let radius = rotate(constraint.local_anchor_b, body.angle);
        body.position = body
            .position
            .add(correction.mul(body.inv_mass))
            .finite_or(body.position);
        body.angle = normalize_angle(body.angle + radius.cross(correction) * body.inv_inertia);
    } else {
        let inverse_mass = rope_node_inverse_mass(constraint);
        let node = &mut constraint.rope_nodes[point - 1];
        node.position = node
            .position
            .add(correction.mul(inverse_mass))
            .finite_or(node.position);
    }
}

fn integrate_rope_nodes(
    constraint: &mut ConnectionConstraint,
    dt: f64,
    global_gravity: f64,
    air_friction: f64,
) {
    if !constraint.active || !constraint.collision_enabled || constraint.binding {
        return;
    }
    let decay = (-air_friction * dt).exp();
    for node in &mut constraint.rope_nodes {
        node.velocity.y -= global_gravity * dt;
        node.velocity = node.velocity.mul(decay).finite_or(Vec2::ZERO);
        node.position = node
            .position
            .add(node.velocity.mul(dt))
            .finite_or(node.position);
    }
}

fn solve_rope_velocity(bodies: &mut [Body], constraint: &mut ConnectionConstraint, dt: f64) {
    if dt <= 0.0 || constraint.rope_nodes.is_empty() {
        return;
    }
    let point_count = rope_point_count(constraint);
    let link_rest_length = constraint.rest_length / (point_count - 1) as f64;
    for point_a in 0..point_count - 1 {
        if constraint.break_link == Some(point_a) {
            continue;
        }
        let point_b = point_a + 1;
        let position_a = rope_point_position(constraint, bodies, point_a);
        let position_b = rope_point_position(constraint, bodies, point_b);
        let delta = position_b.sub(position_a);
        let length = delta.length();
        let normal = delta.normalized_or(Vec2::new(1.0, 0.0));
        let error = length - link_rest_length;
        if constraint.bendable && error <= 0.0 {
            continue;
        }
        let velocity_a = rope_point_velocity(constraint, bodies, point_a);
        let velocity_b = rope_point_velocity(constraint, bodies, point_b);
        let relative_speed = velocity_b.sub(velocity_a).dot(normal);
        let denominator = rope_point_effective_inverse(constraint, bodies, point_a, normal)
            + rope_point_effective_inverse(constraint, bodies, point_b, normal);
        if denominator <= 0.0 {
            continue;
        }
        let scalar_impulse = if constraint.stretchable {
            let links = (point_count - 1) as f64;
            let link_stiffness = constraint.stiffness * links;
            let link_damping = constraint.damping * links;
            let raw_force = link_stiffness * error + link_damping * relative_speed;
            let force = if constraint.bendable {
                raw_force.max(0.0)
            } else {
                raw_force
            };
            constraint.tension = constraint.tension.max(force.abs());
            constraint.link_tensions[point_a] = constraint.link_tensions[point_a].max(force.abs());
            -force * dt / SOLVER_ITERATIONS as f64
        } else {
            let bias = 0.25 * error / dt;
            let impulse = -(relative_speed + bias) / denominator;
            let force = (impulse / dt).abs();
            constraint.tension = constraint.tension.max(force);
            constraint.link_tensions[point_a] = constraint.link_tensions[point_a].max(force);
            impulse
        };
        let impulse = normal.mul(scalar_impulse);
        apply_rope_point_impulse(constraint, bodies, point_a, impulse.neg());
        apply_rope_point_impulse(constraint, bodies, point_b, impulse);
    }
}

fn correct_rope_position(bodies: &mut [Body], constraint: &mut ConnectionConstraint) {
    if constraint.rope_nodes.is_empty() {
        return;
    }
    let point_count = rope_point_count(constraint);
    if !constraint.stretchable {
        let link_rest_length = constraint.rest_length / (point_count - 1) as f64;
        for point_a in 0..point_count - 1 {
            if constraint.break_link == Some(point_a) {
                continue;
            }
            let point_b = point_a + 1;
            let position_a = rope_point_position(constraint, bodies, point_a);
            let position_b = rope_point_position(constraint, bodies, point_b);
            let delta = position_b.sub(position_a);
            let length = delta.length();
            let normal = delta.normalized_or(Vec2::new(1.0, 0.0));
            let error = length - link_rest_length;
            if constraint.bendable && error <= POSITION_SLOP {
                continue;
            }
            let denominator = rope_point_effective_inverse(constraint, bodies, point_a, normal)
                + rope_point_effective_inverse(constraint, bodies, point_b, normal);
            if denominator <= 0.0 {
                continue;
            }
            let correction = normal.mul(error * 0.75 / denominator);
            apply_rope_point_correction(constraint, bodies, point_a, correction);
            apply_rope_point_correction(constraint, bodies, point_b, correction.neg());
        }
    }
    if !constraint.bendable && constraint.rope_nodes.len() > 1 {
        let positions: Vec<Vec2> = (0..point_count)
            .map(|point| rope_point_position(constraint, bodies, point))
            .collect();
        let inverse_mass = rope_node_inverse_mass(constraint);
        for node_index in 0..constraint.rope_nodes.len() {
            if constraint.break_link == Some(node_index)
                || constraint.break_link == Some(node_index + 1)
            {
                continue;
            }
            let target = positions[node_index]
                .add(positions[node_index + 2])
                .mul(0.5);
            let correction = target
                .sub(positions[node_index + 1])
                .mul(0.22 / inverse_mass);
            apply_rope_point_correction(constraint, bodies, node_index + 1, correction);
        }
    }
}

fn rope_collision_body(node: RopeNode, radius: f64, mass: f64, layer: i64) -> Body {
    Body {
        data_index: usize::MAX,
        shape: Shape::Ellipse {
            radius_x: radius,
            radius_y: radius,
        },
        position: node.position,
        velocity: node.velocity,
        acceleration: Vec2::ZERO,
        angle: 0.0,
        angular_velocity: 0.0,
        force: Vec2::ZERO,
        torque: 0.0,
        mass,
        inv_mass: 1.0 / mass,
        inertia: 0.5 * mass * radius * radius,
        inv_inertia: 0.0,
        gravity_scale: 1.0,
        local_gravity: 0.0,
        linear_damping: 0.0,
        angular_damping: 0.0,
        restitution: 0.0,
        restitution_threshold: 0.0,
        static_friction: 0.4,
        dynamic_friction: 0.25,
        is_static: false,
        is_kinematic: false,
        is_sensor: false,
        layer,
    }
}

fn rope_sample_position(
    constraint: &ConnectionConstraint,
    bodies: &[Body],
    link: usize,
    ratio: f64,
) -> Vec2 {
    rope_point_position(constraint, bodies, link)
        .mul(1.0 - ratio)
        .add(rope_point_position(constraint, bodies, link + 1).mul(ratio))
}

fn rope_sample_velocity(
    constraint: &ConnectionConstraint,
    bodies: &[Body],
    link: usize,
    ratio: f64,
) -> Vec2 {
    rope_point_velocity(constraint, bodies, link)
        .mul(1.0 - ratio)
        .add(rope_point_velocity(constraint, bodies, link + 1).mul(ratio))
}

fn rope_sample_effective_inverse(
    constraint: &ConnectionConstraint,
    bodies: &[Body],
    link: usize,
    ratio: f64,
    direction: Vec2,
) -> f64 {
    let weight_a = 1.0 - ratio;
    let weight_b = ratio;
    weight_a * weight_a * rope_point_effective_inverse(constraint, bodies, link, direction)
        + weight_b
            * weight_b
            * rope_point_effective_inverse(constraint, bodies, link + 1, direction)
}

fn apply_rope_sample_impulse(
    constraint: &mut ConnectionConstraint,
    bodies: &mut [Body],
    link: usize,
    ratio: f64,
    impulse: Vec2,
) {
    apply_rope_point_impulse(constraint, bodies, link, impulse.mul(1.0 - ratio));
    apply_rope_point_impulse(constraint, bodies, link + 1, impulse.mul(ratio));
}

fn apply_rope_sample_correction(
    constraint: &mut ConnectionConstraint,
    bodies: &mut [Body],
    link: usize,
    ratio: f64,
    correction: Vec2,
) {
    apply_rope_point_correction(constraint, bodies, link, correction.mul(1.0 - ratio));
    apply_rope_point_correction(constraint, bodies, link + 1, correction.mul(ratio));
}

#[derive(Clone, Copy)]
struct RopeSample {
    link: usize,
    ratio: f64,
    layer: i64,
}

#[derive(Clone, Copy)]
struct RopeContactKinematics {
    normal: Vec2,
    radius_body: Vec2,
    relative_velocity: Vec2,
    normal_scalar: f64,
}

fn rope_can_collide_with_body(
    constraint: &ConnectionConstraint,
    body: &Body,
    body_index: usize,
    layer: i64,
) -> bool {
    body_index != constraint.body_a
        && body_index != constraint.body_b
        && body.layer == layer
        && !body.is_sensor
}

fn apply_rope_friction(
    bodies: &mut [Body],
    constraint: &mut ConnectionConstraint,
    sample: RopeSample,
    body_index: usize,
    contact: RopeContactKinematics,
) {
    let tangent = contact.normal.perp();
    let tangent_cross = contact.radius_body.cross(tangent);
    let tangent_denominator =
        rope_sample_effective_inverse(constraint, bodies, sample.link, sample.ratio, tangent)
            + bodies[body_index].inv_mass
            + tangent_cross * tangent_cross * bodies[body_index].inv_inertia;
    if tangent_denominator <= 0.0 {
        return;
    }
    let tangent_speed = contact.relative_velocity.dot(tangent);
    let static_limit = (bodies[body_index].static_friction * 0.4).sqrt() * contact.normal_scalar;
    let dynamic_limit = (bodies[body_index].dynamic_friction * 0.25).sqrt() * contact.normal_scalar;
    let unconstrained = -tangent_speed / tangent_denominator;
    let tangent_scalar = if unconstrained.abs() <= static_limit {
        unconstrained
    } else {
        unconstrained.clamp(-dynamic_limit, dynamic_limit)
    };
    let friction_impulse = tangent.mul(tangent_scalar);
    apply_rope_sample_impulse(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
        friction_impulse.neg(),
    );
    bodies[body_index].apply_impulse(friction_impulse, contact.radius_body);
}

fn resolve_rope_manifold(
    bodies: &mut [Body],
    constraint: &mut ConnectionConstraint,
    sample: RopeSample,
    body_index: usize,
    manifold: Manifold,
) {
    let radius_body = manifold.point.sub(bodies[body_index].position);
    let body_velocity = bodies[body_index].point_velocity(radius_body);
    let relative_velocity = body_velocity.sub(rope_sample_velocity(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
    ));
    let cross_body = radius_body.cross(manifold.normal);
    let rope_normal_inverse = rope_sample_effective_inverse(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
        manifold.normal,
    );
    let denominator = rope_normal_inverse
        + bodies[body_index].inv_mass
        + cross_body * cross_body * bodies[body_index].inv_inertia;
    if denominator <= 0.0 {
        return;
    }
    let normal_speed = relative_velocity.dot(manifold.normal);
    let normal_scalar = if normal_speed < 0.0 {
        let restitution = if -normal_speed > bodies[body_index].restitution_threshold {
            bodies[body_index].restitution
        } else {
            0.0
        };
        -(1.0 + restitution) * normal_speed / denominator
    } else {
        0.0
    };
    if normal_scalar > 0.0 {
        let impulse = manifold.normal.mul(normal_scalar);
        apply_rope_sample_impulse(constraint, bodies, sample.link, sample.ratio, impulse.neg());
        bodies[body_index].apply_impulse(impulse, radius_body);
        apply_rope_friction(
            bodies,
            constraint,
            sample,
            body_index,
            RopeContactKinematics {
                normal: manifold.normal,
                radius_body,
                relative_velocity,
                normal_scalar,
            },
        );
    }

    let correction = manifold
        .normal
        .mul((manifold.depth - POSITION_SLOP).max(0.0) * POSITION_CORRECTION / denominator);
    apply_rope_sample_correction(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
        correction.neg(),
    );
    let body = &mut bodies[body_index];
    body.position = body
        .position
        .add(correction.mul(body.inv_mass))
        .finite_or(body.position);
    body.angle = normalize_angle(body.angle + radius_body.cross(correction) * body.inv_inertia);
}

fn resolve_rope_sample_body(
    bodies: &mut [Body],
    constraint: &mut ConnectionConstraint,
    sample: RopeSample,
    body_index: usize,
) {
    let sample_position = rope_sample_position(constraint, bodies, sample.link, sample.ratio);
    let sample_velocity = rope_sample_velocity(constraint, bodies, sample.link, sample.ratio);
    let sample_inverse = rope_sample_effective_inverse(
        constraint,
        bodies,
        sample.link,
        sample.ratio,
        Vec2::new(1.0, 0.0),
    )
    .max(MIN_DIMENSION);
    let sample_body = rope_collision_body(
        RopeNode {
            position: sample_position,
            velocity: sample_velocity,
        },
        constraint.collision_radius,
        1.0 / sample_inverse,
        sample.layer,
    );
    for manifold in collide(&sample_body, &bodies[body_index]) {
        resolve_rope_manifold(bodies, constraint, sample, body_index, manifold);
    }
}

fn resolve_rope_collisions(bodies: &mut [Body], constraint: &mut ConnectionConstraint) {
    if !constraint.active || !constraint.collision_enabled || constraint.rope_nodes.is_empty() {
        return;
    }
    let layer = bodies[constraint.body_a].layer;
    let point_count = rope_point_count(constraint);
    for link in 0..point_count - 1 {
        if constraint.break_link == Some(link) {
            continue;
        }
        let link_length = rope_point_position(constraint, bodies, link + 1)
            .sub(rope_point_position(constraint, bodies, link))
            .length();
        let sample_count = ((link_length / constraint.collision_radius.max(MIN_DIMENSION)).ceil()
            as usize)
            .clamp(1, 32);
        for sample_index in 0..sample_count {
            let ratio = (sample_index as f64 + 0.5) / sample_count as f64;
            for body_index in 0..bodies.len() {
                if !rope_can_collide_with_body(constraint, &bodies[body_index], body_index, layer) {
                    continue;
                }
                resolve_rope_sample_body(
                    bodies,
                    constraint,
                    RopeSample { link, ratio, layer },
                    body_index,
                );
            }
        }
    }
}

fn solve_symmetric_2x2(k11: f64, k12: f64, k22: f64, rhs: Vec2) -> Vec2 {
    let determinant = k11 * k22 - k12 * k12;
    if determinant.abs() <= EPSILON {
        return Vec2::ZERO;
    }
    Vec2::new(
        (k22 * rhs.x - k12 * rhs.y) / determinant,
        (-k12 * rhs.x + k11 * rhs.y) / determinant,
    )
}

fn binding_mass_matrix(a: &Body, b: &Body, radius_a: Vec2, radius_b: Vec2) -> (f64, f64, f64) {
    let inverse_mass = a.inv_mass + b.inv_mass;
    (
        inverse_mass
            + radius_a.y * radius_a.y * a.inv_inertia
            + radius_b.y * radius_b.y * b.inv_inertia,
        -radius_a.x * radius_a.y * a.inv_inertia - radius_b.x * radius_b.y * b.inv_inertia,
        inverse_mass
            + radius_a.x * radius_a.x * a.inv_inertia
            + radius_b.x * radius_b.x * b.inv_inertia,
    )
}

fn solve_binding_velocity(bodies: &mut [Body], constraint: &mut ConnectionConstraint, dt: f64) {
    if dt <= 0.0 {
        return;
    }
    let (radius_a, radius_b, error, relative_velocity, k11, k12, k22) = {
        let a = &bodies[constraint.body_a];
        let b = &bodies[constraint.body_b];
        let radius_a = rotate(constraint.bind_offset, a.angle);
        let radius_b = Vec2::ZERO;
        let error = b.position.add(radius_b).sub(a.position.add(radius_a));
        let relative_velocity = b.point_velocity(radius_b).sub(a.point_velocity(radius_a));
        let (k11, k12, k22) = binding_mass_matrix(a, b, radius_a, radius_b);
        (radius_a, radius_b, error, relative_velocity, k11, k12, k22)
    };

    let bias = error.mul(0.2 / dt);
    let impulse = solve_symmetric_2x2(k11, k12, k22, relative_velocity.add(bias).neg());
    if impulse.length_squared() > 0.0 {
        apply_pair_impulse(
            bodies,
            constraint.body_a,
            constraint.body_b,
            impulse,
            radius_a,
            radius_b,
        );
        constraint.tension = constraint.tension.max(impulse.length() / dt);
    }

    let (inverse_inertia, relative_angular_velocity, angle_error) = {
        let a = &bodies[constraint.body_a];
        let b = &bodies[constraint.body_b];
        (
            a.inv_inertia + b.inv_inertia,
            b.angular_velocity - a.angular_velocity,
            normalize_angle((b.angle - a.angle) - constraint.bind_angle),
        )
    };
    if inverse_inertia > 0.0 {
        let angular_impulse =
            -(relative_angular_velocity + 0.2 * angle_error / dt) / inverse_inertia;
        let (a, b) = two_bodies_mut(bodies, constraint.body_a, constraint.body_b);
        a.angular_velocity -= angular_impulse * a.inv_inertia;
        b.angular_velocity += angular_impulse * b.inv_inertia;
    }
}

fn correct_binding_position(bodies: &mut [Body], constraint: &ConnectionConstraint) {
    for _ in 0..8 {
        let (angle_error, inverse_inertia) = {
            let a = &bodies[constraint.body_a];
            let b = &bodies[constraint.body_b];
            (
                normalize_angle((b.angle - a.angle) - constraint.bind_angle),
                a.inv_inertia + b.inv_inertia,
            )
        };
        if inverse_inertia > 0.0 {
            let angular_impulse = -angle_error * 0.75 / inverse_inertia;
            let (a, b) = two_bodies_mut(bodies, constraint.body_a, constraint.body_b);
            a.angle = normalize_angle(a.angle - angular_impulse * a.inv_inertia);
            b.angle = normalize_angle(b.angle + angular_impulse * b.inv_inertia);
        }

        let (radius_a, radius_b, error, k11, k12, k22) = {
            let a = &bodies[constraint.body_a];
            let b = &bodies[constraint.body_b];
            let radius_a = rotate(constraint.bind_offset, a.angle);
            let radius_b = Vec2::ZERO;
            let error = b.position.add(radius_b).sub(a.position.add(radius_a));
            let (k11, k12, k22) = binding_mass_matrix(a, b, radius_a, radius_b);
            (radius_a, radius_b, error, k11, k12, k22)
        };
        let impulse = solve_symmetric_2x2(k11, k12, k22, error.mul(-0.75));
        let (a, b) = two_bodies_mut(bodies, constraint.body_a, constraint.body_b);
        a.position = a
            .position
            .sub(impulse.mul(a.inv_mass))
            .finite_or(a.position);
        a.angle = normalize_angle(a.angle - radius_a.cross(impulse) * a.inv_inertia);
        b.position = b
            .position
            .add(impulse.mul(b.inv_mass))
            .finite_or(b.position);
        b.angle = normalize_angle(b.angle + radius_b.cross(impulse) * b.inv_inertia);
    }
}

fn synchronize_binding_motion(bodies: &mut [Body], constraint: &ConnectionConstraint) {
    if !constraint.binding || !constraint.active {
        return;
    }
    let (a_index, b_index) = (constraint.body_a, constraint.body_b);
    if bodies[a_index].inv_mass <= 0.0 {
        let angular_velocity = bodies[a_index].angular_velocity;
        let radius = rotate(constraint.bind_offset, bodies[a_index].angle);
        let velocity = bodies[a_index].point_velocity(radius);
        bodies[b_index].velocity = velocity;
        bodies[b_index].angular_velocity = angular_velocity;
        return;
    }
    if bodies[b_index].inv_mass <= 0.0 {
        let angular_velocity = bodies[b_index].angular_velocity;
        let radius = rotate(constraint.bind_offset, bodies[a_index].angle);
        bodies[a_index].velocity = bodies[b_index].velocity.sub(Vec2::new(
            -angular_velocity * radius.y,
            angular_velocity * radius.x,
        ));
        bodies[a_index].angular_velocity = angular_velocity;
        return;
    }

    let a = &bodies[a_index];
    let b = &bodies[b_index];
    let total_mass = a.mass + b.mass;
    if total_mass <= 0.0 {
        return;
    }
    let center = a
        .position
        .mul(a.mass)
        .add(b.position.mul(b.mass))
        .mul(1.0 / total_mass);
    let radius_a = a.position.sub(center);
    let radius_b = b.position.sub(center);
    let linear_velocity = a
        .velocity
        .mul(a.mass)
        .add(b.velocity.mul(b.mass))
        .mul(1.0 / total_mass);
    let compound_inertia = a.inertia
        + a.mass * radius_a.length_squared()
        + b.inertia
        + b.mass * radius_b.length_squared();
    let angular_momentum = a.inertia * a.angular_velocity
        + radius_a.cross(a.velocity.mul(a.mass))
        + b.inertia * b.angular_velocity
        + radius_b.cross(b.velocity.mul(b.mass));
    let angular_velocity = if compound_inertia > MIN_INERTIA {
        angular_momentum / compound_inertia
    } else {
        0.0
    };
    let velocity_a = linear_velocity.add(Vec2::new(
        -angular_velocity * radius_a.y,
        angular_velocity * radius_a.x,
    ));
    let velocity_b = linear_velocity.add(Vec2::new(
        -angular_velocity * radius_b.y,
        angular_velocity * radius_b.x,
    ));
    let (a, b) = two_bodies_mut(bodies, a_index, b_index);
    a.velocity = velocity_a.finite_or(a.velocity);
    b.velocity = velocity_b.finite_or(b.velocity);
    a.angular_velocity = finite_or(angular_velocity, 0.0);
    b.angular_velocity = finite_or(angular_velocity, 0.0);
}

fn solve_connection_velocity(bodies: &mut [Body], constraint: &mut ConnectionConstraint, dt: f64) {
    let simulating_fragments = constraint.collision_enabled && constraint.break_link.is_some();
    if !constraint.active || (constraint.broken_code != 0 && !simulating_fragments) || dt <= 0.0 {
        return;
    }
    if constraint.binding {
        solve_binding_velocity(bodies, constraint, dt);
        return;
    }
    if constraint.collision_enabled {
        solve_rope_velocity(bodies, constraint, dt);
        return;
    }
    let (radius_a, radius_b, normal, length, _) = constraint.geometry(bodies);
    let error = length - constraint.rest_length;
    if constraint.bendable && error <= 0.0 {
        constraint.tension = 0.0;
        return;
    }

    let (denominator, relative_speed) = {
        let a = &bodies[constraint.body_a];
        let b = &bodies[constraint.body_b];
        let relative_velocity = b.point_velocity(radius_b).sub(a.point_velocity(radius_a));
        let cross_a = radius_a.cross(normal);
        let cross_b = radius_b.cross(normal);
        (
            a.inv_mass
                + b.inv_mass
                + cross_a * cross_a * a.inv_inertia
                + cross_b * cross_b * b.inv_inertia,
            relative_velocity.dot(normal),
        )
    };
    if denominator <= 0.0 {
        return;
    }

    let impulse = if constraint.stretchable {
        let raw_force = constraint.stiffness * error + constraint.damping * relative_speed;
        let force = if constraint.bendable {
            raw_force.max(0.0)
        } else {
            raw_force
        };
        constraint.tension = constraint.tension.max(force.abs());
        -force * dt / SOLVER_ITERATIONS as f64
    } else {
        let bias = 0.25 * error / dt;
        let impulse = -(relative_speed + bias) / denominator;
        constraint.tension = constraint.tension.max((impulse / dt).abs());
        impulse
    };

    if impulse != 0.0 {
        apply_pair_impulse(
            bodies,
            constraint.body_a,
            constraint.body_b,
            normal.mul(impulse),
            radius_a,
            radius_b,
        );
    }
}

fn correct_connection_position(bodies: &mut [Body], constraint: &mut ConnectionConstraint) {
    let simulating_fragments = constraint.collision_enabled && constraint.break_link.is_some();
    if !constraint.active || (constraint.broken_code != 0 && !simulating_fragments) {
        return;
    }
    if constraint.binding {
        correct_binding_position(bodies, constraint);
        return;
    }
    if constraint.collision_enabled {
        correct_rope_position(bodies, constraint);
        return;
    }
    let (radius_a, radius_b, normal, length, _) = constraint.geometry(bodies);
    let error = length - constraint.rest_length;
    if constraint.stretchable || (constraint.bendable && error <= POSITION_SLOP) {
        return;
    }
    let a = &bodies[constraint.body_a];
    let b = &bodies[constraint.body_b];
    let cross_a = radius_a.cross(normal);
    let cross_b = radius_b.cross(normal);
    let denominator = a.inv_mass
        + b.inv_mass
        + cross_a * cross_a * a.inv_inertia
        + cross_b * cross_b * b.inv_inertia;
    if denominator <= 0.0 {
        return;
    }
    let correction = normal.mul(error * 0.75 / denominator);
    let (a, b) = two_bodies_mut(bodies, constraint.body_a, constraint.body_b);
    a.position = a
        .position
        .add(correction.mul(a.inv_mass))
        .finite_or(a.position);
    a.angle = normalize_angle(a.angle + radius_a.cross(correction) * a.inv_inertia);
    b.position = b
        .position
        .sub(correction.mul(b.inv_mass))
        .finite_or(b.position);
    b.angle = normalize_angle(b.angle - radius_b.cross(correction) * b.inv_inertia);
}

fn determine_sub_steps(bodies: &[Body], dt: f64, global_gravity: f64) -> usize {
    let mut required = BASE_SUB_STEPS;
    for body in bodies {
        if body.is_static {
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

fn active_bound_pairs(constraints: &[ConnectionConstraint]) -> HashSet<(usize, usize)> {
    constraints
        .iter()
        .filter(|constraint| constraint.binding && constraint.active)
        .map(|constraint| {
            (
                constraint.body_a.min(constraint.body_b),
                constraint.body_a.max(constraint.body_b),
            )
        })
        .collect()
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
        .map(|(index, body)| (index, body.shape.aabb(body.position, body.angle)))
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
            if body_a.layer != body_b.layer {
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
) {
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

#[wasm_bindgen]
pub fn step_physics(input: &[f64], dt: f64, global_gravity: f64, air_friction: f64) -> Vec<f64> {
    step_physics_with_connections(input, &[], dt, global_gravity, air_friction)
}

#[wasm_bindgen]
pub fn step_physics_with_connections(
    input: &[f64],
    connection_input: &[f64],
    dt: f64,
    global_gravity: f64,
    air_friction: f64,
) -> Vec<f64> {
    let mut data = input.to_vec();
    let mut connection_data = connection_input.to_vec();
    let body_count = data.len() / STRIDE;
    reset_contact_diagnostics(&mut data, body_count);

    let dt = finite_or(dt, 0.0).clamp(0.0, 0.25);
    if body_count == 0 || dt <= 0.0 {
        data.extend(connection_data);
        return data;
    }

    let global_gravity = finite_or(global_gravity, 0.0);
    let air_friction = non_negative(air_friction, 0.0);
    let mut bodies = read_bodies(&data, body_count);
    let mut constraints = read_constraints(&connection_data, body_count, &bodies);
    let bound_pairs = active_bound_pairs(&constraints);
    let sub_steps = determine_sub_steps(&bodies, dt, global_gravity);
    let sub_dt = dt / sub_steps as f64;

    for sub_step in 0..sub_steps {
        simulate_sub_step(
            &mut bodies,
            &mut constraints,
            &bound_pairs,
            &mut data,
            SubStepContext {
                dt: sub_dt,
                global_gravity,
                air_friction,
                record_diagnostics: sub_step + 1 == sub_steps,
            },
        );
    }

    write_bodies(&mut data, &bodies);
    write_constraints(&mut connection_data, &constraints);
    data.extend(connection_data);
    data
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ellipse_record(id: f64, x: f64, y: f64, radius_x: f64, radius_y: f64) -> Vec<f64> {
        let mut record = vec![0.0; STRIDE];
        record[0] = id;
        record[1] = 1.0;
        record[2] = x;
        record[3] = y;
        record[8] = 1.0;
        record[10] = 0.0;
        record[12] = radius_x;
        record[13] = radius_y;
        record[17] = 1.0;
        record[25] = 1.0;
        record[27] = 1.0;
        record[33] = 1.0;
        record
    }

    fn box_record(id: f64, x: f64, y: f64, width: f64, height: f64) -> Vec<f64> {
        let mut record = vec![0.0; STRIDE];
        record[0] = id;
        record[2] = x;
        record[3] = y;
        record[8] = 1.0;
        record[12] = width;
        record[13] = height;
        record[17] = 1.0;
        record[25] = 1.0;
        record[27] = 1.0;
        record[33] = 1.0;
        let half_width = width * 0.5;
        let half_height = height * 0.5;
        let vertices = [
            (-half_width, -half_height),
            (half_width, -half_height),
            (half_width, half_height),
            (-half_width, half_height),
        ];
        for (index, (vx, vy)) in vertices.iter().enumerate() {
            record[34 + index * 2] = *vx;
            record[35 + index * 2] = *vy;
        }
        record
    }

    fn all_finite(values: &[f64]) -> bool {
        values.iter().all(|value| value.is_finite())
    }

    #[test]
    fn integrates_gravity_with_f64_precision() {
        let input = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let output = step_physics(&input, 0.1, 9.81, 0.0);
        assert!((output[5] + 0.981).abs() < 1.0e-10);
        assert!(output[3] < 0.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn coincident_ellipses_remain_finite_and_separate() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 2.0, 1.0);
        input.extend(ellipse_record(2.0, 0.0, 0.0, 2.0, 1.0));
        let output = step_physics(&input, 1.0 / 60.0, 0.0, 0.0);
        assert!(all_finite(&output));
        assert!(output[29] > 0.0);
        assert!(output[32] > 0.0);
        let separation = Vec2::new(output[2], output[3])
            .sub(Vec2::new(output[STRIDE + 2], output[STRIDE + 3]))
            .length();
        assert!(separation > 0.0);
    }

    #[test]
    fn static_body_does_not_move() {
        let mut input = box_record(1.0, 3.0, 4.0, 2.0, 2.0);
        input[4] = 100.0;
        input[5] = -100.0;
        input[9] = 1.0;
        let output = step_physics(&input, 0.2, 9.81, 0.0);
        assert_eq!(output[2], 3.0);
        assert_eq!(output[3], 4.0);
    }

    #[test]
    fn kinematic_body_integrates_velocity_without_forces() {
        let mut input = box_record(1.0, 0.0, 0.0, 2.0, 2.0);
        input[4] = 5.0;
        input[5] = 2.0;
        input[24] = 1.0;
        let output = step_physics(&input, 0.2, 100.0, 100.0);
        assert!((output[2] - 1.0).abs() < 1.0e-10);
        assert!((output[3] - 0.4).abs() < 1.0e-10);
    }

    #[test]
    fn sensors_report_contacts_without_applying_impulses() {
        let mut input = ellipse_record(1.0, -0.5, 0.0, 1.0, 1.0);
        input[4] = 1.0;
        input[28] = 1.0;
        let mut second = ellipse_record(2.0, 0.5, 0.0, 1.0, 1.0);
        second[4] = -1.0;
        input.extend(second);
        let output = step_physics(&input, 1.0 / 120.0, 0.0, 0.0);
        assert!(output[29] > 0.0);
        assert!((output[4] - 1.0).abs() < 1.0e-10);
        assert!((output[STRIDE + 4] + 1.0).abs() < 1.0e-10);
    }

    #[test]
    fn collision_layers_are_isolated() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let mut second = ellipse_record(2.0, 0.5, 0.0, 1.0, 1.0);
        second[33] = 2.0;
        input.extend(second);
        let output = step_physics(&input, 1.0 / 60.0, 0.0, 0.0);
        assert_eq!(output[29], 0.0);
        assert_eq!(output[STRIDE + 29], 0.0);
    }

    #[test]
    fn malformed_numbers_are_sanitized() {
        let mut input = ellipse_record(1.0, f64::NAN, f64::INFINITY, -1.0, 0.0);
        input[4] = f64::NEG_INFINITY;
        input[8] = 0.0;
        let output = step_physics(&input, 1.0 / 60.0, 9.81, 0.0);
        assert!(all_finite(&output));
        assert!(output[8] > 0.0);
    }

    #[test]
    fn shape_inertia_matches_analytic_values() {
        let ellipse = Shape::Ellipse {
            radius_x: 2.0,
            radius_y: 1.0,
        };
        assert!((ellipse.inertia(4.0) - 5.0).abs() < 1.0e-10);

        let rectangle = Shape::Polygon {
            vertices: vec![
                Vec2::new(-2.0, -1.0),
                Vec2::new(2.0, -1.0),
                Vec2::new(2.0, 1.0),
                Vec2::new(-2.0, 1.0),
            ],
        };
        let expected = 4.0 * (4.0_f64.powi(2) + 2.0_f64.powi(2)) / 12.0;
        assert!((rectangle.inertia(4.0) - expected).abs() < 1.0e-10);
    }

    #[test]
    fn rotated_ellipse_and_polygon_generate_a_finite_manifold() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 2.0, 0.5);
        input[14] = 0.7;
        let mut polygon = box_record(2.0, 0.6, 0.0, 1.5, 1.5);
        polygon[14] = -0.35;
        input.extend(polygon);

        let output = step_physics(&input, 1.0 / 120.0, 0.0, 0.0);
        assert!(all_finite(&output));
        assert!(output[29] > 0.0);
        assert!(output[32] > 0.0);
    }

    #[test]
    fn perfectly_elastic_head_on_collision_reverses_velocities() {
        let mut input = ellipse_record(1.0, -0.95, 0.0, 1.0, 1.0);
        input[4] = 1.0;
        input[10] = 1.0;
        input[27] = 0.0;
        let mut second = ellipse_record(2.0, 0.95, 0.0, 1.0, 1.0);
        second[4] = -1.0;
        second[10] = 1.0;
        second[27] = 0.0;
        input.extend(second);

        let output = step_physics(&input, 1.0 / 240.0, 0.0, 0.0);
        assert!(output[4] < -0.99);
        assert!(output[STRIDE + 4] > 0.99);
    }

    #[test]
    fn restitution_threshold_suppresses_low_speed_bounce() {
        let mut input = ellipse_record(1.0, -0.95, 0.0, 1.0, 1.0);
        input[4] = 0.1;
        input[10] = 1.0;
        input[27] = 1.0;
        let mut second = ellipse_record(2.0, 0.95, 0.0, 1.0, 1.0);
        second[4] = -0.1;
        second[10] = 1.0;
        second[27] = 1.0;
        input.extend(second);

        let output = step_physics(&input, 1.0 / 240.0, 0.0, 0.0);
        assert!(output[4].abs() < 1.0e-8);
        assert!(output[STRIDE + 4].abs() < 1.0e-8);
    }

    #[test]
    fn high_speed_body_does_not_tunnel_through_a_thin_wall() {
        let mut input = ellipse_record(1.0, -5.0, 0.0, 0.5, 0.5);
        input[4] = 1_000.0;
        let mut wall = box_record(2.0, 0.0, 0.0, 0.2, 10.0);
        wall[9] = 1.0;
        input.extend(wall);

        let output = step_physics(&input, 0.01, 0.0, 0.0);
        assert!(all_finite(&output));
        assert!(output[2] < 0.6, "body tunneled to x={}", output[2]);
        assert!(output[4] < 1_000.0);
    }

    #[test]
    fn friction_coefficients_above_one_are_preserved() {
        let mut input = box_record(1.0, 0.0, 0.0, 1.0, 1.0);
        input[11] = 1.75;
        input[20] = 2.5;
        let body = Body::from_data(&input, 0);
        assert_eq!(body.dynamic_friction, 1.75);
        assert_eq!(body.static_friction, 2.5);
    }

    #[test]
    fn degenerate_polygon_vertices_fall_back_without_panicking() {
        let mut input = box_record(1.0, 0.0, 0.0, 2.0, 3.0);
        input
            .iter_mut()
            .take(42)
            .skip(34)
            .for_each(|value| *value = 0.0);
        let body = Body::from_data(&input, 0);
        assert!((body.shape.area() - 6.0).abs() < 1.0e-10);
        assert!(body.inertia.is_finite());
    }

    #[test]
    fn immovable_sensors_still_report_overlap() {
        let mut input = box_record(1.0, 0.0, 0.0, 2.0, 2.0);
        input[9] = 1.0;
        input[28] = 1.0;
        let mut second = box_record(2.0, 0.5, 0.0, 2.0, 2.0);
        second[9] = 1.0;
        input.extend(second);
        let output = step_physics(&input, 1.0 / 60.0, 0.0, 0.0);
        assert!(output[29] > 0.0);
        assert!(output[STRIDE + 29] > 0.0);
    }

    #[test]
    fn minimum_scale_shapes_collide_and_keep_analytic_inertia() {
        let radius = MIN_DIMENSION;
        let mass = MIN_DIMENSION;
        let mut input = ellipse_record(1.0, -0.75 * radius, 0.0, radius, radius);
        input[8] = mass;
        let mut second = ellipse_record(2.0, 0.75 * radius, 0.0, radius, radius);
        second[8] = mass;
        input.extend(second);

        let output = step_physics(&input, 1.0 / 1_000.0, 0.0, 0.0);
        let expected_inertia = 0.5 * mass * radius * radius;
        assert!(all_finite(&output));
        assert!(output[29] > 0.0);
        assert!((output[26] - expected_inertia).abs() <= expected_inertia * 1.0e-10);
    }

    #[test]
    fn force_acceleration_and_torque_follow_newtons_laws() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        input[6] = 3.0;
        input[8] = 2.0;
        input[16] = 2.0;
        input[21] = 4.0;
        let output = step_physics(&input, 0.1, 0.0, 0.0);
        assert!((output[4] - 0.5).abs() < 1.0e-12);
        assert!((output[15] - 0.2).abs() < 1.0e-12);
    }

    #[test]
    fn exponential_air_damping_is_timestep_independent() {
        let mut input = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        input[4] = 10.0;
        let output = step_physics(&input, 0.2, 0.0, 2.0);
        assert!((output[4] - 10.0 * (-0.4_f64).exp()).abs() < 1.0e-12);
    }

    #[test]
    fn static_friction_settles_a_slow_sliding_box() {
        let mut dynamic = box_record(1.0, 0.0, 0.0, 1.0, 1.0);
        dynamic[4] = 0.1;
        dynamic[11] = 1.0;
        dynamic[20] = 1.0;
        let mut floor = box_record(2.0, 0.0, -1.0, 20.0, 1.0);
        floor[9] = 1.0;
        floor[11] = 1.0;
        floor[20] = 1.0;
        dynamic.extend(floor);

        let mut state = dynamic;
        for _ in 0..120 {
            state = step_physics(&state, 1.0 / 120.0, 9.81, 0.0);
        }
        assert!(all_finite(&state));
        assert!(state[4].abs() < 1.0e-3, "sliding velocity={}", state[4]);
        assert!(state[5].abs() < 1.0e-3, "vertical velocity={}", state[5]);
    }

    #[test]
    fn moving_kinematic_body_transfers_momentum_to_dynamic_body() {
        let mut kinematic = box_record(1.0, -0.75, 0.0, 1.0, 1.0);
        kinematic[4] = 2.0;
        kinematic[24] = 1.0;
        let dynamic = box_record(2.0, 0.0, 0.0, 1.0, 1.0);
        kinematic.extend(dynamic);
        let output = step_physics(&kinematic, 1.0 / 120.0, 0.0, 0.0);
        assert!(output[STRIDE + 4] > 0.0);
        assert!((output[4] - 2.0).abs() < 1.0e-12);
    }

    fn connection_record(body_a: usize, body_b: usize, rest_length: f64) -> Vec<f64> {
        let mut record = vec![0.0; CONNECTION_STRIDE];
        record[0] = 1.0;
        record[1] = body_a as f64;
        record[2] = body_b as f64;
        record[7] = rest_length;
        record[9] = 1.0;
        record[10] = 100.0;
        record[12] = 1.25;
        record[13] = 100.0;
        record[14] = 100.0;
        record[16] = 1.0;
        record[28] = -1.0;
        record
    }

    #[test]
    fn rigid_string_prevents_endpoints_from_separating() {
        let mut bodies = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        bodies[4] = -10.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[4] = 10.0;
        bodies.extend(second);
        let connection = connection_record(0, 1, 2.0);
        let output = step_physics_with_connections(&bodies, &connection, 0.1, 0.0, 0.0);
        let distance = output[STRIDE + 2] - output[2];
        assert!(distance <= 2.0 + 1.0e-6, "distance={distance}");
        assert_eq!(output[bodies.len() + 17], 0.0);
    }

    #[test]
    fn stretchable_string_applies_damped_hooke_tension() {
        let mut bodies = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        let second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        bodies.extend(second);
        let mut connection = connection_record(0, 1, 1.0);
        connection[8] = 1.0;
        connection[10] = 200.0;
        connection[11] = 10.0;
        connection[12] = 10.0;
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        assert!(output[4] > 0.0);
        assert!(output[STRIDE + 4] < 0.0);
        assert!(output[bodies.len() + 18] > 0.0);
    }

    #[test]
    fn overload_reports_distinct_bending_and_stretch_failures() {
        let mut bodies = ellipse_record(1.0, 0.0, 0.0, 0.1, 0.1);
        bodies[8] = 5.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[8] = 5.0;
        bodies.extend(second);

        let mut bent = connection_record(0, 1, 2.0);
        bent[12] = 10.0;
        bent[13] = 0.001;
        bent[14] = 1.0e12;
        bent[24] = 1.0;
        bent[25] = 0.1;
        bent[26] = 0.1;
        bent[27] = 1.0;
        bent[ROPE_NODE_DATA_OFFSET + 1] = -1.0;
        let bent_output = step_physics_with_connections(&bodies, &bent, 0.01, 0.0, 0.0);
        assert_eq!(bent_output[bodies.len() + 17], 1.0);

        let mut stretched = connection_record(0, 1, 1.0);
        stretched[12] = 1.1;
        stretched[14] = 1.0;
        let stretched_output = step_physics_with_connections(&bodies, &stretched, 0.01, 0.0, 0.0);
        assert_eq!(stretched_output[bodies.len() + 17], 2.0);
    }

    #[test]
    fn invalid_connection_indices_are_ignored_without_corrupting_bodies() {
        let bodies = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let connection = connection_record(0, 999, 1.0);
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        assert!(all_finite(&output));
        assert_eq!(output.len(), bodies.len() + connection.len());
        assert_eq!(output[2], 0.0);
    }

    #[test]
    fn bound_overlapping_bodies_preserve_relative_transform() {
        let mut bodies = box_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let mut second = box_record(2.0, 0.25, 0.0, 1.0, 1.0);
        second[21] = 100.0;
        second[16] = 20.0;
        bodies.extend(second);
        let mut binding = connection_record(0, 1, 0.25);
        binding[20] = 1.0;
        binding[22] = 0.25;

        let output = step_physics_with_connections(&bodies, &binding, 0.1, 0.0, 0.0);
        let relative = inverse_rotate(
            Vec2::new(
                output[STRIDE + 2] - output[2],
                output[STRIDE + 3] - output[3],
            ),
            output[14],
        );
        let relative_angle = normalize_angle(output[STRIDE + 14] - output[14]);
        assert!(
            (relative.x - 0.25).abs() < 1.0e-5,
            "relative_x={}",
            relative.x
        );
        assert!(relative.y.abs() < 1.0e-5, "relative_y={}", relative.y);
        assert!(
            relative_angle.abs() < 1.0e-5,
            "relative_angle={relative_angle}"
        );
        assert!(all_finite(&output));
    }

    #[test]
    fn rigid_compound_uses_combined_mass_for_external_force() {
        let first = box_record(1.0, 0.0, 0.0, 1.0, 1.0);
        let mut second = box_record(2.0, 0.25, 0.0, 1.0, 1.0);
        second[21] = 100.0;
        let mut bodies = first;
        bodies.extend(second);
        let mut binding = connection_record(0, 1, 0.25);
        binding[20] = 1.0;
        binding[22] = 0.25;

        let output = step_physics_with_connections(&bodies, &binding, 0.1, 0.0, 0.0);
        assert!((output[4] - 5.0).abs() < 1.0e-6, "first vx={}", output[4]);
        assert!(
            (output[STRIDE + 4] - 5.0).abs() < 1.0e-6,
            "second vx={}",
            output[STRIDE + 4]
        );
        assert!((output[15] - output[STRIDE + 15]).abs() < 1.0e-10);
    }

    #[test]
    fn cross_layer_connection_transmits_no_force() {
        let mut first = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        first[4] = -10.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[4] = 10.0;
        second[33] = 2.0;
        first.extend(second);
        let connection = connection_record(0, 1, 2.0);
        let output = step_physics_with_connections(&first, &connection, 0.01, 0.0, 0.0);
        assert!((output[4] + 10.0).abs() < 1.0e-10);
        assert!((output[STRIDE + 4] - 10.0).abs() < 1.0e-10);
    }

    #[test]
    fn physical_string_nodes_receive_gravity_and_return_state() {
        let mut first = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        first.extend(second);
        let mut connection = connection_record(0, 1, 2.0 * 2.0_f64.sqrt());
        connection[24] = 1.0;
        connection[25] = 0.1;
        connection[26] = 0.1;
        connection[27] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET] = 0.0;
        connection[ROPE_NODE_DATA_OFFSET + 1] = 1.0;
        let output = step_physics_with_connections(&first, &connection, 0.02, 9.81, 0.0);
        let connection_offset = first.len();
        assert_eq!(output[connection_offset + 27], 1.0);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 1] < 1.0);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 3] < 0.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn physical_string_node_collides_with_same_layer_body() {
        let mut first = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        let mut floor = box_record(3.0, 0.0, -1.0, 4.0, 1.0);
        floor[9] = 1.0;
        first.extend(second);
        first.extend(floor);
        let mut connection = connection_record(0, 1, 4.1);
        connection[24] = 1.0;
        connection[25] = 0.2;
        connection[26] = 0.1;
        connection[27] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET] = 0.0;
        connection[ROPE_NODE_DATA_OFFSET + 1] = -0.45;
        let output = step_physics_with_connections(&first, &connection, 0.001, 0.0, 0.0);
        let node_y = output[first.len() + ROPE_NODE_DATA_OFFSET + 1];
        assert!(node_y > -0.45, "node_y={node_y}");
        assert!(all_finite(&output));
    }

    #[test]
    fn physical_string_excludes_both_connected_bodies_from_collision() {
        let mut first = ellipse_record(1.0, -1.0, 0.0, 1.5, 1.5);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 1.5, 1.5);
        second[9] = 1.0;
        first.extend(second);
        let mut connection = connection_record(0, 1, 2.0);
        connection[24] = 1.0;
        connection[25] = 0.2;
        connection[26] = 0.1;
        connection[27] = 1.0;
        let output = step_physics_with_connections(&first, &connection, 0.01, 0.0, 0.0);
        let node_offset = first.len() + ROPE_NODE_DATA_OFFSET;
        assert!(output[node_offset].abs() < 1.0e-12);
        assert!(output[node_offset + 1].abs() < 1.0e-12);
        assert!(output[node_offset + 2].abs() < 1.0e-12);
        assert!(output[node_offset + 3].abs() < 1.0e-12);
    }

    #[test]
    fn segment_collision_impulse_reaches_anchor_bodies() {
        let first = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        let mut collider = ellipse_record(3.0, -1.0, -0.3, 0.25, 0.25);
        collider[5] = 10.0;
        let mut bodies = first;
        bodies.extend(second);
        bodies.extend(collider);
        let mut connection = connection_record(0, 1, 4.0);
        connection[24] = 1.0;
        connection[25] = 0.2;
        connection[26] = 0.1;
        connection[27] = 1.0;
        let output = step_physics_with_connections(&bodies, &connection, 0.001, 0.0, 0.0);
        assert!(output[5].abs() > 1.0e-6, "anchor vy={}", output[5]);
        assert!(output[2 * STRIDE + 5] < 10.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn broken_physical_string_keeps_both_fragments_simulated() {
        let mut first = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        first.extend(second);
        let mut connection = connection_record(0, 1, 2.0);
        connection[17] = 2.0;
        connection[24] = 1.0;
        connection[25] = 0.1;
        connection[26] = 0.1;
        connection[27] = 1.0;
        connection[28] = 0.0;
        let output = step_physics_with_connections(&first, &connection, 0.02, 9.81, 0.0);
        let connection_offset = first.len();
        assert_eq!(output[connection_offset + 17], 2.0);
        assert_eq!(output[connection_offset + 28], 0.0);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 3] < 0.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn off_center_rope_anchor_applies_torque() {
        let first = ellipse_record(1.0, -1.0, 0.0, 0.5, 0.5);
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.5, 0.5);
        second[9] = 1.0;
        let mut bodies = first;
        bodies.extend(second);
        let mut connection = connection_record(0, 1, 2.0);
        connection[4] = 1.0;
        connection[24] = 1.0;
        connection[25] = 0.1;
        connection[26] = 0.1;
        connection[27] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET] = 0.5;
        connection[ROPE_NODE_DATA_OFFSET + 1] = 0.5;
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        assert!(output[15].abs() > 1.0e-6, "angular velocity={}", output[15]);
        assert!(all_finite(&output));
    }

    #[test]
    fn multi_node_manual_rope_deforms_under_gravity() {
        let mut first = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        first[9] = 1.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        first.extend(second);
        let mut connection = connection_record(0, 1, 5.0);
        connection[8] = 1.0;
        connection[10] = 300.0;
        connection[24] = 1.0;
        connection[25] = 0.1;
        connection[26] = 0.1;
        connection[27] = 3.0;
        let initial = [(-1.0, 1.0), (0.0, 1.5), (1.0, 1.0)];
        for (index, (x, y)) in initial.iter().enumerate() {
            let offset = ROPE_NODE_DATA_OFFSET + index * 4;
            connection[offset] = *x;
            connection[offset + 1] = *y;
        }
        let output = step_physics_with_connections(&first, &connection, 0.05, 9.81, 0.0);
        let connection_offset = first.len();
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 1] < 1.0);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 5] < 1.5);
        assert!(output[connection_offset + ROPE_NODE_DATA_OFFSET + 9] < 1.0);
        assert!(all_finite(&output));
    }

    #[test]
    fn rope_linear_density_sets_exact_lumped_node_mass() {
        let mut bodies_data = ellipse_record(1.0, -3.0, 0.0, 0.1, 0.1);
        bodies_data.extend(ellipse_record(2.0, 3.0, 0.0, 0.1, 0.1));
        let bodies: Vec<Body> = (0..bodies_data.len() / STRIDE)
            .map(|index| Body::from_data(&bodies_data, index * STRIDE))
            .collect();
        let mut connection = connection_record(0, 1, 6.0);
        connection[24] = 1.0;
        connection[26] = 2.0;
        connection[27] = 3.0;
        let constraint = ConnectionConstraint::from_data(&connection, 0, bodies.len()).unwrap();
        let expected_inverse_mass = 3.0 / (2.0 * 6.0);
        assert!((rope_node_inverse_mass(&constraint) - expected_inverse_mass).abs() < 1.0e-12);
    }

    #[test]
    fn stretchable_rope_stiffness_is_sampling_independent() {
        let mut bodies = ellipse_record(1.0, -1.0, 0.0, 0.1, 0.1);
        bodies[9] = 1.0;
        let mut second = ellipse_record(2.0, 1.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        bodies.extend(second);

        let mut one_node = connection_record(0, 1, 1.0);
        one_node[8] = 1.0;
        one_node[9] = 1.0;
        one_node[10] = 200.0;
        one_node[11] = 0.0;
        one_node[12] = 10.0;
        one_node[24] = 1.0;
        one_node[26] = 0.1;
        one_node[27] = 1.0;

        let mut three_nodes = one_node.clone();
        three_nodes[27] = 3.0;
        for (index, x) in [-0.5, 0.0, 0.5].iter().enumerate() {
            three_nodes[ROPE_NODE_DATA_OFFSET + index * 4] = *x;
        }

        let one_output = step_physics_with_connections(&bodies, &one_node, 1.0e-8, 0.0, 0.0);
        let three_output = step_physics_with_connections(&bodies, &three_nodes, 1.0e-8, 0.0, 0.0);
        let one_tension = one_output[bodies.len() + 18];
        let three_tension = three_output[bodies.len() + 18];
        assert!((one_tension - three_tension).abs() < 1.0e-6);
    }

    #[test]
    fn non_bendable_stretchable_rope_resists_curvature() {
        let mut bodies = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        bodies[9] = 1.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        bodies.extend(second);
        let mut connection = connection_record(0, 1, 5.0);
        connection[8] = 1.0;
        connection[9] = 0.0;
        connection[10] = 0.0;
        connection[11] = 0.0;
        connection[12] = 10.0;
        connection[24] = 1.0;
        connection[26] = 0.1;
        connection[27] = 3.0;
        let initial = [(-1.0, 1.0), (0.0, 1.5), (1.0, 1.0)];
        for (index, (x, y)) in initial.iter().enumerate() {
            let offset = ROPE_NODE_DATA_OFFSET + index * 4;
            connection[offset] = *x;
            connection[offset + 1] = *y;
        }
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        let middle_y = output[bodies.len() + ROPE_NODE_DATA_OFFSET + 5];
        assert!(middle_y < 1.5, "middle_y={middle_y}");
    }

    #[test]
    fn broken_non_bendable_fragments_do_not_recouple_across_gap() {
        let mut bodies = ellipse_record(1.0, -2.0, 0.0, 0.1, 0.1);
        bodies[9] = 1.0;
        let mut second = ellipse_record(2.0, 2.0, 0.0, 0.1, 0.1);
        second[9] = 1.0;
        bodies.extend(second);
        let mut connection = connection_record(0, 1, 4.0);
        connection[8] = 1.0;
        connection[9] = 0.0;
        connection[10] = 0.0;
        connection[11] = 0.0;
        connection[12] = 10.0;
        connection[17] = 2.0;
        connection[24] = 1.0;
        connection[26] = 0.1;
        connection[27] = 2.0;
        connection[28] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET] = -0.5;
        connection[ROPE_NODE_DATA_OFFSET + 1] = 1.0;
        connection[ROPE_NODE_DATA_OFFSET + 4] = 0.5;
        connection[ROPE_NODE_DATA_OFFSET + 5] = -1.0;
        let output = step_physics_with_connections(&bodies, &connection, 0.01, 0.0, 0.0);
        let offset = bodies.len() + ROPE_NODE_DATA_OFFSET;
        assert!((output[offset] + 0.5).abs() < 1.0e-12);
        assert!((output[offset + 1] - 1.0).abs() < 1.0e-12);
        assert!((output[offset + 4] - 0.5).abs() < 1.0e-12);
        assert!((output[offset + 5] + 1.0).abs() < 1.0e-12);
    }

    #[test]
    fn local_gravity_scale_angular_damping_and_manual_inertia_are_bound() {
        let mut body = ellipse_record(1.0, 0.0, 0.0, 1.0, 1.0);
        body[15] = 10.0;
        body[16] = 4.0;
        body[17] = 2.0;
        body[19] = 3.0;
        body[23] = 1.5;
        body[25] = 0.0;
        body[26] = 2.0;
        let output = step_physics(&body, 0.1, 9.0, 0.0);
        assert!((output[5] + 2.1).abs() < 1.0e-10);
        let mut expected_angular_velocity = 10.0;
        for _ in 0..BASE_SUB_STEPS {
            expected_angular_velocity = (expected_angular_velocity
                + 2.0 * 0.1 / BASE_SUB_STEPS as f64)
                * (-3.0 * 0.1 / BASE_SUB_STEPS as f64).exp();
        }
        assert!((output[15] - expected_angular_velocity).abs() < 1.0e-10);
        assert!((output[26] - 2.0).abs() < 1.0e-12);
    }

    #[test]
    fn one_world_unit_remains_one_configured_unit() {
        let mut body = box_record(1.0, 3.0, -4.0, 1.0, 1.0);
        body[4] = 10.0;
        body[5] = -6.0;
        body[24] = 1.0;
        let output = step_physics(&body, 0.25, 0.0, 0.0);
        assert!((output[2] - 5.5).abs() < 1.0e-10, "x={}", output[2]);
        assert!((output[3] + 5.5).abs() < 1.0e-10, "y={}", output[3]);
    }
}
