//! Platform-independent numerical and geometry primitives used throughout Nova_A.

use std::ops::{Add, AddAssign, Mul, Neg, Sub, SubAssign};

pub const EPSILON: f64 = 1.0e-14;
pub const MAX_MAGNITUDE: f64 = 1.0e50;
pub const MIN_DIMENSION: f64 = 1.0e-6;

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Vec2 {
    pub x: f64,
    pub y: f64,
}

#[allow(clippy::should_implement_trait)] // Named methods preserve the audited 1.1 solver source during modularization.
impl Vec2 {
    pub const ZERO: Self = Self { x: 0.0, y: 0.0 };
    pub const X: Self = Self { x: 1.0, y: 0.0 };
    pub const Y: Self = Self { x: 0.0, y: 1.0 };

    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    pub fn add_components(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y)
    }

    pub fn sub_components(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y)
    }

    pub fn mul_scalar(self, scalar: f64) -> Self {
        Self::new(self.x * scalar, self.y * scalar)
    }

    // Compatibility methods retained while the 1.1 solver is modularized.
    pub fn add(self, other: Self) -> Self {
        self.add_components(other)
    }
    pub fn sub(self, other: Self) -> Self {
        self.sub_components(other)
    }
    pub fn mul(self, scalar: f64) -> Self {
        self.mul_scalar(scalar)
    }
    pub fn negated(self) -> Self {
        Self::new(-self.x, -self.y)
    }
    pub fn neg(self) -> Self {
        self.negated()
    }

    pub fn dot(self, other: Self) -> f64 {
        self.x * other.x + self.y * other.y
    }

    pub fn cross(self, other: Self) -> f64 {
        self.x * other.y - self.y * other.x
    }

    pub fn length_squared(self) -> f64 {
        self.dot(self)
    }
    pub fn length(self) -> f64 {
        self.x.hypot(self.y)
    }
    pub fn perp(self) -> Self {
        Self::new(-self.y, self.x)
    }

    pub fn normalized_or(self, fallback: Self) -> Self {
        let length = self.length();
        if length > EPSILON {
            self.mul_scalar(1.0 / length)
        } else {
            fallback
        }
    }

    pub fn finite_or(self, fallback: Self) -> Self {
        Self::new(finite_or(self.x, fallback.x), finite_or(self.y, fallback.y))
    }

    pub fn lerp(self, target: Self, alpha: f64) -> Self {
        let alpha = unit_interval(alpha);
        self.add_components(target.sub_components(self).mul_scalar(alpha))
    }
}

