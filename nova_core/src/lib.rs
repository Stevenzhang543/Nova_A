// 旧核心兼容入口：重新导出拆分后的数学、物理、格式、脚本及运行时模块。
//! Source-compatible facade retained for crates that used Nova_A before 1.4.0.
//! WebAssembly bindings now live exclusively in `nova_wasm`.

pub use nova_physics::*;
