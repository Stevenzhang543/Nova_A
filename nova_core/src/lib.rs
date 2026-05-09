use wasm_bindgen::prelude::*;

const STRIDE: usize = 34; 
const EPSILON: f32 = 1e-6;
const ITERATIONS: usize = 10;
const SLOP: f32 = 0.01;
const PERCENT: f32 = 0.2;
const AABB_MARGIN: f32 = 0.1; 

fn dot(vx1: f32, vy1: f32, vx2: f32, vy2: f32) -> f32 { vx1 * vx2 + vy1 * vy2 }
fn cross_s_v(s: f32, vx: f32, vy: f32) -> (f32, f32) { (-s * vy, s * vx) }
fn cross_v_v(vx1: f32, vy1: f32, vx2: f32, vy2: f32) -> f32 { vx1 * vy2 - vy1 * vx2 }
fn safe_normalize(vx: f32, vy: f32) -> (f32, f32) {
    let len_sq = dot(vx, vy, vx, vy);
    if len_sq > EPSILON { let len = len_sq.sqrt(); (vx / len, vy / len) } else { (0.0, 0.0) }
}

// BUGFIX: True OBB projection for SAT collisions
fn project_obb(cx: f32, cy: f32, w: f32, h: f32, theta: f32, axis_x: f32, axis_y: f32) -> (f32, f32) {
    let cos_t = theta.cos(); let sin_t = theta.sin();
    let ux = cos_t * w / 2.0; let uy = sin_t * w / 2.0;
    let vx = -sin_t * h / 2.0; let vy = cos_t * h / 2.0;
    let center_proj = cx * axis_x + cy * axis_y;
    let extents = (ux * axis_x + uy * axis_y).abs() + (vx * axis_x + vy * axis_y).abs();
    (center_proj - extents, center_proj + extents)
}

// BUGFIX: Identifies the exact corner/edge for realistic spinning impulses
fn support_obb(cx: f32, cy: f32, w: f32, h: f32, th: f32, dx: f32, dy: f32) -> (f32, f32) {
    let cos_t = th.cos(); let sin_t = th.sin();
    let l_dx = dx * cos_t + dy * sin_t; let l_dy = -dx * sin_t + dy * cos_t;
    let sx = if l_dx > 0.0 { w / 2.0 } else { -w / 2.0 };
    let sy = if l_dy > 0.0 { h / 2.0 } else { -h / 2.0 };
    (cx + sx * cos_t - sy * sin_t, cy + sx * sin_t + sy * cos_t)
}

struct Contact {
    idx_a: usize, idx_b: usize, nx: f32, ny: f32, overlap: f32,
    r_ap_x: f32, r_ap_y: f32, r_bp_x: f32, r_bp_y: f32,
    e: f32, mu: f32, inv_mass_sum: f32, inv_mass_a: f32, inv_mass_b: f32, inv_inertia_a: f32, inv_inertia_b: f32,
}

struct AABB { idx: usize, min_x: f32, max_x: f32, min_y: f32, max_y: f32 }

