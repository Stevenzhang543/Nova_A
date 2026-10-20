// 26.43 内部边（ghost collision）处理：相邻静态多边形之间被覆盖的边不再产生侧向法线。
//
// A box sliding over a row of separate static tiles used to hit the hidden side face of the next
// tile: the least-penetration axis at the seam is horizontal, so the box was stopped and thrown
// back and up (measured before 26.43: a box at 3 m/s on 1 m tiles stopped at the first seam with
// |vy| = 1.1 m/s). The same happens to a ball at a tile corner once contacts keep a small overlap.
// Like Box2D chain shapes and Bullet's internal-edge utility, edges of static polygons that are
// covered by a coincident, opposite edge of another static polygon (same layer and mask) are
// marked internal; a contact whose normal points out of such an edge (or out of a corner next to
// one) is dropped: the neighbouring piece reports the real contact on its exposed surface.

/// Covered parameter intervals (0..1 along the edge) per edge, keyed by solver body index.
type EdgeCoverage = HashMap<usize, Vec<Vec<(f64, f64)>>>;

/// A world-space polygon edge: start, end and outward normal.
type StaticEdge = (Vec2, Vec2, Vec2);

/// World-space edges of a static polygon.
fn static_polygon_edges(body: &Body) -> Option<Vec<StaticEdge>> {
    let vertices = world_polygon_vertices(body)?;
    if vertices.len() < 3 {
        return None;
    }
    let centroid = vertices
        .iter()
        .fold(Vec2::ZERO, |sum, vertex| sum.add(*vertex))
        .mul(1.0 / vertices.len() as f64);
    Some(
        (0..vertices.len())
            .map(/* 边的起点、终点与外法线（按质心校正方向）。 */ |index| {
                let start = vertices[index];
                let end = vertices[(index + 1) % vertices.len()];
                let mut normal = outward_edge_normal(&vertices, index);
                if normal.dot(start.add(end).mul(0.5).sub(centroid)) < 0.0 {
                    normal = normal.neg();
                }
                (start, end, normal)
            })
            .collect(),
    )
}

/// Bodies whose primary polygon may own internal edges: static, solid, two-sided.
fn coverage_candidate(body: &Body) -> bool {
    body.is_static && !body.is_sensor && !body.one_way && matches!(body.shape, Shape::Polygon { .. })
}

/// Bit-exact fingerprint of everything that decides static coverage.
fn static_fingerprint(bodies: &[Body]) -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    let mut mix = /* FNV-1a 风格混合。 */ |value: u64| {
        hash ^= value;
        hash = hash.wrapping_mul(0x0100_0000_01b3);
    };
    for (index, body) in bodies.iter().enumerate() {
        if !coverage_candidate(body) {
            continue;
        }
        mix(index as u64);
        mix(body.position.x.to_bits());
        mix(body.position.y.to_bits());
        mix(body.collider_angle().to_bits());
        mix(body.collider_offset.x.to_bits());
        mix(body.collider_offset.y.to_bits());
        mix(u64::from(body.layer) << 32 | u64::from(body.collision_mask));
        if let Shape::Polygon { vertices } = &body.shape {
            for vertex in vertices {
                mix(vertex.x.to_bits());
                mix(vertex.y.to_bits());
            }
        }
    }
    hash
}

