// 窄相碰撞：通过 GJK/EPA 和多边形裁剪产生接触流形。
#[derive(Clone, Copy, Debug)]
struct SupportPoint {
    point: Vec2,
    point_a: Vec2,
    point_b: Vec2,
}

// 取得两个形状在相反方向的支撑点，组成闵可夫斯基差支撑点。
fn minkowski_support(body_a: &Body, body_b: &Body, direction: Vec2) -> SupportPoint {
    let direction = direction.normalized_or(Vec2::new(1.0, 0.0));
    let point_a = body_a
        .shape
        .support(body_a.collider_position(), body_a.collider_angle(), direction);
    let point_b = body_b
        .shape
        .support(body_b.collider_position(), body_b.collider_angle(), direction.neg());
    SupportPoint {
        point: point_a.sub(point_b),
        point_a,
        point_b,
    }
}

// 缩减 GJK 单纯形并更新搜索方向，判断是否包围原点。
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

// 迭代支撑点检测凸形状相交，退化或未相交时返回空值。
fn gjk(body_a: &Body, body_b: &Body) -> Option<Vec<SupportPoint>> {
    let mut direction = body_b
        .collider_position()
        .sub(body_a.collider_position())
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
            .any(/* 判断 existing . point . sub (point . point) . length_squared () <= EPSILON * EPSILON 是否成立，供过滤或有效性检查使用。 */ |existing| existing.point.sub(point.point).length_squared() <= EPSILON * EPSILON)
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
    /// Penetration depth. 26.44: negative for a speculative contact (the shapes are still apart
    /// by -depth); only `collide_speculative` produces those.
    depth: f64,
    point: Vec2,
    /// 26.44: identity of the contact feature (reference edge, incident edge, clip point), stable
    /// while the same faces touch, so warm starting survives contact reordering.
    feature: u32,
}

// 从最接近原点的边插值得到接触点、法线和穿透深度。
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
        feature: 0,
    }
}

