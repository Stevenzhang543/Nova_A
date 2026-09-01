//! Nova_A's platform-independent 2D physics engine.
//!
//! The numerical solver is split by responsibility while the public API exposes
//! stable handles and descriptors instead of any editor or WebAssembly types.

mod engine {
    use std::collections::{HashMap, HashSet};

    use nova_math::{
        convex_hull, finite_or, inverse_rotate, non_negative, normalize_angle, positive,
        positive_with_minimum, rotate, triple_product, unit_interval, Aabb, Vec2, EPSILON,
        MIN_DIMENSION,
    };

    pub const LEGACY_STRIDE: usize = 42;
    pub const V1_2_STRIDE: usize = 46;
    pub const V3_3_STRIDE: usize = 54;
    pub const STRIDE: usize = 56;
    pub const COLLIDER_CHILD_STRIDE: usize = 21;
    pub const ROPE_NODE_CAPACITY: usize = 32;
    pub const ROPE_NODE_DATA_OFFSET: usize = 29;
    pub const CONNECTION_STRIDE: usize = ROPE_NODE_DATA_OFFSET + ROPE_NODE_CAPACITY * 4;
    const MIN_AREA: f64 = 1.0e-18;
    const MIN_INERTIA: f64 = 1.0e-24;
    const BASE_SUB_STEPS: usize = 8;
    const MAX_SUB_STEPS: usize = 128;
    const SOLVER_ITERATIONS: usize = 20;
    const POSITION_SLOP: f64 = 1.0e-12;
    const POSITION_CORRECTION: f64 = 0.75;
    const STANDARD_GRAVITY: f64 = 9.80665;

    include!("body.rs");
    include!("collision/mod.rs");
    include!("solver/contact_solver.rs");
    include!("rope/mod.rs");
    include!("world/legacy.rs");
    include!("world/persistent.rs");
    include!("query/mod.rs");

    #[cfg(test)]
    include!("tests.rs");
}

pub use engine::{
    step_physics, step_physics_with_connections, CharacterMoveResult, PhysicsContact, PhysicsEvent,
    PhysicsQueryHit, PhysicsWorld, COLLIDER_CHILD_STRIDE, CONNECTION_STRIDE, LEGACY_STRIDE,
    ROPE_NODE_CAPACITY, ROPE_NODE_DATA_OFFSET, STRIDE, V1_2_STRIDE, V3_3_STRIDE,
};

pub mod body {
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
    pub struct BodyHandle(pub u32);

    #[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
    pub enum BodyType {
        #[default]
        Dynamic,
        Kinematic,
        Static,
    }
}

pub mod collider {
    use crate::body::BodyHandle;

    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
    pub struct ColliderHandle(pub u32);

    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    pub struct Collider {
        pub handle: ColliderHandle,
        pub body: BodyHandle,
        pub sensor: bool,
    }
}

pub mod shape {
    use nova_math::Vec2;

    #[derive(Clone, Debug, PartialEq)]
    pub enum Shape {
        Polygon { vertices: Vec<Vec2> },
        Ellipse { radius_x: f64, radius_y: f64 },
    }
}

pub mod material {
    #[derive(Clone, Copy, Debug, PartialEq)]
    pub struct PhysicsMaterial {
        pub restitution: f64,
        pub static_friction: f64,
        pub dynamic_friction: f64,
    }

    impl Default for PhysicsMaterial {
        fn default() -> Self {
            Self {
                restitution: 0.0,
                static_friction: 0.0,
                dynamic_friction: 0.0,
            }
        }
    }
}

pub mod collision {
    use crate::body::BodyHandle;
    use nova_math::Vec2;

    #[derive(Clone, Copy, Debug, PartialEq)]
    pub struct Contact {
        pub a: BodyHandle,
        pub b: BodyHandle,
        pub normal: Vec2,
        pub penetration: f64,
    }

    #[derive(Clone, Debug, Default)]
    pub struct Manifold {
        pub contacts: Vec<Contact>,
    }

    #[derive(Default)]
    pub struct BroadPhase;

    #[derive(Default)]
    pub struct NarrowPhase;
}

pub mod solver {
    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    pub struct SolverSettings {
        pub velocity_iterations: usize,
        pub position_iterations: usize,
    }

    impl Default for SolverSettings {
        fn default() -> Self {
            Self {
                velocity_iterations: 20,
                position_iterations: 20,
            }
        }
    }
}

pub mod rope {
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
    pub struct RopeHandle(pub u32);
}

pub mod joint {
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
    pub struct JointHandle(pub u32);
}

pub mod query {
    pub use crate::PhysicsQueryHit;
}

pub mod world {
    pub use crate::{PhysicsEvent, PhysicsWorld};
}
