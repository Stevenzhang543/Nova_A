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