/// Finds coincident opposite edges between static polygons (sweep over x, O(n log n + k)).
fn compute_edge_coverage(bodies: &[Body]) -> EdgeCoverage {
    let mut entries: Vec<(usize, Aabb, Vec<StaticEdge>)> = bodies
        .iter()
        .enumerate()
        .filter(|(_, body)| coverage_candidate(body))
        .filter_map(|(index, body)| {
            let edges = static_polygon_edges(body)?;
            Some((index, body.compound_aabb(), edges))
        })
        .collect();
    entries.sort_by(|a, b| a.1.min_x.total_cmp(&b.1.min_x).then(a.0.cmp(&b.0)));
    let mut coverage: EdgeCoverage = HashMap::new();
    for first in 0..entries.len() {
        for second in (first + 1)..entries.len() {
            let (index_a, bounds_a, edges_a) = &entries[first];
            let (index_b, bounds_b, edges_b) = &entries[second];
            let tolerance = 1.0e-6 * (1.0 + bounds_a.max_x.abs().max(bounds_a.max_y.abs()));
            if bounds_b.min_x > bounds_a.max_x + tolerance {
                break;
            }
            if bounds_b.min_y > bounds_a.max_y + tolerance || bounds_b.max_y < bounds_a.min_y - tolerance {
                continue;
            }
            let body_a = &bodies[*index_a];
            let body_b = &bodies[*index_b];
            if body_a.layer != body_b.layer || body_a.collision_mask != body_b.collision_mask {
                continue;
            }
            for (edge_a, (start_a, end_a, normal_a)) in edges_a.iter().enumerate() {
                for (edge_b, (start_b, end_b, normal_b)) in edges_b.iter().enumerate() {
                    if normal_a.dot(*normal_b) > -0.9999 {
                        continue;
                    }
                    if start_b.sub(*start_a).dot(*normal_a).abs() > tolerance
                        || end_b.sub(*start_a).dot(*normal_a).abs() > tolerance
                    {
                        continue;
                    }
                    let overlap = /* 把另一条边投影到本边参数区间并求交。 */ |start: Vec2, end: Vec2, other_start: Vec2, other_end: Vec2| {
                        let direction = end.sub(start);
                        let length_squared = direction.length_squared();
                        if length_squared <= EPSILON {
                            return None;
                        }
                        let t0 = other_start.sub(start).dot(direction) / length_squared;
                        let t1 = other_end.sub(start).dot(direction) / length_squared;
                        let (low, high) = (t0.min(t1).max(0.0), t0.max(t1).min(1.0));
                        (high - low > 1.0e-9).then_some((low, high))
                    };
                    if let Some(interval) = overlap(*start_a, *end_a, *start_b, *end_b) {
                        coverage.entry(*index_a).or_insert_with(|| vec![Vec::new(); edges_a.len()])[edge_a].push(interval);
                    }
                    if let Some(interval) = overlap(*start_b, *end_b, *start_a, *end_a) {
                        coverage.entry(*index_b).or_insert_with(|| vec![Vec::new(); edges_b.len()])[edge_b].push(interval);
                    }
                }
            }
        }
    }
    coverage
}

/// Whether the point (projected onto the edge) lies on a covered part of it.
fn edge_covered_at(intervals: &[(f64, f64)], start: Vec2, end: Vec2, point: Vec2) -> bool {
    let direction = end.sub(start);
    let length_squared = direction.length_squared();
    if intervals.is_empty() || length_squared <= EPSILON {
        return false;
    }
    let slack = 1.0e-3;
    let t = point.sub(start).dot(direction) / length_squared;
    intervals.iter().any(|(low, high)| t >= low - slack && t <= high + slack)
}

/// Decides whether a contact between a moving body and a static polygon is real. A contact whose
/// normal comes out of an internal (covered) face, or out of a corner next to a covered edge, only
/// exists because the static solid is split into pieces: the neighbouring piece produces the real
/// contact on its exposed surface, so this one is dropped (returns false).
///
/// Polygon pairs report exact face normals (separating-axis clipping). For smooth shapes the
/// Voronoi region of the moving body's centre decides between a face and a corner contact.
fn keep_static_contact(
    static_body: &Body,
    coverage: &[Vec<(f64, f64)>],
    moving: &Body,
    manifold: &Manifold,
    static_is_a: bool,
) -> bool {
    let Some(edges) = static_polygon_edges(static_body) else {
        return true;
    };
    if edges.len() != coverage.len() {
        return true;
    }
    let outward = if static_is_a { manifold.normal } else { manifold.normal.neg() };
    let count = edges.len();
    let best = (0..count)
        .max_by(|&a, &b| edges[a].2.dot(outward).total_cmp(&edges[b].2.dot(outward)).then(b.cmp(&a)))
        .unwrap_or(0);
    let covered = /* 某条边在给定点处是否被相邻静态体覆盖。 */ |edge: usize, at: Vec2| {
        edge_covered_at(&coverage[edge], edges[edge].0, edges[edge].1, at)
    };
    let (start, end, _) = edges[best];
    let along = end.sub(start);
    let length_squared = along.length_squared();
    if length_squared <= EPSILON {
        return true;
    }
    let smooth = matches!(moving.shape, Shape::Ellipse { .. });
    let face_contact = if smooth {
        let t = moving.collider_position().sub(start).dot(along) / length_squared;
        (-1.0e-9..=1.0 + 1.0e-9).contains(&t)
    } else {
        edges[best].2.dot(outward) > 1.0 - 1.0e-6
    };
    if face_contact {
        return !covered(best, manifold.point);
    }
    if !smooth {
        // A tilted polygon contact (a rotated face on a corner): use the corner nearest the point.
        let corner = if manifold.point.sub(start).length_squared() <= manifold.point.sub(end).length_squared() { start } else { end };
        let neighbour = if corner == start { (best + count - 1) % count } else { (best + 1) % count };
        return !(covered(best, corner) || covered(neighbour, corner));
    }
    let t = moving.collider_position().sub(start).dot(along) / length_squared;
    let (corner, neighbour) = if t < 0.0 { (start, (best + count - 1) % count) } else { (end, (best + 1) % count) };
    !(covered(best, corner) || covered(neighbour, corner))
}
