// 刚体内部表示：形状支撑点、惯性、复合碰撞体、积分、冲量与休眠。
#[derive(Clone, Debug)]
enum Shape {
    /// 26.45: a convex polygon rounded by `radius` (0 = sharp corners). Two vertices with a radius
    /// form a true capsule (Box2D v3 style rounded shapes): smooth caps, flat sides.
    Polygon { vertices: Vec<Vec2>, radius: f64 },
    Ellipse { radius_x: f64, radius_y: f64 },
}

// 26.45: capsule with the given full width and height: a segment along the long axis rounded by half
// the short side. A capsule as wide as it is tall is a circle.
fn capsule_shape(width: f64, height: f64) -> Shape {
    let width = width.max(MIN_DIMENSION);
    let height = height.max(MIN_DIMENSION);
    let radius = (width.min(height) * 0.5).max(MIN_DIMENSION * 0.5);
    let vertical = height >= width;
    let straight = ((if vertical { height } else { width }) * 0.5 - radius).max(0.0);
    if straight <= MIN_DIMENSION * 0.5 {
        return Shape::Ellipse { radius_x: radius, radius_y: radius };
    }
    let (start, end) = if vertical {
        (Vec2::new(0.0, -straight), Vec2::new(0.0, straight))
    } else {
        (Vec2::new(-straight, 0.0), Vec2::new(straight, 0.0))
    };
    Shape::Polygon { vertices: vec![start, end], radius }
}

// 26.45: sharp polygon.
fn sharp_polygon(vertices: Vec<Vec2>) -> Shape {
    Shape::Polygon { vertices, radius: 0.0 }
}

#[derive(Clone, Debug)]
struct ColliderChild {
    id: u32,
    shape: Shape,
    offset: Vec2,
    angle_offset: f64,
    is_sensor: bool,
    layer: u32,
    collision_mask: u32,
    one_way: bool,
    one_way_normal: Vec2,
}