// 扩展相交多面体以估计最小穿透方向和接触流形。
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

    let center_direction = body_b.collider_position().sub(body_a.collider_position());
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
            || polytope.iter().any(/* 判断 existing . point . sub (support . point) . length_squared () <= EPSILON * EPSILON 是否成立，供过滤或有效性检查使用。 */ |existing| {
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

    best_edge.map(/* 计算并返回 manifold_from_edge (start , end , normal , depth , center_direction)，用于当前 epa 流程。 */ |(start, end, normal, depth)| {
        manifold_from_edge(start, end, normal, depth, center_direction)
    })
}

// 组合 GJK 与 EPA，为一般凸形状生成接触结果。
fn collide_gjk(body_a: &Body, body_b: &Body) -> Option<Manifold> {
    let simplex = gjk(body_a, body_b)?;
    let mut manifold = epa(body_a, body_b, simplex)?;
    if manifold.depth.is_finite() && manifold.depth > 0.0 {
        // 26.43: the EPA edge interpolates support points, and the support point of a flat
        // polygon face is one of its corners. Against a long box (ground, wall) the contact point
        // then lay far from the ellipse (20 m away on a 40 m wall), the huge lever arm turned the
        // contact impulse into spin, and fast balls passed through. A smooth shape's deepest point
        // is exact: take the contact point from the ellipse side.
        let normal = manifold.normal;
        let half_depth = normal.mul(manifold.depth * 0.5);
        if matches!(body_a.shape, Shape::Ellipse { .. }) {
            let deepest = body_a
                .shape
                .support(body_a.collider_position(), body_a.collider_angle(), normal);
            manifold.point = deepest.sub(half_depth);
        } else if matches!(body_b.shape, Shape::Ellipse { .. }) {
            let deepest = body_b
                .shape
                .support(body_b.collider_position(), body_b.collider_angle(), normal.neg());
            manifold.point = deepest.add(half_depth);
        }
        Some(manifold)
    } else {
        None
    }
}

// 将多边形局部顶点转换到世界空间；非多边形返回空值。
fn world_polygon_vertices(body: &Body) -> Option<Vec<Vec2>> {
    let Shape::Polygon { vertices } = &body.shape else {
        return None;
    };
    Some(
        vertices
            .iter()
            .map(/* 计算并返回 body . collider_position () . add (rotate (* vertex , body . collider_angle ()))，用于当前 world_polygon_vertices 流程。 */ |vertex| body.collider_position().add(rotate(*vertex, body.collider_angle())))
            .collect(),
    )
}

// 把全部顶点投影到给定轴，返回投影最小值与最大值。
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

// 计算多边形指定边的外法线。
fn outward_edge_normal(vertices: &[Vec2], index: usize) -> Vec2 {
    let edge = vertices[(index + 1) % vertices.len()].sub(vertices[index]);
    Vec2::new(edge.y, -edge.x).normalized_or(Vec2::new(1.0, 0.0))
}

// 根据半平面裁剪线段，保留内部端点并插入交点。26.44: 每个点带特征号（入射顶点或裁剪平面），
// 同一对面接触时保持不变，供热启动识别同一接触点。
fn clip_segment_to_plane(points: &[(Vec2, u32)], normal: Vec2, offset: f64, plane_feature: u32) -> Vec<(Vec2, u32)> {
    if points.len() < 2 {
        return Vec::new();
    }
    let first_distance = points[0].0.dot(normal) - offset;
    let second_distance = points[1].0.dot(normal) - offset;
    let mut clipped = Vec::with_capacity(2);
    if first_distance <= 0.0 {
        clipped.push(points[0]);
    }
    if second_distance <= 0.0 {
        clipped.push(points[1]);
    }
    if first_distance * second_distance < 0.0 {
        let interpolation = first_distance / (first_distance - second_distance);
        clipped.push((points[0].0.add(points[1].0.sub(points[0].0).mul(interpolation)), plane_feature));
    }
    clipped.truncate(2);
    clipped
}

// 使用分离轴和参考边裁剪产生多边形接触点集合。
fn polygon_manifolds(body_a: &Body, body_b: &Body) -> Option<Vec<Manifold>> {
    polygon_manifolds_within(body_a, body_b, 0.0)
}

// 26.44: SAT with a speculative margin. Polygons up to `margin` apart still produce clip points
// (negative depth), so the solver can stop an approaching body exactly at the surface.
fn polygon_manifolds_within(body_a: &Body, body_b: &Body, margin: f64) -> Option<Vec<Manifold>> {
    let vertices_a = world_polygon_vertices(body_a)?;
    let vertices_b = world_polygon_vertices(body_b)?;
    let center_direction = body_b.collider_position().sub(body_a.collider_position());
    let margin = margin.max(0.0);
    // Best (least overlapping) axis of each polygon.
    let mut best = [(f64::INFINITY, Vec2::new(1.0, 0.0)); 2];
    for (slot, vertices) in [&vertices_a, &vertices_b].into_iter().enumerate() {
        for edge_index in 0..vertices.len() {
            let mut axis = outward_edge_normal(vertices, edge_index);
            let (minimum_a, maximum_a) = project_polygon(&vertices_a, axis);
            let (minimum_b, maximum_b) = project_polygon(&vertices_b, axis);
            let overlap = maximum_a.min(maximum_b) - minimum_a.max(minimum_b);
            if overlap <= -margin || (margin == 0.0 && overlap <= 0.0) {
                return None;
            }
            if axis.dot(center_direction) < 0.0 {
                axis = axis.neg();
            }
            if overlap < best[slot].0 {
                best[slot] = (overlap, axis);
            }
        }
    }
    // 26.44: prefer A's face unless B's is clearly better (as Box2D does), so the reference face
    // does not flip between equal faces from step to step (that lost warm starting and jittered
    // stacks of equal boxes).
    let reference_is_a = best[1].0 >= best[0].0 - 0.1 * LINEAR_SLOP;
    let (minimum_overlap, collision_normal) = if reference_is_a { best[0] } else { best[1] };

    let (reference_vertices, incident_vertices, reference_normal) = if reference_is_a {
        (&vertices_a, &vertices_b, collision_normal)
    } else {
        (&vertices_b, &vertices_a, collision_normal.neg())
    };

    let reference_edge_index = (0..reference_vertices.len()).max_by(/* 比较参考多边形各边法线在接触法线上的投影，选择参考边。 */ |left, right| {
        outward_edge_normal(reference_vertices, *left)
            .dot(reference_normal)
            .total_cmp(&outward_edge_normal(reference_vertices, *right).dot(reference_normal))
    })?;
    let incident_edge_index = (0..incident_vertices.len()).min_by(/* 比较入射多边形各边法线在接触法线上的投影，选择入射边。 */ |left, right| {
        outward_edge_normal(incident_vertices, *left)
            .dot(reference_normal)
            .total_cmp(&outward_edge_normal(incident_vertices, *right).dot(reference_normal))
    })?;

    let reference_start = reference_vertices[reference_edge_index];
    let reference_end = reference_vertices[(reference_edge_index + 1) % reference_vertices.len()];
    let tangent = reference_end
        .sub(reference_start)
        .normalized_or(reference_normal.perp());
    // Feature numbers: 1 and 2 are the incident edge's vertices, 3 and 4 the clip planes at the
    // reference edge's start and end.
    let incident_segment = [
        (incident_vertices[incident_edge_index], 1),
        (incident_vertices[(incident_edge_index + 1) % incident_vertices.len()], 2),
    ];

    let clipped_to_start = clip_segment_to_plane(
        &incident_segment,
        tangent.neg(),
        -tangent.dot(reference_start),
        3,
    );
    let clipped = clip_segment_to_plane(&clipped_to_start, tangent, tangent.dot(reference_end), 4);
    let reference_offset = reference_normal.dot(reference_start);
    let mut manifolds = Vec::with_capacity(2);
    let feature_base = ((reference_edge_index as u32 & 0xff) << 16)
        | ((incident_edge_index as u32 & 0xff) << 8)
        | if reference_is_a { 0 } else { 0x0100_0000 };
    for (point, point_feature) in clipped {
        let separation = point.dot(reference_normal) - reference_offset;
        if separation <= margin {
            manifolds.push(Manifold {
                normal: collision_normal,
                depth: if separation <= 0.0 { (-separation).min(minimum_overlap.max(0.0)) } else { -separation },
                point: point.sub(reference_normal.mul(separation * 0.5)),
                feature: feature_base | point_feature,
            });
        }
    }

    if manifolds.is_empty() {
        None
    } else {
        Some(manifolds)
    }
}

// 26.44: 以参考多边形的指定面为参考面裁剪入射多边形（内部边修正用）。法线固定为该面的外法线，
// 点的分离量沿该法线测量；保留分离量不超过 margin 的点。reference_is_a 决定法线方向约定（A 指向 B）。
fn polygon_face_manifolds(reference: &Body, face: usize, incident: &Body, margin: f64, reference_is_a: bool) -> Vec<Manifold> {
    let (Some(reference_vertices), Some(incident_vertices)) = (world_polygon_vertices(reference), world_polygon_vertices(incident)) else {
        return Vec::new();
    };
    if reference_vertices.len() < 3 || incident_vertices.len() < 3 || face >= reference_vertices.len() {
        return Vec::new();
    }
    // Outward normals corrected by the centroid, so either winding works.
    let outward = |vertices: &[Vec2], index: usize| {
        let centroid = vertices.iter().fold(Vec2::ZERO, |sum, vertex| sum.add(*vertex)).mul(1.0 / vertices.len() as f64);
        let start = vertices[index];
        let end = vertices[(index + 1) % vertices.len()];
        let normal = outward_edge_normal(vertices, index);
        if normal.dot(start.add(end).mul(0.5).sub(centroid)) < 0.0 { normal.neg() } else { normal }
    };
    let normal = outward(&reference_vertices, face);
    let incident_edge = (0..incident_vertices.len())
        .min_by(|left, right| outward(&incident_vertices, *left).dot(normal).total_cmp(&outward(&incident_vertices, *right).dot(normal)))
        .unwrap_or(0);
    let start = reference_vertices[face];
    let end = reference_vertices[(face + 1) % reference_vertices.len()];
    let tangent = end.sub(start).normalized_or(normal.perp());
    let segment = [
        (incident_vertices[incident_edge], 1),
        (incident_vertices[(incident_edge + 1) % incident_vertices.len()], 2),
    ];
    let clipped = clip_segment_to_plane(&segment, tangent.neg(), -tangent.dot(start), 3);
    let clipped = clip_segment_to_plane(&clipped, tangent, tangent.dot(end), 4);
    let offset = normal.dot(start);
    let feature_base = 0x0200_0000 | ((face as u32 & 0xff) << 16) | ((incident_edge as u32 & 0xff) << 8) | if reference_is_a { 0 } else { 0x0100_0000 };
    clipped
        .into_iter()
        .filter_map(|(point, point_feature)| {
            let separation = point.dot(normal) - offset;
            (separation <= margin.max(0.0)).then(|| Manifold {
                normal: if reference_is_a { normal } else { normal.neg() },
                depth: -separation,
                point: point.sub(normal.mul(separation * 0.5)),
                feature: feature_base | point_feature,
            })
        })
        .collect()
}

// 26.44: GJK distance between separated convex shapes: closest points on A and B and their
// distance; None when the shapes overlap (then EPA gives the penetration).
fn gjk_distance(body_a: &Body, body_b: &Body) -> Option<(Vec2, Vec2, f64)> {
    let initial = body_a
        .collider_position()
        .sub(body_b.collider_position())
        .normalized_or(Vec2::new(1.0, 0.0));
    let mut simplex: Vec<(SupportPoint, f64)> = vec![(minkowski_support(body_a, body_b, initial.neg()), 1.0)];
    let mut closest = simplex[0].0.point;
    for _ in 0..40 {
        let distance_squared = closest.length_squared();
        if distance_squared <= EPSILON * EPSILON {
            return None;
        }
        let candidate = minkowski_support(body_a, body_b, closest.neg());
        // No further progress toward the origin: `closest` is the distance vector.
        if distance_squared - closest.dot(candidate.point) <= 1.0e-10 * distance_squared.max(1.0e-12) {
            break;
        }
        if simplex.iter().any(|(existing, _)| existing.point.sub(candidate.point).length_squared() <= EPSILON * EPSILON) {
            break;
        }
        simplex.push((candidate, 0.0));
        closest = reduce_simplex(&mut simplex)?;
    }
    let mut point_a = Vec2::ZERO;
    let mut point_b = Vec2::ZERO;
    for (support, weight) in &simplex {
        point_a = point_a.add(support.point_a.mul(*weight));
        point_b = point_b.add(support.point_b.mul(*weight));
    }
    let distance = point_b.sub(point_a).length();
    if !distance.is_finite() || distance <= EPSILON {
        return None;
    }
    Some((point_a, point_b, distance))
}

// 把单纯形缩减为离原点最近的子单纯形并写入重心坐标；原点在三角形内（重叠）时返回 None。
fn reduce_simplex(simplex: &mut Vec<(SupportPoint, f64)>) -> Option<Vec2> {
    let segment = |a: SupportPoint, b: SupportPoint| -> (Vec<(SupportPoint, f64)>, Vec2) {
        let edge = b.point.sub(a.point);
        let length_squared = edge.length_squared();
        let t = if length_squared > EPSILON * EPSILON { (-a.point.dot(edge) / length_squared).clamp(0.0, 1.0) } else { 0.0 };
        let point = a.point.add(edge.mul(t));
        if t <= 0.0 {
            (vec![(a, 1.0)], a.point)
        } else if t >= 1.0 {
            (vec![(b, 1.0)], b.point)
        } else {
            (vec![(a, 1.0 - t), (b, t)], point)
        }
    };
    match simplex.len() {
        1 => {
            simplex[0].1 = 1.0;
            Some(simplex[0].0.point)
        }
        2 => {
            let (reduced, point) = segment(simplex[0].0, simplex[1].0);
            *simplex = reduced;
            Some(point)
        }
        _ => {
            let (a, b, c) = (simplex[0].0, simplex[1].0, simplex[2].0);
            let area = b.point.sub(a.point).cross(c.point.sub(a.point));
            let inside = |p: Vec2, q: Vec2| area * q.sub(p).cross(p.neg()) >= 0.0;
            if area.abs() > EPSILON * EPSILON && inside(a.point, b.point) && inside(b.point, c.point) && inside(c.point, a.point) {
                return None;
            }
            let mut best: Option<(Vec<(SupportPoint, f64)>, Vec2)> = None;
            for (p, q) in [(a, b), (b, c), (c, a)] {
                let candidate = segment(p, q);
                if best.as_ref().map_or(true, |(_, point)| candidate.1.length_squared() < point.length_squared()) {
                    best = Some(candidate);
                }
            }
            let (reduced, point) = best?;
            *simplex = reduced;
            Some(point)
        }
    }
}

// 26.44: contact generation for the solver, with a speculative margin. Pairs up to `margin` apart
// get contacts with negative depth; overlapping pairs are handled exactly like `collide`.
fn collide_speculative(body_a: &Body, body_b: &Body, margin: f64) -> Vec<Manifold> {
    if margin <= 0.0 {
        return collide(body_a, body_b);
    }
    if world_polygon_vertices(body_a).is_some() && world_polygon_vertices(body_b).is_some() {
        return polygon_manifolds_within(body_a, body_b, margin).unwrap_or_default();
    }
    if let Some(manifold) = collide_gjk(body_a, body_b) {
        return vec![manifold];
    }
    match gjk_distance(body_a, body_b) {
        Some((point_a, point_b, distance)) if distance <= margin => {
            let normal = point_b.sub(point_a).mul(1.0 / distance);
            vec![Manifold { normal, depth: -distance, point: point_a.add(point_b).mul(0.5), feature: 0 }]
        }
        _ => Vec::new(),
    }
}

// 优先采用多边形流形路径，否则使用通用凸形状碰撞路径。
fn collide(body_a: &Body, body_b: &Body) -> Vec<Manifold> {
    if let Some(manifolds) = polygon_manifolds(body_a, body_b) {
        return manifolds;
    }
    collide_gjk(body_a, body_b).into_iter().collect()
}