impl Add for Vec2 {
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        self.add_components(rhs)
    }
}
impl Sub for Vec2 {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        self.sub_components(rhs)
    }
}
impl Mul<f64> for Vec2 {
    type Output = Self;
    fn mul(self, rhs: f64) -> Self {
        self.mul_scalar(rhs)
    }
}
impl Neg for Vec2 {
    type Output = Self;
    fn neg(self) -> Self {
        self.negated()
    }
}
impl AddAssign for Vec2 {
    fn add_assign(&mut self, rhs: Self) {
        *self = self.add_components(rhs);
    }
}
impl SubAssign for Vec2 {
    fn sub_assign(&mut self, rhs: Self) {
        *self = self.sub_components(rhs);
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Mat3 {
    pub columns: [[f64; 3]; 3],
}

impl Mat3 {
    pub const IDENTITY: Self = Self {
        columns: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
    };

    pub fn transform_point(self, point: Vec2) -> Vec2 {
        Vec2::new(
            self.columns[0][0] * point.x + self.columns[1][0] * point.y + self.columns[2][0],
            self.columns[0][1] * point.x + self.columns[1][1] * point.y + self.columns[2][1],
        )
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Transform2D {
    pub position: Vec2,
    pub rotation: f64,
    pub scale: Vec2,
}

impl Default for Transform2D {
    fn default() -> Self {
        Self {
            position: Vec2::ZERO,
            rotation: 0.0,
            scale: Vec2::new(1.0, 1.0),
        }
    }
}

impl Transform2D {
    pub fn matrix(self) -> Mat3 {
        let (sin, cos) = self.rotation.sin_cos();
        Mat3 {
            columns: [
                [cos * self.scale.x, sin * self.scale.x, 0.0],
                [-sin * self.scale.y, cos * self.scale.y, 0.0],
                [self.position.x, self.position.y, 1.0],
            ],
        }
    }

    pub fn transform_point(self, point: Vec2) -> Vec2 {
        self.matrix().transform_point(point)
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Aabb {
    pub min_x: f64,
    pub max_x: f64,
    pub min_y: f64,
    pub max_y: f64,
}

impl Aabb {
    pub fn overlaps(self, other: Self) -> bool {
        self.min_x <= other.max_x
            && self.max_x >= other.min_x
            && self.min_y <= other.max_y
            && self.max_y >= other.min_y
    }

    pub fn contains(self, point: Vec2) -> bool {
        point.x >= self.min_x
            && point.x <= self.max_x
            && point.y >= self.min_y
            && point.y <= self.max_y
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Rect {
    pub origin: Vec2,
    pub size: Vec2,
}

impl Rect {
    pub fn aabb(self) -> Aabb {
        Aabb {
            min_x: self.origin.x,
            max_x: self.origin.x + self.size.x,
            min_y: self.origin.y,
            max_y: self.origin.y + self.size.y,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Ray2 {
    pub origin: Vec2,
    pub direction: Vec2,
}

impl Ray2 {
    pub fn new(origin: Vec2, direction: Vec2) -> Self {
        Self {
            origin,
            direction: direction.normalized_or(Vec2::X),
        }
    }
    pub fn point_at(self, distance: f64) -> Vec2 {
        self.origin + self.direction * distance
    }
}

pub fn finite_or(value: f64, fallback: f64) -> f64 {
    if value.is_finite() {
        value.clamp(-MAX_MAGNITUDE, MAX_MAGNITUDE)
    } else {
        fallback
    }
}

pub fn non_negative(value: f64, fallback: f64) -> f64 {
    finite_or(value, fallback).max(0.0)
}

pub fn positive(value: f64, fallback: f64) -> f64 {
    let value = finite_or(value, fallback);
    if value >= MIN_DIMENSION {
        value
    } else {
        fallback.max(MIN_DIMENSION)
    }
}

pub fn positive_with_minimum(value: f64, fallback: f64, minimum: f64) -> f64 {
    let value = finite_or(value, fallback);
    if value >= minimum {
        value
    } else {
        fallback.max(minimum)
    }
}

pub fn unit_interval(value: f64) -> f64 {
    finite_or(value, 0.0).clamp(0.0, 1.0)
}

pub fn normalize_angle(angle: f64) -> f64 {
    let angle = finite_or(angle, 0.0);
    (angle + std::f64::consts::PI).rem_euclid(std::f64::consts::TAU) - std::f64::consts::PI
}

pub fn lerp_angle(from: f64, to: f64, alpha: f64) -> f64 {
    normalize_angle(from + normalize_angle(to - from) * unit_interval(alpha))
}

pub fn rotate(vector: Vec2, angle: f64) -> Vec2 {
    let (sin, cos) = angle.sin_cos();
    Vec2::new(
        vector.x * cos - vector.y * sin,
        vector.x * sin + vector.y * cos,
    )
}

pub fn inverse_rotate(vector: Vec2, angle: f64) -> Vec2 {
    rotate(vector, -angle)
}
pub fn triple_product(a: Vec2, b: Vec2, c: Vec2) -> Vec2 {
    b.mul(a.dot(c)).sub(a.mul(b.dot(c)))
}

pub fn convex_hull(mut points: Vec<Vec2>) -> Vec<Vec2> {
    points.retain(|point| point.x.is_finite() && point.y.is_finite());
    points.sort_by(|a, b| a.x.total_cmp(&b.x).then(a.y.total_cmp(&b.y)));
    points.dedup_by(|a, b| a.sub(*b).length_squared() <= EPSILON * EPSILON);
    if points.len() <= 2 {
        return points;
    }
    let mut lower: Vec<Vec2> = Vec::new();
    for point in &points {
        while lower.len() >= 2 {
            let last = lower[lower.len() - 1];
            let previous = lower[lower.len() - 2];
            if last.sub(previous).cross((*point).sub(last)) > 0.0 {
                break;
            }
            lower.pop();
        }
        lower.push(*point);
    }
    let mut upper: Vec<Vec2> = Vec::new();
    for point in points.iter().rev() {
        while upper.len() >= 2 {
            let last = upper[upper.len() - 1];
            let previous = upper[upper.len() - 2];
            if last.sub(previous).cross((*point).sub(last)) > 0.0 {
                break;
            }
            upper.pop();
        }
        upper.push(*point);
    }
    lower.pop();
    upper.pop();
    lower.extend(upper);
    lower
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transform_and_inverse_free_rotation_preserve_units() {
        let transform = Transform2D {
            position: Vec2::new(3.0, -2.0),
            rotation: std::f64::consts::FRAC_PI_2,
            scale: Vec2::new(2.0, 1.0),
        };
        let point = transform.transform_point(Vec2::new(1.0, 0.0));
        assert!((point.x - 3.0).abs() < 1.0e-12);
        assert!((point.y - 0.0).abs() < 1.0e-12);
    }

    #[test]
    fn validation_rejects_non_finite_values() {
        assert_eq!(finite_or(f64::NAN, 4.0), 4.0);
        assert_eq!(positive(-1.0, 2.0), 2.0);
    }
}
