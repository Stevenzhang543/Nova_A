# Nested Prefab Authoring

Engine **4.0.0**, Project Format 2, schema 29.

Demonstrates: nested prefab layers, per-property overrides, status badges, world/local reparent modes.

1. Open `project.nova` from Project Manager and review the compatibility preflight.
2. Confirm Project Health has no blocking project-format error.
3. Use Play, Pause, Step, and Stop; compare the scene/entity minimums with `expected-output.json`.
4. Run the validation export:

```powershell
pnpm nova export --project ./reference-projects/projects/authoring-nested-prefabs/project.nova --target web --profile release --output ./Builds/reference-authoring-nested-prefabs --cache validate --jsonl
```

The exact keyboard and UI controls are recorded in `test-controls.json`.
