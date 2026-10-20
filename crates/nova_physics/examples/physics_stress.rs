//! 26.44 random pile stress test for the Soft Step solver.
//!
//! Drops 40–100 random boxes and ellipses (rotated, overlapping at spawn, masses 0.2–8.2 kg) on a
//! floor made of one long box or of 40 separate 1 m tiles, between two walls, and steps each scene
//! for a few seconds with the three quality profiles. A run fails when a body leaves the box (falls
//! through the floor or a wall) or moves faster than 40 m/s, which only an unstable solver does
//! here. The process exits with status 1 when any run fails.
//!
//! Environment: SEEDS=1,2,3 (default 1..=24), PROFILE=fast|balanced|accurate, TILES=0|1 (default:
//! chosen by the seed), SECS=8.
//!
//! Run: cargo run --release -p nova_physics --example physics_stress

use nova_physics::{PhysicsWorld, STRIDE};

/// A body record: shape 0 box (with its four vertices) or 1 ellipse.
#[allow(clippy::too_many_arguments)]
fn record(
    shape: u8,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    is_static: bool,
    mass: f64,
    angle: f64,
) -> Vec<f64> {
    let mut values = vec![0.0; STRIDE];
    values[1] = f64::from(shape);
    values[2] = x;
    values[3] = y;
    values[8] = mass;
    values[9] = if is_static { 1.0 } else { 0.0 };
    values[11] = 0.6;
    values[20] = 0.6;
    values[12] = width;
    values[13] = height;
    values[14] = angle;
    values[17] = 1.0;
    values[25] = 1.0;
    values[27] = 1.0;
    values[42] = f64::from(u32::MAX);
    values[48] = 1.0;
    let (half_width, half_height) = (width * 0.5, height * 0.5);
    let corners = [
        (-half_width, -half_height),
        (half_width, -half_height),
        (half_width, half_height),
        (-half_width, half_height),
    ];
    for (index, (corner_x, corner_y)) in corners.iter().enumerate() {
        values[34 + index * 2] = *corner_x;
        values[35 + index * 2] = *corner_y;
    }
    values
}

/// Xorshift generator, so every seed gives the same scene on every machine.
struct Random(u64);

impl Random {
    fn next(&mut self) -> f64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        (self.0 >> 11) as f64 / (1_u64 << 53) as f64
    }
}

struct Outcome {
    failed_at: Option<usize>,
    worst_speed: f64,
    awake_at_end: usize,
}

fn run(
    seed: u64,
    rate: f64,
    substeps: usize,
    velocity: usize,
    position: usize,
    tiles: Option<bool>,
    seconds: usize,
) -> (bool, usize, Outcome) {
    let mut random = Random(seed * 7919 + 13);
    let mut world = PhysicsWorld::new();
    world.set_quality_iterations(substeps, velocity, position, 0.001, 0.001, 0.5);
    let mut handle = 1_u32;
    let mut add = |world: &mut PhysicsWorld, values: Vec<f64>| {
        world
            .create_body(handle, handle, &values)
            .expect("valid body record");
        handle += 1;
    };
    let tiles = tiles.unwrap_or(random.next() < 0.5);
    if tiles {
        for column in 0..40 {
            add(
                &mut world,
                record(0, f64::from(column) - 20.0, -0.5, 1.0, 1.0, true, 1.0, 0.0),
            );
        }
    } else {
        add(&mut world, record(0, 0.0, -0.5, 60.0, 1.0, true, 1.0, 0.0));
    }
    add(
        &mut world,
        record(0, -20.5, 10.0, 1.0, 20.0, true, 1.0, 0.0),
    );
    add(&mut world, record(0, 19.5, 10.0, 1.0, 20.0, true, 1.0, 0.0));
    let count = 40 + (random.next() * 60.0) as usize;
    for _ in 0..count {
        let shape = if random.next() < 0.3 { 1 } else { 0 };
        let size = 0.3 + random.next() * 1.2;
        let aspect = 0.5 + random.next() * 1.5;
        let mass = 0.2 + random.next() * 8.0;
        let x = -18.0 + random.next() * 36.0;
        let y = 1.0 + random.next() * 15.0;
        let angle = if random.next() < 0.5 {
            0.0
        } else {
            (random.next() - 0.5) * 3.0
        };
        add(
            &mut world,
            record(shape, x, y, size, size * aspect, false, mass, angle),
        );
    }
    let dt = 1.0 / rate;
    let mut outcome = Outcome {
        failed_at: None,
        worst_speed: 0.0,
        awake_at_end: 0,
    };
    for step in 0..(rate as usize * seconds) {
        world.step(dt, 9.80665, 0.0);
        world.drain_events();
        let state = world.state();
        for body in state.chunks_exact(STRIDE).filter(|body| body[9] < 0.5) {
            let speed = body[4].hypot(body[5]);
            outcome.worst_speed = outcome.worst_speed.max(speed);
            let escaped =
                !speed.is_finite() || speed > 40.0 || body[3] < -5.0 || body[2].abs() > 25.0;
            if escaped && outcome.failed_at.is_none() {
                outcome.failed_at = Some(step);
            }
        }
    }
    outcome.awake_at_end = world
        .state()
        .chunks_exact(STRIDE)
        .filter(|body| body[9] < 0.5 && body[49] < 0.5)
        .count();
    (tiles, count, outcome)
}

fn main() {
    let profiles = [
        ("fast", 60.0, 4, 12, 8),
        ("balanced", 60.0, 8, 20, 16),
        ("accurate", 120.0, 12, 32, 24),
    ];
    let seeds: Vec<u64> = std::env::var("SEEDS")
        .ok()
        .map(|value| {
            value
                .split(',')
                .filter_map(|seed| seed.trim().parse().ok())
                .collect()
        })
        .unwrap_or_else(|| (1..=24).collect());
    let only = std::env::var("PROFILE").ok();
    let tiles = match std::env::var("TILES").ok().as_deref() {
        Some("1") => Some(true),
        Some("0") => Some(false),
        _ => None,
    };
    let seconds = std::env::var("SECS")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(8);
    let (mut runs, mut failures, mut unsettled) = (0, 0, 0);
    for seed in seeds {
        for (name, rate, substeps, velocity, position) in profiles {
            if only.as_deref().is_some_and(|profile| profile != name) {
                continue;
            }
            let (tiled, count, outcome) =
                run(seed, rate, substeps, velocity, position, tiles, seconds);
            runs += 1;
            failures += usize::from(outcome.failed_at.is_some());
            unsettled += usize::from(outcome.awake_at_end > 0);
            println!(
                "seed {seed:2} {name:9} tiles={tiled:5} bodies={count:3} worst_speed={:5.1} awake_at_end={:3} {}",
                outcome.worst_speed,
                outcome.awake_at_end,
                outcome.failed_at.map(|step| format!("FAIL at step {step}")).unwrap_or_default()
            );
        }
    }
    println!(
        "{runs} runs, {failures} failed, {unsettled} with bodies still awake after {seconds} s"
    );
    if failures > 0 {
        std::process::exit(1);
    }
}
