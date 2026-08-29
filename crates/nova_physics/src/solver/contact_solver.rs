#[derive(Clone, Debug)]
struct Contact {
    body_a: usize,
    body_b: usize,
    normal: Vec2,
    tangent: Vec2,
    depth: f64,
    radius_a: Vec2,
    radius_b: Vec2,
    initial_relative_velocity: Vec2,
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
    let (effective_inverse_mass, cross_a, cross_b) = {
        let a = &bodies[contact.body_a];
        let b = &bodies[contact.body_b];
        let cross_a = contact.radius_a.cross(contact.normal);
        let cross_b = contact.radius_b.cross(contact.normal);
        (
            a.inv_mass
                + b.inv_mass
                + cross_a * cross_a * a.inv_inertia
                + cross_b * cross_b * b.inv_inertia,
            cross_a,
            cross_b,
        )
    };
    if effective_inverse_mass <= 0.0 {
        return;
    }
    let correction_magnitude =
        ((contact.depth - POSITION_SLOP).max(0.0) * POSITION_CORRECTION * contact.position_weight)
            / effective_inverse_mass;
    let correction = contact.normal.mul(correction_magnitude);
    let (a, b) = two_bodies_mut(bodies, contact.body_a, contact.body_b);
    a.position = a
        .position
        .sub(correction.mul(a.inv_mass))
        .finite_or(a.position);
    a.angle = normalize_angle(a.angle - cross_a * correction_magnitude * a.inv_inertia);
    b.position = b
        .position
        .add(correction.mul(b.inv_mass))
        .finite_or(b.position);
    b.angle = normalize_angle(b.angle + cross_b * correction_magnitude * b.inv_inertia);
}

