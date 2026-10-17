# Nova_A Multilingual runtime fonts Reference

Engine **5.3.0**, Project Format 2, schema 29.

## Expected behavior

Demonstrates multilingual runtime fonts, deterministic save/reload, explicit Main content ownership, and an Assets/** build-inclusion rule that closes the Project Health warning. Open `project.nova`, exercise each control in `test-controls.json`, run Play, save, reload, and compare with `expected-output.json`.

## Requirements

- Required packages: None; Nova_A core only.
- Target platforms: Windows x86-64 editor/runtime and supported Chromium web runtime.

## Known limitations

This focused fixture proves only the listed v4.4 workflow. External clean-machine, second-host determinism, signing, Firefox/Linux/macOS font, physical DPI/accessibility, security review, and long-soak gates remain explicitly pending.
