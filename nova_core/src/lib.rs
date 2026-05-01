use wasm_bindgen::prelude::*;

const STRIDE: usize = 27;
const EPSILON: f32 = 1e-6;
const ITERATIONS: usize = 10;
const SLOP: f32 = 0.01;
const PERCENT: f32 = 0.2;

// --- VECTOR HELPERS ---
fn dot(vx1: f32, vy1: f32, vx2: f32, vy2: f32) -> f32 {
    vx1 * vx2 + vy1 * vy2
}

fn cross_s_v(s: f32, vx: f32, vy: f32) -> (f32, f32) {
    (-s * vy, s * vx)
}

fn cross_v_v(vx1: f32, vy1: f32, vx2: f32, vy2: f32) -> f32 {
    vx1 * vy2 - vy1 * vx2
}

fn safe_normalize(vx: f32, vy: f32) -> (f32, f32) {
    let len_sq = dot(vx, vy, vx, vy);
    if len_sq > EPSILON {
        let len = len_sq.sqrt();
        (vx / len, vy / len)
    } else {
        (0.0, 0.0)
    }
}

// --- DATA STRUCTURES ---
struct Contact {
    idx_a: usize,
    idx_b: usize,
    nx: f32,
    ny: f32,
    overlap: f32,
    r_ap_x: f32,
    r_ap_y: f32,
    r_bp_x: f32,
    r_bp_y: f32,
    e: f32,
    mu: f32,
    inv_mass_sum: f32,
    inv_mass_a: f32,
    inv_mass_b: f32,
    inv_inertia_a: f32,
    inv_inertia_b: f32,
}

