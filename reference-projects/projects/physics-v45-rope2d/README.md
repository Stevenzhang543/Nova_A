# Nova_A 4.5 Rope2D Laboratory

Engine **5.3.0**, Project Format 2, schema 29.

## Expected behavior

- Rope2D segment count, compliance, damping and collision
- endpoint-owner exclusion and third-body contacts
- break link and fragment behavior

## Test procedure and IDs

1. Open `project.nova` and confirm Project Health has no blocking format error.
2. Run Play, Pause, single Step, and Stop using the stable controls in `test-controls.json`.
3. Select Balanced, then Accurate and Fast; repeat the test IDs: PHY-ROPE-001, PHY-ROPE-003, PHY-ROPE-005.
4. Inspect Physics Monitor/API values and compare them with `expected-output.json`.
5. Export Windows x64 and web using the command recorded in `test-controls.json`.

## Requirements

- Required packages: none; Nova_A core only.
- Target platforms: Windows x86-64 and the documented Chromium web runtime.
- The project, expected output, test controls, and test IDs are version pinned.

## Known limitations

This focused fixture proves only its listed behavior. External clean-machine, browser-matrix, signing, real wall-clock 24-hour soak, and physical accessibility gates remain release-environment evidence.