#[wasm_bindgen]
pub fn step_physics(input: &[f32], dt: f32, global_gravity: f32, air_friction: f32) -> Vec<f32> {
    let mut data = input.to_vec();
    let count = data.len() / STRIDE;

    // 1. INTEGRATION
    for i in 0..count {
        let idx = i * STRIDE;
        if data[idx + 3] < -100000.0 {
            data[idx + 2] = 0.0; data[idx + 3] = 0.0; data[idx + 4] = 0.0; data[idx + 5] = 0.0; data[idx + 15] = 0.0; 
            continue;
        }

        let is_static = data[idx + 9] > 0.5; let is_kinematic = data[idx + 24] > 0.5;
        data[idx + 29] = 0.0; data[idx + 30] = 0.0; data[idx + 31] = 0.0; data[idx + 32] = 0.0;

        if is_static || is_kinematic { continue; }

        let mass = data[idx + 8]; let gravity_scale = data[idx + 17];
        let force_x = data[idx + 21]; let force_y = data[idx + 22]; let local_gravity = data[idx + 23];
        
        let inv_mass = if mass == 0.0 { 0.0 } else { 1.0 / mass };
        let ax = data[idx + 6] + (force_x * inv_mass);
        let ay = data[idx + 7] - ((global_gravity + local_gravity) * gravity_scale) + (force_y * inv_mass);
        
        data[idx + 4] += ax * dt; data[idx + 5] += ay * dt; 

        let w = data[idx + 12]; let h = data[idx + 13];
        let inertia = if data[idx + 25] > 0.5 { mass * (w*w + h*h) / 12.0 } else { data[idx + 26].max(0.1) };
        let inv_inertia = if inertia == 0.0 { 0.0 } else { 1.0 / inertia };
        let torque = data[idx + 16];
        data[idx + 15] += (torque * inv_inertia) * dt; 

        let lin_damp = data[idx + 18]; let ang_damp = data[idx + 19];
        data[idx + 4] *= 1.0 - (lin_damp * dt).clamp(0.0, 1.0); data[idx + 5] *= 1.0 - (lin_damp * dt).clamp(0.0, 1.0);
        data[idx + 15] *= 1.0 - (ang_damp * dt).clamp(0.0, 1.0);
        data[idx + 4] *= 1.0 - (air_friction * dt).clamp(0.0, 1.0); data[idx + 5] *= 1.0 - (air_friction * dt).clamp(0.0, 1.0);
    }

    // 2. BROAD PHASE
    let mut aabbs = Vec::with_capacity(count);
    for i in 0..count {
        let idx = i * STRIDE;
        let cx = data[idx + 2]; let cy = data[idx + 3];
        let w = data[idx + 12]; let h = data[idx + 13];
        let max_r = (w*w + h*h).sqrt() / 2.0; 
        aabbs.push(AABB {
            idx, min_x: cx - max_r - AABB_MARGIN, max_x: cx + max_r + AABB_MARGIN, min_y: cy - max_r - AABB_MARGIN, max_y: cy + max_r + AABB_MARGIN,
        });
    }
    aabbs.sort_by(|a, b| a.min_x.partial_cmp(&b.min_x).unwrap());

    // 3. NARROW PHASE DETECT COLLISIONS
    let mut contacts = Vec::new();
    for i in 0..count {
        for j in (i + 1)..count {
            let box_a = &aabbs[i]; let box_b = &aabbs[j];
            if box_b.min_x > box_a.max_x { break; }
            if box_a.min_y > box_b.max_y || box_a.max_y < box_b.min_y { continue; }

            let idx_a = box_a.idx; let idx_b = box_b.idx;
            if (data[idx_a + 33] - data[idx_b + 33]).abs() > 0.1 { continue; }

            let static_a = data[idx_a + 9] > 0.5; let static_b = data[idx_b + 9] > 0.5;
            let kin_a = data[idx_a + 24] > 0.5;   let kin_b = data[idx_b + 24] > 0.5;
            if (static_a || kin_a) && (static_b || kin_b) { continue; }

            let type_a = data[idx_a + 1]; let type_b = data[idx_b + 1];
            let cx_a = data[idx_a + 2]; let cy_a = data[idx_a + 3]; let th_a = data[idx_a + 14];
            let cx_b = data[idx_b + 2]; let cy_b = data[idx_b + 3]; let th_b = data[idx_b + 14];
            let w_a = data[idx_a + 12]; let h_a = data[idx_a + 13];
            let w_b = data[idx_b + 12]; let h_b = data[idx_b + 13];

            let mut nx = 0.0; let mut ny = 0.0; let mut overlap = f32::MAX;
            let mut is_colliding = true;

            if type_a == 1.0 && type_b == 1.0 { // Circle vs Circle
                let dx = cx_b - cx_a; let dy = cy_b - cy_a;
                let dist_sq = dx*dx + dy*dy; let r_sum = w_a + w_b; 
                if dist_sq < r_sum * r_sum && dist_sq > EPSILON {
                    let dist = dist_sq.sqrt(); overlap = r_sum - dist; nx = dx / dist; ny = dy / dist;
                } else { is_colliding = false; }
            } else if type_a == 0.0 && type_b == 0.0 { // OBB vs OBB
                let axes = [(th_a.cos(), th_a.sin()), (-th_a.sin(), th_a.cos()), (th_b.cos(), th_b.sin()), (-th_b.sin(), th_b.cos())];
                for &(ax, ay) in &axes {
                    let (min1, max1) = project_obb(cx_a, cy_a, w_a, h_a, th_a, ax, ay);
                    let (min2, max2) = project_obb(cx_b, cy_b, w_b, h_b, th_b, ax, ay);
                    let over = (max1.min(max2)) - (min1.max(min2));
                    if over <= 0.0 { is_colliding = false; break; }
                    if over < overlap {
                        overlap = over; nx = ax; ny = ay;
                        if dot(cx_b - cx_a, cy_b - cy_a, nx, ny) < 0.0 { nx = -nx; ny = -ny; }
                    }
                }
            } else { // Circle vs OBB
                let (c_cx, c_cy, c_r, b_cx, b_cy, b_w, b_h, b_th, is_a_circle) = if type_a == 1.0 { (cx_a, cy_a, w_a, cx_b, cy_b, w_b, h_b, th_b, true) } else { (cx_b, cy_b, w_b, cx_a, cy_a, w_a, h_a, th_a, false) };
                let cos_t = b_th.cos(); let sin_t = b_th.sin();
                let dx = c_cx - b_cx; let dy = c_cy - b_cy;
                let local_x = dx * cos_t + dy * sin_t; let local_y = -dx * sin_t + dy * cos_t;

                let closest_x = local_x.clamp(-b_w/2.0, b_w/2.0);
                let closest_y = local_y.clamp(-b_h/2.0, b_h/2.0);
                
                let mut dist_x = local_x - closest_x; let mut dist_y = local_y - closest_y;
                let mut inside = false;

                // BUGFIX: Safely resolve if circle center is fully trapped inside the box
                if dist_x == 0.0 && dist_y == 0.0 {
                    inside = true;
                    let d_l = (local_x - (-b_w/2.0)).abs(); let d_r = ((b_w/2.0) - local_x).abs();
                    let d_b = (local_y - (-b_h/2.0)).abs(); let d_t = ((b_h/2.0) - local_y).abs();
                    let min_d = d_l.min(d_r).min(d_b).min(d_t);
                    if min_d == d_l { dist_x = -min_d; } else if min_d == d_r { dist_x = min_d; } else if min_d == d_b { dist_y = -min_d; } else { dist_y = min_d; }
                }

                let dist_sq = dist_x*dist_x + dist_y*dist_y;
                if dist_sq < c_r * c_r || inside {
                    let dist = dist_sq.sqrt(); 
                    overlap = if inside { c_r + dist } else { c_r - dist };
                    let local_nx = dist_x / dist; let local_ny = dist_y / dist;
                    nx = local_nx * cos_t - local_ny * sin_t; ny = local_nx * sin_t + local_ny * cos_t;
                    if !is_a_circle { nx = -nx; ny = -ny; }
                } else { is_colliding = false; }
            }

            if is_colliding {
                data[idx_a + 29] += 1.0; data[idx_b + 29] += 1.0;
                data[idx_a + 30] = nx; data[idx_a + 31] = ny; data[idx_a + 32] = overlap;
                data[idx_b + 30] = -nx; data[idx_b + 31] = -ny; data[idx_b + 32] = overlap;

                if data[idx_a + 28] > 0.5 || data[idx_b + 28] > 0.5 { continue; } 

                let mass_a = if static_a || kin_a { f32::INFINITY } else { data[idx_a + 8] };
                let mass_b = if static_b || kin_b { f32::INFINITY } else { data[idx_b + 8] };
                let inertia_a = if data[idx_a + 25] > 0.5 { mass_a * (w_a*w_a + h_a*h_a) / 12.0 } else { data[idx_a + 26].max(0.1) };
                let inertia_b = if data[idx_b + 25] > 0.5 { mass_b * (w_b*w_b + h_b*h_b) / 12.0 } else { data[idx_b + 26].max(0.1) };

                let inv_mass_a = if mass_a == f32::INFINITY { 0.0 } else { 1.0 / mass_a };
                let inv_mass_b = if mass_b == f32::INFINITY { 0.0 } else { 1.0 / mass_b };
                let inv_inertia_a = if mass_a == f32::INFINITY { 0.0 } else { 1.0 / inertia_a };
                let inv_inertia_b = if mass_b == f32::INFINITY { 0.0 } else { 1.0 / inertia_b };

                // BUGFIX: True Geometric Contact Point for precise spinning!
                let r_ap_x; let r_ap_y; let r_bp_x; let r_bp_y;
                if type_a == 1.0 && type_b == 1.0 { 
                    let cp_x = cx_a + nx * w_a; let cp_y = cy_a + ny * w_a;
                    r_ap_x = cp_x - cx_a; r_ap_y = cp_y - cy_a; r_bp_x = cp_x - cx_b; r_bp_y = cp_y - cy_b;
                } else if type_a == 0.0 && type_b == 0.0 { 
                    let (sa_x, sa_y) = support_obb(cx_a, cy_a, w_a, h_a, th_a, nx, ny);
                    let (sb_x, sb_y) = support_obb(cx_b, cy_b, w_b, h_b, th_b, -nx, -ny);
                    let cp_x = (sa_x + sb_x) / 2.0; let cp_y = (sa_y + sb_y) / 2.0;
                    r_ap_x = cp_x - cx_a; r_ap_y = cp_y - cy_a; r_bp_x = cp_x - cx_b; r_bp_y = cp_y - cy_b;
                } else { 
                    if type_a == 1.0 { 
                        let cp_x = cx_a + nx * w_a; let cp_y = cy_a + ny * w_a;
                        r_ap_x = cp_x - cx_a; r_ap_y = cp_y - cy_a; r_bp_x = cp_x - cx_b; r_bp_y = cp_y - cy_b;
                    } else { 
                        let cp_x = cx_b - nx * w_b; let cp_y = cy_b - ny * w_b;
                        r_ap_x = cp_x - cx_a; r_ap_y = cp_y - cy_a; r_bp_x = cp_x - cx_b; r_bp_y = cp_y - cy_b;
                    }
                }

                let cross_a = cross_v_v(r_ap_x, r_ap_y, nx, ny); let cross_b = cross_v_v(r_bp_x, r_bp_y, nx, ny);
                let inv_mass_sum = inv_mass_a + inv_mass_b + (cross_a * cross_a) * inv_inertia_a + (cross_b * cross_b) * inv_inertia_b;

                let rvx = (data[idx_b + 4] - data[idx_b + 15] * r_bp_y) - (data[idx_a + 4] - data[idx_a + 15] * r_ap_y);
                let rvy = (data[idx_b + 5] + data[idx_b + 15] * r_bp_x) - (data[idx_a + 5] + data[idx_a + 15] * r_ap_x);
                let vel_along_normal = dot(rvx, rvy, nx, ny);
                
                let mut e = data[idx_a + 10].max(data[idx_b + 10]);
                let threshold = data[idx_a + 27].max(data[idx_b + 27]);
                if vel_along_normal.abs() < threshold { e = 0.0; }

                let mu = (data[idx_a + 11] + data[idx_b + 11]) / 2.0;

                contacts.push(Contact {
                    idx_a, idx_b, nx, ny, overlap, r_ap_x, r_ap_y, r_bp_x, r_bp_y,
                    e, mu, inv_mass_sum, inv_mass_a, inv_mass_b, inv_inertia_a, inv_inertia_b
                });
            }
        }
    }

    // 4. RESOLVE VELOCITIES
    for _ in 0..ITERATIONS {
        for c in &contacts {
            let (v_ax, v_ay, w_a) = (data[c.idx_a + 4], data[c.idx_a + 5], data[c.idx_a + 15]);
            let (v_bx, v_by, w_b) = (data[c.idx_b + 4], data[c.idx_b + 5], data[c.idx_b + 15]);

            let (cross_wb_x, cross_wb_y) = cross_s_v(w_b, c.r_bp_x, c.r_bp_y);
            let (cross_wa_x, cross_wa_y) = cross_s_v(w_a, c.r_ap_x, c.r_ap_y);
            let rv_x = (v_bx + cross_wb_x) - (v_ax + cross_wa_x);
            let rv_y = (v_by + cross_wb_y) - (v_ay + cross_wa_y);

            let vel_along_normal = dot(rv_x, rv_y, c.nx, c.ny);
            if vel_along_normal > 0.0 { continue; }

            let j = -(1.0 + c.e) * vel_along_normal / c.inv_mass_sum;
            let impulse_x = j * c.nx; let impulse_y = j * c.ny;

            data[c.idx_a + 4] -= impulse_x * c.inv_mass_a; data[c.idx_a + 5] -= impulse_y * c.inv_mass_a;
            data[c.idx_a + 15] -= cross_v_v(c.r_ap_x, c.r_ap_y, impulse_x, impulse_y) * c.inv_inertia_a;
            data[c.idx_b + 4] += impulse_x * c.inv_mass_b; data[c.idx_b + 5] += impulse_y * c.inv_mass_b;
            data[c.idx_b + 15] += cross_v_v(c.r_bp_x, c.r_bp_y, impulse_x, impulse_y) * c.inv_inertia_b;

            let (v_ax2, v_ay2, w_a2) = (data[c.idx_a + 4], data[c.idx_a + 5], data[c.idx_a + 15]);
            let (v_bx2, v_by2, w_b2) = (data[c.idx_b + 4], data[c.idx_b + 5], data[c.idx_b + 15]);
            let (cross_wb_x2, cross_wb_y2) = cross_s_v(w_b2, c.r_bp_x, c.r_bp_y);
            let (cross_wa_x2, cross_wa_y2) = cross_s_v(w_a2, c.r_ap_x, c.r_ap_y);
            let rv_x2 = (v_bx2 + cross_wb_x2) - (v_ax2 + cross_wa_x2);
            let rv_y2 = (v_by2 + cross_wb_y2) - (v_ay2 + cross_wa_y2);

            let vn = dot(rv_x2, rv_y2, c.nx, c.ny);
            let tx = rv_x2 - vn * c.nx; let ty = rv_y2 - vn * c.ny;
            let (tx, ty) = safe_normalize(tx, ty);

            let cross_a_t = cross_v_v(c.r_ap_x, c.r_ap_y, tx, ty);
            let cross_b_t = cross_v_v(c.r_bp_x, c.r_bp_y, tx, ty);
            let inv_mass_sum_t = c.inv_mass_a + c.inv_mass_b + (cross_a_t * cross_a_t) * c.inv_inertia_a + (cross_b_t * cross_b_t) * c.inv_inertia_b;

            if inv_mass_sum_t > EPSILON {
                let mut jt = -dot(rv_x2, rv_y2, tx, ty) / inv_mass_sum_t;
                jt = jt.clamp(-c.mu * j, c.mu * j);
                let fric_x = jt * tx; let fric_y = jt * ty;

                data[c.idx_a + 4] -= fric_x * c.inv_mass_a; data[c.idx_a + 5] -= fric_y * c.inv_mass_a;
                data[c.idx_a + 15] -= cross_v_v(c.r_ap_x, c.r_ap_y, fric_x, fric_y) * c.inv_inertia_a;
                data[c.idx_b + 4] += fric_x * c.inv_mass_b; data[c.idx_b + 5] += fric_y * c.inv_mass_b;
                data[c.idx_b + 15] += cross_v_v(c.r_bp_x, c.r_bp_y, fric_x, fric_y) * c.inv_inertia_b;
            }
        }
    }

    // 5. INTEGRATE POSITIONS & BAUMGARTE
    for i in 0..count {
        let idx = i * STRIDE;
        if data[idx + 9] > 0.5 { continue; } 
        data[idx + 2] += data[idx + 4] * dt; data[idx + 3] += data[idx + 5] * dt; data[idx + 14] += data[idx + 15] * dt; 
    }

    for c in &contacts {
        let correction_mag = (c.overlap - SLOP).max(0.0) * PERCENT;
        let total_inv = c.inv_mass_a + c.inv_mass_b;
        if total_inv > EPSILON {
            let cx = (correction_mag / total_inv) * c.nx; let cy = (correction_mag / total_inv) * c.ny;
            data[c.idx_a + 2] -= cx * c.inv_mass_a; data[c.idx_a + 3] -= cy * c.inv_mass_a;
            data[c.idx_b + 2] += cx * c.inv_mass_b; data[c.idx_b + 3] += cy * c.inv_mass_b;
        }
    }

    data
}