#[wasm_bindgen]
pub fn step_physics(input: &[f32], dt: f32, _global_gravity: f32, air_friction: f32) -> Vec<f32> {
    let mut data = input.to_vec();
    let count = data.len() / STRIDE;

    // ==========================================
    // 1. INTEGRATE VELOCITIES (v = v + a * dt)
    // ==========================================
    for i in 0..count {
        let idx = i * STRIDE;
        
        // Teleport Plane Safety (Unchanged)
        if data[idx + 3] < -120.0 {
            data[idx + 2] = 0.0; data[idx + 3] = 0.0; 
            data[idx + 4] = 0.0; data[idx + 5] = 0.0; data[idx + 15] = 0.0; 
            continue;
        }

        let is_static = data[idx + 9] > 0.5;
        let is_kinematic = data[idx + 24] > 0.5;
        if is_static || is_kinematic { continue; }

        let mass = data[idx + 8];
        let gravity_scale = data[idx + 17];
        let force_x = data[idx + 21];
        let force_y = data[idx + 22];
        let local_gravity = data[idx + 23];
        
        let inv_mass = if mass == 0.0 { 0.0 } else { 1.0 / mass };

        // Linear (a = F * invMass)
        let ax = data[idx + 6] + (force_x * inv_mass);
        let ay = data[idx + 7] - (local_gravity * gravity_scale) + (force_y * inv_mass);
        data[idx + 4] += ax * dt; 
        data[idx + 5] += ay * dt; 

        // Angular (alpha = Torque * invInertia)
        let w = data[idx + 12]; let h = data[idx + 13];
        let inertia = if data[idx + 25] > 0.5 { mass * (w*w + h*h) / 12.0 } else { data[idx + 26].max(0.1) };
        let inv_inertia = if inertia == 0.0 { 0.0 } else { 1.0 / inertia };
        let torque = data[idx + 16];
        data[idx + 15] += (torque * inv_inertia) * dt; 

        // Damping
        let lin_damp = data[idx + 18];
        let ang_damp = data[idx + 19];
        data[idx + 4] *= 1.0 - (lin_damp * dt).clamp(0.0, 1.0);
        data[idx + 5] *= 1.0 - (lin_damp * dt).clamp(0.0, 1.0);
        data[idx + 15] *= 1.0 - (ang_damp * dt).clamp(0.0, 1.0);
        
        data[idx + 4] *= 1.0 - (air_friction * dt).clamp(0.0, 1.0);
        data[idx + 5] *= 1.0 - (air_friction * dt).clamp(0.0, 1.0);
    }

    // ==========================================
    // 2. DETECT COLLISIONS
    // ==========================================
    let mut contacts = Vec::new();

    for i in 0..count {
        for j in (i + 1)..count {
            let idx_a = i * STRIDE;
            let idx_b = j * STRIDE;

            let static_a = data[idx_a + 9] > 0.5; let static_b = data[idx_b + 9] > 0.5;
            let kin_a = data[idx_a + 24] > 0.5;   let kin_b = data[idx_b + 24] > 0.5;

            if (static_a || kin_a) && (static_b || kin_b) { continue; }

            let type_a = data[idx_a + 1]; let type_b = data[idx_b + 1];
            let w_a = data[idx_a + 12]; let h_a = data[idx_a + 13];
            let w_b = data[idx_b + 12]; let h_b = data[idx_b + 13];

            let cx_a = data[idx_a + 2]; let cy_a = data[idx_a + 3];
            let cx_b = data[idx_b + 2]; let cy_b = data[idx_b + 3];

            let r_a = if type_a == 1.0 { w_a } else { (w_a*w_a + h_a*h_a).sqrt() / 2.0 };
            let r_b = if type_b == 1.0 { w_b } else { (w_b*w_b + h_b*h_b).sqrt() / 2.0 };

            let dx = cx_b - cx_a; let dy = cy_b - cy_a;
            let dist_sq = dot(dx, dy, dx, dy);
            let radius_sum = r_a + r_b;

            if dist_sq < radius_sum * radius_sum && dist_sq > EPSILON {
                let dist = dist_sq.sqrt();
                let overlap = radius_sum - dist;
                let (nx, ny) = safe_normalize(dx, dy);

                let mass_a = if static_a || kin_a { f32::INFINITY } else { data[idx_a + 8] };
                let mass_b = if static_b || kin_b { f32::INFINITY } else { data[idx_b + 8] };
                
                let inertia_a = if data[idx_a + 25] > 0.5 { mass_a * (w_a*w_a + h_a*h_a) / 12.0 } else { data[idx_a + 26].max(0.1) };
                let inertia_b = if data[idx_b + 25] > 0.5 { mass_b * (w_b*w_b + h_b*h_b) / 12.0 } else { data[idx_b + 26].max(0.1) };

                let inv_mass_a = if mass_a == f32::INFINITY { 0.0 } else { 1.0 / mass_a };
                let inv_mass_b = if mass_b == f32::INFINITY { 0.0 } else { 1.0 / mass_b };
                let inv_inertia_a = if mass_a == f32::INFINITY { 0.0 } else { 1.0 / inertia_a };
                let inv_inertia_b = if mass_b == f32::INFINITY { 0.0 } else { 1.0 / inertia_b };

                let r_ap_x = nx * r_a; let r_ap_y = ny * r_a;
                let r_bp_x = -nx * r_b; let r_bp_y = -ny * r_b;

                let cross_a = cross_v_v(r_ap_x, r_ap_y, nx, ny);
                let cross_b = cross_v_v(r_bp_x, r_bp_y, nx, ny);
                let inv_mass_sum = inv_mass_a + inv_mass_b + (cross_a * cross_a) * inv_inertia_a + (cross_b * cross_b) * inv_inertia_b;

                let e = data[idx_a + 10].max(data[idx_b + 10]);
                let mu = (data[idx_a + 11] + data[idx_b + 11]) / 2.0; // Average Dynamic Friction

                contacts.push(Contact {
                    idx_a, idx_b, nx, ny, overlap,
                    r_ap_x, r_ap_y, r_bp_x, r_bp_y,
                    e, mu, inv_mass_sum,
                    inv_mass_a, inv_mass_b, inv_inertia_a, inv_inertia_b
                });
            }
        }
    }

    // ==========================================
    // 3. RESOLVE VELOCITIES (Iterative Impulse)
    // ==========================================
    for _ in 0..ITERATIONS {
        for c in &contacts {
            let (v_ax, v_ay, w_a) = (data[c.idx_a + 4], data[c.idx_a + 5], data[c.idx_a + 15]);
            let (v_bx, v_by, w_b) = (data[c.idx_b + 4], data[c.idx_b + 5], data[c.idx_b + 15]);

            // Relative Velocity: rv = (vB + cross(wB, rB)) - (vA + cross(wA, rA))
            let (cross_wb_x, cross_wb_y) = cross_s_v(w_b, c.r_bp_x, c.r_bp_y);
            let (cross_wa_x, cross_wa_y) = cross_s_v(w_a, c.r_ap_x, c.r_ap_y);
            
            let rv_x = (v_bx + cross_wb_x) - (v_ax + cross_wa_x);
            let rv_y = (v_by + cross_wb_y) - (v_ay + cross_wa_y);

            let vel_along_normal = dot(rv_x, rv_y, c.nx, c.ny);

            // Skip if separating
            if vel_along_normal > 0.0 { continue; }

            // Normal Impulse
            let j = -(1.0 + c.e) * vel_along_normal / c.inv_mass_sum;
            let impulse_x = j * c.nx;
            let impulse_y = j * c.ny;

            data[c.idx_a + 4] -= impulse_x * c.inv_mass_a;
            data[c.idx_a + 5] -= impulse_y * c.inv_mass_a;
            data[c.idx_a + 15] -= cross_v_v(c.r_ap_x, c.r_ap_y, impulse_x, impulse_y) * c.inv_inertia_a;

            data[c.idx_b + 4] += impulse_x * c.inv_mass_b;
            data[c.idx_b + 5] += impulse_y * c.inv_mass_b;
            data[c.idx_b + 15] += cross_v_v(c.r_bp_x, c.r_bp_y, impulse_x, impulse_y) * c.inv_inertia_b;

            // Friction Impulse
            // Recalculate rv after normal impulse
            let (v_ax2, v_ay2, w_a2) = (data[c.idx_a + 4], data[c.idx_a + 5], data[c.idx_a + 15]);
            let (v_bx2, v_by2, w_b2) = (data[c.idx_b + 4], data[c.idx_b + 5], data[c.idx_b + 15]);
            let (cross_wb_x2, cross_wb_y2) = cross_s_v(w_b2, c.r_bp_x, c.r_bp_y);
            let (cross_wa_x2, cross_wa_y2) = cross_s_v(w_a2, c.r_ap_x, c.r_ap_y);
            let rv_x2 = (v_bx2 + cross_wb_x2) - (v_ax2 + cross_wa_x2);
            let rv_y2 = (v_by2 + cross_wb_y2) - (v_ay2 + cross_wa_y2);

            let vn = dot(rv_x2, rv_y2, c.nx, c.ny);
            let tx = rv_x2 - vn * c.nx;
            let ty = rv_y2 - vn * c.ny;
            let (tx, ty) = safe_normalize(tx, ty);

            let cross_a_t = cross_v_v(c.r_ap_x, c.r_ap_y, tx, ty);
            let cross_b_t = cross_v_v(c.r_bp_x, c.r_bp_y, tx, ty);
            let inv_mass_sum_t = c.inv_mass_a + c.inv_mass_b + (cross_a_t * cross_a_t) * c.inv_inertia_a + (cross_b_t * cross_b_t) * c.inv_inertia_b;

            if inv_mass_sum_t > EPSILON {
                let mut jt = -dot(rv_x2, rv_y2, tx, ty) / inv_mass_sum_t;
                
                // Coulomb Friction Clamp
                jt = jt.clamp(-c.mu * j, c.mu * j);

                let friction_impulse_x = jt * tx;
                let friction_impulse_y = jt * ty;

                data[c.idx_a + 4] -= friction_impulse_x * c.inv_mass_a;
                data[c.idx_a + 5] -= friction_impulse_y * c.inv_mass_a;
                data[c.idx_a + 15] -= cross_v_v(c.r_ap_x, c.r_ap_y, friction_impulse_x, friction_impulse_y) * c.inv_inertia_a;

                data[c.idx_b + 4] += friction_impulse_x * c.inv_mass_b;
                data[c.idx_b + 5] += friction_impulse_y * c.inv_mass_b;
                data[c.idx_b + 15] += cross_v_v(c.r_bp_x, c.r_bp_y, friction_impulse_x, friction_impulse_y) * c.inv_inertia_b;
            }
        }
    }

    // ==========================================
    // 4. INTEGRATE POSITIONS (x = x + v * dt)
    // ==========================================
    for i in 0..count {
        let idx = i * STRIDE;
        if data[idx + 9] > 0.5 { continue; } // Skip Static

        data[idx + 2] += data[idx + 4] * dt; 
        data[idx + 3] += data[idx + 5] * dt; 
        data[idx + 14] += data[idx + 15] * dt; 
    }

    // ==========================================
    // 5. POSITIONAL CORRECTION (Baumgarte)
    // ==========================================
    for c in &contacts {
        let correction_mag = (c.overlap - SLOP).max(0.0) * PERCENT;
        // Prevent division by zero if both are somehow infinite mass
        let total_inv = c.inv_mass_a + c.inv_mass_b;
        if total_inv > EPSILON {
            let correction_x = (correction_mag / total_inv) * c.nx;
            let correction_y = (correction_mag / total_inv) * c.ny;

            data[c.idx_a + 2] -= correction_x * c.inv_mass_a;
            data[c.idx_a + 3] -= correction_y * c.inv_mass_a;
            data[c.idx_b + 2] += correction_x * c.inv_mass_b;
            data[c.idx_b + 3] += correction_y * c.inv_mass_b;
        }
    }

    // ==========================================
    // 6. CLEAR FORCES
    // ==========================================
    for i in 0..count {
        let idx = i * STRIDE;
        data[idx + 21] = 0.0; // Force X
        data[idx + 22] = 0.0; // Force Y
        data[idx + 16] = 0.0; // Torque
    }

    data
}