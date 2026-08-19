# Nova_A 4.0 troubleshooting guide

- **Project will not open:** read every preflight row. Newer schemas stay read-only. Download the original; do not edit it blindly. Verify with `pnpm nova validate`.
- **Upgrade fails:** the active session is not replaced. Keep the automatic backup, export the rollback copy, inspect the first validation path, then remove or update incompatible packages in a branch.
- **Object is invisible:** check enabled/editor/game visibility, scene load, render layer/order, camera viewport/range, opacity, asset placeholder, and Canvas mode.
- **Physics differs:** one world unit equals one grid unit. Check body ownership, fixed rate/time scale, collider, sensor/one-way state, mutual layer/mask bits, mass/density/inertia, material, sleep, CCD, and finite values.
- **Script fails:** open source-linked Problems/Console, verify API v1, exported property types, component handles, package permissions, and hot-reload state.
- **Build fails:** run validation, choose a declared target/host, set startup scene/order, inspect package locks and include/exclude reports, then use clean cache.
- **Editor recovered after a crash:** use Recovery Center/Safe Mode, compare the snapshot, disable quarantined packages, and export a privacy-reviewed diagnostic or opt-in crash package.

For reports include exact version/channel, project schema, target/host, reproduction, expected/actual result, smallest safe sample, diagnostics, and whether the issue survives Safe Mode. Never publish secrets, proprietary assets, personal paths, or signing material.