impl Shape {
    // 在给定世界方向求形状最远支撑点；椭圆使用解析解，多边形遍历顶点。
    fn support(&self, position: Vec2, angle: f64, direction: Vec2) -> Vec2 {
        let direction = direction.normalized_or(Vec2::new(1.0, 0.0));
        match self {
            Self::Polygon { vertices, radius } => {
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
                let core = position.add(rotate(best, angle));
                if *radius > 0.0 { core.add(direction.mul(*radius)) } else { core }
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

    // 计算椭圆或多边形面积，多边形使用有向边叉积的绝对值。
    fn area(&self) -> f64 {
        match self {
            Self::Ellipse { radius_x, radius_y } => std::f64::consts::PI * radius_x * radius_y,
            Self::Polygon { vertices, radius } => {
                let mut twice_area = 0.0;
                let mut perimeter = 0.0;
                for index in 0..vertices.len() {
                    let next = vertices[(index + 1) % vertices.len()];
                    twice_area += vertices[index].cross(next);
                    perimeter += next.sub(vertices[index]).length();
                }
                let core = twice_area.abs() * 0.5;
                if *radius > 0.0 {
                    core + perimeter * radius + std::f64::consts::PI * radius * radius
                } else {
                    core
                }
            }
        }
    }

    // 根据形状和质量计算转动惯量，并限制为最小正惯量。
    fn inertia(&self, mass: f64) -> f64 {
        match self {
            Self::Ellipse { radius_x, radius_y } => {
                mass * (radius_x * radius_x + radius_y * radius_y) * 0.25
            }
            Self::Polygon { vertices, radius } if *radius > 0.0 && vertices.len() == 2 => {
                // 26.45: capsule (Box2D b2ComputeCapsuleMass): a box between two half circles,
                // about the segment's midpoint, then moved to the shape's origin.
                let (start, end) = (vertices[0], vertices[1]);
                let length = end.sub(start).length();
                let box_area = 2.0 * radius * length;
                let circle_area = std::f64::consts::PI * radius * radius;
                let density = mass / (box_area + circle_area).max(MIN_AREA);
                let (box_mass, circle_mass) = (density * box_area, density * circle_area);
                let half = 0.5 * length;
                let circle_offset = 4.0 * radius / (3.0 * std::f64::consts::PI);
                let circle_inertia = circle_mass * (0.5 * radius * radius + half * half + 2.0 * half * circle_offset);
                let box_inertia = box_mass * (4.0 * radius * radius + length * length) / 12.0;
                let center = start.add(end).mul(0.5);
                circle_inertia + box_inertia + mass * center.length_squared()
            }
            Self::Polygon { vertices, radius } if *radius > 0.0 => {
                // Rounded polygon: the polygon with its corners pushed out by the radius
                // (Box2D's approximation), with the same mass.
                let count = vertices.len();
                let inflated: Vec<Vec2> = (0..count)
                    .map(|index| {
                        let previous = vertices[(index + count - 1) % count];
                        let current = vertices[index];
                        let next = vertices[(index + 1) % count];
                        let edge_in = current.sub(previous);
                        let edge_out = next.sub(current);
                        let outward = Vec2::new(edge_in.y, -edge_in.x).normalized_or(Vec2::ZERO)
                            .add(Vec2::new(edge_out.y, -edge_out.x).normalized_or(Vec2::ZERO))
                            .normalized_or(Vec2::ZERO);
                        // Winding may be either way: push away from the centroid.
                        let centroid = vertices.iter().fold(Vec2::ZERO, |sum, vertex| sum.add(*vertex)).mul(1.0 / count as f64);
                        let outward = if outward.dot(current.sub(centroid)) < 0.0 { outward.neg() } else { outward };
                        current.add(outward.mul(std::f64::consts::SQRT_2 * radius))
                    })
                    .collect();
                sharp_polygon(inflated).inertia(mass)
            }
            Self::Polygon { vertices, .. } => {
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

    // 提取用于连续碰撞步数估计的最小特征尺寸。
    fn characteristic_extent(&self) -> f64 {
        match self {
            Self::Ellipse { radius_x, radius_y } => radius_x.min(*radius_y),
            Self::Polygon { vertices, radius } if vertices.len() == 2 => *radius,
            Self::Polygon { vertices, radius } => {
                let mut minimum_edge = f64::INFINITY;
                for index in 0..vertices.len() {
                    let edge = vertices[(index + 1) % vertices.len()].sub(vertices[index]);
                    minimum_edge = minimum_edge.min(edge.length());
                }
                minimum_edge * 0.5 + radius
            }
        }
        .max(MIN_DIMENSION)
    }

    // 计算轴对齐边界范围，供宽相筛选和查询使用。
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
            Self::Polygon { vertices, radius } => {
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
                if *radius > 0.0 {
                    aabb.min_x -= radius;
                    aabb.max_x += radius;
                    aabb.min_y -= radius;
                    aabb.max_y += radius;
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
    auto_inertia: bool,
    collider_children: Vec<ColliderChild>,
    /// 26.45: conveyor speed of this body's surfaces (m/s): each face carries what touches it along
    /// the face, clockwise around the body for positive speeds (the top face moves to +x).
    tangent_speed: f64,
    /// 26.45: rolling resistance coefficient (Box2D v3.1); slows rolling circles and capsules.
    rolling_resistance: f64,
}

impl Body {
    // 26.45: radius used for rolling resistance (round shapes only).
    fn rolling_radius(&self) -> f64 {
        match &self.shape {
            Shape::Ellipse { radius_x, radius_y } => radius_x.min(*radius_y),
            Shape::Polygon { radius, .. } => *radius,
        }
    }

    // 读取稳定扁平 ABI 中的刚体字段，清理非法值并构造形状、质量和运动状态。
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
            // 26.45: a true capsule (rounded segment) instead of the 12-sided approximation.
            capsule_shape(scale_width, scale_height)
        } else if shape_code == 3 {
            // A zero-area mathematical segment cannot produce a stable contact
            // manifold.  Nova_A therefore models it as a finite, explicitly
            // sized segment whose minor axis is never below MIN_DIMENSION.
            let half_width = scale_width.max(MIN_DIMENSION) * 0.5;
            let half_height = scale_height.max(MIN_DIMENSION) * 0.5;
            sharp_polygon(vec![
                Vec2::new(-half_width, -half_height),
                Vec2::new(half_width, -half_height),
                Vec2::new(half_width, half_height),
                Vec2::new(-half_width, half_height),
            ])
        } else {
            let mut vertices = Vec::new();
            for vertex_index in 0..4 {
                let vertex = Vec2::new(
                    finite_or(data[data_index + 34 + vertex_index * 2], 0.0),
                    finite_or(data[data_index + 35 + vertex_index * 2], 0.0),
                );
                if !vertices.iter().any(/* 判断 existing . sub (vertex) . length_squared () <= EPSILON * EPSILON 是否成立，供过滤或有效性检查使用。 */ |existing: &Vec2| {
                    existing.sub(vertex).length_squared() <= EPSILON * EPSILON
                }) {
                    vertices.push(vertex);
                }
            }
            let mut vertices = convex_hull(vertices);
            if vertices.len() < 3
                || sharp_polygon(vertices.clone()).area() <= MIN_AREA
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
            sharp_polygon(vertices)
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
            auto_inertia,
            collider_children: Vec::new(),
            tangent_speed: 0.0,
            rolling_resistance: 0.0,
        }
    }

    // 读取并规范复合碰撞体子形状，同时更新质量与惯性相关数据。
    fn apply_collider_children(&mut self, data: &[f64]) {
        self.collider_children.clear();
        for record in data.chunks_exact(COLLIDER_CHILD_STRIDE).take(128) {
            let shape_code = finite_or(record[1], 0.0).round() as i32;
            let width = positive(record[5].abs(), 1.0);
            let height = positive(record[6].abs(), 1.0);
            let shape = if shape_code == 1 {
                Shape::Ellipse { radius_x: width * 0.5, radius_y: height * 0.5 }
            } else if shape_code == 2 {
                capsule_shape(width, height)
            } else if shape_code == 3 {
                let half_width = width.max(MIN_DIMENSION) * 0.5;
                let half_height = height.max(MIN_DIMENSION) * 0.5;
                sharp_polygon(vec![
                    Vec2::new(-half_width, -half_height), Vec2::new(half_width, -half_height),
                    Vec2::new(half_width, half_height), Vec2::new(-half_width, half_height),
                ])
            } else {
                let mut vertices = Vec::new();
                for vertex_index in 0..4 {
                    let vertex = Vec2::new(finite_or(record[10 + vertex_index * 2], 0.0), finite_or(record[11 + vertex_index * 2], 0.0));
                    if !vertices.iter().any(/* 判断 existing . sub (vertex) . length_squared () <= EPSILON * EPSILON 是否成立，供过滤或有效性检查使用。 */ |existing: &Vec2| existing.sub(vertex).length_squared() <= EPSILON * EPSILON) { vertices.push(vertex); }
                }
                let mut vertices = convex_hull(vertices);
                if vertices.len() < 3 || sharp_polygon(vertices.clone()).area() <= MIN_AREA {
                    let half_width = width * 0.5; let half_height = height * 0.5;
                    vertices = vec![Vec2::new(-half_width, -half_height), Vec2::new(half_width, -half_height), Vec2::new(half_width, half_height), Vec2::new(-half_width, half_height)];
                }
                sharp_polygon(vertices)
            };
            self.collider_children.push(ColliderChild {
                id: finite_or(record[0], 0.0).round().clamp(0.0, u32::MAX as f64) as u32,
                shape,
                offset: Vec2::new(finite_or(record[2], 0.0), finite_or(record[3], 0.0)),
                angle_offset: normalize_angle(record[4]),
                is_sensor: record[7] > 0.5,
                layer: finite_or(record[8], 0.0).round().clamp(0.0, 31.0) as u32,
                collision_mask: finite_or(record[9], 0.0).round().clamp(0.0, u32::MAX as f64) as u32,
                one_way: record[18] > 0.5,
                one_way_normal: Vec2::new(finite_or(record[19], 0.0), finite_or(record[20], 1.0)).normalized_or(Vec2::new(0.0, 1.0)),
            });
        }
        if self.auto_inertia && !self.collider_children.is_empty() {
            let primary_area = if self.is_sensor { 0.0 } else { self.shape.area() };
            let total_area = primary_area + self.collider_children.iter().filter(/* 计算并返回 ! child . is_sensor，用于当前 apply_collider_children 流程。 */ |child| !child.is_sensor).map(/* 计算并返回 child . shape . area ()，用于当前 apply_collider_children 流程。 */ |child| child.shape.area()).sum::<f64>();
            if total_area > MIN_AREA {
                let primary_mass = self.mass * primary_area / total_area;
                let mut inertia = if primary_mass > 0.0 { self.shape.inertia(primary_mass) + primary_mass * self.collider_offset.length_squared() } else { 0.0 };
                for child in self.collider_children.iter().filter(/* 计算并返回 ! child . is_sensor，用于当前 apply_collider_children 流程。 */ |child| !child.is_sensor) {
                    let child_mass = self.mass * child.shape.area() / total_area;
                    inertia += child.shape.inertia(child_mass) + child_mass * child.offset.length_squared();
                }
                self.inertia = inertia.max(MIN_INERTIA);
                self.inv_inertia = if !self.is_static && !self.is_kinematic && !self.freeze_rotation { 1.0 / self.inertia } else { 0.0 };
            }
        }
    }

    // 构造某个子碰撞体的查询代理，保留所属刚体运动信息。
    fn collider_proxy(&self, child_index: Option<usize>) -> Self {
        let mut proxy = self.clone();
        proxy.collider_children.clear();
        if let Some(child) = child_index.and_then(/* 按 self . collider_children . get (index) 读取或转换可选值，保留转换失败分支。 */ |index| self.collider_children.get(index)) {
            proxy.shape = child.shape.clone();
            proxy.collider_offset = child.offset;
            proxy.collider_angle_offset = child.angle_offset;
            proxy.is_sensor = child.is_sensor;
            proxy.layer = child.layer;
            proxy.collision_mask = child.collision_mask;
            proxy.one_way = child.one_way;
            proxy.one_way_normal = child.one_way_normal;
        }
        proxy
    }

    // 返回选定子碰撞体的稳定标识；根形状使用默认标识。
    fn child_id(&self, child_index: Option<usize>) -> u32 {
        child_index.and_then(/* 按 self . collider_children . get (index) 读取或转换可选值，保留转换失败分支。 */ |index| self.collider_children.get(index)).map_or(0, /* 返回当前快照值 child . id。 */ |child| child.id)
    }

    // 合并根形状及所有子形状的世界轴对齐边界。
    fn compound_aabb(&self) -> Aabb {
        let mut bounds = self.shape.aabb(self.collider_position(), self.collider_angle());
        for index in 0..self.collider_children.len() {
            let child = self.collider_proxy(Some(index));
            let child_bounds = child.shape.aabb(child.collider_position(), child.collider_angle());
            bounds.min_x = bounds.min_x.min(child_bounds.min_x); bounds.max_x = bounds.max_x.max(child_bounds.max_x);
            bounds.min_y = bounds.min_y.min(child_bounds.min_y); bounds.max_y = bounds.max_y.max(child_bounds.max_y);
        }
        bounds
    }

    // 返回全部碰撞形状中最小的特征尺寸。
    fn minimum_collider_extent(&self) -> f64 {
        self.collider_children.iter().fold(self.shape.characteristic_extent(), /* 计算并返回 extent . min (child . shape . characteristic_extent ())，用于当前 minimum_collider_extent 流程。 */ |extent, child| extent.min(child.shape.characteristic_extent()))
    }

    // 求相对刚体原点最远的碰撞形状半径，用于旋转连续碰撞。
    fn maximum_collider_radius(&self) -> f64 {
        let primary = self.collider_offset.length() + self.shape.aabb(Vec2::ZERO, 0.0).max_x.abs().max(self.shape.aabb(Vec2::ZERO, 0.0).max_y.abs());
        self.collider_children.iter().fold(primary, /* 累计子形状相对原点的最远外包半径，计入子形状偏移。 */ |radius, child| {
            let bounds = child.shape.aabb(Vec2::ZERO, 0.0);
            radius.max(child.offset.length() + bounds.max_x.abs().max(bounds.min_x.abs()).max(bounds.max_y.abs()).max(bounds.min_y.abs()))
        }).max(MIN_DIMENSION)
    }

    // 将局部碰撞偏移旋转后叠加到刚体世界位置。
    fn collider_position(&self) -> Vec2 {
        self.position.add(rotate(self.collider_offset, self.angle))
    }

    // 合并刚体旋转与碰撞体局部角度偏移。
    fn collider_angle(&self) -> f64 {
        normalize_angle(self.angle + self.collider_angle_offset)
    }

    // 根据层和碰撞掩码判断两个刚体是否允许接触。
    fn can_collide_with(&self, other: &Self) -> bool {
        (self.collision_mask & (1_u32 << other.layer)) != 0
            && (other.collision_mask & (1_u32 << self.layer)) != 0
    }

    // 根据单向法线和相对位置判断是否接收该接触。
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

    // 26.44 Soft Step: velocity and position are integrated separately in each substep (forces,
    // gravity and damping first, then the solver, then positions from the solved velocity).
    // 按时间步积分力、重力和阻尼到速度；静态与休眠刚体不动。
    fn integrate_velocity(&mut self, dt: f64, global_gravity: f64, air_friction: f64) {
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
        self.velocity = self.velocity.finite_or(Vec2::ZERO);
        if self.freeze_rotation {
            self.angular_velocity = 0.0;
        }
        self.angular_velocity = finite_or(self.angular_velocity, 0.0);
    }

    // 用已求解的速度推进位置与角度。
    fn integrate_position(&mut self, dt: f64) {
        if self.is_static || self.sleeping {
            return;
        }
        let previous_position = self.position;
        self.position = self
            .position
            .add(self.velocity.mul(dt))
            .finite_or(previous_position);
        if self.freeze_rotation {
            self.angular_velocity = 0.0;
        } else {
            self.angle = normalize_angle(self.angle + self.angular_velocity * dt);
        }
    }

    // 计算刚体上偏移点的线速度，包含角速度贡献。
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

    // 把冲量转换为线速度和角速度变化，并遵守刚体运动约束。
    fn apply_impulse(&mut self, impulse: Vec2, radius: Vec2) {
        if self.inv_mass <= 0.0 {
            return;
        }
        self.velocity = self.velocity.add(impulse.mul(self.inv_mass));
        self.angular_velocity += radius.cross(impulse) * self.inv_inertia;
        // 26.43: solver impulses do not reset sleep here. The support impulse that holds a
        // resting body against gravity used to wake it every substep, so nothing ever slept.
        // A sleeping body that is hit gains velocity and its island wakes at the end of the step
        // (synchronize_sleep_islands); commands from scripts wake bodies through their records.
    }

    // 依据速度阈值和持续时间更新休眠状态（测试用：以当前速度作为运动量）。
    #[cfg(test)]
    fn update_sleep_state(
        &mut self,
        dt: f64,
        _has_contact: bool,
        linear_threshold: f64,
        angular_threshold: f64,
        time_to_sleep: f64,
    ) {
        let (linear_speed, angular_speed) = (self.velocity.length(), self.angular_velocity.abs());
        self.update_sleep_with_motion(dt, linear_speed, angular_speed, linear_threshold, angular_threshold, time_to_sleep);
    }

    // 26.44: sleep from the motion actually made over the step. With Soft Step the velocity left
    // by the relax pass can carry tiny residuals in large stacks while the bodies do not move;
    // the step's displacement is the better measure of rest.
    fn update_sleep_with_motion(
        &mut self,
        dt: f64,
        linear_speed: f64,
        angular_speed: f64,
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
        let slow = linear_speed <= linear_threshold && angular_speed <= angular_threshold;
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

