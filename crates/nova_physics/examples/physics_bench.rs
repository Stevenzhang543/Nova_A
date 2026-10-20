//! 26.43 physics benchmark and stability report.
//!
//! Runs fixed scenes through the public `PhysicsWorld` API and prints one JSON line per scene:
//! time per step, stability (drift, penetration, sleeping) and correctness (tunnelling, contact
//! flicker). Used to compare solver changes before and after; nothing here is a pass/fail test.
//!
//! `cargo run --release -p nova_physics --example physics_bench [-- --quick]`
use std::time::Instant;

use nova_physics::{PhysicsEvent, PhysicsWorld, STRIDE};

/// Flat body record (same layout as the editor/WASM ABI): a box or an ellipse.
fn record(shape: u8, x: f64, y: f64, width: f64, height: f64, is_static: bool) -> Vec<f64> {
    let mut values = vec![0.0; STRIDE];
    values[1] = shape as f64;
    values[2] = x;
    values[3] = y;
    values[8] = 1.0;
    values[9] = if is_static { 1.0 } else { 0.0 };
    values[11] = 0.6; // dynamic friction
    values[20] = 0.6; // static friction
    values[12] = width;
    values[13] = height;
    values[17] = 1.0; // gravity scale
    values[25] = 1.0; // automatic inertia
    values[27] = 1.0; // restitution threshold
    values[33] = 0.0; // layer
    values[42] = u32::MAX as f64; // mask
    values[48] = 1.0; // sleeping allowed
    let (hw, hh) = (width * 0.5, height * 0.5);
    for (index, (vx, vy)) in [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
        .iter()
        .enumerate()
    {
        values[34 + index * 2] = *vx;
        values[35 + index * 2] = *vy;
    }
    values
}

struct Scene {
    world: PhysicsWorld,
    dynamic: Vec<(u32, f64, f64)>,
}

fn balanced(world: &mut PhysicsWorld) {
    // The editor's "Balanced" profile: 8 substeps, 20 velocity and 16 position iterations.
    world.set_quality_iterations(8, 20, 16, 0.001, 0.001, 0.5);
}

fn pyramid(base: u32) -> Scene {
    let mut world = PhysicsWorld::new();
    balanced(&mut world);
    world
        .create_body(1, 0, &record(0, 0.0, -0.5, 400.0, 1.0, true))
        .unwrap();
    let mut dynamic = Vec::new();
    let mut handle = 2;
    for row in 0..base {
        let count = base - row;
        for column in 0..count {
            let x = (column as f64 - (count as f64 - 1.0) * 0.5) * 1.05;
            let y = 0.5 + row as f64 * 1.0;
            world
                .create_body(handle, handle, &record(0, x, y, 1.0, 1.0, false))
                .unwrap();
            dynamic.push((handle, x, y));
            handle += 1;
        }
    }
    Scene { world, dynamic }
}

fn tower(height: u32) -> Scene {
    let mut world = PhysicsWorld::new();
    balanced(&mut world);
    world
        .create_body(1, 0, &record(0, 0.0, -0.5, 40.0, 1.0, true))
        .unwrap();
    let mut dynamic = Vec::new();
    for level in 0..height {
        let handle = 2 + level;
        let y = 0.5 + level as f64;
        world
            .create_body(handle, handle, &record(0, 0.0, y, 1.0, 1.0, false))
            .unwrap();
        dynamic.push((handle, 0.0, y));
    }
    Scene { world, dynamic }
}

/// A tile level: rows of 1 x 1 static tiles (as baked TileMap collision) and falling boxes.
fn tiles(columns: u32, rows: u32, boxes: u32) -> Scene {
    let mut world = PhysicsWorld::new();
    balanced(&mut world);
    let mut handle = 1;
    for row in 0..rows {
        for column in 0..columns {
            let x = column as f64 - columns as f64 * 0.5;
            let y = -0.5 - row as f64;
            world
                .create_body(handle, handle, &record(0, x, y, 1.0, 1.0, true))
                .unwrap();
            handle += 1;
        }
    }
    let mut dynamic = Vec::new();
    for index in 0..boxes {
        let x = (index % 20) as f64 * 1.5 - 15.0;
        let y = 2.0 + (index / 20) as f64 * 1.5;
        world
            .create_body(handle, handle, &record(0, x, y, 0.9, 0.9, false))
            .unwrap();
        dynamic.push((handle, x, y));
        handle += 1;
    }
    Scene { world, dynamic }
}

fn run(name: &str, mut scene: Scene, seconds: f64, rate: f64) -> String {
    let steps = (seconds * rate).round() as usize;
    let dt = 1.0 / rate;
    let mut started = 0usize;
    let mut ended = 0usize;
    let mut max_penetration: f64 = 0.0;
    let mut times = Vec::with_capacity(steps);
    for step in 0..steps {
        let begin = Instant::now();
        scene.world.step(dt, 9.80665, 0.0);
        times.push(begin.elapsed().as_secs_f64() * 1000.0);
        for event in scene.world.drain_events() {
            match event {
                // Initial contacts are expected; count changes after the first second.
                PhysicsEvent::ContactStarted(_) if step as f64 * dt > 1.0 => started += 1,
                PhysicsEvent::ContactEnded(_) if step as f64 * dt > 1.0 => ended += 1,
                PhysicsEvent::ContactStayed(contact) | PhysicsEvent::ContactStarted(contact)
                    if step + 1 == steps && !contact.sensor =>
                {
                    max_penetration = max_penetration.max(contact.penetration)
                }
                _ => {}
            }
        }
    }
    let state = scene.world.state();
    let mut max_drift: f64 = 0.0;
    let mut max_drop: f64 = 0.0;
    let mut awake = 0;
    // Bodies are stored in handle order; dynamic records are the non-static ones in order.
    let dynamic_records: Vec<usize> = (0..state.len() / STRIDE)
        .map(|body| body * STRIDE)
        .filter(|&base| state[base + 9] < 0.5)
        .collect();
    for (base, (_, x0, y0)) in dynamic_records.iter().zip(&scene.dynamic) {
        max_drift = max_drift.max((state[base + 2] - x0).abs());
        max_drop = max_drop.max(y0 - state[base + 3]);
        if state[base + 49] < 0.5 {
            awake += 1;
        }
    }
    times.sort_by(|a, b| a.total_cmp(b));
    let mean = times.iter().sum::<f64>() / times.len().max(1) as f64;
    let p95 = times[((times.len() as f64 - 1.0) * 0.95).round() as usize];
    format!(
        "{{\"scene\":\"{name}\",\"bodies\":{},\"steps\":{steps},\"meanMs\":{mean:.4},\"p95Ms\":{p95:.4},\"maxDrift\":{max_drift:.5},\"maxDrop\":{max_drop:.5},\"maxPenetration\":{max_penetration:.5},\"awake\":{awake},\"contactStartsAfter1s\":{started},\"contactEndsAfter1s\":{ended},\"checksum\":{}}}",
        scene.dynamic.len(),
        scene.world.state_checksum()
    )
}

/// Fast continuous circles fired at a thin static wall; reports how many passed through.
fn bullets(speed: f64) -> String {
    let mut world = PhysicsWorld::new();
    balanced(&mut world);
    let mut wall = record(0, 0.0, 0.0, 0.05, 40.0, true);
    wall[11] = 0.0;
    wall[20] = 0.0;
    world.create_body(1, 0, &wall).unwrap();
    let count = 16;
    for index in 0..count {
        let mut bullet = record(
            1,
            -3.0 - index as f64 * 0.37,
            -15.0 + index as f64 * 2.0,
            0.1,
            0.1,
            false,
        );
        bullet[4] = speed;
        bullet[17] = 0.0; // no gravity
        bullet[47] = 1.0; // continuous collision
        world.create_body(2 + index, 2 + index, &bullet).unwrap();
    }
    let begin = Instant::now();
    let steps = 60;
    for _ in 0..steps {
        world.step(1.0 / 60.0, 9.80665, 0.0);
        world.drain_events();
    }
    let elapsed = begin.elapsed().as_secs_f64() * 1000.0 / steps as f64;
    let state = world.state();
    let through = (1..=count as usize)
        .filter(|body| state[body * STRIDE + 2] > 0.2)
        .count();
    format!("{{\"scene\":\"bullets-{speed}\",\"bodies\":{count},\"meanMs\":{elapsed:.4},\"tunnelled\":{through}}}")
}

fn main() {
    let quick = std::env::args().any(|argument| argument == "--quick");
    let seconds = if quick { 2.0 } else { 6.0 };
    println!("{}", run("tower-10", tower(10), seconds, 60.0));
    println!("{}", run("pyramid-10", pyramid(10), seconds, 60.0));
    println!("{}", run("pyramid-20", pyramid(20), seconds, 60.0));
    println!("{}", run("tiles-60x6+60", tiles(60, 6, 60), seconds, 60.0));
    println!("{}", run("box-rest", tower(1), seconds, 120.0));
    for speed in [50.0, 300.0, 2000.0] {
        println!("{}", bullets(speed));
    }
}
