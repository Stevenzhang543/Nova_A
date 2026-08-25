# Script v4.6 API Contract

Engine **5.0.1**, Project Format 2, schema 29.

## Purpose

One deterministic tested script covers every stable API v2 namespace/category and the v1 compatibility floor.

## Test procedure

1. Open `project.nova` and switch to **Script**.
2. Follow `test-controls.json` and compare the result with `expected-output.json`.
3. Run `pnpm nova script-test ./reference-projects/projects/script-v46-api-contract/project.nova --format json` when the project path is supported, or use the listed `Assets/Scripts` fixture sources directly.
4. Confirm Project Health reports API v2 and no blocking script error.

## Requirements

- Required packages: None; Nova_A core only.
- Target platforms: Windows x86-64 editor/runtime and the supported Chromium web runtime.

## Known limitations

This focused fixture validates its listed workflow; clean-machine, real remote-player, and long-duration soak gates remain external qualification work.
