# Streaming State Handoff 5.7

Engine **5.7.0**, Project Format 2/schema 29. This world reference validates authored data, save/reload, bounded runtime behavior, cancellation and deterministic output.

## Compatibility

- Required packages: None; Nova_A core only.
- Target platforms: Windows x86-64 editor/runtime and the supported Chromium web runtime.
- Test controls: open `test-controls.json` and compare the session with `expected-output.json`.

## Known limitations

Publisher signing, independent clean-machine lifecycle, non-Windows matching-host builds, real wall-clock soak and independent hardware profiling remain external certification gates.
