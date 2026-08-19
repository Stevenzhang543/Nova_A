# Build Automation Reference

Engine **4.0.0**, Project Format 2, schema 29.

Demonstrates: all seven CLI commands, clean/incremental/validated cache modes, content and symbol reports, machine-readable CI logs.

1. Open `project.nova` from Project Manager and review the compatibility preflight.
2. Confirm Project Health has no blocking project-format error.
3. Use Play, Pause, Step, and Stop; compare the scene/entity minimums with `expected-output.json`.
4. Run the validation export:

```powershell
pnpm nova export --project ./reference-projects/projects/build-automation/project.nova --target web --profile release --output ./Builds/reference-build-automation --cache validate --jsonl
```

The exact keyboard and UI controls are recorded in `test-controls.json`.
