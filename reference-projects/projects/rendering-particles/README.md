# Particle Authoring

Engine **5.0.1**, Project Format 2, schema 29.

## Expected behavior

Demonstrates: editor particle preview, curves, gradients and emission shapes, particle budget diagnostics and additive blending. Open the project, run Play/Pause/Step/Stop, and compare the scene/entity minimums and diagnostics with `expected-output.json`.

## Test procedure and IDs

1. Open `project.nova` from Project Manager and review the compatibility preflight.
2. Confirm Project Health has no blocking project-format error.
3. Run every entry in `test-controls.json`; that file is the authoritative UI/keyboard test-ID map.
4. Run the validation export:

```powershell
pnpm nova export --project ./reference-projects/projects/rendering-particles/project.nova --target web --profile release --output ./Builds/reference-rendering-particles --cache validate --jsonl
```

## Requirements

- Required packages: None; Nova_A core only.
- Target platforms: Windows x86-64 editor/runtime and the supported Chromium web runtime.
- Project identity: version-pinned `project.nova`, expected output, and stable control IDs ship together.

## Known limitations

This focused fixture proves only the behavior listed above. It does not substitute for external GPU, audio-device, network, signing, clean-machine installer, physical mixed-DPI-monitor, accessibility-operator, or long-duration soak gates where those gates apply.
