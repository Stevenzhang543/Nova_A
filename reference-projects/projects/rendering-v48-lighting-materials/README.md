# Rendering 4.8 Lighting and Materials

Engine **5.0.1**, Project Format 2, schema 29.

Required packages: None; Nova_A core only.

Target platforms: Windows x86-64 Native renderer path and Chromium/WebGL2 Compatibility path.

## Purpose

Validates lights, occluders, shadows, normal maps, typed materials, post processing.

## Test procedure

1. Open `project.nova` and follow `test-controls.json`.
2. Capture a frame/performance trace and compare with `expected-output.json`.
3. Confirm Project Health and Build Diagnostics show no blocking 4.8 issue.
4. Record unsupported capability, fallback, device, driver and budget diagnostics rather than accepting silent degradation.

## Known limitations

This deterministic fixture is local evidence. Representative physical GPUs/audio devices, Firefox/WebKit, 24-hour soak, and clean-machine Windows installation remain explicitly recorded external gates unless their evidence is present.
